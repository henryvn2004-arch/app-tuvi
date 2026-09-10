#!/usr/bin/env node
/**
 * Sinh 1 LẦN, dùng cho 3 việc: (a) văn MẪU (dummy) cho khối blur của một tool
 * (xem app-chu-trinh-cuoc-doi.html DUMMY_CTCD) — gọi ĐÚNG pipeline thật của
 * route (cùng hàm build-prompt + llmTextFull), không viết tay; (b) một PDF
 * mẫu (lá số + toàn bộ bản luận của lá số MẪU đó) — CHỤP ĐÚNG trang thật qua
 * Playwright (cả 6 tool, xem `htmlPage`/`injectAndRender` trong TOOL_CONFIGS),
 * upload lên Supabase Storage để làm nút "Xem mẫu" trong form nhập liệu; (c)
 * cùng lượt gọi LLM đó dùng luôn làm bản ghi demo clip (chạy tool thật).
 *
 * ⚠️ CHẠY Ở NƠI CÓ ĐỦ 3 BIẾN MÔI TRƯỜNG THẬT (không chạy được trong sandbox
 * phiên này — xem docs/nhat-ky/2026-09.md mục "Chu Trình Cuộc Đời"):
 *   GEMINI_API_KEY (hoặc ANTHROPIC_API_KEY/KIMIK3_API_KEY) — sinh văn bản
 *   SUPABASE_URL + SUPABASE_SERVICE_KEY — upload PDF (bucket `samples`, ĐÃ
 *     SỐNG trên prod — public/tuvi-form.js đang trỏ tới file mau-luan-giai-la-so.pdf
 *     trong đúng bucket này; script chỉ upsert thêm/đè file, không tạo bucket mới)
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
import { spans12, buildKhung12Thang } from '../lib/engine/van-han-12.ts';
import { nhanThangALDay } from '../lib/engine/van-ngay.ts';
import { llmTextFull } from '../lib/llm/complete.ts';
import { parseLlmJson } from '../lib/api/tool-helpers.ts';
import { computeDayCon, meta as dayConMeta } from '../lib/engine/day-con.ts';
import {
  DAY_CON_SYSTEM_PROMPT,
  DAY_CON_SCHEMA,
  buildDayConPrompt,
} from '../lib/agent/day-con-prompt.ts';
import { computeNguoiKhac, meta as nguoiKhacMeta } from '../lib/engine/nguoi-khac.ts';
import {
  NGUOI_KHAC_SYSTEM_PROMPT,
  NGUOI_KHAC_SCHEMA,
  buildNguoiKhacPrompt,
} from '../lib/agent/nguoi-khac-prompt.ts';
import { computeHuongNghiepTre, hoSoDayDu } from '../lib/engine/huong-nghiep-tre.ts';
import {
  HUONG_NGHIEP_TRE_SYSTEM_PROMPT,
  HUONG_NGHIEP_TRE_SCHEMA,
  buildHuongNghiepTrePrompt,
} from '../lib/agent/huong-nghiep-tre-prompt.ts';
import {
  computeSpouseMorphology,
  getPhuTheReadout,
  getPhuTheChinhTinhElement,
  computeMorphologyForPalace,
} from '../lib/engine/portrait.ts';
import {
  PHU_THE_LUAN_GIAI_SYSTEM_PROMPT,
  buildPhuTheLuanGiaiPrompt,
} from '../lib/agent/phu-the-luan-giai.ts';
import {
  CHAN_DUNG_VO_CHONG_ANALYSIS_SYSTEM_PROMPT,
  buildChanDungVoChongAnalysisPrompt,
  buildFinalPortraitImagePrompt,
} from '../lib/agent/chan-dung-vo-chong-prompt.ts';
import { computePastLife, pastLifeMeta } from '../lib/engine/past-life.ts';
import {
  PAST_LIFE_STORY_SYSTEM_PROMPT,
  PAST_LIFE_STORY_SCHEMA,
  buildPastLifeStoryPrompt,
  PAST_LIFE_IMAGE_SYSTEM_PROMPT,
  buildPastLifeImagePrompt,
  buildFinalPastLifeImagePrompt,
} from '../lib/agent/past-life-story.ts';
import { generatePortraitImage } from '../lib/image/openai-image.ts';

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
// Giờ DƯƠNG dùng khi cần TÍNH LẠI `ls` ngay TRONG TRÌNH DUYỆT (tool `phan`
// không có sẵn `window.renderMeta(data)` nhận thẳng object đã tính — chúng gọi
// `anSaoLaSo()` của CHÍNH trang, giống hệt lượt submit form thật, rồi mới rót
// văn AI vào). 6h rơi đúng chi Mão (5-7h) = SAMPLE_BIRTH.hourBranch (3) — giờ
// cụ thể không quan trọng vì `conv.gioIdx` bị ghi đè NGAY SAU bằng đúng
// hourBranch đó, chỉ cần rơi đúng khung 2 tiếng của chi này.
const SAMPLE_HH = 6;
const SAMPLE_NAME = 'Người mẫu';

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
    storagePath: 'mau-chu-trinh-cuoc-doi.pdf',
    // PDF mẫu CHỤP ĐÚNG trang thật (không tự dựng HTML rời) — gọi lại đúng
    // các hàm trang tự dùng khi submit form (renderLuan) rồi rót văn AI qua
    // `_renderCachedLuanGiai` (đúng hàm trang dùng khi đọc lại cache đã trả
    // tiền), thay vì mô phỏng UI. `store` đã khoá theo ENGINE PHAN (14-24,
    // đúng `pdfPhanList`) — khớp thẳng khoá `_renderCachedLuanGiai` cần.
    htmlPage: 'app-chu-trinh-cuoc-doi.html',
    async injectAndRender(page, store) {
      await page.evaluate(
        ({ dd, mm, yyyy, hh, gioAmIdx, gioitinh, namxem, name, store }) => {
          window.Auth = window.Auth || {};
          window.Auth.isLoggedIn = function () {
            return true;
          };
          var conv = convertDuongToAm(dd, mm, yyyy, hh);
          conv.gioIdx = gioAmIdx;
          var ls = anSaoLaSo({
            ngayAL: conv.amLich.day,
            thangAL: conv.amLich.month,
            namAL: conv.amLich.year,
            canNam: conv.canNam,
            chiNam: conv.chiNam,
            gioIdx: gioAmIdx,
            gioitinh: gioitinh,
            namXem: namxem,
          });
          var fd = {
            name: name,
            gioitinh: gioitinh,
            dd: dd,
            mm: mm,
            yyyy: yyyy,
            hh: hh,
            pp: 0,
            gioChi: CHI[gioAmIdx],
            amLich: conv.amLich,
            amDuongNam: conv.amDuongNam,
          };
          ls._conv = conv;
          ls._hoTen = name;
          window._astrolabe = ls;
          window._hoTen = name;
          window._ngay = dd;
          window._thang = mm;
          window._nam = yyyy;
          window._gioitinh = gioitinh;
          window._namXem = namxem;
          window._laSoText = formatLaSoV2(ls, conv);
          ls._laSoText = window._laSoText;
          window.renderLuan(ls, fd, namxem);
          document.getElementById('miniChart').innerHTML = window.renderGrid(ls, fd);
          if (window.mountIcons) window.mountIcons(document.getElementById('miniChart'));
          document.getElementById('birthPanel').style.display = 'none';
          document.getElementById('lgPanel').style.display = 'block';
          document.getElementById('btnEdit').style.display = '';
          document.getElementById('btnLaSo').style.display = '';
          window._renderCachedLuanGiai(store);
        },
        {
          dd: SAMPLE_BIRTH.day,
          mm: SAMPLE_BIRTH.month,
          yyyy: SAMPLE_BIRTH.year,
          hh: SAMPLE_HH,
          gioAmIdx: SAMPLE_BIRTH.hourBranch,
          gioitinh: SAMPLE_BIRTH.gender,
          namxem: NAM_XEM,
          name: SAMPLE_NAME,
          store,
        }
      );
    },
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
    // Tên file TRÙNG với file đã sống trên prod (bucket `samples`, xem
    // public/tuvi-form.js dòng ~334) — script này SINH LẠI bằng LLM thật rồi
    // `upsert` đè lên đúng chỗ, không tạo file mới/mồ côi.
    storagePath: 'mau-luan-giai-la-so.pdf',
    // laso.html đã có SẴN một cơ chế "Xem bản mẫu" native (openSample/
    // btnSample, đọc `sampleJsonPath` qua fetch) — KHÔNG cần tự gọi
    // renderLuan/_renderCachedLuanGiai tay như 2 tool phan kia. Ghi đè đúng
    // file JSON đó bằng dữ liệu VỪA sinh rồi bấm chính nút đó — nút "Xem bản
    // mẫu" trên trang thật cũng SỐNG lại đúng bằng file này, không mồ côi.
    htmlPage: 'app-luan-giai.html',
    sampleJsonPath: join(ROOT, 'public/samples/luan-giai.json'),
    async injectAndRender(page, store) {
      await page.click('#btnSample');
      await page.waitForSelector('.samp-bar', { timeout: 15000 });
      await page.waitForFunction(
        () => {
          const el = document.getElementById('lgBody');
          return el && el.textContent && el.textContent.length > 500;
        },
        { timeout: 15000 }
      );
      // Ảnh minh hoạ chủ đề (fb-card) — không còn `loading=lazy` (đã vá) nhưng
      // vẫn cho một nhịp để `<img>` kịp nạp trước khi in.
      await page.waitForTimeout(800);
      void store; // dữ liệu đã nằm trong sampleJsonPath, không cần tiêm lại
    },
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
    storagePath: 'mau-van-han-nam.pdf',
    // Cùng lối "chụp trang thật" như chu-trinh-cuoc-doi — khác một chỗ: trang
    // này cần thêm `_khung`/`_labels`/`_tongPhan` (khung 12 tháng, tính
    // DETERMINISTIC ở server thật qua `action=khung`) TRƯỚC khi gọi `render(ls)`
    // — ở đây gọi thẳng `buildKhung12Thang` (cùng hàm route thật dùng), không
    // phải mô phỏng gọi API qua network.
    htmlPage: 'app-van-han-nam.html',
    async injectAndRender(page, store, ls) {
      const now = new Date();
      const tuNgay = now.getDate();
      const tuThang = now.getMonth() + 1;
      const tuNam = now.getFullYear();
      const khung = buildKhung12Thang(ls, tuNgay, tuThang, tuNam);
      const dv = (ls.daiVans || [])[dvHienTaiSo(ls) - 1];
      const labels = [
        '',
        'Tổng quan lá số',
        'Hành trình cuộc đời',
        dv ? `Đại vận hiện tại (${dv.tuoiStart}–${dv.tuoiEnd}t)` : 'Đại vận hiện tại',
        'Tiểu vận năm nay',
        ...spans12(tuNgay, tuThang, tuNam).map((s) => nhanThangALDay(s)),
      ];
      await page.evaluate(
        ({
          dd,
          mm,
          yyyy,
          hh,
          gioAmIdx,
          gioitinh,
          namxem,
          name,
          khung,
          labels,
          tongPhan,
          store,
        }) => {
          var conv = convertDuongToAm(dd, mm, yyyy, hh);
          conv.gioIdx = gioAmIdx;
          var ls = anSaoLaSo({
            ngayAL: conv.amLich.day,
            thangAL: conv.amLich.month,
            namAL: conv.amLich.year,
            canNam: conv.canNam,
            chiNam: conv.chiNam,
            gioIdx: gioAmIdx,
            gioitinh: gioitinh,
            namXem: namxem,
          });
          ls._conv = conv;
          ls._hoTen = name;
          window._astrolabe = ls;
          window._hoTen = name;
          window._ngay = dd;
          window._thang = mm;
          window._nam = yyyy;
          window._gioitinh = gioitinh;
          window._laSoText = formatLaSoV2(ls, conv);
          ls._laSoText = window._laSoText;
          window._khung = khung;
          window._labels = labels;
          window._tongPhan = tongPhan;
          window.render(ls);
          if (typeof window.mountHook === 'function') window.mountHook(ls);
          document.getElementById('miniChart').innerHTML = window.renderGrid(ls, {
            name: name,
            gioitinh: gioitinh,
            dd: dd,
            mm: mm,
            yyyy: yyyy,
            hh: hh,
            gioChi: CHI[gioAmIdx],
            amLich: conv.amLich,
            amDuongNam: conv.amDuongNam,
          });
          if (window.mountIcons) window.mountIcons(document.getElementById('miniChart'));
          document.getElementById('birthPanel').style.display = 'none';
          document.getElementById('vhPanel').style.display = 'block';
          document.getElementById('btnEdit').style.display = '';
          document.getElementById('btnLuanGiai').style.display = '';
          window._renderCached(store);
        },
        {
          dd: SAMPLE_BIRTH.day,
          mm: SAMPLE_BIRTH.month,
          yyyy: SAMPLE_BIRTH.year,
          hh: SAMPLE_HH,
          gioAmIdx: SAMPLE_BIRTH.hourBranch,
          gioitinh: SAMPLE_BIRTH.gender,
          namxem: NAM_XEM,
          name: SAMPLE_NAME,
          khung,
          labels,
          tongPhan: 16,
          store,
        }
      );
    },
  },
  'chan-dung-vo-chong': {
    kind: 'json',
    label: 'Chân Dung Vợ Chồng',
    sampleBirth: SAMPLE_BIRTH,
    namXem: NAM_XEM,
    // `computeProfile` ở đây KHÔNG thuần đồng bộ — route thật gọi thêm 1 lượt
    // LLM RIÊNG (luận giải Phu Thê đầy đủ) TRƯỚC lượt phân tích chính, best-
    // effort giống hệt route.ts (lỗi thì bỏ qua, không chặn cả lượt).
    async computeProfile(ls) {
      const userGender = SAMPLE_BIRTH.gender === 'nu' ? 'nu' : 'nam';
      const morph = computeSpouseMorphology(ls, userGender);
      const phuThe = getPhuTheReadout(ls);
      const phuTheElement = getPhuTheChinhTinhElement(ls);
      let phuTheLuanGiai = '';
      try {
        requireEnv('GEMINI_API_KEY');
        const laSoText = formatLaSoV2(ls);
        const r = await llmTextFull({
          system: PHU_THE_LUAN_GIAI_SYSTEM_PROMPT,
          prompt: buildPhuTheLuanGiaiPrompt(laSoText, undefined, userGender),
          maxTokens: 1750,
        });
        phuTheLuanGiai = r.text.trim();
      } catch (e) {
        console.error('  [chan-dung-vo-chong] luận giải Phu Thê lỗi (best-effort):', e.message);
      }
      return { morph, phuThe, phuTheElement, userGender, phuTheLuanGiai };
    },
    buildPrompt(p) {
      return buildChanDungVoChongAnalysisPrompt(p.morph, p.phuThe, p.phuTheLuanGiai, p.userGender);
    },
    systemPrompt: CHAN_DUNG_VO_CHONG_ANALYSIS_SYSTEM_PROMPT,
    // Route thật KHÔNG ép `json:true`/`jsonSchema` cho lượt này (đọc JSON từ
    // text tự do qua `parseLlmJson`) — cố ý để trống `schema`, xem chú thích
    // ở `runJsonTool`.
    maxTokens: 1650,
    freeFields: [],
    fieldOrder: ['description', 'meetingContext', 'phuTheLuanGiai'],
    outJson: join(ROOT, 'public/samples/chan-dung-vo-chong-dummy.json'),
    pdfTitle: 'Chân Dung Vợ Chồng — Bản mẫu',
    storagePath: 'mau-chan-dung-vo-chong.pdf',
    htmlPage: 'app-chan-dung-vo-chong.html',
    // `buildFullPayload` ở đây SINH ẢNH THẬT (route thật cũng làm y vậy) —
    // tốn thời gian (~30-90s) + một lượt gọi ảnh thật, không có cách nào né.
    async buildFullPayload(profile, ten, parsed) {
      const { finalPrompt, spouseAge, spouseGender } = buildFinalPortraitImagePrompt(
        parsed,
        profile.morph,
        profile.phuTheElement,
        profile.userGender
      );
      console.log('  [chan-dung-vo-chong] đang sinh ảnh thật (~30-90s)…');
      const imgRes = await generatePortraitImage({ prompt: finalPrompt, size: '1024x1536' });
      const SUPABASE_URL = requireEnv('SUPABASE_URL');
      const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_KEY');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const path = `samples/chan-dung-vo-chong-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from('portraits')
        .upload(path, Buffer.from(imgRes.b64, 'base64'), {
          contentType: 'image/png',
          upsert: true,
        });
      if (upErr) {
        console.error('❌ Upload ảnh mẫu lỗi:', upErr.message);
        process.exit(1);
      }
      const { data: urlData } = supabase.storage.from('portraits').getPublicUrl(path);
      console.log(`  ✓ Ảnh mẫu: ${urlData?.publicUrl}`);
      return {
        success: true,
        imageUrl: urlData?.publicUrl,
        description: parsed.description,
        meetingContext: parsed.meetingContext || '',
        phuTheLuanGiai: profile.phuTheLuanGiai || '',
        spouseGender,
        spouseAge,
        phuThe: profile.phuThe,
      };
    },
  },
  'chan-dung-tien-kiep': {
    kind: 'json',
    label: 'Chân Dung Tiền Kiếp',
    sampleBirth: SAMPLE_BIRTH,
    namXem: NAM_XEM,
    computeProfile(ls) {
      const gender = SAMPLE_BIRTH.gender === 'nu' ? 'nu' : 'nam';
      // KHÔNG truyền era → computePastLife tự bốc nền văn minh từ chính lá
      // số, đúng hành vi route thật (buildProfile trong route.ts).
      return computePastLife(ls, gender);
    },
    // Pha 1 (truyện) — route thật ÉP schema (Gemini responseSchema), khác
    // chan-dung-vo-chong. `cfg.schema` khai bên dưới để `runJsonTool` truyền
    // đúng `json:true`+`jsonSchema`.
    buildPrompt(profile) {
      return buildPastLifeStoryPrompt(profile);
    },
    systemPrompt: PAST_LIFE_STORY_SYSTEM_PROMPT,
    schema: PAST_LIFE_STORY_SCHEMA,
    maxTokens: 6300,
    freeFields: [],
    fieldOrder: ['moTaNhanVat', 'ketLuan'],
    outJson: join(ROOT, 'public/samples/chan-dung-tien-kiep-dummy.json'),
    pdfTitle: 'Chân Dung Tiền Kiếp — Bản mẫu',
    storagePath: 'mau-chan-dung-tien-kiep.pdf',
    htmlPage: 'app-chan-dung-tien-kiep.html',
    // Pha 2 (ảnh) — route thật gọi RIÊNG sau khi đã có `profile` (không cần
    // văn truyện): 1 lượt LLM tả khuôn mặt (json ép schema nhỏ) rồi ghép
    // prompt ảnh cuối + sinh ảnh thật + upload, y hệt chan-dung-vo-chong.
    async buildFullPayload(profile, ten, parsed, ls) {
      const morph = computeMorphologyForPalace(ls, 'Mệnh');
      let faceDescriptionEn = '';
      try {
        const r = await llmTextFull({
          system: PAST_LIFE_IMAGE_SYSTEM_PROMPT,
          prompt: buildPastLifeImagePrompt(profile, morph),
          json: true,
          jsonSchema: {
            type: 'OBJECT',
            properties: { imagePrompt: { type: 'STRING' } },
            required: ['imagePrompt'],
          },
          maxTokens: 900,
        });
        const p = parseLlmJson(r.text);
        faceDescriptionEn = String(p?.imagePrompt || '').trim();
      } catch (e) {
        console.error('  [chan-dung-tien-kiep] tả khuôn mặt lỗi (best-effort):', e.message);
      }
      const finalPrompt = buildFinalPastLifeImagePrompt(profile, faceDescriptionEn);
      console.log('  [chan-dung-tien-kiep] đang sinh ảnh thật (~30-90s)…');
      const imgRes = await generatePortraitImage({ prompt: finalPrompt, size: '1024x1536' });
      const SUPABASE_URL = requireEnv('SUPABASE_URL');
      const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_KEY');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const path = `samples/chan-dung-tien-kiep-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from('portraits')
        .upload(path, Buffer.from(imgRes.b64, 'base64'), {
          contentType: 'image/png',
          upsert: true,
        });
      if (upErr) {
        console.error('❌ Upload ảnh mẫu lỗi:', upErr.message);
        process.exit(1);
      }
      const { data: urlData } = supabase.storage.from('portraits').getPublicUrl(path);
      console.log(`  ✓ Ảnh mẫu: ${urlData?.publicUrl}`);

      // Ghép nhãn giai đoạn/vai trò kịch (ENGINE) với chữ LLM viết — đúng
      // cách handleStory() ghép trong route.ts.
      const acts = profile.arc.acts.map((a, i) => ({
        index: a.index,
        stage: a.stage,
        role: a.role,
        title: String(parsed.acts?.[i]?.title || a.stage),
        text: String(parsed.acts?.[i]?.text || ''),
      }));

      return {
        success: true,
        ...pastLifeMeta(profile),
        biDanh: String(parsed.biDanh || ''),
        moTaNhanVat: String(parsed.moTaNhanVat || ''),
        acts,
        ketLuan: parsed.ketLuan || '',
        imageUrl: urlData?.publicUrl,
      };
    },
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
    storagePath: 'mau-day-con.pdf',
    // PDF mẫu giờ CHỤP ĐÚNG trang thật (app-day-con.html) qua Playwright,
    // không tự dựng HTML rời — `buildFullPayload` phải khớp CHÍNH XÁC hình
    // dạng `payload` mà `app/api/day-con/route.ts` trả về (`meta()` nay sống
    // ở `lib/engine/day-con.ts`, import lại thay vì chép).
    htmlPage: 'app-day-con.html',
    buildFullPayload(profile, ten, parsed) {
      const clean = (v) => String(v == null ? '' : v).trim();
      const normMuc = (arr) =>
        Array.isArray(arr)
          ? arr
              .slice(0, 3)
              .map((m) => ({ viec: clean(m?.viec), vidu: clean(m?.vidu) }))
              .filter((m) => m.viec)
          : [];
      return {
        success: true,
        ...dayConMeta(profile, ten),
        conNguoi: clean(parsed.conNguoi),
        chatNoi: clean(parsed.chatNoi),
        dinhHuong: clean(parsed.dinhHuong),
        vaoBangGi: clean(parsed.vaoBangGi),
        khoaLai: clean(parsed.khoaLai),
        nenLam: normMuc(parsed.nenLam),
        tranhLam: normMuc(parsed.tranhLam),
        hoatDong: profile.hoatDong ? clean(parsed.hoatDong) : '',
        loLang: clean(parsed.loLang),
        changNay: clean(parsed.changNay),
        voiChaMe: '', // bản mẫu không có lá số cha/mẹ — cùng luật route thật
        motCau: clean(parsed.motCau),
      };
    },
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
    storagePath: 'mau-nguoi-khac.pdf',
    // Xem chú thích ở `day-con.buildFullPayload` — cùng lối, khớp
    // `app/api/nguoi-khac/route.ts`.
    htmlPage: 'app-nguoi-khac.html',
    buildFullPayload(profile, ten, parsed) {
      const clean = (v) => String(v == null ? '' : v).trim();
      const normMuc = (arr) =>
        Array.isArray(arr)
          ? arr
              .slice(0, 3)
              .map((m) => ({ viec: clean(m?.viec), vidu: clean(m?.vidu) }))
              .filter((m) => m.viec)
          : [];
      return {
        success: true,
        ...nguoiKhacMeta(profile, ten),
        keHoach: profile.viec.id === 'hieu-them' ? '' : clean(parsed.keHoach),
        tinhKhi: clean(parsed.tinhKhi),
        chamNoc: clean(parsed.chamNoc),
        coiTrong: clean(parsed.coiTrong),
        nenNoi: normMuc(parsed.nenNoi),
        tranhNoi: normMuc(parsed.tranhNoi),
        thoiDiem: clean(parsed.thoiDiem),
        voiBan: '', // bản mẫu không có lá số người xem — cùng luật route thật
        motCau: clean(parsed.motCau),
      };
    },
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
    storagePath: 'mau-huong-nghiep-tre.pdf',
    // Xem chú thích ở `day-con.buildFullPayload` — cùng lối, khớp
    // `app/api/huong-nghiep-tre/route.ts`. `hoSoDayDu` đã export sẵn từ
    // engine (route thật cũng gọi đúng hàm này), không cần chép.
    htmlPage: 'app-huong-nghiep-tre.html',
    buildFullPayload(profile, ten, parsed) {
      const clean = (v) => String(v == null ? '' : v).trim();
      const normMuc = (arr, max) =>
        Array.isArray(arr)
          ? arr
              .slice(0, max)
              .map((m) => ({ viec: clean(m?.viec), viSao: clean(m?.viSao) }))
              .filter((m) => m.viec)
          : [];
      return {
        success: true,
        ten,
        ...hoSoDayDu(profile),
        nhinRaCon: clean(parsed.nhinRaCon),
        viSaoHuongNay: clean(parsed.viSaoHuongNay),
        batDauTuDau: normMuc(parsed.batDauTuDau, 3),
        tranhLam: normMuc(parsed.tranhLam, 2),
        noiTheNao: clean(parsed.noiTheNao),
        loLang: clean(parsed.loLang),
        mocKeTiep: clean(parsed.mocKeTiep),
        motCau: clean(parsed.motCau),
      };
    },
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

  if (cfg.kind === 'json') {
    // `outJson` là bản DUMMY đã lọc bớt `freeFields` — nạp lại nó làm cache
    // sẽ làm PDF thiếu đúng mấy trường đó. Cache cho việc "đã gọi LLM chưa"
    // phải là bản THÔ, đầy đủ, tách riêng khỏi outJson.
    const rawCachePath = join(ROOT, '.tool-samples', `${toolId}-raw.json`);
    let payload = null;
    if (existsSync(rawCachePath)) {
      try {
        payload = JSON.parse(readFileSync(rawCachePath, 'utf8'));
      } catch {
        payload = null;
      }
    }
    await runJsonTool(toolId, cfg, ls, { payload }, rawCachePath);
    return;
  }

  let store = {};
  if (existsSync(cfg.outJson)) {
    try {
      store = JSON.parse(readFileSync(cfg.outJson, 'utf8'));
    } catch {
      store = {};
    }
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

  // `laso` đọc lại nội dung qua chính file mẫu tĩnh của nó (`sampleJsonPath`,
  // dùng bởi cơ chế "Xem bản mẫu" NATIVE của trang) — ghi đè bằng bản VỪA
  // sinh để cả nút demo trên trang thật LẪN PDF mẫu đều lên đời cùng lúc,
  // không mồ côi file cũ.
  if (cfg.sampleJsonPath) {
    const luanGiai = {};
    for (const ep of cfg.pdfPhanList) if (store[ep]) luanGiai[String(ep)] = store[ep];
    mkdirSync(dirname(cfg.sampleJsonPath), { recursive: true });
    writeFileSync(
      cfg.sampleJsonPath,
      JSON.stringify(
        {
          person_name: SAMPLE_NAME,
          birth: {
            ngay: cfg.sampleBirth.day,
            thang: cfg.sampleBirth.month,
            nam: cfg.sampleBirth.year,
            gio_hour: SAMPLE_HH,
            gio_idx: cfg.sampleBirth.hourBranch,
            gioitinh: cfg.sampleBirth.gender,
            nam_xem: cfg.namXem,
          },
          luan_giai: luanGiai,
        },
        null,
        2
      )
    );
    console.log(`✓ Ghi ${cfg.sampleJsonPath}`);
  }

  await renderRealPhanPageAndUpload(toolId, cfg, ls, store);
}

// ── Tool MỘT LƯỢT JSON (day-con, nguoi-khac, huong-nghiep-tre) ─────────────
async function runJsonTool(toolId, cfg, ls, store, rawCachePath) {
  // Hoist ra ngoài `gen()`: PDF cần `profile` (5 trục/8 chất/...) NGAY CẢ KHI
  // JSON mẫu đã có sẵn từ cache (`--pdf-only` bỏ qua `gen()` hoàn toàn) — thiếu
  // dòng này thì `buildFullPayload` không có gì để ghép cùng phần chữ. `await`
  // vì một vài tool (chan-dung-vo-chong) cần gọi thêm 1 lượt LLM RIÊNG
  // (luận giải Phu Thê) ngay trong `computeProfile` — `await` trên giá trị
  // không phải Promise là no-op, không đổi hành vi của tool đồng bộ.
  const profile = await cfg.computeProfile(ls);

  async function gen() {
    if (!FORCE && store.payload) {
      console.log('  đã có JSON mẫu, bỏ qua (dùng --force để sinh lại)');
      return;
    }
    requireEnv('GEMINI_API_KEY');
    const prompt = cfg.buildPrompt(profile, cfg.ten);
    console.log('  đang gọi LLM…');
    // `cfg.schema` không phải mọi tool đều có — chan-dung-vo-chong (route
    // thật) đọc JSON từ text tự do qua `parseLlmJson`, không ép
    // `json:true`+`jsonSchema` như day-con/nguoi-khac/huong-nghiep-tre. Ép
    // thêm ở đây là sample CHẠY KHÁC route thật, đúng thứ cả script này sinh
    // ra để tránh.
    const r = await llmTextFull(
      cfg.schema
        ? {
            system: cfg.systemPrompt,
            prompt,
            json: true,
            jsonSchema: cfg.schema,
            maxTokens: cfg.maxTokens,
          }
        : { system: cfg.systemPrompt, prompt, maxTokens: cfg.maxTokens }
    );
    const parsed = parseLlmJson(r.text);
    if (!parsed || typeof parsed !== 'object') {
      console.error('❌ Parse JSON lỗi. Đuôi output:', String(r.text || '').slice(-200));
      process.exit(1);
    }
    store.payload = parsed;
    mkdirSync(dirname(rawCachePath), { recursive: true });
    writeFileSync(rawCachePath, JSON.stringify(parsed, null, 2));
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

  // PDF mẫu = CHỤP ĐÚNG trang thật, không tự dựng HTML rời — ghép `profile`
  // (tra bảng thuần, có 5 trục/8 chất/chart) với phần chữ LLM đúng hình dạng
  // route thật trả về, rồi tiêm vào `app-<tool>.html` qua Playwright. `await`
  // vì chan-dung-vo-chong/chan-dung-tien-kiep còn phải SINH ẢNH THẬT + upload
  // ở bước này (route thật cũng làm y vậy) — tool chữ-thuần thì đồng bộ,
  // `await` trên giá trị thường vẫn no-op.
  const fullPayload = await cfg.buildFullPayload(profile, cfg.ten, store.payload, ls);

  // Nút "Xem bản mẫu" (SampleHint, `public/tools-shared/sample-hint.js`) —
  // trang tự override `SampleHint.open` để fetch file này rồi gọi ĐÚNG
  // renderMeta/renderProse thật (không qua PDF), giống hệt cách laso.html tự
  // cài `openSample()`. Ghi CÙNG payload PDF dùng — một nguồn cho cả hai mặt.
  const sampleFullJsonPath = join(ROOT, 'public/samples', `${toolId}-full.json`);
  mkdirSync(dirname(sampleFullJsonPath), { recursive: true });
  writeFileSync(sampleFullJsonPath, JSON.stringify(fullPayload, null, 2));
  console.log(`✓ Ghi ${sampleFullJsonPath}`);

  await renderRealPageAndUpload(toolId, cfg, fullPayload);
}

/**
 * Lưu PDF tạm ra đĩa rồi upload đè lên bucket `samples` — dùng CHUNG cho cả
 * hai lối "chụp trang thật" (`renderRealPageAndUpload` cho tool `json`,
 * `renderRealPhanPageAndUpload` cho tool `phan`/`phan-thang`).
 */
