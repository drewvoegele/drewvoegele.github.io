// The thread (from concept 03): one path through every [data-t] anchor on the page, drawn as you scroll.
// Straight down the spine; where it has to move sideways (out of the headline's period) it turns
// with rounded, right-angled corners. Reduced motion: drawn in full, every node lit.
(() => {
  const root = document.querySelector(".page");
  const svg = root && root.querySelector("svg.thread");
  if (!svg) return;
  const [track, glowline, line] = svg.querySelectorAll("path");
  const tip = svg.querySelector(".tip");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  let L = 0, ys = [], step = 4, minLen = 0, anchors = [], drawn = 0, target = 0, raf = 0, ready = false;

  function build() {
    const r = root.getBoundingClientRect();
    const els = [...root.querySelectorAll("[data-t]")].filter((el) => el.offsetParent !== null);
    anchors = els.map((el) => {
      const b = el.getBoundingClientRect();
      return { el, row: el.closest(".row"), kind: el.dataset.t, x: Math.round(b.left - r.left + b.width / 2) + 0.5, y: b.top - r.top + b.height / 2 };
    });
    if (anchors.length < 2) return;
    const W = root.clientWidth, H = root.offsetHeight;
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    let d = `M${anchors[0].x} ${anchors[0].y}`;
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1], b = anchors[i];
      if (Math.abs(a.x - b.x) < 3) { d += ` L${a.x} ${b.y}`; b.x = a.x; continue; }
      const mid = (a.y + b.y) / 2, s = Math.sign(b.x - a.x);
      const rad = Math.min(22, Math.abs(b.x - a.x) / 2, (b.y - a.y) / 2);
      d += ` L${a.x} ${mid - rad} Q${a.x} ${mid} ${a.x + s * rad} ${mid} L${b.x - s * rad} ${mid} Q${b.x} ${mid} ${b.x} ${mid + rad} L${b.x} ${b.y}`;
    }
    for (const p of [track, glowline, line]) p.setAttribute("d", d);
    L = line.getTotalLength();
    ys = []; for (let s = 0; s <= L; s += step) ys.push(line.getPointAtLength(s).y);
    ys.push(line.getPointAtLength(L).y);
    for (const p of [glowline, line]) p.style.strokeDasharray = `${L} ${L + 10}`;
    const bend = anchors.find((a) => a.kind === "bend");
    minLen = bend ? lenAtY(bend.y) : 0;
    ready = true;
  }

  // Longest drawn length whose point is still above y (the path only ever moves down or sideways).
  function lenAtY(y) {
    let lo = 0, hi = ys.length - 1;
    if (y >= ys[hi]) return L;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ys[m] <= y) lo = m; else hi = m - 1; }
    return Math.min(L, lo * step);
  }

  function aim() {
    if (!ready) return;
    if (reduce.matches) { target = drawn = L; return; }
    const vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    const f = max > 0 ? Math.min(1, scrollY / max) : 1;
    const top = root.getBoundingClientRect().top + scrollY;
    const tipY = scrollY + vh * (0.62 + 0.38 * f) - top;
    target = f > 0.995 ? L : Math.max(minLen, lenAtY(tipY));
  }

  function paint() {
    const off = L - drawn;
    glowline.style.strokeDashoffset = off; line.style.strokeDashoffset = off;
    const p = line.getPointAtLength(Math.max(0, drawn));
    tip.setAttribute("cx", p.x); tip.setAttribute("cy", p.y);
    root.classList.toggle("thread-done", drawn >= L - 1 || reduce.matches);
    for (const a of anchors) {
      const on = a.y <= p.y + 1;
      a.el.classList.toggle("lit", on);
      if (a.row) a.row.classList.toggle("lit", on);
    }
  }

  function loop() {
    const diff = target - drawn;
    drawn = Math.abs(diff) < 0.5 ? target : drawn + diff * 0.14;
    paint();
    raf = drawn === target ? 0 : requestAnimationFrame(loop);
  }
  const kick = () => { aim(); if (!raf) raf = requestAnimationFrame(loop); };

  function rebuild(first) {
    const frac = L ? drawn / L : 0;
    build(); aim();
    if (reduce.matches) { drawn = L; paint(); return; }
    if (first) { drawn = 0; kick(); return; }
    drawn = Math.min(L, frac * L); kick();
  }

  let t = 0;
  const soon = () => { clearTimeout(t); t = setTimeout(() => rebuild(false), 120); };
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", soon);
  addEventListener("load", soon);
  if ("ResizeObserver" in window) new ResizeObserver(soon).observe(root);
  reduce.addEventListener?.("change", () => rebuild(false));
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => rebuild(true));
})();
