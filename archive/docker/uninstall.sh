#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
FORCE=false

# Logging helpers
log()   { echo "[INFO]  $1"; }
warn()  { echo "[WARN]  $1"; }
run()   { if [ "$DRY_RUN" = true ]; then echo "[DRY-RUN] $*"; else "$@"; fi; }

usage() {
    echo "Usage: $0 [--dry-run] [--force]"
    echo
    echo "--dry-run   Show what would be done without executing"
    echo "--force     Remove all Docker data (images, volumes, containers)"
}

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --force)   FORCE=true ;;
        *)
            usage
            exit 1
            ;;
    esac
done

# Ensure root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (e.g. with sudo)." >&2
    exit 1
fi

log "Checking Docker installation..."

DOCKER_PRESENT=false

if command -v docker >/dev/null 2>&1; then
    DOCKER_PRESENT=true
fi

if dpkg -l | grep -qE 'docker-ce|docker-ce-cli|containerd.io'; then
    DOCKER_PRESENT=true
fi

if [ "$DOCKER_PRESENT" = false ]; then
    warn "Docker does not appear to be installed. Cleaning leftovers if present."
fi

# Stop Docker services if they exist
stop_service_if_exists() {
    local service="$1"
    if systemctl list-unit-files --type=service | grep -q "^${service}"; then
        log "Stopping ${service}..."
        run systemctl stop "${service}" 2>/dev/null || true
    fi
}

log "Stopping Docker-related services..."
stop_service_if_exists docker.service
stop_service_if_exists docker.socket
stop_service_if_exists containerd.service

# Remove Docker packages
log "Removing Docker packages..."
run apt purge -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
    docker-ce-rootless-extras || true

# Remove Docker data if --force
if [ "$FORCE" = true ]; then
    log "Removing Docker data directories..."
    [ -d /var/lib/docker ] && run rm -rf /var/lib/docker
    [ -d /var/lib/containerd ] && run rm -rf /var/lib/containerd
else
    warn "Docker data directories preserved. Use --force to remove them."
fi

# Remove repository source and keyring
log "Removing Docker repository configuration..."
[ -f /etc/apt/sources.list.d/docker.sources ] && run rm -f /etc/apt/sources.list.d/docker.sources
[ -f /etc/apt/keyrings/docker.asc ] && run rm -f /etc/apt/keyrings/docker.asc

# Update apt index
log "Updating apt package index..."
run apt update >/dev/null 2>&1

log "Docker removal completed."
