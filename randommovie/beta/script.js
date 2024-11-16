let shownMovies = new Set();
let movies = [];
let isMoviesLoaded = false;

// Utility to manage cookies
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=None;Secure`;
}

function getCookie(name) {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const [key, value] = cookies[i].trim().split('=');
    if (key === name) {
      return value;
    }
  }
  return null;
}

function saveShownMovies() {
  setCookie('shownMovies', JSON.stringify(Array.from(shownMovies)), 7);
}

function loadShownMovies() {
  const cookieValue = getCookie('shownMovies');
  if (cookieValue) {
    try {
      shownMovies = new Set(JSON.parse(cookieValue));
    } catch (error) {
      console.error('Error parsing shownMovies cookie:', error);
    }
  }
}

function toggleTheme() {
  const body = document.body;
  if (body.classList.contains('dark-theme')) {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    setCookie('theme', 'light', 7);
  } else {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    setCookie('theme', 'dark', 7);
  }
}

function applyThemeOnLoad() {
  const savedTheme = getCookie('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.add('dark-theme');
  }
}

async function loadMovies() {
  try {
    const response = await fetch('/movies_data/moviesbeta.json'); // Updated file path
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("No movies found in JSON data.");
    }

    movies = data.results;
    isMoviesLoaded = true;
    document.getElementById('spin-btn').disabled = false;
  } catch (error) {
    console.error('Error loading movie data:', error);
    if (!isMoviesLoaded) {
      alert("There was an issue loading the movie data. Please refresh the page.");
    }
  }
}

function getRandomMovie() {
  if (!isMoviesLoaded || movies.length === 0) {
    alert("No movies are loaded. Please refresh the page.");
    return;
  }

  if (shownMovies.size === movies.length) {
    alert("All movies have been shown. Resetting the list.");
    shownMovies.clear();
  }

  let randomMovie;
  do {
    randomMovie = movies[Math.floor(Math.random() * movies.length)];
  } while (shownMovies.has(randomMovie.id));

  shownMovies.add(randomMovie.id);
  saveShownMovies();
  displayMovieInfo(randomMovie);
}

function displayMovieInfo(movie) {
  const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : "Unknown";
  const movieStatus = movie.release_date ? "Released" : "Unknown";

  document.getElementById('movie-description').textContent = movie.overview || "No description available.";
  document.getElementById('movie-poster').src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'default-poster.jpg';
  document.getElementById('movie-status').textContent = movieStatus;
  document.getElementById('movie-year').textContent = releaseYear;

  const tmdbLink = `https://www.themoviedb.org/movie/${movie.id}`;
  document.getElementById('tmdb-link').href = tmdbLink;

  document.getElementById('intro').style.display = 'none';
  document.getElementById('movie-info').style.display = 'flex';
}

window.addEventListener('load', async () => {
  document.getElementById('spin-btn').disabled = true;
  applyThemeOnLoad();
  loadShownMovies();
  await loadMovies();
});
