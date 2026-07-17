#!/bin/bash

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

    curl -s -o "trialtv123/$TARGET_FILE" "$M3U_URL"

    echo "$TARGET_FILE updated."
}

fetch_trial "thomas.m3u"
fetch_trial "duncan.m3u"
