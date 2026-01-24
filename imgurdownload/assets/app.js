// Thomas Imgur Album Downloader, 2026
// Mobile-friendly, flashy UI. Static, no frameworks. Uses JSZip in /vendor.

const $ = (sel) => document.querySelector(sel);

const els = {
  albumUrl: $("#albumUrl"),
  loadBtn: $("#loadBtn"),
  loadError: $("#loadError"),
  albumMeta: $("#albumMeta"),
  albumTitle: $("#albumTitle"),
  albumCount: $("#albumCount"),
  grid: $("#grid"),
  selectAllBtn: $("#selectAllBtn"),
  selectNoneBtn: $("#selectNoneBtn"),
  downloadBtn: $("#downloadBtn"),
  progressWrap: $("#progressWrap"),
  progressBar: $("#progressBar"),
  progressText: $("#progressText"),
  progressCount: $("#progressCount"),
  zipLink: $("#zipLink"),
  sourceLink: $("#sourceLink"),
  toast: $("#toast"),
  helpToggle: $("#helpToggle"),
  helpBody: $("#helpBody"),
  dockLoad: $("#dockLoad"),
  dockDownload: $("#dockDownload"),
};

const state = {
  albumId: null,
  albumTitle: "Album",
  items: [], // { hash, ext, url, title, type, thumbUrl }
  selected: new Set(),
  loading: false,
};

function setHidden(el, hidden) {
  el.classList.toggle("hidden", !!hidden);
}

function toast(msg, ms = 2200) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  setHidden(els.toast, false);
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => setHidden(els.toast, true), ms);
}

function showError(msg) {
  els.loadError.textContent = msg;
  setHidden(els.loadError, false);
  toast(msg, 2600);
}

function clearError() {
  els.loadError.textContent = "";
  setHidden(els.loadError, true);
}

function normalizeAlbumId(input) {
  const raw = (input || "").trim();
  if (!raw) return null;

  if (/^[a-zA-Z0-9]+$/.test(raw)) return raw;

  const m = raw.match(/imgur\.com\/(?:a|gallery)\/([a-zA-Z0-9]+)/i);
  if (m && m[1]) return m[1];

  return null;
}

function buildZipUrl(albumId) {
  return `https://imgur.com/a/${albumId}/zip`;
}

function sanitizeFilename(name) {
  const s = (name || "").trim();
  if (!s) return "";
  return s
    .replace(/[\/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

// Unofficial Imgur endpoint used widely by extensions and userscripts.
// If this ever breaks, /zip fallback still works.
async function fetchAlbumImages(albumId) {
  const url = `https://imgur.com/ajaxalbums/getimages/${albumId}/hit.json?all=true`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "omit",
    headers: { "Accept": "application/json, text/plain, */*" },
  });

  if (!res.ok) throw new Error(`Imgur request failed (${res.status})`);

  const data = await res.json();
  const images = (data && data.data && data.data.images) ? data.data.images : [];
  const albumTitle = (data && data.data && data.data.title) ? data.data.title : "Album";

  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("No images found, try the /zip fallback link below.");
  }

  const items = images.map((img) => {
    const hash = img.hash || img.id || img.image_hash;
    const ext = img.ext || (img.animated ? ".mp4" : ".jpg");
    const title = img.title || img.description || hash || "image";
    const isVideo = (ext === ".mp4" || ext === ".webm");
    const directUrl = img.url || `https://i.imgur.com/${hash}${ext}`;
    const thumbUrl = img.thumbnail_url || `https://i.imgur.com/${hash}m${ext === ".mp4" ? ".jpg" : ext}`;
    return { hash, ext, url: directUrl, title, type: isVideo ? "video" : "image", thumbUrl };
  });

  return { albumTitle, items };
}

function renderSkeleton(count = 10) {
  els.grid.innerHTML = "";
  setHidden(els.grid, false);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "skeleton";
    frag.appendChild(s);
  }
  els.grid.appendChild(frag);
}

function renderGrid() {
  els.grid.innerHTML = "";
  setHidden(els.grid, false);

  const frag = document.createDocumentFragment();

  state.items.forEach((it, idx) => {
    const tile = document.createElement("div");
    tile.className = "tile";

    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = it.title || "Media";
    img.loading = "lazy";
    img.src = it.thumbUrl;

    const body = document.createElement("div");
    body.className = "tile-body";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "cb";
    cb.checked = state.selected.has(it.hash);
    cb.addEventListener("change", () => {
      if (cb.checked) state.selected.add(it.hash);
      else state.selected.delete(it.hash);
      updateDownloadButton();
    });

    const meta = document.createElement("div");
    meta.style.minWidth = "0";

    const title = document.createElement("div");
    title.className = "tile-title";
    title.textContent = sanitizeFilename(it.title) || `Item ${idx + 1}`;

    const sub = document.createElement("div");
    sub.className = "tile-sub";
    sub.textContent = `${it.type.toUpperCase()} • ${it.hash}${it.ext}`;

    meta.appendChild(title);
    meta.appendChild(sub);

    body.appendChild(cb);
    body.appendChild(meta);

    tile.appendChild(img);
    tile.appendChild(body);

    tile.addEventListener("click", (e) => {
      if (e.target === cb) return;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event("change"));
    });

    // long press on mobile opens direct file
    let pressT = null;
    tile.addEventListener("pointerdown", () => {
      pressT = window.setTimeout(() => {
        window.open(it.url, "_blank", "noopener");
        toast("Opened file in a new tab");
      }, 600);
    });
    tile.addEventListener("pointerup", () => window.clearTimeout(pressT));
    tile.addEventListener("pointerleave", () => window.clearTimeout(pressT));

    frag.appendChild(tile);
  });

  els.grid.appendChild(frag);
}

