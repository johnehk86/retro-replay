// ============================================
// Breakout - Retro Replay
// ============================================

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // DOM
  const scoreEl = document.getElementById('score');
  const stageEl = document.getElementById('stage');
  const livesEl = document.getElementById('lives');
  const highScoreEl = document.getElementById('highScore');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayScore = document.getElementById('overlayScore');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');

  // Config
  const PADDLE_W = 80;
  const PADDLE_H = 12;
  const BALL_R = 6;
  const BRICK_ROWS = 6;
  const BRICK_COLS = 10;
  const BRICK_W = (W - 20) / BRICK_COLS;
  const BRICK_H = 18;
  const BRICK_TOP = 50;
  const BRICK_PAD = 2;

  const BRICK_COLORS = ['#ff0044', '#ff6600', '#ffff00', '#39ff14', '#00fff5', '#ff00ff'];

  let paddle, ball, bricks, score, lives, stage, highScore;
  let gameRunning, gamePaused, gameOver, ballLaunched;
  let keys = {};
  let animId;

  highScore = parseInt(localStorage.getItem('breakout-highscore')) || 0;
  highScoreEl.textContent = highScore;

  function createBricks() {
    bricks = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: 10 + c * BRICK_W + BRICK_PAD,
          y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
          w: BRICK_W - BRICK_PAD * 2,
          h: BRICK_H,
          color: BRICK_COLORS[r % BRICK_COLORS.length],
          alive: true,
          points: (BRICK_ROWS - r) * 10
        });
      }
    }
  }

  function resetBall() {
    ballLaunched = false;
    ball = {
      x: paddle.x + PADDLE_W / 2,
      y: H - 40 - BALL_R,
      dx: 3 + stage * 0.3,
      dy: -(3 + stage * 0.3),
      r: BALL_R
    };
  }

  function init() {
    score = 0;
    lives = 3;
    stage = 1;
    gameOver = false;
    gamePaused = false;
    gameRunning = true;
    overlay.classList.add('hidden');

    paddle = { x: W / 2 - PADDLE_W / 2, y: H - 30, w: PADDLE_W, h: PADDLE_H };
    createBricks();
    resetBall();
    updateUI();
    startBtn.textContent = 'RESTART';
  }

  function updateUI() {
    scoreEl.textContent = score;
    stageEl.textContent = stage;
    livesEl.textContent = lives;
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(b.x, b.y, b.w, 3);
    });

    // Paddle
    ctx.fillStyle = '#00fff5';
    ctx.shadowColor = '#00fff5';
    ctx.shadowBlur = 8;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.shadowBlur = 0;

    // Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function update() {
    // Paddle movement
    if (keys['ArrowLeft'] && paddle.x > 0) {
      paddle.x -= 6;
    }
    if (keys['ArrowRight'] && paddle.x + paddle.w < W) {
      paddle.x += 6;
    }

    if (!ballLaunched) {
      ball.x = paddle.x + paddle.w / 2;
      return;
    }

    // Ball movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall bounce
    if (ball.x - ball.r <= 0 || ball.x + ball.r >= W) {
      ball.dx = -ball.dx;
      ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
    }
    if (ball.y - ball.r <= 0) {
      ball.dy = -ball.dy;
      ball.y = ball.r;
    }

    // Bottom - lose life
    if (ball.y + ball.r >= H) {
      lives--;
      updateUI();
      if (lives <= 0) {
        endGame();
        return;
      }
      resetBall();
      return;
    }

    // Paddle collision
    if (
      ball.dy > 0 &&
      ball.y + ball.r >= paddle.y &&
      ball.y + ball.r <= paddle.y + paddle.h + 4 &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.w
    ) {
      ball.dy = -Math.abs(ball.dy);
      // Angle based on hit position
      const hitPos = (ball.x - paddle.x) / paddle.w; // 0 to 1
      ball.dx = (hitPos - 0.5) * 8;
      ball.y = paddle.y - ball.r;
    }

    // Brick collision
    bricks.forEach(b => {
      if (!b.alive) return;
      if (
        ball.x + ball.r > b.x &&
        ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y &&
        ball.y - ball.r < b.y + b.h
      ) {
        b.alive = false;
        score += b.points;
        updateUI();

        // Determine bounce direction
        const overlapLeft = ball.x + ball.r - b.x;
        const overlapRight = b.x + b.w - (ball.x - ball.r);
        const overlapTop = ball.y + ball.r - b.y;
        const overlapBottom = b.y + b.h - (ball.y - ball.r);
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          ball.dx = -ball.dx;
        } else {
          ball.dy = -ball.dy;
        }
      }
    });

    // Stage clear
    if (bricks.every(b => !b.alive)) {
      stage++;
      createBricks();
      resetBall();
      updateUI();
    }
  }

  function gameLoop() {
    if (!gameRunning || gamePaused) return;
    update();
    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    cancelAnimationFrame(animId);
    init();
    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  function endGame() {
    gameRunning = false;
    gameOver = true;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('breakout-highscore', highScore);
      highScoreEl.textContent = highScore;
    }
    overlayTitle.textContent = 'GAME OVER';
    overlayScore.textContent = `SCORE: ${score}`;
    overlayText.textContent = 'PRESS ENTER TO RESTART';
    overlay.classList.remove('hidden');
  }

  function togglePause() {
    if (gameOver || !gameRunning) return;
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'RESUME' : 'PAUSE';
    if (gamePaused) {
      overlayTitle.textContent = 'PAUSED';
      overlayScore.textContent = '';
      overlayText.textContent = '';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
      animId = requestAnimationFrame(gameLoop);
    }
  }

  document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (!gameRunning || gameOver) {
      if (e.key === 'Enter') startGame();
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (!ballLaunched) ballLaunched = true;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
  });

  document.addEventListener('keyup', e => {
    keys[e.key] = false;
  });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);

  // Touch controls - buttons
  function addHoldBtn(id, keyName) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      if (!gameRunning || gameOver) { startGame(); return; }
      keys[keyName] = true;
    });
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      keys[keyName] = false;
    });
    btn.addEventListener('touchcancel', () => { keys[keyName] = false; });
  }
  addHoldBtn('touchLeft', 'ArrowLeft');
  addHoldBtn('touchRight', 'ArrowRight');

  // Launch button
  const touchLaunchBtn = document.getElementById('touchLaunch');
  if (touchLaunchBtn) {
    touchLaunchBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      if (!gameRunning || gameOver) { startGame(); return; }
      if (!ballLaunched) ballLaunched = true;
    });
  }

  // Touch on canvas - move paddle to finger X position
  function handleCanvasTouch(e) {
    e.preventDefault();
    if (!gameRunning || gamePaused || gameOver) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const touchX = (touch.clientX - rect.left) * scaleX;
    paddle.x = Math.max(0, Math.min(W - paddle.w, touchX - paddle.w / 2));
  }
  canvas.addEventListener('touchstart', e => {
    if (!gameRunning || gameOver) {
      e.preventDefault();
      startGame();
      return;
    }
    e.preventDefault();
    if (!ballLaunched) ballLaunched = true;
    handleCanvasTouch(e);
  });
  canvas.addEventListener('touchmove', handleCanvasTouch);

  // Initial draw
  paddle = { x: W / 2 - PADDLE_W / 2, y: H - 30, w: PADDLE_W, h: PADDLE_H };
  ball = { x: W / 2, y: H - 40 - BALL_R, dx: 0, dy: 0, r: BALL_R };
  bricks = [];
  createBricks();
  draw();
})();
