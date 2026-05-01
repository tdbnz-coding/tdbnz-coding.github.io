// Drive Home Show Substack settings
// Change this if your Substack URL is different.
const SUBSTACK_BASE_URL = "https://drivehomeshow.substack.com";

function loadSubstackEmbeds() {
  const signupTargets = document.querySelectorAll("[data-substack-signup]");
  const postsTargets = document.querySelectorAll("[data-substack-posts]");
  const substackLinks = document.querySelectorAll("[data-substack-link]");

  substackLinks.forEach((link) => { link.href = SUBSTACK_BASE_URL; });

  signupTargets.forEach((target) => {
    const iframe = document.createElement("iframe");
    iframe.className = "substack-embed-frame substack-signup-frame";
    iframe.src = `${SUBSTACK_BASE_URL}/embed`;
    iframe.title = "Drive Home Show Substack signup";
    iframe.loading = "lazy";
    target.replaceChildren(iframe);
  });

  postsTargets.forEach((target) => {
    const iframe = document.createElement("iframe");
    iframe.className = "substack-embed-frame substack-posts-frame";
    iframe.src = `${SUBSTACK_BASE_URL}/archive?sort=new`;
    iframe.title = "Drive Home Show Substack posts and podcasts";
    iframe.loading = "lazy";
    target.replaceChildren(iframe);
  });
}
document.addEventListener("DOMContentLoaded", loadSubstackEmbeds);
