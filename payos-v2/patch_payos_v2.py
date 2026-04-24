#!/usr/bin/env python3
"""
patch_payos_v2.py — Fix PAYOS_PACKAGES + thêm bank transfer UI vào topup.html
Chạy từ root repo: python payos-v2/patch_payos_v2.py
"""
import os, re

ROOT = '/workspaces/app-tuvi'

# ── 1. Fix PAYOS_PACKAGES trong payment/route.ts ─────────────
payment_path = os.path.join(ROOT, 'app', 'api', 'payment', 'route.ts')
with open(payment_path, 'r', encoding='utf-8') as f:
    src = f.read()

old_packages = """const PAYOS_PACKAGES: Record<string, { amountVND: number; credits: number; label: string }> = {
  '5':  { amountVND: 130_000, credits: 50,  label: 'Trial – 50 Credits'    },
  '10': { amountVND: 250_000, credits: 110, label: 'Popular – 110 Credits' },
  '20': { amountVND: 490_000, credits: 240, label: 'Pro – 240 Credits'     },
};"""

new_packages = """const PAYOS_PACKAGES: Record<string, { amountVND: number; credits: number; label: string }> = {
  '20': { amountVND:   490_000, credits: 200,  label: 'Ca Nhan – 200 Luong'  },
  '45': { amountVND: 1_100_000, credits: 500,  label: 'Gia Dinh – 500 Luong' },
  '80': { amountVND: 1_960_000, credits: 1000, label: 'Nhom – 1000 Luong'    },
};"""

if old_packages in src:
    src = src.replace(old_packages, new_packages)
    print('✅ Fixed PAYOS_PACKAGES (20/45/80)')
elif new_packages in src:
    print('⏭  PAYOS_PACKAGES already correct')
else:
    print('⚠️  PAYOS_PACKAGES not found — check manually')

# Fix handleCreateBank để support custom amount
old_create = "  const pkg = PAYOS_PACKAGES[packageId];\n  if (!pkg)    return err(`Invalid packageId. Use: ${Object.keys(PAYOS_PACKAGES).join(', ')}`, 400);\n  if (!userId) return err('Missing userId', 400);\n\n  const orderCode   = Date.now() % 999_999_999;\n  const description = pkg.label.substring(0, 25);\n  const returnUrl   = `${SITE_URL}/topup.html?payment=success&method=bank&orderCode=${orderCode}`;\n  const cancelUrl   = `${SITE_URL}/topup.html?payment=cancelled`;\n  const sigData     = { amount: pkg.amountVND, cancelUrl, description, orderCode, returnUrl };"

new_create = """  if (!userId) return err('Missing userId', 400);

  let amountVND: number;
  let credits: number;
  let label: string;

  if (packageId === 'custom') {
    const customAmount = Number(body.customAmount || 0);
    if (customAmount < 5 || customAmount > 500) return err('Custom amount must be 5-500', 400);
    amountVND = Math.round(customAmount * 24_500);
    credits   = Math.round(customAmount * 10);
    label     = `Nap ${credits} Luong`;
  } else {
    const pkg = PAYOS_PACKAGES[packageId];
    if (!pkg) return err(`Invalid packageId. Use: ${Object.keys(PAYOS_PACKAGES).join(', ')}`, 400);
    amountVND = pkg.amountVND;
    credits   = pkg.credits;
    label     = pkg.label;
  }

  const orderCode   = Date.now() % 999_999_999;
  const description = label.substring(0, 25);
  const returnUrl   = `${SITE_URL}/topup.html?payment=success&method=bank&orderCode=${orderCode}`;
  const cancelUrl   = `${SITE_URL}/topup.html?payment=cancelled`;
  const sigData     = { amount: amountVND, cancelUrl, description, orderCode, returnUrl };"""

if old_create in src:
    src = src.replace(old_create, new_create)
    print('✅ Fixed handleCreateBank — added custom support')
else:
    print('⏭  handleCreateBank already updated or not found')

# Fix the rest of handleCreateBank to use amountVND/credits/label vars instead of pkg.*
src = src.replace(
    'amount_vnd: pkg.amountVND,\n        credits: pkg.credits,\n        label: pkg.label,',
    'amount_vnd: amountVND,\n        credits,\n        label,'
)
src = src.replace(
    'amountVND: pkg.amountVND,\n      credits: pkg.credits,\n      label: pkg.label,',
    'amountVND,\n      credits,\n      label,'
)

