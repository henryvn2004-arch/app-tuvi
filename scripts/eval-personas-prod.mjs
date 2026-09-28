// eval-personas-prod.mjs — chấm MÙ giọng 15 thầy trên PROMPT THẬT của rail lá số.
//
// 🔴 Vì sao có script này bên cạnh eval-personas.mjs: bản kia sinh câu trả lời
// bằng một system prompt 3 dòng + persona — nó chứng minh MÔ TẢ giọng đủ khác
// nhau, nhưng KHÔNG chứng minh giọng còn sống trong prompt prod. Đo 2026-09-27
// (persona v1): 100% trên prompt 3 dòng, chỉ 67–71% trên prompt thật — persona
// chiếm 1,1% system, ba câu mẫu trung tính kéo cả 15 thầy về cùng một câu mở.
// Bài kiểm đặt tên theo điều nó THỰC SỰ đo (CLAUDE.md): đây mới là thước đo chính.
//
// Dựng system/tin user y như nhánh `req.birth` của lib/agent/run.ts:
//   system = apMauThay(CHAT_SYSTEM_LASO(nguoiXem + lá số đầy đủ, _, personaVoice), id)
//   user   = câu hỏi + khối chủ đề/focusHint + dòng NHỊP (lib/agent/nhip.ts)
// Không gửi tool (bài đo GIỌNG) nên chọn câu hỏi không bắt buộc tra vận.
//
// Chạy (Node ≥22, cần GEMINI_API_KEY; trong container cần proxy cho fetch):
//   NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings \
//     --import ./scripts/ts-alias-hooks.mjs scripts/eval-personas-prod.mjs
// Biến tuỳ chọn: GEMINI_MODEL (mặc định = model rail prod) · OUT=<file.json> lưu
// toàn bộ câu trả lời để đọc tay.
// Ngưỡng: ≥80% tổng VÀ không thầy nào dưới 3/5.

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
  'Xem giúp tôi vận trình sự nghiệp năm nay thế nào?',
  'Tôi có nên tin tưởng người này để hợp tác làm ăn lâu dài không?',
  'Dạo này tôi cứ thấy bế tắc, không biết phải làm gì tiếp theo.',
  'Chuyện tình cảm của tôi có triển vọng đi tới đâu không?',
  'Tôi nên chọn thời điểm nào để bắt đầu một việc quan trọng?',
];
// Mỗi câu hỏi một lá số khác nhau, cả nam lẫn nữ (xưng anh/chị · cô/cậu).
const BIRTHS = [
  { name: 'Minh', gender: 'nam', day: 8, month: 11, year: 1988, hourBranch: 3, isLunar: false },
  { name: 'Hà', gender: 'nu', day: 21, month: 6, year: 1995, hourBranch: 7, isLunar: false },
  { name: 'Tuấn', gender: 'nam', day: 2, month: 2, year: 1979, hourBranch: 10, isLunar: false },
  { name: 'Lan', gender: 'nu', day: 14, month: 3, year: 1992, hourBranch: 5, isLunar: false },
  { name: 'Khoa', gender: 'nam', day: 30, month: 9, year: 1990, hourBranch: 0, isLunar: false },
];
const NO_NAME = '\n\n(Bài kiểm: KHÔNG tự xưng tên/biệt hiệu trong câu trả lời.)';

const cases = BIRTHS.map((b) => {
  const r = computeLaso(b);
  if (!r.ok || !r.ls) throw new Error('computeLaso lỗi: ' + r.error);
  return {
    b,
    ls: r.ls,
    ctx: nguoiXemLine(b.name, b.gender) + extractLasoContext(r.ls, '', { full: true }),
  };
});
const ids = Object.keys(PERSONAS);

