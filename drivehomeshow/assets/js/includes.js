async function loadInclude(id, file) {
  const el = document.getElementById(id);
  if (!el) return;
  const res = await fetch(file);
  el.innerHTML = await res.text();
}

Promise.all([
  loadInclude('site-nav', 'includes/nav.html'),
  loadInclude('site-footer', 'includes/footer.html')
]).then(() => {
  const script = document.createElement('script');
  script.src = 'assets/js/main.js';
  document.body.appendChild(script);
});
