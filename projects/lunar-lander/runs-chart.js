/* Episodes-to-solve chart for the Lunar Lander page.
   Every dot is one full training run. The bar is the mean.
   The grey band is the original agent's 95% confidence interval (5 runs). */

const BASE = { label: "5", runs: [[1328, 259.0], [1228, 254.9], [1006, 258.8], [1410, 253.3], [1200, 251.2]] };

const EXPERIMENTS = {
  stride: {
    name: "Training stride",
    axis: "Learn every N game steps",
    groups: [
      { label: "1", runs: [[1296, 245.1], [776, 247.9], [1459, 259.7]] },
      { label: "2", runs: [[1044, 253.4], [964, 245.6]], thin: true },
      { label: "3", runs: [[930, 244.4], [902, 243.7], [668, 237.7]], hot: true },
      { ...BASE, label: "5", def: true },
    ],
    note: "Stride 3 averaged 833 episodes vs 1,234 at the default 5 (p = 0.016). Stride 1 swung from 776 to 1,459. Stride 2 has only 2 runs.",
  },
  lr: {
    name: "Learning rate",
    axis: "Learning rate (all at stride 3)",
    groups: [
      { label: "0.0005", runs: [[975, 240.7], [1182, 240.4], [1130, 244.0]] },
      { label: "0.001", runs: [[930, 244.4], [902, 243.7], [668, 237.7]], hot: true, def: true },
      { label: "0.002", runs: [[1183, 249.3], [1096, 259.1]], thin: true },
    ],
    note: "Halving or doubling the learning rate both slowed training (p = 0.07 and 0.05 vs 0.001). The default was already close to the best.",
  },
  eps: {
    name: "Epsilon",
    axis: "Final share of random actions (all at stride 5)",
    groups: [
      { label: "0.05", runs: [[1097, 250.2], [1165, 248.2], [1219, 254.9]] },
      { label: "0.075", runs: [[1105, 240.8], [1533, 251.3], [1100, 254.4]] },
      { ...BASE, label: "0.1", def: true },
      { label: "0.125", runs: [[1234, 263.2], [896, 254.0], [1448, 263.1]] },
    ],
    note: "No effect. Every mean sits inside the baseline band (p = 0.37, 0.95, 0.83).",
  },
};

const BAND = [1045, 1424];
const BASE_MEAN = 1234;
const Y0 = 600, Y1 = 1600;
let W = 640;
const H = 350, M = { l: 66, r: 12, t: 16, b: 58 };

const CSS = `
  .rc { border: 1px solid var(--line); border-radius: 3px; background: var(--surface); padding: 16px; max-width: 760px; }
  .rc-seg { display: inline-grid; grid-auto-flow: column; border: 1px solid var(--line-strong); border-radius: 3px; overflow: hidden; }
  .rc-seg button { font: 12px var(--mono); color: var(--muted); background: none; border: 0; padding: 8px 14px; cursor: pointer; }
  .rc-seg button + button { border-left: 1px solid var(--line-strong); }
  .rc-seg button[aria-pressed="true"] { color: var(--cyan); background: var(--cyan-faint); }
  .rc-stage { position: relative; margin-top: 12px; }
  .rc svg { display: block; width: 100%; height: auto; overflow: visible; }
  .rc text { font-family: var(--mono); font-size: 11px; fill: var(--muted); }
  .rc .rc-x { fill: #c3d5d8; font-size: 12px; }
  .rc .rc-grid { stroke: var(--line); stroke-width: 1; }
  .rc .rc-band { fill: rgba(108, 134, 139, 0.16); }
  .rc .rc-bline { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 3 4; }
  .rc .rc-dot { stroke: var(--surface); stroke-width: 2; pointer-events: none; }
  .rc .rc-hit { fill: transparent; cursor: default; }
  .rc .rc-hit:hover + .rc-dot, .rc .rc-dot.is-on { stroke: var(--text); }
  .rc-tip { position: absolute; pointer-events: none; transform: translate(-50%, calc(-100% - 12px)); white-space: nowrap;
    font: 11px/1.5 var(--mono); color: var(--text); background: #000; border: 1px solid var(--line-strong); border-radius: 3px; padding: 6px 9px; opacity: 0; transition: opacity .12s; }
  .rc-tip b { color: var(--cyan); font-weight: 400; }
  .rc-note { margin: 12px 0 0; font-family: var(--mono); font-size: 12px; line-height: 1.6; color: var(--muted); max-width: 68ch; }
  .rc-key { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .rc-key span { display: inline-flex; align-items: center; gap: 7px; }
  .rc-key i { display: inline-block; }
`;

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const fmt = (n) => Math.round(n).toLocaleString("en-US");

