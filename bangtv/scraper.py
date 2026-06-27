import os
import sys
import json
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import re

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

# ---------- Sky EPG helpers ----------

def normalize_channel_name(name: str) -> str:
    if not name:
        return ""
    n = name.strip()
    n = re.sub(r"\s*\(HD\)", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*\(NZ\)", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*HD$", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*\+\d+$", "", n)  # remove +1 etc
    n = re.sub(r"\s*\+$", "", n)
    return n.strip()

def is_sky_sport_channel(name: str) -> bool:
    base = normalize_channel_name(name)
    return base in SKY_SPORT_ORDER

def parse_epg_datetime(dt_str: str) -> datetime:
    # Typical format: 20240627T103000+1200
    # We parse manually
    m = re.match(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-]\d{4})", dt_str)
    if not m:
        return None
    year, month, day, hour, minute, second, offset = m.groups()
    dt = datetime(
        int(year), int(month), int(day),
        int(hour), int(minute), int(second)
    )
    # offset like +1200
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
    # Map channel id -> display name
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

# ---------- Fuzzy matching ----------

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
    # Require at least 2 shared tokens (e.g., both team names)
    return len(inter) >= 2

def parse_nz_time(date_str: str, time_str: str) -> datetime:
    # Sport-TV-Guide time is already NZT in 12h format, e.g. "10:30 AM"
    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
    nz = timezone(timedelta(hours=12))
    return dt.replace(tzinfo=nz)

def merge_sky_channels_into_events(events, programmes):
    # For each event, find matching Sky programmes by fuzzy title + time window
    for e in events:
        try:
            event_dt = parse_nz_time(e["date"], e["time"])
        except Exception:
            continue

        merged_channels = set()
        # Start with channel from sport-tv-guide if it's a Sky Sport channel
        if is_sky_sport_channel(e["channel"]):
            merged_channels.add(normalize_channel_name(e["channel"]))

        for p in programmes:
            # Time window: programme must overlap event start within +/- 10 minutes
            diff = abs((p["start"] - event_dt).total_seconds())
            if diff > 10 * 60:
                continue

            if not fuzzy_title_match(e["title"], p["title"]):
                continue

            merged_channels.add(p["channel"])

        if merged_channels:
            # Sort channels in Sky Sport order
            ordered = [c for c in SKY_SPORT_ORDER if c in merged_channels]
            e["channels_merged"] = ordered
        else:
            e["channels_merged"] = [e["channel"]]

    return events

# ---------- Discord sending ----------

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
            channels = e.get("channels_merged", [e["channel"]])
            chan_str = ", ".join(channels)

            lines.append(
                f"{emoji} **{e['sport']} — {e['title']}**\n"
                f"🕒 {e['time']} NZT\n"
                f"📺 {chan_str}\n"
                f"📝 {e['description']}\n"
            )

        # Add separator at end of day
        lines.append("----------------------")
        lines.append("")

        # Split into chunks without cutting lines
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

        # Separator between days
        requests.post(WEBHOOK, json={
            "username": "Bang TV Sports",
            "avatar_url": "https://i.imgur.com/5QFQKpS.png",
            "content": "----------------------\n"
        })

# ---------- main ----------

if __name__ == "__main__":
    last = load_last()
    all_events = []

    # Fetch sport-tv-guide events
    for d in get_dates():
        html, date_str = fetch_day(d)
        all_events.extend(parse_events(html, date_str))

    # Fetch and parse Sky EPG
    try:
        epg_xml = fetch_sky_epg()
        programmes = parse_sky_epg(epg_xml)
    except Exception as e:
        print("Error fetching/parsing Sky EPG:", e)
        programmes = []

    # Merge Sky channels into events
    all_events = merge_sky_channels_into_events(all_events, programmes)

    # Hash the full message text (including merged channels)
    msg = "\n".join([
        f"{e['date']}|{e['sport']}|{e['time']}|{e['title']}|{e['description']}|{','.join(e.get('channels_merged', [e['channel']]))}"
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
