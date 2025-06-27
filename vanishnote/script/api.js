
document.getElementById("pasteForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const devKey = "a1d4e29fd8a9a1812994981e3a6f6de9"; // Replace with GitHub Secret in production
  const title = encodeURIComponent(document.getElementById("title").value);
  const code = encodeURIComponent(document.getElementById("code").value);
  const syntax = document.getElementById("syntax").value;
  const expire = document.getElementById("expire").value;
  const privacy = document.getElementById("privacy").value;

  const params = `api_dev_key=${devKey}&api_option=paste&api_paste_code=${code}&api_paste_name=${title}&api_paste_format=${syntax}&api_paste_expire_date=${expire}&api_paste_private=${privacy}`;

  fetch("https://pastebin.com/api/api_post.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  })
  .then(response => response.text())
  .then(link => {
    document.getElementById("result").innerHTML = `<div class='alert alert-success'>Paste created: <a href='${link}' target='_blank'>${link}</a></div>`;
  })
  .catch(() => {
    document.getElementById("result").innerHTML = "<div class='alert alert-danger'>Failed to create paste.</div>";
  });
});
