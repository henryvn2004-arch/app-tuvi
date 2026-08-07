// lib/engine/past-life-bond.ts
// ============================================================
// V5 (track Viral Loop) — "Duyên Nợ Tiền Kiếp": 2 lá số → 1 câu chuyện về mối
// ràng buộc giữa hai nhân vật ở kiếp trước.
//
// VÌ SAO LÀ MỐC K CAO NHẤT: mỗi lượt dùng cần HAI người, và kết quả nói về CẢ
// HAI — người nhập lá số gần như chắc chắn gửi cho người kia xem. Các tool
// khác chỉ nói về một người nên chia sẻ là tuỳ hứng.
//
// THUẦN DETERMINISTIC — không gọi LLM. Mọi thứ LLM cần (loại duyên, cơ sở
// trong lá số, hai nhân vật, nền văn minh chung) chốt hết ở đây; LLM chỉ viết
// văn, đúng kiến trúc của `past-life.ts`.
//
// ⚠️ ĐỊNH VỊ — đọc trước khi sửa: Tử Vi KHÔNG có cung nào nói về tiền kiếp
// (luân hồi là khái niệm Phật giáo). Tool này không bói tiền kiếp; nó lấy quan
// hệ THẬT giữa hai lá số theo cổ pháp (địa chi hợp/xung/hình, ngũ hành nạp âm
// sinh khắc, tương quan chính tinh tại Mệnh) rồi kể lại bằng ngôn ngữ triều
// đình phong kiến — đúng thứ ngôn ngữ mà cổ thư vốn dùng. Xem ghi chú đầy đủ
// ở đầu `past-life.ts`.
// ============================================================

import type { Laso } from './laso';
import {
  computePastLife,
  formatCharacterForLLM,
  pickEraForLaso,
  stableHash,
  ERAS,
  ERA_IDS,
  type Era,
  type PastLifeProfile,
} from './past-life';

type Rec = Record<string, unknown>;

// ── Quan hệ địa chi (cổ pháp) ───────────────────────────────────────────
// Cùng bộ hằng số mà `public/tuong-hop.js` dùng cho bảng Tương Hợp — cố ý
// KHÔNG chép luôn phần chấm điểm 0–10 của file đó: ở đây cần LOẠI quan hệ để
// kể chuyện, không cần con số hợp nhau mấy phần. Chép cả thang điểm sang đây
// là tạo bản thứ hai của cùng một công thức, rồi hai bản trôi khỏi nhau.
const LUC_HOP: Record<string, string> = {
  Tý: 'Sửu', Sửu: 'Tý', Dần: 'Hợi', Hợi: 'Dần', Mão: 'Tuất', Tuất: 'Mão',
  Thìn: 'Dậu', Dậu: 'Thìn', Tỵ: 'Thân', Thân: 'Tỵ', Ngọ: 'Mùi', Mùi: 'Ngọ',
};
const TU_XUNG: Record<string, string> = {
  Tý: 'Ngọ', Ngọ: 'Tý', Sửu: 'Mùi', Mùi: 'Sửu', Dần: 'Thân', Thân: 'Dần',
  Mão: 'Dậu', Dậu: 'Mão', Thìn: 'Tuất', Tuất: 'Thìn', Tỵ: 'Hợi', Hợi: 'Tỵ',
};
const TAM_HOP_G = [
  ['Thân', 'Tý', 'Thìn'], ['Hợi', 'Mão', 'Mùi'],
  ['Dần', 'Ngọ', 'Tuất'], ['Tỵ', 'Dậu', 'Sửu'],
];
const TAM_HINH: Record<string, string[]> = {
  Tý: ['Mão'], Mão: ['Tý'],
  Dần: ['Tỵ', 'Thân'], Tỵ: ['Dần', 'Thân'], Thân: ['Dần', 'Tỵ'],
  Sửu: ['Tuất', 'Mùi'], Tuất: ['Sửu', 'Mùi'], Mùi: ['Sửu', 'Tuất'],
  Thìn: ['Thìn'], Ngọ: ['Ngọ'], Dậu: ['Dậu'], Hợi: ['Hợi'],
};
const NH_SINH: Record<string, string> = { Mộc: 'Thủy', Hỏa: 'Mộc', Thổ: 'Hỏa', Kim: 'Thổ', Thủy: 'Kim' };
const NH_KHAC: Record<string, string> = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };

