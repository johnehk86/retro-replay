// ============================================
// Pong - Retro Replay
// ============================================

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const score1El = document.getElementById('score1');
  const score2El = document.getElementById('score2');
  const p2Label = document.getElementById('p2Label');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayScore = document.getElementById('overlayScore');
  const overlayText = document.getElementById('overlayText');
  const pauseBtn = document.getElementById('pauseBtn');
  const vsAiBtn = document.getElementById('vsAiBtn');
  const vs2pBtn = document.getElementById('vs2pBtn');

  const PADDLE_W = 12;
  const PADDLE_H = 70;
  const BALL_SIZE = 10;
  const WIN_SCORE = 7;
  const PADDLE_SPEED = 5;
  const BALL_SPEED_INIT = 4;

  let p1, p2, ball, score1, score2;
  let isAI = true;
  let gameRunning = false;
  let gamePaused = false;
  let gameOver = false;
  let keys = {};
  let animId;

  function initPaddles() {
    p1 = { x: 15, y: H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
    p2 = { x: W - 15 - PADDLE_W, y: H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
  }

  function resetBall(dir) {
    const angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
    const speed = BALL_SPEED_INIT;
    ball = {
      x: W / 2,
      y: H / 2,
      dx: Math.cos(angle) * speed * dir,
      dy: Math.sin(angle) * speed,
      size: BALL_SIZE
    };
  }

  function init(aiMode) {
    isAI = aiMode;
    p2Label.textContent = isAI ? 'CPU' : 'PLAYER 2';
    score1 = 0;
    score2 = 0;
    gameOver = false;
    gamePaused = false;
    gameRunning = true;
    score1El.textContent = 0;
    score2El.textContent = 0;
    overlay.classList.add('hidden');
    initPaddles();
    resetBall(1);
  }

  function draw() {
    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.shadowColor = '#00fff5';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00fff5';
    ctx.fillRect(p1.x, p1.y, p1.w, p1.h);

    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(p2.x, p2.y, p2.w, p2.h);
    ctx.shadowBlur = 0;

    // Ball
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.fillRect(ball.x - ball.size / 2, ball.y - ball.size / 2, ball.size, ball.size);
    ctx.shadowBlur = 0;
  }

  function movePaddle(paddle, dy) {
    paddle.y += dy;
    paddle.y = Math.max(0, Math.min(H - paddle.h, paddle.y));
  }

  function aiMove() {
    const center = p2.y + p2.h / 2;
    const diff = ball.y - center;
    const aiSpeed = 3.5;
    if (Math.abs(diff) > 10) {
      movePaddle(p2, diff > 0 ? aiSpeed : -aiSpeed);
    }
  }

  function update() {
    // Player 1 input
    if (keys['w'] || keys['W']) movePaddle(p1, -PADDLE_SPEED);
    if (keys['s'] || keys['S']) movePaddle(p1, PADDLE_SPEED);

    // Player 2 / AI
    if (isAI) {
      aiMove();
    } else {
      if (keys['ArrowUp']) movePaddle(p2, -PADDLE_SPEED);
      if (keys['ArrowDown']) movePaddle(p2, PADDLE_SPEED);
    }

    // Ball movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Top/bottom bounce
    if (ball.y - ball.size / 2 <= 0 || ball.y + ball.size / 2 >= H) {
      ball.dy = -ball.dy;
      ball.y = Math.max(ball.size / 2, Math.min(H - ball.size / 2, ball.y));
    }

    // Paddle collision
    // P1
    if (
      ball.dx < 0 &&
      ball.x - ball.size / 2 <= p1.x + p1.w &&
      ball.x - ball.size / 2 >= p1.x &&
      ball.y >= p1.y &&
      ball.y <= p1.y + p1.h
    ) {
      const hitPos = (ball.y - p1.y) / p1.h - 0.5;
      const angle = hitPos * Math.PI / 3;
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) + 0.2;
      ball.dx = Math.cos(angle) * speed;
      ball.dy = Math.sin(angle) * speed;
      ball.x = p1.x + p1.w + ball.size / 2;
    }

    // P2
    if (
      ball.dx > 0 &&
      ball.x + ball.size / 2 >= p2.x &&
      ball.x + ball.size / 2 <= p2.x + p2.w &&
      ball.y >= p2.y &&
      ball.y <= p2.y + p2.h
    ) {
      const hitPos = (ball.y - p2.y) / p2.h - 0.5;
      const angle = Math.PI - hitPos * Math.PI / 3;
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) + 0.2;
      ball.dx = -Math.abs(Math.cos(angle) * speed);
      ball.dy = Math.sin(angle) * speed;
      ball.x = p2.x - ball.size / 2;
    }

    // Score
    if (ball.x < 0) {
      score2++;
      score2El.textContent = score2;
      if (score2 >= WIN_SCORE) {
        endGame(isAI ? 'CPU WINS!' : 'PLAYER 2 WINS!');
        return;
      }
      resetBall(1);
    }
    if (ball.x > W) {
      score1++;
      score1El.textContent = score1;
      if (score1 >= WIN_SCORE) {
        endGame('PLAYER 1 WINS!');
        return;
      }
      resetBall(-1);
    }
  }

  function gameLoop() {
    if (!gameRunning || gamePaused) return;
    update();
    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  function startGame(aiMode) {
    cancelAnimationFrame(animId);
    init(aiMode);
    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  function endGame(msg) {
    gameRunning = false;
    gameOver = true;
    overlayTitle.textContent = msg;
    overlayScore.textContent = `${score1} - ${score2}`;
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
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();

    if (gameOver && e.key === 'Enter') {
      startGame(isAI);
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      togglePause();
    }
  });

  document.addEventListener('keyup', e => {
    keys[e.key] = false;
  });

  vsAiBtn.addEventListener('click', () => startGame(true));
  vs2pBtn.addEventListener('click', () => startGame(false));
  pauseBtn.addEventListener('click', togglePause);

  // Initial state
  initPaddles();
  ball = { x: W / 2, y: H / 2, dx: 0, dy: 0, size: BALL_SIZE };
  draw();
  overlay.classList.remove('hidden');
  overlayTitle.textContent = 'PONG';
  overlayScore.textContent = '';
  overlayText.textContent = 'SELECT MODE TO START';
})();