async function uploadPdf(toolId, cfg, pdfBuffer) {
  const localPdfPath = join(ROOT, '.tool-samples', `${toolId}.pdf`);
  mkdirSync(dirname(localPdfPath), { recursive: true });
  writeFileSync(localPdfPath, pdfBuffer);
  console.log(`✓ PDF tạm: ${localPdfPath} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);

  const SUPABASE_URL = requireEnv('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_KEY');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Bucket `samples` ĐÃ SỐNG trên prod (public, chứa mau-luan-giai-la-so.pdf
  // dùng bởi public/tuvi-form.js) — dùng LẠI đúng bucket đó, không tạo bucket
  // mới. `storagePath` mỗi tool đã đặt tên theo đúng khuôn `mau-<tool>.pdf`.
  const BUCKET = 'samples';

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(cfg.storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
  if (uploadErr) {
    console.error('❌ Upload lỗi:', uploadErr.message);
    process.exit(1);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(cfg.storagePath);
  console.log(`✓ Đã upload — URL công khai:\n  ${urlData?.publicUrl}`);
  console.log(
    `\nBước cuối (tay): dán URL trên vào SAMPLE_PDF_URL của tool tương ứng trong app-${toolId}.html.`
  );
}

// ── Server tĩnh cho public/ — CHỈ dùng để chụp PDF mẫu (3 tool `json`) ──────
// `app-*.html` gọi `/shell.js`, `/shell.css`, `/tools-shared/qr.js`... bằng
// ĐƯỜNG DẪN TUYỆT ĐỐI, nên phải mở qua http://, không mở bằng file://
// (đường tuyệt đối dưới file:// trỏ thẳng vào ổ đĩa, luôn 404).
let _staticServer = null;
let _staticPort = null;
async function ensureStaticServer() {
  if (_staticServer) return _staticPort;
  const { createServer } = await import('node:http');
  const { readFile } = await import('node:fs/promises');
  const PUBLIC_DIR = join(ROOT, 'public');
  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ico': 'image/x-icon',
  };
  _staticServer = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = urlPath === '/' ? '/index.html' : urlPath;
      const filePath = join(PUBLIC_DIR, rel);
      // Chặn `..` thoát khỏi `public/` — server này chỉ chạy cục bộ trong
      // lượt sinh mẫu, nhưng vẫn không lý do gì để phục vụ ngoài cây đó.
      if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const ext = filePath.slice(filePath.lastIndexOf('.'));
      const buf = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((resolve) => _staticServer.listen(0, '127.0.0.1', resolve));
  _staticPort = _staticServer.address().port;
  console.log(`✓ Server tĩnh public/ tại http://127.0.0.1:${_staticPort}`);
  return _staticPort;
}

/**
 * PDF mẫu cho 3 tool `json` — CHỤP ĐÚNG trang thật (`app-<tool>.html`) thay
 * vì tự dựng HTML rời, để có luôn chart/card (5 trục · 8 chất...) như bản
 * PDF thật khách trả tiền tải về (`printWorkspace()` trong `shell.js`).
 *
 * Cách làm: mở trang qua server tĩnh, TIÊM THẲNG `fullPayload` bằng cách gọi
 * lại đúng các hàm trang thật gọi sau khi API trả về (`_openPanel()` mở khối
 * + gỡ khoá, `renderMeta`/`renderProse` dựng nội dung) — bỏ qua hẳn lượt
 * submit form/gọi API, không phải mô phỏng lại UI. Sau đó BẤM THẬT nút "Lưu
 * PDF" (`#wsPdfBtn`, do `shell.js` tự dựng qua `MutationObserver` khi vùng
 * kết quả đổi) để chạy đúng `printWorkspace()` — dựng đầu/chân trang in +
 * mở mọi `<details>` qua sự kiện `beforeprint` — rồi chụp bằng chính CSS in
 * thật (`@media print` trong `shell.css`), không chép lại luật đó ở đây.
 */
async function renderRealPageAndUpload(toolId, cfg, fullPayload) {
  const port = await ensureStaticServer();
  console.log('✓ Đang mở trang thật, tiêm dữ liệu, chụp PDF…');
  const browser = await chromium.launch(
    process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}
  );
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('  [lỗi JS trên trang]', e.message));
  await page.goto(`http://127.0.0.1:${port}/${cfg.htmlPage}`, { waitUntil: 'load' });

  await page.evaluate((data) => {
    if (typeof window._openPanel === 'function') window._openPanel();
    window.renderMeta(data);
    window.renderProse(data);
    // Tool sinh ẢNH (chan-dung-*): `renderProse` của một vài trang đã tự gọi
    // `setResultImage` bên trong nó (gọi lại ở đây vô hại — idempotent); trang
    // nào tách riêng (2 pha story/image) thì đây là chỗ DUY NHẤT gọi.
    if (data.imageUrl && typeof window.setResultImage === 'function') {
      window.setResultImage(data.imageUrl);
    }
    var loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    var card = document.getElementById('card');
    if (card) card.style.display = 'block';
    var btnEdit = document.getElementById('btnEdit');
    if (btnEdit) btnEdit.style.display = '';
  }, fullPayload);

  // Nút "Lưu PDF" do `shell.js` tự dựng qua MutationObserver theo dõi vùng
  // `[data-ws-result]` — đợi nó xuất hiện rồi bấm, thay vì tự gọi thẳng
  // `printWorkspace()` (hàm private trong closure của shell.js, không lộ ra
  // `window`).
  await page.waitForSelector('#wsPdfBtn', { timeout: 10000 });
  await page.click('#wsPdfBtn');
  // `printWorkspace()` có fallback 800ms cho QR chưa tải kịp — đợi dư ra để
  // chắc đầu/chân trang in đã dựng xong trước khi chụp.
  await page.waitForTimeout(1300);

  await page.emulateMedia({ media: 'print' });
  const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20px', bottom: '20px' } });
  await browser.close();

  await uploadPdf(toolId, cfg, pdfBuffer);
}

