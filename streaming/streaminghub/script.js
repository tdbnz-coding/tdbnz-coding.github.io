// Load the external menu
$(document).ready(function () {
    $("#menu-container").load("./menu.html", function (response, status, xhr) {
        if (status === "error") {
            console.error("Failed to load menu: ", xhr.status, xhr.statusText);
        } else {
            console.log("Menu loaded successfully.");
            $('.dropdown-toggle').dropdown();  // Initialize dropdowns
        }
    });
});

// Sidebar toggle functionality
$("#menu-toggle").click(function (e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});

// Random page navigation for "Watch Now" button
const pages = [
    "sky-sports-1.html",
    "sky-sports-2.html",
    "sky-sports-3.html"
];

document.getElementById("watch-now").addEventListener("click", () => {
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    window.location.href = randomPage;
});
