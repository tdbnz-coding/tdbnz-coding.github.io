import os
import sys
import json
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import re

# --- CONFIG ---
WEBHOOK = os.getenv("DISCORD_WEBHOOK")
FORCE = "force" in sys.argv
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LAST_FILE = os.path.join(BASE_DIR, "last.json")

if not os.path.exists(LAST_FILE):
    with open(LAST_FILE, "w") as f:
        json.dump({"hash": None}, f)

# --- CONSTANTS ---
SPORT_EMOJIS = {
    "Football": "⚽", "Rugby": "🏉", "Rugby League": "🏉",
    "Cricket": "🏏", "Tennis": "🎾", "Golf": "⛳",
    "Motorsport": "🏎️", "Basketball": "🏀", "Snooker": "🎱",
    "Aussie rules": "🏉", "Baseball": "⚾", "Ice Hockey": "🏒",
    "Boxing": "🥊", "MMA": "🥋", "Cycling": "🚴",
    "Athletics": "🏃", "Swimming": "🏊"
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

SKY_ORDER = [
    "Sky Sport 1", "Sky Sport 2", "Sky Sport 3", "Sky Sport 4",
    "Sky Sport 5", "Sky Sport 6", "Sky Sport 7", "Sky Sport 8",
    "Sky Sport 9", "Sky Sport Select"
]

# --- HELPERS ---
def ordinal(n):
    if 11 <= n % 100 <= 13:
        return f"{n}th"
    return f"{n}{['th','st','nd','rd','th'][min(n % 10, 4)]}"

def normalize_channel(name):
    if not name:
        return ""
    n = name.strip()
    n = re.sub(r"\s*\(HD\)|\s*\(NZ\)|HD$", "", n, flags=re.I)
    n = re.sub(r"\s*\+\d+$|\s*\+$", "", n)
    return n.strip()

def is_sky(name):
    return normalize_channel(name) in SKY_ORDER

def parse_epg_datetime(dt):
    m = re.match(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-]\d{4})", dt)
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

def parse_sky(xml):
    root = ET.fromstring(xml)
    names = {ch.get("id"): ch.find("display-name").text.strip()
             for ch in root.findall("channel")}

    out = []
    for prog in root.findall("programme"):
        cid = prog.get("channel")
        if cid not in names:
            continue
        raw = names[cid]
        if not is_sky(raw):
            continue

        start = parse_epg_datetime(prog.get("start"))
        stop = parse_epg_datetime(prog.get("stop"))
        if not start or not stop:
            continue

        title = prog.find("title").text.strip() if prog.find("title") is not None else ""
        desc = prog.find("desc").text.strip() if prog.find("desc") is not None else ""

        nz = start.astimezone(timezone(timedelta(hours=12)))

        out.append({
            "date": nz.strftime("%Y-%m-%d"),
            "sport": "Unknown",
            "time": nz.strftime("%I:%M %p"),
            "title": title,
            "description": desc,
            "channel": normalize_channel(raw),
            "from_epg": True
        })
    return out

def fix_time(t):
    if not t:
        return t
    t = t.strip().replace("  ", " ")
    t = re.sub(r"(?i)\b(am|pm)\b", lambda m: m.group(1).upper(), t)
    t = re.sub(r"(?i)(\d)(AM|PM)$", r"\1 \2", t)
    t = re.sub(r"(?i)(\d{1,2}:\d{2})(AM|PM)$", r"\1 \2", t)
    return t.strip()

def parse_nz(date, time):
    time = fix_time(time)
    dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %I:%M %p")
    return dt.replace(tzinfo=timezone(timedelta(hours=12)))

def fetch_day(d):
    ds = d.isoformat()
    r = requests.get(BASE_URL + f"&date={ds}", timeout=15)
    r.raise_for_status()
    return r.text, ds

def parse_events(html, date):
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
        channel = normalize_channel(img["title"].strip()) if img else "Unknown"

        out.append({
            "date": date,
            "sport": sport,
            "time": time_str,
            "title": title,
            "description": desc,
            "channel": channel,
            "from_epg": False
        })
    return out

