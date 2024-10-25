// Load the external menu
$(document).ready(function () {
    $("#menu-container").load("menu.html");
});

// Block pop-ups
window.open = function () {
    console.log("Pop-up blocked!");
};

// Disable right-click to prevent ad triggers
document.addEventListener('contextmenu', event => event.preventDefault());

// Handle iframe filtering for unwanted sources
document.addEventListener('DOMContentLoaded', () => {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        const allowedSources = ["dlhd.sx"];
        const src = new URL(iframe.src).hostname;

        if (!allowedSources.includes(src)) {
            console.warn(`Blocked iframe from: ${src}`);
            iframe.remove();
        }
    });
});
