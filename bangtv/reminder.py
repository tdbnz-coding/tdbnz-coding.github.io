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
    dt = datetime(int(y), int(mo), int(d), int(h), int(mi), int(s))
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
