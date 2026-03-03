// ============================================
// Snake - Retro Replay
// ============================================

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const GRID = 20;
  const COLS = canvas.width / GRID;  // 20
  const ROWS = canvas.height / GRID; // 20

  let snake, direction, nextDirection, food, score, highScore, gameRunning, gamePaused, gameOver;
  let speed, intervalId;

  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayScore = document.getElementById('overlayScore');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');

  highScore = parseInt(localStorage.getItem('snake-highscore')) || 0;
  highScoreEl.textContent = highScore;

  function init() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    speed = 150;
    gameOver = false;
    gamePaused = false;
    gameRunning = true;
    scoreEl.textContent = 0;
    overlay.classList.add('hidden');
    placeFood();
    startBtn.textContent = 'RESTART';
  }

  function placeFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS)
      };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  function update() {
    if (!gameRunning || gamePaused || gameOver) return;

    direction = { ...nextDirection };

    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y
    };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      endGame();
      return;
    }

    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);

    // Eat food
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = score;
      placeFood();
      // Speed up
      if (speed > 60) {
        speed -= 3;
        clearInterval(intervalId);
        intervalId = setInterval(update, speed);
      }
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * GRID, r * GRID, GRID, GRID);
      }
    }

    // Snake
    snake.forEach((seg, i) => {
      const brightness = 1 - (i / snake.length) * 0.5;
      ctx.fillStyle = `rgba(57, 255, 20, ${brightness})`;
      ctx.fillRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2);

      if (i === 0) {
        // Head highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, 4);
      }
    });

    // Food
    ctx.fillStyle = '#ff0044';
    ctx.shadowColor = '#ff0044';
    ctx.shadowBlur = 10;
    ctx.fillRect(food.x * GRID + 2, food.y * GRID + 2, GRID - 4, GRID - 4);
    ctx.shadowBlur = 0;
  }

  function endGame() {
    gameOver = true;
    gameRunning = false;
    clearInterval(intervalId);
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snake-highscore', highScore);
      highScoreEl.textContent = highScore;
    }
    overlayTitle.textContent = 'GAME OVER';
    overlayScore.textContent = `SCORE: ${score}`;
    overlay.classList.remove('hidden');
  }

  function startGame() {
    clearInterval(intervalId);
    init();
    draw();
    intervalId = setInterval(update, speed);
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
    }
  }

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
      case 'ArrowUp':
        e.preventDefault();
        if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
        break;
    }
  });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);

  // Touch D-pad controls
  function addDirBtn(id, dx, dy) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      if (!gameRunning || gameOver) {
        startGame();
        return;
      }
      if (gamePaused) return;
      // Prevent reversing into body (same check as keyboard)
      if (dx !== 0 && direction.x !== -dx) nextDirection = { x: dx, y: 0 };
      if (dy !== 0 && direction.y !== -dy) nextDirection = { x: 0, y: dy };
    });
  }
  addDirBtn('touchUp', 0, -1);
  addDirBtn('touchDown', 0, 1);
  addDirBtn('touchLeft', -1, 0);
  addDirBtn('touchRight', 1, 0);

  // Touch on canvas to start game
  canvas.addEventListener('touchstart', e => {
    if (!gameRunning || gameOver) {
      e.preventDefault();
      startGame();
    }
  });

  // Initial draw
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  food = { x: 15, y: 10 };
  draw();
})();
