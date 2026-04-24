#!/usr/bin/env python3
"""
patch_payos.py — Apply payOS bank transfer integration
Chạy từ root của repo: python patch_payos.py
"""
import os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))

# ── 1. Copy bank-webhook.js vào api/ ─────────────────────────
SRC_WEBHOOK = os.path.join(ROOT, 'payos-integration', 'bank-webhook.js')
DST_WEBHOOK = os.path.join(ROOT, 'api', 'bank-webhook.js')
shutil.copy2(SRC_WEBHOOK, DST_WEBHOOK)
print(f'✅ Copied → api/bank-webhook.js')

# ── 2. Patch api/payment.js ────────────────────────────────────
PAYMENT_PATH = os.path.join(ROOT, 'api', 'payment.js')
with open(PAYMENT_PATH, 'r', encoding='utf-8') as f:
    payment = f.read()

# Kiểm tra đã patch chưa
if 'create-bank' in payment:
    print('⏭  api/payment.js đã có payOS actions, skip.')
else:
    # Đọc đoạn additions
    with open(os.path.join(ROOT, 'payos-integration', 'payment-additions.js'), 'r', encoding='utf-8') as f:
        additions = f.read()
    # Strip comments header
    additions = re.sub(r'^//.*\n', '', additions, flags=re.MULTILINE).strip()

    # Tìm dòng "Unknown action" hoặc cuối handler để chèn trước
    marker = "return res.status(400).json({ error: 'Unknown action' })"
    if marker in payment:
        payment = payment.replace(marker, additions + '\n\n  ' + marker)
        print('✅ Patched api/payment.js — inserted before Unknown action')
    else:
        # fallback: chèn trước dòng cuối của export default function
        # Tìm dòng cuối cùng của handler
        payment = payment.rstrip()
        # Chèn trước dấu } cuối cùng của handler
        last_brace = payment.rfind('\n}')
        if last_brace != -1:
            payment = payment[:last_brace] + '\n\n  ' + additions.replace('\n', '\n  ') + payment[last_brace:]
            print('✅ Patched api/payment.js — appended before last }')
        else:
            print('⚠️  Không tìm được vị trí chèn trong payment.js — thêm thủ công!')

    with open(PAYMENT_PATH, 'w', encoding='utf-8') as f:
        f.write(payment)

# ── 3. Patch 3 HTML files ──────────────────────────────────────
with open(os.path.join(ROOT, 'payos-integration', 'bank-modal-snippet.html'), 'r', encoding='utf-8') as f:
    modal_snippet = f.read()
# Bỏ phần comment hướng dẫn nút (để clean)
modal_clean = modal_snippet  # giữ nguyên cả comment nút, dev tự quyết chỗ đặt

HTML_FILES = {
    'index.html': {
        'pay_button_search': "id=\"payBtn\"",       # nút PayPal hiện tại
        'slug_expr': "getLasoSlug()",
    },
    'xem-tuoi.html': {
        'pay_button_search': "id=\"payBtn\"",
        'slug_expr': "getXemTuoiSlug()",
    },
    'xem-lam-an.html': {
        'pay_button_search': "id=\"payBtn\"",
        'slug_expr': "getXemLamAnSlug()",
    },
}

for fname, cfg in HTML_FILES.items():
    fpath = os.path.join(ROOT, 'public', fname)
    if not os.path.exists(fpath):
        print(f'⚠️  {fname} không tìm thấy, skip.')
        continue

    with open(fpath, 'r', encoding='utf-8') as f:
        html = f.read()

    if 'bankModal' in html:
        print(f'⏭  {fname} đã có bankModal, skip.')
        continue

    # Tạo nút bank inline — thêm sau nút payBtn
    bank_btn = f"""
    <!-- payOS bank transfer button -->
    <div style="text-align:center;margin-top:10px">
      <button onclick="openBankModal({cfg['slug_expr']})" style="background:#fff;color:var(--navy);border:2px solid var(--navy);padding:10px 28px;border-radius:6px;font-size:.95rem;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:8px">
        🏦 Chuyển khoản ngân hàng
      </button>
    </div>"""

    # Chèn nút sau id="payBtn" (sau thẻ đóng của parent div nút PayPal)
    # Strategy: tìm payBtn rồi tìm </div> gần nhất sau đó
    pay_btn_idx = html.find('id="payBtn"')
    if pay_btn_idx == -1:
        pay_btn_idx = html.find("id='payBtn'")

    if pay_btn_idx != -1:
        # Tìm </button> hoặc </div> sau payBtn để chèn bank btn
        close_idx = html.find('</button>', pay_btn_idx)
        if close_idx != -1:
            insert_at = close_idx + len('</button>')
            html = html[:insert_at] + bank_btn + html[insert_at:]
            print(f'✅ {fname} — thêm nút bank sau payBtn')
        else:
            print(f'⚠️  {fname} — không tìm thấy </button> sau payBtn, thêm modal thôi')
    else:
        print(f'⚠️  {fname} — không tìm thấy payBtn, chỉ thêm modal snippet')

    # Chèn modal + script trước </body>
    if '</body>' in html:
        html = html.replace('</body>', modal_clean + '\n</body>')
        print(f'✅ {fname} — thêm bankModal snippet trước </body>')

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(html)

# ── 4. Kiểm tra Supabase migration cần thiết ──────────────────
print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  SUPABASE MIGRATION cần chạy thủ công:

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS order_code TEXT,
  ADD COLUMN IF NOT EXISTS amount_vnd INTEGER,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'paypal',
  ADD COLUMN IF NOT EXISTS payos_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_purchases_order_code ON purchases(order_code);

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  VERCEL ENV VARS cần thêm:

PAYOS_CLIENT_ID=db3d883a-7d42-485f-b50e-93561386329a
PAYOS_API_KEY=68a071b1-87b2-4a45-a215-416475e3c935
PAYOS_CHECKSUM_KEY=67d25151e1adc02ea7b53b1469af7644cf7c24830a5ddb8216f8c0c37c19d746

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  payOS DASHBOARD — thêm Webhook URL:
https://tuviminhbao.com/api/bank-webhook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")

print('🎉 Patch hoàn tất!')
