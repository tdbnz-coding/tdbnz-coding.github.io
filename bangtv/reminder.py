import os
import json
import sys
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import re

# ---------------------------------------
# CONFIG
# ---------------------------------------

FORCE = "force" in sys.argv
WEBHOOK = os.getenv("DISCORD_WEBHOOK")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REMINDER_FILE = os.path.join(BASE_DIR, "reminder.json")

if not os.path.exists(REMINDER_FILE):
    with open(REMINDER_FILE, "w") as f:
        json.dump({}, f)

NZ_TZ = timezone(timedelta(hours=12))

# ---------------------------------------
# TIME HELPERS
# ---------------------------------------

def nz_now():
    return datetime.now(timezone.utc).astimezone(NZ_TZ)

def fix_time_format(t):
    if not t:
        return t
    t = t.strip().replace("  ", " ")
    t = re.sub(r"(?i)\b(am|pm)\b", lambda m: m.group(1).upper(), t)
    t = re.sub(r"(?i)(\d)(AM|PM)$", r"\1 \2", t)
    t = re.sub(r"(?i)(\d{1,2}:\d{2})(AM|PM)$", r"\1 \2", t)
    return t.strip()

def parse_nz_time(date_str, time_str):
    time_str = fix_time_format(time_str)
    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
    return dt.replace(tzinfo=NZ_TZ)

# ---------------------------------------
# CHANNEL NORMALISATION
# ---------------------------------------

def normalize_channel_name(name):
    if not name:
        return ""
    n = name.strip()
    n = re.sub(r"\s*\(HD\)|\s*\(NZ\)|HD$", "", n, flags=re.I)
    n = re.sub(r"\s*\+\d+$|\s*\+$", "", n)
    return n.strip()

def append_nz_if_epg(channel, from_epg):
    return f"{channel} NZ" if from_epg else channel

# ---------------------------------------
# SKY EPG
# ---------------------------------------

SKY_EPG_URL = "https://i.mjh.nz/SkyGo/epg.xml"

SKY_SPORT_ORDER = [
    "Sky Sport 1","Sky Sport 2","Sky Sport 3","Sky Sport 4",
    "Sky Sport 5","Sky Sport 6","Sky Sport 7","Sky Sport 8",
    "Sky Sport 9","Sky Sport Select"
]

def is_sky_sport_channel(name):
    return normalize_channel_name(name) in SKY_SPORT_ORDER

def parse_epg_datetime(dt_str):
    m = re.match(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-]\d{4})", dt_str)
    if not m:
        return None
    y, mo, d, h, mi, s, off = m.groups()
    dt = datetime(int(y), int(mo), int(d), int(h), int(mi), int(s))
    sign = 1 if off[0] == "+" else -1
    tz = timezone(sign * timedelta(hours=int(off[1:3]), minutes=int(off[3:5])))
    return dt.replace(tzinfo=tz)

def fetch_sky_epg():
    r = requests.get(SKY_EPG_URL, timeout=20)
    r.raise_for_status()
    return r.content

def parse_sky_epg(xml_data):
    root = ET.fromstring(xml_data)
    names = {ch.get("id"): ch.find("display-name").text.strip()
             for ch in root.findall("channel")}

    out = []
    for prog in root.findall("programme"):
        cid = prog.get("channel")
        if cid not in names:
            continue

        raw = names[cid]
        if not is_sky_sport_channel(raw):
            continue

        start = parse_epg_datetime(prog.get("start"))
        if not start:
            continue

        nz_start = start.astimezone(NZ_TZ)

        title_el = prog.find("title")
        desc_el = prog.find("desc")

        out.append({
            "channel": normalize_channel_name(raw),
            "from_epg": True,
            "date": nz_start.strftime("%Y-%m-%d"),
            "time": nz_start.strftime("%I:%M %p"),
            "title": title_el.text.strip() if title_el is not None else "",
            "description": desc_el.text.strip() if desc_el is not None else "",
        })

    return out

# ---------------------------------------
# SPORT TV GUIDE
# ---------------------------------------

