// Production backend URL - Update this with your hosted backend URL
// To deploy: See DEPLOYMENT_GUIDE.md or run deploy-backend.sh for instructions
const PRODUCTION_API = 'https://suduko-solver-8y24.onrender.com'; // Deployed backend on Render

const DEFAULT_APIS = [
  PRODUCTION_API, // Try production first
  'http://127.0.0.1:8000',
  'http://localhost:8000',
  'http://10.0.2.2:8000', // Android emulator loopback
  'http://10.0.3.2:8000'  // Genymotion loopback
];
let API_BASE = localStorage.getItem('api_base') || PRODUCTION_API;

let puzzle = null;
let solution = null;
let current = null;
let fixed = new Set();
let selected = null; // [r,c]
let selectedNumber = null;
let undoStack = [];
let timerInterval = null;
let startTs = Date.now();
let pausedTime = 0;
let isPaused = false;

// Sound effects
const correctSound = new Audio('./Correct_sound.mp3');
const incorrectSound = new Audio('./Incorrect_sound.mp3');
correctSound.volume = 0.5; // Set volume to 50%
incorrectSound.volume = 1.0;

// ===== PLAYER PERFORMANCE TRACKING =====
let playerStats = {
  totalMoves: 0,
  totalMoveTime: 0,
  lastMoveTime: Date.now(),
  undoCount: 0,
  mistakes: 0,
  hintsUsed: 0,
  strainScore: 0
};

// Track user's move history for My Moves display
let userMoveHistory = [];

// ===== DIFFICULTY LIMITS =====
const DIFFICULTY_LIMITS = {
  easy: { hints: 10, mistakes: Infinity, timeLimit: 30 * 60 * 1000 }, // 30 minutes
  medium: { hints: 10, mistakes: 10, timeLimit: 20 * 60 * 1000 }, // 20 minutes
  hard: { hints: 3, mistakes: 5, timeLimit: 10 * 60 * 1000 }, // 10 minutes
  expert: { hints: 0, mistakes: 3, timeLimit: 10 * 60 * 1000 } // 10 minutes
};

let currentDifficulty = 'medium'; // Default
let gameOver = false;
let timeRemaining = 0; // Time remaining in milliseconds

function resetPlayerStats() {
  userMoveHistory = []; // Clear move history
  playerStats = {
    totalMoves: 0,
    totalMoveTime: 0,
    lastMoveTime: Date.now(),
    undoCount: 0,
    mistakes: 0,
    hintsUsed: 0,
    strainScore: 0
  };
  updateStatsDisplay();
}

function trackMove(row, col, value) {
  const now = Date.now();
  const moveTime = now - playerStats.lastMoveTime;

  playerStats.totalMoves++;
  playerStats.totalMoveTime += moveTime;
  playerStats.lastMoveTime = now;

  // Record this move in user history (for My Moves display)
  userMoveHistory.push({
    row: row,
    col: col,
    value: value,
    timestamp: now
  });

  // Check if the placed number is wrong (doesn't match solution)
  if (value !== 0 && solution && solution[row] && solution[row][col] !== value) {
    playerStats.mistakes++;
    // Check if mistakes limit exceeded
    checkGameOver();
  }

  calculateStrainScore();
  updateStatsDisplay();
}

// Check if game over conditions are met
function checkGameOver() {
  if (gameOver) return; // Already game over

  const limits = DIFFICULTY_LIMITS[currentDifficulty];

  // Check mistakes limit
  if (playerStats.mistakes > limits.mistakes) {
    gameOver = true;
    clearInterval(timerInterval);

    setTimeout(() => {
      showGameOverModal('mistakes');
    }, 300);
    return true;
  }

  return false;
}

function trackUndo() {
  playerStats.undoCount++;
  calculateStrainScore();
  updateStatsDisplay();
}

function trackHint() {
  playerStats.hintsUsed++;
  calculateStrainScore();
  updateStatsDisplay();
}

function calculateStrainScore() {
  if (playerStats.totalMoves === 0) {
    playerStats.strainScore = 0;
    return;
  }

  const avgTimePerMove = (playerStats.totalMoveTime / playerStats.totalMoves) / 1000;
  const undoRate = (playerStats.undoCount / playerStats.totalMoves) * 100;
  const mistakeRate = (playerStats.mistakes / playerStats.totalMoves) * 100;
  const hintDependency = (playerStats.hintsUsed / Math.max(playerStats.totalMoves, 1)) * 100;

  let strain = 0;

  // Time factor (0-30 points)
  const timeFactor = Math.min(30, Math.max(0, (avgTimePerMove - 5) * 3));
  strain += timeFactor;

  // Undo factor (0-20 points)
  const undoFactor = Math.min(20, Math.max(0, (undoRate - 10) * 0.5));
  strain += undoFactor;

  // Mistake factor (0-30 points) - Higher weight for mistakes
  const mistakeFactor = Math.min(30, Math.max(0, (mistakeRate - 5) * 0.75));
  strain += mistakeFactor;

  // Hint factor (0-20 points)
  const hintFactor = Math.min(20, Math.max(0, (hintDependency - 5) * 1));
  strain += hintFactor;

  playerStats.strainScore = Math.round(Math.min(100, Math.max(0, strain)));
}

