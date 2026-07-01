import os
import sys
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import re
from collections import defaultdict

# ------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------

NZ_TZ = timezone(timedelta(hours=12))

URLS = [
    ("Aussie Rules", "https://sport-tv-guide.live/live/aussie-rules"),
    ("Rugby League", "https://sport-tv-guide.live/live/rugby-league"),
    ("Football", "https://sport-tv-guide.live/live/football"),
    ("Basketball", "https://sport-tv-guide.live/live/basketball"),
    ("Motorsport", "https://sport-tv-guide.live/live/motorsport"),
    ("Tennis", "https://sport-tv-guide.live/live/tennis"),
    ("Cricket", "https://sport-tv-guide.live/live/cricket"),
    ("Golf", "https://sport-tv-guide.live/live/golf"),
    ("Horse Racing", "https://sport-tv-guide.live/live/horse-racing"),
    ("Rugby Union", "https://sport-tv-guide.live/live/rugby-union"),
    ("WWE", "https://sport-tv-guide.live/live/wwe"),
    ("Boxing", "https://sport-tv-guide.live/live/boxing"),
    ("Baseball", "https://sport-tv-guide.live/live/baseball"),
    ("Snooker", "https://sport-tv-guide.live/live/snooker"),
    ("Darts", "https://sport-tv-guide.live/live/darts"),
    ("NFL", "https://sport-tv-guide.live/live/nfl"),
    ("Squash", "https://sport-tv-guide.live/live/squash"),
    ("Field Hockey", "https://sport-tv-guide.live/live/field-hockey"),
    ("Netball", "https://sport-tv-guide.live/live/netball"),
    ("Ice Hockey", "https://sport-tv-guide.live/live/ice-hockey"),
]

FORCE = "force" in sys.argv

COOKIES = json.loads(os.getenv("SPORT_TV_COOKIES", "{}"))
WEBHOOK = os.getenv("DISCORD_WEBHOOK")
AVATAR_URL = "https://i.postimg.cc/gkqpYLhP/image.png"

DISCORD_LIMIT = 1800  # safe split point


# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------

def ordinal(n):
    if 10 <= n % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def format_date(date_str):
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    weekday = dt.strftime("%A")
    month = dt.strftime("%B")
    day = ordinal(dt.day)
    year = dt.year
    return f"{weekday} {day} {month} {year}"


def parse_short_date(short):
    day, mon = short.strip().split()

    months = {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
        "May": 5, "Jun": 6, "Jul": 7, "Aug": 8,
        "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
    }

    month_num = months[mon]
    year = datetime.now(NZ_TZ).year

    dt = datetime(year, month_num, int(day), tzinfo=NZ_TZ)
    return dt.strftime("%Y-%m-%d")


def fix_time(t):
    if not t:
        return "00:00 AM" if FORCE else None

    t = t.strip().replace("  ", " ")
    t = re.sub(r"(?i)\b(am|pm)\b", lambda m: m.group(1).upper(), t)
    t = re.sub(r"(?i)(\d)(AM|PM)$", r"\1 \2", t)
    t = re.sub(r"(?i)(\d{1,2}:\d{2})(AM|PM)$", r"\1 \2", t)
    return t.strip()


# ------------------------------------------------------------
# SCRAPER FOR ONE URL
# ------------------------------------------------------------

SPORT_TITLES_TO_EXCLUDE = {
    "Aussie rules", "AFL",
    "Rugby Union", "Rugby", "Union", "Super Rugby",
    "Rugby League", "NRL", "League",
    "Football", "Soccer",
    "Basketball",
    "Motorsport",
    "Tennis",
    "Cricket",
    "Golf",
    "Horse Racing",
    "WWE",
    "Boxing",
    "Baseball",
    "Snooker",
    "Darts",
    "NFL",
    "Squash",
    "Field Hockey",
    "Netball",
    "Ice Hockey",
}