BASE_URL = (
    "https://sport-tv-guide.live/sportwidget/1e479ae78733"
    "?time_zone=Pacific/Auckland"
    "&fc=29,3,102,14,1,7,2"
    "&time12=1"
    "&sports=28,29,1,5,18,7,8,10,39,40,13"
    "&bg=f8f8f9&bgs=b7b7b7&grp=1&sd=0&lng=1&typeID=0"
)

def fetch_day(date_obj):
    ds = date_obj.isoformat()
    r = requests.get(BASE_URL + f"&date={ds}", timeout=15)
    r.raise_for_status()
    return r.text, ds

def parse_events(html, date_str):
    soup = BeautifulSoup(html, "html.parser")
    out = []

    for a in soup.select("a.article"):
        row = a.select_one(".row")
        if not row:
            continue

        sport = row.select_one(".typeName").get_text(strip=True)
        time_str = row.select_one(".time b").get_text(strip=True)

        blocks = row.select(".col-xs-8 .text-nowrap")
        title = blocks[0].get_text(strip=True)
        desc = blocks[1].get_text(strip=True) if len(blocks) > 1 else ""

        img = row.select_one(".col-xs-2 img[title]")
        channel = normalize_channel_name(img["title"].strip()) if img else "Unknown"

        out.append({
            "date": date_str,
            "sport": sport,
            "time": time_str,
            "title": title,
            "description": desc,
            "channel": channel,
            "from_epg": False,
        })

    return out

# ---------------------------------------
# MERGING
# ---------------------------------------

def merge_events(events, epg):
    merged = []

    # Add EPG first
    for p in epg:
        merged.append({
            "event": {
                "date": p["date"],
                "sport": p["sport"],
                "time": p["time"],
                "title": p["title"],
                "description": p["description"],
            },
            "channels": [(p["channel"], True)]
        })

    # Add STVG events
    for e in events:
        merged.append({
            "event": e,
            "channels": [(e["channel"], False)]
        })

    return merged

# ---------------------------------------
# REMINDER LOGIC
# ---------------------------------------

def minutes_to_event(event):
    now = nz_now()
    e = event["event"]
    dt = parse_nz_time(e["date"], e["time"])
    diff = (dt - now).total_seconds()
    return diff / 60  # minutes

def should_send(event):
    mins = minutes_to_event(event)
    return 0 < mins <= 30  # 30-minute window

def wording_for_minutes(mins):
    if mins >= 25:
        return "30 minutes to kickoff"
    if mins >= 10:
        return f"{mins} minutes to kickoff"
    if mins >= 1:
        return f"Starting shortly — {mins} minutes"
    return "LIVE NOW!"

def send_reminder(event):
    if not WEBHOOK:
        return

    e = event["event"]
    mins = int(minutes_to_event(event))
    phrase = wording_for_minutes(mins)

    channels = [
        append_nz_if_epg(ch, is_epg)
        for ch, is_epg in event["channels"]
    ]

    msg = (
        f"🔔 **Reminder — {phrase}!**\n"
        f"🏆 {e['sport']} — {e['title']}\n"
        f"🕒 {e['time']} NZT\n"
        f"📺 {', '.join(channels)}\n"
        f"📝 {e['description']}\n"
        f"========================="
    )

    requests.post(WEBHOOK, json={"content": msg})

# ---------------------------------------
# MAIN
# ---------------------------------------

if __name__ == "__main__":
    today = nz_now().date()

    # TODAY ONLY
    html, date_str = fetch_day(today)
    events = parse_events(html, date_str)

    epg = parse_sky_epg(fetch_sky_epg())
    merged = merge_events(events, epg)

    sent = json.load(open(REMINDER_FILE))

    for event in merged:
        key = f"{event['event']['date']}|{event['event']['time']}|{event['event']['title']}"

        if key not in sent or FORCE:
            if should_send(event):
                send_reminder(event)
                sent[key] = "sent"

    json.dump(sent, open(REMINDER_FILE, "w"))
