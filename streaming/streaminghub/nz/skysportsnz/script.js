// Change the iframe stream source
function changeStream(url) {
    const streamFrame = document.getElementById('streamFrame');
    streamFrame.src = url;
}

// Toggle between light and dark themes
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
    }
}