function getStrainDescription(score) {
  if (score === 0) return 'Just started';
  if (score < 15) return 'Cruising smoothly';
  if (score < 30) return 'Comfortable pace';
  if (score < 45) return 'Moderate challenge';
  if (score < 60) return 'Getting tricky';
  if (score < 75) return 'High difficulty';
  if (score < 90) return 'Very challenging';
  return 'Maximum strain';
}

function updateStatsDisplay() {
  const strainScoreEl = $('strainScore');
  const strainFillEl = $('strainFill');
  const strainDescEl = $('strainDescription');

  if (strainScoreEl) strainScoreEl.textContent = playerStats.strainScore;
  if (strainFillEl) strainFillEl.style.width = `${playerStats.strainScore}%`;
  if (strainDescEl) strainDescEl.textContent = getStrainDescription(playerStats.strainScore);

  const avgTimeEl = $('avgTimePerMove');
  if (avgTimeEl) {
    if (playerStats.totalMoves > 0) {
      const avgTime = (playerStats.totalMoveTime / playerStats.totalMoves) / 1000;
      avgTimeEl.textContent = `${avgTime.toFixed(1)}s`;
    } else {
      avgTimeEl.textContent = '0s';
    }
  }

  const undoRateEl = $('undoRate');
  if (undoRateEl) {
    if (playerStats.totalMoves > 0) {
      const rate = (playerStats.undoCount / playerStats.totalMoves) * 100;
      undoRateEl.textContent = `${rate.toFixed(0)}%`;
    } else {
      undoRateEl.textContent = '0%';
    }
  }

  const mistakesEl = $('mistakes');
  if (mistakesEl) {
    mistakesEl.textContent = playerStats.mistakes;
  }

  const hintDepEl = $('hintDependency');
  if (hintDepEl) {
    if (playerStats.totalMoves > 0) {
      const dep = (playerStats.hintsUsed / playerStats.totalMoves) * 100;
      hintDepEl.textContent = `${dep.toFixed(0)}%`;
    } else {
      hintDepEl.textContent = '0%';
    }
  }
}

