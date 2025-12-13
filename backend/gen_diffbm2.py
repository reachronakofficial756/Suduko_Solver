import random

# ---------- Difficulty ----------
def choose_difficulty():
    print("Choose difficulty: easy / medium / hard / expert")
    while True:
        d = input("Difficulty: ").strip().lower()
        if d in ("easy", "medium", "hard", "expert"):
            return d
        print("Please type: easy, medium, hard, or expert.")

def holes_for(d):
    return {"easy": 30, "medium": 40, "hard": 50, "expert": 60}.get(d, 40)

# ---------- Board I/O ----------
def print_board(b, title="Board"):
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

# ---------- Core Sudoku Helpers ----------
def find_empty(b):
    for r in range(9):
        for c in range(9):
            if b[r][c] == 0:
                return r, c
    return None

def valid(b, n, pos):
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

def solve(b):
    spot = find_empty(b)
    if not spot:
        return True
    r, c = spot
    nums = list(range(1, 10))
    random.shuffle(nums)
    for n in nums:
        if valid(b, n, (r, c)):
            b[r][c] = n
            if solve(b):
                return True
            b[r][c] = 0
    return False

# ---------- (Simplified) Solution Counter ----------
def count_solutions(b, limit=2):
    """Count up to `limit` solutions. Stops early once `limit` is reached."""
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

# ---------- Generate Full Grid ----------
def make_full_board():
    b = [[0] * 9 for _ in range(9)]
    solve(b)
    return b

# ---------- Carve with Unique-Solution Guarantee ----------
def make_puzzle_unique(solution, holes):
    puzzle = [row[:] for row in solution]
    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)

    removed = 0
    for r, c in cells:
        if removed >= holes:
            break
        keep = puzzle[r][c]
        puzzle[r][c] = 0
        if count_solutions(puzzle, limit=2) == 1:
            removed += 1
        else:
            puzzle[r][c] = keep  # revert if uniqueness lost

    return puzzle  # may remove slightly fewer than requested to keep uniqueness

# ---------- Tiny Integration Surface ----------
class SudokuGame:
    def __init__(self):
        self.puzzle = None
        self.solution = None

    def load_puzzle(self, puzzle, solution):
        self.puzzle = [row[:] for row in puzzle]
        self.solution = [row[:] for row in solution]

    def new_game(self, difficulty):
        holes = holes_for(difficulty)
        sol = make_full_board()
        puz = make_puzzle_unique(sol, holes)
        self.load_puzzle(puz, sol)
        return puz, sol

# ---------- Main ----------
def main():
    print("=== Sudoku Puzzle Generator (Unique) ===")
    d = choose_difficulty()

    engine = SudokuGame()
    puzzle, solution = engine.new_game(d)

    print_board(puzzle, "Generated Puzzle (unique solution)")
    print_board(solution, "Solved Board")
    return puzzle, solution

if __name__ == "__main__":
    main()
