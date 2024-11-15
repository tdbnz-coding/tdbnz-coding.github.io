// Theme Toggle
function toggleTheme() {
  document.body.classList.toggle('light-theme');
}

// Fetch and display a random movie from the JSON file
async function getRandomMovie() {
  try {
    // Ensure the URL is correct based on your GitHub Pages setup
    const response = await fetch('/movies_data/movies.json');
    
    // Check if the response is okay (status 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    // Attempt to parse the JSON
    const data = await response.json();
    const movies = data.results;

    if (!movies || movies.length === 0) {
      throw new Error("No movies found in JSON data");
    }
    
    // Select a random movie
    const randomMovie = movies[Math.floor(Math.random() * movies.length)];
    displayMovieInfo(randomMovie);
  } catch (error) {
    console.error('Error loading movie data:', error);
    alert("There was an issue loading the movie data. Please try again later.");
  }
}

// Display Movie Info on the page
function displayMovieInfo(movie) {
  const today = new Date();
  const releaseDate = new Date(movie.release_date);
  const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : "Unknown";
  
  // Determine release status
  const movieStatus = releaseDate > today 
    ? `Coming Out on ${releaseDate.toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' })}`
    : "Released";

  // Update movie information in the DOM
  document.getElementById('movie-description').textContent = movie.overview || "No description available.";
  document.getElementById('movie-poster').src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'default-poster.jpg';
  document.getElementById('movie-status').textContent = movieStatus;
  document.getElementById('movie-cast').textContent = "Cast information not available";
  document.getElementById('movie-year').textContent = releaseYear;

  // Set TMDB link
  document.getElementById('tmdb-link').href = `https://www.themoviedb.org/movie/${movie.id}`;
  document.getElementById('view-tmdb-btn').onclick = () => window.open(document.getElementById('tmdb-link').href, '_blank');

  // Show movie info and hide the intro
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('movie-info').style.display = 'flex';
}

// Utility: Toggle Display
function toggleDisplay(ids, displayStyle) {
  ids.forEach(id => document.getElementById(id).style.display = displayStyle);
}