type ChiRel = 'luchop' | 'tamhop' | 'same' | 'tuxung' | 'tamhinh' | 'neutral';

function chiRelation(a: string, b: string): ChiRel {
  if (!a || !b) return 'neutral';
  // `same` PHẢI xét trước tam hợp: mỗi địa chi nằm trong đúng một nhóm tam
  // hợp, nên a===b luôn thoả điều kiện "cùng nhóm" và sẽ bị gán nhầm là Tam
  // Hợp. Cùng chi KHÔNG phải tam hợp (tam hợp là thế tay ba của ba chi KHÁC
  // nhau) — để nguyên thì phần "cơ sở trong lá số" nói sai cổ pháp với người
  // đọc, mà đó đúng là phần dùng để chứng minh mình không bịa.
  if (a === b) return 'same';
  if (LUC_HOP[a] === b) return 'luchop';
  const ga = TAM_HOP_G.find((g) => g.includes(a));
  const gb = TAM_HOP_G.find((g) => g.includes(b));
  if (ga && gb && ga === gb) return 'tamhop';
  if (TU_XUNG[a] === b) return 'tuxung';
  if ((TAM_HINH[a] || []).includes(b)) return 'tamhinh';
  return 'neutral';
}

/** Địa chi của một cung bất kỳ — dùng cho trục phụ (xem computePastLifeBond). */
function palaceDC(ls: Laso, cungName: string): string {
  const p = ((ls.palaces as Rec[]) || []).find((x) => String(x.cungName) === cungName) as Rec | undefined;
  return String(p?.diaChi || '');
}

type HanhRel = 'dong' | 'a-sinh-b' | 'b-sinh-a' | 'a-khac-b' | 'b-khac-a' | 'neutral';

function hanhRelation(a: string, b: string): HanhRel {
  if (!a || !b) return 'neutral';
  if (a === b) return 'dong';
  if (NH_SINH[b] === a) return 'a-sinh-b';
  if (NH_SINH[a] === b) return 'b-sinh-a';
  if (NH_KHAC[a] === b) return 'a-khac-b';
  if (NH_KHAC[b] === a) return 'b-khac-a';
  return 'neutral';
}

/** Cặp chính tinh mà cổ thư coi là đi liền nhau. */
const STAR_PAIRS = [
  ['Tử Vi', 'Thiên Phủ'], ['Thái Dương', 'Thái Âm'], ['Thiên Cơ', 'Thiên Lương'],
  ['Vũ Khúc', 'Tham Lang'], ['Liêm Trinh', 'Thiên Tướng'],
];
const SAT_TINH = ['Thất Sát', 'Phá Quân'];

type StarRel = 'cap-hoa-hop' | 'dong-khi' | 'hai-sao-cung' | 'neutral';

function menhStars(ls: Laso): string[] {
  const p = ((ls.palaces as Rec[]) || []).find((x) => String(x.cungName) === 'Mệnh') as Rec | undefined;
  return (((p?.majorStars as Rec[]) || []).map((s) => String(s.ten)) || []).filter(Boolean);
}

function starRelation(sa: string[], sb: string[]): StarRel {
  for (const [x, y] of STAR_PAIRS) {
    if ((sa.includes(x) && sb.includes(y)) || (sa.includes(y) && sb.includes(x))) return 'cap-hoa-hop';
  }
  if (sa.some((s) => sb.includes(s))) return 'dong-khi';
  if (sa.some((s) => SAT_TINH.includes(s)) && sb.some((s) => SAT_TINH.includes(s))) return 'hai-sao-cung';
  return 'neutral';
}

// ── Loại duyên nợ ───────────────────────────────────────────────────────
export type BondKind = 'phu-the' | 'kim-lan' | 'an-nhan' | 'thay-tro' | 'oan-gia' | 'doi-dau' | 'ban-huu';

