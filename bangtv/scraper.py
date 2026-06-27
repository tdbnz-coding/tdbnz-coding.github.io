import os
import sys
import json
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import re

FORCE = "force" in sys.argv
WEBHOOK = os.getenv("DISCORD_WEBHOOK")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LAST_FILE = os.path.join(BASE_DIR, "last.json")

if not os.path.exists(LAST_FILE):
    with open(LAST_FILE, "w") as f:
        json.dump({"hash": None}, f)

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

def fix_time_format(t):
    if not t:
        return t

    t = t.strip().replace("  ", " ")

    t = re.sub(r"(?i)\b(am|pm)\b", lambda m: m.group(1).upper(), t)
    t = re.sub(r"(?i)(\d)(AM|PM)$", r"\1 \2", t)
    t = re.sub(r"(?i)(\d{1,2}:\d{2})(AM|PM)$", r"\1 \2", t)

    return t.strip()

def append_nz_if_epg(channel, from_epg):
    return f"{channel} NZ" if from_epg else channel

def normalize_channel_name(name):
    if not name:
        return ""
    n = name.strip()
    n = re.sub(r"\s*\(HD\)", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*\(NZ\)", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*HD$", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*\+\d+$", "", n)
    n = re.sub(r"\s*\+$", "", n)
    return n.strip()

def is_sky_sport_channel(name):
    return normalize_channel_name(name) in SKY_SPORT_ORDER

def parse_epg_datetime(dt_str):
    m = re.match(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-]\d{4})", dt_str)
    if not m:
        return None
    y, mo, d, h, mi, s, off = m.groups()
    dt = datetime(int(y), int(mo), int(d), int(h), int(mi), int(s)
    )
    sign = 1 if off[0] == "+" else -1
    oh = int(off[1:3])
    om = int(off[3:5])
    tz = timezone(sign * timedelta(hours=oh, minutes=om))
    return dt.replace(tzinfo=tz)

def fetch_sky_epg():
    r = requests.get(SKY_EPG_URL, timeout=20)
    r.raise_for_status()
    return r.content

def parse_sky_epg(xml_data):
    root = ET.fromstring(xml_data)
    channel_names = {}

    for ch in root.findall("channel"):
        cid = ch.get("id")
        name_el = ch.find("display-name")
        if cid and name_el is not None:
            channel_names[cid] = name_el.text.strip()

    programmes = []
    for prog in root.findall("programme"):
        cid = prog.get("channel")
        if cid not in channel_names:
            continue

        raw_name = channel_names[cid]
        if not is_sky_sport_channel(raw_name):
            continue

        start = parse_epg_datetime(prog.get("start"))
        stop = parse_epg_datetime(prog.get("stop"))
        if not start or not stop:
            continue

        title_el = prog.find("title")
        desc_el = prog.find("desc")

        programmes.append({
            "channel": normalize_channel_name(raw_name),
            "from_epg": True,
            "start": start,
            "stop": stop,
            "title": title_el.text.strip() if title_el is not None else "",
            "description": desc_el.text.strip() if desc_el is not None else "",
        })

    return programmes

def clean_title(t):
    t = t.lower()
    t = t.replace(" vs ", " v ")
    t = t.replace(" vs. ", " v ")
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def title_tokens(t):
    return set(clean_title(t).split())

def fuzzy_title_match(a, b):
    ta = title_tokens(a)
    tb = title_tokens(b)
    return len(ta & tb) >= 2

def parse_nz_time(date_str, time_str):
    time_str = fix_time_format(time_str)
    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
    return dt.replace(tzinfo=timezone(timedelta(hours=12)))

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
            "channel": normalize_channel_name(channel),
            "from_epg": False,
        })

    return events

def events_match(e1, e2):
    if e1["date"] != e2["date"]:
        return False

    dt1 = parse_nz_time(e1["date"], e1["time"])
    dt2 = parse_nz_time(e2["date"], e2["time"])
    if abs((dt1 - dt2).total_seconds()) > 10 * 60:
        return False

    return fuzzy_title_match(e1["title"], e2["title"])

