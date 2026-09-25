/**
 * lib/qimen/chu-de.ts — lăng kính chủ đề cho Kỳ Môn Độn Giáp.
 *
 * KHÁC `lib/agent/luan-chu-de.ts` (Tử Vi): Tử Vi có 12 cung CỐ ĐỊNH, mỗi cung
 * gắn một mảng đời sống, nên "chủ đề" chọn ĐÚNG CUNG để đọc. Kỳ Môn không có
 * khái niệm đó — 9 cung ứng với 9 HƯỚNG, không phải 9 mảng đời sống. Việc/mảng
 * đời sống đã nằm SẴN trong `nghia` của từng CỬA/SAO/THẦN (`lib/qimen/terms.ts`)
 * — đó là cổ pháp có sẵn, không phải suy diễn mới.
 *
 * File này KHÔNG thêm khẳng định cổ pháp nào. Nó chỉ làm hai việc:
 * 1. Nhận diện câu hỏi thuộc chủ đề nào (cụm đủ nghĩa, cùng lối với `luan-chu-de.ts`).
 * 2. Với chủ đề đó, LỌC/NÊU BẬT những cung mà cửa/sao/thần của nó có `nghia`
 *    đã nói tới đúng chủ đề — thay vì bắt người đọc dò cả 8-9 dòng.
 *
 * TOPIC → tên cửa/sao/thần liên quan là một bước PHÂN LOẠI (đọc nghĩa đã có,
 * xếp vào nhóm), không phải một bước SÁNG TÁC cổ pháp mới — giống việc Bát
 * Trạch đã tự có sẵn ánh xạ, chỉ khác Kỳ Môn cần gom từ nhiều bảng con.
 * Không khớp chủ đề nào → trả rỗng, giữ nguyên context cũ (lưới đỡ).
 */
import { CUA, SAO, THAN } from './terms';
import type { CungBan } from './board';

type ChuDeId =
  | 'tai-chinh' | 'su-nghiep' | 'tinh-duyen' | 'kien-tung'
  | 'suc-khoe' | 'di-xa' | 'an-ninh' | 'hoc-hanh';

// Khoá = cụm đủ nghĩa nối bằng `|` (cùng khuôn `FOCUS_TOPICS`/`Y_DINH_*` ở
// lib/agent/luan-chu-de.ts) để `scripts/check-topic-patterns.mjs` canh được —
// xem mục `qimen-tu-khoa` trong bộ dò đó. ĐỪNG đổi sang RegExp literal.
const TU_KHOA: Record<string, ChuDeId> = {
  'tài chính|làm ăn|kinh doanh|đầu tư|buôn bán|mua bán|tiền bạc|cầu tài|vay nợ|đòi nợ': 'tai-chinh',
  'sự nghiệp|công việc|xin việc|thăng chức|khởi nghiệp|hợp tác|ký hợp đồng|đàm phán': 'su-nghiep',
  'tình duyên|hôn nhân|kết hôn|cầu hôn|người yêu|tình cảm|cưới hỏi': 'tinh-duyen',
  'kiện tụng|tranh chấp|kiện cáo|pháp lý|tòa án|khẩu thiệt|thị phi': 'kien-tung',
  'sức khỏe|bệnh tật|ốm đau|khám bệnh|tai nạn|tai ách': 'suc-khoe',
  'đi xa|xuất hành|du lịch|chuyển nhà|công tác xa|đi lại|lên đường': 'di-xa',
  'mất trộm|trộm cắp|an ninh|thất lạc|lừa đảo|lừa gạt': 'an-ninh',
  'thi cử|học hành|thi tuyển|văn thư|hồ sơ|nộp đơn': 'hoc-hanh',
};

