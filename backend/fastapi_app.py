from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from Sudoko_backend import (
    SudokuGame, SudokuSolver, generate_stepwise_path,
    get_puzzle_stats, is_puzzle_complete, is_puzzle_correct,
    get_valid_numbers_for_cell
)
from puzzle_cache import get_cache


# Types
Grid = List[List[int]]


class GenerateRequest(BaseModel):
    difficulty: Optional[str] = "medium"


class SolveRequest(BaseModel):
    grid: List[List[int]]


class GenerateResponse(BaseModel):
    puzzle: Grid
    solution: Grid
    difficulty: str


class SolveResponse(BaseModel):
    solved: bool
    solution: Optional[Grid] = None


class HintRequest(BaseModel):
    grid: List[List[int]]
    solution: List[List[int]]


class HintResponse(BaseModel):
    has_hint: bool
    row: Optional[int] = None
    col: Optional[int] = None
    value: Optional[int] = None


class StepwisePathRequest(BaseModel):
    grid: List[List[int]]
    solution: List[List[int]]


class StepwisePathResponse(BaseModel):
    success: bool
    steps: List[List[int]]  # List of [row, col, value] tuples
    message: Optional[str] = None


class PuzzleStatsRequest(BaseModel):
    grid: List[List[int]]


class PuzzleStatsResponse(BaseModel):
    filled_count: int
    empty_count: int
    total_cells: int
    completion_percentage: float


class ValidatePuzzleRequest(BaseModel):
    grid: List[List[int]]
    solution: Optional[List[List[int]]] = None


class ValidatePuzzleResponse(BaseModel):
    is_complete: bool
    is_correct: Optional[bool] = None
    message: str


class ValidNumbersRequest(BaseModel):
    grid: List[List[int]]
    row: int
    col: int


class ValidNumbersResponse(BaseModel):
    valid_numbers: List[int]
    cell_value: int
    is_filled: bool


app = FastAPI(title="Sudoku API", version="1.0.0")

