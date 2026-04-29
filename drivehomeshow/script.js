const RSS_URL = 'https://drivehomeshow.substack.com/feed';

/**
 * Determine if it's Wednesday 4–5pm in NZ (Pacific/Auckland)
 */
function isOnAirNowNZ() {
    try {
        const now = new Date();
        const nzString = now.toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' });
        const nz = new Date(nzString);

        const day = nz.getDay();   // 0=Sun, 3=Wed
        const hour = nz.getHours(); // 0–23

        // On air Wednesday 16:00–16:59
        return day === 3 && hour === 16;
    } catch (e) {
        console.error("Timezone conversion failed", e);
        return false;
    }
}

/**
 * Toggle floating Listen Live button + ON AIR pill
 */
function handleOnAirUI() {
    const fab = document.getElementById('listen-live-fab');
    const pill = document.getElementById('on-air-pill');
    const onAir = isOnAirNowNZ();

    if (fab) fab.style.display = onAir ? 'inline-flex' : 'none';
    if (pill) pill.style.display = onAir ? 'inline-flex' : 'none';
}

/**
 * Fetch and parse RSS feed
 */
async function fetchRSS() {
    const response = await fetch(RSS_URL);
    const text = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(text, 'application/xml');
}

/**
 * Render RSS items into a container
 * filterType: 'podcast' | 'post'
 */
function renderItems(doc, containerId, filterType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = Array.from(doc.getElementsByTagName('item'));
    const list = document.createElement('ul');
    list.className = 'feed-list';

    items.forEach(item => {
        const title = item.getElementsByTagName('title')[0]?.textContent || 'Untitled';
        const link = item.getElementsByTagName('link')[0]?.textContent || '#';
        const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
        const enclosure = item.getElementsByTagName('enclosure')[0];
        const isPodcast = !!enclosure;

        if (filterType === 'podcast' && !isPodcast) return;
        if (filterType === 'post' && isPodcast) return;

        const li = document.createElement('li');
        li.className = 'feed-item';

        const a = document.createElement('a');
        a.href = link;
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'feed-item-title';
        a.textContent = title;

        const meta = document.createElement('div');
        meta.className = 'feed-item-meta';
        meta.textContent = pubDate;

        li.appendChild(a);
        li.appendChild(meta);

        if (isPodcast && enclosure) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = enclosure.getAttribute('url');
            audio.style.marginTop = '0.4rem';
            li.appendChild(audio);
        }

        list.appendChild(li);
    });

    container.innerHTML = '';
    container.appendChild(list);
}

/**
 * Initialise everything
 */
async function init() {
    // ON AIR UI
    handleOnAirUI();
    setInterval(handleOnAirUI, 60 * 1000);

    // RSS feed
    let doc;
    try {
        doc = await fetchRSS();
    } catch (e) {
        console.error('RSS fetch failed', e);
        return;
    }

    if (document.getElementById('podcast-list')) {
        renderItems(doc, 'podcast-list', 'podcast');
    }

    if (document.getElementById('post-list')) {
        renderItems(doc, 'post-list', 'post');
    }
}

document.addEventListener('DOMContentLoaded', init);
