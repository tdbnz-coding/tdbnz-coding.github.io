#!/bin/bash

run_trial() {
    NAME=$1
    FILE="trialtv123/${NAME}.m3u"

    # Generate random email
    RAND=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 10)
    EMAIL="${RAND}@gmail.com"

    echo "Starting trial for $NAME using email: $EMAIL"

    # Submit trial form and wait for full HTML response
    HTML=$(curl -s -X POST "https://www.greatestiptv.com/free-trial/" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      --data "email=${EMAIL}&trial_type=m3u&gtv_trial_action=1")

    # Extract the REAL M3U URL from the copy button
    M3U_URL=$(echo "$HTML" | grep -oP 'data-copy="\K[^"]+')

    if [ -z "$M3U_URL" ]; then
        echo "ERROR: No M3U URL found for $NAME. Trial page may not have loaded."
        exit 1
    fi

    echo "$NAME M3U URL found: $M3U_URL"

    # Download the actual playlist file
    curl -s -o "$FILE" "$M3U_URL"

    echo "Saved playlist to $FILE"
}

# Run twice
run_trial "thomas"
run_trial "duncan"
