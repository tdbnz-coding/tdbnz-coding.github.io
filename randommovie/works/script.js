const TMDB_API_KEY = '3c388e32d5258a951b7525ba8e8e7d84';

// Theme Toggle
function toggleTheme() {
  document.body.classList.toggle('light-theme');
}

// Spin Wheel
function startRoulette() {
  toggleDisplay(['intro', 'movie-info'], 'none');
  toggleDisplay(['roulette-spin'], 'block');

  setTimeout(() => {
    toggleDisplay(['roulette-spin'], 'none');
    getRandomMovie();
  }, 2000);
}

// Display Movie Info
async function displayMovieInfo(movie) {
  const today = new Date();
  const releaseDate = new Date(movie.release_date);
  const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : "Unknown";
  const movieStatus = releaseDate > today 
    ? `Coming Out on ${releaseDate.toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' })}`
    : "Released";

  document.getElementById('movie-description').textContent = movie.overview || "No description available.";
  document.getElementById('movie-poster').src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'default-poster.jpg';
  document.getElementById('movie-status').textContent = movieStatus;
  document.getElementById('movie-cast').textContent = await getCast(movie.id);
  document.getElementById('movie-year').textContent = releaseYear;

  document.getElementById('tmdb-link').href = `https://www.themoviedb.org/movie/${movie.id}`;
  document.getElementById('view-tmdb-btn').onclick = () => window.open(document.getElementById('tmdb-link').href, '_blank');

  toggleDisplay(['movie-info'], 'flex');
}

// Fetch Random Movie
async function getRandomMovie() {
  const randomPage = Math.floor(Math.random() * 500) + 1;
  const movieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&page=${randomPage}`;

  try {
    const response = await fetch(movieUrl);
    const movies = (await response.json()).results;
    displayMovieInfo(movies[Math.floor(Math.random() * movies.length)]);
  } catch (error) {
    console.error('Error fetching movie:', error);
  }
}

// Fetch Cast
async function getCast(movieId) {
  const castUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
  try {
    const castData = await (await fetch(castUrl)).json();
    return castData.cast.slice(0, 5).map(actor => actor.name).join(', ') || "Unknown";
  } catch (error) {
    console.error('Error fetching cast:', error);
    return "Unknown";
  }
}

// Utility: Toggle Display
function toggleDisplay(ids, displayStyle) {
  ids.forEach(id => document.getElementById(id).style.display = displayStyle);
}
