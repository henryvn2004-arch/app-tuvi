// lib/push/daily-message.ts
// NGUỒN DUY NHẤT của nội dung tin nhắc "Vận hôm nay".
//
// Vì sao phải có file này (đo trên prod trước khi viết):
//   • Edge function `send-daily-push` đang lấy chữ từ một bảng CHÉP TAY 24 dòng
//     tra theo CAN CHI NĂM SINH — tức mỗi người nhận ĐÚNG MỘT câu, y hệt nhau,
//     mỗi sáng, mãi mãi. Người đăng ký từ 12/06 đã nhận cùng một câu ~56 lần.
//     Nó cũng không nói gì về NGÀY HÔM NAY, nên không có lý do nào để mở ra —
//     đúng thứ mục R1 sinh ra để chữa.
//   • Cron FCM (`/api/cron/daily-push`) thì dựng chữ từ engine, nhưng dựng ngay
//     trong route. Hai kênh, hai bản chữ → sớm muộn nói khác nhau về cùng một
//     ngày, và không ai phát hiện vì hiếm khi có người nhận cả hai.
//
// Nay cả hai kênh gọi vào đây. Vẫn **0 lượt LLM, 0đ**: toàn bộ là tra bảng của
// engine ngày-tốt, cùng nguồn với thẻ "Vận hôm nay" trên trang chủ /app — nên
// tin nhắn và thẻ không bao giờ nói khác nhau về cùng một ngày.
import { computeVanNgay, todayVN } from '@/lib/engine/van-ngay';

export interface DailyPushMessage {
  /** Tiêu đề thông báo. */
  title: string;
  /** Thân thông báo — phần chung cho mọi người. */
  body: string;
  /** Đích khi chạm vào thông báo (đã mang sẵn UTM để đo được lượt mở). */
  url: string;
  /**
   * Địa chi bị XUNG hôm nay. Kênh gửi so chuỗi này với can chi năm sinh của
   * từng người đăng ký để thêm một dòng cảnh báo riêng — phép so chuỗi thuần,
   * không cần engine ở phía gửi.
   */
  xungChi: string;
  /** Can chi NGÀY — dùng cho log/thống kê, không phải để hiển thị một mình. */
  canChi: string;
}

/**
 * Dựng tin nhắc cho một ngày. Không truyền tham số = hôm nay theo giờ VN.
 */
export function buildDailyPushMessage(day?: { d: number; m: number; y: number }): DailyPushMessage {
  const t = day || (() => { const x = todayVN(); return { d: x.d, m: x.m, y: x.y }; })();
  const v = computeVanNgay(t.d, t.m, t.y);

  const title =
    v.danhGia.tinhChat === 'tốt'
      ? 'Hôm nay là ngày tốt ☾'
      : v.danhGia.tinhChat === 'xấu'
        ? 'Hôm nay nên thận trọng ☾'
        : 'Vận hôm nay ☾';

  const parts: string[] = [`Ngày ${v.ngay.canChi} · trực ${v.truc.ten}`];
  if (v.ngayKy.length) {
    parts.push(`trùng ${v.ngayKy.join(' + ')}`);
  } else {
    // Bỏ "an táng" khỏi gợi ý của TIN PUSH: trên thẻ nó nằm trong bảng chọn
    // ngày nên đọc bình thường, còn bắn thẳng vào màn hình khoá mỗi sáng thì
    // thành một lời chúc rất khó đỡ. Thẻ vẫn giữ đủ.
    // Lọc lại `diem >= 7` cho RIÊNG tin push — và nay QUAN TRỌNG HƠN TRƯỚC.
    // `computeVanNgay` đã hạ ngưỡng xuống 5 để ô "Nên làm" trên thẻ bớt trống
    // (trên ngày lành: 31% → 2% số ngày, đo trên 2026). Thẻ là thứ người ta
    // CHỦ ĐỘNG mở, đọc kèm ĐIỂM, và có ô "Cần tránh" ngay bên cạnh để đối
    // chiếu. Còn đây là MỘT dòng bắn thẳng vào màn hình khoá lúc 7h sáng,
    // không có điểm, không có ngữ cảnh — "hợp cưới hỏi" ở đó mà thật ra là
    // 5/10 thì thành một lời khuyên sai. Giữ bar 7.
    const goi = v.nen.filter((x) => x.diem >= 7 && !/an táng/i.test(x.ten)).slice(0, 2);
    if (goi.length) parts.push(`hợp ${goi.map((x) => x.ten.toLowerCase()).join(', ')}`);
  }
  if (v.xung.chi) parts.push(`xung tuổi ${v.xung.chi}`);

  return {
    title,
    body: `${parts.join(' · ')}. Chạm để xem vận riêng của bạn.`,
    // `from=push` là thứ trang đọc để bắn `push_open`; UTM để bảng Nguồn/Chiến
    // dịch cũng thấy được đường này. Hai thứ khác nhau, cố ý giữ cả hai: UTM chỉ
    // ghi first-touch nên người đã ghé site từ trước sẽ KHÔNG hiện ở bảng nguồn,
    // mà đó lại đúng là nhóm nhận thông báo.
    url: '/app?from=push&utm_source=push&utm_medium=daily',
    xungChi: v.xung.chi || '',
    canChi: v.ngay.canChi,
  };
}

/**
 * Dòng cảnh báo riêng cho người có năm sinh rơi vào địa chi bị xung hôm nay.
 * Tách hàm để kênh gửi (edge function Deno, không import được TS lib này) có
 * một định nghĩa để chép theo, và để test kiểm được đúng câu chữ.
 */
export function xungLine(xungChi: string): string {
  return `⚠ Hôm nay xung tuổi ${xungChi} — nên lùi việc lớn. `;
}
