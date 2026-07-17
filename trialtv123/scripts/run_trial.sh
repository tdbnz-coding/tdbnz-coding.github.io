#!/bin/bash

run_trial() {
    NAME=$1
    FILE="trialtv123/${NAME}.m3u"

    # Generate random email
    RAND=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 10)
    EMAIL="${RAND}@gmail.com"

    echo "Running trial for $NAME using email $EMAIL"

    # Submit trial form
    HTML=$(curl -s -X POST "https://www.greatestiptv.com/free-trial/" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      --data "email=${EMAIL}&trial_type=m3u&gtv_trial_action=1")

    # Extract username
    USERNAME=$(echo "$HTML" | grep -oP 'G[0-9]+' | head -n 1)

    # Extract password
    PASSWORD=$(echo "$HTML" | grep -oP '(?<=<span class="sc-mono">)[a-zA-Z0-9]{6,}' | sed -n '2p')

    # Build M3U URL
    M3U_URL="http://gr8iptv.com/get.php?username=$USERNAME&password=$PASSWORD&type=m3u_plus&output=ts"

    echo "$NAME M3U URL: $M3U_URL"

    # Download actual .m3u file
    curl -s -o "$FILE" "$M3U_URL"

    # Confirm overwrite or creation
    if [ -f "$FILE" ]; then
        echo "Updated existing file: $FILE"
    else
        echo "Created new file: $FILE"
    fi
}

# Run twice
run_trial "thomas"
run_trial "duncan"