export interface BondType {
  kind: BondKind;
  /** Nhãn ngắn — thứ người ta chụp màn hình gửi nhau. */
  label: string;
  /** Một câu mô tả bản chất mối duyên. Deterministic, KHÔNG do LLM viết. */
  gist: string;
}

const BOND_TYPES: Record<BondKind, BondType> = {
  'phu-the': { kind: 'phu-the', label: 'Duyên phu thê',
    gist: 'Hai người từng nên duyên chồng vợ, sống chung một mái, chia nhau cả phúc lẫn hoạ.' },
  'kim-lan': { kind: 'kim-lan', label: 'Nghĩa kim lan',
    gist: 'Hai người từng kết nghĩa sinh tử, coi nhau như ruột thịt dù không cùng huyết thống.' },
  'an-nhan': { kind: 'an-nhan', label: 'Ơn cứu mạng',
    gist: 'Một người từng ra tay cứu hoặc nâng đỡ người kia qua lúc ngặt nghèo nhất.' },
  'thay-tro': { kind: 'thay-tro', label: 'Nghĩa thầy trò',
    gist: 'Một người từng truyền nghề, truyền chữ hoặc dẫn đường cho người kia vào đời.' },
  'oan-gia': { kind: 'oan-gia', label: 'Nợ chưa trả',
    gist: 'Hai người từng làm tổn thương nhau, món nợ ấy khép lại mà chưa thật sự xong.' },
  'doi-dau': { kind: 'doi-dau', label: 'Hai bờ chiến tuyến',
    gist: 'Hai người từng đứng ở hai phía đối nghịch, không hẳn vì thù riêng mà vì thời cuộc.' },
  // Nhánh mặc định, dành cho cặp mà lá số không cho tín hiệu mạnh nào. Câu
  // này CỐ Ý vẫn có sức nặng: đây là kết quả của khá nhiều người, mà viết
  // kiểu "quen biết rồi mỗi người một ngả" thì đọc xong thấy hụt và không ai
  // gửi cho ai. Không hứa hơn những gì lá số nói, nhưng cũng đừng tự làm nhạt.
  'ban-huu': { kind: 'ban-huu', label: 'Duyên tao ngộ',
    gist: 'Hai người từng gặp nhau giữa đường đời, không ràng buộc gì lớn, nhưng lần gặp ấy để lại dấu.' },
};

export interface BondSignal {
  /** Nhãn cổ pháp — hiện được cho người dùng xem "vì sao ra kết quả này". */
  label: string;
  detail: string;
}

export interface PastLifeBond {
  type: BondType;
  signals: BondSignal[];
  /** Nền văn minh CHUNG của cả hai (xem pickSharedEra). */
  era: Era;
  a: PastLifeProfile;
  b: PastLifeProfile;
  /** Ai là bên "cho" trong các duyên lệch (ân nhân / thầy trò). null nếu ngang hàng. */
  giver: 'a' | 'b' | null;
}

/**
 * Nền văn minh CHUNG cho cả hai.
 *
 * `pickEraForLaso` bốc theo hash TỪNG lá số, nên hai người thường ra hai nền
 * khác nhau — mà một câu chuyện chung thì phải xảy ra ở một nơi. Ở đây hash
 * seed của CẢ HAI, và **sắp xếp seed trước khi ghép**: nếu không, cùng hai
 * người mà nhập A trước B ra một thế giới, nhập B trước A ra thế giới khác —
 * hai người bạn cùng bấm sẽ nhận hai kết quả mâu thuẫn nhau và mất tin ngay.
 */
export function pickSharedEra(lsA: Laso, gA: 'nam' | 'nu', lsB: Laso, gB: 'nam' | 'nu'): Era {
  const seedOf = (ls: Laso, g: string) => [ls.canChiNam, ls.menhDC, ls.thanDC, ls.napAm, ls.cuc, g].join('|');
  const pair = [seedOf(lsA, gA), seedOf(lsB, gB)].sort();
  // Hai lá số y hệt nhau thì nền chung = đúng nền của chính lá số đó, không
  // phải một nền thứ ba lạ hoắc.
  if (pair[0] === pair[1]) return pickEraForLaso(lsA, gA);
  return ERAS[ERA_IDS[stableHash('bond|' + pair.join('||')) % ERA_IDS.length]];
}

