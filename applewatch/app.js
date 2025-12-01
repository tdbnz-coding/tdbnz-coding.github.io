const DATA_URL = "faces.json";
const NEW_DAYS = 10;

let dataCache = null;

async function loadData() {
  if (dataCache) return dataCache;
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    console.error("Could not load faces.json", response.status);
    dataCache = { galleries: [], faces: [] };
    return dataCache;
  }
  const data = await response.json();
  dataCache = data;
  return data;
}

function isFaceNew(face) {
  if (!face.dateAdded) return false;
  const added = new Date(face.dateAdded);
  if (Number.isNaN(added.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - added.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= NEW_DAYS;
}

function buildSearchString(face, gallery) {
  const galleryName = gallery ? gallery.name : "";
  const parts = [
    face.title || "",
    face.description || "",
    Array.isArray(face.tags) ? face.tags.join(" ") : "",
    galleryName || ""
  ];
  return parts.join(" ").toLowerCase();
}

function findGallery(data, id) {
  return data.galleries.find(g => g.id === id);
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Modal handling

const previewModal = document.getElementById("previewModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalTags = document.getElementById("modalTags");
const modalDownload = document.getElementById("modalDownload");
const modalCloseBtn = document.getElementById("modalCloseBtn");

function openModal(face) {
  if (!previewModal) return;

  previewModal.classList.add("open");
  previewModal.setAttribute("aria-hidden", "false");

  modalImage.src = face.imageUrl;
  modalImage.alt = face.title + " watch face large preview";
  modalTitle.textContent = face.title;
  modalDescription.textContent = face.description;
  modalDownload.href = face.downloadUrl || face.imageUrl;

  modalTags.innerHTML = "";
  if (Array.isArray(face.tags) && face.tags.length) {
    face.tags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      modalTags.appendChild(span);
    });
  }

  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!previewModal) return;
  previewModal.classList.remove("open");
  previewModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener("click", closeModal);
}

if (previewModal) {
  previewModal.addEventListener("click", event => {
    if (event.target === previewModal) {
      closeModal();
    }
  });
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && previewModal && previewModal.classList.contains("open")) {
    closeModal();
  }
});

// Render helpers

function createFaceCard(face, gallery) {
  const card = document.createElement("article");
  card.className = "face-card";

  const thumbWrap = document.createElement("div");
  thumbWrap.className = "face-card-thumb";

  const img = document.createElement("img");
  img.src = face.imageUrl;
  img.alt = face.title + " watch face";
  thumbWrap.appendChild(img);

  if (face.tags && face.tags.length) {
    const chip = document.createElement("span");
    chip.className = "face-tag-chip";
    chip.textContent = face.tags[0];
    thumbWrap.appendChild(chip);
  }

  card.appendChild(thumbWrap);

  const body = document.createElement("div");
  body.className = "face-card-body";

  const titleRow = document.createElement("div");
  titleRow.className = "face-title-row";

  const titleEl = document.createElement("h3");
  titleEl.className = "face-title";
  titleEl.textContent = face.title;

  const pill = document.createElement("span");
  pill.className = "face-pill";
  pill.textContent = gallery ? gallery.name : "Watch face";

  titleRow.appendChild(titleEl);

  if (isFaceNew(face)) {
    const newPill = document.createElement("span");
    newPill.className = "face-new-pill";
    newPill.textContent = "New";
    titleRow.appendChild(newPill);
  } else {
    titleRow.appendChild(pill);
  }

  const desc = document.createElement("p");
  desc.className = "face-description";
  desc.textContent = face.description;

  const tagList = document.createElement("div");
  tagList.className = "tag-list";
  if (Array.isArray(face.tags)) {
    face.tags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      tagList.appendChild(span);
    });
  }

  const actions = document.createElement("div");
  actions.className = "face-actions";

  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = "btn secondary";
  previewBtn.textContent = "Preview";

  const downloadLink = document.createElement("a");
  downloadLink.href = face.downloadUrl || face.imageUrl;
  downloadLink.target = "_blank";
  downloadLink.rel = "noopener";
  downloadLink.className = "btn primary";
  downloadLink.textContent = "Download";

  actions.appendChild(previewBtn);
  actions.appendChild(downloadLink);

  body.appendChild(titleRow);
  body.appendChild(desc);
  body.appendChild(tagList);
  body.appendChild(actions);

  card.appendChild(body);

  card.addEventListener("click", event => {
    if (event.target === downloadLink) return;
    if (event.target === previewBtn) {
      event.preventDefault();
      openModal(face);
    } else if (event.target.closest(".btn")) {
      return;
    } else {
      openModal(face);
    }
  });

  return card;
}

