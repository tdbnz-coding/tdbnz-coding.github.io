#!/bin/bash

run_trial() {
    NAME=$1
    FILE="./trialtv123/${NAME}.m3u"

    RAND=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 10)
    EMAIL="${RAND}@gmail.com"

    echo "Starting trial for $NAME using email: $EMAIL"

    HTML=$(curl -s -X POST "https://www.greatestiptv.com/free-trial/" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      --data "email=${EMAIL}&trial_type=m3u&gtv_trial_action=1")

    RAW_URL=$(echo "$HTML" | grep -oP 'data-copy="\K[^"]+')
    M3U_URL=$(echo "$RAW_URL" | sed 's/&amp;/\&/g')

    curl -s -o "$FILE" "$M3U_URL"

    # Force file to be different every run
    echo "# Updated: $(date)" >> "$FILE"

    echo "Saved playlist to $FILE"
}

run_trial "thomas"
run_trial "duncan"