export function mount(el) {
  if (!document.getElementById("rc-style")) {
    const s = document.createElement("style");
    s.id = "rc-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  el.innerHTML = `
    <div class="rc">
      <div class="rc-seg" role="group" aria-label="Experiment">
        ${Object.entries(EXPERIMENTS).map(([k, e], i) => `<button type="button" data-k="${k}" aria-pressed="${i === 0}">${e.name}</button>`).join("")}
      </div>
      <div class="rc-stage"><svg role="img"></svg><div class="rc-tip"></div></div>
      <div class="rc-key">
        <span><i style="width:9px;height:9px;border-radius:50%;background:#3f8f9a"></i>One training run</span><span><i style="width:9px;height:9px;border-radius:50%;background:var(--cyan)"></i>Chosen setting</span>
        <span><i style="width:16px;height:2px;background:var(--text)"></i>Mean</span>
        <span><i style="width:16px;height:10px;background:rgba(108,134,139,.3)"></i>Original agent, 95% CI</span>
      </div>
      <p class="rc-note"></p>
    </div>`;

  const svg = el.querySelector("svg");
  const tip = el.querySelector(".rc-tip");
  const note = el.querySelector(".rc-note");
  const stage = el.querySelector(".rc-stage");
  const btns = [...el.querySelectorAll(".rc-seg button")];

  const y = (v) => M.t + (1 - (v - Y0) / (Y1 - Y0)) * (H - M.t - M.b);

  let current = "stride";
  function draw(key) {
    current = key;
    W = Math.round(Math.max(320, Math.min(760, stage.clientWidth || 640)));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const e = EXPERIMENTS[key];
    const n = e.groups.length;
    const colW = (W - M.l - M.r) / n;
    const x = (i) => M.l + colW * (i + 0.5);
    let g = "";

    for (let v = Y0; v <= Y1; v += 200) {
      g += `<line class="rc-grid" x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      g += `<text x="${M.l - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
    }
    g += `<rect class="rc-band" x="${M.l}" width="${W - M.l - M.r}" y="${y(BAND[1])}" height="${y(BAND[0]) - y(BAND[1])}"/>`;
    g += `<line class="rc-bline" x1="${M.l}" x2="${W - M.r}" y1="${y(BASE_MEAN)}" y2="${y(BASE_MEAN)}"/>`;
    g += `<text transform="translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)" text-anchor="middle">Episodes to solve</text>`;

    e.groups.forEach((grp, i) => {
      const cx = x(i);
      const eps = grp.runs.map((r) => r[0]);
      const m = mean(eps);
      const color = grp.hot ? "var(--cyan)" : "#3f8f9a";
      g += `<text class="rc-x" x="${cx}" y="${H - M.b + 20}" text-anchor="middle">${grp.label}</text>`;
      if (grp.def) g += `<text x="${cx}" y="${H - M.b + 34}" text-anchor="middle">default</text>`;
      g += `<line x1="${cx - 22}" x2="${cx + 22}" y1="${y(m)}" y2="${y(m)}" stroke="var(--text)" stroke-width="2" stroke-linecap="round" pointer-events="none"/>`;
      g += `<rect class="rc-hit" x="${cx - 26}" y="${y(m) - 7}" width="52" height="14" data-tip="<b>Mean ${fmt(m)}</b> · ${grp.runs.length} runs${grp.thin ? " (too few)" : ""}" data-x="${cx}" data-y="${y(m)}"/>`;
      grp.runs.forEach(([ep, sc], k) => {
        const dx = (k - (grp.runs.length - 1) / 2) * 11;
        const cy = y(ep);
        const t = `Run ${k + 1} · <b>${fmt(ep)} episodes</b> · score ${sc.toFixed(1)}`;
        g += `<circle class="rc-hit" cx="${cx + dx}" cy="${cy}" r="12" data-tip="${t}" data-x="${cx + dx}" data-y="${cy}"/>`;
        g += `<circle class="rc-dot" cx="${cx + dx}" cy="${cy}" r="5" fill="${color}"/>`;
      });
    });
    g += `<text x="${(M.l + W - M.r) / 2}" y="${H - 6}" text-anchor="middle">${e.axis}</text>`;

    svg.innerHTML = g;
    svg.setAttribute("aria-label", `${e.name}: episodes to solve for each setting. ${e.note}`);
    note.textContent = e.note;
    btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === key)));
  }

  function onMove(ev) {
    const t = ev.target.closest("[data-tip]");
    if (!t || !t.dataset.x) { tip.style.opacity = 0; return; }
    const box = svg.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    const k = box.width / W;
    tip.innerHTML = t.dataset.tip;
    tip.style.left = `${box.left - st.left + +t.dataset.x * k}px`;
    tip.style.top = `${box.top - st.top + +t.dataset.y * k}px`;
    tip.style.opacity = 1;
  }
  const onLeave = () => { tip.style.opacity = 0; };
  const onClick = (ev) => { const b = ev.target.closest("button[data-k]"); if (b) draw(b.dataset.k); };

  const ro = new ResizeObserver(() => { if (Math.round(Math.max(320, Math.min(760, stage.clientWidth))) !== W) draw(current); });
  ro.observe(stage);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerleave", onLeave);
  el.addEventListener("click", onClick);
  draw("stride");

  return () => {
    ro.disconnect();
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("click", onClick);
  };
}