function renderGalleryCards(data) {
  const galleriesGrid = document.getElementById("galleriesGrid");
  if (!galleriesGrid) return;

  galleriesGrid.innerHTML = "";

  data.galleries.forEach(gallery => {
    const facesInGallery = data.faces.filter(f => f.galleryId === gallery.id);

    const card = document.createElement("a");
    card.href = `gallery.html?gallery=${encodeURIComponent(gallery.id)}`;
    card.className = "gallery-card";

    const thumb = document.createElement("div");
    thumb.className = "gallery-card-thumb";

    const img = document.createElement("img");
    img.src = gallery.coverImage || (facesInGallery[0] && facesInGallery[0].imageUrl) || "";
    img.alt = gallery.name + " cover image";

    thumb.appendChild(img);

    const body = document.createElement("div");
    body.className = "gallery-card-body";

    const title = document.createElement("h3");
    title.className = "gallery-card-title";
    title.textContent = gallery.name;

    const desc = document.createElement("p");
    desc.className = "gallery-card-description";
    desc.textContent = gallery.description;

    const meta = document.createElement("div");
    meta.className = "gallery-card-meta";

    const countSpan = document.createElement("span");
    countSpan.className = "gallery-count-pill";
    countSpan.textContent = `${facesInGallery.length} face${facesInGallery.length !== 1 ? "s" : ""}`;

    const tagsSpan = document.createElement("span");
    tagsSpan.textContent = (gallery.tags || []).slice(0, 2).join(" · ");

    meta.appendChild(tagsSpan);
    meta.appendChild(countSpan);

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(meta);

    card.appendChild(thumb);
    card.appendChild(body);

    galleriesGrid.appendChild(card);
  });
}

function renderNewFaces(data) {
  const newFacesSection = document.getElementById("newFacesSection");
  const newFacesGrid = document.getElementById("newFacesGrid");
  if (!newFacesSection || !newFacesGrid) return;

  const newFaces = data.faces.filter(isFaceNew);
  newFacesGrid.innerHTML = "";

  if (!newFaces.length) {
    newFacesSection.style.display = "none";
    return;
  }

  newFacesSection.style.display = "";

  newFaces.forEach(face => {
    const gallery = findGallery(data, face.galleryId);
    const card = createFaceCard(face, gallery);
    newFacesGrid.appendChild(card);
  });

  const subtitle = document.getElementById("newFacesSubtitle");
  if (subtitle) {
    subtitle.textContent = `${newFaces.length} new face${newFaces.length !== 1 ? "s" : ""} recently added.`;
  }
}

