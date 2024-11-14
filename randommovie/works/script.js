// TMDB API Key
const TMDB_API_KEY = '3c388e32d5258a951b7525ba8e8e7d84';

// Toggle between light and dark themes
function toggleTheme() {
  document.body.classList.toggle('light-theme');
}

// Function to trigger roulette animation and fetch movie info after animation
function startRoulette() {
  document.getElementById('intro').style.display = 'none';
  document.getElementById('movie-info').style.display = 'none';
  document.getElementById('roulette-spin').style.display = 'block';

  setTimeout(() => {
    document.getElementById('roulette-spin').style.display = 'none';
    getRandomMovie();
  }, 2000);
}

// Function to fetch a random movie from TMDB API
async function getRandomMovie() {
  const randomPage = Math.floor(Math.random() * 500) + 1;
  const movieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&page=${randomPage}`;

  try {
    const response = await fetch(movieUrl);
    const data = await response.json();
    const movies = data.results;
    const randomMovie = movies[Math.floor(Math.random() * movies.length)];

    displayMovieInfo(randomMovie);
  } catch (error) {
    console.error('Error fetching movie:', error);
  }
}

// Function to display movie details, including poster, description, cast, year, and status
async function displayMovieInfo(movie) {
  const movieDescription = movie.overview || "No description available.";
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'default-poster.jpg';
  const releaseDate = movie.release_date || "Unknown";
  const movieYear = releaseDate.split('-')[0];
  
  // Determine release status
  const today = new Date();
  const releaseDateObj = new Date(releaseDate);
  let movieStatus;
  
  if (releaseDateObj > today) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    movieStatus = `Coming Out on ${releaseDateObj.toLocaleDateString("en-US", options)}`;
  } else {
    movieStatus = "Released";
  }

  // Set TMDB link
  const tmdbLink = `https://www.themoviedb.org/movie/${movie.id}`;
  document.getElementById('tmdb-link').href = tmdbLink;
  document.getElementById('view-tmdb-btn').onclick = () => window.open(tmdbLink, '_blank');

  // Fetch cast information
  const castUrl = `https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`;
  let castList = "Unknown";
  try {
    const castResponse = await fetch(castUrl);
    const castData = await castResponse.json();
    castList = castData.cast.slice(0, 5).map(actor => actor.name).join(', ');
  } catch (error) {
    console.error('Error fetching cast:', error);
  }

  // Update movie info display
  document.getElementById('movie-description').textContent = movieDescription;
  document.getElementById('movie-poster').src = posterUrl;
  document.getElementById('movie-status').textContent = movieStatus;
  document.getElementById('movie-cast').textContent = castList;
  document.getElementById('movie-year').textContent = movieYear;

  // Show movie info section
  document.getElementById('movie-info').style.display = 'flex';
}
