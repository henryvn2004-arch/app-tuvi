// eval-personas.mjs — chấm MÙ xem 15 giọng thầy (lib/agent/personas.ts) có
// thật sự phân biệt được không, trước khi coi Đợt 4 (hellobot-ui-redesign)
// là xong. Đây là ĐIỀU KIỆN Henry đặt ra để không lặp lại sai lầm 2026-09-19
// (gỡ persona vì "không đo ra khác biệt" — mà thật ra chưa từng đo tử tế).
//
// Chạy (cần GEMINI_API_KEY, dùng --experimental-strip-types để nạp thẳng
// personas.ts, KHÔNG cần build/tsc):
//   node --experimental-strip-types scripts/eval-personas.mjs
//
// Cách đo:
//   1. Với MỖI thầy × MỖI câu hỏi (15×5=75 lượt), gọi Gemini SINH câu trả lời
//      theo đúng voice của thầy đó — CẤM tự xưng tên trong câu trả lời (nếu
//      không thì bài kiểm chỉ đo được "model có chép đúng tên" chứ không đo
//      GIỌNG).
//   2. Với MỖI câu trả lời, gọi Gemini LẦN HAI làm GIÁM KHẢO MÙ: cho xem 15
//      mô tả giọng (không kèm tên thầy, đánh số A–O NGẪU NHIÊN mỗi lượt để
//      không rơi vào việc học thứ tự) rồi hỏi "câu trả lời này khớp mô tả
//      nào nhất". Đúng khi giám khảo chọn ĐÚNG thầy đã sinh ra câu đó.
//   3. Ngưỡng: ≥80% (60/75) mới coi là ĐẠT. Dưới ngưỡng → SAI LỆCH VOICE nào
//      đó chưa đủ riêng, phải sửa persona đó (không phải hạ ngưỡng).
//
// In ra bảng ma trận nhầm lẫn (thầy nào hay bị đoán nhầm thành thầy nào) để
// biết sửa persona nào, không chỉ biết đạt/rớt.

import { PERSONAS } from '../lib/agent/personas.ts';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
if (!GEMINI_KEY) {
  console.error('❌ Thiếu GEMINI_API_KEY — export biến này trước khi chạy.');
  process.exit(1);
}

const QUESTIONS = [
  'Xem giúp tôi vận trình sự nghiệp năm nay thế nào?',
  'Tôi có nên tin tưởng người này để hợp tác làm ăn lâu dài không?',
  'Dạo này tôi cứ thấy bế tắc, không biết phải làm gì tiếp theo.',
  'Chuyện tình cảm của tôi có triển vọng đi tới đâu không?',
  'Tôi nên chọn thời điểm nào để bắt đầu một việc quan trọng?',
];

const ids = Object.keys(PERSONAS);

async function callGemini(system, userMsg, maxOutputTokens = 300) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: {
        maxOutputTokens,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!resp.ok) throw new Error(`Gemini ${resp.status} — ${(await resp.text()).slice(0, 300)}`);
  const j = await resp.json();
  return (j.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
}

function genSystem(voice) {
  return `Bạn là một chuyên gia tư vấn theo cổ pháp phương Đông, trả lời NGẮN GỌN (60–120 từ) cho một câu hỏi của khách, đúng phong cách sau:\n${voice}\n\nQUAN TRỌNG: KHÔNG tự xưng tên/biệt hiệu trong câu trả lời, KHÔNG nói "tôi là thầy...". Chỉ trả lời đúng nội dung, đúng giọng.`;
}

function judgeSystem(shuffledDescs) {
  const lines = shuffledDescs
    .map((d, i) => `${String.fromCharCode(65 + i)}. ${d.voice}`)
    .join('\n\n');
  return `Dưới đây là mô tả GIỌNG NÓI của ${shuffledDescs.length} nhân vật khác nhau (không phải tên riêng, chỉ mô tả cách nói):\n\n${lines}\n\nBạn sẽ nhận một đoạn văn trả lời của MỘT trong các nhân vật trên. Đọc kỹ NHỊP CÂU, THỦ PHÁP (ẩn dụ/điển tích/ca dao/hình ảnh...) và CÁCH DÙNG TỪ để đoán ĐÚNG MỘT chữ cái khớp nhất. CHỈ trả lời đúng một chữ cái (A, B, C...), không giải thích gì thêm.`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  console.log(
    `Model: ${MODEL} · ${ids.length} thầy × ${QUESTIONS.length} câu = ${ids.length * QUESTIONS.length} lượt sinh + ${ids.length * QUESTIONS.length} lượt chấm\n`
  );

  let correct = 0;
  let total = 0;
  // confusion[thầyThật][thầyBịĐoán] = số lần
  const confusion = {};
  for (const id of ids) confusion[id] = {};

  for (const id of ids) {
    const persona = PERSONAS[id];
    for (const q of QUESTIONS) {
      total++;
      let answer;
      try {
        answer = await callGemini(genSystem(persona.voice), q);
      } catch (e) {
        console.error(`  ✗ sinh lỗi (${id}): ${e.message}`);
        continue;
      }

      // Xáo trộn thứ tự 15 mô tả mỗi lượt — giám khảo không được học thứ tự cố định.
      const order = shuffle(ids);
      const descs = order.map((oid) => PERSONAS[oid]);
      const letterToId = {};
      order.forEach((oid, i) => {
        letterToId[String.fromCharCode(65 + i)] = oid;
      });

      let guessLetter;
      try {
        const raw = await callGemini(judgeSystem(descs), `Đoạn văn cần đoán:\n"""${answer}"""`, 5);
        guessLetter = (raw.match(/[A-O]/) || [])[0];
      } catch (e) {
        console.error(`  ✗ chấm lỗi (${id}): ${e.message}`);
        continue;
      }
      const guessedId = letterToId[guessLetter] || '?';
      confusion[id][guessedId] = (confusion[id][guessedId] || 0) + 1;
      const hit = guessedId === id;
      if (hit) correct++;
      console.log(
        `${hit ? '✓' : '✗'} ${persona.name.padEnd(10)} → đoán: ${guessedId === '?' ? '(không đọc được)' : PERSONAS[guessedId]?.name || guessedId}  · "${q.slice(0, 36)}…"`
      );
    }
  }

  const pct = total ? Math.round((correct / total) * 1000) / 10 : 0;
  console.log(`\n=== KẾT QUẢ: ${correct}/${total} (${pct}%) — ngưỡng đạt: 80% ===`);
  if (pct < 80) {
    console.log('\nMa trận nhầm lẫn (thầy thật → thầy hay bị đoán nhầm thành):');
    for (const id of ids) {
      const row = confusion[id];
      const wrong = Object.entries(row)
        .filter(([k]) => k !== id)
        .sort((a, b) => b[1] - a[1]);
      if (wrong.length) {
        console.log(
          `  ${PERSONAS[id].name}: nhầm thành ${wrong.map(([k, n]) => `${PERSONAS[k]?.name || k}(${n})`).join(', ')}`
        );
      }
    }
    console.log(
      '\n❌ CHƯA ĐẠT — sửa persona của các thầy bị nhầm nhiều nhất rồi chạy lại, đừng hạ ngưỡng.'
    );
    process.exit(1);
  }
  console.log('\n✅ ĐẠT — voice đủ phân biệt, an toàn để merge Đợt 4.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
