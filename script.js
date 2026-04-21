const SCREENS = {
  welcome: "screen-welcome",
  intro: "screen-intro",
  home: "screen-home",
};

const TYPING_TEXT = "Hi I am Rajan Kumar";
const WELCOME_DURATION_MS = 2000; // required: 2s
const TYPING_SPEED_MS = 75;

const $ = (id) => document.getElementById(id);

const audio = {
  intro: () => $("audioIntro"),
  click: () => $("audioClick"),
  pop: () => $("audioPop"),
};

let userAudioUnlocked = false;
let typingTimer = null;
let userHasInteracted = false;

let modalGallery = null;

const WORK_GALLERIES = {
  corel: Array.from({ length: 11 }, (_, i) => `images/CorelDRAW/corel-${i + 1}.jpg.jpg`),
  photoshop: Array.from({ length: 6 }, (_, i) => `images/Photoshop/photoshop-${i + 1}.jpg.jpg`),
  illustrator: Array.from({ length: 12 }, (_, i) => `images/Illustrator/illustrator-${i + 1}.jpg.jpg`),
  // Client work filenames contain spaces/parentheses; keep as-is.
  client: [
    "images/Local-Client-Work/client (1).png",
    ...Array.from({ length: 34 }, (_, i) => `images/Local-Client-Work/client (${i + 2}).jpg`),
  ],
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function speakIntroText() {
  if (!userHasInteracted) return;
  if (prefersReducedMotion()) return;
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(TYPING_TEXT);
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore
  }
}

function scrollToSection(id) {
  const el = $(id);
  if (!el) return;
  // Next paint ensures display/class toggles are applied before scroll.
  requestAnimationFrame(() => {
    // Ensure we never remain stuck mid-page after screen swap.
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  });
}

function setScreen(screenKey) {
  const nextId = SCREENS[screenKey];
  Object.values(SCREENS).forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("screen--active", id === nextId);
  });
  scrollToSection(nextId);
}

function safePlay(el) {
  if (!el) return Promise.resolve(false);
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.then === "function") {
      return p.then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

async function unlockAudio() {
  if (userAudioUnlocked) return;
  userAudioUnlocked = true;

  // “Warm” sounds so later clicks are instant.
  await safePlay(audio.click());
  if (audio.click()) audio.click().pause();
  await safePlay(audio.pop());
  if (audio.pop()) audio.pop().pause();
}

function playSound(kind) {
  const el = kind === "pop" ? audio.pop() : audio.click();
  safePlay(el);
}

function clearTyping() {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
}

function startTyping() {
  clearTyping();
  const target = $("typingText");
  if (!target) return;

  target.textContent = "";
  let idx = 0;

  const tick = () => {
    target.textContent += TYPING_TEXT.charAt(idx);
    idx += 1;
    if (idx < TYPING_TEXT.length) {
      typingTimer = setTimeout(tick, TYPING_SPEED_MS);
    }
  };

  tick();
}

async function startIntroAudio() {
  // required: auto-play sounds/intro.mp3
  // Browsers may block autoplay; if blocked, we’ll retry after the first user gesture.
  const ok = await safePlay(audio.intro());
  return ok;
}

function goToIntro({ replayAudio = true } = {}) {
  setScreen("intro");
  startTyping();
  speakIntroText();
  if (replayAudio) startIntroAudio();
}

function goToHome({ focus = "work" } = {}) {
  setScreen("home");
  if (focus !== "work") return;

  // After screen swap paints, scroll to the work area (software folders).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const work = document.getElementById("work");
      if (!work) return;
      work.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    });
  });
}

