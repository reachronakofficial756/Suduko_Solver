# Feature Wrappers for Frontend Integration.
# These functions act as the bridge between the UI buttons and the core SudokuSolver class.

import time
from typing import Tuple, List
from sudoku_core_solverbm1 import SudokuSolver, Grid

def clear_latest_entry(solver: SudokuSolver) -> bool:
    # Undo last user move - makes mistakes easy to fix.
    return solver.clear_latest_entry()

def reset_grid(solver: SudokuSolver):
    # Go back to square one: the original puzzle only. Also resets timer and animation log.
    solver.reset_grid()

def auto_solve_whole(solver: SudokuSolver) -> Tuple[bool, float]:
    # Instantly fills every cell with the solution (like a 'Reveal All').
    if not solver.current_grid:
        return False, 0.0

    # Work on a copy to prevent partial mutations if solve fails
    grid_to_solve = [row[:] for row in solver.current_grid]
    solver.moves_made_by_solver = []

    t0 = time.time()
    ok = solver._solve_recursive(grid_to_solve)
    elapsed = time.time() - t0

    if ok:
        solver.current_grid = grid_to_solve
        solver.stop_game_timer()

    return ok, elapsed

def verify_solution(solver: SudokuSolver) -> bool:
    # Checks: Has the user truly finished the puzzle correctly?
    return solver.current_grid == solver.solution_grid

def get_hint_and_apply(solver: SudokuSolver) -> bool:
    # Fill the first empty square with the correct answer (from solution grid).
    empty_pos = solver._find_empty(solver.current_grid)
    if empty_pos:
        r, c = empty_pos
        correct_num = solver.solution_grid[r][c]
        # We use make_user_move so this action is undoable
        solver.make_user_move(r, c, correct_num)
        return True
    return False

def generate_stepwise_path(solver: SudokuSolver) -> List[Tuple[int, int, int]]:
    # For animation: returns the entire "movie" of the solver's thinking as a list of steps.
    return solver.generate_stepwise_path()