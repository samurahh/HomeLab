#!/usr/bin/env bash
set -euo pipefail

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (e.g. with sudo)." >&2
    exit 1
fi

# Check if Docker is already installed
if command -v docker >/dev/null 2>&1; then
    echo "Docker is already installed."
    exit 0
fi

echo "Docker not detected. Installing Docker..."

# Create temporary directory
TMP_DIR=$(mktemp -d)

cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$TMP_DIR"

# Download official Docker install script
curl -fsSL https://get.docker.com -o get-docker.sh

# Run install script
sh ./get-docker.sh

echo "Docker installation completed."
