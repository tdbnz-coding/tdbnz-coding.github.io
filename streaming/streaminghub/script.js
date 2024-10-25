// Function to include external menu
$(document).ready(function () {
    $("#menu-container").load("menu.html");
});

// List of available pages for random redirection
const pages = [
    "sky-sports-1.html",
    "index.html"  // Add more pages here as needed
];

// Redirect to a random page when "Watch Now" is clicked
document.getElementById("watch-now").addEventListener("click", () => {
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    window.location.href = randomPage;
});