# Allow all origins for local development (file:// or localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow file:// (null origin) by not using credentials
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Pre-fill the puzzle cache on startup for instant responses."""
    print("🚀 Starting Sudoku API...")
    cache = get_cache()
    stats = cache.get_stats()
    total_cached = sum(stats.values())
    
    if total_cached < 10:  # If cache is low, pre-fill it
        print("📦 Pre-filling puzzle cache...")
        # Pre-fill with 3 puzzles per difficulty for quick startup
        cache.prefill_cache(count_per_difficulty=3)
    else:
        print(f"✅ Cache already filled with {total_cached} puzzles")
    
    print("✨ Sudoku API ready!")


@app.get("/api/cache-stats")
def cache_stats():
    """Get current puzzle cache statistics."""
    cache = get_cache()
    stats = cache.get_stats()
    return {
        "stats": stats,
        "total": sum(stats.values()),
        "pool_size": cache.pool_size
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/generate", response_model=GenerateResponse)
def generate(body: GenerateRequest):
    difficulty = (body.difficulty or "medium").lower()
    if difficulty not in {"easy", "medium", "hard", "expert"}:
        raise HTTPException(status_code=400, detail="difficulty must be one of: easy, medium, hard, expert")
    
    # Use cached puzzle for instant response
    cache = get_cache()
    puzzle, solution = cache.get_puzzle(difficulty)
    return {"puzzle": puzzle, "solution": solution, "difficulty": difficulty}


@app.get("/api/generate", response_model=GenerateResponse)
def generate_get(difficulty: Optional[str] = "medium"):
    difficulty_lc = (difficulty or "medium").lower()
    if difficulty_lc not in {"easy", "medium", "hard", "expert"}:
        raise HTTPException(status_code=400, detail="difficulty must be one of: easy, medium, hard, expert")
    
    # Use cached puzzle for instant response
    cache = get_cache()
    puzzle, solution = cache.get_puzzle(difficulty_lc)
    return {"puzzle": puzzle, "solution": solution, "difficulty": difficulty_lc}


@app.post("/api/solve", response_model=SolveResponse)
def solve(body: SolveRequest):
    # Validate grid shape and values
    g = body.grid
    if not isinstance(g, list) or len(g) != 9 or any(not isinstance(row, list) or len(row) != 9 for row in g):
        raise HTTPException(status_code=400, detail="grid must be 9x9")
    for r in range(9):
        for c in range(9):
            val = g[r][c]
            if not isinstance(val, int) or not (0 <= val <= 9):
                raise HTTPException(status_code=400, detail="grid values must be integers 0..9")

    # Solve a provided 9x9 grid (0 represents empty).
    grid_copy = [row[:] for row in g]
    solver = SudokuSolver()
    # Load a blank puzzle/solution so we can reuse the recursive solver
    solver.current_grid = grid_copy
    ok = solver._solve_recursive(grid_copy)  # type: ignore[attr-defined]
    return {"solved": bool(ok), "solution": grid_copy if ok else None}


@app.post("/api/hint", response_model=HintResponse)
def hint(body: HintRequest):
    # Validate shapes
    g, s = body.grid, body.solution
    if (not isinstance(g, list) or len(g) != 9 or any(len(row) != 9 for row in g)
        or not isinstance(s, list) or len(s) != 9 or any(len(row) != 9 for row in s)):
        raise HTTPException(status_code=400, detail="grid and solution must be 9x9")

    # Find first empty cell and return the solution value
    for r in range(9):
        for c in range(9):
            if g[r][c] == 0:
                return {"has_hint": True, "row": r, "col": c, "value": s[r][c]}
    return {"has_hint": False}


@app.post("/api/stepwise-path", response_model=StepwisePathResponse)
def get_stepwise_path(body: StepwisePathRequest):
    """
    Generate a stepwise path for animating the solution.
    Returns a list of moves [row, col, value] that show how the puzzle is solved.
    """
    # Validate shapes
    g, s = body.grid, body.solution
    if (not isinstance(g, list) or len(g) != 9 or any(len(row) != 9 for row in g)
        or not isinstance(s, list) or len(s) != 9 or any(len(row) != 9 for row in s)):
        raise HTTPException(status_code=400, detail="grid and solution must be 9x9")
    
    # Validate grid values
    for r in range(9):
        for c in range(9):
            val = g[r][c]
            if not isinstance(val, int) or not (0 <= val <= 9):
                raise HTTPException(status_code=400, detail="grid values must be integers 0..9")
    
    try:
        # Create solver instance to track moves
        solver = SudokuSolver()
        solver.solution_grid = s  # Set solution for reference
        solver.moves_made_by_solver = []  # Clear previous moves
        
        # Solve the puzzle to generate moves
        grid_copy = [row[:] for row in g]
        solved = solver._solve_recursive(grid_copy)  # type: ignore[attr-defined]
        
        if not solved:
            return {
                "success": False,
                "steps": [],
                "message": "Puzzle could not be solved"
            }
        
        # Get the stepwise path
        path = generate_stepwise_path(solver)
        
        # Convert tuples to lists for JSON serialization
        steps = [[r, c, v] for r, c, v in path]
        
        return {
            "success": True,
            "steps": steps,
            "message": f"Generated {len(steps)} steps"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating stepwise path: {str(e)}")


@app.post("/api/puzzle-stats", response_model=PuzzleStatsResponse)
def get_puzzle_stats_endpoint(body: PuzzleStatsRequest):
    """
    Get statistics about a puzzle (filled cells, empty cells, completion percentage).
    """
    g = body.grid
    if not isinstance(g, list) or len(g) != 9 or any(not isinstance(row, list) or len(row) != 9 for row in g):
        raise HTTPException(status_code=400, detail="grid must be 9x9")
    
    for r in range(9):
        for c in range(9):
            val = g[r][c]
            if not isinstance(val, int) or not (0 <= val <= 9):
                raise HTTPException(status_code=400, detail="grid values must be integers 0..9")
    
    try:
        solver = SudokuSolver()
        solver.current_grid = [row[:] for row in g]
        stats = get_puzzle_stats(solver)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting puzzle stats: {str(e)}")


@app.post("/api/validate-puzzle", response_model=ValidatePuzzleResponse)
def validate_puzzle(body: ValidatePuzzleRequest):
    """
    Validate if a puzzle is complete and optionally check if it's correct.
    """
    g = body.grid
    s = body.solution
    
    if not isinstance(g, list) or len(g) != 9 or any(not isinstance(row, list) or len(row) != 9 for row in g):
        raise HTTPException(status_code=400, detail="grid must be 9x9")
    
    for r in range(9):
        for c in range(9):
            val = g[r][c]
            if not isinstance(val, int) or not (0 <= val <= 9):
                raise HTTPException(status_code=400, detail="grid values must be integers 0..9")
    
    if s is not None:
        if not isinstance(s, list) or len(s) != 9 or any(not isinstance(row, list) or len(row) != 9 for row in s):
            raise HTTPException(status_code=400, detail="solution must be 9x9")
    
    try:
        solver = SudokuSolver()
        solver.current_grid = [row[:] for row in g]
        
        is_complete = is_puzzle_complete(solver)
        is_correct = None
        message = "Puzzle is complete" if is_complete else "Puzzle has empty cells"
        
        if s is not None:
            solver.solution_grid = [row[:] for row in s]
            is_correct = is_puzzle_correct(solver)
            if is_complete:
                message = "Puzzle is complete and correct" if is_correct else "Puzzle is complete but incorrect"
            else:
                message = "Puzzle is incomplete"
        
        return {
            "is_complete": is_complete,
            "is_correct": is_correct,
            "message": message
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating puzzle: {str(e)}")


@app.post("/api/valid-numbers", response_model=ValidNumbersResponse)
def get_valid_numbers(body: ValidNumbersRequest):
    """
    Get all valid numbers that can be placed in a specific cell.
    """
    g = body.grid
    row = body.row
    col = body.col
    
    if not isinstance(g, list) or len(g) != 9 or any(not isinstance(row, list) or len(row) != 9 for row in g):
        raise HTTPException(status_code=400, detail="grid must be 9x9")
    
    if not (0 <= row < 9 and 0 <= col < 9):
        raise HTTPException(status_code=400, detail="row and col must be between 0 and 8")
    
    for r in range(9):
        for c in range(9):
            val = g[r][c]
            if not isinstance(val, int) or not (0 <= val <= 9):
                raise HTTPException(status_code=400, detail="grid values must be integers 0..9")
    
    try:
        solver = SudokuSolver()
        solver.current_grid = [row[:] for row in g]
        
        cell_value = solver.current_grid[row][col]
        is_filled = cell_value != 0
        valid_nums = get_valid_numbers_for_cell(solver, row, col) if not is_filled else []
        
        return {
            "valid_numbers": valid_nums,
            "cell_value": cell_value,
            "is_filled": is_filled
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting valid numbers: {str(e)}")


# Optional root for simple message
@app.get("/")
def root():
    return {"message": "Sudoku API running. See /api/generate and /api/solve."}


