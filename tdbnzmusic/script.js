const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const tracks = [
  {
    title: "Conservatory Rain",
    artist: "Relaxing Tunes NZ",
    url: "assets/audio/track1.mp3",
    cover: "assets/cover-placeholder.jpg",
    tags: ["ambient", "chill", "sleep"]
  },
  {
    title: "Night Drive",
    artist: "Relaxing Tunes NZ",
    url: "assets/audio/track2.mp3",
    cover: "assets/cover-placeholder.jpg",
    tags: ["chill"]
  },
  {
    title: "Chill Room",
    artist: "Relaxing Tunes NZ",
    url: "assets/audio/track3.mp3",
    cover: "assets/cover-placeholder.jpg",
    tags: ["sleep"]
  }
];

const yearEl = document.querySelectorAll("#year");
yearEl.forEach(el => el.textContent = new Date().getFullYear());

const shareBtn = $("#shareBtn");
if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, text: "Listen to Relaxing Tunes NZ", url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        shareBtn.textContent = "Link copied";
        setTimeout(() => (shareBtn.innerHTML = '<i class="bi bi-share"></i> Share'), 1500);
      }
    } catch {}
  });
}

const audio = $("#audio");
const trackTitle = $("#trackTitle");
const trackArtist = $("#trackArtist");
const cover = $("#cover");
const playPauseBtn = $("#playPauseBtn");
const prevBtn = $("#prevBtn");
const nextBtn = $("#nextBtn");
const progressBar = $("#progressBar");
const currentTimeEl = $("#currentTime");
const durationEl = $("#duration");
const volumeEl = $("#volume");
const queue = $("#queue");

let index = 0;

function renderQueue() {
  if (!queue) return;
  queue.innerHTML = "";
  tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "d-flex align-items-center justify-content-between py-2 px-1 rounded-3 " + (i === index ? "bg-body-tertiary" : "");
    li.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <img src="${t.cover}" alt="" width="40" height="40" class="rounded-2" style="object-fit:cover">
        <div>
          <div class="small fw-semibold">${t.title}</div>
          <div class="small text-body-secondary">${t.artist}</div>
        </div>
      </div>
      <button class="btn btn-outline-dark btn-sm play-btn" data-i="${i}" aria-label="Play ${t.title}"><i class="bi bi-play-fill"></i></button>
    `;
    queue.appendChild(li);
  });
  $$(".play-btn", queue).forEach(btn => btn.addEventListener("click", e => {
    const i = Number(e.currentTarget.getAttribute("data-i"));
    loadTrack(i);
    play();
  }));
}

function loadTrack(i) {
  index = (i + tracks.length) % tracks.length;
  const t = tracks[index];
  if (trackTitle) trackTitle.textContent = t.title;
  if (trackArtist) trackArtist.textContent = t.artist;
  if (cover) cover.src = t.cover;
  if (audio) {
    audio.src = t.url;
    audio.load();
  }
  renderQueue();
  if (playPauseBtn) playPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
}

function play() {
  audio.play().then(() => {
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
  }).catch(() => {});
}

function pause() {
  audio.pause();
  if (playPauseBtn) playPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
}

if (audio) {
  audio.addEventListener("timeupdate", () => {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + "%";
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("ended", () => { next(); });
}

function next() { loadTrack(index + 1); play(); }
function prev() { loadTrack(index - 1); play(); }

if (playPauseBtn) playPauseBtn.addEventListener("click", () => audio.paused ? play() : pause());
if (nextBtn) nextBtn.addEventListener("click", next);
if (prevBtn) prevBtn.addEventListener("click", prev);

if (volumeEl) {
  volumeEl.value = 0.9;
  if (audio) audio.volume = 0.9;
  volumeEl.addEventListener("input", () => { if (audio) audio.volume = Number(volumeEl.value); });
}

const progress = document.querySelector(".progress");
if (progress && audio) {
  progress.addEventListener("click", e => {
    const rect = progress.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = audio.duration * pct;
  });
}

function formatTime(s) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return m + ":" + String(r).padStart(2, "0");
}

loadTrack(0);
renderQueue();

const grid = $("#tracksGrid");
if (grid) {
  function renderGrid(items) {
    grid.innerHTML = "";
    items.forEach((t, i) => {
      const col = document.createElement("div");
      col.className = "col-12 col-sm-6 col-lg-4";
      col.innerHTML = `
        <div class="card rounded-4 h-100 shadow-sm">
          <img src="${t.cover}" alt="Cover art for ${t.title}" class="card-img-top rounded-top-4" style="object-fit:cover; aspect-ratio:1 / 1">
          <div class="card-body d-flex flex-column">
            <h3 class="h6 mb-1">${t.title}</h3>
            <p class="small text-body-secondary mb-3">${t.artist}</p>
            <div class="mt-auto d-flex flex-wrap gap-2">
              <button class="btn btn-dark btn-sm play-from-grid" data-i="${i}"><i class="bi bi-play-fill"></i> Play</button>
              <span class="badge text-bg-light border">${t.tags.join(", ")}</span>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(col);
    });
    $$(".play-from-grid").forEach(btn => btn.addEventListener("click", e => {
      const i = Number(e.currentTarget.getAttribute("data-i"));
      window.location.href = "index.html#player";
      localStorage.setItem("playIndex", String(i));
    }));
  }

  renderGrid(tracks);

  $$(".filter-btn").forEach(btn => btn.addEventListener("click", () => {
    const tag = btn.getAttribute("data-tag");
    const list = tag === "all" ? tracks : tracks.filter(t => t.tags.includes(tag));
    renderGrid(list);
  }));

  const search = $("#search");
  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      const list = tracks.filter(t => t.title.toLowerCase().includes(q) || t.tags.join(" ").toLowerCase().includes(q));
      renderGrid(list);
    });
  }
}

const saved = localStorage.getItem("playIndex");
if (saved && audio) {
  const i = Number(saved);
  localStorage.removeItem("playIndex");
  loadTrack(i);
  play();
}
