from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from Sudoko_backend import SudokuGame, SudokuSolver


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


app = FastAPI(title="Sudoku API", version="1.0.0")

# Allow all origins for local development (file:// or localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow file:// (null origin) by not using credentials
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/generate", response_model=GenerateResponse)
def generate(body: GenerateRequest):
    difficulty = (body.difficulty or "medium").lower()
    if difficulty not in {"easy", "medium", "hard", "expert"}:
        raise HTTPException(status_code=400, detail="difficulty must be one of: easy, medium, hard, expert")
    game = SudokuGame()
    puzzle, solution = game.new_game(difficulty)
    return {"puzzle": puzzle, "solution": solution, "difficulty": difficulty}


@app.get("/api/generate", response_model=GenerateResponse)
def generate_get(difficulty: Optional[str] = "medium"):
    difficulty_lc = (difficulty or "medium").lower()
    if difficulty_lc not in {"easy", "medium", "hard", "expert"}:
        raise HTTPException(status_code=400, detail="difficulty must be one of: easy, medium, hard, expert")
    game = SudokuGame()
    puzzle, solution = game.new_game(difficulty_lc)
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


# Optional root for simple message
@app.get("/")
def root():
    return {"message": "Sudoku API running. See /api/generate and /api/solve."}


