/**
 * lib/liuren/chu-de.ts — lăng kính chủ đề cho Đại Lục Nhâm.
 *
 * CÙNG TRIẾT LÝ với `lib/qimen/chu-de.ts`, khác Tử Vi (`lib/agent/luan-chu-de.ts`):
 * Lục Nhâm không có 12 cung cố định gắn mảng đời sống. Việc/mảng đời sống đã
 * nằm SẴN trong `nghia` của 12 Thiên Tướng và của Thần Sát (`lib/liuren/terms.ts`)
 * — cổ pháp có sẵn, không phải suy diễn mới.
 *
 * File này KHÔNG thêm khẳng định cổ pháp nào. Nó chỉ:
 * 1. Nhận diện câu hỏi thuộc chủ đề nào (cụm đủ nghĩa).
 * 2. Với chủ đề đó, NÊU BẬT thiên tướng/thần sát nào TRONG KHÓA (thiên bàn,
 *    tam truyền, thần sát) mà `nghia` đã nói tới đúng chủ đề.
 *
 * TOPIC → tên thiên tướng/thần sát liên quan là bước PHÂN LOẠI (đọc nghĩa đã
 * có, xếp vào nhóm), không phải bước SÁNG TÁC cổ pháp mới.
 * Không khớp chủ đề nào → trả rỗng, giữ nguyên context cũ (lưới đỡ).
 */
import type { KhoaLucNham } from './ke';

type ChuDeId =
  | 'tai-chinh' | 'su-nghiep' | 'tinh-duyen' | 'kien-tung'
  | 'suc-khoe' | 'di-xa' | 'an-ninh' | 'hoc-hanh';

// Khoá = cụm đủ nghĩa nối bằng `|` (cùng khuôn `FOCUS_TOPICS`/`Y_DINH_*` ở
// lib/agent/luan-chu-de.ts, và `lib/qimen/chu-de.ts`) để
// `scripts/check-topic-patterns.mjs` canh được — xem mục `liuren-tu-khoa`
// trong bộ dò đó. ĐỪNG đổi sang RegExp literal.
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

/** Tên Thiên Tướng/Thần Sát xếp vào từng chủ đề — đọc từ `nghia` đã có trong `terms.ts`. */
const LIEN_QUAN: Record<ChuDeId, Set<string>> = {
  'tai-chinh': new Set(['Thanh Long', 'Thái Thường', 'Nhật Lộc']),
  'su-nghiep': new Set(['Quý Nhân', 'Lục Hợp', 'Thanh Long']),
  'tinh-duyen': new Set(['Lục Hợp', 'Thái Âm', 'Thiên Hậu', 'Hàm Trì']),
  'kien-tung': new Set(['Câu Trần', 'Chu Tước', 'Bạch Hổ']),
  'suc-khoe': new Set(['Bạch Hổ', 'Phá Toái']),
  'di-xa': new Set(['Dịch Mã', 'Chi Mã', 'Thiên Mã', 'Bạch Hổ']),
  'an-ninh': new Set(['Huyền Vũ', 'Thiên Không', 'Kiếp Sát', 'Vong Thần', 'Thiên La', 'Địa Võng']),
  'hoc-hanh': new Set(['Chu Tước']),
};

const NHAN: Record<ChuDeId, string> = {
  'tai-chinh': 'tài chính, cầu tài', 'su-nghiep': 'sự nghiệp, hợp tác',
  'tinh-duyen': 'tình duyên, hôn nhân', 'kien-tung': 'kiện tụng, tranh chấp',
  'suc-khoe': 'sức khỏe', 'di-xa': 'đi xa, xuất hành',
  'an-ninh': 'an ninh, mất mát', 'hoc-hanh': 'học hành, thi cử, văn thư',
};

/** Câu hỏi có thể chạm nhiều chủ đề — giữ TỐI ĐA 2, ưu tiên thứ tự khai báo trong `TU_KHOA`. */
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

/**
 * Khối nêu bật thiên tướng/thần sát liên quan tới việc người dùng hỏi, dựng
 * từ `KhoaLucNham` đầy đủ (có ở `lapKhoa()`, KHÔNG có ở `railData()` vì đã
 * format thành chuỗi). Gọi hàm này ở nơi còn giữ được `KhoaLucNham` gốc.
 */
export function khoiChuDe(cauHoi: string, khoa: KhoaLucNham): string {
  const ids = cacChuDe(cauHoi);
  if (!ids.length) return '';
  const doan: string[] = [];
  for (const id of ids) {
    const s = LIEN_QUAN[id];
    const dong: string[] = [];

    for (const g of khoa.thienBan) {
      if (s.has(g.tuong)) {
        dong.push(`- Thiên bàn: ${g.thien} gia ${g.dia}, thiên tướng ${g.tuong} (${g.muc === 'cat' ? 'CÁT' : g.muc === 'hung' ? 'HUNG' : 'bình'}) — ${g.nghia}`);
      }
    }
    for (const t of khoa.tamTruyen) {
      if (s.has(t.tuong)) {
        dong.push(
          `- Tam truyền — ${t.ten} (${t.chi}): thiên tướng ${t.tuong} (${t.muc === 'cat' ? 'CÁT' : t.muc === 'hung' ? 'HUNG' : 'bình'})${t.tuanKhong ? ', RƠI TUẦN KHÔNG' : ''}, với can ngày ${t.quanHeCanNgay}`
        );
      }
    }
    for (const x of khoa.tuKhoa) {
      if (s.has(x.tuong)) {
        dong.push(`- ${x.ten}: trên ${x.tren} / dưới ${x.duoi}, thiên tướng ${x.tuong} (${x.muc === 'cat' ? 'CÁT' : x.muc === 'hung' ? 'HUNG' : 'bình'}), ${x.quanHe}`);
      }
    }
    for (const th of khoa.thanSat) {
      if (s.has(th.ten)) {
        dong.push(`- Thần sát: ${th.ten} (${th.muc === 'cat' ? 'CÁT' : th.muc === 'hung' ? 'HUNG' : 'bình'}) — ${th.nghia}`);
      }
    }

    if (dong.length) {
      doan.push(`Việc hỏi thuộc chủ đề ${NHAN[id]} — các vị trí sau trong khóa có thiên tướng/thần sát liên quan trực tiếp (đọc theo nghĩa cổ pháp của chính thiên tướng/thần sát đó, không suy diễn thêm):\n${dong.join('\n')}`);
    }
  }
  if (!doan.length) return '';
  return `\n(LĂNG KÍNH CHỦ ĐỀ — ưu tiên đọc các vị trí dưới đây trước khi luận đều cả khóa, vì chúng khớp trực tiếp với việc người dùng hỏi.)\n${doan.join('\n\n')}\n`;
}
