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
];
