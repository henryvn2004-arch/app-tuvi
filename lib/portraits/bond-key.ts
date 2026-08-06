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
  const k1 = lasoKey(b1);
  const k2 = lasoKey(b2);
  // k1 === k2 (hai lá số y hệt) → giữ nguyên thứ tự, không có gì để sắp.
  const swap = k1 > k2;
  const [birthA, birthB] = swap ? [b2, b1] : [b1, b2];
  const [nameA, nameB] = swap ? [n2, n1] : [n1, n2];
  // Khoá của A (đã sắp) + khoá của B, nên hai chiều nhập ra cùng một chuỗi.
  const key = lasoKey(birthA, 'bond|' + (swap ? k1 : k2));
  return { birthA, birthB, nameA, nameB, selfIsA: !swap, key };
}
