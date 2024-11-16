#!/bin/bash

# Define output
CONFIGURATION_DIRECTORY="/data/custom_includes"
CLOUDFLARE_PROXY_OUTPUT="cloudflare-proxy.conf"

# Ensure directory exists
mkdir -p "$CONFIGURATION_DIRECTORY"

# Cloudflare URLs for IP lists
CLOUDFLARE_IPV4_URL="https://www.cloudflare.com/ips-v4"
CLOUDFLARE_IPV6_URL="https://www.cloudflare.com/ips-v6"

# Fetch the IP lists
echo "Info: Fetching Cloudflare IPv4 list."
IPV4_LIST=$(curl -s "$CLOUDFLARE_IPV4_URL")

echo "Info: Fetching Cloudflare IPv6 list."
IPV6_LIST=$(curl -s "$CLOUDFLARE_IPV6_URL")

{
    echo "# Loopback access"
    echo "allow 127.0.0.0/8;"
    echo
    echo "# Local IPv4 addresses"
    echo "allow 10.0.0.0/8;"
    echo "allow 172.16.0.0/12;"
    echo "allow 192.168.0.0/16;"
    echo
    echo "# Cloudflare IPv4 addresses"
    echo "$IPV4_LIST" | sed 's/^/allow /; s/$/;/'
    echo
    echo "# Cloudflare IPv6 addresses"
    echo "$IPV6_LIST" | sed 's/^/allow /; s/$/;/'
    echo "deny all;"
    echo 
    echo "# Cloudflare IPv4 addresses for real IP"
    echo "$IPV4_LIST" | sed 's/^/set_real_ip_from /; s/$/;/'
    echo
    echo "# Cloudflare IPv6 addresses for real IP"
    echo "$IPV6_LIST" | sed 's/^/set_real_ip_from /; s/$/;/'
    echo "real_ip_header    X-Forwarded-For;"
    echo "real_ip_recursive on;"
} > "$CONFIGURATION_DIRECTORY/$CLOUDFLARE_PROXY_OUTPUT"

# Display success message
echo "Info: Succesfully generated Cloudflare Proxy configuration at $CONFIGURATION_DIRECTORY/$CLOUDFLARE_PROXY_OUTPUT."

if nginx -t > /dev/null 2>&1; then
  # Reload Nginx
  nginx -s reload > /dev/null 2>&1
  echo "Info: Nginx configuration reloaded."
else
  echo "Error: Nginx configuration could not be reloaded due to some issues with the configuration files."
  exit 1
fi