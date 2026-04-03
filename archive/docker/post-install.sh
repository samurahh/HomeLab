#!/usr/bin/env bash
set -euo pipefail

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (e.g. with sudo)." >&2
    exit 1
fi

# Determine the real user (when executed via sudo)
TARGET_USER=${SUDO_USER:-$USER}

# Check if Docker is installed
if command -v docker >/dev/null 2>&1; then
    echo "Docker is already installed."
else
    echo "Docker is not installed. Please install Docker before running this script."
    exit 1
fi

# Create docker group if it does not exist
if ! getent group docker >/dev/null 2>&1; then
    groupadd docker
    echo "Created 'docker' group."
fi

# Add user to docker group if not already a member
if id -nG "$TARGET_USER" | grep -qw docker; then
    echo "User '$TARGET_USER' is already in the docker group."
else
    usermod -aG docker "$TARGET_USER"
    echo "Added '$TARGET_USER' to docker group."
fi

echo "Testing Docker access for user '$TARGET_USER'..."

if su - "$TARGET_USER" -c "docker run --rm hello-world" >/dev/null 2>&1; then
    echo "Docker test successful."
else
    echo "Docker test failed."
    echo "The user may need to log out and log back in for the group change to take effect."
fi
