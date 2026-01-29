const API = "https://ancient-lab-55d7.thomasnz.workers.dev";
const IMG = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/original";

let currentDetails = { id: null, type: null };

// NAV
document.getElementById("navHome").onclick = () => showPage("home");
document.getElementById("navSearch").onclick = () => showPage("search");

// SEARCH
document.getElementById("searchBtn").onclick = () => {
  const q = document.getElementById("searchInput").value.trim();
  if (!q) return;
  showPage("search");
  doSearch(q);
};

// DETAILS BACK BUTTON
document.getElementById("detailsBackBtn").onclick = () => {
  showPage("home");
};

// PLAYER CLOSE
document.getElementById("closeBtn").onclick = hidePlayer;

// INIT
window.addEventListener("load", () => {
  showPage("home");
  loadHome();
});

// PAGE SWITCHING
function showPage(page) {
  document.getElementById("homePage").style.display = page === "home" ? "block" : "none";
  document.getElementById("searchPage").style.display = page === "search" ? "block" : "none";
  document.getElementById("detailsPage").style.display = page === "details" ? "block" : "none";
}

// HOME LOAD
async function loadHome() {
  // Hero: random trending movie
  fetch(`${API}/3/trending/movie/week`)
    .then(res => res.json())
    .then(data => {
      if (!data.results || !data.results.length) return;
      const movie = data.results[Math.floor(Math.random() * data.results.length)];
      setupHero(movie);
    });

  // Rows
  loadRow("/3/movie/now_playing", "rowLatestMovies", "movie");
  loadRow("/3/tv/on_the_air", "rowLatestTV", "tv");
  loadRow("/3/movie/popular", "rowPopularMovies", "movie");
  loadRow("/3/tv/popular", "rowPopularTV", "tv");
  loadRow("/3/movie/top_rated", "rowTopMovies", "movie");
  loadRow("/3/tv/top_rated", "rowTopTV", "tv");
}

function setupHero(movie) {
  const heroBackdrop = document.getElementById("heroBackdrop");
  const titleEl = document.getElementById("heroTitle");
  const metaEl = document.getElementById("heroMeta");
  const overviewEl = document.getElementById("heroOverview");
  const playBtn = document.getElementById("heroPlayBtn");
  const moreBtn = document.getElementById("heroMoreBtn");

  heroBackdrop.style.backgroundImage = movie.backdrop_path
    ? `url(${BACKDROP + movie.backdrop_path})`
    : "none";

  titleEl.innerText = movie.title || "Untitled";
  const year = (movie.release_date || "").split("-")[0];
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
  metaEl.innerText = `${year} • ⭐ ${rating}`;
  overviewEl.innerText = movie.overview || "";

  playBtn.onclick = () => openPlayer(movie.id, "movie");
  moreBtn.onclick = () => loadDetails(movie.id, "movie");
}

// LOAD ROW
function loadRow(path, containerId, type) {
  fetch(`${API}${path}`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById(containerId);
      container.innerHTML = "";
      if (!data.results) return;
      data.results.forEach(item => {
        if (!item.poster_path) return;
        const card = createCard(item, type);
        container.appendChild(card);
      });
    });
}

// CREATE CARD WITH HOVER TRAILER
function createCard(item, type) {
  const card = document.createElement("div");
  card.className = "card";

  const img = document.createElement("img");
  img.src = IMG + item.poster_path;
  card.appendChild(img);

  const info = document.createElement("div");
  info.className = "card-info";
  const title = document.createElement("div");
  title.className = "card-title";
  title.innerText = type === "movie" ? item.title : item.name;
  const meta = document.createElement("div");
  meta.className = "card-meta";
  const year = (item.release_date || item.first_air_date || "").split("-")[0];
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
  meta.innerText = `${year} • ⭐ ${rating}`;
  const actions = document.createElement("div");
  actions.className = "card-actions";

  const playBtn = document.createElement("button");
  playBtn.className = "play-btn";
  playBtn.innerText = "Play";
  playBtn.onclick = (e) => {
    e.stopPropagation();
    if (type === "movie") openPlayer(item.id, "movie");
    else loadDetails(item.id, "tv");
  };

  const infoBtn = document.createElement("button");
  infoBtn.className = "info-btn";
  infoBtn.innerText = "More Info";
  infoBtn.onclick = (e) => {
    e.stopPropagation();
    loadDetails(item.id, type);
  };

  actions.appendChild(playBtn);
  actions.appendChild(infoBtn);
  info.appendChild(title);
  info.appendChild(meta);
  info.appendChild(actions);
  card.appendChild(info);

  // Hover trailer
  let hoverTimeout = null;
  card.addEventListener("mouseenter", () => {
    hoverTimeout = setTimeout(() => {
      loadTrailerIntoCard(item.id, type, card);
    }, 150); // small delay to avoid flicker
  });
  card.addEventListener("mouseleave", () => {
    clearTimeout(hoverTimeout);
    removeTrailerFromCard(card);
  });

  card.onclick = () => loadDetails(item.id, type);

  return card;
}

