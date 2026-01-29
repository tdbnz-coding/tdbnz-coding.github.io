const API = "https://ancient-llab-55d7.thomasnz.workers.dev/api";
const IMG = "https://image.tmdb.org/t/p/w500";

// Movies
fetch(`${API}/trending/movies`)
  .then(res => res.json())
  .then(data => {
    const grid = document.getElementById("movieGrid");
    data.results.forEach(movie => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${IMG + movie.poster_path}">
        <div class="card-title">${movie.title}</div>
      `;
      card.onclick = () => openPlayer(movie.id, "movie");
      grid.appendChild(card);
    });
  });

// TV
fetch(`${API}/trending/tv`)
  .then(res => res.json())
  .then(data => {
    const grid = document.getElementById("tvGrid");
    data.results.forEach(show => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${IMG + show.poster_path}">
        <div class="card-title">${show.name}</div>
      `;
      card.onclick = () => openPlayer(show.id, "tv");
      grid.appendChild(card);
    });
  });

function openPlayer(id, type) {
  const modal = document.getElementById("playerModal");
  const frame = document.getElementById("playerFrame");

  if (type === "movie") {
    frame.src = `https://www.vidking.net/embed/movie/${id}?autoPlay=true&color=e50914`;
  } else {
    frame.src = `https://www.vidking.net/embed/tv/${id}/1/1?autoPlay=true&episodeSelector=true&nextEpisode=true`;
  }

  modal.style.display = "flex";
}

document.getElementById("closeBtn").onclick = () => {
  document.getElementById("playerModal").style.display = "none";
  document.getElementById("playerFrame").src = "";
};

document.getElementById("searchBtn").onclick = () => {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  fetch(`${API}/search?q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      const results = document.getElementById("searchResults");
      results.innerHTML = "";

      data.results.forEach(item => {
        if (!item.poster_path) return;

        const card = document.createElement("div");
        card.className = "card";

        const title = item.media_type === "movie" ? item.title : item.name;

        card.innerHTML = `
          <img src="${IMG + item.poster_path}">
          <div class="card-title">${title}</div>
        `;

        card.onclick = () => {
          if (item.media_type === "movie") {
            openPlayer(item.id, "movie");
          } else if (item.media_type === "tv") {
            openPlayer(item.id, "tv");
          }
        };

        results.appendChild(card);
      });
    });
};
