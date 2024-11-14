// TMDB API Key
const TMDB_API_KEY = '3c388e32d5258a951b7525ba8e8e7d84';

// Function to trigger roulette animation and fetch movie info after animation
function startRoulette() {
  document.getElementById('intro').style.display = 'none';
  document.getElementById('roulette-spin').style.display = 'block';

  // Display the movie info after a delay (e.g., 2 seconds for the spinning animation)
  setTimeout(() => {
    document.getElementById('roulette-spin').style.display = 'none';
    getRandomMovie();
  }, 2000); // Adjust timing to match animation length
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

// Function to display movie details including cast and year
async function displayMovieInfo(movie) {
  const movieTitle = movie.title;
  const movieDescription = movie.overview || "No description available.";
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'default-poster.jpg';
  const movieYear = movie.release_date ? movie.release_date.split('-')[0] : "Unknown";

  // Fetch cast information
  const castUrl = `https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`;
  let castList = "Unknown";
  try {
    const castResponse = await fetch(castUrl);
    const castData = await castResponse.json(
