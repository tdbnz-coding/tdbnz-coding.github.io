async function startDownload() {

  const url = document.getElementById("videoUrl").value;
  const type = document.getElementById("downloadType").value;
  const status = document.getElementById("status");

  if (!url) {
    status.innerText = "Please paste a video URL.";
    return;
  }

  status.innerText = "Starting GitHub Action...";

  try {

    const response = await fetch(
      "https://api.github.com/repos/YOURUSERNAME/YOURREPO/actions/workflows/downloader.yml/dispatches",
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": "Bearer YOUR_GITHUB_TOKEN",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            video_url: url,
            download_type: type
          }
        })
      }
    );

    if (response.ok) {
      status.innerHTML =
        "Download started!<br><br>" +
        "Go to your GitHub Actions tab to monitor progress and download the file from Artifacts.";
    } else {
      status.innerText = "GitHub API request failed.";
    }

  } catch (err) {
    status.innerText = "Error starting download.";
  }
}
