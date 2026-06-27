import os
import json
import sys
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import re

FORCE = "force" in sys.argv
WEBHOOK = os.getenv("DISCORD_WEBHOOK")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REMINDER_FILE = os.path.join(BASE_DIR, "reminder.json")

if not os.path.exists(REMINDER_FILE):
    with open(REMINDER_FILE, "w") as f:
        json.dump({}, f)

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

# Sport-TV-Guide base URL
BASE_URL = (
    "https://sport-tv-guide.live/sportwidget/1e479ae78733"
    "?time_zone=Pacific/Auckland"
    "&fc=29,3,102,14,1,7,2"
    "&time12=1"
    "&sports=28,29,1,5,18,7,8,10,39,40,13"
    "&bg=f8f8f9&bgs=b7b7b7&grp=1&sd=0&lng=1&typeID=0"
)

# Sky EPG URL
SKY_EPG_URL = "https://i.mjh.nz/SkyGo/epg.xml"

SKY_SPORT_ORDER = [
    "Sky Sport 1",
    "Sky Sport 2",
    "Sky Sport 3",
    "Sky Sport 4",
    "Sky Sport 5",
    "Sky Sport 6",
    "Sky Sport 7",
    "Sky Sport 8",
    "Sky Sport 9",
    "Sky Sport Select",
]

# ---------- Helpers ----------

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

def load_reminders():
    with open(REMINDER_FILE, "r") as f:
        return json.load(f)

def save_reminders(data):
    with open(REMINDER_FILE, "w") as f:
        json.dump(data, f)

def parse_nz_datetime(date_str, time_str):
    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
    nz = timezone(timedelta(hours=12))
    return dt.replace(tzinfo=nz)

# ---------- Sky EPG ----------

def normalize_channel_name(name: str) -> str:
    if not name:
        return ""
    n = name.strip()
    n = re.sub(r"\s*\(HD\)", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*\(NZ\)", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*HD$", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*\+\d+$", "", n)
    n = re.sub(r"\s*\+$", "", n)
    return n.strip()

def is_sky_sport_channel(name: str) -> bool:
    base = normalize_channel_name(name)
    return base in SKY_SPORT_ORDER

def parse_epg_datetime(dt_str: str) -> datetime:
    m = re.match(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-]\d{4})", dt_str)
    if not m:
        return None
    year, month, day, hour, minute, second, offset = m.groups()
    dt = datetime(
        int(year), int(month), int(day),
        int(hour), int(minute), int(second)
    )
    sign = 1 if offset[0] == "+" else -1
    oh = int(offset[1:3])
    om = int(offset[3:5])
    tz = timezone(sign * timedelta(hours=oh, minutes=om))
    return dt.replace(tzinfo=tz)

def fetch_sky_epg():
    r = requests.get(SKY_EPG_URL, timeout=20)
    r.raise_for_status()
    return r.content

def parse_sky_epg(epg_xml):
    root = ET.fromstring(epg_xml)
    channel_names = {}

    for ch in root.findall("channel"):
        cid = ch.get("id")
        name_el = ch.find("display-name")
        if cid and name_el is not None:
            channel_names[cid] = name_el.text.strip()

    programmes = []
    for prog in root.findall("programme"):
        cid = prog.get("channel")
        start = prog.get("start")
        stop = prog.get("stop")
        title_el = prog.find("title")
        desc_el = prog.find("desc")

        if cid not in channel_names:
            continue

        chan_name = channel_names[cid]
        if not is_sky_sport_channel(chan_name):
            continue

        start_dt = parse_epg_datetime(start)
        stop_dt = parse_epg_datetime(stop)
        if not start_dt or not stop_dt:
            continue

        title = title_el.text.strip() if title_el is not None else ""
        desc = desc_el.text.strip() if desc_el is not None else ""

        programmes.append({
            "channel_raw": chan_name,
            "channel": normalize_channel_name(chan_name),
            "start": start_dt,
            "stop": stop_dt,
            "title": title,
            "description": desc,
        })

    return programmes

# ---------- Fuzzy Matching ----------

def clean_title(t: str) -> str:
    t = t.lower()
    t = t.replace(" vs ", " v ")
    t = t.replace(" vs. ", " v ")
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

