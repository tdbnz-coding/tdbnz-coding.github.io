document.getElementById("pasteForm").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const devKey = "a1d4e29fd8a9a1812994981e3a6f6de9";
  const title = document.getElementById("title").value;
  const code = document.getElementById("code").value;
  const syntax = document.getElementById("syntax").value;
  const expire = document.getElementById("expire").value;
  const privacy = document.getElementById("privacy").value;

  const formData = new URLSearchParams();
  formData.append("api_dev_key", devKey);
  formData.append("api_option", "paste");
  formData.append("api_paste_code", code);
  formData.append("api_paste_name", title);
  formData.append("api_paste_format", syntax);
  formData.append("api_paste_expire_date", expire);
  formData.append("api_paste_private", privacy);

  fetch("https://pastebin.com/api/api_post.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData
  })
  .then(response => response.text())
  .then(link => {
    if (link.startsWith("Bad API request")) {
      document.getElementById("result").innerHTML = `<div class='alert alert-danger'>Error: ${link}</div>`;
    } else {
      document.getElementById("result").innerHTML = `<div class='alert alert-success'>Paste created: <a href='${link}' target='_blank'>${link}</a></div>`;
    }
  })
  .catch(err => {
    document.getElementById("result").innerHTML = "<div class='alert alert-danger'>Failed to create paste.</div>";
  });
});
