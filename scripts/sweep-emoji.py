#!/usr/bin/env python3
"""Đổi emoji màu trong HTML text sang <span class="ic" data-icon="...">.

Nguyên tắc an toàn:
  • CHỈ đụng emoji nằm giữa hai thẻ (>...<) — tức nội dung hiển thị.
  • BỎ QUA: comment, alert()/confirm(), <title>/meta content, chuỗi JS,
    thuộc tính HTML, và dữ liệu lá bài (sym:/symbol:).
  • Emoji KHÔNG có trong EMOJI_TO_ICON của nav.js → để nguyên + báo cáo.
    Đoán tên icon là tự bịa ý nghĩa cho thứ mình không hiểu.
"""
import re, sys, glob, collections

COLOR = re.compile('[\U0001F300-\U0001F9FF\U0001FA70-\U0001FAFF\U0001F000-\U0001F2FF]️?')

def load_map(nav_path='public/nav.js'):
    s = open(nav_path, encoding='utf-8').read()
    blk = s[s.index('var EMOJI_TO_ICON = {'):]
    blk = blk[:blk.index('\n  };')]
    m = {}
    for emo, name in re.findall(r"'([^']+)'\s*:\s*'([a-z0-9-]+)'", blk):
        m[emo] = name
    return m

SKIP_LINE = re.compile(
    r'^\s*(//|\*|/\*)'                 # comment
    r'|\balert\s*\(|\bconfirm\s*\('    # hộp thoại native — không nhét SVG được
    r'|<title>|<meta|content='         # meta/title
    r'|\bsym\s*:|\bsymbol\s*:'         # dữ liệu lá bài: emoji LÀ nội dung
    r'|data-icon-emoji'                # đã migrate rồi
)

# emoji nằm giữa hai thẻ: >  ...emoji...  <
BETWEEN = re.compile(r'(>)([^<>]*?)(<)', re.S)

# 🔴 Thân <script>/<style> CŨNG nằm giữa '>' và '<' nên BETWEEN khớp cả vào đó —
# đủ để biến dữ liệu JS (vd map đồ vật phong thuỷ {mirror:'🪞'}) thành thẻ
# <span>, phá code mà nhìn diff thì tưởng chỉ đổi icon.
#
# Cách vá ĐÚNG là BỎ QUA THEO VÙNG, không phải "che bằng khoảng trắng": che sẽ
# xoá luôn các dấu '<'/'>' bên trong script, nên dấu '>' ngay trước và '<' ngay
# sau khối gộp thành MỘT vùng khổng lồ nuốt trọn script — nhiều hơn hẳn số khớp
# ban đầu (đo được 196 so với 137, chính dấu hiệu để phát hiện).
BLOCK = re.compile(r'<(script|style)\b[^>]*>.*?</\1\s*>', re.S | re.I)

def block_ranges(text):
    return [(m.start(), m.end()) for m in BLOCK.finditer(text)]

def in_blocks(pos, ranges):
    return any(a <= pos < b for a, b in ranges)

def convert(text, emap, stats):
    def fix_segment(seg):
        def rep(mo):
            raw = mo.group(0)
            key = raw.rstrip('️')
            name = emap.get(raw) or emap.get(key)
            if not name:
                stats['unmapped'][key] += 1
                return raw
            stats['converted'][key] += 1
            return '<span class="ic" data-icon="%s"></span>' % name
        return COLOR.sub(rep, seg)

    ranges = block_ranges(text)
    out, last = [], 0
    for mo in BETWEEN.finditer(text):
        seg = mo.group(2)
        if not COLOR.search(seg):
            continue
        # Kiểm dòng chứa CHÍNH emoji, không phải dòng mở thẻ — đoạn giữa hai thẻ
        # có thể trải nhiều dòng, lấy nhầm dòng là kiểm nhầm ngữ cảnh.
        epos = mo.start(2) + COLOR.search(seg).start()
        if in_blocks(epos, ranges):
            stats['skipped_script'] += len(COLOR.findall(seg))
            continue
        line_start = text.rfind('\n', 0, epos) + 1
        line_end = text.find('\n', epos)
        line = text[line_start: line_end if line_end != -1 else len(text)]
        if SKIP_LINE.search(line):
            stats['skipped_line'] += len(COLOR.findall(seg))
            continue
        out.append(text[last:mo.start(2)])
        out.append(fix_segment(seg))
        last = mo.end(2)
    out.append(text[last:])
    return ''.join(out)

def main(patterns, apply=False):
    emap = load_map()
    stats = {'converted': collections.Counter(), 'unmapped': collections.Counter(), 'skipped_line': 0, 'skipped_script': 0}
    touched = 0
    skipped_files = []
    for pat in patterns:
        for f in sorted(glob.glob(pat)):
            src = open(f, encoding='utf-8').read()
            # 🔴 CHỐT AN TOÀN: chỉ đổi ở file có nạp `nav.js`.
            # `mountIcons()` sống trong nav.js — file không nạp nó thì
            # <span data-icon> nằm đó vĩnh viễn RỖNG, tức thay một emoji đọc
            # được bằng một khoảng trắng. Trang shell (`app-*.html`) cố ý không
            # có nav.js, nên nếu chỉ dựa vào việc chọn đúng glob thì sớm muộn
            # cũng quét nhầm; để chốt ngay đây cho an toàn theo thiết kế.
            if 'nav.js' not in src:
                if COLOR.search(src):
                    skipped_files.append(f)
                continue
            new = convert(src, emap, stats)
            if new != src:
                touched += 1
                if apply:
                    open(f, 'w', encoding='utf-8').write(new)
    print(f"{'ĐÃ ÁP DỤNG' if apply else 'THỬ (dry-run)'} — {touched} file đổi")
    print(f"  đã đổi        : {sum(stats['converted'].values())}")
    print(f"  bỏ qua (dòng) : {stats['skipped_line']}")
    print(f"  bỏ qua (script): {stats['skipped_script']}")
    print(f"  chưa có map   : {sum(stats['unmapped'].values())}")
    if skipped_files:
        print(f"\n  BỎ QUA {len(skipped_files)} file KHÔNG nạp nav.js (mountIcons không chạy ở đó):")
        for f in skipped_files[:12]:
            print(f"     {f}")
    if stats['unmapped']:
        print("\n  emoji CHƯA có trong EMOJI_TO_ICON (để nguyên, cần bổ sung nếu muốn đổi):")
        for e, n in stats['unmapped'].most_common(30):
            print(f"     {n:4d}  {e}")

if __name__ == '__main__':
    apply = '--apply' in sys.argv
    pats = [a for a in sys.argv[1:] if not a.startswith('--')] or ['public/tools/*.html']
    main(pats, apply)
