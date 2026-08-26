// lib/backlinks/seed-list.ts
// ============================================================
// DANH SÁCH TĨNH — cơ hội KHÔNG cần tìm kiếm gì cả, và đây mới là nguồn tự
// động THẬT SỰ không phụ thuộc key trả phí nào. Đây là câu trả lời cho việc
// trước đây prospecting.ts CHỈ có Brave Search làm nguồn — thiếu key thì
// 100% phải gõ tay, đúng ngược lại yêu cầu "80-90% automation" ban đầu.
//
// So với kết quả search (chỉ là "gợi ý mờ" — xem prospecting.ts): danh sách
// này do người/AI DUYỆT MỘT LẦN, đáng tin hơn hẳn một snippet tìm kiếm, và
// 0đ mãi mãi vì không gọi API nào.
//
// Mỗi mục ĐÃ được kiểm tồn tại thật (WebSearch, 2026-08-19, xem PR #565) —
// không có URL nào bịa. Đây là KHỞI ĐIỂM, không phải danh sách đủ: thêm một
// mục là thêm đúng một dòng vào mảng dưới, không cần sửa logic gì.
//
// ⚠️ Cũng như mọi nguồn khác trong module: CHỈ liệt kê, KHÔNG tự vào nộp/
// đăng gì. Mọi mục vào status='new', chờ người duyệt rồi tự tay dán/gửi.
// ============================================================

import { sbInsert } from './db';
import type { Prospect, ProspectKind } from './content';
import { getConfigValue } from '@/lib/config/appConfig';

interface SeedEntry {
  kind: ProspectKind;
  name: string;
  url: string;
  topic?: string;
  notes?: string;
}

const SEED_LIST: SeedEntry[] = [
  // — Directory công cụ AI, quốc tế, có đường nộp miễn phí —
  { kind: 'directory', name: "There's An AI For That", url: 'https://theresanaiforthat.com/', topic: 'AI tool directory quốc tế, nộp miễn phí' },
  { kind: 'directory', name: 'AI Tools Directory', url: 'https://aitoolsdirectory.com/submit-tool', topic: 'AI tool directory quốc tế, nộp miễn phí' },
  { kind: 'directory', name: 'FreeAIO', url: 'https://freeaio.com/', topic: 'AI tool directory quốc tế, nộp miễn phí' },
  { kind: 'directory', name: 'Free AI Directories', url: 'https://freeaidirectories.com/', topic: 'AI tool directory quốc tế, tổng hợp 450+ công cụ' },
  { kind: 'directory', name: 'PoweredByAI', url: 'https://poweredbyai.app/', topic: 'AI tool directory quốc tế, tài khoản free để nộp' },
  {
    kind: 'directory', name: 'Toolify', url: 'https://toolify.ai/submit', topic: 'AI tool directory quốc tế',
    notes: 'Có gói listing cơ bản miễn phí; có gói trả phí cho vị trí nổi bật — kiểm kỹ form trước khi nộp, chỉ dùng gói free.',
  },
  { kind: 'directory', name: 'Product Hunt', url: 'https://www.producthunt.com/', topic: 'nền tảng ra mắt sản phẩm, đăng miễn phí' },
  // — Directory doanh nghiệp Việt Nam —
  { kind: 'directory', name: 'Trang Vàng Việt Nam', url: 'https://trangvangvietnam.com/dang-ky', topic: 'danh bạ doanh nghiệp Việt Nam, đăng ký miễn phí' },
  // — Trang tài nguyên/roundup có link ra ngoài (nguồn cho quét link chết,
  //   xem broken-links.ts) — CỐ Ý không kèm `notes`: chưa biết chỗ nào cần
  //   chèn/thay link tới khi cron quét thật sự tìm ra, chỉ lúc đó mới soạn
  //   được nội dung (xem contentReady() trong content.ts). —
  { kind: 'resource_page', name: 'FPT Shop — Website tarot online', url: 'https://fptshop.com.vn/tin-tuc/danh-gia/tarot-online-176203', topic: 'roundup tarot/tử vi tiếng Việt' },
  { kind: 'resource_page', name: 'Viettel Store — Top website bói bài Tarot', url: 'https://viettelstore.vn/tin-tuc/top-website-xem-boi-bai-tarot-online-mien-phi', topic: 'roundup tarot/tử vi tiếng Việt' },
];

const DEFAULT_WEEKLY_ADD = 4;

export interface SeedListResult {
  total: number;
  inserted: number;
  skipped: number;
}

/** Thêm tối đa `limitPerRun` mục CHƯA CÓ (dựa unique url) vào sổ cơ hội. */
export async function runSeedListProspecting(limitPerRun?: number): Promise<SeedListResult> {
  const cap = Math.max(0, limitPerRun ?? (await getConfigValue<number>('backlinks.seed_weekly_add', DEFAULT_WEEKLY_ADD)));
  const result: SeedListResult = { total: SEED_LIST.length, inserted: 0, skipped: 0 };
  if (cap === 0) return result;

  for (const entry of SEED_LIST) {
    if (result.inserted >= cap) break;
    // POST thuần (không upsert) — trùng `url` (unique) → 409 → sbInsert trả
    // null → tính là skipped. Cùng lý do db.ts đã ghi: không ghi đè cơ hội
    // admin có thể đã sửa tay.
    const row = await sbInsert<Prospect>('backlink_prospects', {
      kind: entry.kind,
      name: entry.name,
      url: entry.url,
      topic: entry.topic || null,
      notes: entry.notes || null,
      status: 'new',
      source: 'seed_list',
    });
    if (row) result.inserted++;
    else result.skipped++;
  }
  return result;
}

/** Các trang `resource_page` trong danh sách tĩnh — mục tiêu cho broken-links.ts quét outbound link. */
export function seedResourcePages(): SeedEntry[] {
  return SEED_LIST.filter((e) => e.kind === 'resource_page');
}
