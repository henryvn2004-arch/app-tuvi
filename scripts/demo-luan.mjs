// demo-luan.mjs — Before/After luận giải: cùng 1 lá số thật, so prompt CŨ vs MỚI.
// Chạy (đọc key từ .env.local):  node --env-file=.env.local scripts/demo-luan.mjs
// Hoặc PowerShell:  $env:GEMINI_API_KEY="..."; node scripts/demo-luan.mjs
// Không có key → chỉ in context + prompt đã ráp (để eyeball).
//
// Provider: khớp prod luận-giải = GEMINI (gemini-2.5-flash). Nếu chỉ có
// ANTHROPIC_API_KEY thì fallback Anthropic. Tự chứa: nạp engine JS
// (public/tuvi-ansao-engine.js), không đụng TS/alias. DIEM_NHAN_RULES "after"
// đọc THẲNG từ lib/agent/prompts.ts (không lệch).

import { readFileSync } from 'fs';

// ── Cấu hình demo ────────────────────────────────────────────────
const BIRTH = { day: 3, month: 6, year: 1998, hourBranch: 1, gender: 'nam' }; // nam, giờ Sửu
const NAM_XEM = 2026;
const QUESTION = 'Sự nghiệp của tôi thế nào, hợp làm nghề gì?';
const FOCUS = ['Quan Lộc', 'Mệnh']; // trọng tâm câu hỏi

// Provider: Gemini nếu có GEMINI_API_KEY (khớp prod luận-giải), else Anthropic.
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const USE_GEMINI = !!GEMINI_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MODEL = USE_GEMINI ? GEMINI_MODEL : ANTHROPIC_MODEL;
const HAS_KEY = USE_GEMINI || !!ANTHROPIC_KEY;

// ── Nạp engine + tính lá số ─────────────────────────────────────
const GIO = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
function loadEngine() {
  const code = readFileSync('public/tuvi-ansao-engine.js', 'utf8');
  const g = globalThis;
  return new Function('window', 'globalThis', code + '\nreturn{convertDuongToAm,anSaoLaSo};')(g, g);
}
function computeLaso(b) {
  const { convertDuongToAm, anSaoLaSo } = loadEngine();
  const conv = convertDuongToAm(b.day, b.month, b.year, GIO[b.hourBranch]);
  const al = conv.amLich;
  return anSaoLaSo({
    ngayAL: al.day, thangAL: al.month, namAL: al.year,
    canNam: conv.canNam, chiNam: conv.chiNam,
    gioIdx: b.hourBranch, gioitinh: b.gender, namXem: NAM_XEM,
  });
}

// ── Format sao (mirror extractLasoContext.starFmt) ──────────────
const starFmt = (s) => {
  if (!s) return '';
  if (typeof s !== 'object') return String(s);
  let t = s.ten || '';
  if (s.brightness) t += '(' + s.brightness + ')';
  if (s.hoa) t += '[Hóa ' + s.hoa + ']';
  return t;
};
const starName = (s) => (typeof s === 'object' ? s.ten || '' : s || '');

// ── Build context: variant 'old' (cắt mù) vs 'new' (rank + [nặng ký]) ──
function buildContext(ls, variant) {
  const palaces = ls.palaces || [];
  let ctx = '';
  if (ls.canChiNam) ctx += 'Can Chi: ' + ls.canChiNam + '\n';
  if (ls.napAm) ctx += 'Nạp Âm: ' + ls.napAm + ' (' + (ls.napAmHanh || '') + ')\n';
  if (ls.menhDC) ctx += 'Mệnh DC: ' + ls.menhDC + '\n';
  if (ls.thanDC) ctx += 'Thân DC: ' + ls.thanDC + '\n';
  if (ls.tuoiXem) ctx += 'Tuổi xem: ' + ls.tuoiXem + '\n';

  const ccWeight = (c) => {
    const l = String(c.loai || '').toLowerCase();
    if (l === 'quy_cuc' || l === 'phu_cuc' || l === 'ban_tien_cuc' || l === 'tốt' || l === 'xấu') return 2;
    if (l === 'than_cu' || l === 'tap_cuc' || l === 'trung') return 1;
    return 0;
  };

  ctx += '\n=== 12 CUNG ===\n';
  for (const p of palaces) {
    const pName = p.cungName || '';
    ctx += '\nCung ' + pName + ' (' + (p.diaChi || '') + ')' + (p.isMenh ? ' ★MỆNH' : '') + (p.isThan ? ' ◆THÂN' : '') + ':\n';
    const chinh = (p.majorStars || []).map(starFmt).filter(Boolean);
    if (chinh.length) ctx += '  Chính tinh: ' + chinh.join(', ') + '\n';
    const phu = (p.stars || []).filter((s) => (typeof s === 'object' ? s.nhom !== 'chinh' : true)).map(starFmt).filter(Boolean);
    if (phu.length) ctx += '  Phụ tinh: ' + phu.slice(0, 8).join(', ') + '\n';
    const tptc = (p.tuChinhStars || []).filter((s) => !p.stars?.includes(s)).map(starFmt).filter(Boolean);
    if (tptc.length) ctx += '  Tam phương tứ chính: ' + tptc.slice(0, 12).join(', ') + '\n';

    let ccThis = (ls.cachCuc || []).filter((c) => {
      if (typeof c !== 'object') return false;
      const parts = String(c.cung || '').split('/');
      return parts.includes(pName) || (p.isThan && parts.includes('Thân'));
    });
    if (variant === 'new') ccThis = [...ccThis].sort((a, b) => ccWeight(b) - ccWeight(a));
    ccThis.forEach((c) => {
      const mota = c.moTa ? ': ' + c.moTa : '';
      const chiTiet = c.chiTiet ? ' — ' + c.chiTiet : '';
      const mark = variant === 'new' && ccWeight(c) === 2 ? '[nặng ký] ' : '';
      ctx += '  Cách cục — ' + mark + (c.ten || '') + (c.loai ? ' (' + c.loai + ')' : '') + mota + chiTiet + '\n';
    });
    const ynItems = ls.cachCucTungCung?.[pName] || [];
    const cap = variant === 'new' ? 10 : 6;
    if (ynItems.length) ctx += '  Ý nghĩa: ' + ynItems.slice(0, cap).join(' | ') + '\n';
  }
  return ctx;
}

