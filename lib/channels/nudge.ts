// lib/channels/nudge.ts
// ============================================================
// TIN NHẮC CHỦ ĐỘNG cho người đã chat ở kênh (Henry 2026-09-29). Chạy bởi
// cron /api/cron/chat-nudge mỗi giờ.
//
// 🔴 Khung gửi do NỀN TẢNG quyết, không phải do mình: Zalo OA chỉ nhận tin tư
// vấn MIỄN PHÍ trong 48h sau tin cuối của khách, Messenger/WhatsApp 24h (xem
// notify.ts). Ngoài khung là nền tảng từ chối (hoặc phải trả phí ZNS/tin truyền
// thông — Henry chưa bật). Nên mỗi "đợt vắng" của khách chỉ có MỘT tin nhắc, gửi
// khi đã vắng ~20h mà vẫn còn trong khung.
//
// Luật chống spam (đều ở đây, một chỗ):
//   • chỉ gửi 08:00–21:00 giờ VN;
//   • một tin mỗi đợt vắng (đã nhắc sau lần khách nhắn cuối thì thôi);
//   • giữa hai tin nhắc ≥ `nghiNgay` ngày;
//   • khách lờ 2 tin liên tiếp (không trả lời trong 48h) → ngừng hẳn
//     (`nudge_miss`, router xoá về 0 khi khách trả lời trong 48h);
//   • khách nhắn "tắt nhắc" → `nudge_off`.
//
// Nội dung: 1–2 câu, MÓC vào đúng chuyện dở dang (chủ đề câu hỏi cuối) hoặc một
// dịp âm lịch có thật (mai mùng 1 / rằm), kèm nút trả lời nhanh. Không "lâu rồi
// không thấy bạn", không quảng cáo trần.
// ============================================================

import type { BirthParams, ChatMessage } from '@/lib/contract/v1';
import { cacChuDe, nghiaChuDe } from '@/lib/agent/luan-chu-de';
import { solarToLunar } from '../../tuvi-engine/dist/lunar/convert.js';
import { sendMenu } from './format';
import type { ChannelIO, ChatButton } from './core';
import { chatLogEvent, chatNudgeCandidates, chatPatchMeta, type NudgeRow } from './store';
import { zaloIO, ZALO_PLATFORM } from './zalo';
import { messengerIO } from './messenger';
import { whatsappIO } from './whatsapp';
import { telegramIO } from './telegram';

const H = 3600_000;
/** Trần số tin mỗi lượt cron — giữ trong `maxDuration`, phần dư lượt sau gửi. */
const TRAN_MOI_LUOT = 60;

interface KenhNhac {
  platform: string;
  io: ChannelIO;
  /** Khách nhắn cuối cách đây trong [tu, den] giờ — `tu` phải nằm trong khung miễn phí. */
  tu: number;
  den: number;
  /** Tối thiểu bấy nhiêu ngày giữa hai tin nhắc. */
  nghiNgay: number;
}

const KENH: KenhNhac[] = [
  // Khung 48h: cửa sổ 20→40h để luôn có vài giờ ban ngày dù khách nhắn lúc khuya.
  { platform: ZALO_PLATFORM, io: zaloIO, tu: 40, den: 20, nghiNgay: 3 },
  // Khung 24h: 18→23h, chừa 1h cho cron chạy trễ.
  { platform: 'messenger', io: messengerIO, tu: 23, den: 18, nghiNgay: 3 },
  { platform: 'whatsapp', io: whatsappIO, tu: 23, den: 18, nghiNgay: 3 },
  // Không giới hạn khung — tự giới hạn 1 tin/tuần.
  { platform: 'telegram', io: telegramIO, tu: 72, den: 20, nghiNgay: 7 },
];

/** Giờ hiện tại theo giờ VN (0–23). */
export function gioVN(now: Date): number {
  return (now.getUTCHours() + 7) % 24;
}

/** Ngày ÂM của NGÀY MAI (giờ VN) — mốc "mai mùng 1 / rằm". */
function ngayAmMai(now: Date): { day: number; month: number } | null {
  const t = new Date(now.getTime() + 7 * H + 24 * H); // sang "giờ VN" rồi +1 ngày
  try {
    const l = solarToLunar(t.getUTCDate(), t.getUTCMonth() + 1, t.getUTCFullYear());
    return l ? { day: l.day, month: l.month } : null;
  } catch {
    return null; // ngoài tầm bảng âm lịch — bỏ nhánh dịp, vẫn nhắc theo chủ đề
  }
}

const xungHo = (b: BirthParams | null) => (b?.gender === 'nam' ? 'anh' : b?.gender === 'nu' ? 'chị' : 'bạn');

function cauHoiCuoi(messages: ChatMessage[] | null): string | null {
  const m = [...(messages || [])].reverse().find((x) => x.role === 'user' && typeof x.content === 'string');
  return m ? String(m.content) : null;
}

export interface TinNhac {
  loai: 'dip' | 'chu-de' | 'la-so' | 'chua-la-so';
  text: string;
  buttons: ChatButton[];
}

