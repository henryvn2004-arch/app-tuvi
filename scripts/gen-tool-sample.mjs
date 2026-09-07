#!/usr/bin/env node
/**
 * Sinh 1 LẦN, dùng cho 3 việc: (a) văn MẪU (dummy) cho khối blur của một tool
 * (xem app-chu-trinh-cuoc-doi.html DUMMY_CTCD) — gọi ĐÚNG pipeline thật của
 * route (cùng hàm build-prompt + llmTextFull), không viết tay; (b) một PDF
 * mẫu (lá số + toàn bộ bản luận của lá số MẪU đó) upload lên Supabase
 * Storage, để làm nút "Xem mẫu" trong form nhập liệu; (c) cùng lượt gọi LLM
 * đó dùng luôn làm bản ghi demo clip (chạy tool thật, không phải giả lập).
 *
 * ⚠️ CHẠY Ở NƠI CÓ ĐỦ 3 BIẾN MÔI TRƯỜNG THẬT (không chạy được trong sandbox
 * phiên này — xem docs/nhat-ky/2026-09.md mục "Chu Trình Cuộc Đời"):
 *   GEMINI_API_KEY (hoặc ANTHROPIC_API_KEY/KIMIK3_API_KEY) — sinh văn bản
 *   SUPABASE_URL + SUPABASE_SERVICE_KEY — upload PDF (bucket `tool-samples`,
 *     tự tạo public nếu chưa có — xem hướng dẫn cuối file khi chạy lần đầu)
 *
 * Chạy bằng `tsx` (KHÔNG dùng `tsc --ignoreConfig` như gen-tool-avatars.mjs:
 * cây import ở đây sâu và dùng alias `@/...`, tsc bỏ qua tsconfig thì không
 * resolve được — tsx đọc thẳng tsconfig, xử lý được ngay):
 *
 *   npx tsx scripts/gen-tool-sample.mjs <toolId>
 *   npx tsx scripts/gen-tool-sample.mjs <toolId> --pdf-only   # chỉ PDF, không gọi LLM lại
 *   npx tsx scripts/gen-tool-sample.mjs <toolId> --dummy-only # chỉ JSON văn mẫu
 *   npx tsx scripts/gen-tool-sample.mjs --all                 # chạy lần lượt mọi tool đã khai
 *
 * Đã có JSON văn mẫu từ lượt trước thì KHÔNG gọi lại LLM cho phần đó (đọc từ
 * `outJson` nếu tồn tại) — dùng `--force` để sinh lại toàn bộ.
 *
 * Thêm tool mới: khai thêm một mục trong TOOL_CONFIGS bên dưới. Có hai `kind`:
 *   'phan' — tool chia PHẦN, dùng chung `buildPromptCached` (chu-trinh-cuoc-doi,
 *            laso, van-han-nam). Output là văn xuôi markdown theo từng phần.
 *   'json' — tool MỘT LƯỢT trả JSON có schema (day-con, nguoi-khac,
 *            huong-nghiep-tre). Output là một object nhiều trường chữ.
 * Mọi phần còn lại (PDF, upload, CLI) dùng chung, không phải viết lại.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { computeLaso, formatLaSoV2 } from '../lib/engine/laso.ts';
import { buildPromptCached } from '../lib/agent/luan-giai-doc.ts';
import { buildPromptThang } from '../lib/agent/van-han-thang.ts';
import { spans12 } from '../lib/engine/van-han-12.ts';
import { llmTextFull } from '../lib/llm/complete.ts';
import { parseLlmJson } from '../lib/api/tool-helpers.ts';
import { computeDayCon } from '../lib/engine/day-con.ts';
import {
  DAY_CON_SYSTEM_PROMPT,
  DAY_CON_SCHEMA,
  buildDayConPrompt,
} from '../lib/agent/day-con-prompt.ts';
import { computeNguoiKhac } from '../lib/engine/nguoi-khac.ts';
import {
  NGUOI_KHAC_SYSTEM_PROMPT,
  NGUOI_KHAC_SCHEMA,
  buildNguoiKhacPrompt,
} from '../lib/agent/nguoi-khac-prompt.ts';
import { computeHuongNghiepTre } from '../lib/engine/huong-nghiep-tre.ts';
import {
  HUONG_NGHIEP_TRE_SYSTEM_PROMPT,
  HUONG_NGHIEP_TRE_SCHEMA,
  buildHuongNghiepTrePrompt,
} from '../lib/agent/huong-nghiep-tre-prompt.ts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SAMPLE_BIRTH = {
  day: 15,
  month: 8,
  year: 1990,
  hourBranch: 3,
  gender: 'nam',
  isLunar: false,
};
const SAMPLE_CHILD_BIRTH = {
  day: 3,
  month: 5,
  year: 2016,
  hourBranch: 7,
  gender: 'nu',
  isLunar: false,
};
const NAM_XEM = 2026;

// ── Cấu hình theo tool — thêm tool mới thì thêm một mục ở đây ──────────────
const TOOL_CONFIGS = {
  'chu-trinh-cuoc-doi': {
    kind: 'phan',
    label: 'Chu Trình Cuộc Đời',
    sampleBirth: SAMPLE_BIRTH,
    namXem: NAM_XEM,
    // Engine phan 14-24 = local phần 1-11 của tool này. 14+15 miễn phí (xem
    // trước thật, KHÔNG cần dummy) — chỉ 16-24 (9 phần) cần văn mẫu cho khối
    // blur. PDF mẫu thì in ĐỦ cả 11 phần (14-24) cho đẹp, kể cả 2 phần free.
    dummyPhanList: [16, 17, 18, 19, 20, 21, 22, 23, 24],
    pdfPhanList: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    maxTokFor(ep) {
      const THINK_BUDGET = 900;
      return (
        THINK_BUDGET + (ep === 14 ? 4500 : ep === 24 ? 2100 : ep >= 15 && ep <= 23 ? 1650 : 1500)
      );
    },
    phanLabels: {
      14: 'Tổng quan đại vận',
      15: 'Đại Vận 1',
      16: 'Đại Vận 2',
      17: 'Đại Vận 3',
      18: 'Đại Vận 4',
      19: 'Đại Vận 5',
      20: 'Đại Vận 6',
      21: 'Đại Vận 7',
      22: 'Đại Vận 8',
      23: 'Đại Vận 9',
      24: 'Tiểu Vận Năm Xem',
    },
    outJson: join(ROOT, 'public/samples/chu-trinh-cuoc-doi-dummy.json'),
    pdfTitle: 'Chu Trình Cuộc Đời — Bản mẫu',
    storagePath: 'chu-trinh-cuoc-doi/sample.pdf',
  },
  laso: {
    kind: 'phan',
    label: 'Luận Giải Lá Số',
    sampleBirth: SAMPLE_BIRTH,
    namXem: NAM_XEM,
    // FREE_PHAN=2 (app/api/lasotuvi/route.ts): phần 1 (Tổng quan) + phần 2
    // (Mệnh) xem trước thật, miễn phí — chỉ 3-13 (11 cung còn lại) cần dummy.
    dummyPhanList: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    pdfPhanList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    maxTokFor(ep) {
      const THINK_BUDGET = 900;
      return THINK_BUDGET + (ep === 1 ? 3000 : ep >= 2 && ep <= 13 ? 2400 : 1500);
    },
    phanLabels: {
      1: 'Tổng quan lá số',
      2: 'Mệnh',
      3: 'Phụ Mẫu',
      4: 'Phúc Đức',
      5: 'Điền Trạch',
      6: 'Quan Lộc',
      7: 'Nô Bộc',
      8: 'Thiên Di',
      9: 'Tật Ách',
      10: 'Tài Bạch',
      11: 'Tử Tức',
      12: 'Phu Thê',
      13: 'Huynh Đệ',
    },
    outJson: join(ROOT, 'public/samples/laso-dummy.json'),
    pdfTitle: 'Luận Giải Lá Số — Bản mẫu',
    storagePath: 'laso/sample.pdf',
  },
  'van-han-nam': {
    kind: 'phan-thang',
    label: 'Vận Hạn Năm Tới',
    sampleBirth: SAMPLE_BIRTH,
    namXem: NAM_XEM,
    // Tool KHÔNG bán lẻ (bấm là mở cả bó) — dummy phủ CẢ 16 phần, không có
    // phần free riêng như 2 tool trên. Phần 1-4 dùng LẠI đúng văn của `laso`/
    // `chu-trinh-cuoc-doi` (readCachedLuanGiaiPhan ở route thật) nên script
    // này SINH RIÊNG cho công bằng, không đọc chéo file dummy của tool khác.
    dummyPhanList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    pdfPhanList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    maxTokFor(ep) {
      // Cùng công thức maxTok của route thật (app/api/van-han-nam/route.ts:
      // laSoPhanMap ánh xạ 1→1, 2→14, 3→14+dvHienTai, 4→24; 5-16 là 12 tháng).
      const THINK_BUDGET = 900;
      if (ep === 1) return THINK_BUDGET + 3000;
      if (ep === 2) return THINK_BUDGET + 4500;
      if (ep === 3) return THINK_BUDGET + 1650; // đại vận hiện tại nằm trong dải 15-23
      if (ep === 4) return THINK_BUDGET + 2100;
      return THINK_BUDGET + 1500; // 5-16: 12 tháng, cùng trần buildPromptThang dùng ở route (mặc định)
    },
    phanLabels: {
      1: 'Tổng quan lá số',
      2: 'Hành trình cuộc đời',
      3: 'Đại vận hiện tại',
      4: 'Tiểu vận năm nay',
      5: 'Tháng 1',
      6: 'Tháng 2',
      7: 'Tháng 3',
      8: 'Tháng 4',
      9: 'Tháng 5',
      10: 'Tháng 6',
      11: 'Tháng 7',
      12: 'Tháng 8',
      13: 'Tháng 9',
      14: 'Tháng 10',
      15: 'Tháng 11',
      16: 'Tháng 12',
    },
    outJson: join(ROOT, 'public/samples/van-han-nam-dummy.json'),
    pdfTitle: 'Vận Hạn Năm Tới — Bản mẫu',
    storagePath: 'van-han-nam/sample.pdf',
  },
  'day-con': {
    kind: 'json',
    label: 'Dạy Con Theo Lá Số',
    sampleBirth: SAMPLE_CHILD_BIRTH,
    namXem: NAM_XEM,
    ten: 'Bé An',
    moiLo: 'hoc-hanh',
    systemPrompt: DAY_CON_SYSTEM_PROMPT,
    schema: DAY_CON_SCHEMA,
    maxTokens: 6600,
    computeProfile(ls) {
      return computeDayCon(ls, SAMPLE_CHILD_BIRTH.gender, 'hoc-hanh', null, NAM_XEM);
    },
    buildPrompt(p, ten) {
      return buildDayConPrompt(p, ten);
    },
    // `PREVIEW_KEEP_PROSE` của route thật (app/api/day-con/route.ts) — hai
    // trường này ĐÃ xem trước MIỄN PHÍ, không cần dummy. Phần blur cần dummy
    // là mọi trường chữ CÒN LẠI.
    freeFields: ['conNguoi', 'chatNoi'],
    fieldOrder: DAY_CON_SCHEMA.propertyOrdering,
    outJson: join(ROOT, 'public/samples/day-con-dummy.json'),
    pdfTitle: 'Dạy Con Theo Lá Số — Bản mẫu',
    storagePath: 'day-con/sample.pdf',
  },
  'nguoi-khac': {
    kind: 'json',
    label: 'Lá Số Người Khác',
    sampleBirth: SAMPLE_BIRTH,
    namXem: NAM_XEM,
    ten: 'Anh Minh',
    quanHe: 'sep',
    viec: 'nho-viec',
    systemPrompt: NGUOI_KHAC_SYSTEM_PROMPT,
    schema: NGUOI_KHAC_SCHEMA,
    maxTokens: 4500,
    computeProfile(ls) {
      return computeNguoiKhac(ls, 'nam', 'sep', null, NAM_XEM, 'nho-viec');
    },
    buildPrompt(p, ten) {
      return buildNguoiKhacPrompt(p, ten);
    },
    // Route thật (app/api/nguoi-khac/route.ts) hiện chưa có bản xem-trước AI
    // riêng — cả object là hàng TRẢ TIỀN. Không có `freeFields` ⇒ dummy phủ
    // TOÀN BỘ các trường chữ.
    freeFields: [],
    fieldOrder: NGUOI_KHAC_SCHEMA.propertyOrdering,
    outJson: join(ROOT, 'public/samples/nguoi-khac-dummy.json'),
    pdfTitle: 'Lá Số Người Khác — Bản mẫu',
    storagePath: 'nguoi-khac/sample.pdf',
  },
  'huong-nghiep-tre': {
    kind: 'json',
    label: 'Hướng Nghiệp Sớm Cho Con',
    sampleBirth: SAMPLE_CHILD_BIRTH,
    namXem: NAM_XEM,
    ten: 'Bé An',
    moiLo: 'chua-thich-gi',
    systemPrompt: HUONG_NGHIEP_TRE_SYSTEM_PROMPT,
    schema: HUONG_NGHIEP_TRE_SCHEMA,
    maxTokens: 5200,
    computeProfile(ls) {
      return computeHuongNghiepTre(ls, SAMPLE_CHILD_BIRTH.gender, 'chua-thich-gi', NAM_XEM);
    },
    buildPrompt(p, ten) {
      return buildHuongNghiepTrePrompt(p, ten);
    },
    freeFields: [],
    fieldOrder: HUONG_NGHIEP_TRE_SCHEMA.propertyOrdering,
    outJson: join(ROOT, 'public/samples/huong-nghiep-tre-dummy.json'),
    pdfTitle: 'Hướng Nghiệp Sớm Cho Con — Bản mẫu',
    storagePath: 'huong-nghiep-tre/sample.pdf',
  },
  // 🔴 nhan-mach CỐ Ý KHÔNG khai ở đây — Henry đã chốt tool này KHÔNG cần
  // bước xem-trước/blur (nhóm 2-8 người, không phải một-prompt đơn lẻ).
};

// ── CLI ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const toolIds = ALL ? Object.keys(TOOL_CONFIGS) : [argv[0]];
const has = (n) => argv.includes(n);
const PDF_ONLY = has('--pdf-only');
const DUMMY_ONLY = has('--dummy-only');
const FORCE = has('--force');

if (!ALL && !TOOL_CONFIGS[toolIds[0]]) {
  console.error(
    'Dùng: npx tsx scripts/gen-tool-sample.mjs <toolId> [--pdf-only|--dummy-only|--force]'
  );
  console.error('      npx tsx scripts/gen-tool-sample.mjs --all');
  console.error('Tool đã khai:', Object.keys(TOOL_CONFIGS).join(', '));
  process.exit(1);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Thiếu biến môi trường ${name} — xem hướng dẫn ở đầu file.`);
    process.exit(1);
  }
  return v;
}

async function runOne(toolId) {
  const cfg = TOOL_CONFIGS[toolId];
  console.log(`\n=== ${cfg.label} (${toolId}) ===`);

  // ── 1) Tính lá số mẫu ─────────────────────────────────────────────────
  const { ok, ls, error } = computeLaso(cfg.sampleBirth, cfg.namXem);
  if (!ok) {
    console.error('❌ computeLaso lỗi:', error);
    process.exit(1);
  }
  const laSoText = formatLaSoV2(ls);
  console.log(
    `✓ Lá số mẫu: ${cfg.sampleBirth.day}/${cfg.sampleBirth.month}/${cfg.sampleBirth.year}, ${cfg.sampleBirth.gender}, xem ${cfg.namXem}`
  );

  let store = {};
  if (existsSync(cfg.outJson)) {
    try {
      store = JSON.parse(readFileSync(cfg.outJson, 'utf8'));
    } catch {
      store = {};
    }
  }

  if (cfg.kind === 'json') {
    await runJsonTool(toolId, cfg, ls, store);
    return;
  }
  await runPhanTool(toolId, cfg, ls, laSoText, store);
}

// Số thứ tự (1-based) đại vận đang đi — bản CHÉP LẠI của
// `dvHienTaiSo` trong app/api/van-han-nam/route.ts (hàm đó cố ý KHÔNG export:
// Next App Router chỉ nhận GET/POST/… làm export của route file). Giữ đúng
// hành vi: đại vận thứ 10+ (trên 90 tuổi) kẹp về 9 vì bản luận chỉ có prompt
// cho ĐV1–ĐV9 (phần 15–23).
function dvHienTaiSo(ls) {
  const dvs = ls.daiVans || [];
  const cur = ls.daiVanHienTai;
  if (!cur) return 1;
  const i = dvs.findIndex((d) => d && d.cungIdx === cur.cungIdx && d.tuoiStart === cur.tuoiStart);
  return i >= 0 ? Math.min(i + 1, 9) : 1;
}

// ── Tool CHIA PHẦN (chu-trinh-cuoc-doi, laso, van-han-nam) ─────────────────
async function runPhanTool(toolId, cfg, ls, laSoText, store) {
  let spans = null;
  function buildOne(ep) {
    if (cfg.kind === 'phan-thang' && ep >= 5) {
      if (!spans) {
        const now = new Date();
        spans = spans12(now.getDate(), now.getMonth() + 1, now.getFullYear());
      }
      const stt = ep - 4;
      return buildPromptThang(ls, spans[stt - 1], stt, '');
    }
    if (cfg.kind === 'phan-thang') {
      // phan 1-4 của van-han-nam trùng phan 1/14/(14+dvHienTai)/24 của
      // laso/chu-trinh-cuoc-doi (đúng laSoPhanMap ở route thật).
      const map = { 1: 1, 2: 14, 3: 14 + dvHienTaiSo(ls), 4: 24 };
      return buildPromptCached(map[ep], laSoText, '');
    }
    return buildPromptCached(ep, laSoText, '');
  }

  async function genPhan(ep) {
    if (!FORCE && store[ep]) {
      console.log(`  phần ${ep}: đã có, bỏ qua (dùng --force để sinh lại)`);
      return;
    }
    requireEnv('GEMINI_API_KEY');
    const { system, prompt } = buildOne(ep);
    console.log(`  phần ${ep} (${cfg.phanLabels[ep] || ep}): đang gọi LLM…`);
    const r = await llmTextFull({
      system,
      prompt,
      maxTokens: cfg.maxTokFor(ep),
      cacheSystem: true,
      effort: 'low',
    });
    const text = r.text.replace(/```chartdata[\s\S]*?```/, '').trim();
    store[ep] = text;
    console.log(`  phần ${ep}: OK (${text.length} ký tự, model ${r.model})`);
  }

  if (!PDF_ONLY) {
    const needed = DUMMY_ONLY
      ? cfg.dummyPhanList
      : Array.from(new Set([...cfg.dummyPhanList, ...cfg.pdfPhanList]));
    for (const ep of needed) await genPhan(ep);
    mkdirSync(dirname(cfg.outJson), { recursive: true });
    const dummyOut = {};
    for (const ep of cfg.dummyPhanList) if (store[ep]) dummyOut[ep] = store[ep];
    writeFileSync(cfg.outJson, JSON.stringify(dummyOut, null, 2));
    console.log(
      `✓ Ghi văn mẫu: ${cfg.outJson} (${Object.keys(dummyOut).length}/${cfg.dummyPhanList.length} phần)`
    );
  }

  if (DUMMY_ONLY) {
    console.log('✓ Xong (--dummy-only, bỏ qua PDF).');
    return;
  }

  for (const ep of cfg.pdfPhanList) {
    if (!store[ep]) await genPhan(ep);
  }

  const bodyHtml = cfg.pdfPhanList
    .map(
      (ep, i) =>
        `<section><h2>${i + 1}. ${cfg.phanLabels[ep] || 'Phần ' + ep}</h2>${mdToHtml(store[ep] || '')}</section>`
    )
    .join('\n');

  await renderAndUpload(toolId, cfg, bodyHtml);
}

// ── Tool MỘT LƯỢT JSON (day-con, nguoi-khac, huong-nghiep-tre) ─────────────
async function runJsonTool(toolId, cfg, ls, store) {
  async function gen() {
    if (!FORCE && store.payload) {
      console.log('  đã có JSON mẫu, bỏ qua (dùng --force để sinh lại)');
      return;
    }
    requireEnv('GEMINI_API_KEY');
    const profile = cfg.computeProfile(ls);
    const prompt = cfg.buildPrompt(profile, cfg.ten);
    console.log('  đang gọi LLM (json+schema)…');
    const r = await llmTextFull({
      system: cfg.systemPrompt,
      prompt,
      json: true,
      jsonSchema: cfg.schema,
      maxTokens: cfg.maxTokens,
    });
    const parsed = parseLlmJson(r.text);
    if (!parsed || typeof parsed !== 'object') {
      console.error('❌ Parse JSON lỗi. Đuôi output:', String(r.text || '').slice(-200));
      process.exit(1);
    }
    store.payload = parsed;
    console.log(`  OK (model ${r.model}, ${Object.keys(parsed).length} trường)`);
  }

  if (!PDF_ONLY) {
    await gen();
    mkdirSync(dirname(cfg.outJson), { recursive: true });
    const dummyOut = {};
    for (const k of cfg.fieldOrder) {
      if (cfg.freeFields.includes(k)) continue; // đã xem trước miễn phí, không cần dummy
      if (store.payload && store.payload[k] != null) dummyOut[k] = store.payload[k];
    }
    writeFileSync(cfg.outJson, JSON.stringify(dummyOut, null, 2));
    console.log(`✓ Ghi văn mẫu: ${cfg.outJson} (${Object.keys(dummyOut).length} trường)`);
  }

  if (DUMMY_ONLY) {
    console.log('✓ Xong (--dummy-only, bỏ qua PDF).');
    return;
  }

  if (!store.payload) await gen();

  const FIELD_LABELS = {}; // không có nhãn tiếng Việt sẵn theo khoá — in tên khoá thô, đủ cho bản mẫu
  const bodyHtml = cfg.fieldOrder
    .filter((k) => store.payload[k])
    .map((k) => {
      const v = store.payload[k];
      const label = FIELD_LABELS[k] || k;
      if (Array.isArray(v)) {
        const items = v
          .map(
            (it) =>
              `<li>${escapeHtml(it.viec || it.vidu || it.viSao || JSON.stringify(it))}${it.vidu ? ` — <em>${escapeHtml(it.vidu)}</em>` : ''}</li>`
          )
          .join('');
        return `<section><h2>${label}</h2><ul>${items}</ul></section>`;
      }
      return `<section><h2>${label}</h2><p>${escapeHtml(String(v))}</p></section>`;
    })
    .join('\n');

  await renderAndUpload(toolId, cfg, bodyHtml);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

// Chuyển đổi markdown ĐƠN GIẢN → HTML, đủ cho một bản PDF minh hoạ (không
// cần khớp pixel-for-pixel với renderMarkdown() phía client).
function mdToHtml(text) {
  return text
    .split('\n\n')
    .map((block) => {
      const m = /^\[(TỐT|CẢNH BÁO|TRUNG TÍNH)(?:\|([^\]]{0,40}))?\]\s*\*\*(.+?)\*\*([\s\S]*)$/.exec(
        block.trim()
      );
      if (m) {
        const cls = m[1] === 'TỐT' ? 'good' : m[1] === 'CẢNH BÁO' ? 'warn' : 'neutral';
        return `<div class="hook ${cls}">${m[3]}</div><p>${m[4].trim()}</p>`;
      }
      if (/^PHẦN \d+/.test(block.trim())) return `<h3>${block.trim()}</h3>`;
      return `<p>${block.trim().replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
    })
    .join('\n');
}

async function renderAndUpload(toolId, cfg, bodyHtml) {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<style>
  body{font-family:'Noto Serif',Georgia,serif;color:#1a1a1a;max-width:680px;margin:0 auto;padding:40px}
  h1{font-size:22px;border-bottom:2px solid #C9A84C;padding-bottom:10px}
  .sub{color:#8a8f98;font-size:13px;margin-bottom:30px}
  h2{font-size:16px;color:#061A2E;margin-top:28px}
  h3{font-size:14px;color:#061A2E}
  p{font-size:12.5px;line-height:1.7;color:#3a3a3a}
  ul{padding-left:18px}
  li{font-size:12.5px;line-height:1.7;color:#3a3a3a;margin-bottom:6px}
  .hook{font-weight:700;font-size:13px;padding:8px 12px;border-radius:6px;margin:10px 0 6px}
  .hook.good{background:#eaf6ee;color:#1a6b3a}
  .hook.warn{background:#fdeceb;color:#c0392b}
  .hook.neutral{background:#eef2f6;color:#2a5a7a}
  .watermark{margin-top:40px;padding-top:14px;border-top:1px dashed #ccc;font-size:11px;color:#999;text-align:center}
</style></head><body>
<h1>${cfg.pdfTitle}</h1>
<div class="sub">Lá số mẫu — ${cfg.sampleBirth.day}/${cfg.sampleBirth.month}/${cfg.sampleBirth.year} · ${cfg.sampleBirth.gender === 'nam' ? 'Nam' : 'Nữ'} · Xem vận năm ${cfg.namXem}</div>
${bodyHtml}
<div class="watermark">Bản mẫu minh hoạ — tuviminhbao.com</div>
</body></html>`;

  console.log('✓ Dựng HTML xong, đang render PDF…');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20px', bottom: '20px' } });
  await browser.close();

  const localPdfPath = join(ROOT, `.tool-samples-${toolId}.pdf`);
  writeFileSync(localPdfPath, pdfBuffer);
  console.log(`✓ PDF tạm: ${localPdfPath} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);

  const SUPABASE_URL = requireEnv('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_KEY');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const cfg2 = TOOL_CONFIGS[toolId];
  const BUCKET = 'tool-samples';
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (bucketErr && !/already exists/i.test(bucketErr.message || '')) {
    console.error(
      '⚠ Không tạo được bucket (có thể đã có sẵn, kiểm tra tay nếu upload lỗi tiếp):',
      bucketErr.message
    );
  }

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(cfg2.storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
  if (uploadErr) {
    console.error('❌ Upload lỗi:', uploadErr.message);
    process.exit(1);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(cfg2.storagePath);
  console.log(`✓ Đã upload — URL công khai:\n  ${urlData?.publicUrl}`);
  console.log(
    `\nBước cuối (tay): dán URL trên vào SAMPLE_PDF_URL của tool tương ứng trong app-${toolId}.html.`
  );
}

for (const id of toolIds) {
  await runOne(id);
}
