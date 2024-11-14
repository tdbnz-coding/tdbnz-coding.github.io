// TMDB API Key
const TMDB_API_KEY = '3c388e32d5258a951b7525ba8e8e7d84';

// Function to trigger roulette animation and fetch movie info after animation
function startRoulette() {
  document.getElementById('intro').style.display = 'none';
  document.getElementById('movie-info').style.display = 'none'; // Hide movie info if visible
  document.getElementById('roulette-spin').style.display = 'block';

  // Display the movie info after a delay (e.g., 2 seconds for the spinning animation)
  setTimeout(() => {
    document.getElementById('roulette-spin').style.display = 'none';
    getRandomMovie(); // Call function to fetch and display random movie
  }, 2000);
}

// Function to fetch a random movie
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

// Function to display movie details including cast, year, and TMDB link
async function displayMovieInfo(movie) {
  const movieTitle = movie.title;
  const movieDescription = movie.overview || "No description available.";
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'default-poster.jpg';
  const movieYear = movie.release_date ? movie.release_date.split('-')[0] : "Unknown";

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
  document.getElementById('movie-title').textContent = movieTitle;
  document.getElementById('movie-description').textContent = movieDescription;
  document.getElementById('movie-poster').src = posterUrl;
  document.getElementById('movie-cast').textContent = castList;
  document.getElementById('movie-year').textContent = movieYear;

  // Show movie info section
  document.getElementById('movie-info').style.display = 'flex';
}