function $(id) { return document.getElementById(id); }

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function startTimer() {
  clearInterval(timerInterval);

  // Calculate remaining time from when we paused
  const elapsed = pausedTime;
  timeRemaining = DIFFICULTY_LIMITS[currentDifficulty].timeLimit - elapsed;

  const timerEl = $('timer');
  if (timerEl) timerEl.textContent = formatTime(timeRemaining);

  timerInterval = setInterval(() => {
    timeRemaining -= 1000; // Decrease by 1 second

    const timerEl = $('timer');
    if (timerEl) {
      if (timeRemaining <= 0) {
        timerEl.textContent = '00:00';
        clearInterval(timerInterval);

        // Time's up - game over
        if (!gameOver) {
          gameOver = true;
          setTimeout(() => {
            showGameOverModal('time');
          }, 300);
        }
      } else {
        timerEl.textContent = formatTime(timeRemaining);

        // Update pausedTime for pause/resume functionality
        pausedTime = DIFFICULTY_LIMITS[currentDifficulty].timeLimit - timeRemaining;
      }
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  pausedTime = 0;

  // Set initial time remaining based on difficulty
  timeRemaining = DIFFICULTY_LIMITS[currentDifficulty].timeLimit;

  const timerEl = $('timer');
  if (timerEl) timerEl.textContent = formatTime(timeRemaining);

  timerInterval = setInterval(() => {
    timeRemaining -= 1000; // Decrease by 1 second

    const timerEl = $('timer');
    if (timerEl) {
      if (timeRemaining <= 0) {
        timerEl.textContent = '00:00';
        clearInterval(timerInterval);

        // Time's up - game over
        if (!gameOver) {
          gameOver = true;
          setTimeout(() => {
            showGameOverModal('time');
          }, 300);
        }
      } else {
        timerEl.textContent = formatTime(timeRemaining);

        // Update pausedTime for pause/resume functionality
        pausedTime = DIFFICULTY_LIMITS[currentDifficulty].timeLimit - timeRemaining;
      }
    }
  }, 1000);
}

function cellKey(r, c) { return `${r},${c}`; }

function buildGrid() {
  const gridEl = $('grid');

  // Use DocumentFragment for batch DOM updates (much faster)
  const fragment = document.createDocumentFragment();

  // Pre-calculate all cells
  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = current[r][c];
      const btn = document.createElement('button');
      btn.className = 'cell';
      btn.dataset.row = r;
      btn.dataset.col = c;

      if ((c + 1) % 3 === 0 && c !== 8) btn.classList.add('bold-right');
      if ((r + 1) % 3 === 0 && r !== 8) btn.classList.add('bold-bottom');
      btn.textContent = v ? String(v) : '';

      if (fixed.has(cellKey(r, c))) {
        btn.classList.add('fixed');
        btn.disabled = true;
      }

      // Store event listener info for later attachment
      cells.push({ btn, r, c });
      fragment.appendChild(btn);
    }
  }

  // Single DOM update (much faster than 81 individual appendChild calls)
  gridEl.innerHTML = '';
  gridEl.appendChild(fragment);

  // Attach event listeners after DOM is updated
  // Use requestAnimationFrame to avoid blocking the main thread
  requestAnimationFrame(() => {
    cells.forEach(({ btn, r, c }) => {
      btn.addEventListener('click', () => selectCell(r, c, btn));
    });
  });

  // Update digit counts asynchronously
  requestAnimationFrame(() => {
    updateDigitCounts();
  });
}

// Smart highlighting: row, column, box, and same numbers
function applySmartHighlighting(row, col) {
  const cells = document.querySelectorAll('.cell');
  const selectedValue = current[row][col];
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  cells.forEach(cell => {
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    const cellValue = current[r][c];

    // Remove all highlight classes first
    cell.classList.remove('highlight-row-col', 'highlight-box', 'highlight-same');

    // Skip the selected cell
    if (r === row && c === col) return;

    // Highlight same numbers
    if (cellValue && cellValue === selectedValue) {
      cell.classList.add('highlight-same');
    }
    // Highlight row and column
    else if (r === row || c === col) {
      cell.classList.add('highlight-row-col');
    }
    // Highlight 3x3 box
    else if (r >= boxRow && r < boxRow + 3 && c >= boxCol && c < boxCol + 3) {
      cell.classList.add('highlight-box');
    }
  });
}

function selectCell(r, c, el) {
  // Don't allow selection when paused
  if (isPaused) return;

  selected = [r, c];
  document.querySelectorAll('.cell').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');

  // Apply smart highlighting
  applySmartHighlighting(r, c);
}

function isValidPlacement(grid, row, col, num) {
  if (num === 0) return true;

  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c] === num) return false;
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col] === num) return false;
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && grid[r][c] === num) return false;
    }
  }

  return true;
}

function highlightError(row, col) {
  const cells = document.querySelectorAll('.cell');

  cells.forEach(c => {
    c.classList.remove('error', 'error-highlight');
  });

  const idx = row * 9 + col;
  cells[idx].classList.add('error');

  for (let c = 0; c < 9; c++) {
    if (c !== col) {
      const cellIdx = row * 9 + c;
      cells[cellIdx].classList.add('error-highlight');
    }
  }

  for (let r = 0; r < 9; r++) {
    if (r !== row) {
      const cellIdx = r * 9 + col;
      cells[cellIdx].classList.add('error-highlight');
    }
  }

  setTimeout(() => {
    cells.forEach(c => {
      c.classList.remove('error', 'error-highlight');
    });
  }, 1500);
}

function applyNumber(n) {
  if (!selected) return;
  const [r, c] = selected;
  if (fixed.has(cellKey(r, c))) return;
  const prev = current[r][c];
  if (prev === n) return;

  // Allow placement even if invalid, but show warning
  if (!isValidPlacement(current, r, c, n) && n !== 0) {
    highlightError(r, c);
  }

  undoStack.push({ r, c, prev });
  current[r][c] = n;
  const idx = r * 9 + c;
  const cell = document.querySelectorAll('.cell')[idx];
  cell.textContent = n ? String(n) : '';

  // Play sound and highlight wrong numbers in red
  if (n !== 0 && solution && solution[r] && solution[r][c] !== n) {
    cell.classList.add('wrong-number');
    // Play incorrect sound
    incorrectSound.currentTime = 0; // Reset to start
    incorrectSound.play().catch(e => console.log('Sound play failed:', e));
  } else if (n !== 0) {
    cell.classList.remove('wrong-number');
    // Play correct sound
    correctSound.currentTime = 0; // Reset to start
    correctSound.play().catch(e => console.log('Sound play failed:', e));
  } else {
    // Erasing a number (n === 0)
    cell.classList.remove('wrong-number');
  }

  // Track the move for performance stats
  trackMove(r, c, n);

  updateDigitCounts();
  applySmartHighlighting(r, c);
  // Check if puzzle is completed
  checkPuzzleCompletion();
}

