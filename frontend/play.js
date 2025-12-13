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
let pencilMode = false;
let pencilMarks = {}; // Store pencil marks for each cell

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

// Track user's move history for stepwise display
let userMoveHistory = [];

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

  // Record this move in user history (for stepwise display)
  userMoveHistory.push({
    row: row,
    col: col,
    value: value,
    timestamp: now
  });

  // Check if the placed number is wrong (doesn't match solution)
  if (value !== 0 && solution && solution[row] && solution[row][col] !== value) {
    playerStats.mistakes++;
  }

  calculateStrainScore();
  updateStatsDisplay();
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
  if (avgTimeEl && playerStats.totalMoves > 0) {
    const avgTime = (playerStats.totalMoveTime / playerStats.totalMoves) / 1000;
    avgTimeEl.textContent = `${avgTime.toFixed(1)}s`;
  }

  const undoRateEl = $('undoRate');
  if (undoRateEl && playerStats.totalMoves > 0) {
    const rate = (playerStats.undoCount / playerStats.totalMoves) * 100;
    undoRateEl.textContent = `${rate.toFixed(0)}%`;
  }

  const mistakesEl = $('mistakes');
  if (mistakesEl) {
    mistakesEl.textContent = playerStats.mistakes;
  }

  const hintDepEl = $('hintDependency');
  if (hintDepEl && playerStats.totalMoves > 0) {
    const dep = (playerStats.hintsUsed / playerStats.totalMoves) * 100;
    hintDepEl.textContent = `${dep.toFixed(0)}%`;
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
  startTs = Date.now() - pausedTime;
  $('timer').textContent = formatTime(pausedTime);
  timerInterval = setInterval(() => {
    $('timer').textContent = formatTime(Date.now() - startTs);
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  pausedTime = 0;
  startTs = Date.now();
  $('timer').textContent = '00:00';
  timerInterval = setInterval(() => {
    $('timer').textContent = formatTime(Date.now() - startTs);
  }, 1000);
}

function cellKey(r, c) { return `${r},${c}`; }

function buildGrid() {
  const gridEl = $('grid');
  gridEl.innerHTML = '';
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
      btn.addEventListener('click', () => selectCell(r, c, btn));
      gridEl.appendChild(btn);
    }
  }
  updateDigitCounts();
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

  // Highlight wrong numbers in red
  if (n !== 0 && solution && solution[r] && solution[r][c] !== n) {
    cell.classList.add('wrong-number');
  } else {
    cell.classList.remove('wrong-number');
  }

  // Track the move for performance stats
  trackMove(r, c, n);

  updateDigitCounts();
  applySmartHighlighting(r, c);
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
  try {
    const res = await fetch(`${API_BASE}/api/hint`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grid: current, solution }) });
    const data = await res.json();
    if (data.has_hint) {
      const { row, col, value } = data;
      selected = [row, col];
      applyNumber(value);
    }
  } catch (e) { console.error(e); }
}

async function solve() {
  const healthy = await checkHealth();
  if (!healthy) {
    alert('Backend not reachable at http://127.0.0.1:8000. Start it, then retry.');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/solve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grid: current }) });
    if (!res.ok) {
      const txt = await res.text().catch(() => "<no body>");
      throw new Error(`Solve failed (${res.status}): ${txt}`);
    }
    const data = await res.json();
    if (!data.solved || !data.solution) {
      alert('Puzzle could not be solved by the backend.');
      return;
    }

    await animateSolve(data.solution);

    current = data.solution;
    fixed = new Set();
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) fixed.add(cellKey(r, c));
    buildGrid();
    clearInterval(timerInterval);
  } catch (e) {
    console.error(e);
    alert(`Solve error: ${e?.message || e}`);
  }
}

async function animateSolve(solution) {
  const cells = document.querySelectorAll('.cell');
  const emptyCells = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (current[r][c] === 0 && solution[r][c] !== 0) {
        emptyCells.push({ r, c, value: solution[r][c] });
      }
    }
  }

  for (const { r, c, value } of emptyCells) {
    const idx = r * 9 + c;
    const cell = cells[idx];

    cell.classList.add('solving');
    cell.textContent = String(value);
    current[r][c] = value;

    await new Promise(resolve => setTimeout(resolve, 30));
  }

  setTimeout(() => {
    cells.forEach(c => c.classList.remove('solving'));
  }, 300);
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
    undoStack = [];
    isPaused = false;
    $('pauseBtn').textContent = '⏸';
    resetPlayerStats();
    buildGrid();
    resetTimer();
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
  if (isPaused) {
    pausedTime = Date.now() - startTs;
    clearInterval(timerInterval);
    pauseBtn.querySelector('.icon').textContent = '▶';
  } else {
    startTimer();
    pauseBtn.querySelector('.icon').textContent = '⏸';
  }
}

function togglePencilMode() {
  pencilMode = !pencilMode;
  const pencilBtn = $('pencilBtn');
  if (pencilMode) {
    pencilBtn.classList.add('active');
  } else {
    pencilBtn.classList.remove('active');
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

  // Stepwise user move history
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
}

document.addEventListener('DOMContentLoaded', main);
