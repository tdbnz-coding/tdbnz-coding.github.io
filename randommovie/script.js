let shownMovies = new Set();
let movies = [];

// Toggle Light/Dark Theme
function toggleTheme() {
  const body = document.body;
  body.classList.toggle('light-theme');
  body.classList.toggle('dark-theme');
}

// Load movies data from JSON and initialize the movie list
async function loadMovies() {
  try {
    const response = await fetch('/movies_data/movies.json'); // Fetch the updated JSON
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error("No movies found in JSON data");
    }
    movies = data.results;
  } catch (error) {
    console.error('Error loading movie data:', error);
    alert("There was an issue loading the movie data. Please try again later.");
  }
}

// Get a random movie that hasn’t been shown yet
function getRandomMovie() {
  if (!movies || movies.length === 0) {
    alert("No movies are loaded. Please refresh the page.");
    return;
  }

  if (shownMovies.size === movies.length) {
    shownMovies.clear();  // Reset if all movies have been shown
  }

  let randomMovie;
  do {
    randomMovie = movies[Math.floor(Math.random() * movies.length)];
  } while (shownMovies.has(randomMovie.id));

  shownMovies.add(randomMovie.id);
  displayMovieInfo(randomMovie);

  // Hide "Spin Roulette Wheel" button after the first press
  document.getElementById('spin-btn').style.display = 'none';
}

// Display movie information on the page
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
  document.getElementById('movie-year').textContent = releaseYear;

  // Display cast directly from JSON
  const castList = movie.cast && movie.cast.length > 0 
    ? movie.cast.join(', ')  // Join the array of cast names
    : "No cast information available";
  document.getElementById('movie-cast').textContent = castList;

  const tmdbLink = `https://www.themoviedb.org/movie/${movie.id}`;
  document.getElementById('tmdb-link').href = tmdbLink;
  document.getElementById('view-tmdb-btn').onclick = () => window.open(tmdbLink, '_blank');

  document.getElementById('intro').classList.add('hidden');
  document.getElementById('movie-info').style.display = 'flex';
}

// Initialize and load movies
window.addEventListener('load', loadMovies);