// ── System prompt: base shape chung + (chỉ AFTER) DIEM_NHAN_RULES thật ──
const now = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
function extractDiemNhan() {
  const src = readFileSync('lib/agent/prompts.ts', 'utf8');
  const m = src.match(/export const DIEM_NHAN_RULES = `([\s\S]*?)`;/);
  return m ? m[1] : '(không đọc được DIEM_NHAN_RULES)';
}
const SHAPE = (lenLine) => `Bạn là chuyên gia Tử Vi Đẩu Số. Phụng sự trang Tử Vi Minh Bảo.

THÔNG TIN THỜI GIAN: Hôm nay ${now}. Đây là CHAT, không phải bài luận — ngắn gọn, có nhịp.

── ĐỘ DÀI ──
- ${lenLine}

── CẤU TRÚC 4 LỚP (văn xuôi liền mạch, không đánh số, không tiêu đề con) ──
(1) PHÁN QUYẾT: MỘT câu in đậm (**...**) neo vào cấu trúc thật của cung — chính tinh tọa cung (miếu/vượng/đắc/hãm), cách cục, mức cát/sát — nói thẳng tốt/xấu mạnh/yếu. Câu SIGNATURE, ngắn mạnh đáng nhớ.
(2) DẪN CHỨNG CỐT LÕI: sao/cách cục nặng ký nhất cho câu hỏi — gọi đích danh, không dàn trải.
(3) KẾT: đúng 1 câu chốt sắc, dễ nhớ.
(4) MỞ NÚT: nêu đích danh 1 chi tiết CÓ THẬT chưa luận + mời hỏi tiếp bằng đúng 1 câu hỏi.

── QUY TẮC ──
- Dẫn chứng sao/cung/can chi cụ thể từ lá số dưới; xét tam phương tứ chính, không đoán đơn sao. Không bịa "điểm cung/10".
- Xưng hô: người xem NAM → gọi "anh".`;

const OLD_SYSTEM = (ctx) => SHAPE('ĐỘ DÀI: mặc định 130–200 từ, phức tạp tối đa 280.') +
  '\n\n=== DỮ LIỆU LÁ SỐ ===\n' + ctx;
const NEW_SYSTEM = (ctx) => SHAPE('ĐỘ DÀI: mặc định 150–230 từ, phức tạp tối đa 320; câu phán quyết & mạch hình ảnh được ưu tiên chỗ.') +
  '\n\n' + extractDiemNhan() +
  '\n\n=== DỮ LIỆU LÁ SỐ ===\n' + ctx;

// ── Gọi LLM (Gemini ưu tiên, khớp prod luận-giải) ────────────────
async function callGemini(system, userMsg) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: { maxOutputTokens: 1200, temperature: 1 },
    }),
  });
  if (!resp.ok) throw new Error('Gemini ' + resp.status + ' — ' + (await resp.text()).slice(0, 300));
  const j = await resp.json();
  return (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
}
async function callAnthropic(system, userMsg) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1200, system, messages: [{ role: 'user', content: userMsg }] }),
  });
  if (!resp.ok) throw new Error('Anthropic ' + resp.status + ' — ' + (await resp.text()).slice(0, 300));
  const j = await resp.json();
  return (j.content || []).map((b) => b.text || '').join('');
}
const callLLM = (system, userMsg) => (USE_GEMINI ? callGemini(system, userMsg) : callAnthropic(system, userMsg));

// ── Main ─────────────────────────────────────────────────────────
const ls = computeLaso(BIRTH);
const userMsg = `${QUESTION}\n(Trọng tâm — ưu tiên luận các cung: ${FOCUS.join(', ')}.)`;
const oldSys = OLD_SYSTEM(buildContext(ls, 'old'));
const newSys = NEW_SYSTEM(buildContext(ls, 'new'));

const bar = (t) => '\n' + '═'.repeat(72) + '\n' + t + '\n' + '═'.repeat(72);
console.log(`Lá số: ${ls.canChiNam}, Mệnh tại ${ls.menhDC}, Thân tại ${ls.thanDC} · năm xem ${NAM_XEM}`);
console.log(`Câu hỏi: "${QUESTION}"  · provider: ${USE_GEMINI ? 'GEMINI' : 'ANTHROPIC'} · model: ${MODEL}`);

if (!HAS_KEY) {
  console.log(bar('KHÔNG có GEMINI_API_KEY / ANTHROPIC_API_KEY → in prompt đã ráp (không gọi LLM)'));
  console.log(bar('SYSTEM — AFTER (mới)'));
  console.log(newSys);
  console.log(bar('Đặt key rồi chạy lại để xem prose before/after'));
  process.exit(0);
}

console.log(bar('⏳ Đang gọi LLM 2 lần (before / after)…'));
const [oldOut, newOut] = await Promise.all([
  callLLM(oldSys, userMsg),
  callLLM(newSys, userMsg),
]);
console.log(bar('❌ BEFORE — prompt CŨ'));
console.log(oldOut.trim());
console.log(bar('✅ AFTER — prompt MỚI (hình tượng + giọng người + nới trần)'));
console.log(newOut.trim());
console.log('');