/** Soạn tin nhắc cho một phiên. null = không có gì đáng nhắc (chưa hỏi câu nào). */
export function soanTinNhac(row: Pick<NudgeRow, 'birth' | 'messages' | 'nudged_at'>, now: Date): TinNhac | null {
  const cau = cauHoiCuoi(row.messages);
  if (!cau) return null;
  const x = xungHo(row.birth);
  const deSau: ChatButton = { title: 'Để sau', reply: 'Để sau' };
  // Tin nhắc ĐẦU TIÊN của phiên mới kèm lối tắt — các tin sau khách đã biết.
  const duoi = row.nudged_at ? '' : '\n\n(Không muốn nhận tin nhắc thì nhắn "Tắt nhắc".)';

  if (!row.birth) {
    return {
      loai: 'chua-la-so',
      text: `Hôm trước mình chưa kịp lập lá số. Cho thầy ngày, giờ sinh là thầy xem ngay cho ${x} nhé.${duoi}`,
      buttons: [deSau],
    };
  }
  const am = ngayAmMai(now);
  if (am?.day === 1) {
    return {
      loai: 'dip',
      text: `Mai là mùng 1 tháng ${am.month} âm — sang tháng mới rồi. Thầy xem vận tháng này cho ${x} nhé?${duoi}`,
      buttons: [{ title: 'Vận tháng này của tôi', reply: 'Vận tháng này của tôi thế nào?' }, deSau],
    };
  }
  if (am?.day === 15) {
    return {
      loai: 'dip',
      text: `Mai là rằm tháng ${am.month} âm. Nửa cuối tháng này ${x} có một điểm nên để ý sớm — muốn nghe không?${duoi}`,
      buttons: [{ title: 'Nửa cuối tháng này', reply: 'Nửa cuối tháng âm này tôi cần để ý gì?' }, deSau],
    };
  }
  let chuDe: string | null = null;
  try {
    chuDe = nghiaChuDe(cacChuDe(cau)[0] ?? null);
  } catch (e) {
    console.error('[nudge] cacChuDe lỗi', e);
  }
  if (chuDe) {
    const cd = chuDe.startsWith('chuyện') ? chuDe : `chuyện ${chuDe}`;
    return {
      loai: 'chu-de',
      text: `Hôm trước mình đang nói dở ${cd}. Thầy xem thêm được một mốc ${x} nên để ý — muốn nghe tiếp không?${duoi}`,
      buttons: [{ title: `Nói tiếp ${cd}`, reply: `Nói tiếp ${cd} của tôi, còn mốc nào cần để ý?` }, deSau],
    };
  }
  return {
    loai: 'la-so',
    text: `Thầy vừa xem lại lá số của ${x} — tháng này có một điểm đáng để ý sớm. Muốn nghe không?${duoi}`,
    buttons: [{ title: 'Tháng này cần để ý gì', reply: 'Tháng này tôi cần để ý gì?' }, deSau],
  };
}

/** Phiên này được nhắc lúc `now` không (ngoài phần lọc đã làm ở truy vấn). */
export function duocNhac(row: Pick<NudgeRow, 'updated_at' | 'nudged_at'>, nghiNgay: number, now: Date): boolean {
  if (!row.nudged_at) return true;
  const nudged = Date.parse(row.nudged_at);
  if (nudged >= Date.parse(row.updated_at)) return false; // đợt vắng này đã nhắc rồi
  return now.getTime() - nudged >= nghiNgay * 24 * H;
}

export interface KetQuaNhac {
  skipped?: string;
  sent: number;
  failed: number;
  byPlatform: Record<string, number>;
}

export async function chayNhac(now = new Date()): Promise<KetQuaNhac> {
  const kq: KetQuaNhac = { sent: 0, failed: 0, byPlatform: {} };
  const gio = gioVN(now);
  if (gio < 8 || gio >= 21) return { ...kq, skipped: `ngoài giờ gửi (${gio}h VN)` };
  for (const k of KENH) {
    const rows = await chatNudgeCandidates(
      k.platform,
      new Date(now.getTime() - k.tu * H).toISOString(),
      new Date(now.getTime() - k.den * H).toISOString(),
    );
    if (!rows) continue; // lỗi truy vấn (vd chưa chạy migration) ⇒ không gửi gì
    for (const row of rows) {
      if (kq.sent + kq.failed >= TRAN_MOI_LUOT) return kq;
      if (!duocNhac(row, k.nghiNgay, now)) continue;
      const tin = soanTinNhac(row, now);
      if (!tin) continue;
      // Ghi dấu TRƯỚC khi gửi: cron chạy chồng hoặc gửi lỗi giữa chừng cũng
      // không thành hai tin — thà mất một tin nhắc còn hơn nhắn trùng.
      const ok = await chatPatchMeta(k.platform, row.chat_id, {
        nudged_at: now.toISOString(),
        nudge_miss: (row.nudge_miss || 0) + 1,
      });
      if (!ok) continue;
      try {
        await sendMenu(k.io, row.chat_id, tin.text, tin.buttons);
        kq.sent++;
        kq.byPlatform[k.platform] = (kq.byPlatform[k.platform] || 0) + 1;
        void chatLogEvent(k.platform, row.chat_id, 'chat_nudge', { action: 'send', loai: tin.loai });
      } catch (e) {
        kq.failed++;
        console.error('[nudge] gửi lỗi', k.platform, row.chat_id, e);
      }
    }
  }
  return kq;
}
