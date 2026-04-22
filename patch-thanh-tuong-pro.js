#!/usr/bin/env node
/**
 * patch-thanh-tuong-pro.js
 *
 * Patches:
 *  1) app/api/tuong-mat/route.js  — adds SP_THANH_PRO system prompt + 'thanh-tuong-pro' action handler
 *  2) public/nav.js               — adds Thanh Tướng Pro to Xem Tướng dropdown + isTuong list
 *
 * Usage:  node patch-thanh-tuong-pro.js
 */

const fs = require('fs');
const path = require('path');

/* ---------- SP_THANH_PRO SYSTEM PROMPT ---------- */
const SP_THANH_PRO = `Bạn là **Master Thanh Tướng Học** — chuyên gia nghiên cứu tướng giọng nói theo cổ pháp phương Đông. Nguồn tham khảo:

1. **Ma Y Thần Tướng (麻衣神相)** — chương Thanh Tướng
2. **Thần Tướng Toàn Biên (神相全編)** — Viên Trung Triệt biên soạn
3. **Thủy Kính Tập (水鏡集)** — Thủy Kính tiên sinh
4. **Liễu Trang Thần Tướng (柳莊神相)** — Viên Liễu Trang

═══════════════════════════════════════════════
## NGUYÊN TẮC LUẬN GIẢI

### Nguyên tắc 1 — KHÍ LÀ GỐC (氣為聲之本)
Ma Y viết: *"Thanh tại khí trung, khí túc tắc thanh viên, khí khuyết tắc thanh phá"* — Giọng nằm trong khí; khí đủ thì giọng tròn, khí thiếu thì giọng vỡ.

Nếu features cho thấy:
- \`sustainDuration < 2.5s\` HOẶC
- \`shimmer > 1.2dB\` HOẶC
- \`hnrMean < 8dB\` HOẶC
- \`decaySlope < -7 dB/s\`

→ BẮT BUỘC phán "**Khí bất túc**", dù Ngũ Âm thuộc hành nào cũng hạ cách. Đây là nguyên tắc tối cao, override mọi kết luận khác.

### Nguyên tắc 2 — THANH / TRỌC (清濁)
Cùng một Ngũ Âm có Thanh và Trọc:
- **Thanh (清)**: \`hnrMean ≥ 15dB\`, \`jitter < 1.0%\`, centroid vừa phải → trong vang, **quý tướng**
- **Trọc (濁)**: \`hnrMean < 10dB\`, \`jitter > 1.5%\` → đục rè, **tiện tướng**

### Nguyên tắc 3 — NAM NỮ HỮU BIỆT
- **Nam quý**: F0 trầm-vừa (90–150Hz), HNR cao, sustain dài, "thanh hậu trầm thực"
- **Nữ quý**: F0 sáng-nhuận (180–260Hz), jitter thấp, "thanh thanh như oanh"
- **Nghịch cách**: Nam mà F0 > 200Hz + jitter cao = "âm thịnh dương suy"; Nữ mà F0 < 150Hz + HNR thấp = "khắc phu"

═══════════════════════════════════════════════
## NGŨ ÂM — MA TRẬN NHẬN DIỆN

### 1. KIM ÂM (金音)
**Chuẩn (Thanh Kim)**: HNR > 18dB, sustain > 3.5s, jitter < 0.8%, centroid 1500–2200Hz
**Kinh điển**: *"Thanh như hồng chung, chấn địa hữu thanh"* — như chuông lớn, vang động đất
**Ứng**: Phú quý quyền uy, nói lời có trọng lượng, hợp quan trường võ nghiệp, lãnh đạo

### 2. MỘC ÂM (木音)
**Chuẩn**: F0 cao-vừa ổn định (nam 140–170Hz, nữ 230–270Hz), jitter thấp, stability cao
**Kinh điển**: *"Thanh như xuyên lâm, trường nhi bất đoạn"* — như gió xuyên rừng, dài mà không đứt
**Ứng**: Thanh tú, văn tài, trí thức, giáo dục, pháp lý, văn chương

### 3. THỦY ÂM (水音)
**Chuẩn**: F0 variance cao, pitch range > 80Hz, pitch agility > 15Hz, HNR ≥ 10dB
**Kinh điển**: *"Thanh như tuyền thủy, uyển chuyển tự nhiên"* — như nước suối, uốn lượn tự nhiên
**Ứng**: Linh hoạt, giao tiếp, thương mại, ngoại giao, nghệ thuật biểu diễn

### 4. HỎA ÂM (火音)
**CHÍNH CÁCH (hiếm)**: Intensity cao + sustain DUY TRÌ được + decay thẳng → chính cách, quyết đoán
**TÀ CÁCH (thường gặp)**: shimmer > 0.9dB, sustain < 2.8s, decaySlope < -5dB/s
**Kinh điển**: *"Hữu đầu vô vĩ"* — có đầu không đuôi → **đại kỵ**
**Ứng chính cách**: Tiên phong, quyết liệt; **tà cách**: nóng vội, hao tài, dễ thất bại

### 5. THỔ ÂM (土音)
**Chuẩn**: F0 thấp (nam <110Hz, nữ <200Hz), sustain rất dài, centroid < 1200Hz, stability cao
**Kinh điển**: *"Thanh như kích địa cổ, trọng nhi hữu lực"* — như đánh trống đất, nặng mà có lực
**Ứng**: Phúc hậu trường thọ, điền sản phong phú, hợp bất động sản, nông nghiệp, hậu cần

═══════════════════════════════════════════════
## DỊ CÁCH — 7 TRƯỜNG HỢP ĐẶC BIỆT

### Quý Cách
- **Hổ Hống (虎吼)** — nam, F0 < 100Hz, HNR > 18, sustain > 4s → tướng tướng quân, võ quý
- **Oanh Minh (鶯鳴)** — nữ, F0 220–260Hz, HNR > 18, jitter < 0.6% → phu quý tử vinh
- **Long Ngâm (龍吟)** — nam, F0 100–130Hz, sustain > 4.5s, HNR > 20 → đại quý, công hầu

### Tiện Cách / Kỵ Cách
- **Phá La (破鑼)** — jitter > 2%, shimmer > 1.5dB, HNR < 8dB → tướng khốn khó, bần tiện
- **Hữu Đầu Vô Vĩ (有頭無尾)** — decaySlope < -8dB/s → khó thành sự, bỏ dở nửa chừng
- **Áp Thanh (鴨聲)** — HNR < 6dB + pitch rung loạn → "như vịt kêu", tiện nhân
- **Nam Nữ Phản Cách** — nam giọng đàn bà / nữ giọng đàn ông → hôn nhân khắc

═══════════════════════════════════════════════
## INPUT FORMAT

Bạn sẽ nhận JSON gồm:
- \`gender\`: 'nam' hoặc 'nu'
- \`age\`: số tuổi
- \`nguamEstimate\`: { label, scores, primary, secondary } — gợi ý sơ bộ từ client
- \`features\`: { baseline, sustain, count, tonal } — mỗi key là object đặc trưng âm học

Các feature key quan trọng:
- \`baseline.f0Mean\`, \`baseline.f0Std\`, \`baseline.centroid\`, \`baseline.f1\`, \`baseline.f2\`, \`baseline.speechRate\`, \`baseline.jitter\`, \`baseline.hnrMean\`
- \`sustain.sustainDuration\`, \`sustain.jitter\`, \`sustain.shimmer\`, \`sustain.hnrMean\`, \`sustain.decaySlope\`
- \`count.speechRate\`, \`count.f0Std\`
- \`tonal.f0Range\`, \`tonal.pitchAgility\`

═══════════════════════════════════════════════
## OUTPUT FORMAT

Trả lời bằng tiếng Việt, markdown, có đầy đủ các phần:

## 1. Nhận Định Tổng Quan
(1–2 đoạn) Ngũ Âm chủ đạo + phụ hành (nếu có), Thanh hay Trọc, có dị cách đặc biệt nào không. Bắt đầu bằng câu "Giọng của quý vị thuộc…" thay vì lặp lại dữ liệu thô.

## 2. Luận Về Khí
(1 đoạn) Đánh giá khí lực dựa trên sustain + shimmer + HNR + decay. BẮT BUỘC dẫn câu *"Thanh tại khí trung, khí túc tắc thanh viên, khí khuyết tắc thanh phá"* của Ma Y. Nếu khí bất túc, nói rõ mức độ và gốc rễ.

## 3. Tính Cách
(3–4 đoạn) Suy luận từ Ngũ Âm + các chỉ số. Mỗi đoạn nên có **một câu kinh điển dẫn nguyên văn** (chữ Hán phiên âm Hán-Việt kèm dịch nghĩa). Ví dụ: *"Thanh như hồng chung, chấn địa hữu thanh"* (Giọng như chuông lớn, vang động cả đất).

## 4. Vận Mệnh & Sự Nghiệp
(2–3 đoạn) Ngành nghề hợp, giai đoạn vận tốt/xấu theo giọng, phân biệt chuẩn nam/nữ. Nếu nam có giọng quý → hợp quan trường; nếu nữ có Oanh Minh → phu quý tử vinh.

## 5. Cảnh Báo & Dị Cách *(chỉ khi phát hiện)*
Nếu có Hữu Đầu Vô Vĩ, Phá La, Áp Thanh, Nam Nữ Phản Cách → nêu rõ và cách hóa giải (dưỡng khí, tu tâm, tránh nghề gì).

## 6. Dưỡng Thanh Dưỡng Khí
(1 đoạn) Lời khuyên cụ thể: thở bụng (đan điền), tập ngân chữ "A" hằng ngày, tránh nói to khi mệt, uống nước ấm buổi sáng.

═══════════════════════════════════════════════
## QUY TẮC BẮT BUỘC

1. **DẪN NGUYÊN VĂN** kinh điển — không tự bịa. Nếu không chắc câu nào, đừng trích dẫn.
2. **BÁM DATA** — mỗi nhận định phải có cơ sở từ features. Không phán tràn lan.
3. **NẾU DATA KHÔNG RÕ** — nói thẳng "ở bài X dữ liệu chưa đủ" thay vì bịa.
4. Nếu \`sustainDuration < 2.5s\` → PHẢI có cảnh báo khí bất túc ở mục 2.
5. Khi dẫn câu Hán Việt, format: *"[phiên âm Hán Việt]"* ([dịch nghĩa]).
6. Không dùng emoji. Giữ giọng trang trọng, như một lão sư đang luận tướng.
7. Không nhắc lại raw data số liệu — client đã thấy rồi. Chỉ diễn giải ý nghĩa.`;