function loadTrailerIntoCard(id, type, card) {
  // Avoid reloading if already present
  if (card.querySelector(".card-trailer")) return;

  fetch(`${API}/3/${type}/${id}/videos`)
    .then(res => res.json())
    .then(data => {
      if (!data.results || !data.results.length) return;
      const vid = data.results.find(v => v.site === "YouTube" && v.type === "Trailer") || data.results[0];
      if (!vid || !vid.key) return;

      const trailerDiv = document.createElement("div");
      trailerDiv.className = "card-trailer";

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${vid.key}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1`;
      iframe.allow = "autoplay; encrypted-media";
      trailerDiv.appendChild(iframe);

      card.appendChild(trailerDiv);
    });
}

function removeTrailerFromCard(card) {
  const trailer = card.querySelector(".card-trailer");
  if (trailer) trailer.remove();
}

// SEARCH
function doSearch(query) {
  const results = document.getElementById("searchResults");
  results.innerHTML = "";

  fetch(`${API}/3/search/multi?query=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.results) return;
      data.results.forEach(item => {
        if (!item.poster_path) return;
        const type = item.media_type === "movie" ? "movie" : item.media_type === "tv" ? "tv" : null;
        if (!type) return;
        const card = createCard(item, type);
        results.appendChild(card);
      });
    });
}

// DETAILS PAGE
function loadDetails(id, type) {
  currentDetails = { id, type };
  showPage("details");
  hidePlayer();

  const backdrop = document.getElementById("detailsBackdrop");
  const titleEl = document.getElementById("detailsTitle");
  const metaEl = document.getElementById("detailsMeta");
  const overviewEl = document.getElementById("detailsOverview");
  const castEl = document.getElementById("detailsCast");
  const playBtn = document.getElementById("detailsPlayBtn");
  const seasonsSection = document.getElementById("tvSeasons");
  const seasonButtons = document.getElementById("seasonButtons");
  const episodeGrid = document.getElementById("episodeGrid");
  const similarRow = document.getElementById("similarRow");

  seasonsSection.style.display = "none";
  seasonButtons.innerHTML = "";
  episodeGrid.innerHTML = "";
  similarRow.innerHTML = "";

  // Main details
  fetch(`${API}/3/${type}/${id}`)
    .then(res => res.json())
    .then(data => {
      backdrop.style.backgroundImage = data.backdrop_path
        ? `url(${BACKDROP + data.backdrop_path})`
        : "none";

      titleEl.innerText = type === "movie" ? data.title : data.name;
      const year = (data.release_date || data.first_air_date || "").split("-")[0];
      const runtime = data.runtime || (data.episode_run_time && data.episode_run_time[0]) || "N/A";
      const genres = data.genres ? data.genres.map(g => g.name).join(", ") : "";
      const rating = data.vote_average ? data.vote_average.toFixed(1) : "N/A";
      metaEl.innerText = `${year} • ${runtime} min • ${genres} • ⭐ ${rating}`;
      overviewEl.innerText = data.overview || "";

      playBtn.onclick = () => {
        if (type === "movie") openPlayer(id, "movie");
        else {
          seasonsSection.style.display = "block";
          loadSeasons(id);
        }
      };
    });

  // Cast
  fetch(`${API}/3/${type}/${id}/credits`)
    .then(res => res.json())
    .then(data => {
      if (!data.cast) {
        castEl.innerText = "";
        return;
      }
      const actors = data.cast.slice(0, 8).map(a => `${a.name} (${a.character})`);
      castEl.innerText = "Cast: " + actors.join(", ");
    });

  // Similar
  fetch(`${API}/3/${type}/${id}/similar`)
    .then(res => res.json())
    .then(data => {
      if (!data.results) return;
      data.results.forEach(item => {
        if (!item.poster_path) return;
        const card = createCard(item, type);
        similarRow.appendChild(card);
      });
    });
}

// TV SEASONS / EPISODES
function loadSeasons(tvId) {
  const seasonButtons = document.getElementById("seasonButtons");
  seasonButtons.innerHTML = "";

  fetch(`${API}/3/tv/${tvId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.seasons) return;
      data.seasons.forEach(season => {
        if (season.season_number === 0) return;
        const btn = document.createElement("button");
        btn.innerText = `Season ${season.season_number}`;
        btn.onclick = () => loadEpisodes(tvId, season.season_number);
        seasonButtons.appendChild(btn);
      });
    });
}

function loadEpisodes(tvId, seasonNumber) {
  const episodeGrid = document.getElementById("episodeGrid");
  episodeGrid.innerHTML = "";

  fetch(`${API}/3/tv/${tvId}/season/${seasonNumber}`)
    .then(res => res.json())
    .then(data => {
      if (!data.episodes) return;
      data.episodes.forEach(ep => {
        const card = document.createElement("div");
        card.className = "card";
        const still = ep.still_path ? IMG + ep.still_path : "https://via.placeholder.com/500x281?text=No+Image";
        card.innerHTML = `
          <img src="${still}">
          <div class="card-info">
            <div class="card-title">Ep ${ep.episode_number}: ${ep.name}</div>
          </div>
        `;
        card.onclick = () => openEpisode(tvId, seasonNumber, ep.episode_number);
        episodeGrid.appendChild(card);
      });
    });
}

// PLAYER
function openPlayer(id, type) {
  const modal = document.getElementById("playerModal");
  const frame = document.getElementById("playerFrame");

  if (type === "movie") {
    frame.src = `https://www.vidking.net/embed/movie/${id}?autoPlay=true`;
  }

  modal.style.display = "flex";
}

function openEpisode(tvId, season, episode) {
  const modal = document.getElementById("playerModal");
  const frame = document.getElementById("playerFrame");
  frame.src = `https://www.vidking.net/embed/tv/${tvId}/${season}/${episode}?autoPlay=true&episodeSelector=true&nextEpisode=true`;
  modal.style.display = "flex";
}

function hidePlayer() {
  const modal = document.getElementById("playerModal");
  const frame = document.getElementById("playerFrame");
  modal.style.display = "none";
  frame.src = "";
}