function initFacesPage(data) {
  const searchInput = document.getElementById("searchInput");
  const galleriesSection = document.getElementById("galleriesSection");
  const searchSection = document.getElementById("searchResultsSection");
  const searchResultsGrid = document.getElementById("searchResultsGrid");
  const searchNoResults = document.getElementById("searchNoResults");
  const searchSubtitle = document.getElementById("searchResultsSubtitle");

  renderGalleryCards(data);
  renderNewFaces(data);

  function showGalleriesView() {
    if (galleriesSection) galleriesSection.hidden = false;
    if (searchSection) searchSection.hidden = true;
  }

  function showSearchView() {
    if (galleriesSection) galleriesSection.hidden = true;
    if (searchSection) searchSection.hidden = false;
  }

  function handleSearch() {
    const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    if (!searchResultsGrid || !searchNoResults) return;

    if (!query) {
      showGalleriesView();
      return;
    }

    const matches = [];
    data.faces.forEach(face => {
      const gallery = findGallery(data, face.galleryId);
      const searchString = buildSearchString(face, gallery);
      if (searchString.includes(query)) {
        matches.push({ face, gallery });
      }
    });

    showSearchView();
    searchResultsGrid.innerHTML = "";

    if (!matches.length) {
      searchNoResults.hidden = false;
      if (searchSubtitle) {
        searchSubtitle.textContent = "No faces found.";
      }
      return;
    }

    searchNoResults.hidden = true;
    if (searchSubtitle) {
      searchSubtitle.textContent = `${matches.length} face${matches.length !== 1 ? "s" : ""} match your search.`;
    }

    matches.forEach(item => {
      const card = createFaceCard(item.face, item.gallery);
      searchResultsGrid.appendChild(card);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }
}

function initGalleryPage(data) {
  const galleryId = getQueryParam("gallery") || "";
  const galleryTitleEl = document.getElementById("galleryTitle");
  const galleryDescriptionEl = document.getElementById("galleryDescription");
  const galleryFacesGrid = document.getElementById("galleryFacesGrid");
  const galleryEmpty = document.getElementById("galleryEmpty");
  const galleryFacesSubtitle = document.getElementById("galleryFacesSubtitle");

  if (!galleryFacesGrid) return;

  let facesInGallery = [];
  let galleryMeta = null;

  if (galleryId === "new") {
    facesInGallery = data.faces.filter(isFaceNew);
    galleryMeta = {
      name: "New faces",
      description: `Faces that were added in the last ${NEW_DAYS} days.`
    };
  } else {
    galleryMeta = findGallery(data, galleryId);
    if (galleryMeta) {
      facesInGallery = data.faces.filter(f => f.galleryId === galleryMeta.id);
    }
  }

  if (!galleryMeta) {
    if (galleryTitleEl) galleryTitleEl.textContent = "Gallery not found";
    if (galleryDescriptionEl) galleryDescriptionEl.textContent = "The gallery you requested does not exist.";
    if (galleryEmpty) galleryEmpty.hidden = false;
    return;
  }

  if (galleryTitleEl) galleryTitleEl.textContent = galleryMeta.name;
  if (galleryDescriptionEl) galleryDescriptionEl.textContent = galleryMeta.description || "";

  galleryFacesGrid.innerHTML = "";

  if (!facesInGallery.length) {
    if (galleryEmpty) galleryEmpty.hidden = false;
    return;
  }

  if (galleryEmpty) galleryEmpty.hidden = true;
  if (galleryFacesSubtitle) {
    galleryFacesSubtitle.textContent = `${facesInGallery.length} face${facesInGallery.length !== 1 ? "s" : ""} in this gallery.`;
  }

  facesInGallery.forEach(face => {
    const card = createFaceCard(face, galleryMeta);
    galleryFacesGrid.appendChild(card);
  });
}

function initHomePage(data) {
  const heroPreviewImage = document.getElementById("heroPreviewImage");
  if (heroPreviewImage) {
    const firstFace = data.faces[0];
    if (firstFace) {
      heroPreviewImage.src = firstFace.imageUrl;
      heroPreviewImage.alt = firstFace.title + " watch face preview";
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const data = await loadData();

  if (document.body.classList.contains("page-home")) {
    initHomePage(data);
  }
  if (document.body.classList.contains("page-faces")) {
    initFacesPage(data);
  }
  if (document.body.classList.contains("page-gallery")) {
    initGalleryPage(data);
  }
});