/** Tên cửa/sao/thần được xếp vào từng chủ đề — đọc từ `nghia` đã có trong `terms.ts`. */
const LIEN_QUAN: Record<ChuDeId, Set<string>> = {
  'tai-chinh': new Set(['Sinh Môn', 'Cửu Địa']),
  'su-nghiep': new Set(['Khai Môn', 'Thiên Tâm', 'Thiên Nhậm', 'Lục Hợp', 'Cửu Thiên']),
  'tinh-duyen': new Set(['Hưu Môn', 'Lục Hợp']),
  'kien-tung': new Set(['Thương Môn', 'Kinh Môn', 'Thiên Trụ', 'Bạch Hổ']),
  'suc-khoe': new Set(['Tử Môn', 'Thiên Nhuế', 'Bạch Hổ']),
  'di-xa': new Set(['Thiên Xung', 'Cửu Thiên', 'Bạch Hổ']),
  'an-ninh': new Set(['Đỗ Môn', 'Kinh Môn', 'Thiên Bồng', 'Đằng Xà', 'Huyền Vũ', 'Cửu Địa']),
  'hoc-hanh': new Set(['Cảnh Môn', 'Thiên Nhuế', 'Thiên Phụ']),
};

const NHAN: Record<ChuDeId, string> = {
  'tai-chinh': 'tài chính, cầu tài', 'su-nghiep': 'sự nghiệp, hợp tác',
  'tinh-duyen': 'tình duyên, hôn nhân', 'kien-tung': 'kiện tụng, tranh chấp',
  'suc-khoe': 'sức khỏe', 'di-xa': 'đi xa, xuất hành',
  'an-ninh': 'an ninh, mất mát', 'hoc-hanh': 'học hành, thi cử, văn thư',
};

/** Câu hỏi có thể chạm nhiều chủ đề (vd "đi ký hợp đồng có nên không") — giữ TỐI ĐA 2, ưu tiên thứ tự khai báo trong `TU_KHOA`. */
export function cacChuDe(cauHoi: string): ChuDeId[] {
  const q = String(cauHoi || '');
  if (!q.trim()) return [];
  const ra: ChuDeId[] = [];
  for (const [mau, id] of Object.entries(TU_KHOA)) {
    if (new RegExp(mau, 'i').test(q)) ra.push(id);
    if (ra.length >= 2) break;
  }
  return ra;
}

function khopChuDe(c: CungBan, id: ChuDeId): boolean {
  const s = LIEN_QUAN[id];
  return !!((c.cua && s.has(c.cua.ten)) || (c.sao && s.has(c.sao.ten)) || (c.than && s.has(c.than.ten)));
}

/**
 * Khối nêu bật các cung liên quan tới việc người dùng hỏi, dựng từ `BanKyMon`
 * đầy đủ (có ở `dungBan()`, KHÔNG có ở `railData()` vì đã format thành chuỗi).
 * Gọi hàm này ở nơi còn giữ được `BanKyMon` gốc — xem `lib/agent/prompts.ts`.
 */
export function khoiChuDe(cauHoi: string, cungs: CungBan[]): string {
  const ids = cacChuDe(cauHoi);
  if (!ids.length) return '';
  const doan: string[] = [];
  for (const id of ids) {
    const khop = cungs.filter((c) => khopChuDe(c, id));
    if (!khop.length) continue;
    const dong = khop.map((c) => {
      const phan = [c.cua && `cửa ${c.cua.ten}`, c.sao && `sao ${c.sao.ten}`, c.than && `thần ${c.than.ten}`].filter(Boolean).join(', ');
      return `- ${c.huong} (${c.ten}, ${c.muc === 'cat' ? 'CÁT' : c.muc === 'hung' ? 'HUNG' : 'bình'}, hạng ${c.hang}/8): ${phan}${c.viec ? ' — ' + c.viec : ''}`;
    });
    doan.push(`Việc hỏi thuộc chủ đề ${NHAN[id]} — các hướng sau có cửa/sao/thần liên quan trực tiếp (đọc theo nghĩa cổ pháp của chính cửa/sao/thần đó, không suy diễn thêm):\n${dong.join('\n')}`);
  }
  if (!doan.length) return '';
  return `\n(LĂNG KÍNH CHỦ ĐỀ — ưu tiên đọc các hướng dưới đây trước khi liệt kê đều cả bàn, vì chúng khớp trực tiếp với việc người dùng hỏi.)\n${doan.join('\n\n')}\n`;
}

// Re-export để nơi gọi không phải import thêm từ terms.ts khi chỉ cần kiểm tra
// một cửa/sao/thần có nghia hay không (vd log/debug).
export { CUA, SAO, THAN };
