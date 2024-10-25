// Function to include external menu
$(document).ready(function () {
    $("#menu-container").load("menu.html");
});

// List of available pages for random redirection (excluding the home page)
const pages = [
    "sky-sports-1.html"  // Add more pages here if needed
];

// Redirect to a random page when "Watch Now" is clicked
document.getElementById("watch-now").addEventListener("click", () => {
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    window.location.href = randomPage;
});
