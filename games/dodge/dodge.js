// ============================================
// Dodge - Bullet Hell Survival
// ============================================

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const timerEl = document.getElementById('timer');
  const missileCountEl = document.getElementById('missileCount');
  const highScoreEl = document.getElementById('highScore');
  const progressFill = document.getElementById('progressFill');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayScore = document.getElementById('overlayScore');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');

  const GOAL_TIME = 60; // 60 seconds to win
  const PLAYER_SIZE = 14;
  const PLAYER_SPEED = 4;
  const MISSILE_RADIUS = 6;
  const MISSILE_BASE_SPEED = 1.8;
  const SPAWN_INTERVAL_START = 800; // ms between spawns at start
  const SPAWN_INTERVAL_MIN = 150;   // fastest spawn rate
  const SPAWN_COUNT_MAX = 6;        // max missiles per spawn wave at peak

  let player, missiles, score, highScore, gameRunning, gamePaused, gameOver, won;
  let startTime, elapsedTime, lastSpawn, spawnInterval;
  let keys = {};
  let mousePos = null;
  let useMouseControl = false;
  let animId;

  highScore = parseFloat(localStorage.getItem('dodge-highscore')) || 0;
  highScoreEl.textContent = highScore.toFixed(1) + 's';

  function init() {
    player = { x: W / 2, y: H / 2 };
    missiles = [];
    elapsedTime = 0;
    gameOver = false;
    gamePaused = false;
    gameRunning = true;
    won = false;
    useMouseControl = false;
    mousePos = null;
    lastSpawn = 0;
    spawnInterval = SPAWN_INTERVAL_START;
    startTime = performance.now();

    timerEl.textContent = '0.0s';
    timerEl.className = 'value';
    missileCountEl.textContent = '0';
    progressFill.style.width = '0%';
    overlay.classList.add('hidden');
    startBtn.textContent = 'RESTART';
  }

  // Spawn missiles from random edge positions
  function spawnMissiles(count) {
    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x, y;
      switch (edge) {
        case 0: x = Math.random() * W; y = -MISSILE_RADIUS; break;       // top
        case 1: x = Math.random() * W; y = H + MISSILE_RADIUS; break;    // bottom
        case 2: x = -MISSILE_RADIUS; y = Math.random() * H; break;       // left
        case 3: x = W + MISSILE_RADIUS; y = Math.random() * H; break;    // right
      }

      // Speed scales with time
      const timeRatio = Math.min(elapsedTime / GOAL_TIME, 1);
      const speed = MISSILE_BASE_SPEED + timeRatio * 2.5;
      // Slight random speed variation
      const finalSpeed = speed * (0.85 + Math.random() * 0.3);

      missiles.push({ x, y, speed: finalSpeed });
    }
  }

  function update(time) {
    elapsedTime = (time - startTime) / 1000;
    const timeRatio = Math.min(elapsedTime / GOAL_TIME, 1);

    // Update timer display
    timerEl.textContent = elapsedTime.toFixed(1) + 's';
    if (elapsedTime >= GOAL_TIME) {
      timerEl.classList.add('time-safe');
    } else if (elapsedTime >= GOAL_TIME * 0.7) {
      timerEl.classList.add('time-safe');
    }
    missileCountEl.textContent = missiles.length;
    progressFill.style.width = (timeRatio * 100) + '%';

    // Win condition
    if (elapsedTime >= GOAL_TIME) {
      winGame();
      return;
    }

    // Spawn missiles - rate and count increase over time
    spawnInterval = SPAWN_INTERVAL_START - timeRatio * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN);
    if (time - lastSpawn > spawnInterval) {
      const count = Math.ceil(1 + timeRatio * (SPAWN_COUNT_MAX - 1));
      spawnMissiles(count);
      lastSpawn = time;
    }

    // Player movement
    if (useMouseControl && mousePos) {
      const dx = mousePos.x - player.x;
      const dy = mousePos.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        const moveSpeed = Math.min(PLAYER_SPEED + 2, dist);
        player.x += (dx / dist) * moveSpeed;
        player.y += (dy / dist) * moveSpeed;
      }
    } else {
      if (keys['ArrowLeft'] || keys['a'] || keys['A'])  player.x -= PLAYER_SPEED;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) player.x += PLAYER_SPEED;
      if (keys['ArrowUp'] || keys['w'] || keys['W'])    player.y -= PLAYER_SPEED;
      if (keys['ArrowDown'] || keys['s'] || keys['S'])   player.y += PLAYER_SPEED;
    }

    // Clamp player within bounds
    player.x = Math.max(PLAYER_SIZE, Math.min(W - PLAYER_SIZE, player.x));
    player.y = Math.max(PLAYER_SIZE, Math.min(H - PLAYER_SIZE, player.y));

    // Move missiles toward player (homing)
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      const dx = player.x - m.x;
      const dy = player.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        m.x += (dx / dist) * m.speed;
        m.y += (dy / dist) * m.speed;
      }

      // Collision with player (triangle approximate as circle)
      if (dist < PLAYER_SIZE * 0.7 + MISSILE_RADIUS) {
        endGame();
        return;
      }

      // Remove missiles that somehow get stuck way offscreen
      if (m.x < -200 || m.x > W + 200 || m.y < -200 || m.y > H + 200) {
        missiles.splice(i, 1);
      }
    }
  }

  function draw() {
    const timeRatio = Math.min(elapsedTime / GOAL_TIME, 1);

    // Background with subtle intensity
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Grid background that intensifies
    const gridAlpha = 0.03 + timeRatio * 0.05;
    ctx.strokeStyle = `rgba(164, 19, 236, ${gridAlpha})`;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Danger vignette as time goes on
    if (timeRatio > 0.3) {
      const vigAlpha = (timeRatio - 0.3) * 0.15;
      const grad = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.7);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, `rgba(255, 0, 68, ${vigAlpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Missiles - red circles with glow
    missiles.forEach(m => {
      // Glow
      ctx.beginPath();
      ctx.arc(m.x, m.y, MISSILE_RADIUS + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 68, 0.2)';
      ctx.fill();

      // Missile body
      ctx.beginPath();
      ctx.arc(m.x, m.y, MISSILE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0044';
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(m.x - 2, m.y - 2, MISSILE_RADIUS * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
      ctx.fill();
    });

    // Player - triangle (airplane) pointing up
    ctx.save();
    ctx.translate(player.x, player.y);

    // Engine glow
    ctx.beginPath();
    ctx.moveTo(-6, PLAYER_SIZE * 0.6);
    ctx.lineTo(6, PLAYER_SIZE * 0.6);
    ctx.lineTo(0, PLAYER_SIZE * 0.6 + 8 + Math.random() * 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
    ctx.fill();

    // Ship body glow
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 15;

    // Triangle ship
    ctx.beginPath();
    ctx.moveTo(0, -PLAYER_SIZE);
    ctx.lineTo(-PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.6);
    ctx.lineTo(PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.6);
    ctx.closePath();
    ctx.fillStyle = '#00f3ff';
    ctx.fill();

    // Inner detail
    ctx.beginPath();
    ctx.moveTo(0, -PLAYER_SIZE * 0.5);
    ctx.lineTo(-PLAYER_SIZE * 0.35, PLAYER_SIZE * 0.3);
    ctx.lineTo(PLAYER_SIZE * 0.35, PLAYER_SIZE * 0.3);
    ctx.closePath();
    ctx.fillStyle = '#006680';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    // Timer in center when close to winning
    if (elapsedTime >= GOAL_TIME * 0.8) {
      const remaining = Math.max(0, GOAL_TIME - elapsedTime);
      ctx.font = 'bold 40px "Spline Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(57, 255, 20, ${0.15 + Math.sin(Date.now() * 0.005) * 0.1})`;
      ctx.fillText(Math.ceil(remaining), W / 2, H / 2);
    }
  }

  function gameLoop(time) {
    if (!gameRunning || gamePaused) return;
    update(time);
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
    saveScore();

    overlayTitle.textContent = 'GAME OVER';
    overlayScore.textContent = `생존 시간: ${elapsedTime.toFixed(1)}초`;
    if (elapsedTime >= 30) {
      overlayText.textContent = '꽤 잘했어요! ENTER로 재도전';
    } else {
      overlayText.textContent = 'PRESS ENTER TO RETRY';
    }
    overlay.classList.remove('hidden');
  }

  function winGame() {
    gameRunning = false;
    gameOver = true;
    won = true;
    elapsedTime = GOAL_TIME;
    saveScore();

    overlayTitle.textContent = 'SURVIVED!';
    overlayTitle.style.color = '#39ff14';
    overlayScore.textContent = `60초 생존 성공!`;
    overlayText.textContent = 'PRESS ENTER TO PLAY AGAIN';
    overlay.classList.remove('hidden');

    // Victory flash
    ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
    ctx.fillRect(0, 0, W, H);
  }

  function saveScore() {
    const best = Math.max(elapsedTime, highScore);
    if (best > highScore) {
      highScore = best;
      localStorage.setItem('dodge-highscore', highScore.toFixed(1));
      highScoreEl.textContent = highScore.toFixed(1) + 's';
    }
  }

  function togglePause() {
    if (gameOver || !gameRunning) return;
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'RESUME' : 'PAUSE';
    if (gamePaused) {
      overlayTitle.textContent = 'PAUSED';
      overlayTitle.style.color = '';
      overlayScore.textContent = `${elapsedTime.toFixed(1)}초 경과`;
      overlayText.textContent = '';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
      // Adjust startTime to account for pause duration
      startTime = performance.now() - elapsedTime * 1000;
      lastSpawn = performance.now();
      animId = requestAnimationFrame(gameLoop);
    }
  }

  // Keyboard
  document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
      useMouseControl = false;
    }
    if (gameOver && e.key === 'Enter') {
      overlayTitle.style.color = '';
      startGame();
      return;
    }
    if (e.key === 'p' || e.key === 'P') togglePause();
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  // Mouse control
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePos = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
    useMouseControl = true;
  });
  canvas.addEventListener('mouseleave', () => { mousePos = null; });

  startBtn.addEventListener('click', () => { overlayTitle.style.color = ''; startGame(); });
  pauseBtn.addEventListener('click', togglePause);

  // Initial draw
  player = { x: W / 2, y: H / 2 };
  missiles = [];
  elapsedTime = 0;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // Draw static player
  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.beginPath();
  ctx.moveTo(0, -PLAYER_SIZE);
  ctx.lineTo(-PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.6);
  ctx.lineTo(PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.6);
  ctx.closePath();
  ctx.fillStyle = '#00f3ff';
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
})();