function updateDownloadButton() {
  const disabled = state.selected.size === 0 || state.loading;
  els.downloadBtn.disabled = disabled;
  if (els.dockDownload) els.dockDownload.disabled = disabled;
  els.albumCount.textContent = `${state.items.length} items, ${state.selected.size} selected`;
}

function setProgress(visible, pct = 0, text = "", count = "") {
  setHidden(els.progressWrap, !visible);
  els.progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (text) els.progressText.textContent = text;
  if (count) els.progressCount.textContent = count;
}

async function poolMap(items, concurrency, mapper, onProgress) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
      completed++;
      if (onProgress) onProgress(completed, items.length);
    }
  }

  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(() => worker());
  await Promise.all(workers);
  return results;
}

async function downloadZip() {
  if (state.loading) return;

  const selectedItems = state.items.filter((it) => state.selected.has(it.hash));
  if (selectedItems.length === 0) {
    toast("Select at least one item");
    return;
  }

  state.loading = true;
  updateDownloadButton();

  const zip = new JSZip();
  const safeAlbum = sanitizeFilename(state.albumTitle) || "imgur-album";
  const folder = zip.folder(safeAlbum);

  setProgress(true, 0, "Downloading media…", `0 / ${selectedItems.length}`);

  try {
    const startedAt = Date.now();

    await poolMap(
      selectedItems,
      4,
      async (it, idx) => {
        const res = await fetch(it.url, { credentials: "omit" });
        if (!res.ok) throw new Error(`Failed to fetch ${it.hash}${it.ext} (${res.status})`);
        const blob = await res.blob();

        const base = sanitizeFilename(it.title) || `item_${String(idx + 1).padStart(3, "0")}_${it.hash}`;
        const filename = `${base}${it.ext}`;

        folder.file(filename, blob, { binary: true });
        return true;
      },
      (done, total) => {
        const pct = Math.round((done / total) * 70);
        setProgress(true, pct, "Downloading media…", `${done} / ${total}`);
      }
    );

    setProgress(true, 75, "Creating ZIP…", `${selectedItems.length} files`);

    const zipBlob = await zip.generateAsync(
      { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
      (meta) => {
        const pct = 75 + Math.round(meta.percent * 0.25);
        setProgress(true, pct, "Creating ZIP…", `${selectedItems.length} files`);
      }
    );

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    setProgress(true, 100, `Done, saved ZIP (${elapsed}s)`, `${selectedItems.length} files`);

    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = `${safeAlbum}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    toast("ZIP download started");
    setTimeout(() => setProgress(false), 900);
  } catch (e) {
    showError(e && e.message ? e.message : "Download failed.");
    setProgress(false);
  } finally {
    state.loading = false;
    updateDownloadButton();
  }
}

async function loadAlbum() {
  clearError();

  const albumId = normalizeAlbumId(els.albumUrl.value);
  if (!albumId) {
    showError("Paste a valid Imgur album link, or just the album ID.");
    return;
  }

  state.loading = true;
  updateDownloadButton();

  state.albumId = albumId;
  els.zipLink.href = buildZipUrl(albumId);
  els.zipLink.textContent = buildZipUrl(albumId);

  setProgress(true, 5, "Loading album…", "");
  setHidden(els.albumMeta, true);
  renderSkeleton(12);

  try {
    const { albumTitle, items } = await fetchAlbumImages(albumId);
    state.albumTitle = albumTitle;
    state.items = items;
    state.selected = new Set(items.map((x) => x.hash));

    els.albumTitle.textContent = state.albumTitle || "Album";
    setHidden(els.albumMeta, false);

    renderGrid();
    updateDownloadButton();

    setProgress(false);
    toast("Album loaded");
  } catch (e) {
    setProgress(false);
    setHidden(els.grid, true);
    showError(e && e.message ? e.message : "Failed to load album.");
  } finally {
    state.loading = false;
    updateDownloadButton();
  }
}

function wireUp() {
  els.loadBtn.addEventListener("click", loadAlbum);
  els.albumUrl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadAlbum();
  });

  els.selectAllBtn.addEventListener("click", () => {
    state.items.forEach((it) => state.selected.add(it.hash));
    renderGrid();
    updateDownloadButton();
    toast("Selected all");
  });

  els.selectNoneBtn.addEventListener("click", () => {
    state.selected.clear();
    renderGrid();
    updateDownloadButton();
    toast("Selected none");
  });

  els.downloadBtn.addEventListener("click", downloadZip);

  if (els.dockLoad) els.dockLoad.addEventListener("click", loadAlbum);
  if (els.dockDownload) els.dockDownload.addEventListener("click", downloadZip);

  if (els.helpToggle && els.helpBody) {
    els.helpToggle.addEventListener("click", () => {
      const open = els.helpToggle.getAttribute("aria-expanded") === "true";
      els.helpToggle.setAttribute("aria-expanded", open ? "false" : "true");
      setHidden(els.helpBody, open);
    });
  }

  // Set your repo later
  els.sourceLink.href = "#";
}

wireUp();