// Check if the puzzle is completed correctly (optimized)
function checkPuzzleCompletion() {
  // Early exit if no solution available
  if (!solution) return false;

  // Single loop to check both completion and correctness
  // This is more efficient than two separate loops
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const value = current[r][c];

      // Early exit if cell is empty
      if (value === 0) return false;

      // Early exit if value doesn't match solution
      if (value !== solution[r][c]) return false;
    }
  }

  // All cells are filled and correct - puzzle completed!
  console.log('🎉 Puzzle completed! Stopping timer and showing modal...');
  clearInterval(timerInterval);

  // Show completion modal with stats
  setTimeout(() => {
    showCompletionModal();
  }, 300);

  return true;
}

// Show completion modal with game stats
function showCompletionModal() {
  console.log('showCompletionModal called');

  const finalTime = formatTime(Date.now() - startTs);
  const avgTime = playerStats.totalMoves > 0
    ? ((playerStats.totalMoveTime / playerStats.totalMoves) / 1000).toFixed(1)
    : '0';

  // Update modal with stats
  const completionModal = $('completionModal');
  console.log('Completion modal element:', completionModal);

  if (!completionModal) {
    console.error('Completion modal not found!');
    return;
  }

  const timeEl = $('completionTime');
  const movesEl = $('completionMoves');
  const avgTimeEl = $('completionAvgTime');
  const mistakesEl = $('completionMistakes');
  const hintsEl = $('completionHints');
  const stressEl = $('completionStress');

  if (timeEl) timeEl.textContent = finalTime;
  if (movesEl) movesEl.textContent = playerStats.totalMoves;
  if (avgTimeEl) avgTimeEl.textContent = `${avgTime}s`;
  if (mistakesEl) mistakesEl.textContent = playerStats.mistakes;
  if (hintsEl) hintsEl.textContent = playerStats.hintsUsed;
  if (stressEl) stressEl.textContent = `${playerStats.strainScore}/100`;

  // Show modal
  console.log('Adding show class to modal');
  completionModal.classList.add('show');
  console.log('Modal classes:', completionModal.classList);
}

// Show game over modal when limits are exceeded
function showGameOverModal(reason) {
  const finalTime = formatTime(Date.now() - startTs);
  const avgTime = playerStats.totalMoves > 0
    ? ((playerStats.totalMoveTime / playerStats.totalMoves) / 1000).toFixed(1)
    : '0';

  const completionModal = $('completionModal');
  if (!completionModal) return;

  // Update modal header for game over
  const modalHeader = completionModal.querySelector('.modal-header h2');
  if (modalHeader) {
    modalHeader.textContent = '😞 Game Over!';
  }

  // Update message
  const modalBody = completionModal.querySelector('.modal-body p');
  if (modalBody) {
    const limits = DIFFICULTY_LIMITS[currentDifficulty];
    if (reason === 'mistakes') {
      modalBody.textContent = `You exceeded the mistake limit of ${limits.mistakes} for ${currentDifficulty} mode!`;
    } else if (reason === 'hints') {
      modalBody.textContent = `You exceeded the hint limit of ${limits.hints} for ${currentDifficulty} mode!`;
    } else if (reason === 'autosolve') {
      modalBody.textContent = `Auto-solve is not allowed in ${currentDifficulty} mode!`;
    } else if (reason === 'time') {
      const timeLimit = Math.floor(limits.timeLimit / 60000); // Convert to minutes
      modalBody.textContent = `Time's up! You didn't complete the puzzle within ${timeLimit} minutes for ${currentDifficulty} mode!`;
    }
  }

  // Update stats
  const timeEl = $('completionTime');
  const movesEl = $('completionMoves');
  const avgTimeEl = $('completionAvgTime');
  const mistakesEl = $('completionMistakes');
  const hintsEl = $('completionHints');
  const stressEl = $('completionStress');

  if (timeEl) timeEl.textContent = finalTime;
  if (movesEl) movesEl.textContent = playerStats.totalMoves;
  if (avgTimeEl) avgTimeEl.textContent = `${avgTime}s`;
  if (mistakesEl) mistakesEl.textContent = playerStats.mistakes;
  if (hintsEl) hintsEl.textContent = playerStats.hintsUsed;
  if (stressEl) stressEl.textContent = `${playerStats.strainScore}/100`;

  // Show modal
  completionModal.classList.add('show');
}

