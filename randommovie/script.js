async function getRandomMovie() {
  try {
    const response = await fetch('movies_data/movies.json');
    const data = await response.json();
    const movies = data.results;
    
    // Select a random movie
    const randomMovie = movies[Math.floor(Math.random() * movies.length)];
    displayMovieInfo(randomMovie);
  } catch (error) {
    console.error('Error loading movie data:', error);
  }
}

function displayMovieInfo(movie) {
  // Display movie details
  document.getElementById('movie-title').textContent = movie.title;
  document.getElementById('movie-poster').src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  document.getElementById('movie-year').textContent = movie.release_date.split('-')[0];
  
  const releaseDate = new Date(movie.release_date);
  const today = new Date();
  document.getElementById('movie-status').textContent = releaseDate > today
    ? `Coming Out on ${releaseDate.toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' })}`
    : "Released";

  // Cast is static since it's not updated in JSON (optional)
  document.getElementById('movie-cast').textContent = movie.cast || "Unknown";

  // Toggle visibility
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('movie-info').classList.remove('hidden');
}