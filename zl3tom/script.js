document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.querySelector(".menu-button");
  const navigation = document.getElementById("main-navigation");
  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });
    navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }));
  }

  const copyButton = document.querySelector(".template-box button");
  const template = document.querySelector(".template-box pre");
  if (copyButton && template) {
    const original = copyButton.innerHTML;
    copyButton.addEventListener("click", async () => {
      const text = template.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const field = document.createElement("textarea");
        field.value = text;
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      copyButton.textContent = "✓ Copied to clipboard";
      window.setTimeout(() => { copyButton.innerHTML = original; }, 2500);
    });
  }
});
