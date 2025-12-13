
import random
import time
from typing import List, Tuple, Optional

# =========================================
# =========================================
Grid = List[List[int]]

# =========================================
# SudokuSolver
# =========================================
class SudokuSolver:
    """
    Core Solver and Game State Manager.
    Handles Sudoku rules, backtracking algorithm, move tracking, and timer.
    """
    def __init__(self):
        self.initial_puzzle: Grid = []
        self.current_grid: Grid = []
        self.solution_grid: Grid = []
        self.fixed_cells: List[Tuple[int, int]] = []
        self.user_move_history: List[Tuple[int, int, int]] = []

        self.start_time: Optional[float] = None
        self.solve_time: float = 0.0
        self.is_timer_running: bool = False

        self.moves_made_by_solver: List[Tuple[int, int, int]] = []

    # ---- Setup & Timer ----
    def load_puzzle(self, puzzle: Grid, solution: Grid):
        self.initial_puzzle = [row[:] for row in puzzle]
        self.current_grid = [row[:] for row in puzzle]
        self.solution_grid = [row[:] for row in solution]
        self.user_move_history = []
        self.fixed_cells = [(r, c) for r in range(9) for c in range(9) if puzzle[r][c] != 0]
        self.start_game_timer()

    def start_game_timer(self):
        if not self.is_timer_running:
            self.start_time = time.time()
            self.is_timer_running = True

    def stop_game_timer(self):
        if self.is_timer_running and self.start_time is not None:
            self.solve_time = time.time() - self.start_time
            self.is_timer_running = False
            return self.solve_time
        return self.solve_time

    def get_elapsed_time(self) -> float:
        if self.is_timer_running and self.start_time is not None:
            return time.time() - self.start_time
        return self.solve_time

    # ---- Core Solver Helpers ----
    def _find_empty(self, grid: Grid) -> Optional[Tuple[int, int]]:
        for r in range(9):
            for c in range(9):
                if grid[r][c] == 0:
                    return (r, c)
        return None

    def _is_valid_placement(self, grid: Grid, row: int, col: int, num: int) -> bool:
        """Optimized validation - avoids list creation for better performance."""
        # Check row
        for i in range(9):
            if grid[row][i] == num:
                return False
        # Check column
        for i in range(9):
            if grid[i][col] == num:
                return False
        # Check 3x3 box
        br, bc = 3 * (row // 3), 3 * (col // 3)
        for i in range(br, br + 3):
            for j in range(bc, bc + 3):
                if grid[i][j] == num:
                    return False
        return True

    def _solve_recursive(self, grid: Grid) -> bool:
        spot = self._find_empty(grid)
        if not spot:
            return True
        r, c = spot
        for n in range(1, 10):
            if self._is_valid_placement(grid, r, c, n):
                grid[r][c] = n
                self.moves_made_by_solver.append((r, c, n))
                if self._solve_recursive(grid):
                    return True
                grid[r][c] = 0
                self.moves_made_by_solver.append((r, c, 0))
        return False

    # ---- User Interaction ----
    def make_user_move(self, row: int, col: int, num: int) -> bool:
        if not (0 <= row < 9 and 0 <= col < 9):
            return False
        if (row, col) in self.fixed_cells or not (0 <= num <= 9):
            return False
        if num != 0:
            self.user_move_history.append((row, col, num))
        self.current_grid[row][col] = num
        return True

    def clear_latest_entry(self) -> bool:
        if not self.user_move_history:
            return False
        r, c, _ = self.user_move_history.pop()
        self.current_grid[r][c] = 0
        return True

    def reset_grid(self):
        self.current_grid = [row[:] for row in self.initial_puzzle]
        self.user_move_history = []
        self.stop_game_timer()
        self.start_game_timer()

    def generate_stepwise_path(self) -> List[Tuple[int, int, int]]:
        """
        Generate a stepwise path of moves for animation.
        Returns a list of tuples (row, col, value) representing the solving steps.
        This captures the moves made by the solver during auto-solve.
        """
        return self.moves_made_by_solver.copy()

    def get_puzzle_stats(self) -> dict:
        """
        Get statistics about the current puzzle state.
        Returns: dict with filled_count, empty_count, completion_percentage, total_cells
        """
        filled = sum(1 for r in range(9) for c in range(9) if self.current_grid[r][c] != 0)
        total = 81
        empty = total - filled
        percentage = (filled / total) * 100 if total > 0 else 0
        return {
            "filled_count": filled,
            "empty_count": empty,
            "total_cells": total,
            "completion_percentage": round(percentage, 2)
        }

    def is_puzzle_complete(self) -> bool:
        """
        Check if the puzzle is completely filled (no empty cells).
        """
        return all(self.current_grid[r][c] != 0 for r in range(9) for c in range(9))

    def is_puzzle_correct(self) -> bool:
        """
        Check if the current puzzle state matches the solution.
        """
        return self.current_grid == self.solution_grid

    def get_valid_numbers_for_cell(self, row: int, col: int) -> List[int]:
        """
        Get all valid numbers that can be placed in a specific cell.
        Returns list of valid numbers (1-9) for the given cell position.
        """
        if not (0 <= row < 9 and 0 <= col < 9):
            return []
        if self.current_grid[row][col] != 0:
            return []
        
        valid_nums = []
        for num in range(1, 10):
            if self._is_valid_placement(self.current_grid, row, col, num):
                valid_nums.append(num)
        return valid_nums


# =========================================
# Intelli Tools (Utilities)
# =========================================
def clear_latest_entry(solver: SudokuSolver) -> bool:
    return solver.clear_latest_entry()

def reset_grid(solver: SudokuSolver):
    solver.reset_grid()

def auto_solve_whole(solver: SudokuSolver) -> Tuple[bool, float]:
    if not solver.current_grid:
        return False, 0.0
    grid_to_solve = [row[:] for row in solver.current_grid]
    solver.moves_made_by_solver = []
    t0 = time.time()
    ok = solver._solve_recursive(grid_to_solve)
    elapsed = time.time() - t0
    if ok:
        solver.current_grid = grid_to_solve
        solver.stop_game_timer()
    return ok, elapsed

# Removed: verify_solution() - use is_puzzle_correct() instead (same functionality, better naming)

def get_hint_and_apply(solver: SudokuSolver) -> bool:
    empty_pos = solver._find_empty(solver.current_grid)
    if empty_pos:
        r, c = empty_pos
        correct_num = solver.solution_grid[r][c]
        solver.make_user_move(r, c, correct_num)
        return True
    return False

def generate_stepwise_path(solver: SudokuSolver) -> List[Tuple[int, int, int]]:
    """
    For animation: returns the entire "movie" of the solver's thinking as a list of steps.
    Each step is a tuple (row, col, value) representing a move made during solving.
    """
    return solver.generate_stepwise_path()

def get_puzzle_stats(solver: SudokuSolver) -> dict:
    """
    Get statistics about the current puzzle state.
    """
    return solver.get_puzzle_stats()

def is_puzzle_complete(solver: SudokuSolver) -> bool:
    """
    Check if the puzzle is completely filled.
    """
    return solver.is_puzzle_complete()

def is_puzzle_correct(solver: SudokuSolver) -> bool:
    """
    Check if the current puzzle state matches the solution.
    """
    return solver.is_puzzle_correct()

def get_valid_numbers_for_cell(solver: SudokuSolver, row: int, col: int) -> List[int]:
    """
    Get all valid numbers that can be placed in a specific cell.
    """
    return solver.get_valid_numbers_for_cell(row, col)


# =========================================
# Difficulty File Reader
# =========================================
def read_difficulty_from_file(path: str = "difficulty.txt") -> Optional[str]:
    """
    Reads the first non-empty line from a file and validates it as a difficulty.
    Returns one of: easy, medium, hard, expert; or None if invalid/not found.
    """
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                d = line.strip().lower()
                if d in ("easy", "medium", "hard", "expert"):
                    return d
    except FileNotFoundError:
        return None
    except Exception:
        return None
    return None



# =========================================
# (Difficulty + Generator with uniqueness)
# =========================================

# --- Difficulty ---
def choose_difficulty():
    print("Choose difficulty: easy / medium / hard / expert")
    while True:
        d = input("Difficulty: ").strip().lower()
        if d in ("easy", "medium", "hard", "expert"):
            return d
        print("Please type: easy, medium, hard, or expert.")

def holes_for(d):
    return {"easy": 30, "medium": 40, "hard": 50, "expert": 60}.get(d, 40)

# --- Board I/O ---
def print_board(b: Grid, title: str = "Board"):
    print(f"\n{title}:")
    for r in range(9):
        if r and r % 3 == 0:
            print("-" * 21)
        row = []
        for c in range(9):
            if c and c % 3 == 0:
                row.append("|")
            row.append(str(b[r][c]) if b[r][c] else ".")
        print(" ".join(row))
    print()

# --- Core Helpers for Generator ---
def find_empty(b: Grid):
    for r in range(9):
        for c in range(9):
            if b[r][c] == 0:
                return r, c
    return None

def valid(b: Grid, n: int, pos: Tuple[int, int]):
    r, c = pos
    for i in range(9):
        if b[r][i] == n or b[i][c] == n:
            return False
    br, bc = 3 * (r // 3), 3 * (c // 3)
    for i in range(br, br + 3):
        for j in range(bc, bc + 3):
            if b[i][j] == n:
                return False
    return True

def solve_board_for_generation(b: Grid):
    spot = find_empty(b)
    if not spot:
        return True
    r, c = spot
    nums = list(range(1, 10))
    random.shuffle(nums)
    for n in nums:
        if valid(b, n, (r, c)):
            b[r][c] = n
            if solve_board_for_generation(b):
                return True
            b[r][c] = 0
    return False

# --- (Simplified) Solution Counter (for uniqueness guarantee) ---
def count_solutions(b: Grid, limit: int = 2) -> int:
    work = [row[:] for row in b]
    found = 0
    def dfs():
        nonlocal found
        if found >= limit:
            return
        spot = find_empty(work)
        if not spot:
            found += 1
            return
        r, c = spot
        for n in range(1, 10):
            if valid(work, n, (r, c)):
                work[r][c] = n
                dfs()
                work[r][c] = 0
                if found >= limit:
                    return
    dfs()
    return found

# --- Generate Full Grid ---
def make_full_board() -> Grid:
    b = [[0]*9 for _ in range(9)]
    solve_board_for_generation(b)
    return b

# --- Carve with Unique-Solution Guarantee ---
def make_puzzle_unique(solution: Grid, holes: int) -> Grid:
    puzzle = [row[:] for row in solution]
    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)
    removed = 0
    for r, c in cells:
        if removed >= holes:
            break
        keep = puzzle[r][c]
        if keep == 0:
            continue
        puzzle[r][c] = 0
        if count_solutions(puzzle, limit=2) == 1:
            removed += 1
        else:
            puzzle[r][c] = keep  # revert if uniqueness lost
    return puzzle

# --- Tiny Integration Surface ---
class SudokuGame:
    def __init__(self):
        self.puzzle: Grid = None
        self.solution: Grid = None

    def load_puzzle(self, puzzle: Grid, solution: Grid):
        self.puzzle = [row[:] for row in puzzle]
        self.solution = [row[:] for row in solution]

    def new_game(self, difficulty: str):
        holes = holes_for(difficulty)
        sol = make_full_board()
        puz = make_puzzle_unique(sol, holes)
        self.load_puzzle(puz, sol)
        return puz, sol


# =========================================
# Integration Test Harness (non-interactive)
# =========================================
def run_integration_test(difficulty: Optional[str] = None):
    # Resolve difficulty: try file, then provided arg, then prompt
    file_diff = read_difficulty_from_file()
    if file_diff:
        difficulty = file_diff
    elif difficulty is None:
        difficulty = choose_difficulty()
    print(f"\n# RUNNING INTEGRATION TEST ({difficulty.upper()})")
    engine = SudokuGame()
    puzzle, solution = engine.new_game(difficulty)

    solver = SudokuSolver()
    solver.load_puzzle(puzzle, solution)
    print("✅ Loaded puzzle and started timer.")
    print_board(solver.current_grid, "Initial Puzzle")

    # Add one correct value at the first empty
    empty = None
    for r in range(9):
        for c in range(9):
            if solver.current_grid[r][c] == 0:
                empty = (r, c); break
        if empty: break

    if empty:
        r, c = empty
        val = solution[r][c]
        solver.make_user_move(r, c, val)
        assert solver.current_grid[r][c] == val
        print(f"✅ Add Value Passed: Placed {val} at ({r}, {c}).")

    # Clear latest
    if clear_latest_entry(solver):
        print("✅ Clear Latest Passed.")

    # Auto solve
    ok, t = auto_solve_whole(solver)
    if ok and is_puzzle_correct(solver):
        print(f"✅ Auto-Solve Passed in {t:.4f}s and verified.")
        print_board(solver.current_grid, "Solved Board")

    # Reset
    reset_grid(solver)
    if solver.current_grid == solver.initial_puzzle:
        print("✅ Reset Passed: Restored initial puzzle.")

# =========================================
# Interactive Main (optional)
# =========================================
def main():
    print("=== Sudoku Puzzle Generator (Unique) + Solver Utilities ===")
    d = choose_difficulty()
    engine = SudokuGame()
    puzzle, solution = engine.new_game(d)

    print_board(puzzle, "Generated Puzzle (unique solution)")
    print_board(solution, "Solved Board")

    # Quick demo: load into solver and allow instant solve
    solver = SudokuSolver()
    solver.load_puzzle(puzzle, solution)
    ok, t = auto_solve_whole(solver)
    if ok:
        print(f"Auto-solved in {t:.4f}s.")
        print_board(solver.current_grid, "Auto-Solved (for demo)")

if __name__ == "__main__":
    # Run a non-interactive test first, then offer interactive path if desired
    run_integration_test()
    # Uncomment to run interactive flow:
    # main()
    print("\nAll test cases completed!")
