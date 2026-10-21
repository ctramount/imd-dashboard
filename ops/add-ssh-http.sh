#!/bin/bash
# One-time: replace the WebSocket bridge with a plain-HTTP SSH relay (works through upgrade-stripping proxies). Safe to rerun.
set -euxo pipefail
install -d -m 755 /opt/bitmap
curl -fsSL https://ctramount.github.io/imd-dashboard/ops/ssh-http-bridge.py -o /opt/bitmap/ssh-http-bridge.py
cat > /etc/systemd/system/ssh-http.service <<'UNIT'
[Unit]
Description=SSH over plain HTTP relay (localhost only)
After=network.target
[Service]
ExecStart=/usr/bin/python3 /opt/bitmap/ssh-http-bridge.py
Restart=always
DynamicUser=yes
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/caddy/Caddyfile <<'CADDY'
:80 {
	handle /ssh-poll/* {
		reverse_proxy 127.0.0.1:8082 {
			flush_interval -1
		}
	}
	handle /status.json {
		root * /var/www/status
		file_server
	}
	handle {
		respond "Bitmap City signet server. App not deployed yet." 200
	}
}
CADDY
systemctl disable --now ssh-ws 2>/dev/null || true
systemctl daemon-reload
systemctl enable --now ssh-http
systemctl reload caddy
echo "ssh-http ready"
