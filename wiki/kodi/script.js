// Smooth Scrolling for Section Links
document.querySelectorAll('a.nav-link').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    if (this.hash) {
      e.preventDefault();
      const target = document.querySelector(this.hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});

// Console Log for Sly Guy Repository Example
console.log("For NZ users, check out the Sly Guy repo at https://slyguy.uk for great add-ons like Freeview and TVNZ+.");
