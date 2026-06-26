import os
import sys
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone

WEBHOOK = os.getenv("DISCORD_WEBHOOK")
REMINDER_FILE = "reminder.json"

# Force mode for manual runs
FORCE = "force" in sys.argv

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

def load_reminders():
    if not os.path.exists(REMINDER_FILE):
        return {}
    with open(REMINDER_FILE, "r") as f:
        return json.load(f)

def save_reminders(data):
    with open(REMINDER_FILE, "w") as f:
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

def parse_nz_datetime(date_str, time_str):
    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M%p")
    nz = timezone(timedelta(hours=12))
    return dt.replace(tzinfo=nz)

def send_reminder(event, channels):
    emoji = SPORT_EMOJIS.get(event["sport"], "🏆")

    msg = (
        f"🔔 **30‑minute reminder!**\n"
        f"{emoji} **{event['sport']} — {event['title']}**\n"
        f"🕒 Starts at **{event['time']} NZT**\n"
        f"📺 Channels: **{', '.join(channels)}**\n"
        f"📝 {event['description']}\n"
    )

    payload = {
        "username": "Bang TV Sports",
        "avatar_url": "https://i.imgur.com/5QFQKpS.png",
        "content": msg
    }

    requests.post(WEBHOOK, json=payload)

if __name__ == "__main__":
    reminders = load_reminders()
    now = datetime.now(timezone.utc).astimezone()

    all_events = []
    for d in get_dates():
        html, date_str = fetch_day(d)
        all_events.extend(parse_events(html, date_str))

    # Group events by title + date + time
    grouped = {}
    for e in all_events:
        key = f"{e['date']}|{e['time']}|{e['title']}"
        if key not in grouped:
            grouped[key] = {"event": e, "channels": []}
        grouped[key]["channels"].append(e["channel"])

    for key, data in grouped.items():
        event = data["event"]
        channels = data["channels"]

        event_dt = parse_nz_datetime(event["date"], event["time"])
        diff = event_dt - now

        # Within 30 minutes
        if timedelta(minutes=0) < diff <= timedelta(minutes=30):
            if FORCE or key not in reminders:
                send_reminder(event, channels)
                reminders[key] = True

    save_reminders(reminders)
