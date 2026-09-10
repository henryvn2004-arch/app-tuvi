/**
 * fbcard-topic.js — Tử Vi Minh Bảo
 * Nguồn DUY NHẤT chọn ảnh minh hoạ + bố cục cho thẻ `.fb-card` (poster caption
 * kiểu Facebook) theo CHỦ ĐỀ model tự gắn. Dùng chung cho mọi trang có
 * `renderMarkdown`/`renderMd` — KHÔNG chép logic này sang từng trang.
 *
 * Mã chủ đề đi kèm nhãn tính chất model đã tự gắn từ trước (khối "NHÃN TÍNH
 * CHẤT MỖI CÂU HOOK", `lib/agent/prompts.ts` + `lib/agent/van-han-thang.ts`):
 *   [TỐT|MỞ LỐI]              — dạng CŨ, không có chủ đề → không có ảnh
 *   [TỐT|MỞ LỐI|hon-nhan]     — dạng MỚI, thêm mã chủ đề ở cuối
 * Regex bóc THẺ HOOK ở từng trang KHÔNG đổi (vẫn `(?:\|[^\]]{0,40})?` không
 * bắt nhóm) — `extractTopic()` chạy RIÊNG trên dòng gốc để lấy mã chủ đề,
 * không đụng tới chỉ số nhóm bắt mà `check-hook-tag.mjs` đang canh.
 *
 * Ảnh gen 1 lần, lưu tĩnh ở public/img/fbcard-topics/<chu-de>-<sac-thai>.webp
 * (scripts/gen-fbcard-topic-images.mjs) — 0đ/lượt xem, không gọi lại.
 */
window.FbCardTopic = (function () {
  'use strict';

  // 10 nhóm chủ đề đã gen ảnh (gom từ tool dùng chung .fb-card, Henry đã
  // duyệt bảng gom nhóm trước PR #806/#807). Thêm nhóm mới thì PHẢI gen đủ 3
  // ảnh sắc thái trước, không thêm slug vào đây trước khi có ảnh.
  var TOPICS = [
    'ban-than',
    'hon-nhan',
    'su-nghiep',
    'tai-chinh',
    'con-cai',
    'gia-dinh',
    'nha-cua',
    'suc-khoe',
    'van-han',
    'ten-goi',
  ];

  // Class CSS màu (shell.css) → hậu tố tên file ảnh.
  var CLS_TO_SAC = { 'fb-tot': 'tot', 'fb-canhbao': 'canh-bao', 'fb-trungtinh': 'trung-tinh' };

  // 3 bố cục đã duyệt (bản mẫu gửi Henry 2026-09-10) — CSS ở shell.css.
  var LAYOUTS = ['fbc-badge', 'fbc-side', 'fbc-bg'];

  /**
   * Bóc mã chủ đề từ dòng hook GỐC (trước khi regex chính xén mất). Chỉ nhận
   * đúng 1 trong 10 slug đã biết — mã lạ/thiếu (nội dung cache CŨ, model lệch
   * định dạng) trả về '' để rơi về thẻ KHÔNG ảnh, không đoán bừa.
   */
  function extractTopic(rawLine) {
    var m = /\|([a-z-]+)\]/.exec(String(rawLine || ''));
    return m && TOPICS.indexOf(m[1]) !== -1 ? m[1] : '';
  }

  // Băm ký tự đơn giản để CÙNG một câu hook luôn ra CÙNG một bố cục mỗi lần
  // dựng lại trang — random thật (Math.random) sẽ đổi vị trí ảnh mỗi lần tải
  // lại, gây cảm giác layout nhảy lung tung khi đọc lại cùng một bài.
  function _hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /**
   * Dựng HTML thẻ `.fb-card` — CÓ ảnh nếu bóc được chủ đề hợp lệ, không thì
   * trả về thẻ trơn y hệt trước đây (không đổi hành vi cũ).
   * @param {string} cls      fb-tot | fb-canhbao | fb-trungtinh
   * @param {string} topic    kết quả extractTopic(), có thể rỗng
   * @param {string} hookHtml câu hook ĐÃ escape/bọc ngoặc kép, sẵn sàng render
   */
  function cardHtml(cls, topic, hookHtml) {
    var sac = CLS_TO_SAC[cls] || 'trung-tinh';
    if (!topic) return '<div class="fb-card ' + cls + '">' + hookHtml + '</div>';
    var src = '/img/fbcard-topics/' + topic + '-' + sac + '.webp';
    var layout = LAYOUTS[_hash(topic + sac + hookHtml) % LAYOUTS.length];
    if (layout === 'fbc-badge') {
      return (
        '<div class="fbc-badge-wrap"><img class="fbc-img" src="' +
        src +
        '" alt="" width="60" height="60" loading="lazy">' +
        '<div class="fb-card ' +
        cls +
        '">' +
        hookHtml +
        '</div></div>'
      );
    }
    if (layout === 'fbc-side') {
      return (
        '<div class="fbc-side-row"><img class="fbc-img" src="' +
        src +
        '" alt="" width="72" height="72" loading="lazy">' +
        '<div class="fb-card ' +
        cls +
        '">' +
        hookHtml +
        '</div></div>'
      );
    }
    return (
      '<div class="fb-card ' +
      cls +
      ' fbc-bg-card"><img class="fbc-bg-img" src="' +
      src +
      '" alt="" loading="lazy"><span class="fbc-bg-text">' +
      hookHtml +
      '</span></div>'
    );
  }

  return { extractTopic: extractTopic, cardHtml: cardHtml, TOPICS: TOPICS };
})();
