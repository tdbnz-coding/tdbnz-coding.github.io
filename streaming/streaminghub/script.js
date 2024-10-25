// Load the external menu into the #menu-container on all pages
$(document).ready(function () {
    $("#menu-container").load("menu.html", function (response, status, xhr) {
        if (status === "error") {
            console.error("Failed to load menu: ", xhr.status, xhr.statusText);
        } else {
            console.log("Menu loaded successfully.");
            // Enable Bootstrap's dropdown functionality after menu load
            $('.dropdown-toggle').dropdown();
        }
    });
});

// Toggle sidebar visibility on menu button click
$("#menu-toggle").click(function (e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});

// Random page navigation for the "Watch Now" button
const pages = [
    "sky-sports-1.html",
    "sky-sports-2.html",
    "sky-sports-3.html"
];

document.getElementById("watch-now").addEventListener("click", () => {
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    window.location.href = randomPage;
});
