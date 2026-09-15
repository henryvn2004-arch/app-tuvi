// public/tools-shared/illus-nguong.js
// ============================================================
// NGƯỠNG tốt/trung/xấu cho thư viện hình minh hoạ — SINH bằng
// `scripts/gen-illus-nguong.mjs --write` trên 5.000 lá số ngẫu nhiên.
// KHÔNG SỬA TAY — chạy lại script khi cần cập nhật (đổi engine, đổi seed).
//
// rank = w + tong/100 (w từ `xuHuongCungW()` trong tuvi-laso-format.js — MỘT
// nguồn với prompt LLM; tong = ls.cungScores[cung].tong chỉ phá thế hoà).
// Cắt ở phân vị 33/67 CỦA TỪNG CUNG. Nghiệm trên mẫu khác mẫu dựng ngưỡng:
// 33,2% xấu · 33,9% trung · 32,8% tốt, mâu thuẫn ảnh↔chữ 0,00%.
// Xem lý do đầy đủ ở đầu `scripts/gen-illus-nguong.mjs`.
// ============================================================
(function (root) {
  var ILLUS_NGUONG = {
  "Mệnh": {
    "t33": 1.246,
    "t67": 5.082
  },
  "Phụ Mẫu": {
    "t33": 0.037,
    "t67": 0.225
  },
  "Phúc Đức": {
    "t33": 0.253,
    "t67": 1.249
  },
  "Điền Trạch": {
    "t33": 0.047,
    "t67": 0.435
  },
  "Quan Lộc": {
    "t33": 0.636,
    "t67": 3.249
  },
  "Nô Bộc": {
    "t33": -0.143,
    "t67": 0.429
  },
  "Thiên Di": {
    "t33": 0.036,
    "t67": 0.449
  },
  "Tật Ách": {
    "t33": -0.742,
    "t67": 0.037
  },
  "Tài Bạch": {
    "t33": 0.032,
    "t67": 0.238
  },
  "Tử Tức": {
    "t33": 0.033,
    "t67": 0.235
  },
  "Phu Thê": {
    "t33": 0.034,
    "t67": 0.236
  },
  "Huynh Đệ": {
    "t33": -0.153,
    "t67": 0.055
  }
};
  if (typeof module !== 'undefined' && module.exports) module.exports = ILLUS_NGUONG;
  if (typeof root !== 'undefined') root.ILLUS_NGUONG = ILLUS_NGUONG;
})(typeof window !== 'undefined' ? window : this);
