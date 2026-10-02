export const meta = {
  name: 'nghiem-chung-viet',
  description: 'Viết hồ sơ Nghiệm Chứng: mỗi agent (Sonnet) một slug, tự kiểm bằng validate.ts',
  phases: [{ title: 'Viết hồ sơ', detail: 'một agent cho mỗi slug' }],
};
// args: { slugs: string[], effort?: 'low'|'medium'|… } — tối đa ~900 slug (trần 1000 agent mỗi lượt).
// effort 'low' = ít token suy nghĩ (đo 2026-10-02: suy nghĩ chiếm ~một nửa token ra ở mức mặc định).
const slugs = (args && args.slugs) || [];
const effort = (args && args.effort) || undefined;
// args.doan: người KHÔNG có giờ sinh — bước 1 chấm 12 giờ (brief-doan), chốt giờ, rồi viết như thường.
const doan = !!(args && args.doan);
const buoc1 = (s) =>
  doan
    ? `0) Đọc TOÀN BỘ work/nghiem-chung/brief-doan/${s}.md, làm đúng "Bước 1" trong đó: ghi work/nghiem-chung/doan/${s}.json ` +
      `rồi chạy npx tsx scripts/nghiem-chung/doan-gio.ts chot ${s} (một lệnh Bash: mkdir -p work/nghiem-chung/doan && cat > … <<'DOAN' … DOAN && npx tsx …).\n`
    : '';
log(`${slugs.length} slug`);
phase('Viết hồ sơ');
const kq = await parallel(
  slugs.map(
    (s) => () =>
      agent(
        `Viết hồ sơ Nghiệm Chứng cho slug ${s}. Thư mục làm việc là gốc repo.\n` +
          buoc1(s) +
          `1) Đọc TOÀN BỘ work/nghiem-chung/brief/${s}.md (luật + lá số + vận các năm ứng viên + bài Wikipedia). ` +
          `Nếu công cụ Read cắt giữa chừng thì đọc tiếp bằng offset. KHÔNG đọc file nào khác${doan ? ' (ngoài brief-doan ở bước 0)' : ''}.\n` +
          `2) Bằng MỘT lệnh Bash, ghi nháp rồi kiểm tra ngay: ` +
          `mkdir -p work/nghiem-chung/draft && cat > work/nghiem-chung/draft/${s}.json <<'NHAP'\n{…json…}\nNHAP\n` +
          `npx tsx scripts/nghiem-chung/validate.ts ${s}\n` +
          `3) Lỗi thì sửa và chạy lại đúng kiểu một lệnh đó (tối đa 3 lần). Vẫn không qua thì ghi {"loaiTru":"khong-dat: <lý do>"} rồi validate.\n` +
          `Trả về đúng một dòng: dòng ✓ hoặc ⊘ cuối cùng mà validate in ra.`,
        { label: s, phase: 'Viết hồ sơ', model: 'sonnet', ...(effort ? { effort } : {}) }
      )
  )
);
const dong = kq.map((r, i) =>
  r ? String(r).trim().split('\n').pop() : `${slugs[i]}: (agent lỗi)`
);
return {
  tong: slugs.length,
  xong: dong.filter((d) => d.includes('✓')).length,
  loai: dong.filter((d) => d.includes('⊘')).length,
  dong,
};
