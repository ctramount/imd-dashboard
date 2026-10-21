#!/bin/bash
# One-time: add the SSH-over-WebSocket bridge to an already-built signet server. Safe to rerun.
set -euxo pipefail
apt-get install -y python3-websockets
install -d -m 755 /opt/bitmap
curl -fsSL https://ctramount.github.io/imd-dashboard/ops/ssh-ws-bridge.py -o /opt/bitmap/ssh-ws-bridge.py
cat > /etc/systemd/system/ssh-ws.service <<'UNIT'
[Unit]
Description=SSH over WebSocket bridge (localhost only)
After=network.target
[Service]
ExecStart=/usr/bin/python3 /opt/bitmap/ssh-ws-bridge.py
Restart=always
DynamicUser=yes
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/caddy/Caddyfile <<'CADDY'
:80 {
	handle /ssh-ws {
		reverse_proxy 127.0.0.1:8081
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
systemctl daemon-reload
systemctl enable --now ssh-ws
systemctl reload caddy
echo "ssh-ws ready"
