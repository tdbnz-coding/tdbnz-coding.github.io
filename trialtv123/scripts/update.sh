#!/bin/bash

# Resolve the correct directory of the repo
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PLAYLIST_DIR="$REPO_DIR/trialtv123"

fetch_trial() {
    TARGET_FILE=$1

    EMAIL="trial$(date +%s%N)@gmail.com"

    HTML=$(curl -s -X POST "https://gr8iptv.com/free-trial/" \
      -d "gtv_trial_action=1" \
      -d "trial_type=m3u" \
      -d "email=$EMAIL")

    echo "Trial fetched."

    M3U_URL=$(echo "$HTML" | grep -oP 'data-copy="\K[^"]+' | sed 's/&amp;/\&/g')

    echo "Extracted M3U URL."

    # Force update: always overwrite
    curl -s -o "$PLAYLIST_DIR/$TARGET_FILE" "$M3U_URL"

    echo "$TARGET_FILE updated."
}

# Update both files
fetch_trial "thomas.m3u"
fetch_trial "duncan.m3u"
