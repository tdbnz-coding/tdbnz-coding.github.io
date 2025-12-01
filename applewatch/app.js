// app.js

// faces.json shape:
//
// {
//   "galleries": [
//     {
//       "id": "festive-season",
//       "name": "Festive Season",
//       "description": "Festive Watch faces",
//       "coverImage": "",
//       "tags": ["christmas", "festive"]
//     }
//   ],
//   "faces": [
//     {
//       "id": "Cute Penguin",
//       "galleryId": "festive-season",
//       "title": "Cute Penguin",
//       "description": "Bring holiday happiness...",
//       "imageUrl": "https://...jpg",
//       "downloadUrl": "https://...jpg",
//       "tags": [...],
//       "dateAdded": "2025-12-01"
//     }
//   ]
// }

let galleries = [];
let faces = [];
let galleryById = {};

const NEW_FACE_DAYS = 10;


function applyStoredTheme() {
  const root = document.documentElement;
  const stored = window.localStorage ? localStorage.getItem("appleFacesTheme") : null;
  if (stored === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  updateThemeToggleLabel();
}

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";

  if (next === "light") {
    root.setAttribute("data-theme", "light");
    if (window.localStorage) {
      localStorage.setItem("appleFacesTheme", "light");
    }
  } else {
    root.removeAttribute("data-theme");
    if (window.localStorage) {
      localStorage.setItem("appleFacesTheme", "dark");
    }
  }

  updateThemeToggleLabel();
}

function updateThemeToggleLabel() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const label = btn.querySelector(".theme-toggle-label");
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  if (label) {
    label.textContent = isLight ? "Light" : "Dark";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyStoredTheme();

  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }

  initFacesPage();
});

async function initFacesPage() {
  try {
    const data = await fetchJson("faces.json");
    galleries = Array.isArray(data.galleries) ? data.galleries : [];
    faces = Array.isArray(data.faces) ? data.faces : [];

    galleryById = {};
    galleries.forEach(g => {
      galleryById[g.id] = g;
    });

    renderGalleries();
    renderNewFacesAll();
    setupGalleryClickFilter();
    setupSearch();
    setupModal();
  } catch (err) {
    console.error("Failed to load faces.json", err);
    showLoadError();
  }
}

async function fetchJson(url) {
  const res = await fetch(url + "?v=" + Date.now()); // cache bust
  if (!res.ok) {
    throw new Error("HTTP error " + res.status);
  }
  return res.json();
}

function showLoadError() {
  const galleriesGrid = document.getElementById("galleriesGrid");
  const newFacesGrid = document.getElementById("newFacesGrid");

  if (galleriesGrid) {
    galleriesGrid.innerHTML = "<p>Could not load galleries right now.</p>";
  }
  if (newFacesGrid) {
    newFacesGrid.innerHTML = "<p>Could not load faces right now.</p>";
  }
}

// ------------- Helpers -------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isNewFace(face) {
  if (!face.dateAdded) return false;
  const added = new Date(face.dateAdded);
  if (isNaN(added.getTime())) return false;
  const now = new Date();
  const diffMs = now.getTime() - added.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  // allow a tiny bit of clock skew
  return diffDays <= NEW_FACE_DAYS && diffDays >= -1;
}

function getFirstFaceImageForGallery(galleryId) {
  const found = faces.find(f => f.galleryId === galleryId && f.imageUrl);
  return found ? found.imageUrl : "";
}

// ------------- Galleries -------------

