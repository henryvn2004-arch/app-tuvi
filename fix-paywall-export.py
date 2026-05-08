#!/usr/bin/env python3
"""Fix: append window.TuviPaywall = TuviPaywall at end of file"""
from pathlib import Path

p = Path('public/tuvi-paywall.js')
content = p.read_text(encoding='utf-8')

if 'window.TuviPaywall = TuviPaywall' in content:
    print('⏭  Already exports — checking other paths')
else:
    if not content.endswith('\n'):
        content += '\n'
    content += '\n// Export to global window so cross-script checks (e.g. tu-binh.html line 1537) work\nwindow.TuviPaywall = TuviPaywall;\n'
    p.write_text(content, encoding='utf-8')
    print('✅ Added: window.TuviPaywall = TuviPaywall')

# Bonus: cũng export các product khác nếu cần
print('\nDone. File size:', p.stat().st_size, 'bytes')
