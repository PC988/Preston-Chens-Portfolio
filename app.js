/* App logic. You normally never need to touch this file. Edit content.js. */
(function () {
  const app = document.getElementById("app");
  const tabs = document.querySelectorAll(".tabs a");
  const brand = document.getElementById("brand");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let cleanup = null;      // tears down the slider when leaving it
  let savedIndex = 0;      // remembers which slide you were on

  brand.textContent = ABOUT.name;

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const assetPath = (p, src) => (/^(https?:)?\/\//.test(src) || src.includes("/") ? src : `projects/${p.slug}/${src}`);
  const coverOf = (p) => (p.cover ? assetPath(p, p.cover) : `projects/${p.slug}/cover.jpg`);
  const normImages = (p) => (p.images || []).map((im) => (typeof im === "string" ? { src: im } : im)).filter((im) => im && im.src);

  function setTab(name) {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  }

  /* ---------- router ---------- */
  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    const path = (location.hash.replace(/^#/, "") || "/").replace(/\/+$/, "") || "/";
    window.scrollTo(0, 0);

    if (path === "/about") return renderAbout();
    const m = path.match(/^\/p\/(.+)$/);
    if (m) {
      const i = PROJECTS.findIndex((p) => p.slug === decodeURIComponent(m[1]));
      if (i !== -1) return renderProject(i);
    }
    renderSlider();
  }
  window.addEventListener("hashchange", route);

  /* ---------- About ---------- */
  function renderAbout() {
    document.body.classList.remove("lock");
    setTab("about");
    document.title = `About · ${ABOUT.name}`;
    app.innerHTML = `
      <section class="page view">
        <p class="kicker">// about</p>
        <h1 class="statement">${ABOUT.statement.map((l) => `<span>${esc(l)}</span>`).join("")}</h1>
        <div class="bio">${ABOUT.bio.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        <div class="link-row">
          ${(ABOUT.links || []).map((l) => `<a class="btn" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}
          <a class="btn" href="#/">See projects →</a>
        </div>
      </section>`;
  }

  /* ---------- Project detail ---------- */
  function renderProject(i) {
    const p = PROJECTS[i];
    savedIndex = i;
    document.body.classList.remove("lock");
    setTab("projects");
    document.title = `${p.title} · ${ABOUT.name}`;

    const imgs = normImages(p);
    const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
    const next = PROJECTS[(i + 1) % PROJECTS.length];

    const gallery = imgs.length
      ? imgs.map((im, k) => `
          <figure class="shot">
            <img src="${esc(assetPath(p, im.src))}" alt="${esc(im.caption || p.title)}" loading="lazy" />
            ${im.caption ? `<figcaption><b>${pad(k + 1)}</b>${esc(im.caption)}</figcaption>` : ""}
          </figure>`).join("")
      : `<div class="empty">No photos yet. Drop them in <code>projects/${esc(p.slug)}/</code> and list them under <code>images</code> in content.js</div>`;

    app.innerHTML = `
      <article class="page view">
        <a class="back" href="#/">← All projects</a>
        <p class="kicker">// ${pad(i + 1)} / ${pad(PROJECTS.length)}</p>
        <h1 class="p-title">${esc(p.title)}</h1>
        <div class="p-meta">
          <span class="p-year">${esc(p.year)}</span>
          ${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
        </div>
        <p class="p-summary">${esc(p.summary)}</p>
        ${(p.links || []).length ? `<div class="link-row" style="margin:-24px 0 56px">${p.links.map((l) => `<a class="btn" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div>` : ""}
        ${(p.models || []).length ? modelsSection(p) : ""}
        ${(p.sections || []).length ? sectionsHTML(p) : ""}
        <div class="gallery">
          ${(p.models || []).length ? "" : `<figure class="shot cover-shot"><img src="${esc(coverOf(p))}" alt="${esc(p.title)}" /></figure>`}
          ${imgs.length || !(p.models || []).length ? gallery : ""}
        </div>
        ${PROJECTS.length > 1 ? `
        <nav class="p-next">
          <a href="#/p/${encodeURIComponent(prev.slug)}">← ${esc(prev.title)}</a>
          <a href="#/p/${encodeURIComponent(next.slug)}">${esc(next.title)} →</a>
        </nav>` : ""}
      </article>`;

    // Hide the cover block if there's no cover.jpg yet
    const cover = app.querySelector(".cover-shot img");
    if (cover) cover.addEventListener("error", () => cover.parentElement.remove());

    const disposeModels = (p.models || []).length ? mountModels(p) : null;
    const disposeEmbeds = mountEmbeds(p);

    const onKey = (e) => { if (e.key === "Escape") location.hash = "#/"; };
    window.addEventListener("keydown", onKey);
    cleanup = () => { window.removeEventListener("keydown", onKey); if (disposeModels) disposeModels(); disposeEmbeds(); };
  }

  /* ---------- Write-up sections (project page) ----------
     Each section: { title, blocks: [...] }. A block is either a string (a paragraph)
     or one of: { math: [lines] }, { list: [items] }, { table: { head: [], rows: [[]] } },
     { note: "small print" }, { embed: "file.js" } (a module in the project folder that
     exports mount(el) and returns a cleanup function). */
  function blockHTML(p, b) {
    if (typeof b === "string") return `<p class="s-p">${esc(b)}</p>`;
    if (b.math) return `<pre class="s-math">${b.math.map(esc).join("\n")}</pre>`;
    if (b.list) return `<ul class="s-list">${b.list.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`;
    if (b.note) return `<p class="s-note">${esc(b.note)}</p>`;
    if (b.table) return `
      <div class="s-table-wrap"><table class="s-table">
        <thead><tr>${b.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
    if (b.embed) return `<div class="s-embed" data-src="${esc(assetPath(p, b.embed))}"></div>`;
    return "";
  }

  function sectionsHTML(p) {
    return `<div class="writeup">${p.sections.map((sec, k) => `
      <section class="s-sec">
        <h2 class="s-title"><span>${pad(k + 1)}</span>${esc(sec.title)}</h2>
        <div class="s-body">${(sec.blocks || []).map((b) => blockHTML(p, b)).join("")}</div>
      </section>`).join("")}</div>`;
  }

  function mountEmbeds() {
    const disposers = [];
    let dead = false;
    app.querySelectorAll(".s-embed").forEach((el) => {
      import(new URL(el.dataset.src, location.href).href)
        .then((m) => { if (!dead) disposers.push(m.mount(el) || (() => {})); })
        .catch(() => { el.innerHTML = `<div class="empty">Demo failed to load</div>`; });
    });
    return () => { dead = true; disposers.forEach((d) => d()); };
  }

  /* ---------- 3D models (project page) ---------- */
  const normModels = (p) => (p.models || []).filter((m) => m && m.src);

  function modelsSection(p) {
    const models = normModels(p);
    return `
      <section class="robots" aria-label="3D models">
        <div class="viewer" data-state="loading">
          <div class="viewer-canvas"></div>
          <div class="viewer-top">
            <span class="viewer-id"><b>${pad(1)}</b> / ${pad(models.length)}&nbsp;&nbsp;<span class="viewer-name">${esc(models[0].name)}</span></span>
            <span class="viewer-status">Loading model</span>
          </div>
          <div class="viewer-bar"><i></i></div>
          <div class="viewer-foot">
            <span class="viewer-hint">Drag to rotate · Click, then scroll to zoom</span>
            <span class="viewer-ctrls">
              <button type="button" data-act="spin" aria-pressed="true">Spin</button>
              <button type="button" data-act="wire" aria-pressed="false">Wire</button>
              <button type="button" data-act="reset">Reset</button>
            </span>
          </div>
        </div>
        <div class="model-side">
          <div class="model-tabs" role="tablist">
            ${models.map((m, k) => `
              <button type="button" role="tab" class="model-tab" data-k="${k}" aria-selected="${k === 0}">
                <span class="mt-num">${pad(k + 1)}</span>
                <span class="mt-name">${esc(m.name)}</span>
                <span class="mt-season">${esc(m.season || "")}</span>
              </button>`).join("")}
          </div>
          <div class="model-info" aria-live="polite"></div>
        </div>
      </section>`;
  }

  function mountModels(p) {
    const models = normModels(p);
    const root = app.querySelector(".robots");
    const viewerEl = root.querySelector(".viewer");
    const canvasWrap = root.querySelector(".viewer-canvas");
    const bar = root.querySelector(".viewer-bar i");
    const status = root.querySelector(".viewer-status");
    const idEl = root.querySelector(".viewer-id b");
    const nameEl = root.querySelector(".viewer-name");
    const info = root.querySelector(".model-info");
    const tabsEls = [...root.querySelectorAll(".model-tab")];
    let viewer = null, dead = false, active = 0;

    function renderInfo(m) {
      info.innerHTML = `
        <h2 class="mi-name">${esc(m.name)}</h2>
        <p class="mi-meta">${[m.season, m.game].filter(Boolean).map(esc).join("&nbsp;&nbsp;·&nbsp;&nbsp;")}</p>
        ${(Array.isArray(m.description) ? m.description : [m.description]).filter(Boolean).map((d) => `<p class="mi-desc">${esc(d)}</p>`).join("")}
        ${(m.tags || []).length ? `<div class="p-meta">${m.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}`;
    }

    function select(k) {
      active = k;
      const m = models[k];
      tabsEls.forEach((t, i) => t.setAttribute("aria-selected", String(i === k)));
      idEl.textContent = pad(k + 1);
      nameEl.textContent = m.name;
      renderInfo(m);
      if (!viewer) return;
      viewerEl.dataset.state = "loading";
      status.textContent = "Loading model";
      bar.style.transform = "scaleX(0)";
      viewer.show(assetPath(p, m.src), m.rotate || 0);
    }

    tabsEls.forEach((t) => t.addEventListener("click", () => select(+t.dataset.k)));
    root.querySelector(".model-tabs").addEventListener("keydown", (e) => {
      const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      const k = (active + d + models.length) % models.length;
      select(k); tabsEls[k].focus();
    });
    root.querySelector(".viewer-ctrls").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || !viewer) return;
      if (b.dataset.act === "reset") viewer.reset();
      if (b.dataset.act === "spin") b.setAttribute("aria-pressed", String(viewer.toggleSpin()));
      if (b.dataset.act === "wire") b.setAttribute("aria-pressed", String(viewer.toggleWire()));
    });

    renderInfo(models[0]);

    import("./viewer.js").then(({ mount }) => {
      if (dead) return;
      viewer = mount({
        canvasWrap,
        onProgress: (f) => { bar.style.transform = `scaleX(${f})`; },
        onReady: () => {
          viewerEl.dataset.state = "ready";
          status.textContent = models[active].season || "";
          // Fetch the next model in the background so switching feels instant
          const nx = models[(active + 1) % models.length];
          if (nx) setTimeout(() => viewer && viewer.preload(assetPath(p, nx.src)), 400);
        },
        onError: () => { viewerEl.dataset.state = "error"; status.textContent = "Model failed to load"; },
      });
      select(active);
    }).catch(() => { viewerEl.dataset.state = "error"; status.textContent = "3D viewer failed to load"; });

    return () => { dead = true; if (viewer) viewer.dispose(); viewer = null; };
  }

  /* ---------- Projects slider (home) ---------- */
  function renderSlider() {
    document.body.classList.add("lock");
    setTab("projects");
    document.title = ABOUT.name;
    const n = PROJECTS.length;

    const tickCount = Math.max(21, n * 6 + 1);
    app.innerHTML = `
      <section class="slider view" aria-label="Projects">
        <div class="ticks" aria-hidden="true">
          ${Array.from({ length: tickCount }, (_, k) => `<i class="${k % 6 === 0 ? "major" : ""}"></i>`).join("")}
          <span class="window"></span>
        </div>
        <div class="track">
          ${PROJECTS.map((p, i) => `
            <div class="slide" data-i="${i}">
              <div class="slide-label"><span><span class="num">${pad(i + 1)}</span>&nbsp;&nbsp;${esc(p.title)}</span><span>${esc(p.year)}</span></div>
              <a class="slide-frame" href="#/p/${encodeURIComponent(p.slug)}" draggable="false" aria-label="Open ${esc(p.title)}">
                <div class="ph">
                  <span class="ph-num">${pad(i + 1)} / ${pad(n)}</span>
                  <span class="ph-title">${esc(p.title)}</span>
                  <span class="ph-note">add projects/${esc(p.slug)}/cover.jpg</span>
                </div>
                <img src="${esc(coverOf(p))}" alt="" draggable="false" />
                <span class="slide-open">Open project →</span>
              </a>
            </div>`).join("")}
        </div>
        <div class="slider-foot">
          <span class="hint">Scroll or drag →</span>
          <span class="count"><b>01</b> / ${pad(n)}</span>
        </div>
      </section>`;

    const slider = app.querySelector(".slider");
    const track = app.querySelector(".track");
    const slides = [...app.querySelectorAll(".slide")];
    const imgs = slides.map((s) => s.querySelector("img"));
    const ticks = app.querySelector(".ticks");
    const win = app.querySelector(".ticks .window");
    const countEl = app.querySelector(".count b");

    imgs.forEach((img) => img.addEventListener("error", () => img.remove()));

    let step = 1, max = 0, target = 0, current = 0, raf = 0, active = -1;
    let snapTimer = 0;

    function measure() {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      step = slides[0].offsetWidth + gap;
      max = step * (n - 1);
      target = clamp(savedIndex * step, 0, max);
      current = target;
      // tick window = about 3 tick spaces wide
      win.style.width = `${Math.max(16, ticks.offsetWidth / Math.max(n, 3))}px`;
    }

    const snap = () => { target = clamp(Math.round(target / step) * step, 0, max); };
    const goTo = (i) => { target = clamp(i, 0, n - 1) * step; };

    function frame() {
      current += (target - current) * (reduceMotion ? 1 : 0.1);
      if (Math.abs(target - current) < 0.1) current = target;
      track.style.transform = `translate3d(${-current}px,0,0)`;

      // parallax on images
      slides.forEach((s, i) => {
        const img = imgs[i];
        if (img && img.isConnected) img.style.transform = `translate3d(${((i * step - current) / step) * -40}px,0,0)`;
      });

      const idx = clamp(Math.round(current / step), 0, n - 1);
      if (idx !== active) {
        if (slides[active]) slides[active].classList.remove("is-active");
        slides[idx].classList.add("is-active");
        countEl.textContent = pad(idx + 1);
        active = idx;
        savedIndex = idx;
      }
      const prog = max ? current / max : 0;
      win.style.left = `${prog * (ticks.offsetWidth - win.offsetWidth)}px`;
      raf = requestAnimationFrame(frame);
    }

    // Mouse wheel / trackpad: one small flick = one project.
    // The first nudge in a gesture moves exactly one slide, then the rest of
    // that gesture (trackpad momentum, extra wheel clicks) is ignored until
    // scrolling goes quiet or a fresh, stronger flick starts.
    const WHEEL_THRESHOLD = 6;   // px of scroll needed to trigger (lower = more sensitive)
    const QUIET_MS = 140;        // silence that ends a gesture
    const MIN_LOCK_MS = 380;     // shortest time between two jumps
    let wheelAcc = 0, wheelLocked = false, lockAt = 0, lastMag = 0, quietTimer = 0;
    function onWheel(e) {
      e.preventDefault();
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const d = raw * (e.deltaMode === 1 ? 32 : 1);
      const mag = Math.abs(d);
      const now = performance.now();

      clearTimeout(quietTimer);
      quietTimer = setTimeout(() => { wheelLocked = false; wheelAcc = 0; lastMag = 0; }, QUIET_MS);

      // During momentum the deltas keep shrinking; a sudden bigger delta = new flick
      if (wheelLocked && now - lockAt > MIN_LOCK_MS && mag > lastMag * 1.6 && mag > 10) wheelLocked = false;
      lastMag = mag;
      if (wheelLocked) return;

      wheelAcc += d;
      if (Math.abs(wheelAcc) >= WHEEL_THRESHOLD) {
        goTo(active + Math.sign(wheelAcc));
        wheelAcc = 0;
        wheelLocked = true;
        lockAt = now;
      }
    }

    // Drag (mouse + touch)
    let dragging = false, startX = 0, startTarget = 0, moved = 0, lastX = 0, lastT = 0, vel = 0;
    function onDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true; moved = 0; vel = 0;
      startX = lastX = e.clientX; startTarget = target; lastT = performance.now();
      clearTimeout(snapTimer);
    }
    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) slider.classList.add("dragging");
      target = clamp(startTarget - dx * 1.2, -step * 0.15, max + step * 0.15);
      const now = performance.now();
      vel = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX; lastT = now;
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      slider.classList.remove("dragging");
      // A short swipe or quick flick moves one project, never more
      const dx = (e && e.clientX !== undefined ? e.clientX : lastX) - startX;
      const from = Math.round(startTarget / step);
      if (dx < -40 || vel < -0.3) goTo(from + 1);
      else if (dx > 40 || vel > 0.3) goTo(from - 1);
      else goTo(from);
    }
    // A drag should not count as a click on the card
    function onClick(e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; }
    }

    function onKey(e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goTo(active + 1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(active - 1); }
      else if (e.key === "Enter" && document.activeElement === document.body) { location.hash = `#/p/${encodeURIComponent(PROJECTS[active].slug)}`; }
    }

    // Clicking a slide that is not centered just centers it
    slides.forEach((s, i) => s.querySelector(".slide-frame").addEventListener("click", (e) => {
      if (i !== active && moved <= 6) { e.preventDefault(); goTo(i); }
    }));

    const onResize = () => { savedIndex = active < 0 ? savedIndex : active; measure(); };

    slider.addEventListener("wheel", onWheel, { passive: false });
    slider.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    slider.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    measure();
    raf = requestAnimationFrame(frame);

    cleanup = () => {
      cancelAnimationFrame(raf);
      clearTimeout(snapTimer);
      clearTimeout(quietTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }

  route();
})();