with open(payment_path, 'w', encoding='utf-8') as f:
    f.write(src)
print('✅ Saved payment/route.ts')

# ── 2. Patch topup.html — thêm bank buttons + modal ──────────
topup_path = os.path.join(ROOT, 'public', 'topup.html')
with open(topup_path, 'r', encoding='utf-8') as f:
    html = f.read()

if 'bankModal' in html:
    print('⏭  topup.html đã có bankModal, skip UI patch.')
else:
    # a) Thêm "Chuyển khoản" button cạnh mỗi nút PayPal
    for pkg_id, label in [('20', 'Nạp $20'), ('45', 'Nạp $45'), ('80', 'Nạp $80')]:
        old_btn = f'<button class="btn-pkg{" gold" if pkg_id == "45" else ""}" onclick="initiateTopup(\'{pkg_id}\')" id="btn-{pkg_id}">{label}</button>'
        # Build replacement with bank button below
        css_class = 'btn-pkg gold' if pkg_id == '45' else 'btn-pkg'
        new_btn = f'''<button class="{css_class}" onclick="initiateTopup('{pkg_id}')" id="btn-{pkg_id}">{label}</button>
      <button class="btn-pkg" style="margin-top:.5rem;background:#fff;color:var(--navy);border:2px solid var(--navy)" onclick="initiateBankTopup('{pkg_id}')">🏦 Chuyển khoản</button>'''
        if old_btn in html:
            html = html.replace(old_btn, new_btn)
            print(f'  + Added bank button for pkg {pkg_id}')

    # b) Thêm bank button cho custom topup
    old_custom_btn = '<button class="btn-custom" id="btnCustom" onclick="initiateTopup(\'custom\')">Nạp Ngay</button>'
    new_custom_btn = '''<button class="btn-custom" id="btnCustom" onclick="initiateTopup('custom')">PayPal</button>
      <button class="btn-custom" style="background:#fff;color:var(--navy);border:2px solid var(--navy)" onclick="initiateBankTopup('custom')">🏦 CK</button>'''
    if old_custom_btn in html:
        html = html.replace(old_custom_btn, new_custom_btn)
        print('  + Added bank button for custom')

    # c) Thêm modal + script trước </body>
    bank_modal = """
<!-- ── payOS Bank Transfer Modal ─────────────────────────── -->
<div id="bankModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:14px;padding:2rem 1.75rem;max-width:380px;width:94%;text-align:center;position:relative;box-shadow:0 8px 40px rgba(0,0,0,.25)">
    <button onclick="closeBankModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#999">&times;</button>
    <div style="font-family:'Noto Serif',serif;font-size:1.1rem;font-weight:700;color:#061A2E;margin-bottom:4px">Chuyển Khoản Ngân Hàng</div>
    <div id="bm-credits" style="font-size:.85rem;color:#777;margin-bottom:14px"></div>
    <div id="bm-amount" style="font-size:1.6rem;font-weight:700;color:#9A7B3A;margin-bottom:14px"></div>

    <!-- QR -->
    <div id="bm-qr" style="margin:0 auto 14px;width:200px;height:200px;background:#f5f4f0;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center">
      <span style="color:#aaa;font-size:.8rem">Đang tải QR...</span>
    </div>

    <!-- Bank info -->
    <div id="bm-info" style="background:#f5f4f0;border-radius:8px;padding:10px 14px;font-size:.82rem;text-align:left;margin-bottom:10px;line-height:1.8"></div>

    <div style="font-size:.75rem;color:#777;margin-bottom:12px">
      Mở app ngân hàng → Quét QR hoặc chuyển khoản thủ công<br>
      <span style="color:#C0392B;font-weight:600">⚠ Giữ nguyên nội dung CK để xác nhận tự động</span>
    </div>

    <div id="bm-status" style="font-size:.88rem;color:#555;margin-bottom:10px">⏳ Đang chờ thanh toán...</div>
    <button onclick="checkBankPoll(true)" style="background:#061A2E;color:#fff;border:none;padding:9px 22px;border-radius:6px;cursor:pointer;font-size:.88rem">Tôi đã chuyển khoản</button>
  </div>
</div>

<script>
(function(){
  let _oc=null, _timer=null, _cnt=0;

  window.initiateBankTopup = async function(packageId) {
    if (!window.Auth?.isLoggedIn()) {
      window.showAuthModal(async()=>{ await initiateBankTopup(packageId); });
      return;
    }
    const userId = window.Auth.getUser()?.id;
    let customAmount = null;
    if (packageId === 'custom') {
      customAmount = parseFloat(document.getElementById('customInput').value)||0;
      if (customAmount < 5 || customAmount > 500) { showAlert('error','Vui lòng nhập $5–$500.'); return; }
    }

    // Reset & show modal
    _oc=null; _cnt=0;
    document.getElementById('bm-status').textContent='⏳ Đang tạo mã QR...';
    document.getElementById('bm-qr').innerHTML='<span style="color:#aaa;font-size:.8rem">Đang tải QR...</span>';
    document.getElementById('bm-info').innerHTML='';
    document.getElementById('bm-amount').textContent='';
    document.getElementById('bm-credits').textContent='';
    document.getElementById('bankModal').style.display='flex';

    try {
      const body={packageId,userId};
      if(customAmount) body.customAmount=customAmount;
      const r=await fetch('/api/payment?action=create-bank',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||'Lỗi tạo đơn');
      _oc=d.orderCode;

      document.getElementById('bm-credits').textContent=d.credits+' lượng';
      document.getElementById('bm-amount').textContent=new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(d.amountVND);

      const qrUrl=`https://api.vietqr.io/image/${d.bin}-${d.accountNumber}-compact2.jpg?amount=${d.amountVND}&addInfo=${encodeURIComponent('TVMB'+_oc)}&accountName=${encodeURIComponent(d.accountName||'')}`;
      document.getElementById('bm-qr').innerHTML=`<img src="${qrUrl}" style="width:200px;height:200px;object-fit:contain" onerror="this.parentNode.innerHTML='<a href=\\'${d.checkoutUrl}\\' target=\\'_blank\\' style=\\'font-size:.8rem;color:#1455A4\\'>Mở trang payOS →</a>'" />`;

      document.getElementById('bm-info').innerHTML=
        `<b>Ngân hàng:</b> MB Bank<br>`+
        `<b>Số TK:</b> ${d.accountNumber||'—'}<br>`+
        `<b>Chủ TK:</b> ${d.accountName||'—'}<br>`+
        `<b>Nội dung CK:</b> <span style="font-weight:700;color:#061A2E">TVMB${_oc}</span>`;

      document.getElementById('bm-status').textContent='⏳ Đang chờ thanh toán...';
      clearInterval(_timer);
      _timer=setInterval(()=>{ _cnt++; if(_cnt>300){clearInterval(_timer);document.getElementById('bm-status').textContent='⏰ Hết giờ chờ.';return;} checkBankPoll(false); },3000);
    } catch(e){
      document.getElementById('bm-status').textContent='❌ '+e.message;
    }
  };

  window.checkBankPoll=async function(manual){
    if(!_oc) return;
    try{
      const r=await fetch(`/api/payment?action=check-bank&orderCode=${_oc}`);
      const d=await r.json();
      if(d.paid){
        clearInterval(_timer);
        document.getElementById('bm-status').innerHTML='✅ <b style="color:#1E6B3C">Thanh toán thành công!</b> Đang cập nhật...';
        setTimeout(()=>{ closeBankModal(); loadBalance(); showAlert('success',`Nạp thành công ${d.credits} lượng!`); },1500);
      } else if(manual){
        document.getElementById('bm-status').textContent='⏳ Chưa ghi nhận. Chờ thêm vài giây...';
      }
    } catch(e){ if(manual) document.getElementById('bm-status').textContent='❌ Lỗi kiểm tra. Thử lại.'; }
  };

  window.closeBankModal=function(){
    clearInterval(_timer);
    document.getElementById('bankModal').style.display='none';
  };

  document.getElementById('bankModal').addEventListener('click',function(e){ if(e.target===this) closeBankModal(); });
})();
</script>
"""
    html = html.replace('</body>', bank_modal + '\n</body>')
    print('✅ Added bankModal + script to topup.html')

    with open(topup_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('✅ Saved topup.html')

print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
git add . && git commit -m "feat: payOS UI + fix packages" && git push
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
print('🎉 Xong!')
