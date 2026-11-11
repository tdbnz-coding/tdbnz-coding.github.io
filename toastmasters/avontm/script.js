(() => {
  const button = document.querySelector(".menu-button");
  const nav = document.querySelector("#main-nav");
  if (button && nav) {
    const close = () => {
      nav.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open menu");
    };
    button.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", close));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") close();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 680) close();
    });
  }
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
})();