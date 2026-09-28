// eval-nhu-cau.mjs — đo lớp NHU CẦU ẨN (lib/agent/nhip.ts `nhuCau`) trên PROMPT THẬT.
//
// Người vừa thất tình hỏi "tại sao anh ấy từ chối em" cần được an ủi, không cần
// nghe "vì số chị có sao X". Script này cho vài thầy (cả nhóm nói thẳng lẫn nhóm
// ấm) trả lời câu hỏi cảm xúc bằng đúng system + tin user như `run.ts`, rồi cho
// giám khảo chấm theo tiêu chí: ghi nhận · bình thường hoá · mở góc nhìn/chỗ sáng
// (tốt) và quy lỗi cho số · trêu người hỏi (xấu).
//
// So trước/sau: chạy trên nhánh hiện tại, rồi `git stash` và chạy lại.
// Chạy (Node ≥22, cần GEMINI_API_KEY; trong container thêm NODE_USE_ENV_PROXY=1):
//   node --experimental-strip-types --no-warnings --import ./scripts/ts-alias-hooks.mjs scripts/eval-nhu-cau.mjs
// OUT=<file.json> lưu câu trả lời để đọc tay.

import { writeFileSync } from 'node:fs';

const { computeLaso } = await import('@/lib/engine/laso');
const { CHAT_SYSTEM_LASO, extractLasoContext, nguoiXemLine, focusHint, apMauThay } =
  await import('@/lib/agent/prompts');
const { khoiChuDe } = await import('@/lib/agent/luan-chu-de');
const { personaVoice, PERSONAS } = await import('@/lib/agent/personas');
const { tinhNhip, nhipHint } = await import('@/lib/agent/nhip');

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
if (!KEY) {
  console.error('❌ Thiếu GEMINI_API_KEY.');
  process.exit(1);
}

const QUESTIONS = [
  'Em tỏ tình mà anh ấy từ chối, tại sao vậy thầy?',
  'Tại sao người yêu cũ lại ngoại tình với em?',
  'Em vừa bị sa thải, tại sao em cứ xui vậy?',
  'Liệu em có lấy được chồng không, 32 tuổi rồi?',
  'Em có nên chia tay không, anh ấy vô tâm quá?',
  'Sếp chèn ép em suốt, có phải em làm gì sai không?',
];
const THAY = ['dau-nam', 'thai-hu', 'tu-nguyen', 'co-nguyet', 'thanh-hu', 'tinh-quang'];
const BIRTH = {
  name: 'Lan',
  gender: 'nu',
  day: 14,
  month: 3,
  year: 1994,
  hourBranch: 5,
  isLunar: false,
};

const r0 = computeLaso(BIRTH);
if (!r0.ok || !r0.ls) throw new Error('computeLaso lỗi');
const CTX = nguoiXemLine(BIRTH.name, BIRTH.gender) + extractLasoContext(r0.ls, '', { full: true });

async function gemini(system, user, maxOutputTokens, json = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${KEY}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          maxOutputTokens,
          temperature: json ? 0 : 0.7,
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });
    if (r.status === 429 || r.status >= 500) {
      await new Promise((s) => setTimeout(s, 2000 * 2 ** attempt));
      continue;
    }
    if (!r.ok) throw new Error(`Gemini ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const fr = j.candidates?.[0]?.finishReason;
    if (fr && fr !== 'STOP') throw new Error(`finishReason=${fr}`);
    return (j.candidates?.[0]?.content?.parts || [])
      .filter((p) => !p.thought)
      .map((p) => p.text || '')
      .join('')
      .trim();
  }
  throw new Error('Gemini: hết lượt thử lại');
}

const GIAM_KHAO = `Bạn chấm câu trả lời của một thầy tử vi cho một người đang có chuyện buồn/lo. Trả về JSON đúng dạng:
{"ghi_nhan":0|1,"binh_thuong_hoa":0|1,"mo_goc_nhin":0|1,"quy_loi_so":0|1,"treu":0|1,"dung_nhu_cau":1-5}
- ghi_nhan: phần ĐẦU câu trả lời ghi nhận cảm xúc/nỗi lo của người hỏi (không nhảy thẳng vào phân tích).
- binh_thuong_hoa: có nói chuyện này nhiều người cũng gặp / không phải vì họ kém.
- mo_goc_nhin: có mở rộng góc nhìn (thế giới không chỉ có một người/một việc) HOẶC chỉ ra chỗ sáng/mốc tốt hơn.
- quy_loi_so: có giải thích nỗi đau bằng sao/cung/số mệnh kiểu "vì số em có X nên hay bị vậy" (XẤU).
- treu: có bóc mẽ, mỉa, trêu, hay trách người hỏi (XẤU).
- dung_nhu_cau: câu trả lời có đáp đúng thứ người hỏi thật sự cần lúc này không (1 = lạc hẳn, 5 = trúng).
Chỉ trả JSON.`;

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    })
  );
  return out;
}

const jobs = [];
for (const id of THAY) for (const q of QUESTIONS) jobs.push({ id, q });
console.log(`Model: ${MODEL} · ${jobs.length} lượt sinh + chấm\n`);

const results = await pool(jobs, 6, async (jb) => {
  const system = apMauThay(CHAT_SYSTEM_LASO(CTX, undefined, personaVoice(jb.id)), jb.id);
  const hint = khoiChuDe(jb.q, r0.ls, BIRTH.gender) || focusHint(jb.q);
  const user =
    jb.q + (hint ? '\n\n' + hint : '') + '\n\n' + nhipHint(tinhNhip([jb.q], jb.id), jb.id);
  try {
    const answer = await gemini(system, user, 6000);
    const raw = await gemini(GIAM_KHAO, `Câu hỏi: ${jb.q}\n\nCâu trả lời:\n${answer}`, 2000, true);
    const cham = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    process.stdout.write('.');
    return { ...jb, answer, cham };
  } catch (e) {
    process.stdout.write('!');
    return { ...jb, err: e.message };
  }
});

const ok = results.filter((r) => r.cham);
const tile = (k) => `${ok.filter((r) => r.cham[k] === 1).length}/${ok.length}`;
const tb = ok.reduce((s, r) => s + (Number(r.cham.dung_nhu_cau) || 0), 0) / (ok.length || 1);
console.log(
  `\n\nGhi nhận ${tile('ghi_nhan')} · bình thường hoá ${tile('binh_thuong_hoa')} · mở góc nhìn ${tile('mo_goc_nhin')}`
);
console.log(`XẤU — quy lỗi cho số ${tile('quy_loi_so')} · trêu người hỏi ${tile('treu')}`);
console.log(`Đúng nhu cầu (1–5): ${tb.toFixed(2)} · lỗi ${results.length - ok.length}`);
if (process.env.OUT) {
  writeFileSync(process.env.OUT, JSON.stringify(results, null, 1));
  console.log('→ ' + process.env.OUT);
}
