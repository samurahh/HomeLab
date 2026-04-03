#!/bin/bash

# Define output
SCRIPT_DIRECTORY="/data/scripts"
SCRIPT_NAME="fetch-cloudflare-proxy.sh"
SCRIPT_PATH="$SCRIPT_DIRECTORY/$SCRIPT_NAME"

# Ensure directory exists
if [ -d "$SCRIPT_DIRECTORY" ]; then
    echo "Info: Script directory $SCRIPT_DIRECTORY exists."
else
	if mkdir -p "$SCRIPT_DIRECTORY"; then
        echo "Info: Created script directory $SCRIPT_DIRECTORY."
    else
        echo "Error: Could not create scripts directory."
		exit 1
	fi
fi

echo "Info: Fetching Cloudflare proxy script."
wget -qLO "$SCRIPT_PATH" https://github.com/samurahh/HomeLab/raw/main/nginx/cloudflare-proxy/fetch-cloudflare-proxy.sh
chmod +x "$SCRIPT_PATH"

echo "Info: Installing Cloudflare proxy script."
CRONTAB="0 * * * * $SCRIPT_PATH >/dev/null 2>&1"
if crontab -l | grep -q "$SCRIPT_PATH" > /dev/null 2>&1; then
    echo "Warning: Detected and overriden an existing crontab for this script."
else
    echo "Info: Created crontab to fetch Cloudflare Proxy configuration every hour."
fi
{
    echo "$(crontab -l | grep -v "$SCRIPT_PATH")"
    echo "$CRONTAB"
} | crontab -

# Execute script for the first time.
$SCRIPT_PATH