def merge_events(events, programmes):
    merged_groups = []

    for p in programmes:
        merged_groups.append({
            "event": {
                "date": p["start"].astimezone(
                    timezone(timedelta(hours=12))
                ).strftime("%Y-%m-%d"),
                "sport": "Unknown",
                "time": p["start"].astimezone(
                    timezone(timedelta(hours=12))
                ).strftime("%I:%M %p"),
                "title": p["title"],
                "description": p["description"],
            },
            "channels": [(p["channel"], True)]
        })

    for e in events:
        placed = False

        for g in merged_groups:
            if events_match(e, g["event"]):
                g["channels"].append((e["channel"], False))
                placed = True
                break

        if not placed:
            merged_groups.append({
                "event": e,
                "channels": [(e["channel"], False)]
            })

    for g in merged_groups:
        g["channels"] = sorted(
            g["channels"],
            key=lambda x: SKY_SPORT_ORDER.index(x[0])
            if x[0] in SKY_SPORT_ORDER else 999
        )

    return merged_groups

def send_schedule(groups):
    if not WEBHOOK:
        print("Missing webhook")
        return

    MAX = 1800  # safety margin under Discord's 2000-char limit

    days = {}
    for g in groups:
        d = g["event"]["date"]
        days.setdefault(d, []).append(g)

    sorted_dates = sorted(days.keys())

    for day_index, date_str in enumerate(sorted_dates):
        items = days[date_str]
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        pretty = f"{dt.strftime('%A')} {ordinal(dt.day)} {dt.strftime('%B %Y')}"

        # Build lines for this day (no header here; header added per message)
        lines = []
        for g in items:
            e = g["event"]
            emoji = SPORT_EMOJIS.get(e["sport"], "🏆")

            chan_list = [
                append_nz_if_epg(ch, is_epg)
                for ch, is_epg in g["channels"]
            ]

            lines.append(
                f"{emoji} **{e['sport']} — {e['title']}**\n"
                f"🕒 {e['time']} NZT\n"
                f"📺 {', '.join(chan_list)}\n"
                f"📝 {e['description']}\n"
            )

        lines.append("----------------------")

        # Chunk lines into message-sized blocks
        chunks = []
        current = ""

        for line in lines:
            if len(current) + len(line) > MAX and current:
                chunks.append(current)
                current = line + "\n"
            else:
                current += line + "\n"

        if current.strip():
            chunks.append(current)

        # Send chunks with 30s delay between posts, separator as its own message
        for i, chunk in enumerate(chunks):
            if i == 0:
                header = f"📅 **{pretty}**"
            else:
                header = f"📅 **{pretty} (continued)**"

            # Blank line at top, then header, then blank line, then content
            content = "\n" + header + "\n\n" + chunk

            requests.post(WEBHOOK, json={
                "username": "Bang TV Sports",
                "avatar_url": "https://i.imgur.com/5QFQKpS.png",
                "content": content
            })
            time.sleep(30)

            # If there is another chunk after this, send separator as its own message
            if i < len(chunks) - 1:
                sep_content = "\n\n=========================\n\n"
                requests.post(WEBHOOK, json={
                    "content": sep_content
                })
                time.sleep(30)

        # After finishing a day, wait 61 seconds before next day (if any)
        if day_index < len(sorted_dates) - 1:
            time.sleep(61)

if __name__ == "__main__":
    all_events = []
    today = datetime.now(timezone.utc).astimezone().date()

    for i in range(3):
        html, date_str = fetch_day(today + timedelta(days=i))
        all_events.extend(parse_events(html, date_str))

    epg_xml = fetch_sky_epg()
    programmes = parse_sky_epg(epg_xml)

    merged = merge_events(all_events, programmes)

    msg_hash = hash(str(merged))
    with open(LAST_FILE) as f:
        last = json.load(f)

    if FORCE or last.get("hash") != msg_hash:
        send_schedule(merged)
        with open(LAST_FILE, "w") as f:
            json.dump({"hash": msg_hash}, f)
    else:
        print("No changes")
