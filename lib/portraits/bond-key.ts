// lib/portraits/bond-key.ts
// ============================================================
// Chuẩn hoá THỨ TỰ hai lá số cho tool "Duyên Nợ Tiền Kiếp".
//
// 🔑 VÌ SAO CẦN: hai người bạn cùng chạy tool — một người nhập mình trước bạn
// sau, người kia nhập ngược lại. Nếu thứ tự nhập quyết định kết quả thì họ nhận
// hai câu chuyện khác nhau về CÙNG một mối duyên; chụp màn hình gửi nhau là lộ
// ngay, và mất tin vào cả tool.
//
// Engine đã lo phần nền văn minh (`pickSharedEra` sắp seed trước khi hash),
// nhưng LỜI VĂN, vai trái/phải trong tranh và KHOÁ CACHE thì vẫn đi theo thứ tự
// truyền vào. Nên sắp ở đây, một lần, trước mọi thứ khác.
//
// Đặt ở `lib/` chứ không nằm trong route: đây là logic thuần, cần test được
// bằng cách gọi CHÍNH hàm này — nhét trong route thì muốn test phải nạp cả
// `next/server`.
// ============================================================

import type { BirthParams } from '@/lib/contract/v1';
import { lasoKey } from '@/lib/portraits/cache';

export interface BondPair {
  birthA: BirthParams;
  birthB: BirthParams;
  nameA: string;
  nameB: string;
  /** true nếu người truyền vào ĐẦU TIÊN vẫn là nhân vật A sau khi sắp lại. */
  selfIsA: boolean;
  /** Khoá cache của CẶP — cùng cặp luôn ra cùng khoá, bất kể thứ tự nhập. */
  key: string;
}

export function normalizeBondPair(
  b1: BirthParams,
  n1: string,
  b2: BirthParams,
  n2: string,
): BondPair {
  const g = normalizeBondGroup([
    { birth: b1, name: n1 },
    { birth: b2, name: n2 },
  ]);
  return {
    birthA: g.members[0].birth,
    birthB: g.members[1].birth,
    nameA: g.members[0].name,
    nameB: g.members[1].name,
    selfIsA: g.selfIndex === 0,
    key: g.key,
  };
}

// ── NHÓM (2–5 lá số) ────────────────────────────────────────────────────

export interface GroupMemberInput {
  birth: BirthParams;
  name: string;
}

export interface BondGroup {
  /** Các lá số ĐÃ SẮP — thứ tự này là thứ tự nhân vật ở mọi bề mặt. */
  members: GroupMemberInput[];
  /** Vị trí của người nhập ĐẦU TIÊN sau khi sắp (người đang ngồi trước máy). */
  selfIndex: number;
  /** Khoá cache của NHÓM — cùng nhóm luôn ra cùng khoá, bất kể thứ tự nhập. */
  key: string;
}

/**
 * Chuẩn hoá thứ tự một nhóm 2–5 lá số.
 *
 * 🔑 TƯƠNG THÍCH NGƯỢC LÀ RÀNG BUỘC CỨNG: với đúng hai lá số, khoá sinh ra ở
 * đây phải TRÙNG KHÍT khoá của bản cũ (`lasoKey(birthA, 'bond|' + khoá của B)`).
 * Lệch một ký tự là toàn bộ `portrait_cache` đang có thành mồ côi — người đã
 * trả tiền cho một cặp sẽ bị tính tiền lại, và mỗi lượt đó còn đốt thêm một
 * lượt gọi model. Có test A/B canh đúng điều này.
 *
 * Nhóm ≥3 nối thêm khoá của những người còn lại vào cùng chuỗi salt, nên nhóm
 * nhập theo thứ tự nào cũng ra một khoá.
 */
export function normalizeBondGroup(input: GroupMemberInput[]): BondGroup {
  const keyed = input.map((m, idx) => ({ ...m, k: lasoKey(m.birth), idx }));
  // Sắp theo khoá lá số; hai lá số y hệt thì giữ nguyên thứ tự nhập (sort ổn
  // định trong JS), không có gì để phân xử.
  const sorted = keyed.slice().sort((x, y) => (x.k < y.k ? -1 : x.k > y.k ? 1 : 0));
  const selfIndex = sorted.findIndex((m) => m.idx === 0);
  const key = lasoKey(sorted[0].birth, 'bond|' + sorted.slice(1).map((m) => m.k).join('|'));
  return {
    members: sorted.map((m) => ({ birth: m.birth, name: m.name })),
    selfIndex: selfIndex < 0 ? 0 : selfIndex,
    key,
  };
}
