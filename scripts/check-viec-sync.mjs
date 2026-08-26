#!/usr/bin/env node
// scripts/check-viec-sync.mjs
// ============================================================
// Chặn BẢN CLIENT của `VIEC_CAN_LAM` trôi khỏi bản engine.
//
// 🔑 VÌ SAO CẦN. `public/app-nguoi-khac.html` buộc phải giữ một bản sao của
// danh sách "việc cần làm": ô chọn dựng TRƯỚC mọi lượt gọi API, bắt người dùng
// đợi một vòng mạng mới thấy ô chọn là thêm một chỗ rơi ngay đầu phễu.
//
// 🔴 TRÔI KHỎI NHAU THÌ HỎNG IM LẶNG, VÀ HỎNG TRÊN ĐƯỜNG TIỀN. `resolveViec` ở
// server không nhận ra một id lạ thì **rơi về 'hieu-them'** chứ không báo lỗi —
// người dùng chọn "thương lượng lương", trả tiền, rồi nhận đúng bản chung chung
// mà họ vừa đọc miễn phí. Không có gì trên màn hình nói cho họ biết.
//
// Kiểm 3 điều: cùng TẬP id · cùng NHÃN · cùng cờ `hop`. Nhãn phải khớp vì nó đi
// thẳng vào tiêu đề khối `keHoach` mà người dùng đọc.
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = join(ROOT, 'lib/engine/nguoi-khac.ts');
const PAGE = join(ROOT, 'public/app-nguoi-khac.html');

const fail = (msg) => {
  console.error(`\x1b[31m✗ check:viec — ${msg}\x1b[0m`);
  process.exitCode = 1;
};

/** Bóc `VIEC_CAN_LAM` từ file TS engine. */
function fromEngine() {
  const src = readFileSync(ENGINE, 'utf8');
  const start = src.indexOf('export const VIEC_CAN_LAM');
  if (start < 0) return null;
  const body = src.slice(start, src.indexOf('\n};', start));
  const out = [];
  // Mỗi mục có dạng:  id: '…',  label: '…',  can: '…',  hop: [...],
  const re = /id:\s*'([^']+)'[\s\S]*?label:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?hop:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(body))) {
    out.push({
      id: m[1],
      label: m[2].replace(/\\'/g, "'"),
      hop: (m[3].match(/'([^']+)'/g) || []).map((s) => s.slice(1, -1)),
    });
  }
  return out;
}

/** Bóc `NK_VIEC` từ khối script nội tuyến của trang. */
function fromPage() {
  const src = readFileSync(PAGE, 'utf8');
  const start = src.indexOf('var NK_VIEC = [');
  if (start < 0) return null;
  const body = src.slice(start, src.indexOf('\n];', start));
  const out = [];
  const re = /id:\s*'([^']+)'\s*,\s*label:\s*'((?:[^'\\]|\\.)*)'\s*,\s*hop:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(body))) {
    out.push({
      id: m[1],
      label: m[2].replace(/\\'/g, "'"),
      hop: (m[3].match(/'([^']+)'/g) || []).map((s) => s.slice(1, -1)),
    });
  }
  return out;
}

const eng = fromEngine();
const page = fromPage();

if (!eng || !eng.length) fail(`không đọc được VIEC_CAN_LAM trong ${ENGINE}`);
if (!page || !page.length) fail(`không đọc được NK_VIEC trong ${PAGE}`);

if (eng?.length && page?.length) {
  const eIds = eng.map((v) => v.id);
  const pIds = page.map((v) => v.id);

  for (const id of eIds)
    if (!pIds.includes(id))
      fail(`engine có '${id}' mà trang KHÔNG có → người dùng không chọn được`);
  for (const id of pIds) {
    if (!eIds.includes(id)) {
      fail(`trang có '${id}' mà engine KHÔNG có → chọn xong server lặng lẽ rơi về 'hieu-them'`);
    }
  }

  for (const e of eng) {
    const p = page.find((v) => v.id === e.id);
    if (!p) continue;
    if (p.label !== e.label) {
      fail(`'${e.id}' lệch NHÃN:\n    engine: ${e.label}\n    trang : ${p.label}`);
    }
    const a = [...e.hop].sort().join(',');
    const b = [...p.hop].sort().join(',');
    if (a !== b) fail(`'${e.id}' lệch cờ 'hop': engine [${a}] vs trang [${b}]`);
  }

  if (!process.exitCode) {
    console.log(`\x1b[32m✓ check:viec — ${eng.length} mục khớp giữa engine và trang\x1b[0m`);
  }
}
