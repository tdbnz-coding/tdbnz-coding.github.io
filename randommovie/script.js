// Theme Toggle
function toggleTheme() {
  document.body.classList.toggle('light-theme');
}

// Spin Wheel and get random movie
async function getRandomMovie() {
  try {
    const response = await fetch('movies_data/movies.json');
    const data = await response.json();
    const movies = data.results;
    const randomMovie = movies[Math.floor(Math.random() * movies.length)];
    displayMovieInfo(randomMovie);
  } catch (error) {
    console.error('Error loading movie data:', error);
  }
}

// Display Movie Info
function displayMovieInfo(movie) {
  const today = new Date();
  const releaseDate = new Date(movie.release_date);
  const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : "Unknown";
  const movieStatus = releaseDate > today 
    ? `Coming Out on ${releaseDate.toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' })}`
    : "Released";

  document.getElementById('movie-description').textContent = movie.overview || "No description available.";
  document.getElementById('movie-poster').src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'default-poster.jpg';
  document.getElementById('movie-status').textContent = movieStatus;
  document.getElementById('movie-cast').textContent = "Cast information not available";
  document.getElementById('movie-year').textContent = releaseYear;

  document.getElementById('tmdb-link').href = `https://www.themoviedb.org/movie/${movie.id}`;
  document.getElementById('view-tmdb-btn').onclick = () => window.open(document.getElementById('tmdb-link').href, '_blank');

  toggleDisplay(['intro', 'movie-info'], 'none');
  document.getElementById('movie-info').style.display = 'flex';
}

// Utility: Toggle Display
function toggleDisplay(ids, displayStyle) {
  ids.forEach(id => document.getElementById(id).style.display = displayStyle);
}