def title_tokens(t: str):
    t = clean_title(t)
    return set(t.split())

def fuzzy_title_match(a: str, b: str) -> bool:
    ta = title_tokens(a)
    tb = title_tokens(b)
    if not ta or not tb:
        return False
    inter = ta & tb
    return len(inter) >= 2

# ---------- Sport-TV-Guide ----------

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

# ---------- Merge Sky EPG into events ----------

def merge_sky_channels(events, programmes):
    for e in events:
        try:
            event_dt = parse_nz_datetime(e["date"], e["time"])
        except Exception:
            continue

        merged = set()

        if is_sky_sport_channel(e["channel"]):
            merged.add(normalize_channel_name(e["channel"]))

        for p in programmes:
            diff = abs((p["start"] - event_dt).total_seconds())
            if diff > 10 * 60:
                continue

            if not fuzzy_title_match(e["title"], p["title"]):
                continue

            merged.add(p["channel"])

        if merged:
            ordered = [c for c in SKY_SPORT_ORDER if c in merged]
            e["channels"] = ordered
        else:
            e["channels"] = [e["channel"]]

    return events

# ---------- Reminder Sender ----------

def send_split_reminder(msg):
    if not WEBHOOK:
        print("ERROR: DISCORD_WEBHOOK missing")
        return

    MAX = 1800
    lines = msg.split("\n")
    chunks = []
    current = ""

    for line in lines:
        if len(current) + len(line) + 1 > MAX:
            current += "\n----------------------\n"
            chunks.append(current)
            current = line + "\n"
        else:
            current += line + "\n"

    if current.strip():
        chunks.append(current)

    for i, chunk in enumerate(chunks):
        header = "🔔 **LIVE NOW Reminder**"
        if i > 0:
            header = "🔔 **LIVE NOW Reminder (continued)**"

        payload = {
            "username": "Bang TV Sports",
            "avatar_url": "https://i.imgur.com/5QFQKpS.png",
            "content": header + "\n\n" + chunk
        }

        r = requests.post(WEBHOOK, json=payload)
        print("Reminder chunk", i+1, "status:", r.status_code)

    requests.post(WEBHOOK, json={
        "username": "Bang TV Sports",
        "avatar_url": "https://i.imgur.com/5QFQKpS.png",
        "content": "----------------------\n"
    })

# ---------- Main ----------

if __name__ == "__main__":
    reminders = load_reminders()
    now = datetime.now(timezone.utc).astimezone()

    # Fetch sport-tv-guide events
    all_events = []
    for i in range(3):
        d = now.date() + timedelta(days=i)
        html, date_str = fetch_day(d)
        all_events.extend(parse_events(html, date_str))

    # Fetch Sky EPG
    try:
        epg_xml = fetch_sky_epg()
        programmes = parse_sky_epg(epg_xml)
    except Exception as e:
        print("Error fetching Sky EPG:", e)
        programmes = []

    # Merge Sky channels
    all_events = merge_sky_channels(all_events, programmes)

    # Group events by unique key
    grouped = {}
    for e in all_events:
        key = f"{e['date']}|{e['time']}|{e['title']}"
        grouped.setdefault(key, {"event": e})

    # Check for reminders
    for key, data in grouped.items():
        e = data["event"]

        event_dt = parse_nz_datetime(e["date"], e["time"])
        diff = event_dt - now

        if timedelta(minutes=0) < diff <= timedelta(minutes=30):
            if FORCE or key not in reminders:

                dt = datetime.strptime(e["date"], "%Y-%m-%d")
                pretty_date = f"{dt.strftime('%A')} {ordinal(dt.day)} {dt.strftime('%B %Y')}"

                emoji = SPORT_EMOJIS.get(e["sport"], "🏆")
                channels = ", ".join(e["channels"])

                msg = (
                    f"----------------------\n"
                    f"{emoji} **{e['sport']} — {e['title']}**\n"
                    f"📅 {pretty_date}\n"
                    f"🕒 Starts at **{e['time']} NZT**\n"
                    f"📺 Channels: **{channels}**\n"
                    f"📝 {e['description']}\n"
                    f"----------------------\n"
                )

                send_split_reminder(msg)
                reminders[key] = True

    save_reminders(reminders)
