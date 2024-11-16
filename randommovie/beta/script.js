let shownMovies = new Set();
let movies = [];
let filteredMovies = [];
let isMoviesLoaded = false;
let selectedGenre = "all"; // Default to "all"
const genres = {};

// Show or hide the settings popup
function toggleSettings() {
  const popup = document.getElementById('settings-popup');
  popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
}

// Load genres from TMDB API
async function loadGenres() {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    if (data.genres) {
      data.genres.forEach((genre) => {
        genres[genre.id] = genre.name;
      });

      // Populate the genre dropdown
      const genreFilter = document.getElementById('genre-filter');
      Object.entries(genres).forEach(([id, name]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        genreFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading genres:', error);
  }
}

// Save the selected genre and filter movies
function applyGenreFilter() {
  selectedGenre = document.getElementById('genre-filter').value;
  toggleSettings(); // Close the popup
}

// Load movies from JSON
async function loadMovies() {
  try {
    const response = await fetch('/movies_data/moviesbeta.json');
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

// Get a random movie filtered by genre
function getRandomMovie() {
  if (!isMoviesLoaded || movies.length === 0) {
    alert("No movies are loaded. Please refresh the page.");
    return;
  }

  // Filter movies by genre
  const filteredMovies = selectedGenre === "all"
    ? movies
    : movies.filter((movie) => movie.genre_ids.includes(Number(selectedGenre)));

  if (filteredMovies.length === 0) {
    alert("No movies available for the selected genre.");
    return;
  }

  if (shownMovies.size === filteredMovies.length) {
    alert("All movies in this category have been shown. Resetting the list.");
    shownMovies.clear();
  }

  let randomMovie;
  do {
    randomMovie = filteredMovies[Math.floor(Math.random() * filteredMovies.length)];
  } while (shownMovies.has(randomMovie.id));

  shownMovies.add(randomMovie.id);
  displayMovieInfo(randomMovie);
}

// Display movie information
function displayMovieInfo(movie) {
  const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : "Unknown";
  const movieGenres = movie.genre_ids.map((id) => genres[id] || "Unknown").join(", ");

  document.getElementById('movie-description').textContent = movie.overview || "No description available.";
  document.getElementById('movie-poster').src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'default-poster.jpg';
  document.getElementById('movie-status').textContent = "Released";
  document.getElementById('movie-year').textContent = releaseYear;
  document.getElementById('movie-genres').textContent = movieGenres;

  const tmdbLink = `https://www.themoviedb.org/movie/${movie.id}`;
  document.getElementById('tmdb-link').href = tmdbLink;

  document.getElementById('intro').style.display = 'none';
  document.getElementById('movie-info').style.display = 'flex';
}

// Initialize
window.addEventListener('load', async () => {
  document.getElementById('spin-btn').disabled = true;
  loadGenres();
  await loadMovies();
});