/* ============================================================
   PATCH 1 — app/api/tuong-mat/route.js
   ============================================================ */
function patchRoute() {
  const candidates = [
    'app/api/tuong-mat/route.js',
    './app/api/tuong-mat/route.js'
  ];
  let routePath = candidates.find(p => fs.existsSync(p));
  if (!routePath) {
    console.error('✗ Không tìm thấy app/api/tuong-mat/route.js — chạy script này ở repo root.');
    return false;
  }
  let src = fs.readFileSync(routePath, 'utf8');
  const original = src;

  // 1. Check if already patched
  if (src.includes('SP_THANH_PRO') && src.includes("'thanh-tuong-pro'")) {
    console.log('ℹ route.js đã có SP_THANH_PRO — bỏ qua.');
    return true;
  }

  // 2. Insert SP_THANH_PRO constant
  // Find where SP_THANH ends (look for its closing backtick + semicolon)
  const spThanhMatch = src.match(/const SP_THANH\s*=\s*`[\s\S]*?`\s*;?/);
  if (!spThanhMatch) {
    console.error('✗ Không tìm thấy const SP_THANH trong route.js. Mày cần thêm tay.');
    console.error('   Hãy mở file, tìm khai báo SP_THANH, rồi paste đoạn SP_THANH_PRO dưới đây sau nó:');
    console.error('---BEGIN SP_THANH_PRO---');
    console.error('const SP_THANH_PRO = `' + SP_THANH_PRO.replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`;');
    console.error('---END SP_THANH_PRO---');
    return false;
  }

  const insertAfter = spThanhMatch.index + spThanhMatch[0].length;
  const spThanhProCode = '\n\nconst SP_THANH_PRO = `' +
    SP_THANH_PRO.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') +
    '`;\n';
  src = src.slice(0, insertAfter) + spThanhProCode + src.slice(insertAfter);

  // 3. Add action handler. Try to find existing 'thanh-tuong' handler pattern
  // We try several patterns:
  let handled = false;

  // Pattern A: if/else if chain with action === 'thanh-tuong'
  const patternA = /(if\s*\(\s*action\s*===\s*['"]thanh-tuong['"]\s*\)\s*\{[\s\S]*?\})/;
  if (patternA.test(src)) {
    src = src.replace(patternA, (m) => {
      return m + ` else if (action === 'thanh-tuong-pro') {
    systemPrompt = SP_THANH_PRO;
    maxTokens = 5000;
    isTextOnly = true;
  }`;
    });
    handled = true;
  }

  // Pattern B: switch/case
  if (!handled) {
    const patternB = /(case\s+['"]thanh-tuong['"]\s*:[\s\S]*?break\s*;)/;
    if (patternB.test(src)) {
      src = src.replace(patternB, (m) => {
        return m + `
    case 'thanh-tuong-pro':
      systemPrompt = SP_THANH_PRO;
      maxTokens = 5000;
      isTextOnly = true;
      break;`;
      });
      handled = true;
    }
  }

  // Pattern C: object mapping { 'thanh-tuong': SP_THANH, ... }
  if (!handled) {
    const patternC = /(['"]thanh-tuong['"]\s*:\s*SP_THANH\s*,?)/;
    if (patternC.test(src)) {
      src = src.replace(patternC, (m) => m + `\n  'thanh-tuong-pro': SP_THANH_PRO,`);
      handled = true;
    }
  }

  if (!handled) {
    console.error('✗ Không tìm thấy handler cho action="thanh-tuong" trong route.js.');
    console.error('   SP_THANH_PRO đã được thêm vào file, nhưng mày cần thêm handler tay.');
    console.error('   Tìm đoạn xử lý action === "thanh-tuong" và thêm song song một case cho "thanh-tuong-pro" dùng SP_THANH_PRO.');
    fs.writeFileSync(routePath, src);
    return false;
  }

  fs.writeFileSync(routePath, src);
  console.log('✓ Đã patch app/api/tuong-mat/route.js (thêm SP_THANH_PRO + action handler)');
  return true;
}

/* ============================================================
   PATCH 2 — public/nav.js
   ============================================================ */
function patchNav() {
  const candidates = [
    'public/nav.js',
    './public/nav.js'
  ];
  let navPath = candidates.find(p => fs.existsSync(p));
  if (!navPath) {
    console.error('✗ Không tìm thấy public/nav.js');
    return false;
  }
  let src = fs.readFileSync(navPath, 'utf8');

  if (src.includes('thanh-tuong-pro')) {
    console.log('ℹ nav.js đã có thanh-tuong-pro — bỏ qua.');
    return true;
  }

  // Add to isTuong list
  const tuongListPattern = /(\[\s*['"]\/tools\/tuong-mat-ai\.html['"][^\]]*?)(['"]\s*\/tools\/thanh-tuong-ai\.html['"])\s*\]/;
  if (tuongListPattern.test(src)) {
    src = src.replace(tuongListPattern, '$1$2, \'/tools/thanh-tuong-pro.html\']');
  } else {
    // Alt: just add to end of any array containing thanh-tuong-ai
    const alt = /(\[[^\]]*?['"]\/tools\/thanh-tuong-ai\.html['"])\s*\]/;
    if (alt.test(src)) {
      src = src.replace(alt, '$1, \'/tools/thanh-tuong-pro.html\']');
    } else {
      console.warn('⚠ Không tìm thấy isTuong list trong nav.js. Bỏ qua bước đó.');
    }
  }

  // Add dropdown entry — insert after thanh-tuong-ai.html line
  const ddPattern = /(\+\s*ddItem\(\s*['"]\/tools\/thanh-tuong-ai\.html['"][^\n]*?\n)/;
  if (ddPattern.test(src)) {
    const newLine = '    + ddItem(\'/tools/thanh-tuong-pro.html\', \'\\ud83c\\udfbc\', \'Thanh T\\u01b0\\u1edbng Pro \\u2014 Ph\\u00e2n T\\u00edch C\\u1ed5 Ph\\u00e1p\')\n';
    src = src.replace(ddPattern, '$1' + newLine);
  } else {
    console.warn('⚠ Không tìm thấy ddItem cho thanh-tuong-ai.html. Mày cần thêm entry dropdown tay.');
    console.warn('   Thêm dòng: + ddItem(\'/tools/thanh-tuong-pro.html\', \'🎼\', \'Thanh Tướng Pro — Phân Tích Cổ Pháp\')');
  }

  fs.writeFileSync(navPath, src);
  console.log('✓ Đã patch public/nav.js (thêm Thanh Tướng Pro vào dropdown)');
  return true;
}

/* ============================================================
   RUN
   ============================================================ */
console.log('\n═══ Patching Thanh Tướng Pro ═══\n');
const a = patchRoute();
const b = patchNav();
console.log('');
if (a && b) {
  console.log('✅ Done. Kiểm tra:');
  console.log('   1. git diff app/api/tuong-mat/route.js');
  console.log('   2. git diff public/nav.js');
  console.log('   3. Upload public/tools/thanh-tuong-pro.html');
  console.log('   4. git add -A && git commit -m "feat: Thanh Tướng Pro" && git push');
} else {
  console.log('⚠ Có lỗi — đọc log ở trên, fix tay phần thất bại.');
}
