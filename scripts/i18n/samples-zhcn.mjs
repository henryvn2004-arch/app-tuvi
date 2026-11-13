#!/usr/bin/env node
// npm run i18n:samples-zhcn — SINH public/samples/zh-cn/*.json từ public/samples/zh-tw/*.json (W32A-3).
// Văn mẫu zh-cn KHÔNG viết riêng: OpenCC twp→cn (cùng bộ chuyển với i18n/zh-cn.json) rồi thay tên + nơi sinh của nhân vật
// hư cấu theo `zh-cn.tuZhTw` trong scripts/fixtures/sample-personas.json (cùng giờ sinh ⇒ cùng lá số, số liệu không đổi).
// check:i18n so file đang có với bản sinh lại — sửa tay zh-cn là đỏ.
import fs from 'node:fs';
import path from 'node:path';
import * as OpenCC from 'opencc-js';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const conv = OpenCC.Converter({ from: 'twp', to: 'cn' });

export function buildSampleZhCn(root = ROOT) {
  const P = JSON.parse(
    fs.readFileSync(path.join(root, 'scripts/fixtures/sample-personas.json'), 'utf8')
  );
  const thay = Object.entries(P['zh-cn'].tuZhTw || {}).map(([a, b]) => [conv(a), b]);
  const dir = path.join(root, 'public/samples/zh-tw');
  const out = {};
  for (const f of fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((x) => x.endsWith('.json'))
    : []) {
    const src = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    // Đi SÂU vào mảng/object (mục `nenLam: [{viec, vidu}]`…): chỉ đổi chuỗi, giữ nguyên khung và tên khoá.
    const doi = (v) => {
      if (Array.isArray(v)) return v.map(doi);
      if (v && typeof v === 'object')
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, doi(x)]));
      let t = conv(String(v));
      for (const [a, b] of thay) t = t.split(a).join(b);
      return t;
    };
    out[f] = JSON.stringify(doi(src), null, 1) + '\n';
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = buildSampleZhCn();
  const dir = path.join(ROOT, 'public/samples/zh-cn');
  fs.mkdirSync(dir, { recursive: true });
  for (const [f, s] of Object.entries(out)) fs.writeFileSync(path.join(dir, f), s);
  console.log(`samples zh-cn: ${Object.keys(out).length} file (sinh từ zh-tw)`);
}