async function gemini(system, user, maxOutputTokens) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${KEY}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens, temperature: 0.7 },
      }),
    });
    if (r.status === 429 || r.status >= 500) {
      await new Promise((s) => setTimeout(s, 2000 * 2 ** attempt));
      continue;
    }
    if (!r.ok) throw new Error(`Gemini ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const fr = j.candidates?.[0]?.finishReason;
    // Bị cắt (token nghĩ ăn chung trần) mà vẫn chấm là đo trên câu cụt — ném lỗi.
    if (fr && fr !== 'STOP') throw new Error(`finishReason=${fr}`);
    return (j.candidates?.[0]?.content?.parts || [])
      .filter((p) => !p.thought)
      .map((p) => p.text || '')
      .join('')
      .trim();
  }
  throw new Error('Gemini: hết lượt thử lại');
}

const shuffle = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const judgeSystem = (descs) =>
  `Dưới đây là mô tả GIỌNG NÓI của ${descs.length} nhân vật khác nhau (không phải tên riêng, chỉ mô tả cách nói):\n\n${descs
    .map((d, i) => `${String.fromCharCode(65 + i)}. ${d.voice}`)
    .join(
      '\n\n'
    )}\n\nBạn sẽ nhận một đoạn văn trả lời của MỘT trong các nhân vật trên. Đọc kỹ THÁI ĐỘ, NHỊP CÂU, THỦ PHÁP và CÁCH DÙNG TỪ để đoán ĐÚNG MỘT chữ cái khớp nhất. CHỈ trả lời đúng một chữ cái (A, B, C...), không giải thích gì thêm.`;

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
for (const id of ids) QUESTIONS.forEach((q, qi) => jobs.push({ id, q, qi }));
console.log(
  `Model: ${MODEL} · prompt THẬT · ${jobs.length} lượt sinh + ${jobs.length} lượt chấm\n`
);

const results = await pool(jobs, 6, async (jb) => {
  const c = cases[jb.qi];
  const system = apMauThay(CHAT_SYSTEM_LASO(c.ctx, undefined, personaVoice(jb.id)), jb.id);
  const hint = khoiChuDe(jb.q, c.ls, c.b.gender) || focusHint(jb.q);
  const nhip = tinhNhip([jb.q], jb.id);
  const user = jb.q + (hint ? '\n\n' + hint : '') + '\n\n' + nhipHint(nhip, jb.id) + NO_NAME;
  let answer;
  try {
    answer = await gemini(system, user, 6000);
  } catch (e) {
    process.stdout.write('!');
    return { ...jb, err: e.message };
  }
  const descs = shuffle(ids.map((id) => ({ id, voice: PERSONAS[id].voice })));
  let guess = '?';
  try {
    const letter = (await gemini(judgeSystem(descs), answer, 2000))
      .toUpperCase()
      .match(/[A-O]/)?.[0];
    if (letter) guess = descs[letter.charCodeAt(0) - 65]?.id || '?';
  } catch {
    // giám khảo lỗi ⇒ tính là trượt (không bỏ khỏi mẫu số)
  }
  process.stdout.write(guess === jb.id ? '✓' : '✗');
  return {
    ...jb,
    answer,
    guess,
    hit: guess === jb.id,
    muc: nhip.muc,
    dinh: nhip.dinh,
    words: answer.split(/\s+/).filter(Boolean).length,
  };
});

const ok = results.filter((r) => !r.err);
const hit = ok.filter((r) => r.hit).length;
const pct = (100 * hit) / (ok.length || 1);
const words = ok.map((r) => r.words);
const avg = words.reduce((s, v) => s + v, 0) / (words.length || 1);
const sd = Math.sqrt(words.reduce((s, v) => s + (v - avg) ** 2, 0) / (words.length || 1));
const khuonMo = ok.filter((r) =>
  /không (nằm|phụ thuộc|phải)[^.]{0,80}mà (nằm |là |ở )?/i.test(
    r.answer.replace(/\*\*/g, '').split(/(?<=[.?!])\s/)[0]
  )
).length;

console.log(
  `\n\nĐÚNG ${hit}/${ok.length} = ${pct.toFixed(1)}%  · lỗi sinh ${results.length - ok.length}`
);
console.log(
  `Độ dài: trung bình ${Math.round(avg)} từ · lệch chuẩn ${Math.round(sd)} · ngắn nhất ${Math.min(...words)} · dài nhất ${Math.max(...words)}`
);
console.log(`Câu mở theo khuôn "không nằm ở X mà ở Y": ${khuonMo}/${ok.length}`);
const yeu = [];
console.log(
  ids
    .map((id) => {
      const rs = ok.filter((r) => r.id === id);
      const h = rs.filter((r) => r.hit).length;
      if (h < 3) yeu.push(PERSONAS[id].name);
      return `${PERSONAS[id].name}:${h}/${rs.length}`;
    })
    .join(' · ')
);
if (process.env.OUT) {
  writeFileSync(process.env.OUT, JSON.stringify(results, null, 1));
  console.log('→ ' + process.env.OUT);
}
if (pct < 80 || yeu.length) {
  console.log(
    `\n❌ CHƯA ĐẠT${yeu.length ? ` — dưới 3/5: ${yeu.join(', ')}` : ''}. Sửa persona của thầy yếu rồi chạy lại, đừng hạ ngưỡng.`
  );
  process.exit(1);
}
console.log('\n✅ ĐẠT — giọng sống được trong prompt thật.');
