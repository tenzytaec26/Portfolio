(() => {
  const canvas = document.getElementById('blossoms');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let last = performance.now();
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==== Tweakable settings ====
  const SETTINGS = {
    count: prefersReduced ? 30 : 50,  // number of blossoms
    minSize: 10,  // logical px (will be multiplied by DPR + depth)
    maxSize: 14,
    minFall: 20,  // px/sec
    maxFall: 60,
    minSwing: 15, // horizontal sway amplitude (px)
    maxSwing: 45,
    hueMin: 340,  // pink/peach hue range (HSL). Try 15–25 for peachier oranges.
    hueMax: 355,
    saturMin: 70,
    saturMax: 90,
    lightMin: 85,
    lightMax: 95,
    centerColor: 'hsl(35 90% 65% / 0.9)', // blossom center (golden)
    petals: 5,   // number of petals
    maxDepth: 1.5 // parallax depth multiplier (0.5–1.5 gives near/far sizes & speed)
  };

  const blossoms = [];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = Math.floor(innerWidth * dpr);
    h = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
  }

  class Blossom {
    constructor(spawnAtTop = false) { this.reset(spawnAtTop); }
    reset(spawnAtTop) {
      this.z = rand(0.5, SETTINGS.maxDepth);              // depth (parallax)
      this.size = rand(SETTINGS.minSize, SETTINGS.maxSize) * dpr * this.z;
      this.x = rand(0, w);
      this.y = spawnAtTop ? rand(-h * 0.2, -20 * dpr) : rand(0, h);
      this.swing = rand(SETTINGS.minSwing, SETTINGS.maxSwing) * this.z;
      this.omega = rand(0.6, 1.2) / 60;                   // rotation speed (radians/frame)
      this.angle = rand(0, Math.PI * 2);
      this.speedY = rand(SETTINGS.minFall, SETTINGS.maxFall) * this.z; // px/sec
      this.t = rand(0, Math.PI * 2);                      // sway phase
      this.hue = rand(SETTINGS.hueMin, SETTINGS.hueMax);
      this.sat = rand(SETTINGS.saturMin, SETTINGS.saturMax);
      this.lit = rand(SETTINGS.lightMin, SETTINGS.lightMax);
      this.petals = SETTINGS.petals;
    }
    update(dt) {
      this.t += dt;
      this.y += this.speedY * dt * dpr;
      this.x += Math.sin(this.t * 2) * this.swing * dt * dpr;
      this.angle += this.omega;
      if (this.y - this.size > h + 20 * dpr) {
        this.reset(true);
        this.y = -this.size;
      }
    }
    draw() {
      drawBlossom(
        ctx, this.x, this.y, this.size,
        this.hue, this.sat, this.lit,
        this.angle, this.petals
      );
    }
  }

  // Draw one 5-petal blossom, procedurally (no images).
  function drawBlossom(ctx, x, y, size, hue, sat, lit, angle, petals) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const r = size * 0.33;         // petal belly width
    const len = size * 0.62;       // petal length
    const fill = `hsla(${hue}, ${sat}%, ${lit}%, 0.95)`;
    const stroke = `hsla(${hue}, ${sat}%, ${Math.max(60, lit - 25)}%, 0.6)`;

    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((i / petals) * Math.PI * 2);
      drawPetal(ctx, 0, 0, r, len, fill, stroke);
      ctx.restore();
    }

    // Center
    ctx.beginPath();
    ctx.fillStyle = SETTINGS.centerColor;
    ctx.arc(0, 0, size * 0.10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // A single petal using two Bézier curves.
  function drawPetal(ctx, x, y, rx, ry, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Right curve to the tip
    ctx.bezierCurveTo(x + rx, y - ry * 0.3, x + rx * 0.9, y - ry, x, y - ry);
    // Left curve back to base
    ctx.bezierCurveTo(x - rx * 0.9, y - ry, x - rx, y - ry * 0.3, x, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, ry * 0.02);
    ctx.stroke();
  }

  function drawFrame(now) {
    const dt = Math.min((now - last) / 1000, 0.033); // seconds (cap ~30 FPS delta)
    last = now;

    ctx.clearRect(0, 0, w, h);
    for (const b of blossoms) {
      if (!prefersReduced) b.update(dt);
      b.draw();
    }
    if (!prefersReduced) requestAnimationFrame(drawFrame);
  }

  function init() {
    resize();
    blossoms.length = 0;
    for (let i = 0; i < SETTINGS.count; i++) blossoms.push(new Blossom(false));
    // Static render if user prefers reduced motion; otherwise animate.
    if (prefersReduced) {
      ctx.clearRect(0, 0, w, h);
      for (const b of blossoms) b.draw();
    } else {
      requestAnimationFrame(drawFrame);
    }
  }

  window.addEventListener('resize', () => {
    const oldCount = SETTINGS.count;
    resize();
    // Keep count constant; just redraw
    if (prefersReduced) {
      ctx.clearRect(0, 0, w, h);
      for (const b of blossoms) b.draw();
    }
  }, { passive: true });

  init();

  // Optional: expose simple controls for live tuning from the console
  window.__blossoms = { SETTINGS, blossoms, redraw: () => requestAnimationFrame(drawFrame) };
  
})();