def scrape_url(sport_name, url):
    print(f"\n=== SCRAPING {sport_name} ===")

    r = requests.get(url, cookies=COOKIES, timeout=20)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")
    events_by_day = defaultdict(list)

    current_date = None
    blocks = soup.select(".dateSeparator, a.article.flag")

    for elem in blocks:

        # DATE SEPARATOR
        if "dateSeparator" in elem.get("class", []):
            short_date = elem.select_one(".date").get_text(strip=True)
            current_date = parse_short_date(short_date)
            continue

        # EVENT BLOCK
        if "article" in elem.get("class", []):

            row = elem.select_one(".row")
            if not row:
                continue

            # TIME
            time_block = row.select_one(".main.time")
            if time_block:
                time_str = time_block.select_one("b").get_text(strip=True)
            else:
                time_str = row.select_one("b").get_text(strip=True)

            # TEAMS
            title_block = row.select_one(".col-inline")
            teams = title_block.select_one(".text-nowrap").get_text(strip=True) if title_block else "Unknown"

            # DESCRIPTION (league or round)
            desc_block = title_block.select("div.text-nowrap")[1].get_text(strip=True) if title_block else ""

            # CHANNELS (remove sport names)
            channels = [
                img.get("title", "").strip()
                for img in row.select("img[title]")
                if img.get("title", "").strip() not in SPORT_TITLES_TO_EXCLUDE
            ]

            if not current_date and FORCE:
                current_date = datetime.now(NZ_TZ).strftime("%Y-%m-%d")

            events_by_day[current_date].append({
                "sport": sport_name,
                "time": fix_time(time_str),
                "teams": teams,
                "desc": desc_block,
                "channels": channels
            })

    return events_by_day


# ------------------------------------------------------------
# MERGE MULTIPLE URL RESULTS
# ------------------------------------------------------------

def merge_events():
    merged = defaultdict(list)

    for sport_name, url in URLS:
        data = scrape_url(sport_name, url)
        for day, events in data.items():
            merged[day].extend(events)

    return merged


# ------------------------------------------------------------
# NEXT 3 DAYS FILTERING
# ------------------------------------------------------------

def filter_next_three_days(events_by_day):
    now = datetime.now(NZ_TZ)
    start_day = now.date() + timedelta(days=1)

    days_to_post = [
        start_day,
        start_day + timedelta(days=1),
        start_day + timedelta(days=2)
    ]

    filtered = {}
    for d in days_to_post:
        key = d.strftime("%Y-%m-%d")
        if key in events_by_day:
            filtered[key] = events_by_day[key]

    return filtered


# ------------------------------------------------------------
# DISCORD POSTING WITH AUTO-SPLIT + SEPARATORS
# ------------------------------------------------------------

def send_to_discord(events_by_day):
    if not WEBHOOK:
        print("No webhook found")
        return

    for date, events in events_by_day.items():

        header = format_date(date)
        base_header = f"📅 **{header}**\n────────────────────────────\n"

        message = base_header

        for e in events:

            block = (
                f"🏉 {e['sport']} — {e['teams']}\n"
                f"📘 {e['desc']}\n"
                f"📺 {', '.join(e['channels'])}\n\n"
                f"====\n\n"
            )

            if len(message) + len(block) > DISCORD_LIMIT:
                requests.post(WEBHOOK, json={
                    "username": "Bang TV Scraper2",
                    "avatar_url": AVATAR_URL,
                    "content": message
                })
                print("Posted split part")

                message = f"📅 **{header} (continued)**\n────────────────────────────\n"

            message += block

        requests.post(WEBHOOK, json={
            "username": "Bang TV Scraper2",
            "avatar_url": AVATAR_URL,
            "content": message
        })
        print("Posted final part")


# ------------------------------------------------------------
# MAIN
# ------------------------------------------------------------

if __name__ == "__main__":
    merged = merge_events()
    filtered = filter_next_three_days(merged)
    send_to_discord(filtered)

    print("\n=== FINAL OUTPUT ===")
    print(json.dumps(filtered, indent=2))
