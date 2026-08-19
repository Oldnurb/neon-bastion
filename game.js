(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const UI = {
    money: document.getElementById("money"),
    cores: document.getElementById("cores"),
    shards: document.getElementById("shards"),
    wave: document.getElementById("wave"),
    enemyCount: document.getElementById("enemyCount"),
    waveBar: document.getElementById("waveBar"),
    waveStatus: document.getElementById("waveStatus"),
    hudDamage: document.getElementById("hudDamage"),
    hudHp: document.getElementById("hudHp"),
    hudIncome: document.getElementById("hudIncome"),
    hpBar: document.getElementById("hpBar"),
    upgradePanel: document.getElementById("upgradePanel"),
    speedLabel: document.getElementById("speedLabel"),
    pauseBtn: document.getElementById("pauseBtn"),
    waveDialog: document.getElementById("waveDialog"),
    waveDialogBody: document.getElementById("waveDialogBody"),
    waveDialogTitle: document.getElementById("waveDialogTitle"),
    gameOverDialog: document.getElementById("gameOverDialog"),
    finalWave: document.getElementById("finalWave"),
    bestWave: document.getElementById("bestWave")
  };

  const TAU = Math.PI * 2;
  const SPEEDS = [1, 2, 4];

  const enemyTypes = {
    normal: {
      name: "Splitter", color: "#ff5b78", hp: 10, speed: 42, damage: 7,
      reward: 2, chance: 0.78, size: 8
    },
    runner: {
      name: "Sprint", color: "#ffe35b", hp: 7, speed: 82, damage: 5,
      reward: 3, chance: 0.10, size: 7
    },
    tank: {
      name: "Panzer", color: "#ff9d4a", hp: 42, speed: 24, damage: 16,
      reward: 6, chance: 0.07, size: 11
    },
    leech: {
      name: "Sauger", color: "#50ffd1", hp: 16, speed: 34, damage: 10,
      reward: 5, chance: 0.03, size: 9
    },
    sniper: {
      name: "Störer", color: "#b77bff", hp: 22, speed: 28, damage: 13,
      reward: 7, chance: 0.02, size: 9
    },
    boss: {
      name: "Titan", color: "#ff43de", hp: 260, speed: 18, damage: 35,
      reward: 28, chance: 0, size: 18
    }
  };

  const state = {
    running: true,
    gameOver: false,
    speedIndex: 0,
    activeTab: "attack",
    time: 0,
    money: 26,
    cores: 0,
    shards: 0,
    wave: 1,
    waveDuration: 28,
    waveTime: 0,
    spawnAccumulator: 0,
    enemiesSpawned: 0,
    shots: [],
    enemies: [],
    particles: [],
    core: {
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      shield: 0,
      maxShield: 0,
      shieldRegen: 0,
      armor: 0,
      regen: 0,
      damage: 6,
      fireRate: 2.1,
      range: 152,
      critChance: 0.05,
      critMult: 1.6,
      multiShot: 1,
      incomeMult: 1,
      bountyFlat: 0,
      slowChance: 0,
      pulseDamage: 0,
      pulseCooldown: 6,
      pulseTimer: 0,
      shotTimer: 0
    },
    upgrades: {
      damage: 0, fireRate: 0, critChance: 0, critMult: 0, range: 0, multiShot: 0,
      maxHp: 0, regen: 0, armor: 0, shield: 0, shieldRegen: 0,
      income: 0, bounty: 0, slow: 0, pulse: 0
    }
  };

  const upgrades = {
    attack: [
      { id: "damage", title: "Schaden", base: 18, growth: 1.34, max: 30,
        value: () => state.core.damage.toFixed(1),
        apply: () => state.core.damage *= 1.20 },
      { id: "fireRate", title: "Feuerrate", base: 26, growth: 1.38, max: 24,
        value: () => `${state.core.fireRate.toFixed(2)}/s`,
        apply: () => state.core.fireRate *= 1.14 },
      { id: "critChance", title: "Krit-Chance", base: 12, growth: 1.48, max: 15,
        value: () => `${Math.round(state.core.critChance * 100)}%`,
        apply: () => state.core.critChance += 0.025 },
      { id: "critMult", title: "Krit-Faktor", base: 22, growth: 1.52, max: 12,
        value: () => `x${state.core.critMult.toFixed(2)}`,
        apply: () => state.core.critMult += 0.18 },
      { id: "range", title: "Reichweite", base: 20, growth: 1.42, max: 16,
        value: () => `${Math.round(state.core.range)} px`,
        apply: () => state.core.range += 14 },
      { id: "multiShot", title: "Mehrfachschuss", base: 110, growth: 2.0, max: 3,
        value: () => `${state.core.multiShot} Ziel${state.core.multiShot === 1 ? "" : "e"}`,
        apply: () => state.core.multiShot += 1 }
    ],
    defense: [
      { id: "maxHp", title: "Core-Leben", base: 20, growth: 1.40, max: 25,
        value: () => `${Math.round(state.core.maxHp)} HP`,
        apply: () => {
          state.core.maxHp += 24;
          state.core.hp += 24;
        }},
      { id: "regen", title: "Reparatur", base: 32, growth: 1.52, max: 18,
        value: () => `${state.core.regen.toFixed(1)} HP/s`,
        apply: () => state.core.regen += 0.45 },
      { id: "armor", title: "Panzerung", base: 36, growth: 1.56, max: 15,
        value: () => `${Math.round(state.core.armor * 100)}%`,
        apply: () => state.core.armor = Math.min(0.65, state.core.armor + 0.04) },
      { id: "shield", title: "Schild", base: 55, growth: 1.58, max: 16,
        value: () => `${Math.round(state.core.maxShield)}`,
        apply: () => {
          state.core.maxShield += 18;
          state.core.shield += 18;
        }},
      { id: "shieldRegen", title: "Schild-Regeneration", base: 72, growth: 1.64, max: 12,
        value: () => `${state.core.shieldRegen.toFixed(1)}/s`,
        apply: () => state.core.shieldRegen += 0.6 }
    ],
    utility: [
      { id: "income", title: "Beute-Multiplikator", base: 42, growth: 1.62, max: 15,
        value: () => `x${state.core.incomeMult.toFixed(2)}`,
        apply: () => state.core.incomeMult += 0.08 },
      { id: "bounty", title: "Bounty", base: 28, growth: 1.54, max: 18,
        value: () => `+$${state.core.bountyFlat}`,
        apply: () => state.core.bountyFlat += 1 },
      { id: "slow", title: "Stasis-Chance", base: 64, growth: 1.66, max: 12,
        value: () => `${Math.round(state.core.slowChance * 100)}%`,
        apply: () => state.core.slowChance += 0.04 },
      { id: "pulse", title: "Nova-Puls", base: 90, growth: 1.72, max: 16,
        value: () => `${state.core.pulseDamage.toFixed(0)} Schaden`,
        apply: () => {
          state.core.pulseDamage += 12;
          state.core.pulseCooldown = Math.max(2.5, state.core.pulseCooldown - 0.15);
        }}
    ]
  };

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.core.x = rect.width / 2;
    state.core.y = rect.height / 2 - 18;
  }

  function getCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function waveScale() {
    return 1 + (state.wave - 1) * 0.17 + Math.pow(Math.max(0, state.wave - 7), 1.15) * 0.035;
  }

  function maxActiveEnemies() {
    return Math.min(32, 4 + Math.floor(state.wave * 0.7));
  }

  function spawnRate() {
    return Math.min(4.5, 1.15 + state.wave * 0.10);
  }

  function chooseEnemyType() {
    if (state.wave % 10 === 0 && state.enemiesSpawned === 0) return "boss";

    const unlocked = [
      ["normal", 0],
      ["runner", 2],
      ["tank", 3],
      ["leech", 5],
      ["sniper", 7]
    ].filter(([, unlock]) => state.wave >= unlock);

    const total = unlocked.reduce((sum, [key]) => sum + enemyTypes[key].chance, 0);
    let r = Math.random() * total;
    for (const [key] of unlocked) {
      r -= enemyTypes[key].chance;
      if (r <= 0) return key;
    }
    return "normal";
  }

  function spawnEnemy() {
    const { w, h } = getCanvasSize();
    const typeKey = chooseEnemyType();
    const base = enemyTypes[typeKey];
    const scale = waveScale();

    const side = Math.floor(Math.random() * 4);
    const margin = 22;
    let x, y;

    if (side === 0) { x = Math.random() * w; y = -margin; }
    if (side === 1) { x = w + margin; y = Math.random() * h; }
    if (side === 2) { x = Math.random() * w; y = h + margin; }
    if (side === 3) { x = -margin; y = Math.random() * h; }

    const hpScale = typeKey === "boss" ? scale * 1.35 : scale;
    const speedScale = 1 + Math.min(0.55, (state.wave - 1) * 0.018);

    state.enemies.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      typeKey,
      x, y,
      hp: base.hp * hpScale,
      maxHp: base.hp * hpScale,
      speed: base.speed * speedScale,
      damage: base.damage * (1 + (state.wave - 1) * 0.10),
      reward: base.reward * (1 + Math.floor((state.wave - 1) / 5) * 0.15),
      size: base.size,
      color: base.color,
      slowTimer: 0,
      hitFlash: 0,
      angle: Math.random() * TAU
    });

    state.enemiesSpawned++;
  }

  function shootAtTargets() {
    if (!state.enemies.length) return;

    const inRange = state.enemies
      .map(e => ({ e, d: Math.hypot(e.x - state.core.x, e.y - state.core.y) }))
      .filter(v => v.d <= state.core.range)
      .sort((a, b) => a.d - b.d)
      .slice(0, state.core.multiShot);

    for (const { e } of inRange) {
      const crit = Math.random() < state.core.critChance;
      const damage = state.core.damage * (crit ? state.core.critMult : 1);

      state.shots.push({
        x: state.core.x,
        y: state.core.y,
        tx: e.x,
        ty: e.y,
        targetId: e.id,
        speed: 590,
        damage,
        crit,
        life: 0.5
      });
    }
  }

  function damageCore(amount) {
    let remaining = amount;

    if (state.core.shield > 0) {
      const used = Math.min(state.core.shield, remaining);
      state.core.shield -= used;
      remaining -= used;
    }

    if (remaining > 0) {
      remaining *= (1 - state.core.armor);
      state.core.hp = Math.max(0, state.core.hp - remaining);
    }

    shake = Math.min(8, shake + 3);

    if (state.core.hp <= 0 && !state.gameOver) endGame();
  }

  function killEnemy(enemy) {
    const reward = Math.round((enemy.reward + state.core.bountyFlat) * state.core.incomeMult);
    state.money += reward;
    state.cores += enemy.typeKey === "boss" ? 8 : (Math.random() < 0.08 ? 1 : 0);
    if (enemy.typeKey === "boss") state.shards += 1;

    for (let i = 0; i < 8; i++) {
      state.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - .5) * 80,
        vy: (Math.random() - .5) * 80,
        life: .5 + Math.random() * .35,
        color: enemy.color
      });
    }
  }

  function novaPulse() {
    if (state.core.pulseDamage <= 0) return;
    state.core.pulseTimer = 0;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - state.core.x, e.y - state.core.y);
      if (d < state.core.range * 0.92) {
        e.hp -= state.core.pulseDamage;
        e.hitFlash = 0.12;
      }
    }
    state.particles.push({
      x: state.core.x,
      y: state.core.y,
      vx: 0, vy: 0, life: .45, color: "#a7ff4f", pulse: true
    });
  }

  function update(dt) {
    if (!state.running || state.gameOver) return;

    const speed = SPEEDS[state.speedIndex];
    dt *= speed;
    state.time += dt;

    state.core.hp = Math.min(state.core.maxHp, state.core.hp + state.core.regen * dt);
    state.core.shield = Math.min(state.core.maxShield, state.core.shield + state.core.shieldRegen * dt);

    state.core.shotTimer -= dt;
    if (state.core.shotTimer <= 0) {
      shootAtTargets();
      state.core.shotTimer = 1 / state.core.fireRate;
    }

    state.core.pulseTimer += dt;
    if (state.core.pulseDamage > 0 && state.core.pulseTimer >= state.core.pulseCooldown) {
      novaPulse();
    }

    state.waveTime += dt;

    const bossWave = state.wave % 10 === 0;
    const spawnCap = bossWave ? 1 + Math.floor(state.wave / 10) : maxActiveEnemies();

    // WICHTIG: Gegner dürfen nur während des eigentlichen Wellen-Timers spawnen.
    // Sobald der Timer abgelaufen ist, werden nur noch die Restgegner beseitigt.
    if (state.waveTime < state.waveDuration) {
      state.spawnAccumulator += dt * spawnRate();

      while (state.spawnAccumulator >= 1 && state.enemies.length < spawnCap) {
        spawnEnemy();
        state.spawnAccumulator -= 1;

        if (bossWave && state.enemiesSpawned >= 1 + Math.floor(state.wave / 10)) {
          break;
        }
      }
    } else {
      // Verhindert, dass sich nach Ablauf des Timers noch Spawn-Zeit ansammelt.
      state.spawnAccumulator = 0;
    }

    if (state.waveTime >= state.waveDuration && state.enemies.length === 0) {
      nextWave();
    }

    for (const e of state.enemies) {
      if (e.slowTimer > 0) e.slowTimer -= dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      const dx = state.core.x - e.x;
      const dy = state.core.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const slowFactor = e.slowTimer > 0 ? 0.47 : 1;

      e.x += (dx / dist) * e.speed * slowFactor * dt;
      e.y += (dy / dist) * e.speed * slowFactor * dt;
      e.angle += dt * 1.4;

      if (dist < 28 + e.size) {
        damageCore(e.damage);
        e.hp = 0;
      }
    }

    for (const s of state.shots) {
      const target = state.enemies.find(e => e.id === s.targetId);
      if (!target) {
        s.life = 0;
        continue;
      }

      const dx = target.x - s.x;
      const dy = target.y - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      const step = s.speed * dt;

      if (dist <= step + target.size) {
        target.hp -= s.damage;
        target.hitFlash = .08;
        if (Math.random() < state.core.slowChance) target.slowTimer = 1.25;
        s.life = 0;
      } else {
        s.x += dx / dist * step;
        s.y += dy / dist * step;
        s.life -= dt;
      }
    }

    const dead = state.enemies.filter(e => e.hp <= 0);
    dead.forEach(killEnemy);
    state.enemies = state.enemies.filter(e => e.hp > 0);
    state.shots = state.shots.filter(s => s.life > 0);

    for (const p of state.particles) {
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    if (state.waveTime >= state.waveDuration && state.enemies.length > 0) {
      UI.waveStatus.textContent = `Restgegner: ${state.enemies.length}`;
    } else {
      UI.waveStatus.textContent = `Nächste Welle in ${Math.max(0, Math.ceil(state.waveDuration - state.waveTime))}s`;
    }
  }

  function nextWave() {
    state.wave += 1;
    state.waveTime = 0;
    state.enemiesSpawned = 0;
    state.spawnAccumulator = 0;
    state.waveDuration = state.wave % 10 === 0 ? 22 : 28;
    state.money += 5 + state.wave;
    if (state.wave % 5 === 0) state.cores += 2;
  }

  let shake = 0;

  function drawHex(x, y, radius, stroke, fill = null, lineWidth = 2, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rotation + Math.PI / 3 * i;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function draw() {
    const { w, h } = getCanvasSize();
    ctx.clearRect(0, 0, w, h);

    let ox = 0, oy = 0;
    if (shake > 0.1) {
      ox = (Math.random() - .5) * shake;
      oy = (Math.random() - .5) * shake;
      shake *= .86;
    }

    ctx.save();
    ctx.translate(ox, oy);

    // Background grid
    ctx.strokeStyle = "rgba(110,231,255,0.045)";
    ctx.lineWidth = 1;
    const gap = 38;
    for (let x = -gap; x < w + gap; x += gap) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = -gap; y < h + gap; y += gap) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Range ring
    ctx.beginPath();
    ctx.arc(state.core.x, state.core.y, state.core.range, 0, TAU);
    ctx.fillStyle = "rgba(80, 216, 255, 0.025)";
    ctx.fill();
    ctx.strokeStyle = "rgba(80, 216, 255, 0.17)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Nova timer ring
    if (state.core.pulseDamage > 0) {
      const pct = Math.min(1, state.core.pulseTimer / state.core.pulseCooldown);
      ctx.beginPath();
      ctx.arc(state.core.x, state.core.y, state.core.range + 7, -Math.PI / 2, -Math.PI / 2 + TAU * pct);
      ctx.strokeStyle = "rgba(167,255,79,.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Shots
    for (const s of state.shots) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.crit ? 4.4 : 3.1, 0, TAU);
      ctx.fillStyle = s.crit ? "#ffd65a" : "#8cf2ff";
      ctx.shadowBlur = 12;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Enemies
    for (const e of state.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);

      const fill = e.hitFlash > 0 ? "#ffffff" : "rgba(6,7,14,.9)";
      ctx.shadowBlur = 12;
      ctx.shadowColor = e.color;

      if (e.typeKey === "boss") {
        drawHex(0, 0, e.size, e.color, fill, 3, Math.PI / 6);
        drawHex(0, 0, e.size * .62, e.color, null, 2, 0);
      } else if (e.typeKey === "runner") {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(-e.size, -e.size, e.size * 2, e.size * 2);
      } else if (e.typeKey === "tank") {
        drawHex(0, 0, e.size, e.color, fill, 3, Math.PI / 6);
      } else if (e.typeKey === "leech") {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -e.size);
        ctx.lineTo(e.size, e.size);
        ctx.lineTo(-e.size, e.size);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(-e.size, -e.size, e.size * 2, e.size * 2);
      }
      ctx.shadowBlur = 0;
      ctx.restore();

      const hpPct = Math.max(0, e.hp / e.maxHp);
      if (e.typeKey === "boss" || hpPct < 0.999) {
        const bw = e.size * 2.6;
        ctx.fillStyle = "rgba(255,255,255,.10)";
        ctx.fillRect(e.x - bw / 2, e.y + e.size + 7, bw, 4);
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x - bw / 2, e.y + e.size + 7, bw * hpPct, 4);
      }
    }

    // Core glow / shield
    if (state.core.maxShield > 0 && state.core.shield > 0) {
      const shieldPct = state.core.shield / state.core.maxShield;
      ctx.beginPath();
      ctx.arc(state.core.x, state.core.y, 30, 0, TAU);
      ctx.strokeStyle = `rgba(116, 168, 255, ${0.15 + shieldPct * 0.55})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.shadowBlur = 24;
    ctx.shadowColor = "#6ee7ff";
    drawHex(state.core.x, state.core.y, 22, "#9af2ff", "rgba(6,13,28,.88)", 3, 0);
    ctx.shadowBlur = 0;
    drawHex(state.core.x, state.core.y, 11, "#a7ff4f", null, 2, Math.PI / 6);

    // Particles / pulse
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life * 1.6);
      if (p.pulse) {
        const progress = 1 - Math.min(1, p.life / .45);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18 + state.core.range * progress, 0, TAU);
        ctx.strokeStyle = `rgba(167,255,79,${alpha * .55})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.1, 0, TAU);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();

    if (!state.running && !state.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,.42)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#effaff";
      ctx.textAlign = "center";
      ctx.font = "900 30px system-ui";
      ctx.fillText("PAUSE", w / 2, h / 2);
    }
  }

  function updateUI() {
    UI.money.textContent = Math.floor(state.money);
    UI.cores.textContent = state.cores;
    UI.shards.textContent = state.shards;
    UI.wave.textContent = state.wave;
    UI.enemyCount.textContent = `${state.enemies.length} Gegner`;
    UI.hudDamage.textContent = state.core.damage.toFixed(1);
    UI.hudHp.textContent = `${Math.ceil(state.core.hp)} / ${Math.ceil(state.core.maxHp)}`;
    UI.hudIncome.textContent = `x${state.core.incomeMult.toFixed(2)}`;
    UI.hpBar.style.width = `${Math.max(0, state.core.hp / state.core.maxHp * 100)}%`;
    UI.waveBar.style.width = `${Math.min(100, state.waveTime / state.waveDuration * 100)}%`;
    UI.speedLabel.textContent = `x${SPEEDS[state.speedIndex]}`;
  }

  function upgradeCost(def) {
    const lvl = state.upgrades[def.id] || 0;
    return Math.floor(def.base * Math.pow(def.growth, lvl));
  }

  function renderUpgrades() {
    UI.upgradePanel.innerHTML = "";
    upgrades[state.activeTab].forEach(def => {
      const lvl = state.upgrades[def.id] || 0;
      const cost = upgradeCost(def);
      const maxed = lvl >= def.max;

      const btn = document.createElement("button");
      btn.className = "upgrade";
      btn.disabled = maxed;
      btn.innerHTML = `
        <div>
          <div class="upgrade-title">${def.title}</div>
          <div class="upgrade-value">${def.value()}</div>
        </div>
        <div class="upgrade-bottom">
          <span>Level ${lvl}/${def.max}</span>
          <span class="upgrade-cost">${maxed ? "MAX" : `$ ${cost}`}</span>
        </div>
      `;
      btn.addEventListener("click", () => {
        const currentCost = upgradeCost(def);
        if (state.money < currentCost || (state.upgrades[def.id] || 0) >= def.max) return;
        state.money -= currentCost;
        state.upgrades[def.id] = (state.upgrades[def.id] || 0) + 1;
        def.apply();
        renderUpgrades();
        updateUI();
      });
      UI.upgradePanel.appendChild(btn);
    });
  }

  function showWaveInfo() {
    UI.waveDialogTitle.textContent = `Welle ${state.wave} – Gegner`;
    const scale = waveScale();
    const keys = Object.keys(enemyTypes).filter(k => k !== "boss" || state.wave % 10 === 0);

    UI.waveDialogBody.innerHTML = `
      <div class="enemy-grid">
        <div class="enemy-row head">
          <span>Typ</span><span>Leben</span><span>Tempo</span><span>Schaden</span>
        </div>
        ${keys.map(key => {
          const e = enemyTypes[key];
          const unlocked = key === "boss" ? state.wave % 10 === 0 : true;
          const hp = Math.round(e.hp * scale);
          const dmg = Math.round(e.damage * (1 + (state.wave - 1) * .10));
          return `
            <div class="enemy-row" style="${unlocked ? "" : "opacity:.35"}">
              <span><i class="enemy-dot" style="background:${e.color}"></i>${e.name}</span>
              <span>${hp}</span>
              <span>${e.speed}</span>
              <span>${dmg}</span>
            </div>`;
        }).join("")}
      </div>
      <p style="color:#8aa3b4;margin-bottom:0">
        Alle 10 Wellen kommt eine Titan-Welle. Nach jeder Welle erhältst du Bonusgeld.
      </p>
    `;
    UI.waveDialog.showModal();
  }

  function endGame() {
    state.gameOver = true;
    state.running = false;
    const oldBest = Number(localStorage.getItem("neonBastionBest") || 1);
    const best = Math.max(oldBest, state.wave);
    localStorage.setItem("neonBastionBest", String(best));
    UI.finalWave.textContent = state.wave;
    UI.bestWave.textContent = best;
    UI.gameOverDialog.showModal();
  }

  function resetGame() {
    const best = localStorage.getItem("neonBastionBest");
    Object.assign(state, {
      running: true,
      gameOver: false,
      speedIndex: 0,
      activeTab: "attack",
      time: 0,
      money: 26,
      cores: 0,
      shards: 0,
      wave: 1,
      waveDuration: 28,
      waveTime: 0,
      spawnAccumulator: 0,
      enemiesSpawned: 0,
      shots: [],
      enemies: [],
      particles: [],
      upgrades: {
        damage: 0, fireRate: 0, critChance: 0, critMult: 0, range: 0, multiShot: 0,
        maxHp: 0, regen: 0, armor: 0, shield: 0, shieldRegen: 0,
        income: 0, bounty: 0, slow: 0, pulse: 0
      }
    });

    Object.assign(state.core, {
      hp: 100, maxHp: 100, shield: 0, maxShield: 0, shieldRegen: 0,
      armor: 0, regen: 0, damage: 6, fireRate: 2.1, range: 152,
      critChance: .05, critMult: 1.6, multiShot: 1,
      incomeMult: 1, bountyFlat: 0, slowChance: 0,
      pulseDamage: 0, pulseCooldown: 6, pulseTimer: 0, shotTimer: 0
    });

    if (best) localStorage.setItem("neonBastionBest", best);
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === "attack"));
    renderUpgrades();
    updateUI();
  }

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      state.activeTab = tab.dataset.tab;
      document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
      renderUpgrades();
    });
  });

  document.getElementById("speedDown").addEventListener("click", () => {
    state.speedIndex = Math.max(0, state.speedIndex - 1);
    updateUI();
  });

  document.getElementById("speedUp").addEventListener("click", () => {
    state.speedIndex = Math.min(SPEEDS.length - 1, state.speedIndex + 1);
    updateUI();
  });

  UI.pauseBtn.addEventListener("click", () => {
    if (state.gameOver) return;
    state.running = !state.running;
    UI.pauseBtn.textContent = state.running ? "Ⅱ" : "▶";
  });

  document.getElementById("restartBtn").addEventListener("click", () => {
    if (confirm("Run wirklich neu starten?")) resetGame();
  });

  document.getElementById("waveInfoBtn").addEventListener("click", showWaveInfo);
  document.getElementById("closeWaveDialog").addEventListener("click", () => UI.waveDialog.close());
  document.getElementById("playAgainBtn").addEventListener("click", () => {
    UI.gameOverDialog.close();
    resetGame();
  });

  window.addEventListener("resize", resizeCanvas);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    updateUI();
    requestAnimationFrame(frame);
  }

  resizeCanvas();
  renderUpgrades();
  updateUI();
  requestAnimationFrame(frame);
})();