function renderGalleries() {
  const grid = document.getElementById("galleriesGrid");
  const subtitle = document.getElementById("galleriesSubtitle");
  if (!grid) return;

  grid.innerHTML = "";

  if (!galleries.length) {
    grid.innerHTML = "<p>No galleries yet.</p>";
    if (subtitle) {
      subtitle.textContent = "No galleries available yet.";
    }
    return;
  }

  galleries.forEach(gallery => {
    const card = document.createElement("div");
    card.className = "gallery-card";
    card.setAttribute("data-gallery-id", gallery.id);

    const name = gallery.name || "Gallery";
    const desc = gallery.description || "";
    const tags = Array.isArray(gallery.tags) ? gallery.tags.join(", ") : "";
    const cover =
      gallery.coverImage && gallery.coverImage.trim() !== ""
        ? gallery.coverImage
        : getFirstFaceImageForGallery(gallery.id);

    // Only show an image block if we actually have an image
    const imageBlock = cover
      ? `
      <div class="gallery-card-image-wrap">
        <img src="${cover}" alt="${escapeHtml(name)}">
      </div>`
      : "";

    card.innerHTML = `
      ${imageBlock}
      <div class="gallery-card-body">
        <h3>${escapeHtml(name)}</h3>
        ${desc ? `<p>${escapeHtml(desc)}</p>` : ""}
        ${tags ? `<p class="gallery-tags">${escapeHtml(tags)}</p>` : ""}
      </div>
    `;

    grid.appendChild(card);
  });

  if (subtitle) {
    subtitle.textContent = "Pick a gallery to see faces from that collection.";
  }
}

function setupGalleryClickFilter() {
  const grid = document.getElementById("galleriesGrid");
  const newFacesSubtitle = document.getElementById("newFacesSubtitle");
  if (!grid) return;

  grid.addEventListener("click", event => {
    const card = event.target.closest("[data-gallery-id]");
    if (!card) return;

    const galleryId = card.getAttribute("data-gallery-id");
    if (!galleryId) return;

    renderFacesForGallery(galleryId);

    const gallery = galleryById[galleryId];
    if (newFacesSubtitle) {
      if (gallery) {
        newFacesSubtitle.textContent =
          "Faces in gallery: " + (gallery.name || galleryId);
      } else {
        newFacesSubtitle.textContent = "Faces in selected gallery.";
      }
    }
  });
}

function renderFacesForGallery(galleryId) {
  const grid = document.getElementById("newFacesGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const filtered = faces.filter(f => f.galleryId === galleryId);

  if (!filtered.length) {
    grid.innerHTML = "<p>No faces in this gallery yet.</p>";
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    const da = a.dateAdded ? new Date(a.dateAdded) : 0;
    const db = b.dateAdded ? new Date(b.dateAdded) : 0;
    return db - da;
  });

  sorted.forEach(face => {
    grid.appendChild(createFaceCard(face));
  });
}

// ------------- New faces (last 10 days only) -------------

function renderNewFacesAll() {
  const grid = document.getElementById("newFacesGrid");
  const subtitle = document.getElementById("newFacesSubtitle");
  if (!grid) return;

  grid.innerHTML = "";

  if (!faces.length) {
    grid.innerHTML = "<p>No faces yet. Check back soon.</p>";
    if (subtitle) {
      subtitle.textContent = "No faces available yet.";
    }
    return;
  }

  const newOnes = faces.filter(isNewFace);

  if (!newOnes.length) {
    grid.innerHTML =
      "<p>No new faces in the last 10 days. Check the galleries above for all faces.</p>";
    if (subtitle) {
      subtitle.textContent =
        "New faces added in the last 10 days. None right now.";
    }
    return;
  }

  const sorted = [...newOnes].sort((a, b) => {
    const da = a.dateAdded ? new Date(a.dateAdded) : 0;
    const db = b.dateAdded ? new Date(b.dateAdded) : 0;
    return db - da;
  });

  const newest = sorted.slice(0, 12);

  newest.forEach(face => {
    grid.appendChild(createFaceCard(face));
  });

  if (subtitle) {
    subtitle.textContent =
      "New faces from the last 10 days. Showing " + newest.length + ".";
  }
}


