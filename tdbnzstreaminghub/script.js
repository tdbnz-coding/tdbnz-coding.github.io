const API = "https://ancient-lab-55d7.thomasnz.workers.dev";
const IMG = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/original";

// SEARCH
document.getElementById("searchBtn").onclick = () => {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  hideDetails();
  hidePlayer();

  fetch(`${API}/3/search/multi?query=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      const results = document.getElementById("searchResults");
      results.innerHTML = "";

      data.results.forEach(item => {
        if (!item.poster_path) return;

        const title = item.media_type === "movie" ? item.title : item.name;

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${IMG + item.poster_path}">
          <div class="card-title">${title}</div>
        `;

        card.onclick = () => loadDetails(item.id, item.media_type);
        results.appendChild(card);
      });
    });
};

// LOAD FULL DETAILS PAGE
function loadDetails(id, type) {
  hidePlayer();

  const page = document.getElementById("detailsPage");
  const title = document.getElementById("detailsTitle");
  const meta = document.getElementById("detailsMeta");
  const overview = document.getElementById("detailsOverview");
  const cast = document.getElementById("detailsCast");
  const backdrop = document.getElementById("detailsBackdrop");
  const playBtn = document.getElementById("playBtn");
  const seasons = document.getElementById("tvSeasons");
  const seasonButtons = document.getElementById("seasonButtons");
  const episodeGrid = document.getElementById("episodeGrid");

  page.style.display = "block";
  seasons.style.display = "none";
  seasonButtons.innerHTML = "";
  episodeGrid.innerHTML = "";

  // Fetch main details
  fetch(`${API}/3/${type}/${id}`)
    .then(res => res.json())
    .then(data => {
      title.innerText = type === "movie" ? data.title : data.name;
      overview.innerText = data.overview || "No description available.";

      backdrop.style.backgroundImage = data.backdrop_path
        ? `url(${BACKDROP + data.backdrop_path})`
        : "none";

      const year = (data.release_date || data.first_air_date || "").split("-")[0];
      const runtime = data.runtime || data.episode_run_time?.[0] || "N/A";
      const genres = data.genres.map(g => g.name).join(", ");
      const rating = data.vote_average?.toFixed(1) || "N/A";

      meta.innerText = `${year} • ${runtime} min • ${genres} • ⭐ ${rating}`;

      // Play button
      playBtn.onclick = () => {
        if (type === "movie") {
          openPlayer(id, "movie");
        } else {
          seasons.style.display = "block";
          loadSeasons(id);
        }
      };
    });

  // Fetch cast
  fetch(`${API}/3/${type}/${id}/credits`)
    .then(res => res.json())
    .then(data => {
      const actors = data.cast.slice(0, 6).map(a => `${a.name} (${a.character})`);
      cast.innerText = "Cast: " + actors.join(", ");
    });
}

// LOAD TV SEASONS
function loadSeasons(tvId) {
  const seasonButtons = document.getElementById("seasonButtons");
  seasonButtons.innerHTML = "";

  fetch(`${API}/3/tv/${tvId}`)
    .then(res => res.json())
    .then(data => {
      data.seasons.forEach(season => {
        if (season.season_number === 0) return;

        const btn = document.createElement("button");
        btn.className = "season-btn";
        btn.innerText = `Season ${season.season_number}`;
        btn.onclick = () => loadEpisodes(tvId, season.season_number);
        seasonButtons.appendChild(btn);
      });
    });
}

// LOAD EPISODES
function loadEpisodes(tvId, seasonNumber) {
  const episodeGrid = document.getElementById("episodeGrid");
  episodeGrid.innerHTML = "";

  fetch(`${API}/3/tv/${tvId}/season/${seasonNumber}`)
    .then(res => res.json())
    .then(data => {
      data.episodes.forEach(ep => {
        const still = ep.still_path ? IMG + ep.still_path : "https://via.placeholder.com/500x281?text=No+Image";

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${still}">
          <div class="card-title">Ep ${ep.episode_number}: ${ep.name}</div>
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

  frame.src =
    type === "movie"
      ? `https://www.vidking.net/embed/movie/${id}?autoPlay=true`
      : frame.src;

  modal.style.display = "flex";
}

function openEpisode(tvId, season, episode) {
  const modal = document.getElementById("playerModal");
  const frame = document.getElementById("playerFrame");

  frame.src = `https://www.vidking.net/embed/tv/${tvId}/${season}/${episode}?autoPlay=true&episodeSelector=true&nextEpisode=true`;

  modal.style.display = "flex";
}

// CLOSE PLAYER
document.getElementById("closeBtn").onclick = () => hidePlayer();

function hidePlayer() {
  const modal = document.getElementById("playerModal");
  const frame = document.getElementById("playerFrame");

  modal.style.display = "none";
  frame.src = "";
}

// HIDE DETAILS PAGE
document.getElementById("backBtn").onclick = () => hideDetails();

function hideDetails() {
  document.getElementById("detailsPage").style.display = "none";
}