// Utility to manage cookies
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
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

// Toggle Light/Dark Theme
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

// Apply Theme on Page Load
window.addEventListener('load', () => {
  const savedTheme = getCookie('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.add('dark-theme'); // Default to dark theme
  }
});

// Movie Logic (No Changes)
let shownMovies = new Set();
let movies = [];
let isMoviesLoaded = false;

async function loadMovies() {
  try {
    const response = await fetch('/movies_data/movies.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    movies = data.results;
    isMoviesLoaded = true;
  } catch (error) {
    console.error('Error loading movie data:', error);
    alert("There was an issue loading the movie data. Please try again later.");
  }
}

function getRandomMovie() {
  if (!isMoviesLoaded) {
    alert("No movies are loaded. Please refresh the page.");
    return;
  }

  if (shownMovies.size === movies.length) {
    shownMovies.clear();
  }

  let randomMovie;
  do {
    randomMovie = movies[Math.floor(Math.random() * movies.length)];
  } while (shownMovies.has(randomMovie.id));

  shownMovies.add(randomMovie.id);
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

// Initialize
window.addEventListener('load', async () => {
  await loadMovies();
});