function createFaceCard(face) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "face-card";
  if (face.id) {
    card.setAttribute("data-face-id", face.id);
  }

  const title = face.title || "Watch face";
  const imageUrl = face.imageUrl || "";
  const gallery = galleryById[face.galleryId];
  const galleryName = gallery ? gallery.name : "";
  const fullDesc = face.description || "";
  const shortDesc =
    fullDesc.length > 80 ? fullDesc.slice(0, 77) + "..." : fullDesc;

  card.innerHTML = `
    <div class="watch-mock">
      <div class="watch-inner">
        ${
          imageUrl
            ? `<img src="${imageUrl}" alt="${escapeHtml(title)}">`
            : ""
        }
      </div>
    </div>
    <div class="face-info">
      <h3 class="face-title">${escapeHtml(title)}</h3>
      ${
        galleryName
          ? `<p class="face-gallery">${escapeHtml(galleryName)}</p>`
          : ""
      }
      ${
        shortDesc
          ? `<p class="face-description">${escapeHtml(shortDesc)}</p>`
          : ""
      }
    </div>
  `;

  card.addEventListener("click", () => openModal(face));

  return card;
}

// ------------- Search -------------

function setupSearch() {
  const input = document.getElementById("searchInput");
  const galleriesSection = document.getElementById("galleriesSection");
  const resultsSection = document.getElementById("searchResultsSection");
  const resultsGrid = document.getElementById("searchResultsGrid");
  const noResults = document.getElementById("searchNoResults");
  const resultsSubtitle = document.getElementById("searchResultsSubtitle");

  if (!input || !resultsSection || !resultsGrid) return;

  input.addEventListener("input", () => {
    const term = input.value.trim().toLowerCase();

    if (term === "") {
      if (galleriesSection) galleriesSection.hidden = false;
      resultsSection.hidden = true;
      if (noResults) noResults.hidden = true;
      renderNewFacesAll();
      return;
    }

    const matches = faces.filter(face => {
      const title = (face.title || "").toLowerCase();
      const desc = (face.description || "").toLowerCase();
      const tagsText = Array.isArray(face.tags)
        ? face.tags.join(" ").toLowerCase()
        : "";
      const gallery = galleryById[face.galleryId];
      const galleryName = gallery && gallery.name
        ? gallery.name.toLowerCase()
        : "";

      return (
        title.includes(term) ||
        desc.includes(term) ||
        tagsText.includes(term) ||
        galleryName.includes(term)
      );
    });

    if (galleriesSection) galleriesSection.hidden = true;
    resultsSection.hidden = false;
    resultsGrid.innerHTML = "";

    if (!matches.length) {
      if (noResults) noResults.hidden = false;
      if (resultsSubtitle) {
        resultsSubtitle.textContent = "Matching faces";
      }
      return;
    }

    if (noResults) noResults.hidden = true;

    if (resultsSubtitle) {
      resultsSubtitle.textContent =
        "Found " +
        matches.length +
        " face" +
        (matches.length === 1 ? "" : "s") +
        ".";
    }

    matches.forEach(face => {
      resultsGrid.appendChild(createFaceCard(face));
    });
  });
}

// ------------- Modal -------------

function setupModal() {
  const modal = document.getElementById("previewModal");
  const closeBtn = document.getElementById("modalCloseBtn");

  if (!modal || !closeBtn) return;

  closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}

function openModal(face) {
  const modal = document.getElementById("previewModal");
  if (!modal) return;

  const img = document.getElementById("modalImage");
  const title = document.getElementById("modalTitle");
  const description = document.getElementById("modalDescription");
  const tagsWrap = document.getElementById("modalTags");
  const downloadLink = document.getElementById("modalDownload");

  const faceTitle = face.title || "Watch face";
  const faceDesc = face.description || "";
  const imageUrl = face.downloadUrl || face.imageUrl || "";

  if (img) {
    img.src = imageUrl;
    img.alt = faceTitle;
  }
  if (title) {
    title.textContent = faceTitle;
  }
  if (description) {
    description.textContent = faceDesc;
  }

  if (tagsWrap) {
    tagsWrap.innerHTML = "";
    if (Array.isArray(face.tags) && face.tags.length) {
      face.tags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "tag-pill";
        span.textContent = tag;
        tagsWrap.appendChild(span);
      });
    }
  }

  if (downloadLink && imageUrl) {
    downloadLink.href = imageUrl;
  }

  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("open");
}

function closeModal() {
  const modal = document.getElementById("previewModal");
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("open");
}
