#!/usr/bin/env python3
"""Add Sentry loader script to priority HTML pages."""
import re
from pathlib import Path

SENTRY_TAG = '<script src="https://js.sentry-cdn.com/f884fb7e9d257df10ecb6dbe562141cb.min.js" crossorigin="anonymous"></script>'

PAGES = [
    'public/index.html',
    'public/tu-binh.html',
    'public/luan-giai.html',
    'public/xem-tuoi.html',
    'public/xem-lam-an.html',
    'public/topup.html',
]

added = skipped = missing = 0

for path in PAGES:
    p = Path(path)
    if not p.exists():
        print(f"❌ {path}: not found")
        missing += 1
        continue

    content = p.read_text(encoding='utf-8')

    # Idempotent — skip if already added
    if 'js.sentry-cdn.com' in content:
        print(f"⏭  {path}: Sentry already present")
        skipped += 1
        continue

    # Find <meta charset...> anchor (case-insensitive)
    match = re.search(r'<meta\s+charset\s*=\s*["\']?utf-8["\']?\s*/?>', content, re.IGNORECASE)
    if not match:
        print(f"⚠  {path}: no <meta charset> found, manual paste needed")
        missing += 1
        continue

    anchor = match.group(0)
    new_content = content.replace(anchor, anchor + '\n' + SENTRY_TAG, 1)
    p.write_text(new_content, encoding='utf-8')
    print(f"✅ {path}: added Sentry")
    added += 1

print(f"\n=== Summary: added={added} skipped={skipped} missing={missing} ===")
