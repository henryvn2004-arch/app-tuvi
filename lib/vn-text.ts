// lib/vn-text.ts — chuẩn hoá chữ Việt cho các bộ DÒ TỪ KHOÁ (không phải để hiển thị).
//
// 🔴 Vì sao cần: tiếng Việt có HAI lối bỏ dấu thanh đều hợp lệ cho cùng một
// chữ — lối CŨ đặt dấu ở nguyên âm ĐẦU của cụm (khoẻ · hoà · thuý), lối MỚI
// đặt ở nguyên âm sau (khỏe · hòa · thúy). Bộ dò từ khoá so chuỗi THÔ nên gõ
// lối nào không khớp bảng là TRƯỢT IM LẶNG: "sức khoẻ tôi thế nào?" từng rơi
// xuống nhánh mặc định (Mệnh · Quan Lộc · Tài Bạch · Phu Thê) — KHÔNG có Tật
// Ách, tức đúng cung mà câu hỏi nhắm tới. Cùng lớp lỗi `\bcon\b` khớp "con
// vật" đã ghi trong CLAUDE.md.
//
// ⚠️ Chữa bằng cách CHUẨN HOÁ VỊ TRÍ dấu thanh, KHÔNG phải bỏ dấu thanh: bỏ
// dấu là nhập "tật" với "tất", "tiền" với "tiến", "bệnh" với "bênh" — đổi một
// lỗ hổng lấy một lỗ hổng khác. Ở đây dấu thanh GIỮ NGUYÊN, chỉ dời về một vị
// trí quy ước, nên hai LỐI VIẾT gặp nhau còn hai CHỮ khác thanh vẫn tách bạch.
//
// ⚠️ Và đừng vá bằng cách thêm từng biến thể vào bảng từ khoá — thêm biến thể
// là hẹn lần sót kế tiếp (hoà/hòa · thuý/thúy · xoà/xòa · loà/lòa… còn dài).

// Năm dấu thanh: huyền · sắc · ngã · hỏi · nặng.
const DAU_THANH = /[\u0300\u0301\u0303\u0309\u0323]/g;

// Cụm nguyên âm liền nhau, mỗi nguyên âm kèm dấu phụ của nó. Dải 0300–0323
// phủ CẢ dấu thanh LẪN dấu tạo chữ (ˆ 0302 · ˘ 0306 · ̛ 031B).
const CUM_NGUYEN_AM = /(?:[aeiouyAEIOUY][\u0300-\u0323]*)+/g;

// Nguyên âm đầu cụm + dấu TẠO CHỮ của riêng nó (không gồm dấu thanh).
const NGUYEN_AM_DAU = /^[aeiouyAEIOUY][\u0302\u0306\u031B]*/;

/**
 * Dời dấu thanh về nguyên âm ĐẦU của mỗi cụm nguyên âm.
 *
 * Vị trí "đầu cụm" là QUY ƯỚC NỘI BỘ, không nhằm đúng chính tả — chỉ cần cả
 * mẫu dò lẫn câu người dùng cùng đi qua hàm này thì hai lối viết trùng nhau.
 * Không dùng để in ra cho người đọc.
 */
export function chuanHoaDauThanh(s: string): string {
  if (!s) return s;
  return s
    .normalize('NFD')
    .replace(CUM_NGUYEN_AM, (cum) => {
      const thanh = cum.match(DAU_THANH);
      if (!thanh) return cum;
      const tran = cum.replace(DAU_THANH, '');
      const dau = tran.match(NGUYEN_AM_DAU);
      if (!dau) return cum;
      return dau[0] + thanh.join('') + tran.slice(dau[0].length);
    })
    .normalize('NFC');
}
