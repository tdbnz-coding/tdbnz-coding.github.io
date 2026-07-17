#!/bin/bash

run_trial() {
    NAME=$1
    FILE="./trialtv123/${NAME}.m3u"

    # Generate random email
    RAND=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 10)
    EMAIL="${RAND}@gmail.com"

    echo "Starting trial for $NAME using email: $EMAIL"

    # Submit trial form
    HTML=$(curl -s -X POST "https://www.greatestiptv.com/free-trial/" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      --data "email=${EMAIL}&trial_type=m3u&gtv_trial_action=1")

    # Extract M3U URL
    M3U_URL=$(echo "$HTML" | grep -oP 'data-copy="\K[^"]+')

    if [ -z "$M3U_URL" ]; then
        echo "ERROR: No M3U URL found for $NAME."
        exit 1
    fi

    echo "$NAME M3U URL: $M3U_URL"

    # Download playlist
    curl -s -o "$FILE" "$M3U_URL"

    echo "Saved playlist to $FILE"
}

run_trial "thomas"
run_trial "duncan"
