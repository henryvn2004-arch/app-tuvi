// public/tool-configs.js
// Single source of truth for all chat tools.
// Add a new tool here — it appears in the picker, sidebar, and API routing automatically.
var TOOL_CONFIGS = [
  {
    id:    'laso',
    name:  'Luận Giải Lá Số',
    icon:  '🔯',
    color: '#061A2E',
    desc:  'An sao tử vi — 12 cung, đại vận, cách cục',
    suggs: ['Luận giải Cung Mệnh', 'Cung Quan Lộc (sự nghiệp)', 'Cung Tài Bạch (tài chính)', 'Đại vận hiện tại'],
  },
  {
    id:    'xem-tuoi',
    name:  'Xem Tuổi Vợ Chồng',
    icon:  '💑',
    color: '#7B3F00',
    desc:  'Tương hợp tử vi — tình duyên, quan hệ, tài lộc',
    suggs: ['Hai người hợp hay kỵ?', 'Điểm mạnh mối quan hệ', 'Điểm cần lưu ý', 'Vận hôn nhân năm nay'],
  },
  {
    id:    'xem-lam-an',
    name:  'Xem Tuổi Làm Ăn',
    icon:  '🤝',
    color: '#1E6B3C',
    desc:  'Hợp tác kinh doanh — quan lộc, tài bạch, bổ trợ',
    suggs: ['Hợp làm ăn không?', 'Ai hợp vai trò gì?', 'Rủi ro cần tránh', 'Thời điểm tốt hợp tác'],
  },
  {
    id:    'tu-binh',
    name:  'Tử Bình Bát Tự',
    icon:  '☯️',
    color: '#6B21A8',
    desc:  'Bát tự, tứ trụ, ngũ hành, thần sát, đại vận',
    suggs: ['Phân tích nhật can', 'Dụng thần là gì?', 'Đại vận hiện tại', 'Ngũ hành thiếu/dư'],
  },
  {
    id:    'xem-tuoi-sinh-con',
    name:  'Xem Tuổi Sinh Con',
    icon:  '👶',
    color: '#1E6B3C',
    desc:  'Địa chi — năm nào thuận để sinh con theo tuổi bố mẹ',
    suggs: ['Năm tốt nhất là năm nào?', 'Năm này sinh có hợp không?', 'Giải thích lục hợp tam hợp', 'Năm kỵ cần tránh'],
  },
  {
    id:    'chon-ngay-tot',
    name:  'Chọn Ngày Tốt',
    icon:  '📅',
    color: '#9A7B3A',
    desc:  'Chọn ngày tốt — cưới hỏi, khai trương, ký HĐ...',
    suggs: ['Ngày nào tốt nhất?', 'Tháng này có ngày hợp không?', 'Tránh ngày giờ nào?', 'Giải thích kết quả'],
  },
  {
    id:    'dat-ten-con',
    name:  'Đặt Tên Con',
    icon:  '✏️',
    color: '#7B3F00',
    desc:  'Đặt tên theo ngũ hành bố mẹ và năm sinh con',
    suggs: ['Đặt thêm 5 tên khác', 'Giải thích ý nghĩa tên', 'Tên nào hợp ngũ hành nhất?', 'Tên có chữ đệm gì?'],
  },
];
