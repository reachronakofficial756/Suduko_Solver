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
const GRACE_PERIOD_MS = 3000; // 3 seconds grace period for quick corrections

let playerStats = {
  totalMoves: 0,
  totalMoveTime: 0,
  lastMoveTime: Date.now(),
  undoCount: 0,
  correctionsPerCell: {}, // Track how many times each cell was changed (after grace period)
  hintsUsed: 0,
  strainScore: 0
};

// Track when each cell was last modified (for grace period)
let cellPlacementTimestamps = {};

function resetPlayerStats() {
  playerStats = {
    totalMoves: 0,
    totalMoveTime: 0,
    lastMoveTime: Date.now(),
    undoCount: 0,
    correctionsPerCell: {},
    hintsUsed: 0,
    strainScore: 0
  };
  cellPlacementTimestamps = {};
  updateStatsDisplay();
}

function trackMove(row, col) {
  const now = Date.now();
  const moveTime = now - playerStats.lastMoveTime;
  const key = `${row},${col}`;

  playerStats.totalMoves++;
  playerStats.totalMoveTime += moveTime;
  playerStats.lastMoveTime = now;

  // Check if this cell was modified before
  const lastPlacementTime = cellPlacementTimestamps[key];

  if (lastPlacementTime) {
    const timeSinceLastPlacement = now - lastPlacementTime;

    // Only count as correction if outside grace period
    if (timeSinceLastPlacement > GRACE_PERIOD_MS) {
      playerStats.correctionsPerCell[key] = (playerStats.correctionsPerCell[key] || 0) + 1;
    }
    // If within grace period, it's just a quick fix - don't punish!
  }

  // Update the timestamp for this cell
  cellPlacementTimestamps[key] = now;

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

  // Calculate average time per move (in seconds)
  const avgTimePerMove = (playerStats.totalMoveTime / playerStats.totalMoves) / 1000;

  // Calculate undo rate (percentage)
  const undoRate = (playerStats.undoCount / playerStats.totalMoves) * 100;

  // Calculate average corrections per cell
  const totalCorrections = Object.values(playerStats.correctionsPerCell).reduce((a, b) => a + b, 0);
  const avgCorrections = totalCorrections / Math.max(Object.keys(playerStats.correctionsPerCell).length, 1);

  // Calculate hint dependency (percentage)
  const hintDependency = (playerStats.hintsUsed / Math.max(playerStats.totalMoves, 1)) * 100;

  // Strain score formula (0-100)
  // Higher values = more strain/difficulty
  let strain = 0;

  // Time factor (0-30 points): slower = more strain
  // 0-5s = 0 points, 5-15s = linear, 15s+ = 30 points
  const timeFactor = Math.min(30, Math.max(0, (avgTimePerMove - 5) * 3));
  strain += timeFactor;

  // Undo factor (0-25 points): more undos = more strain
  // 0-10% = 0 points, 10-50% = linear, 50%+ = 25 points
  const undoFactor = Math.min(25, Math.max(0, (undoRate - 10) * 0.625));
  strain += undoFactor;

  // Correction factor (0-25 points): more corrections = more strain
  // 1 correction = 0 points, 2-5 = linear, 5+ = 25 points
  const correctionFactor = Math.min(25, Math.max(0, (avgCorrections - 1) * 6.25));
  strain += correctionFactor;

  // Hint factor (0-20 points): more hints = more strain
  // 0-5% = 0 points, 5-25% = linear, 25%+ = 20 points
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
  // Update strain score
  const strainScoreEl = $('strainScore');
  const strainFillEl = $('strainFill');
  const strainDescEl = $('strainDescription');

  if (strainScoreEl) {
    strainScoreEl.textContent = playerStats.strainScore;
  }

  if (strainFillEl) {
    strainFillEl.style.width = `${playerStats.strainScore}%`;
  }

  if (strainDescEl) {
    strainDescEl.textContent = getStrainDescription(playerStats.strainScore);
  }

  // Update average time per move
  const avgTimeEl = $('avgTimePerMove');
  if (avgTimeEl && playerStats.totalMoves > 0) {
    const avgTime = (playerStats.totalMoveTime / playerStats.totalMoves) / 1000;
    avgTimeEl.textContent = `${avgTime.toFixed(1)}s`;
  }

  // Update undo rate
  const undoRateEl = $('undoRate');
  if (undoRateEl && playerStats.totalMoves > 0) {
    const rate = (playerStats.undoCount / playerStats.totalMoves) * 100;
    undoRateEl.textContent = `${rate.toFixed(0)}%`;
  }

  // Update corrections
  const correctionsEl = $('corrections');
  if (correctionsEl) {
    const total = Object.values(playerStats.correctionsPerCell).reduce((a, b) => a + b, 0);
    correctionsEl.textContent = total;
  }

  // Update hint dependency
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

  if (!isValidPlacement(current, r, c, n)) {
    highlightError(r, c);
    return;
  }

  undoStack.push({ r, c, prev });
  current[r][c] = n;
  const idx = r * 9 + c;
  const cell = document.querySelectorAll('.cell')[idx];
  cell.textContent = n ? String(n) : '';

  // Track the move for performance stats
  trackMove(r, c);

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

  // Track undo for performance stats
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

      // Track hint usage for performance stats
      trackHint();

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
  // Get difficulty from URL parameter first, then localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const difficulty = urlParams.get('difficulty') || localStorage.getItem('difficulty') || 'medium';
  localStorage.setItem('difficulty', difficulty); // Save to localStorage for consistency
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

    // Reset player stats for new game
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

  // Initialize background music - start on any page interaction
  const backgroundMusic = document.getElementById('backgroundMusic');
  if (backgroundMusic) {
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    backgroundMusic.volume = 0.3; // Set volume to 30%

    // Start music on first user interaction (anywhere on page, not just settings button)
    let musicStarted = false;
    const startMusicOnInteraction = () => {
      if (!musicStarted && soundEnabled) {
        backgroundMusic.play().then(() => {
          musicStarted = true;
        }).catch(err => {
          console.log('Music start error:', err);
        });
      }
    };

    // Try to start on multiple events (using once: true ensures it only fires once)
    document.addEventListener('click', startMusicOnInteraction, { once: true });
    document.addEventListener('touchstart', startMusicOnInteraction, { once: true });
    document.addEventListener('keydown', startMusicOnInteraction, { once: true });

    // Also try on window load (might work in some browsers)
    if (document.readyState === 'complete') {
      startMusicOnInteraction();
    } else {
      window.addEventListener('load', startMusicOnInteraction, { once: true });
    }
  }

  // Performance toggle for mobile
  const performanceToggleBtn = $('performanceToggleBtn');
  if (performanceToggleBtn) {
    performanceToggleBtn.addEventListener('click', () => {
      const statsCard = document.querySelector('.stats-card');
      if (statsCard) {
        statsCard.classList.toggle('active');
        performanceToggleBtn.classList.toggle('active');
      }
    });

    // Close stats card when clicking outside (on the backdrop)
    document.addEventListener('click', (e) => {
      const statsCard = document.querySelector('.stats-card');
      if (statsCard && statsCard.classList.contains('active')) {
        // Check if click is on the backdrop (stats-card itself, not its children)
        if (e.target === statsCard) {
          statsCard.classList.remove('active');
          performanceToggleBtn.classList.remove('active');
        }
      }
    });
  }

  // Close button for stats card (mobile)
  const statsCloseBtn = $('statsCloseBtn');
  if (statsCloseBtn) {
    statsCloseBtn.addEventListener('click', () => {
      const statsCard = document.querySelector('.stats-card');
      const performanceBtn = $('performanceToggleBtn');
      if (statsCard) {
        statsCard.classList.remove('active');
      }
      if (performanceBtn) {
        performanceBtn.classList.remove('active');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', main);