def fuzzy(a, b):
    def tok(t):
        t = t.lower().replace(" vs ", " v ")
        t = re.sub(r"[^\w\s]", " ", t)
        return set(re.sub(r"\s+", " ", t).split())
    return len(tok(a) & tok(b)) >= 2

def merge(events, epg):
    groups = []

    # Add EPG first
    for p in epg:
        groups.append({
            "event": {
                "date": p["date"],
                "sport": p["sport"],
                "time": p["time"],
                "title": p["title"],
                "description": p["description"]
            },
            "channels": [(p["channel"], True)]
        })

    # Merge TV Guide events
    for e in events:
        placed = False
        for g in groups:
            if g["event"]["date"] == e["date"]:
                dt1 = parse_nz(g["event"]["date"], g["event"]["time"])
                dt2 = parse_nz(e["date"], e["time"])
                if abs((dt1 - dt2).total_seconds()) <= 600 and fuzzy(g["event"]["title"], e["title"]):
                    g["channels"].append((e["channel"], False))
                    placed = True
                    break
        if not placed:
            groups.append({
                "event": e,
                "channels": [(e["channel"], False)]
            })

    # Sort channels
    for g in groups:
        g["channels"] = sorted(
            g["channels"],
            key=lambda x: SKY_ORDER.index(x[0]) if x[0] in SKY_ORDER else 999
        )

    return groups

def send(groups):
    if not WEBHOOK:
        print("Missing webhook")
        return

    MAX = 1800
    days = {}

    for g in groups:
        d = g["event"]["date"]
        days.setdefault(d, []).append(g)

    for idx, date in enumerate(sorted(days.keys())):
        dt = datetime.strptime(date, "%Y-%m-%d")
        header = f"{dt.strftime('%A')} {ordinal(dt.day)} {dt.strftime('%B %Y')}"

        lines = []
        for g in days[date]:
            e = g["event"]
            emoji = SPORT_EMOJIS.get(e["sport"], "🏆")
            chans = [
                f"{ch} NZ" if epg else ch
                for ch, epg in g["channels"]
            ]

            lines.append(
                f"{emoji} **{e['sport']} — {e['title']}**\n"
                f"🕒 {e['time']} NZT\n"
                f"📺 {', '.join(chans)}\n"
                f"📝 {e['description']}\n"
            )

        chunks = []
        cur = ""

        for line in lines:
            if len(cur) + len(line) > MAX:
                chunks.append(cur)
                cur = line + "\n"
            else:
                cur += line + "\n"

        if cur.strip():
            chunks.append(cur)

        for i, chunk in enumerate(chunks):
            title = f"📅 **{header}**" if i == 0 else f"📅 **{header} (continued)**"
            content = f"\n\n{title}\n\n{chunk}"

            requests.post(WEBHOOK, json={
                "username": "Bang TV Sports",
                "avatar_url": "https://i.imgur.com/5QFQKpS.png",
                "content": content
            })
            time.sleep(30)

            if i < len(chunks) - 1:
                requests.post(WEBHOOK, json={"content": "\n=========================\n"})
                time.sleep(30)

        if idx < len(days) - 1:
            time.sleep(61)

# --- MAIN ---
if __name__ == "__main__":
    today = datetime.now(timezone.utc).astimezone().date()
    all_events = []

    # NEXT 3 DAYS ONLY
    for i in range(1, 4):
        html, ds = fetch_day(today + timedelta(days=i))
        all_events.extend(parse_events(html, ds))

    epg = parse_sky(fetch_sky_epg())
    merged = merge(all_events, epg)

    msg_hash = hash(str(merged))
    with open(LAST_FILE) as f:
        last = json.load(f)

    if FORCE or last.get("hash") != msg_hash:
        send(merged)
        with open(LAST_FILE, "w") as f:
            json.dump({"hash": msg_hash}, f)
    else:
        print("No changes")
