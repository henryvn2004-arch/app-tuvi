#!/usr/bin/env bash
# Trạm chuyển tiếp Zalo Graph trên VPS đặt ở Việt Nam.
#
# Vì sao: Zalo trả `-501` ("IP address not inside Vietnam") khi đọc thông tin người
# dùng (graph.zalo.me/v2.0/me) từ IP ngoài VN — server Vercel ở Mỹ ⇒ đăng nhập Zalo
# Mini App chết. Trạm này CHỈ chuyển đúng `/v2.0/me` sang graph.zalo.me, có khoá.
# Không giữ secret Zalo nào: appsecret_proof do Vercel tính sẵn trong request.
#
# Cài (Ubuntu 22.04/24.04, chạy bằng root, cổng 80 + 443 phải mở):
#   curl -fsSL https://raw.githubusercontent.com/henryvn2004-arch/app-tuvi/main/scripts/zalo-relay-setup.sh | bash -s <KHOÁ>
# <KHOÁ> = giá trị ZALO_GRAPH_RELAY_KEY trên Vercel. Chạy lại được (ghi đè cấu hình).
# HTTPS: Caddy tự xin chứng chỉ cho <ip-có-gạch>.sslip.io (sslip.io trỏ tên về IP).
set -euo pipefail

KEY="${1:-}"
if [[ ! "$KEY" =~ ^[A-Za-z0-9]{16,}$ ]]; then
  echo "Thiếu khoá: bash -s <KHOÁ> (chữ/số, >= 16 ký tự)" >&2
  exit 1
fi

IP="$(curl -fsS4 https://api.ipify.org)"
HOST="${IP//./-}.sslip.io"

if ! command -v caddy >/dev/null; then
  apt-get update -y
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

# X-Forwarded-* bị gỡ: đừng để Zalo thấy IP gốc (Mỹ) của Vercel trong header.
cat > /etc/caddy/Caddyfile <<CADDY
${HOST} {
	@relay {
		path /v2.0/me
		header X-Relay-Key ${KEY}
	}
	handle @relay {
		reverse_proxy https://graph.zalo.me {
			header_up Host {upstream_hostport}
			header_up -X-Relay-Key
			header_up -X-Forwarded-For
			header_up -X-Forwarded-Proto
			header_up -X-Forwarded-Host
		}
	}
	respond 403
}
CADDY
chmod 640 /etc/caddy/Caddyfile
chown root:caddy /etc/caddy/Caddyfile

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

caddy validate --config /etc/caddy/Caddyfile
systemctl enable caddy
systemctl restart caddy

echo
echo "XONG. Trạm: https://${HOST}"
echo "Trên Vercel đặt ZALO_GRAPH_RELAY_URL=https://${HOST}"
