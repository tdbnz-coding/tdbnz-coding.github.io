const API = "https://ancient-lab-55d7.thomasnz.workers.dev";
const IMG = "https://image.tmdb.org/t/p/w500";

// SEARCH
document.getElementById("searchBtn").onclick = () => {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  fetch(`${API}/3/search/multi?query=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      const results = document.getElementById("searchResults");
      results.innerHTML = "";
      hideTVSection();

      data.results.forEach(item => {
        if (!item.poster_path) return;

        const title = item.media_type === "movie" ? item.title : item.name;

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${IMG + item.poster_path}">
          <div class="card-title">${title}</div>
        `;

        // MOVIE → open player
        if (item.media_type === "movie") {
          card.onclick = () => openPlayer(item.id, "movie");
        }

        // TV SHOW → load seasons
        if (item.media_type === "tv") {
          card.onclick = () => loadTVShow(item.id, item.name);
        }

        results.appendChild(card);
      });
    });
};

// LOAD TV SHOW SEASONS
function loadTVShow(tvId, tvName) {
  hidePlayer();
  const tvSection = document.getElementById("tvSection");
  const seasonList = document.getElementById("seasonList");
  const episodeList = document.getElementById("episodeList");

  tvSection.style.display = "block";
  document.getElementById("tvTitle").innerText = tvName;
  seasonList.innerHTML = "<h3>Seasons</h3>";
  episodeList.innerHTML = "";

  fetch(`${API}/3/tv/${tvId}`)
    .then(res => res.json())
    .then(show => {
      show.seasons.forEach(season => {
        if (season.season_number === 0) return; // skip specials

        const btn = document.createElement("button");
        btn.className = "season-btn";
        btn.innerText = `Season ${season.season_number}`;
        btn.onclick = () => loadEpisodes(tvId, season.season_number);
        seasonList.appendChild(btn);
      });
    });
}

// LOAD EPISODES FOR SELECTED SEASON
function loadEpisodes(tvId, seasonNumber) {
  const episodeList = document.getElementById("episodeList");
  episodeList.innerHTML = `<h3>Episodes (Season ${seasonNumber})</h3>`;

  fetch(`${API}/3/tv/${tvId}/season/${seasonNumber}`)
    .then(res => res.json())
    .then(data => {
      data.episodes.forEach(ep => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${IMG + ep.still_path}">
          <div class="card-title">Episode ${ep.episode_number}: ${ep.name}</div>
        `;

        card.onclick = () => openEpisode(tvId, seasonNumber, ep.episode_number);

        episodeList.appendChild(card);
      });
    });
}

// OPEN MOVIE OR TV EPISODE PLAYER
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

// CLOSE PLAYER
document.getElementById("closeBtn").onclick = () => hidePlayer();

function hidePlayer() {
  const modal = document.getElementById("playerModal");
  const frame = document.getElementById("playerFrame");

  modal.style.display = "none";
  frame.src = "";
}

function hideTVSection() {
  document.getElementById("tvSection").style.display = "none";
}