/**
 * PDF mẫu cho 3 tool `phan`/`phan-thang` (chu-trinh-cuoc-doi, laso,
 * van-han-nam) — cùng triết lý CHỤP TRANG THẬT như `renderRealPageAndUpload`,
 * nhưng 3 trang này không có `window.renderMeta(data)` nhận thẳng một object
 * đã tính sẵn: chúng render tiến độ theo từng PHẦN, khoá đăng nhập/trả tiền
 * ngay trong hàm dựng DOM. Mỗi tool tự khai `injectAndRender(page, store, ls)`
 * trong TOOL_CONFIGS — gọi ĐÚNG hàm trang tự dùng (`renderLuan`/`render` +
 * `_renderCachedLuanGiai`/`_renderCached`, hoặc với `laso` là bấm thẳng nút
 * "Xem bản mẫu" NATIVE của trang) thay vì mô phỏng lại UI ở đây.
 */
async function renderRealPhanPageAndUpload(toolId, cfg, ls, store) {
  const port = await ensureStaticServer();
  console.log('✓ Đang mở trang thật, tiêm dữ liệu, chụp PDF…');
  const browser = await chromium.launch(
    process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}
  );
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('  [lỗi JS trên trang]', e.message));
  await page.goto(`http://127.0.0.1:${port}/${cfg.htmlPage}`, { waitUntil: 'load' });

  await cfg.injectAndRender(page, store, ls);

  // Nút "Lưu PDF" do `shell.js` tự dựng qua MutationObserver theo dõi vùng
  // `[data-ws-result]` — đợi nó xuất hiện rồi bấm, thay vì tự gọi thẳng
  // `printWorkspace()` (hàm private trong closure của shell.js, không lộ ra
  // `window`).
  await page.waitForSelector('#wsPdfBtn', { timeout: 10000 });
  await page.click('#wsPdfBtn');
  // `printWorkspace()` có fallback 800ms cho QR chưa tải kịp — đợi dư ra để
  // chắc đầu/chân trang in đã dựng xong trước khi chụp.
  await page.waitForTimeout(1300);

  await page.emulateMedia({ media: 'print' });
  const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20px', bottom: '20px' } });
  await browser.close();

  await uploadPdf(toolId, cfg, pdfBuffer);
}

for (const id of toolIds) {
  await runOne(id);
}

// Server tĩnh (nếu có mở, tức có chạy ≥1 tool `json`) giữ process sống —
// đóng lại để CLI thoát sạch thay vì treo chờ Ctrl+C.
if (_staticServer) await new Promise((resolve) => _staticServer.close(resolve));