function bindExternalCards() {
  // Any card with data-url should open a new tab.
  document.querySelectorAll(".work-card[data-url]").forEach((card) => {
    card.addEventListener("click", () => {
      const url = card.getAttribute("data-url");
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  });
}

function openModal(src) {
  const modal = $("modal");
  const img = $("modalImg");
  const count = $("modalCount");
  const prev = $("modalPrev");
  const next = $("modalNext");
  if (!modal || !img) return;
  img.src = src;
  if (count) count.textContent = "1 / 1";
  if (prev) prev.disabled = true;
  if (next) next.disabled = true;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = $("modal");
  const img = $("modalImg");
  if (!modal || !img) return;
  modal.classList.add("hidden");
  img.removeAttribute("src");
  modalGallery = null;
  document.body.style.overflow = "";
}

function renderModalGallery() {
  const img = $("modalImg");
  const count = $("modalCount");
  const prev = $("modalPrev");
  const next = $("modalNext");
  if (!img || !modalGallery) return;

  const total = modalGallery.items.length;
  const idx = modalGallery.index;
  img.src = modalGallery.items[idx];
  if (count) count.textContent = `${idx + 1} / ${total}`;
  if (prev) prev.disabled = total <= 1;
  if (next) next.disabled = total <= 1;
}

function openGallery(key) {
  const items = WORK_GALLERIES[key] || [];
  if (!items.length) return;
  modalGallery = { items, index: 0 };
  const modal = $("modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  renderModalGallery();
}

function stepGallery(dir) {
  if (!modalGallery || !modalGallery.items?.length) return;
  const total = modalGallery.items.length;
  modalGallery.index = (modalGallery.index + dir + total) % total;
  renderModalGallery();
}

function bindSoundDelegation() {
  // Buttons: click.wav (blue glow)
  // Cards: pop-click.wav (purple glow)
  // Icons: click.wav by default
  document.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-sound]");
    if (!target) return;

    await unlockAudio();
    const kind = target.getAttribute("data-sound") || "click";
    playSound(kind === "pop" ? "pop" : "click");
  });
}

function bindWelcomeFlow() {
  setScreen("welcome");

  // If user clicks during welcome, unlock audio early and try intro audio again.
  document.addEventListener(
    "pointerdown",
    async () => {
      userHasInteracted = true;
      await unlockAudio();
      // attempt intro audio once unlocked (even if still on welcome)
      startIntroAudio();
    },
    { once: true }
  );

  setTimeout(() => {
    goToIntro({ replayAudio: true });
  }, WELCOME_DURATION_MS);
}

function bindIntroControls() {
  const btnViewWork = $("btn-view-work");
  const btnSkip = $("btn-skip");

  btnViewWork?.addEventListener("click", () => goToHome({ focus: "work" }));
  btnSkip?.addEventListener("click", () => goToHome({ focus: "work" }));
}

function bindHomeControls() {
  const btnReplay = $("btn-replay");
  const btnAbout = $("btn-about");
  btnReplay?.addEventListener("click", () => {
    // restart audio from beginning
    if (audio.intro()) audio.intro().currentTime = 0;
    goToIntro({ replayAudio: true });
  });

  btnAbout?.addEventListener("click", () => {
    const about = document.getElementById("about");
    if (!about) return;
    about.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  });

  // Allow real social links; only block dummy '#' if any remain.
  document.querySelectorAll("a[href='#']").forEach((a) => {
    a.addEventListener("click", (e) => e.preventDefault());
  });

  // Gallery: click -> full-screen popup with click.wav
  const grid = $("galleryGrid");
  grid?.addEventListener("click", (e) => {
    const tile = e.target.closest(".gallery-tile");
    if (!tile) return;
    const workKey = tile.getAttribute("data-work");
    if (workKey) {
      openGallery(workKey);
      return;
    }
    const full = tile.getAttribute("data-full");
    if (!full) return;
    openModal(full);
  });
}

function bindModalControls() {
  const modal = $("modal");
  const closeBtn = $("modalClose");
  const prev = $("modalPrev");
  const next = $("modalNext");

  closeBtn?.addEventListener("click", () => closeModal());
  prev?.addEventListener("click", () => stepGallery(-1));
  next?.addEventListener("click", () => stepGallery(1));

  modal?.addEventListener("click", (e) => {
    // click outside image closes
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
    if (!$("modal") || $("modal")?.classList.contains("hidden")) return;
    if (e.key === "ArrowLeft") stepGallery(-1);
    if (e.key === "ArrowRight") stepGallery(1);
  });
}

function bindWorkGalleries() {
  document.querySelectorAll(".work-card[data-work]").forEach((card) => {
    // If card is external url card, ignore.
    if (card.hasAttribute("data-url")) return;
    card.addEventListener("click", () => {
      const key = card.getAttribute("data-work");
      if (!key) return;
      openGallery(key);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Fail-safe: never get stuck on Welcome.
  setTimeout(() => {
    try {
      const isWelcomeActive = $(SCREENS.welcome)?.classList.contains("screen--active");
      if (isWelcomeActive) goToIntro({ replayAudio: true });
    } catch {
      // ignore
    }
  }, WELCOME_DURATION_MS + 50);

  bindSoundDelegation();
  bindWelcomeFlow();
  bindIntroControls();
  bindHomeControls();
  bindExternalCards();
  bindWorkGalleries();
  bindModalControls();
});