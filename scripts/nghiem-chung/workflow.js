export const meta = {
  name: 'nghiem-chung-viet',
  description: 'Viết hồ sơ Nghiệm Chứng: mỗi agent (Sonnet) một slug, tự kiểm bằng validate.ts',
  phases: [{ title: 'Viết hồ sơ', detail: 'một agent cho mỗi slug' }],
}
// args: { slugs: string[], effort?: 'low'|'medium'|… } — tối đa ~900 slug (trần 1000 agent mỗi lượt).
// effort 'low' = ít token suy nghĩ (đo 2026-10-02: suy nghĩ chiếm ~một nửa token ra ở mức mặc định).
const slugs = (args && args.slugs) || []
const effort = (args && args.effort) || undefined
log(`${slugs.length} slug`)
phase('Viết hồ sơ')
const kq = await parallel(
  slugs.map((s) => () =>
    agent(
      `Làm theo đúng scripts/nghiem-chung/PROMPT.md (đọc file đó trước, không đọc file nào khác ngoài gói của bạn). ` +
        `Thư mục làm việc là gốc repo. Slug của bạn: ${s}. Làm đến khi validate.ts in ✓ hoặc ⊘ rồi trả về đúng một dòng.`,
      { label: s, phase: 'Viết hồ sơ', model: 'sonnet', ...(effort ? { effort } : {}) },
    ),
  ),
)
const dong = kq.map((r, i) => (r ? String(r).trim().split('\n').pop() : `${slugs[i]}: (agent lỗi)`))
return { tong: slugs.length, xong: dong.filter((d) => d.includes('✓')).length, loai: dong.filter((d) => d.includes('⊘')).length, dong }
