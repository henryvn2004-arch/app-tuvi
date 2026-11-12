/**
 * lib/engine/nhan-mach-terms.ts — câu KHUÔN của khối "Các Cặp Trong Nhóm" (Sổ Nhân Mạch).
 *
 * Engine dựng chữ Việt bằng đúng khuôn này (byte-giống bản cũ: câu còn vào rail/prompt và payload
 * `portrait_cache`), và trả kèm `kieuA/kieuB/bien` để CLIENT dịch tại chỗ vẽ qua văn dài theo chỉ số
 * (ns `nhan-mach`, khoá `cap.<loai>`; docs/i18n/QUY-UOC.md "Văn engine server"). `{a}`/`{b}` là TÊN kiểu.
 */
export const CAP_MAU: Record<'giam-chan' | 'bu-nhau', string> = {
  'giam-chan': 'Cùng kiểu {a} — nghĩ giống nhau nên hợp lúc cần dồn sức, nhưng giao cùng một loại việc là giẫm chân và tranh phần.',
  'bu-nhau': '{a} và {b} khác tính âm/dương — một bên xông, một bên giữ. Ghép được, miễn là chia rõ ai quyết phần nào.',
};
