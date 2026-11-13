/* Interactive side-view IK + torque demo for the robotic arm page.
   Drag anywhere in the canvas to move the claw. All numbers come from the CAD:
   lengths in mm, masses in grams, measured relative to the shoulder axis. */

const L1 = 109.9;          // shoulder -> elbow
const L2 = 183.7;          // elbow -> jaw tips
const H = 90.1;            // shoulder height above the table
const EDGE = 72;           // base axis -> edge of the feet (tipping line)
const BASE_MASS = 336;     // base + turntable + base servo + shoulder servo
const G = 9.81;
const STALL = { "4.8": 9.4 * 0.0981, "6.0": 11 * 0.0981 }; // N·m

// [mass g, along link mm, perpendicular mm] in each link's own frame
const LINK1 = [[43.5, 61.7, 0.1], [55, 100, 0]];                       // lower link, elbow servo
const LINK2 = [[59.1, 64.7, -10.3], [55, 116.2, -43.1], [38.4, 143.8, -6.0]]; // forearm, gripper servo, claw

const deg = (r) => (r * 180) / Math.PI;

function solve(r, s, elbowUp) {
  let d = Math.hypot(r, s);
  const max = L1 + L2 - 0.01, min = Math.abs(L2 - L1) + 0.01;
  let reachable = true;
  if (d > max || d < min) {
    reachable = false;
    const k = (d > max ? max : min) / (d || 1);
    r *= k; s *= k; d = Math.hypot(r, s);
  }
  const D = (r * r + s * s - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const t2 = (elbowUp ? -1 : 1) * Math.acos(Math.max(-1, Math.min(1, D)));
  const t1 = Math.atan2(s, r) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
  return { t1, t2, r, s, reachable };
}

function physics(t1, t2, payload) {
  const a2 = t1 + t2;
  const ex = L1 * Math.cos(t1), ey = L1 * Math.sin(t1);
  const pts = [];
  for (const [m, u, v] of LINK1) pts.push({ m, x: u * Math.cos(t1) - v * Math.sin(t1), y: u * Math.sin(t1) + v * Math.cos(t1), link: 1 });
  for (const [m, u, v] of [...LINK2, [payload, L2, 0]]) pts.push({ m, x: ex + u * Math.cos(a2) - v * Math.sin(a2), y: ey + u * Math.sin(a2) + v * Math.cos(a2), link: 2 });
  let ts = 0, te = 0, tip = 0;
  for (const p of pts) {
    ts += p.m * p.x;
    if (p.link === 2) te += p.m * (p.x - ex);
    tip += p.m * (p.x - EDGE);
  }
  // gram·mm -> N·m
  return { pts, shoulder: Math.abs(ts) * G / 1e6, elbow: Math.abs(te) * G / 1e6, tip: tip / (BASE_MASS * EDGE) };
}

export function mount(el) {
  el.innerHTML = `
    <div class="ik">
      <div class="ik-stage">
        <canvas></canvas>
        <span class="ik-hint">Drag to move the claw</span>
      </div>
      <div class="ik-panel">
        <div class="ik-ctrls">
          <label class="ik-field"><span>Payload <b class="ik-pl">50 g</b></span><input type="range" min="0" max="250" step="5" value="50" class="ik-range" /></label>
          <div class="ik-seg" role="group" aria-label="Supply voltage">
            <button type="button" data-v="4.8">4.8 V</button><button type="button" data-v="6.0" aria-pressed="true">6.0 V</button>
          </div>
          <div class="ik-seg" role="group" aria-label="Elbow solution">
            <button type="button" data-e="up" aria-pressed="true">Elbow up</button><button type="button" data-e="down">Elbow down</button>
          </div>
        </div>
        <dl class="ik-read">
          <div><dt>θ₁ shoulder</dt><dd class="r-t1"></dd></div>
          <div><dt>θ₂ elbow</dt><dd class="r-t2"></dd></div>
          <div><dt>Claw pitch</dt><dd class="r-pitch"></dd></div>
          <div><dt>Target r, z</dt><dd class="r-tgt"></dd></div>
        </dl>
        <div class="ik-bars">
          <div class="ik-bar" data-k="shoulder"><span class="ik-lab">Shoulder torque</span><span class="ik-val"></span><i><b></b><em></em></i></div>
          <div class="ik-bar" data-k="elbow"><span class="ik-lab">Elbow torque</span><span class="ik-val"></span><i><b></b><em></em></i></div>
          <div class="ik-bar" data-k="tip"><span class="ik-lab">Tipping if unbolted</span><span class="ik-val"></span><i><b></b><em></em></i></div>
        </div>
        <p class="ik-foot">Bars show % of MG996R stall torque. The tick is the 50% line I design to. Tipping is for a loose base pointing between two feet. Mine is screwed to a baseboard.</p>
      </div>
    </div>`;

  injectStyle();

  const canvas = el.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const stage = el.querySelector(".ik-stage");
  const range = el.querySelector(".ik-range");
  const q = (s) => el.querySelector(s);

  const state = { r: 219.9, s: 65.3, payload: 50, volts: "6.0", elbowUp: true };
  let W = 0, Hh = 0, dpr = 1, scale = 1, ox = 0, oy = 0;

  const view = { rMin: -120, rMax: 320, sMin: -105, sMax: 300 };
  function resize() {
    const rect = stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = rect.width; Hh = rect.height;
    canvas.width = W * dpr; canvas.height = Hh * dpr;
    canvas.style.width = W + "px"; canvas.style.height = Hh + "px";
    scale = Math.min(W / (view.rMax - view.rMin), Hh / (view.sMax - view.sMin));
    ox = (W - (view.rMax - view.rMin) * scale) / 2 - view.rMin * scale;
    oy = (Hh - (view.sMax - view.sMin) * scale) / 2 + view.sMax * scale;
    draw();
  }
  const X = (r) => ox + r * scale;
  const Y = (s) => oy - s * scale;
  const toWorld = (px, py) => ({ r: (px - ox) / scale, s: (oy - py) / scale });

  const css = getComputedStyle(document.documentElement);
  const C = {
    cyan: css.getPropertyValue("--cyan").trim() || "#00e5ff",
    line: css.getPropertyValue("--line").trim() || "#142024",
    strong: css.getPropertyValue("--line-strong").trim() || "#24363b",
    muted: css.getPropertyValue("--muted").trim() || "#6c868b",
    text: css.getPropertyValue("--text").trim() || "#e9f7f9",
    warn: "#ffb547", bad: "#ff4d5e",
  };
  const level = (f) => (f >= 1 ? C.bad : f >= 0.5 ? C.warn : C.cyan);

  function draw() {
    if (!W) return;
    const sol = solve(state.r, state.s, state.elbowUp);
    const ph = physics(sol.t1, sol.t2, state.payload);
    const stall = STALL[state.volts];
    const ex = L1 * Math.cos(sol.t1), ey = L1 * Math.sin(sol.t1);
    const a2 = sol.t1 + sol.t2;
    const tx = ex + L2 * Math.cos(a2), ty = ey + L2 * Math.sin(a2);
    const belowTable = ty < -H + 5 || ey < -H + 5;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);

    // grid every 50 mm
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    for (let r = -100; r <= 300; r += 50) { ctx.moveTo(X(r) + 0.5, Y(view.sMax)); ctx.lineTo(X(r) + 0.5, Y(-H)); }
    for (let s = -H + 50; s <= 300; s += 50) { ctx.moveTo(X(view.rMin), Y(s) + 0.5); ctx.lineTo(X(view.rMax), Y(s) + 0.5); }
    ctx.stroke();

    // reach envelope
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = C.strong;
    ctx.beginPath(); ctx.arc(X(0), Y(0), (L1 + L2) * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(0), Y(0), Math.abs(L2 - L1) * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // table + base
    ctx.fillStyle = "#000";
    ctx.fillRect(0, Y(-H), W, Hh - Y(-H));
    ctx.strokeStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(0, Y(-H) + 0.5); ctx.lineTo(W, Y(-H) + 0.5); ctx.stroke();
    ctx.fillStyle = "#0b1316"; ctx.strokeStyle = C.strong;
    ctx.beginPath();
    ctx.moveTo(X(-EDGE), Y(-H)); ctx.lineTo(X(-EDGE), Y(-H + 14)); ctx.lineTo(X(-45), Y(-H + 32));
    ctx.lineTo(X(-45), Y(-H + 70)); ctx.lineTo(X(45), Y(-H + 70)); ctx.lineTo(X(45), Y(-H + 32));
    ctx.lineTo(X(EDGE), Y(-H + 14)); ctx.lineTo(X(EDGE), Y(-H)); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // shoulder bracket
    ctx.fillRect(X(-10), Y(12), 20 * scale, (H - 70) * scale + 12 * scale);
    ctx.strokeRect(X(-10), Y(12), 20 * scale, (H - 70) * scale + 12 * scale);
    // tipping edge marker
    ctx.fillStyle = level(ph.tip);
    ctx.beginPath(); ctx.moveTo(X(EDGE), Y(-H)); ctx.lineTo(X(EDGE) - 5, Y(-H) + 8); ctx.lineTo(X(EDGE) + 5, Y(-H) + 8); ctx.fill();

    // links
    const tcol = belowTable ? C.bad : C.text;
    ctx.lineCap = "round";
    ctx.strokeStyle = tcol; ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(6, 14 * scale);
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(ex), Y(ey)); ctx.stroke();
    ctx.lineWidth = Math.max(5, 11 * scale);
    ctx.beginPath(); ctx.moveTo(X(ex), Y(ey)); ctx.lineTo(X(tx), Y(ty)); ctx.stroke();
    ctx.globalAlpha = 1;

    // claw at the end, rigid with the forearm
    const cl = 30, sp = 12;
    const cx = Math.cos(a2), cy = Math.sin(a2), nx = -cy, ny = cx;
    ctx.lineWidth = 3; ctx.strokeStyle = C.cyan;
    ctx.beginPath();
    for (const sgn of [1, -1]) {
      ctx.moveTo(X(tx - cx * cl + nx * sp * sgn), Y(ty - cy * cl + ny * sp * sgn));
      ctx.lineTo(X(tx + nx * sp * sgn * 0.6), Y(ty + ny * sp * sgn * 0.6));
    }
    ctx.stroke();

    // joints
    for (const [jx, jy] of [[0, 0], [ex, ey]]) {
      ctx.fillStyle = "#000"; ctx.strokeStyle = C.cyan; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(jx), Y(jy), 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // masses: circle area ~ mass, with a gravity tick
    for (const p of ph.pts) {
      if (!p.m) continue;
      const rad = Math.sqrt(p.m) * 0.75;
      ctx.strokeStyle = C.cyan; ctx.lineWidth = 1;
      ctx.fillStyle = "rgba(0,229,255,.12)";
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.y) + rad); ctx.lineTo(X(p.x), Y(p.y) + rad + p.m * 0.12); ctx.stroke();
    }

    // target
    ctx.strokeStyle = sol.reachable ? C.cyan : C.bad; ctx.lineWidth = 1.5;
    const gx = X(state.r), gy = Y(state.s);
    ctx.beginPath(); ctx.moveTo(gx - 9, gy); ctx.lineTo(gx + 9, gy); ctx.moveTo(gx, gy - 9); ctx.lineTo(gx, gy + 9); ctx.stroke();

    // labels
    ctx.font = "11px " + (css.getPropertyValue("--mono").trim() || "monospace");
    ctx.fillStyle = C.muted;
    const ra = Math.PI * 0.2, rl = "reach " + Math.round(L1 + L2) + " mm";
    ctx.fillText(rl, Math.min(X(Math.cos(ra) * (L1 + L2)) + 6, W - ctx.measureText(rl).width - 8), Y(Math.sin(ra) * (L1 + L2)) - 6);
    ctx.fillText("tip edge", X(EDGE) + 8, Y(-H) - 6);
    if (!sol.reachable) { ctx.fillStyle = C.bad; ctx.fillText("out of reach", gx + 12, gy - 10); }
    if (belowTable) { ctx.fillStyle = C.bad; ctx.fillText("hits the table", X(tx) + 12, Y(ty) + 18); }

    // readouts
    q(".r-t1").textContent = deg(sol.t1).toFixed(1) + "°";
    q(".r-t2").textContent = deg(sol.t2).toFixed(1) + "°";
    q(".r-pitch").textContent = deg(a2).toFixed(1) + "°";
    q(".r-tgt").textContent = `${Math.round(tx)}, ${Math.round(ty + H)} mm`;
    setBar("shoulder", ph.shoulder / stall, `${ph.shoulder.toFixed(2)} N·m`);
    setBar("elbow", ph.elbow / stall, `${ph.elbow.toFixed(2)} N·m`);
    setBar("tip", Math.max(0, ph.tip), ph.tip >= 1 ? "Tips over" : `${Math.round(Math.max(0, ph.tip) * 100)}%`);
  }

  function setBar(k, f, label) {
    const bar = el.querySelector(`.ik-bar[data-k="${k}"]`);
    const pct = Math.round(f * 100);
    bar.querySelector(".ik-val").textContent = k === "tip" ? label : `${label} · ${pct}%`;
    const b = bar.querySelector("b");
    b.style.width = Math.min(100, f * 100) + "%";
    b.style.background = level(f);
    bar.querySelector(".ik-val").style.color = f >= 1 ? C.bad : f >= 0.5 ? C.warn : "";
  }

  // pointer
  let dragging = false;
  function move(e) {
    const rect = canvas.getBoundingClientRect();
    const w = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    state.r = w.r; state.s = Math.max(-H, w.s);
    draw();
  }
  const down = (e) => { dragging = true; canvas.setPointerCapture(e.pointerId); move(e); };
  const mv = (e) => { if (dragging) move(e); };
  const up = () => { dragging = false; };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", mv);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  range.addEventListener("input", () => { state.payload = +range.value; q(".ik-pl").textContent = range.value + " g"; draw(); });
  el.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => {
    state.volts = b.dataset.v;
    el.querySelectorAll("[data-v]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    draw();
  }));
  el.querySelectorAll("[data-e]").forEach((b) => b.addEventListener("click", () => {
    state.elbowUp = b.dataset.e === "up";
    el.querySelectorAll("[data-e]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    draw();
  }));

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  return () => ro.disconnect();
}

