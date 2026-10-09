// Image viewer for the chapter pages' primary images (a.zoom, written by build.mjs).
// Click an image to expand it; ← → move between the page's images; Esc, the background or Close exits.
// Images with call-outs get a toggle: drawn call-outs hide, and baked-in ones swap to the clean
// screenshot (data-clean). The choice carries across images while the viewer is open.
(() => {
  const links = [...document.querySelectorAll("a.zoom")];
  if (!links.length) return;
  const dlg = document.createElement("dialog");
  dlg.className = "lb";
  dlg.setAttribute("aria-label", "Expanded image");
  dlg.innerHTML = `
    <div class="lb-bar"><span class="lb-count"></span><span class="lb-grow"></span>
      <button type="button" class="lb-btn lb-toggle" aria-pressed="true">Call-outs on</button>
      <button type="button" class="lb-btn lb-close">Close</button></div>
    <figure class="lb-fig"><div class="lb-stage"></div><figcaption class="lb-cap"></figcaption></figure>
    <button type="button" class="lb-nav lb-prev" aria-label="Previous image"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg></button>
    <button type="button" class="lb-nav lb-next" aria-label="Next image"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button>`;
  document.body.appendChild(dlg);
  const $ = (s) => dlg.querySelector(s);
  const stage = $(".lb-stage"), cap = $(".lb-cap"), count = $(".lb-count"), toggle = $(".lb-toggle");
  let k = 0, callouts = true, ar = 16 / 9;

  function fit() {
    const w = Math.min(innerWidth * 0.92, (innerHeight - 170) * ar);
    stage.style.setProperty("--w", `${Math.max(w, 200)}px`);
  }
  function paintToggle() {
    const a = links[k];
    toggle.hidden = !a.hasAttribute("data-callouts");
    if (toggle.hidden && document.activeElement === toggle) $(".lb-close").focus();
    toggle.setAttribute("aria-pressed", String(callouts));
    toggle.textContent = callouts ? "Call-outs on" : "Call-outs off";
    stage.classList.toggle("off", !callouts);
    const im = stage.querySelector("img");
    if (im && a.dataset.clean) im.src = callouts ? a.getAttribute("href") : a.dataset.clean;
  }
  function show(i) {
    k = (i + links.length) % links.length;
    const a = links[k];
    const visual = (a.querySelector(".ann") || a.querySelector("img")).cloneNode(true);
    visual.querySelectorAll("img").forEach((im) => { im.loading = "eager"; im.removeAttribute("srcset"); });
    const im = visual.tagName === "IMG" ? visual : visual.querySelector("img");
    ar = (+im.getAttribute("width") || 16) / (+im.getAttribute("height") || 9);
    stage.replaceChildren(visual);
    cap.textContent = a.dataset.cap || "";
    count.textContent = `${k + 1} / ${links.length}`;
    dlg.querySelectorAll(".lb-nav").forEach((b) => (b.hidden = links.length < 2));
    fit(); paintToggle();
  }
  function open(i) {
    show(i);
    document.documentElement.classList.add("lb-open");
    dlg.showModal();
  }
  links.forEach((a, i) => a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let modified clicks open the file
    e.preventDefault(); open(i);
  }));
  toggle.addEventListener("click", () => { callouts = !callouts; paintToggle(); });
  $(".lb-close").addEventListener("click", () => dlg.close());
  $(".lb-prev").addEventListener("click", () => show(k - 1));
  $(".lb-next").addEventListener("click", () => show(k + 1));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  // On the document, not the dialog: when a hidden toggle drops focus, keys still have to work.
  document.addEventListener("keydown", (e) => {
    if (!dlg.open) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); show(k - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); show(k + 1); }
    else if (e.key === "c" || e.key === "C") toggle.hidden || toggle.click();
  });
  dlg.addEventListener("close", () => { document.documentElement.classList.remove("lb-open"); links[k].focus({ preventScroll: true }); });
  addEventListener("resize", () => dlg.open && fit());
})();

// Looping clips (div.vid > video): silent autoplay while on screen, with a pause button (WCAG 2.2.2).
// Under prefers-reduced-motion they stay on the poster until someone presses play.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  for (const box of document.querySelectorAll(".vid")) {
    const v = box.querySelector("video"), b = box.querySelector(".vid-toggle");
    v.removeAttribute("controls"); v.muted = true; b.hidden = false;
    let wanted = !reduce; // what the viewer last asked for
    const paint = () => { const on = !v.paused; box.classList.toggle("playing", on); b.setAttribute("aria-label", on ? "Pause video" : "Play video"); };
    v.addEventListener("play", paint); v.addEventListener("pause", paint);
    b.addEventListener("click", () => { wanted = v.paused; wanted ? v.play().catch(() => {}) : v.pause(); });
    new IntersectionObserver(([e]) => { if (e.isIntersecting && wanted) v.play().catch(() => {}); else if (!e.isIntersecting) v.pause(); }, { threshold: 0.25 }).observe(v);
    paint();
  }
})();
