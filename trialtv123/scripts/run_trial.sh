#!/bin/bash

# Function to fetch a fresh trial and save it
fetch_trial() {
    TARGET_FILE=$1

    # Generate random Gmail
    EMAIL="trial$(date +%s%N)@gmail.com"

    # Fetch trial HTML
    HTML=$(curl -s -X POST "https://gr8iptv.com/free-trial/" \
      -d "gtv_trial_action=1" \
      -d "trial_type=m3u" \
      -d "email=$EMAIL")

    echo "Trial fetched."

    # Extract M3U URL (do NOT print it)
    M3U_URL=$(echo "$HTML" | grep -oP 'data-copy="\K[^"]+' | sed 's/&amp;/\&/g')

    echo "Extracted M3U URL."

    # Download playlist
    curl -s -o "$TARGET_FILE" "$M3U_URL"

    echo "$TARGET_FILE updated."
}

# Update both files
fetch_trial "thomas.m3u"
fetch_trial "duncan.m3u"
