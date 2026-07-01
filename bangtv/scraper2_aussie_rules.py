import os
import sys
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import re

# ------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------

NZ_TZ = timezone(timedelta(hours=12))

URL = "https://sport-tv-guide.live/live/aussie-rules"

# FORCE MODE (manual testing)
FORCE = "force" in sys.argv

# Load cookies from GitHub Secrets
COOKIES = json.loads(os.getenv("SPORT_TV_COOKIES", "{}"))

# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------

def parse_short_date(short):
    """
    Convert '3 Jul' → '2026-07-03'
    """
    short = short.strip()
    day, mon = short.split()

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
    """
    Clean AM/PM formatting and ensure consistency.
    """
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

    if FORCE:
        print("\n=== COOKIES LOADED ===")
        print(json.dumps(COOKIES, indent=2))

    # Fetch page with cookies
    r = requests.get(URL, cookies=COOKIES, timeout=20)
    r.raise_for_status()

    if FORCE:
        print("\n=== RAW HTML (first 5000 chars) ===")
        print(r.text[:5000])
        print("\n=== END RAW HTML ===\n")

    soup = BeautifulSoup(r.text, "html.parser")
    events = []

    current_date = None

    # We scan both date separators + event blocks
    blocks = soup.select(".dateSeparator, a.article.flag")

    if FORCE:
        print(f"Found {len(blocks)} blocks")

    for elem in blocks:

        # ------------------------------------------------------------
        # DATE SEPARATOR
        # ------------------------------------------------------------
        if "dateSeparator" in elem.get("class", []):
            short_date = elem.select_one(".date").get_text(strip=True)
            weekday = elem.select_one(".dateCenter").get_text(strip=True)

            full_date = parse_short_date(short_date)
            current_date = full_date

            if FORCE:
                print("\n=== DATE SEPARATOR ===")
                print(f"Short: {short_date}")
                print(f"Weekday: {weekday}")
                print(f"Full NZ Date: {full_date}")

            continue

        # ------------------------------------------------------------
        # EVENT BLOCK
        # ------------------------------------------------------------
        if "article" in elem.get("class", []):

            row = elem.select_one(".row")
            if not row:
                continue

            # SPORT + TIME (desktop layout)
            time_block = row.select_one(".main.time")
            if time_block:
                sport = time_block.select_one(".typeName").get_text(strip=True)
                time_str = time_block.select_one("b").get_text(strip=True)
            else:
                # fallback for mobile layout
                sport = row.select_one(".typeName").get_text(strip=True)
                time_str = row.select_one("b").get_text(strip=True)

            # TEAMS + LEAGUE
            title_block = row.select_one(".col-inline")
            if title_block:
                teams = title_block.select_one(".text-nowrap").get_text(strip=True)
                league = title_block.select("div.text-nowrap")[1].get_text(strip=True)
            else:
                teams = "Unknown"
                league = "Unknown"

            # CHANNELS
            channels = []
            for img in row.select("img[title]"):
                ch = img.get("title", "").strip()
                if ch:
                    channels.append(ch)

            # FORCE date if missing
            if not current_date and FORCE:
                current_date = datetime.now(NZ_TZ).strftime("%Y-%m-%d")

            event = {
                "date": current_date,
                "sport": sport,
                "time": fix_time(time_str),
                "teams": teams,
                "league": league,
                "channels": channels,
                "url": "https://sport-tv-guide.live" + elem.get("href")
            }

            if FORCE:
                print("\n=== EVENT FOUND ===")
                print(json.dumps(event, indent=2))

            events.append(event)

    print("\n=== SCRAPER 2 COMPLETE ===")
    print(f"Total events: {len(events)}")

    return events


# ------------------------------------------------------------
# MAIN
# ------------------------------------------------------------

if __name__ == "__main__":
    data = scrape()

    print("\n=== FINAL OUTPUT ===")
    print(json.dumps(data, indent=2))