function injectStyle() {
  if (document.getElementById("ik-style")) return;
  const s = document.createElement("style");
  s.id = "ik-style";
  s.textContent = `
  .ik { border: 1px solid var(--line); border-radius: 4px; background: var(--surface); display: grid; grid-template-columns: 1.5fr 1fr; overflow: hidden; }
  .ik-stage { position: relative; min-height: 420px; border-right: 1px solid var(--line); touch-action: none; cursor: crosshair; }
  .ik-stage canvas { position: absolute; inset: 0; display: block; }
  .ik-hint { position: absolute; left: 14px; top: 12px; font-family: var(--mono); font-size: 11px; color: var(--muted); pointer-events: none; }
  .ik-panel { padding: 18px; display: flex; flex-direction: column; gap: 18px; min-width: 0; }
  .ik-ctrls { display: grid; gap: 10px; }
  .ik-field { display: grid; gap: 8px; font-family: var(--mono); font-size: 12px; color: var(--muted); }
  .ik-field b { color: var(--cyan); font-weight: 400; }
  .ik-range { width: 100%; accent-color: var(--cyan); }
  .ik-seg { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--line-strong); border-radius: 3px; overflow: hidden; }
  .ik-seg button { font: 12px var(--mono); color: var(--muted); background: none; border: 0; padding: 8px; cursor: pointer; }
  .ik-seg button + button { border-left: 1px solid var(--line-strong); }
  .ik-seg button[aria-pressed="true"] { color: var(--cyan); background: var(--cyan-faint); }
  .ik-read { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .ik-read dt { font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .ik-read dd { margin: 4px 0 0; font-family: var(--mono); font-size: 15px; color: var(--text); }
  .ik-bars { display: grid; gap: 14px; }
  .ik-bar { display: grid; grid-template-columns: 1fr auto; gap: 6px; font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .ik-val { color: var(--text); }
  .ik-bar i { grid-column: 1 / -1; position: relative; height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; }
  .ik-bar b { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; transition: width .08s; }
  .ik-bar em { position: absolute; left: 50%; top: -2px; bottom: -2px; width: 1px; background: var(--text); opacity: .5; }
  .ik-foot { margin: 0; font-family: var(--mono); font-size: 11px; line-height: 1.6; color: var(--muted); }
  @media (max-width: 760px) {
    .ik { grid-template-columns: 1fr; }
    .ik-stage { min-height: 320px; border-right: 0; border-bottom: 1px solid var(--line); }
  }`;
  document.head.appendChild(s);
}
