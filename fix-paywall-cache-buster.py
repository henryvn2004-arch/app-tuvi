#!/usr/bin/env python3
"""Force fresh tuvi-paywall.js load by adding ?v=3 cache buster to all script tags"""
import re
from pathlib import Path

PAGES = [
    'public/tu-binh.html',
    'public/luan-giai.html',
    'public/xem-tuoi.html',
    'public/xem-lam-an.html',
    'public/topup.html',
    'public/index.html',
]

count = 0
for path in PAGES:
    p = Path(path)
    if not p.exists():
        print(f"❌ {path}: not found")
        continue
    content = p.read_text(encoding='utf-8')
    new = re.sub(
        r'<script\s+src="/tuvi-paywall\.js(?:\?v=\d+)?"',
        '<script src="/tuvi-paywall.js?v=3"',
        content
    )
    if new != content:
        p.write_text(new, encoding='utf-8')
        print(f"✅ {path}: cache buster ?v=3 added")
        count += 1
    else:
        print(f"⏭  {path}: tuvi-paywall.js tag không thấy hoặc đã có ?v=3")
print(f"\n=== Updated {count} files ===")
