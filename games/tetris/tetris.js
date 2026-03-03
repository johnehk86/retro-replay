// ============================================
// Tetris - Retro Replay
// ============================================

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCanvas');
  const nextCtx = nextCanvas.getContext('2d');

  const COLS = 10;
  const ROWS = 20;
  const BLOCK = canvas.width / COLS; // 30px
  const NEXT_BLOCK = 24;

  // Tetromino shapes & colors
  const PIECES = {
    I: { shape: [[0,0],[1,0],[2,0],[3,0]], color: '#00fff5' },
    O: { shape: [[0,0],[1,0],[0,1],[1,1]], color: '#ffff00' },
    T: { shape: [[0,0],[1,0],[2,0],[1,1]], color: '#ff00ff' },
    S: { shape: [[1,0],[2,0],[0,1],[1,1]], color: '#39ff14' },
    Z: { shape: [[0,0],[1,0],[1,1],[2,1]], color: '#ff0044' },
    J: { shape: [[0,0],[0,1],[1,1],[2,1]], color: '#4444ff' },
    L: { shape: [[2,0],[0,1],[1,1],[2,1]], color: '#ff6600' }
  };

  const PIECE_NAMES = Object.keys(PIECES);

  // Game state
  let board = [];
  let currentPiece = null;
  let nextPiece = null;
  let score = 0;
  let level = 1;
  let lines = 0;
  let highScore = parseInt(localStorage.getItem('tetris-highscore')) || 0;
  let gameRunning = false;
  let gamePaused = false;
  let gameOver = false;
  let dropInterval = 1000;
  let lastDrop = 0;
  let animationId = null;

  // DOM elements
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const linesEl = document.getElementById('lines');
  const highScoreEl = document.getElementById('highScore');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayScore = document.getElementById('overlayScore');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');

  highScoreEl.textContent = highScore;

  // ---- Board ----
  function createBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  // ---- Piece ----
  function randomPiece() {
    const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
    const p = PIECES[name];
    return {
      blocks: p.shape.map(b => [...b]),
      color: p.color,
      x: 3,
      y: 0
    };
  }

  function rotatePiece(piece) {
    // Find bounding box center and rotate 90 degrees clockwise
    const blocks = piece.blocks;
    const cx = blocks.reduce((s, b) => s + b[0], 0) / blocks.length;
    const cy = blocks.reduce((s, b) => s + b[1], 0) / blocks.length;

    const rotated = blocks.map(([x, y]) => {
      const rx = Math.round(cy - y + cx);
      const ry = Math.round(x - cx + cy);
      return [rx, ry];
    });

    // Normalize to start from 0,0
    const minX = Math.min(...rotated.map(b => b[0]));
    const minY = Math.min(...rotated.map(b => b[1]));
    return rotated.map(([x, y]) => [x - minX, y - minY]);
  }

  function isValid(piece, blocks, offsetX, offsetY) {
    for (const [bx, by] of blocks) {
      const x = piece.x + bx + offsetX;
      const y = piece.y + by + offsetY;
      if (x < 0 || x >= COLS || y >= ROWS) return false;
      if (y >= 0 && board[y][x]) return false;
    }
    return true;
  }

  function lockPiece() {
    for (const [bx, by] of currentPiece.blocks) {
      const x = currentPiece.x + bx;
      const y = currentPiece.y + by;
      if (y < 0) {
        endGame();
        return;
      }
      board[y][x] = currentPiece.color;
    }
    clearLines();
    spawnPiece();
  }

  function spawnPiece() {
    currentPiece = nextPiece || randomPiece();
    nextPiece = randomPiece();
    drawNext();

    if (!isValid(currentPiece, currentPiece.blocks, 0, 0)) {
      endGame();
    }
  }

  // ---- Line Clearing ----
  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // re-check same row
      }
    }
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800];
      score += (points[cleared] || 800) * level;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 80);
      updateUI();
    }
  }

  // ---- Drawing ----
  function drawBlock(context, x, y, color, size) {
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    // highlight
    context.fillStyle = 'rgba(255,255,255,0.2)';
    context.fillRect(x * size + 1, y * size + 1, size - 2, 3);
    context.fillRect(x * size + 1, y * size + 1, 3, size - 2);
  }

  function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
      }
    }

    // Locked blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          drawBlock(ctx, c, r, board[r][c], BLOCK);
        }
      }
    }
  }

  function drawPiece() {
    if (!currentPiece) return;

    // Ghost piece
    let ghostY = 0;
    while (isValid(currentPiece, currentPiece.blocks, 0, ghostY + 1)) {
      ghostY++;
    }
    ctx.globalAlpha = 0.2;
    for (const [bx, by] of currentPiece.blocks) {
      drawBlock(ctx, currentPiece.x + bx, currentPiece.y + by + ghostY, currentPiece.color, BLOCK);
    }
    ctx.globalAlpha = 1;

    // Current piece
    for (const [bx, by] of currentPiece.blocks) {
      if (currentPiece.y + by >= 0) {
        drawBlock(ctx, currentPiece.x + bx, currentPiece.y + by, currentPiece.color, BLOCK);
      }
    }
  }

  function drawNext() {
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;

    const blocks = nextPiece.blocks;
    const maxX = Math.max(...blocks.map(b => b[0])) + 1;
    const maxY = Math.max(...blocks.map(b => b[1])) + 1;
    const offsetX = Math.floor((5 - maxX) / 2);
    const offsetY = Math.floor((5 - maxY) / 2);

    for (const [bx, by] of blocks) {
      drawBlock(nextCtx, bx + offsetX, by + offsetY, nextPiece.color, NEXT_BLOCK);
    }
  }

  function updateUI() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = lines;
  }

  // ---- Game Loop ----
  function gameLoop(time) {
    if (!gameRunning || gamePaused) return;

    if (time - lastDrop > dropInterval) {
      moveDown();
      lastDrop = time;
    }

    drawBoard();
    drawPiece();
    animationId = requestAnimationFrame(gameLoop);
  }

  // ---- Movement ----
  function moveLeft() {
    if (isValid(currentPiece, currentPiece.blocks, -1, 0)) {
      currentPiece.x--;
    }
  }

  function moveRight() {
    if (isValid(currentPiece, currentPiece.blocks, 1, 0)) {
      currentPiece.x++;
    }
  }

  function moveDown() {
    if (isValid(currentPiece, currentPiece.blocks, 0, 1)) {
      currentPiece.y++;
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    while (isValid(currentPiece, currentPiece.blocks, 0, 1)) {
      currentPiece.y++;
      score += 2;
    }
    lockPiece();
    updateUI();
  }

  function rotate() {
    const rotated = rotatePiece(currentPiece);
    // Try normal rotation, then wall kicks
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (isValid(currentPiece, rotated, kick, 0)) {
        currentPiece.blocks = rotated;
        currentPiece.x += kick;
        return;
      }
    }
  }

  // ---- Game Control ----
  function startGame() {
    createBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    gameOver = false;
    gamePaused = false;
    gameRunning = true;
    updateUI();
    overlay.classList.add('hidden');
    spawnPiece();
    lastDrop = performance.now();
    animationId = requestAnimationFrame(gameLoop);
    startBtn.textContent = 'RESTART';
  }

  function endGame() {
    gameRunning = false;
    gameOver = true;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('tetris-highscore', highScore);
      highScoreEl.textContent = highScore;
    }
    overlayTitle.textContent = 'GAME OVER';
    overlayScore.textContent = `SCORE: ${score}`;
    overlay.classList.remove('hidden');
  }

  function togglePause() {
    if (gameOver || !gameRunning) return;
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'RESUME' : 'PAUSE';
    if (gamePaused) {
      overlayTitle.textContent = 'PAUSED';
      overlayScore.textContent = '';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
      lastDrop = performance.now();
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  // ---- Input ----
  document.addEventListener('keydown', e => {
    if (!gameRunning || gameOver) {
      if (e.key === 'Enter') startGame();
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }
    if (gamePaused) return;

    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); moveLeft(); break;
      case 'ArrowRight': e.preventDefault(); moveRight(); break;
      case 'ArrowDown':  e.preventDefault(); moveDown(); score += 1; updateUI(); break;
      case 'ArrowUp':    e.preventDefault(); rotate(); break;
      case ' ':          e.preventDefault(); hardDrop(); break;
    }
  });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);

  // Touch controls
  function addTouchBtn(id, action) {
    const btn = document.getElementById(id);
    if (!btn) return;
    let interval = null;
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      if (!gameRunning || gamePaused || gameOver) return;
      action();
      // Repeat for held buttons (left/right/down)
      if (id === 'touchLeft' || id === 'touchRight' || id === 'touchDown') {
        interval = setInterval(action, 100);
      }
    });
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      clearInterval(interval);
      interval = null;
    });
    btn.addEventListener('touchcancel', () => {
      clearInterval(interval);
      interval = null;
    });
  }
  addTouchBtn('touchLeft', moveLeft);
  addTouchBtn('touchRight', moveRight);
  addTouchBtn('touchDown', () => { moveDown(); score += 1; updateUI(); });
  addTouchBtn('touchRotate', rotate);
  addTouchBtn('touchDrop', hardDrop);

  // Touch on canvas to start game
  canvas.addEventListener('touchstart', e => {
    if (!gameRunning || gameOver) {
      e.preventDefault();
      startGame();
    }
  });

  // Initial draw
  createBoard();
  drawBoard();
  drawNext();
})();
