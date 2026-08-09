#!/usr/bin/env node
/**
 * Chặn tái phát: MỌI tool chạy trong Luận Đường (`/app/*`) phải chia sẻ được.
 *
 * Vì sao có bộ dò này: chia sẻ khung giữa từng là tính năng OPT-IN của từng
 * tool — mỗi trang phải tự nhớ gọi `Shell.setShareable(...)` đúng lúc có kết
 * quả rồi `setShareable(null)` khi quay về form. 32 tool nhân lên là hàng trăm
 * chỗ để quên, và không có gì canh. Đã quên thật:
 *   · `day-con` KHÔNG có nút Chia sẻ suốt từ lúc ra mắt tới khi Henry báo;
 *   · `thanh-tuong-pro`/`phong-thuy` không bao giờ gỡ nút, nên bấm Chia sẻ sau
 *     khi làm lượt mới là phát ra kết quả của LƯỢT TRƯỚC.
 *
 * Nay `shell.js` tự bật/tắt nút, nhưng nó cần biết ĐÂU là vùng kết quả. Giao
 * ước duy nhất của trang là một mốc `data-ws-result`. Bộ dò canh đúng cái mốc
 * đó — quên khai thì trang lặng lẽ mất nút Chia sẻ y như cũ, và cái im lặng đó
 * mới là thứ nguy hiểm.
 *
 * Cùng tinh thần `check-no-hardcoded-prices.mjs` / `check-supabase-no-store.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'public');

// Trang shell KHÔNG phải tool: không có khung kết quả để chia sẻ.
// `home` là dashboard, `ho-so` là trang tài khoản.
const NOT_A_TOOL = new Set(['home', 'ho-so']);

const problems = [];
let checked = 0;

// 🪤 Lọc theo `app-*.html` là SAI và đã suýt bỏ sót đúng tool đầu bảng:
// `/app/la-so` nằm ở `app.html` (không gạch nối) và nó cũng chưa từng gọi
// `setShareable`. Nên nhận diện trang shell bằng CHÍNH dấu hiệu của shell
// (nạp `shell.js` + khai `SHELL_ACTIVE`), đừng đoán theo tên file.
for (const f of fs.readdirSync(DIR).sort()) {
  if (!/\.html$/.test(f)) continue;
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');

  // Trang shell = có nạp shell.js VÀ khai mình là tool nào. `app-xem-tuoi`
  // phục vụ 3 route nên gán SHELL_ACTIVE bằng BIẾN — vẫn phải kiểm, chỉ là
  // không đối chiếu được tên. Bỏ qua nó vì "không khớp mẫu chuỗi" chính là
  // kiểu im lặng bộ dò này sinh ra để chống.
  if (!/shell\.js/.test(src) || !/\bSHELL_ACTIVE\s*=/.test(src)) continue;
  const active = (src.match(/SHELL_ACTIVE\s*=\s*'([^']+)'/) || [])[1] || null;
  if (active && NOT_A_TOOL.has(active)) continue;
  checked++;

  const at = (re) => {
    const m = re.exec(src);
    return m ? src.slice(0, m.index).split('\n').length : 0;
  };

  // 1. Thanh công cụ khung giữa — chỗ shell chèn nút Chia sẻ vào.
  if (!/class="ws-actions"/.test(src)) {
    problems.push(
      `public/${f} — thiếu <div class="ws-actions"> ở .ws-top (shell không có chỗ chèn nút Chia sẻ)`
    );
  }

  // 2. Vùng kết quả: đúng MỘT mốc. Không có mốc thì shell không biết khi nào
  //    bật/tắt nút; nhiều mốc thì nó chọn cái đầu tiên trong DOM — im lặng
  //    chọn nhầm còn tệ hơn báo lỗi.
  const marks = src.match(/\sdata-ws-result(?=[\s/>=])/g) || [];
  if (marks.length === 0) {
    problems.push(
      `public/${f} — thiếu mốc data-ws-result. Đặt nó lên khối bao NGOÀI CÙNG của phần kết quả ` +
        '(khối mà tool bật/tắt display khi chạy xong / quay về form).'
    );
  } else if (marks.length > 1) {
    problems.push(
      `public/${f}:${at(/\sdata-ws-result/)} — có ${marks.length} mốc data-ws-result, phải đúng 1`
    );
  }

  // 3. `toolId` chép tay trong setShareable phải khớp SHELL_ACTIVE. Lệch thì
  //    link chia sẻ quy về sai tool: nút CTA của /ket-qua trỏ nhầm trang và
  //    phễu D1 đếm nhầm cột — cả hai đều sai âm thầm.
  for (const m of active ? src.matchAll(/toolId\s*:\s*'([^']+)'/g) : []) {
    if (m[1] !== active) {
      problems.push(
        `public/${f}:${src.slice(0, m.index).split('\n').length} — toolId '${m[1]}' lệch SHELL_ACTIVE '${active}'. ` +
          'Bỏ hẳn toolId đi thì shell tự điền đúng.'
      );
    }
  }
}

if (problems.length) {
  console.error('✗ Chia sẻ khung giữa (workspace) hỏng ở các trang sau:\n');
  for (const p of problems) console.error('  ' + p);
  console.error(
    '\nChia sẻ là tính năng của SHELL, không phải của từng tool: `shell.js` tự bật nút khi vùng\n' +
      '`data-ws-result` hiện ra và tự gỡ khi nó biến mất. Trang chỉ cần khai đúng cái mốc đó.\n' +
      '`Shell.setShareable(...)` là TÙY CHỌN — chỉ dùng khi muốn làm giàu bản chia sẻ (ảnh AI,\n' +
      'khối blocks có cấu trúc).'
  );
  process.exit(1);
}
console.log(`✓ ${checked} tool trong Luận Đường đều khai vùng kết quả — chia sẻ workspace phủ hết`);
