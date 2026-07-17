import requests
import re
import html
import datetime
import random
import string

WORKER_URL = "https://iptvtvtrial.thomasnz.workers.dev/?url=https://www.greatestiptv.com/free-trial/"

def run_trial(name):
    file_path = f"./trialtv123/{name}.m3u"

    # Generate random email
    rand = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = f"{rand}@gmail.com"

    print(f"Fetching trial for {name} using email: {email}")

    # Send POST request THROUGH CLOUDFLARE WORKER
    response = requests.post(
        WORKER_URL,
        data={
            "email": email,
            "trial_type": "m3u",
            "gtv_trial_action": "1"
        }
    )

    html_text = response.text

    # Extract URL from HTML
    match = re.search(r'data-copy="([^"]+)"', html_text)
    if not match:
        print(f"ERROR: Could not extract M3U URL for {name}")
        with open(file_path, "w") as f:
            f.write("# ERROR: No URL extracted\n")
        return

    raw_url = match.group(1)
    m3u_url = html.unescape(raw_url)

    # Debug URL (password hidden)
    safe_url = re.sub(r'password=[^&]*', 'password=HIDDEN', m3u_url)
    print(f"DEBUG URL for {name}: {safe_url}")

    # Download playlist
    playlist = requests.get(m3u_url).text

    # Save file
    with open(file_path, "w") as f:
        f.write(playlist)
        f.write(f"\n# Updated: {datetime.datetime.now(datetime.UTC)}")

    print(f"{name}.m3u updated.")

run_trial("thomas")
run_trial("duncan")
