#!/bin/bash

# Fetch trial and update M3U file
run_trial() {
    NAME=$1
    FILE="./trialtv123/${NAME}.m3u"

    # Generate random email
    RAND=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 10)
    EMAIL="${RAND}@gmail.com"

    echo "Fetching trial for $NAME using email: $EMAIL"

    # Request trial page
    HTML=$(curl -s -X POST "https://www.greatestiptv.com/free-trial/" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      --data "email=${EMAIL}&trial_type=m3u&gtv_trial_action=1")

    # Extract M3U URL from HTML
    RAW_URL=$(echo "$HTML" | grep -oP 'data-copy="\K[^"]+')

    if [ -z "$RAW_URL" ]; then
        echo "ERROR: Could not extract M3U URL for $NAME"
        echo "# ERROR: No URL extracted" > "$FILE"
        return
    fi

    # Decode HTML entities (&amp; → &)
    M3U_URL=$(echo "$RAW_URL" | sed 's/&amp;/\&/g')

    # Print URL safely (password hidden)
    SAFE_URL=$(echo "$M3U_URL" | sed 's/password=[^&]*/password=HIDDEN/')
    echo "DEBUG URL for $NAME: $SAFE_URL"

    # Download playlist
    curl -s -o "$FILE" "$M3U_URL"

    # Check if file is valid (not 404)
    if grep -q "404 Not Found" "$FILE"; then
        echo "ERROR: Playlist download failed for $NAME (404)"
        echo "# ERROR: 404 returned" >> "$FILE"
    else
        echo "$NAME.m3u downloaded successfully."
    fi

    # Force file to change every run so GitHub commits it
    echo "# Updated: $(date)" >> "$FILE"
}

# Run for both users
run_trial "thomas"
run_trial "duncan"
