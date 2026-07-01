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

URL = "https://sport-tv-guide.live/live/aussie-rules"

FORCE = "force" in sys.argv

COOKIES = json.loads(os.getenv("SPORT_TV_COOKIES", "{}"))
WEBHOOK = os.getenv("DISCORD_WEBHOOK")
AVATAR_URL = "https://i.postimg.cc/gkqpYLhP/image.png"


# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------

def ordinal(n):
    """Return ordinal number: 1st, 2nd, 3rd, 4th, etc."""
    if 10 <= n % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def format_date(date_str):
    """Convert YYYY-MM-DD → Monday 23rd March 2026"""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    weekday = dt.strftime("%A")
    month = dt.strftime("%B")
    day = ordinal(dt.day)
    year = dt.year
    return f"{weekday} {day} {month} {year}"


def parse_short_date(short):
    """Convert '3 Jul' → '2026-07-03'"""
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
    """Clean AM/PM formatting."""
    if not t:
        return "00:00 AM" if FORCE else None

    t = t.strip().replace("  ", " ")
    t = re.sub(r"(?i)\b(am|pm)\b", lambda m: m.group(1).upper(), t)
    t = re.sub(r"(?i)(\d)(AM|PM)$", r"\1 \2", t)
    t = re.sub(r"(?i)(\d{1,2}:\d{2})(AM|PM)$", r"\1 \2", t)
    return t.strip()


# ------------------------------------------------------------
# SCRAPER
# ------------------------------------------------------------

def scrape():
    print("\n=== SCRAPER 2 START ===")
    print(f"FORCE MODE: {FORCE}")

    r = requests.get(URL, cookies=COOKIES, timeout=20)
    r.raise_for_status()

    if FORCE:
        print("\n=== RAW HTML (first 5000 chars) ===")
        print(r.text[:5000])
        print("\n=== END RAW HTML ===\n")

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

            # CHANNELS (remove sport names)
            channels = [
                img.get("title", "").strip()
                for img in row.select("img[title]")
                if img.get("title", "").strip() not in ["Aussie rules", "AFL"]
            ]

            # Missing date fallback
            if not current_date and FORCE:
                current_date = datetime.now(NZ_TZ).strftime("%Y-%m-%d")

            events_by_day[current_date].append({
                "time": fix_time(time_str),
                "teams": teams,
                "channels": channels
            })

    return events_by_day


# ------------------------------------------------------------
# DATE FILTERING (NEXT 3 DAYS ONLY)
# ------------------------------------------------------------

def filter_next_three_days(events_by_day):
    now = datetime.now(NZ_TZ)

    # Always start from tomorrow (or "today" if after midnight)
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
# DISCORD POSTING
# ------------------------------------------------------------

def send_to_discord(events_by_day):
    if not WEBHOOK:
        print("No webhook found")
        return

    for date, events in events_by_day.items():

        header = format_date(date)
        message = f"📅 **{header}**\n" \
                  f"────────────────────────────\n"

        for e in events:
            message += (
                f"🕒 {e['time']} — {e['teams']}\n"
                f"📺 {', '.join(e['channels'])}\n\n"
            )

        try:
            r = requests.post(WEBHOOK, json={
                "username": "Bang TV Scraper2",
                "avatar_url": AVATAR_URL,
                "content": message
            })
            print(f"Posted day to Discord ({r.status_code})")

        except Exception as ex:
            print(f"Failed to post: {ex}")


# ------------------------------------------------------------
# MAIN
# ------------------------------------------------------------

if __name__ == "__main__":
    events_by_day = scrape()
    filtered = filter_next_three_days(events_by_day)
    send_to_discord(filtered)

    print("\n=== FINAL OUTPUT ===")
    print(json.dumps(filtered, indent=2))