function undo() {
  const last = undoStack.pop();
  if (!last) return;
  current[last.r][last.c] = last.prev;
  const idx = last.r * 9 + last.c;
  const cell = document.querySelectorAll('.cell')[idx];
  cell.textContent = last.prev ? String(last.prev) : '';

  // Re-check if previous value is wrong
  const prev = last.prev;
  if (prev !== 0 && solution && solution[last.r] && solution[last.r][last.c] !== prev) {
    cell.classList.add('wrong-number');
  } else {
    cell.classList.remove('wrong-number');
  }

  trackUndo();
  updateDigitCounts();
}

async function hint() {
  // Check if game is over
  if (gameOver) {
    alert('Game is over! Start a new game.');
    return;
  }

  // Check hint limit for current difficulty
  const limits = DIFFICULTY_LIMITS[currentDifficulty];
  if (playerStats.hintsUsed >= limits.hints) {
    gameOver = true;
    clearInterval(timerInterval);
    setTimeout(() => {
      showGameOverModal('hints');
    }, 300);
    return;
  }

  // If user has selected a cell, solve that specific cell
  if (selected) {
    const [r, c] = selected;

    // Check if the selected cell is not fixed and is empty or wrong
    if (!fixed.has(cellKey(r, c))) {
      const correctValue = solution[r][c];

      // Only apply hint if the cell is empty or has wrong value
      if (current[r][c] === 0 || current[r][c] !== correctValue) {
        applyNumber(correctValue);
        trackHint();
        return;
      } else {
        // Cell already has correct value
        alert('This cell already has the correct value!');
        return;
      }
    } else {
      // Selected cell is fixed (original puzzle number)
      alert('Cannot use hint on a fixed cell!');
      return;
    }
  }


  // No cell selected - find any empty cell locally
  let emptyCell = null;

  // Find first empty cell
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (current[r][c] === 0 && !fixed.has(cellKey(r, c))) {
        emptyCell = { row: r, col: c };
        break;
      }
    }
    if (emptyCell) break;
  }

  if (emptyCell) {
    const { row, col } = emptyCell;
    const correctValue = solution[row][col];

    // Select the cell and apply the hint
    selected = [row, col];

    // Highlight the cell
    const idx = row * 9 + col;
    const cells = document.querySelectorAll('.cell');
    cells.forEach(e => e.classList.remove('selected'));
    cells[idx].classList.add('selected');

    // Apply the correct value
    applyNumber(correctValue);
    trackHint();
  } else {
    alert('No empty cells found! Puzzle is complete.');
  }
}

async function solve() {
  // Check if auto-solve is allowed for current difficulty
  // Auto-solve triggers game over for all difficulties
  gameOver = true;
  clearInterval(timerInterval);

  setTimeout(() => {
    showGameOverModal('autosolve');
  }, 300);
  return;
}

async function animateSolve(solution) {
  const cells = document.querySelectorAll('.cell');
  const cellsToFill = [];

  // Collect all cells that need to be filled or corrected
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const currentValue = current[r][c];
      const correctValue = solution[r][c];

      // Include empty cells and incorrect cells
      if (currentValue === 0 || currentValue !== correctValue) {
        cellsToFill.push({ r, c, value: correctValue });
      }
    }
  }

  // Animate each cell with a smooth staggered effect
  for (let i = 0; i < cellsToFill.length; i++) {
    const { r, c, value } = cellsToFill[i];
    const idx = r * 9 + c;
    const cell = cells[idx];

    // Remove any error styling
    cell.classList.remove('wrong-number', 'error', 'error-highlight');

    // Add solving animation
    cell.classList.add('solving');
    cell.textContent = String(value);
    current[r][c] = value;

    // Staggered delay: faster at the beginning, slower towards the end
    const delay = Math.min(50, 20 + (i * 0.5));
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Clean up animation classes after completion
  setTimeout(() => {
    cells.forEach(c => c.classList.remove('solving'));
  }, 500);
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return data && data.status === 'ok';
  } catch { return false; }
}

