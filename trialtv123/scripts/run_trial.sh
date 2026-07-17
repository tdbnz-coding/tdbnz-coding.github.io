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

    # Extract raw URL
    RAW_URL=$(echo "$HTML" | grep -oP 'data-copy="\K[^"]+')

    # Decode HTML entities (&amp; → &)
    M3U_URL=$(echo "$RAW_URL" | sed 's/&amp;/\&/g')

    echo "$NAME M3U URL: $M3U_URL"

    curl -s -o "$FILE" "$M3U_URL"

    echo "Saved playlist to $FILE"
}

run_trial "thomas"
run_trial "duncan"
