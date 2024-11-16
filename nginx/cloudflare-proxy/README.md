# Description
This script provides Nginx configuration that can be used to control access to your proxies/websites, allowing access to local network and to Cloudflare Proxy network.
The installation process will add a crontab job that will periodically (every 1 hour) update the list of Cloudflare IPs.

The configuration will be stored at '/data/custom_includes' - make sure your Nginx user has access to that path.

1. Run the command below in your machine containing the Nginx instance.
```bash
bash -c "$(wget -qLO - https://github.com/samurahh/HomeLab/raw/main/nginx/cloudflare-proxy/installation.sh)"
```
2. Once installed, the configuration can be used by pasting the following code into your host configuration. (For Nginx Proxy Manager you can add it under 'Advanced' section)
```
# Includes local access + cloudflare proxy.
include /data/custom_includes/cloudflare-proxy.conf;
```