async function detectApiBase() {
  const candidates = [API_BASE, ...DEFAULT_APIS.filter(u => u !== API_BASE)];
  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/health`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data && data.status === 'ok') {
          API_BASE = base;
          localStorage.setItem('api_base', base);
          return true;
        }
      }
    } catch {/* continue */ }
  }
  return false;
}

async function newGame() {
  const healthy = await checkHealth();
  if (!healthy) {
    const found = await detectApiBase();
    if (!found) {
      const manual = prompt('Backend not reachable. Enter API URL (e.g. http://127.0.0.1:8000):', API_BASE);
      if (!manual) return;
      API_BASE = manual.trim();
      localStorage.setItem('api_base', API_BASE);
      const ok = await checkHealth();
      if (!ok) {
        alert('Still cannot reach the backend at: ' + API_BASE);
        return;
      }
    }
  }

  // Show difficulty modal instead of prompt
  showDifficultyModal();
}

// Function to actually start the game with selected difficulty
async function startGameWithDifficulty(difficulty) {
  // Save difficulty to localStorage
  localStorage.setItem('difficulty', difficulty);

  // Set current difficulty and reset game over flag
  currentDifficulty = difficulty;
  gameOver = false;

  // Update mode display
  const modeDisplay = $('currentMode');
  if (modeDisplay) {
    modeDisplay.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  try {
    let res = await fetch(`${API_BASE}/api/generate?difficulty=${encodeURIComponent(difficulty)}`);
    if (!res.ok) {
      res = await fetch(`${API_BASE}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ difficulty }) });
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "<no body>");
      throw new Error(`Generate failed (${res.status}): ${txt}`);
    }
    const data = await res.json();
    puzzle = data.puzzle;
    solution = data.solution;
    current = puzzle.map(row => row.slice());
    fixed = new Set();
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (puzzle[r][c] !== 0) fixed.add(cellKey(r, c));

    // Reset all game state
    undoStack = [];
    isPaused = false;
    selected = null;
    selectedNumber = null;

    // Reset pause button
    const pauseBtn = $('pauseBtn');
    if (pauseBtn) {
      const iconSpan = pauseBtn.querySelector('.icon');
      if (iconSpan) {
        iconSpan.textContent = '⏸';
      } else {
        pauseBtn.textContent = '⏸';
      }
    }

    // Reset player stats and move history
    resetPlayerStats();

    // Clear any paused state from grid
    const gridEl = $('grid');
    if (gridEl) {
      gridEl.classList.remove('paused');
      gridEl.querySelectorAll('.cell').forEach(cell => {
        cell.style.pointerEvents = '';
        cell.classList.remove('selected', 'wrong-number', 'error', 'error-highlight', 'solving');
      });
    }

    // Build fresh grid
    buildGrid();

    // Reset and start timer with new difficulty time limit
    resetTimer();

    // Update digit counts
    updateDigitCounts();

    // Reset My Moves display
    const stepwiseList = $('stepwiseList');
    if (stepwiseList) {
      stepwiseList.innerHTML = '<div class="stepwise-placeholder">Start playing to see your moves</div>';
    }
    const stepCount = $('stepCount');
    if (stepCount) {
      stepCount.textContent = '0 moves';
    }

  } catch (e) {
    console.error(e);
    alert(`Failed to start a new game. ${e?.message || e}`);
  }
}

// Update digit counts in Smart Input Panel
function updateDigitCounts() {
  const counts = {};
  for (let i = 1; i <= 9; i++) counts[i] = 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = current[r][c];
      if (val >= 1 && val <= 9) {
        counts[val]++;
      }
    }
  }

  for (let i = 1; i <= 9; i++) {
    const countEl = $(`count-${i}`);
    const btn = document.querySelector(`.number-btn[data-n="${i}"]`);
    if (countEl) {
      countEl.textContent = `${counts[i]}/9`;
    }
    if (btn) {
      if (counts[i] >= 9) {
        btn.classList.add('completed');
      } else {
        btn.classList.remove('completed');
      }
    }
  }
}

function togglePause() {
  isPaused = !isPaused;
  const pauseBtn = $('pauseBtn');
  const gridEl = $('grid');

  if (isPaused) {
    // Stop the timer and save current remaining time
    clearInterval(timerInterval);
    // pausedTime now represents how much time has elapsed
    pausedTime = DIFFICULTY_LIMITS[currentDifficulty].timeLimit - timeRemaining;

    // Disable grid interaction
    if (gridEl) {
      gridEl.classList.add('paused');
      // Disable all cell buttons
      gridEl.querySelectorAll('.cell').forEach(cell => {
        if (!cell.classList.contains('fixed')) {
          cell.style.pointerEvents = 'none';
        }
      });
    }

    // Clear selection
    document.querySelectorAll('.cell').forEach(e => e.classList.remove('selected'));
    selected = null;

    // Update the icon span if it exists, otherwise update button directly
    const iconSpan = pauseBtn.querySelector('.icon');
    if (iconSpan) {
      iconSpan.textContent = '▶';
    } else {
      pauseBtn.textContent = '▶';
    }
  } else {
    // Resume the timer from where it was paused
    startTimer();

    // Enable grid interaction
    if (gridEl) {
      gridEl.classList.remove('paused');
      // Enable all cell buttons
      gridEl.querySelectorAll('.cell').forEach(cell => {
        cell.style.pointerEvents = '';
      });
    }

    // Update the icon span if it exists, otherwise update button directly
    const iconSpan = pauseBtn.querySelector('.icon');
    if (iconSpan) {
      iconSpan.textContent = '⏸';
    } else {
      pauseBtn.textContent = '⏸';
    }
  }
}



