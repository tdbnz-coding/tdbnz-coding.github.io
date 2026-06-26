import os
import sys
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone

# Force mode
FORCE = "force" in sys.argv

# Webhook from GitHub Actions
WEBHOOK = os.getenv("DISCORD_WEBHOOK")

# Path to last.json (same folder as this script)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LAST_FILE = os.path.join(BASE_DIR, "last.json")

# Create last.json if missing
if not os.path.exists(LAST_FILE):
    with open(LAST_FILE, "w") as f:
        json.dump({"hash": None}, f)

# Sport emojis
SPORT_EMOJIS = {
    "Football": "⚽",
    "Rugby": "🏉",
    "Rugby League": "🏉",
    "Cricket": "🏏",
    "Tennis": "🎾",
    "Golf": "⛳",
    "Motorsport": "🏎️",
    "Basketball": "🏀",
    "Snooker": "🎱",
    "Aussie rules": "🏉",
    "Baseball": "⚾",
    "Ice Hockey": "🏒",
    "Boxing": "🥊",
    "MMA": "🥋",
    "Cycling": "🚴",
    "Athletics": "🏃",
    "Swimming": "🏊",
}

BASE_URL = (
    "https://sport-tv-guide.live/sportwidget/1e479ae78733"
    "?time_zone=Pacific/Auckland"
    "&fc=29,3,102,14,1,7,2"
    "&time12=1"
    "&sports=28,29,1,5,18,7,8,10,39,40,13"
    "&bg=f8f8f9&bgs=b7b7b7&grp=1&sd=0&lng=1&typeID=0"
)

# Ordinal helper (1st, 2nd, 3rd, 4th...)
def ordinal(n):
    if 11 <= n % 100 <= 13:
        return f"{n}th"
    if n % 10 == 1:
        return f"{n}st"
    if n % 10 == 2:
        return f"{n}nd"
    if n % 10 == 3:
        return f"{n}rd"
    return f"{n}th"

def load_last():
    try:
        with open(LAST_FILE, "r") as f:
            return json.load(f)
    except:
        return {"hash": None}

def save_last(data):
    with open(LAST_FILE, "w") as f:
        json.dump(data, f)

def get_dates():
    today = datetime.now(timezone.utc).astimezone().date()
    return [today + timedelta(days=i) for i in range(3)]

def fetch_day(date_obj):
    date_str = date_obj.isoformat()
    url = BASE_URL + f"&date={date_str}"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    return r.text, date_str

def parse_events(html, date_str):
    soup = BeautifulSoup(html, "html.parser")
    events = []

    for a in soup.select("a.article"):
        row = a.select_one(".row")
        if not row:
            continue

        sport = row.select_one(".typeName").get_text(strip=True)
        time_str = row.select_one(".time b").get_text(strip=True)

        text_blocks = row.select(".col-xs-8 .text-nowrap")
        title = text_blocks[0].get_text(strip=True)
        desc = text_blocks[1].get_text(strip=True) if len(text_blocks) > 1 else ""

        chan_img = row.select_one(".col-xs-2 img[title]")
        channel = chan_img["title"].strip() if chan_img else "Unknown channel"

        events.append({
            "date": date_str,
            "sport": sport,
            "time": time_str,
            "title": title,
            "description": desc,
            "channel": channel,
        })

    return events

def send_split_messages_by_day(events):
    if not WEBHOOK:
        print("ERROR: DISCORD_WEBHOOK missing")
        return

    MAX = 1800  # safe limit
    days = {}

    # Group events by date
    for e in events:
        days.setdefault(e["date"], []).append(e)

    for date_str, day_events in days.items():
        # Convert date to weekday + ordinal date
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        day_name = dt.strftime("%A")
        pretty_date = f"{day_name} {ordinal(dt.day)} {dt.strftime('%B %Y')}"

        # Build full text for this day
        lines = [f"📅 **{pretty_date}**", ""]
        for e in day_events:
            emoji = SPORT_EMOJIS.get(e["sport"], "🏆")
            lines.append(
                f"{emoji} **{e['sport']} — {e['title']}**\n"
                f"🕒 {e['time']} NZT\n"
                f"📺 {e['channel']}\n"
                f"📝 {e['description']}\n"
            )

        # Split into chunks without cutting lines
        chunks = []
        current = ""

        for line in lines:
            if len(current) + len(line) + 1 > MAX:
                chunks.append(current)
                current = line + "\n"
            else:
                current += line + "\n"

        if current.strip():
            chunks.append(current)

        # Send each chunk
        for i, chunk in enumerate(chunks):
            if i == 0:
                header = f"**{pretty_date}**"
            else:
                header = f"**{pretty_date} (continued)**"

            payload = {
                "username": "Bang TV Sports",
                "avatar_url": "https://i.imgur.com/5QFQKpS.png",
                "content": header + "\n\n" + chunk
            }

            r = requests.post(WEBHOOK, json=payload)
            print(f"{pretty_date} chunk {i+1} status:", r.status_code)

        # Blank gap between days
        requests.post(WEBHOOK, json={
            "username": "Bang TV Sports",
            "avatar_url": "https://i.imgur.com/5QFQKpS.png",
            "content": "\n"
        })

if __name__ == "__main__":
    last = load_last()
    all_events = []

    for d in get_dates():
        html, date_str = fetch_day(d)
        all_events.extend(parse_events(html, date_str))

    # Hash the full message text
    msg = "\n".join([
        f"{e['date']}|{e['sport']}|{e['time']}|{e['title']}|{e['description']}|{e['channel']}"
        for e in all_events
    ])
    new_hash = hash(msg)

    print("FORCE:", FORCE)
    print("Old hash:", last.get("hash"))
    print("New hash:", new_hash)

    if FORCE or last.get("hash") != new_hash:
        send_split_messages_by_day(all_events)
        save_last({"hash": new_hash})
    else:
        print("No changes detected — not posting.")