const TIER_RANK: Record<string, number> = { cao: 3, giua: 2, thap: 1 };

/**
 * Suy loại duyên nợ từ quan hệ THẬT giữa hai lá số.
 *
 * Thứ tự luật là có chủ đích — luật đứng trước là tín hiệu MẠNH và HIẾM hơn,
 * luật sau là tín hiệu yếu hơn. Đảo thứ tự thì Tam Hình (dấu hiệu tổn thương
 * rõ nhất trong cổ pháp) sẽ bị một cái tam hợp bình thường nuốt mất.
 *
 * KHÔNG bốc thăm: mọi nhánh đều gắn với một dấu hiệu tra được trong lá số, và
 * dấu hiệu đó được trả ra trong `signals` để hiện thẳng cho người đọc.
 */
export function computePastLifeBond(
  lsA: Laso,
  genderA: 'nam' | 'nu',
  lsB: Laso,
  genderB: 'nam' | 'nu',
): PastLifeBond {
  const era = pickSharedEra(lsA, genderA, lsB, genderB);
  const a = computePastLife(lsA, genderA, era);
  const b = computePastLife(lsB, genderB, era);

  const chi = chiRelation(String(lsA.menhDC || ''), String(lsB.menhDC || ''));
  const hanh = hanhRelation(String(lsA.napAmHanh || ''), String(lsB.napAmHanh || ''));
  const star = starRelation(menhStars(lsA), menhStars(lsB));
  const tierGap = (TIER_RANK[a.occupation.tier] || 0) - (TIER_RANK[b.occupation.tier] || 0);

  const signals: BondSignal[] = [];
  const CHI_TEXT: Record<ChiRel, string> = {
    luchop: 'Mệnh hai người Lục Hợp — cổ pháp coi là duyên gắn bó bậc nhất',
    tamhop: 'Mệnh hai người cùng Tam Hợp — một phe, một hướng',
    same: 'Mệnh hai người cùng địa chi — cùng khí chất',
    tuxung: 'Mệnh hai người Tứ Xung — ở hai đầu đối nhau',
    tamhinh: 'Mệnh hai người phạm Tam Hình — dấu hiệu tổn thương lẫn nhau',
    neutral: 'Mệnh hai người không hợp không xung',
  };
  signals.push({ label: 'Địa chi cung Mệnh', detail: CHI_TEXT[chi] });

  // 🔴 Hai dòng `sinh` TRƯỚC ĐÂY BỊ HOÁN VỊ CHO NHAU: `hanhRelation` trả
  // 'a-sinh-b' khi `NH_SINH[b] === a`, tức A sinh B — mà câu chữ lại ghi
  // "${lsB} sinh ${lsA}". Khối này là chỗ DUY NHẤT chứng minh với người đọc
  // rằng kết quả không bịa, nên nói ngược ngũ hành ở đây là hỏng đúng chỗ đắt
  // nhất. (`khac` thì vốn đã đúng — chỉ cặp `sinh` bị chép nhầm.)
  //
  // Và gọi thẳng TÊN NHÂN VẬT thay cho "người trước / người sau": thứ tự hai lá
  // số đã được chuẩn hoá ở `lib/portraits/bond-key.ts` nên "người trước" không
  // còn là người nhập trước — không ai đọc ra được nó chỉ ai.
  const HANH_TEXT: Record<HanhRel, string> = {
    dong: 'Nạp âm cùng một hành — đồng khí tương cầu',
    'a-sinh-b': `Nạp âm ${lsA.napAmHanh} sinh ${lsB.napAmHanh} — ${a.characterName} nuôi dưỡng ${b.characterName}`,
    'b-sinh-a': `Nạp âm ${lsB.napAmHanh} sinh ${lsA.napAmHanh} — ${b.characterName} nuôi dưỡng ${a.characterName}`,
    'a-khac-b': `Nạp âm ${lsA.napAmHanh} khắc ${lsB.napAmHanh} — ${a.characterName} kìm ${b.characterName}`,
    'b-khac-a': `Nạp âm ${lsB.napAmHanh} khắc ${lsA.napAmHanh} — ${b.characterName} kìm ${a.characterName}`,
    neutral: 'Nạp âm hai người không sinh không khắc',
  };
  signals.push({ label: 'Ngũ hành nạp âm', detail: HANH_TEXT[hanh] });

  const STAR_TEXT: Record<StarRel, string> = {
    'cap-hoa-hop': 'Chính tinh tại Mệnh hai người là một cặp cổ thư coi là đi liền nhau',
    'dong-khi': 'Hai người có chung chính tinh tại Mệnh — cùng một chất người',
    'hai-sao-cung': 'Cả hai đều mang sao cứng (Thất Sát / Phá Quân) tại Mệnh — dễ va nhau',
    neutral: 'Chính tinh tại Mệnh hai người không có tương quan đặc biệt',
  };
  signals.push({ label: 'Chính tinh cung Mệnh', detail: STAR_TEXT[star] });

  if (Math.abs(tierGap) >= 2) {
    signals.push({
      label: 'Chức phận',
      detail: `Chênh nhau rõ về vị thế (${a.occupation.title} — ${b.occupation.title})`,
    });
  }

  const hop = chi === 'luchop' || chi === 'tamhop' || chi === 'same';
  const ptChi = chiRelation(palaceDC(lsA, 'Phu Thê'), palaceDC(lsB, 'Phu Thê'));
  const ptHop = ptChi === 'luchop' || ptChi === 'tamhop' || ptChi === 'same';
  if (!hop && ptHop) {
    signals.push({ label: 'Địa chi cung Phu Thê', detail: 'Phu Thê hai người ' + (ptChi === 'same' ? 'cùng địa chi' : ptChi === 'luchop' ? 'Lục Hợp' : 'cùng Tam Hợp') + ' — dấu hiệu ràng buộc đôi lứa' });
  }
  const khac = hanh === 'a-khac-b' || hanh === 'b-khac-a';
  const sinh = hanh === 'a-sinh-b' || hanh === 'b-sinh-a';
  let kind: BondKind;
  let giver: 'a' | 'b' | null = null;

  // TRỤC CHÍNH LÀ ĐỊA CHI, không phải ngũ hành. Bản đầu cho ngũ hành nạp âm
  // tự quyết (sinh → ân nhân, khắc → đối đầu) và đo trên 950 cặp thì 36% ra
  // "hai bờ chiến tuyến", 30% ra "ơn cứu mạng" — tức 2/3 số cặp bị phán bởi
  // MỘT tín hiệu yếu, gần như ngẫu nhiên giữa hai người bất kỳ. Nói với một
  // phần ba số cặp rằng kiếp trước họ là kẻ thù, chỉ vì nạp âm khắc nhau, là
  // kết luận nặng dựa trên chứng cứ mỏng.
  // Nay: quan hệ địa chi cung Mệnh (hợp/xung/hình — tín hiệu mạnh và rõ trong
  // cổ pháp) quyết định trước; ngũ hành và chính tinh chỉ tinh chỉnh trong
  // nhánh đã chọn. Kết quả nặng nề phải có bằng chứng mạnh mới được đặt.
  if (chi === 'tamhinh') {
    kind = 'oan-gia';
  } else if (chi === 'tuxung') {
    kind = 'doi-dau';
  } else if (Math.abs(tierGap) >= 2 && hop) {
    kind = 'thay-tro';
    giver = tierGap > 0 ? 'a' : 'b';
  } else if (hop && (sinh || hanh === 'dong') && genderA !== genderB) {
    // Duyên phu thê CHỈ đặt khi hai người khác giới. Cùng giới mà gán "chồng
    // vợ" là tự bịa thêm một tầng ý nghĩa mà lá số không nói, và với phần
    // đông người dùng Việt thì đó là kết quả sai chứ không phải táo bạo.
    kind = 'phu-the';
  } else if (hop) {
    // MỌI cặp còn lại có Mệnh hợp nhau đều vào đây. Bản trước bắt thêm điều
    // kiện chính tinh, nên cặp hợp mà chính tinh trung tính bị rơi tuột xuống
    // nhánh mặc định — đo được 68% số cặp ra "bằng hữu". Hợp tự nó ĐÃ là tín
    // hiệu dương rõ trong cổ pháp; bắt nó chứng minh thêm lần nữa là vứt bỏ
    // đúng thứ mình vừa đọc được từ lá số.
    kind = 'kim-lan';
  } else if (ptHop) {
    // TRỤC PHỤ — chỉ dùng khi cung Mệnh hai người không hợp không xung (đo
    // được là hơn nửa số cặp). Cổ pháp không chỉ đọc duyên giữa hai người ở
    // cung Mệnh: cung PHU THÊ mới là cung nói về ràng buộc đôi lứa. Mệnh
    // trung tính mà Phu Thê hai bên hợp nhau thì vẫn là một tín hiệu thật,
    // bỏ qua nó rồi trả "tao ngộ" cho quá nửa người dùng mới là làm hỏng.
    kind = genderA !== genderB ? 'phu-the' : 'kim-lan';
  } else if (sinh && star !== 'neutral') {
    // Vẫn nhánh Mệnh trung tính: cần ngũ hành sinh CỘNG tương quan chính tinh
    // mới đủ nói "người này từng nâng người kia". Chỉ mỗi nạp âm sinh thì hai
    // người lạ bất kỳ cũng dính, mất hết ý nghĩa.
    kind = 'an-nhan';
    // Bên SINH là bên CHO (ân nhân). Dòng này cũng từng đảo — 'a-sinh-b' nghĩa
    // là A nuôi B, nên ân nhân là A. Đặt sai chiều thì truyện và bức tranh đều
    // dựng ngược vai: người được cứu thành người ra tay.
    giver = hanh === 'a-sinh-b' ? 'a' : 'b';
  } else if (khac && star === 'hai-sao-cung') {
    kind = 'doi-dau';
  } else {
    kind = 'ban-huu';
  }

  return { type: BOND_TYPES[kind], signals, era, a, b, giver };
}