function updateNumberPadSelection() {
  document.querySelectorAll('.number-btn').forEach(btn => {
    btn.classList.remove('selected');
    const n = parseInt(btn.getAttribute('data-n'), 10);
    if (n === selectedNumber) {
      btn.classList.add('selected');
    }
  });
}

function wireInputPanel() {
  document.getElementById('smartInputPanel').addEventListener('click', (e) => {
    const btn = e.target.closest('.number-btn');
    if (!btn) return;
    const n = parseInt(btn.getAttribute('data-n'), 10);
    if (Number.isInteger(n)) {
      if (btn.classList.contains('completed') && n !== 0) return;
      selectedNumber = n;
      updateNumberPadSelection();
      if (selected) {
        applyNumber(n);
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (isPaused) return;
    if (e.key >= '0' && e.key <= '9') {
      const n = parseInt(e.key, 10);
      selectedNumber = n;
      updateNumberPadSelection();
      applyNumber(n);
    }
  });
}

function main() {
  $('undoBtn').addEventListener('click', undo);
  $('hintBtn').addEventListener('click', hint);

  const pauseBtn = $('pauseBtn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', togglePause);
  }

  const autoSolveBtn = $('autoSolveBtn');
  if (autoSolveBtn) {
    autoSolveBtn.addEventListener('click', solve);
  }

  const newGameBtn = $('newGameBtn');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', newGame);
  }

  wireInputPanel();
  newGame();

  // Initialize mode display
  const currentDifficulty = localStorage.getItem('difficulty') || 'medium';
  const modeDisplay = $('currentMode');
  if (modeDisplay) {
    modeDisplay.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
  }

  // My Moves functionality
  const getStepsBtn = $('getStepsBtn');
  if (getStepsBtn) {
    getStepsBtn.addEventListener('click', () => {
      if (userMoveHistory.length === 0) {
        alert('No moves made yet! Start playing to see your move history.');
        return;
      }

      // Convert user move history to display format
      const steps = userMoveHistory.map(move => [move.row, move.col, move.value]);

      displayStepwiseSolution(steps);
      $('stepCount').textContent = `${userMoveHistory.length} moves`;
    });
  }

  function displayStepwiseSolution(steps) {
    const stepwiseList = $('stepwiseList');
    if (!stepwiseList) return;

    stepwiseList.innerHTML = '';

    steps.forEach((step, index) => {
      const [row, col, value] = step;
      const stepItem = document.createElement('div');
      stepItem.className = 'step-item';

      const stepNumber = document.createElement('div');
      stepNumber.className = 'step-number';
      stepNumber.textContent = index + 1;

      const stepInfo = document.createElement('div');
      stepInfo.className = 'step-info';

      const stepPosition = document.createElement('div');
      stepPosition.className = 'step-position';
      stepPosition.textContent = `Row ${row + 1}, Col ${col + 1}`;

      const stepValue = document.createElement('div');
      stepValue.className = 'step-value';
      if (value === 0) {
        stepValue.textContent = 'Erased';
        stepValue.style.color = '#888';
      } else {
        // Check if move was correct
        const isCorrect = solution && solution[row] && solution[row][col] === value;
        if (isCorrect) {
          stepValue.textContent = `Place ${value} ✓`;
          stepValue.style.color = '#4caf50';
        } else {
          stepValue.textContent = `Place ${value} ✗`;
          stepValue.style.color = '#ef5350';
        }
      }

      stepInfo.appendChild(stepPosition);
      stepInfo.appendChild(stepValue);
      stepItem.appendChild(stepNumber);
      stepItem.appendChild(stepInfo);
      stepwiseList.appendChild(stepItem);
    });

    // Initialize navigation
    initStepNavigation();
  }

  let currentStepIndex = 0;
  let allSteps = [];

  function initStepNavigation() {
    const stepNavUp = $('stepNavUp');
    const stepNavDown = $('stepNavDown');
    const stepwiseList = $('stepwiseList');

    if (!stepNavUp || !stepNavDown || !stepwiseList) return;

    allSteps = Array.from(stepwiseList.querySelectorAll('.step-item'));
    currentStepIndex = 0;

    if (allSteps.length > 0) {
      stepNavUp.disabled = false;
      stepNavDown.disabled = false;
      updateStepView();
    }

    stepNavUp.addEventListener('click', () => {
      if (currentStepIndex > 0) {
        currentStepIndex--;
        updateStepView();
      }
    });

    stepNavDown.addEventListener('click', () => {
      if (currentStepIndex < allSteps.length - 2) {
        currentStepIndex++;
        updateStepView();
      }
    });
  }

  function updateStepView() {
    const stepNavUp = $('stepNavUp');
    const stepNavDown = $('stepNavDown');

    // Hide all steps
    allSteps.forEach(step => step.style.display = 'none');

    // Show only 2 steps starting from currentStepIndex
    for (let i = currentStepIndex; i < Math.min(currentStepIndex + 2, allSteps.length); i++) {
      allSteps[i].style.display = 'flex';
    }

    // Update button states
    stepNavUp.disabled = currentStepIndex === 0;
    stepNavDown.disabled = currentStepIndex >= allSteps.length - 2;
  }

  // Difficulty modal controls
  const difficultyModal = $('difficultyModal');
  const submitDifficultyBtn = $('submitDifficultyBtn');
  const cancelDifficultyBtn = $('cancelDifficultyBtn');

  function showDifficultyModal() {
    if (difficultyModal) {
      difficultyModal.classList.add('active');
    }
  }

  function hideDifficultyModal() {
    if (difficultyModal) {
      difficultyModal.classList.remove('active');
    }
  }

  // Make showDifficultyModal globally accessible
  window.showDifficultyModal = showDifficultyModal;

  if (submitDifficultyBtn) {
    submitDifficultyBtn.addEventListener('click', () => {
      const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked');
      if (selectedDifficulty) {
        const difficulty = selectedDifficulty.value;
        hideDifficultyModal();
        startGameWithDifficulty(difficulty);
      }
    });
  }

  if (cancelDifficultyBtn) {
    cancelDifficultyBtn.addEventListener('click', () => {
      hideDifficultyModal();
    });
  }

  // Close modal on overlay click
  if (difficultyModal) {
    const overlay = difficultyModal.querySelector('.difficulty-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        hideDifficultyModal();
      });
    }
  }

  // Theme toggle button functionality
  const themeToggleBtn = $('themeToggleBtn');

  if (themeToggleBtn) {
    const lightIcon = themeToggleBtn.querySelector('.theme-icon-light');
    const darkIcon = themeToggleBtn.querySelector('.theme-icon-dark');

    // Function to update icon based on current theme
    function updateThemeIcon() {
      const currentTheme = localStorage.getItem('theme') || 'dark';
      console.log('Updating theme icon for theme:', currentTheme);

      if (currentTheme === 'dark') {
        // In dark mode, show sun icon (to switch to light)
        if (lightIcon) lightIcon.style.display = 'block';
        if (darkIcon) darkIcon.style.display = 'none';
      } else {
        // In light mode, show moon icon (to switch to dark)
        if (lightIcon) lightIcon.style.display = 'none';
        if (darkIcon) darkIcon.style.display = 'block';
      }
    }

    // Update icon on page load
    updateThemeIcon();

    // Toggle theme on button click
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = localStorage.getItem('theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      console.log('Theme toggle clicked. Switching from', currentTheme, 'to', newTheme);

      // Use theme manager if available
      if (window.themeManager) {
        window.themeManager.setTheme(newTheme);
      } else {
        // Fallback if theme manager not available
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
      }

      // Update icon
      updateThemeIcon();
    });

    // Listen for theme changes from other sources
    window.addEventListener('storage', (e) => {
      if (e.key === 'theme') {
        updateThemeIcon();
      }
    });
  }

  // Completion modal controls
  const completionModal = $('completionModal');
  const stayBtn = $('stayBtn');
  const newGameFromCompletionBtn = $('newGameFromCompletionBtn');

  if (stayBtn) {
    stayBtn.addEventListener('click', () => {
      if (completionModal) {
        completionModal.classList.remove('show');
      }
    });
  }

  if (newGameFromCompletionBtn) {
    newGameFromCompletionBtn.addEventListener('click', () => {
      if (completionModal) {
        completionModal.classList.remove('show');
      }
      // Show difficulty modal to start new game
      showDifficultyModal();
    });
  }

  // Close completion modal when clicking outside
  if (completionModal) {
    completionModal.addEventListener('click', (e) => {
      if (e.target === completionModal) {
        completionModal.classList.remove('show');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', main);
