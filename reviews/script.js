// script.js

// Helper function to include external HTML for navbar and footer
function includeHTML() {
  const elements = document.querySelectorAll('[data-include]');
  elements.forEach((element) => {
    const file = element.getAttribute('data-include');
    fetch(file)
      .then(response => {
        if (response.ok) return response.text();
        throw new Error(`Failed to fetch ${file}`);
      })
      .then(data => {
        element.innerHTML = data;
      })
      .catch(error => console.error(error));
  });
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', includeHTML);