/** Khối mô tả mối duyên cho prompt viết truyện. Hai nhân vật dùng lại nguyên
 *  `formatCharacterForLLM` của tool Chân Dung Tiền Kiếp — cùng một định dạng
 *  thì cùng một chất lượng đầu ra, và sửa một chỗ là cả hai tool cùng đổi. */
export function formatBondForLLM(bond: PastLifeBond, nameA: string, nameB: string): string {
  const giverName = bond.giver === 'a' ? bond.a.characterName : bond.giver === 'b' ? bond.b.characterName : '';
  return [
    `MỐI DUYÊN: ${bond.type.label}`,
    bond.type.gist,
    giverName ? `Bên cho / bên trên trong mối duyên này: ${giverName}` : '',
    '',
    'CƠ SỞ TRONG HAI LÁ SỐ (dùng để hiểu bản chất mối duyên, KHÔNG nêu thuật ngữ này trong truyện):',
    ...bond.signals.map((s) => `  • ${s.label}: ${s.detail}`),
    '',
    `NỀN VĂN MINH CHUNG: ${bond.era.label}${bond.era.ageLabel ? ' — ' + bond.era.ageLabel : ''}`,
    '',
    `════ NHÂN VẬT THỨ NHẤT (từ lá số của ${nameA || 'người thứ nhất'}) ════`,
    formatCharacterForLLM(bond.a),
    '',
    `════ NHÂN VẬT THỨ HAI (từ lá số của ${nameB || 'người thứ hai'}) ════`,
    formatCharacterForLLM(bond.b),
  ]
    .filter((x) => x !== '')
    .join('\n');
}
