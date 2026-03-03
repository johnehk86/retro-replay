// ============================================
// Minesweeper - Retro Replay
// ============================================

(() => {
  const gridEl = document.getElementById('grid');
  const mineCountEl = document.getElementById('mineCount');
  const timerEl = document.getElementById('timer');
  const bestTimeEl = document.getElementById('bestTime');
  const statusEl = document.getElementById('status');
  const newGameBtn = document.getElementById('newGameBtn');
  const diffBtns = document.querySelectorAll('[data-diff]');

  const DIFFICULTIES = {
    easy:   { rows: 9,  cols: 9,  mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard:   { rows: 16, cols: 30, mines: 99 }
  };

  let difficulty = 'easy';
  let rows, cols, totalMines;
  let board, revealed, flagged, mineLocations;
  let gameStarted, gameOver, won;
  let flagCount, timerValue, timerInterval;
  let firstClick;

  function loadBest() {
    const best = localStorage.getItem(`minesweeper-best-${difficulty}`);
    bestTimeEl.textContent = best ? best.toString().padStart(3, '0') : '---';
  }

  function init() {
    const cfg = DIFFICULTIES[difficulty];
    rows = cfg.rows;
    cols = cfg.cols;
    totalMines = cfg.mines;

    board = Array.from({ length: rows }, () => Array(cols).fill(0));
    revealed = Array.from({ length: rows }, () => Array(cols).fill(false));
    flagged = Array.from({ length: rows }, () => Array(cols).fill(false));
    mineLocations = [];

    gameStarted = false;
    gameOver = false;
    won = false;
    firstClick = true;
    flagCount = 0;
    timerValue = 0;

    clearInterval(timerInterval);
    mineCountEl.textContent = totalMines;
    timerEl.textContent = '000';
    statusEl.textContent = '';
    loadBest();
    buildGrid();
  }

  function placeMines(safeR, safeC) {
    mineLocations = [];
    let placed = 0;
    while (placed < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      // Keep safe zone around first click
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      if (board[r][c] === -1) continue;
      board[r][c] = -1;
      mineLocations.push({ r, c });
      placed++;
    }
    // Calculate numbers
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === -1) {
              count++;
            }
          }
        }
        board[r][c] = count;
      }
    }
  }

  function buildGrid() {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 30px)`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('button');
        cell.className = 'mine-cell hidden';
        cell.dataset.row = r;
        cell.dataset.col = c;

        cell.addEventListener('click', () => handleClick(r, c));
        cell.addEventListener('contextmenu', e => {
          e.preventDefault();
          handleRightClick(r, c);
        });

        gridEl.appendChild(cell);
      }
    }
  }

  function getCell(r, c) {
    return gridEl.children[r * cols + c];
  }

  function handleClick(r, c) {
    if (gameOver || flagged[r][c] || revealed[r][c]) return;

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
      gameStarted = true;
      timerInterval = setInterval(() => {
        timerValue++;
        timerEl.textContent = timerValue.toString().padStart(3, '0');
      }, 1000);
    }

    if (board[r][c] === -1) {
      // Hit mine
      revealAll();
      gameOver = true;
      clearInterval(timerInterval);
      statusEl.textContent = 'GAME OVER';
      getCell(r, c).classList.add('mine');
      return;
    }

    reveal(r, c);
    checkWin();
  }

  function handleRightClick(r, c) {
    if (gameOver || revealed[r][c]) return;

    const cell = getCell(r, c);
    if (flagged[r][c]) {
      flagged[r][c] = false;
      flagCount--;
      cell.textContent = '';
      cell.classList.remove('flagged');
      cell.classList.add('hidden');
    } else {
      flagged[r][c] = true;
      flagCount++;
      cell.textContent = '🚩';
      cell.classList.add('flagged');
    }
    mineCountEl.textContent = totalMines - flagCount;
  }

  function reveal(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (revealed[r][c] || flagged[r][c]) return;

    revealed[r][c] = true;
    const cell = getCell(r, c);
    cell.classList.remove('hidden');
    cell.classList.add('revealed');

    const val = board[r][c];
    if (val > 0) {
      cell.textContent = val;
      cell.classList.add(`n${val}`);
    } else if (val === 0) {
      // Flood fill
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          reveal(r + dr, c + dc);
        }
      }
    }
  }

  function revealAll() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] === -1) {
          const cell = getCell(r, c);
          cell.classList.remove('hidden');
          cell.classList.add('revealed');
          cell.textContent = '💣';
        }
      }
    }
  }

  function checkWin() {
    let unrevealed = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!revealed[r][c]) unrevealed++;
      }
    }
    if (unrevealed === totalMines) {
      gameOver = true;
      won = true;
      clearInterval(timerInterval);
      statusEl.textContent = 'YOU WIN!';
      // Save best time
      const best = localStorage.getItem(`minesweeper-best-${difficulty}`);
      if (!best || timerValue < parseInt(best)) {
        localStorage.setItem(`minesweeper-best-${difficulty}`, timerValue);
        localStorage.setItem('minesweeper-highscore', timerValue);
        bestTimeEl.textContent = timerValue.toString().padStart(3, '0');
      }
      // Reveal all mines as flagged
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c] === -1) {
            const cell = getCell(r, c);
            cell.textContent = '🚩';
            cell.classList.add('flagged');
          }
        }
      }
    }
  }

  // Difficulty buttons
  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      difficulty = btn.dataset.diff;
      diffBtns.forEach(b => b.classList.remove('btn-green', 'btn-magenta'));
      btn.classList.add('btn-green');
      init();
    });
  });

  newGameBtn.addEventListener('click', init);

  // Prevent context menu on grid
  gridEl.addEventListener('contextmenu', e => e.preventDefault());

  // Init
  init();
})();
