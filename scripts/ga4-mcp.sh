#!/usr/bin/env bash
# Khởi động MCP server Google Analytics CHÍNH CHỦ (package `analytics-mcp`,
# repo googleanalytics/google-analytics-mcp) cho phiên Claude Code.
#
# ⚠️ ĐỪNG đổi sang package `google-analytics-mcp` trên PyPI — tên đó TRÙNG với
# tên REPO của Google nhưng là của BÊN THỨ BA (tự xưng "Google Analytics 4",
# tool khác hẳn, và có gửi telemetry). Tên package đúng là `analytics-mcp`.
#
# Server đọc credential qua Application Default Credentials. Repo này vốn đã có
# sẵn `GA4_SERVICE_ACCOUNT_JSON` (dùng chung với lib/analytics/ga4.ts và
# scripts/ga4.mjs) nên script tự dựng file key từ biến đó — KHÔNG cần thêm
# credential mới, không cần `gcloud auth`.
#
# Nhận CẢ raw JSON lẫn base64, đúng như parseServiceAccount() trong
# lib/analytics/ga4.ts — Vercel hay lưu key dạng base64 cho gọn một dòng.
#
# Mọi thứ in ra PHẢI vào stderr: stdout là kênh giao thức MCP.

set -euo pipefail

log() { printf '[ga4-mcp] %s\n' "$1" >&2; }

if [ -z "${GA4_SERVICE_ACCOUNT_JSON:-}" ]; then
  log 'THIẾU biến môi trường GA4_SERVICE_ACCOUNT_JSON.'
  log 'Đặt nó trong Claude Code environment settings (KHÔNG phải Vercel — env của'
  log 'Vercel không chảy vào container phiên). Dán TOÀN BỘ nội dung file JSON key'
  log '(~2300 ký tự), raw hoặc base64; đừng dán bản rút gọn "ewogICJ0eXBlIjo..."'
  log 'mà giao diện Vercel hiển thị.'
  exit 1
fi

raw="$GA4_SERVICE_ACCOUNT_JSON"
# Không bắt đầu bằng '{' => coi là base64, thử giải mã.
case "$raw" in
  '{'*) ;;
  *)
    if decoded=$(printf '%s' "$raw" | base64 -d 2>/dev/null) && [ "${decoded:0:1}" = '{' ]; then
      raw="$decoded"
    else
      log 'GA4_SERVICE_ACCOUNT_JSON không đọc được (cần raw JSON hoặc base64).'
      log "Độ dài hiện tại: ${#raw} ký tự — dưới 100 gần như chắc chắn là bản bị cắt."
      exit 1
    fi
    ;;
esac

keydir="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}/ga4-mcp-$(id -u)"
mkdir -p "$keydir"
chmod 700 "$keydir"
keyfile="$keydir/sa.json"
(umask 077; printf '%s' "$raw" > "$keyfile")

export GOOGLE_APPLICATION_CREDENTIALS="$keyfile"

# project_id nằm sẵn trong key — khỏi bắt người dùng khai thêm một biến nữa.
if [ -z "${GOOGLE_PROJECT_ID:-}" ]; then
  pid=$(sed -n 's/.*"project_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$keyfile" | head -1)
  [ -n "$pid" ] && export GOOGLE_PROJECT_ID="$pid"
fi

# Container phiên là ephemeral: lượt chạy đầu ở máy mới sẽ tự tải package.
if command -v uvx >/dev/null 2>&1; then
  exec uvx analytics-mcp
elif [ -x "$HOME/.local/bin/uvx" ]; then
  exec "$HOME/.local/bin/uvx" analytics-mcp
elif command -v pipx >/dev/null 2>&1; then
  exec pipx run analytics-mcp
else
  log 'Không tìm thấy uvx lẫn pipx — không khởi động được analytics-mcp.'
  exit 1
fi
