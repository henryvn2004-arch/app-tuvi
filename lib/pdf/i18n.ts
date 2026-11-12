// lib/pdf/i18n.ts
// ============================================================
// Chữ KHUNG của PDF (bìa, mục lục, nhãn phần) theo ngôn ngữ người đọc — i18n W18.
//
// Chỉ khung; VĂN luận nằm trong `phans[].text` là thứ đã sinh sẵn bằng ngôn ngữ của nó (W8 viết thẳng
// bằng ngôn ngữ đích; `laso_public.luan_giai` hiện CHỈ tiếng Việt — xem CLAUDE.md "Ngôn ngữ đầu ra LLM").
// Tên cung/vận lấy từ glossary (`lib/i18n/glossary`) để khớp đúng chữ trên lá số; phần còn lại viết tay.
// zh-cn = OpenCC(zh-tw) từng ký tự — `tests/pdf-i18n.test.mjs` canh.
// `vi` ⇒ MỌI hàm trả đúng chữ cũ (PDF tiếng Việt không đổi một byte).
// ============================================================
import type { Locale } from '@/lib/i18n/locales';
import { term, type GlossaryLocale } from '@/lib/i18n/glossary';
import { CHI_EN } from '@/lib/i18n/glossary/tuvi-terms';
import type { LuanGiaiToolId } from './luan-giai';

export interface PdfFrame {
  brand: string;
  dob: string;
  gender: string;
  published: string;
  toc: string;
  anonymous: string;
  report: string;
  male: string;
  female: string;
}

export const FRAME: Record<Locale, PdfFrame> = {
  vi: { brand: 'TỬ VI MINH BẢO', dob: 'Ngày sinh', gender: 'Giới tính', published: 'Xuất bản', toc: 'Mục lục', anonymous: 'Ẩn danh', report: 'Báo cáo', male: 'Nam', female: 'Nữ' },
  en: { brand: 'MINH BAO · ZI WEI DOU SHU', dob: 'Date of birth', gender: 'Gender', published: 'Issued', toc: 'Contents', anonymous: 'Anonymous', report: 'Report', male: 'Male', female: 'Female' },
  ja: { brand: '明宝 紫微斗数', dob: '生年月日', gender: '性別', published: '発行日', toc: '目次', anonymous: '匿名', report: 'レポート', male: '男性', female: '女性' },
  ko: { brand: '명보 자미두수', dob: '생년월일', gender: '성별', published: '발행일', toc: '목차', anonymous: '익명', report: '보고서', male: '남성', female: '여성' },
  'zh-tw': { brand: '明寶 紫微斗數', dob: '出生日期', gender: '性別', published: '出版日期', toc: '目錄', anonymous: '匿名', report: '報告', male: '男', female: '女' },
  'zh-cn': { brand: '明宝 紫微斗数', dob: '出生日期', gender: '性别', published: '出版日期', toc: '目录', anonymous: '匿名', report: '报告', male: '男', female: '女' },
};

export interface ToolMeta {
  title: string;
  /** Câu trích chính (in đậm). */
  quoteVi: string;
  /** Lời giảng (nhỏ). Rỗng ⇒ không vẽ dòng. */
  quoteViet: string;
  quoteSrc: string;
}

// Bản vi = `TOOL_META` cũ trong luan-giai.tsx (chép từ BOOK_QUOTES của shell.js). Bản CJK in NGUYÊN VĂN
// chữ Hán cổ rồi giảng bằng tiếng bản địa; bản en chỉ in bản dịch.
export const TOOL_META_I18N: Record<Locale, Record<LuanGiaiToolId, ToolMeta>> = {
  vi: {
    laso: {
      title: 'Luận Giải Lá Số',
      quoteVi: 'Tận kỳ tâm giả, tri kỳ tính dã; tri kỳ tính, tắc tri thiên hĩ.',
      quoteViet: 'Người thấu tận lòng mình thì biết được tính mình; biết tính mình thì biết được lẽ trời.',
      quoteSrc: 'Mạnh Tử · Tận Tâm thượng',
    },
    'chu-trinh-cuoc-doi': {
      title: 'Chu Trình Cuộc Đời',
      quoteVi: 'Tam thập nhi lập, tứ thập nhi bất hoặc, ngũ thập nhi tri thiên mệnh.',
      quoteViet: 'Ba mươi tuổi lập thân, bốn mươi tuổi hết nghi hoặc, năm mươi tuổi biết mệnh trời.',
      quoteSrc: 'Khổng Tử · Luận Ngữ, Vi Chính',
    },
  },
  en: {
    laso: {
      title: 'Chart Reading',
      quoteVi: 'He who exerts his mind to the utmost knows his nature; knowing his nature, he knows Heaven.',
      quoteViet: '',
      quoteSrc: 'Mencius · Jin Xin I',
    },
    'chu-trinh-cuoc-doi': {
      title: 'Life Cycles',
      quoteVi: 'At thirty I stood firm; at forty I had no doubts; at fifty I knew the will of Heaven.',
      quoteViet: '',
      quoteSrc: 'Confucius · Analects, Wei Zheng',
    },
  },
  ja: {
    laso: {
      title: '命盤鑑定',
      quoteVi: '其の心を尽くす者は、其の性を知るなり。其の性を知れば、則ち天を知る。',
      quoteViet: '自らの心を尽くす人は自らの本性を知り、本性を知る人は天を知る。',
      quoteSrc: '『孟子』尽心上',
    },
    'chu-trinh-cuoc-doi': {
      title: '人生のサイクル',
      quoteVi: '三十にして立つ。四十にして惑わず。五十にして天命を知る。',
      quoteViet: '三十で自立し、四十で迷いがなくなり、五十で天から与えられた使命を知る。',
      quoteSrc: '『論語』為政篇',
    },
  },
  ko: {
    laso: {
      title: '명반 풀이',
      quoteVi: '盡其心者, 知其性也; 知其性, 則知天矣.',
      quoteViet: '마음을 다하는 사람은 자기 본성을 알고, 본성을 아는 사람은 하늘을 안다.',
      quoteSrc: '맹자 · 진심 상',
    },
    'chu-trinh-cuoc-doi': {
      title: '인생 사이클',
      quoteVi: '三十而立, 四十而不惑, 五十而知天命.',
      quoteViet: '서른에 뜻을 세우고, 마흔에 흔들리지 않으며, 쉰에 하늘의 뜻을 알았다.',
      quoteSrc: '논어 · 위정',
    },
  },
  'zh-tw': {
    laso: {
      title: '命盤解讀',
      quoteVi: '盡其心者，知其性也；知其性，則知天矣。',
      quoteViet: '能窮盡自己本心的人，便能認識自己的本性；認識了本性，也就懂得天道。',
      quoteSrc: '孟子・盡心上',
    },
    'chu-trinh-cuoc-doi': {
      title: '人生週期',
      quoteVi: '三十而立，四十而不惑，五十而知天命。',
      quoteViet: '三十歲能自立，四十歲不再迷惑，五十歲懂得天命。',
      quoteSrc: '論語・為政',
    },
  },
  'zh-cn': {
    laso: {
      title: '命盘解读',
      quoteVi: '尽其心者，知其性也；知其性，则知天矣。',
      quoteViet: '能穷尽自己本心的人，便能认识自己的本性；认识了本性，也就懂得天道。',
      quoteSrc: '孟子・尽心上',
    },
    'chu-trinh-cuoc-doi': {
      title: '人生周期',
      quoteVi: '三十而立，四十而不惑，五十而知天命。',
      quoteViet: '三十岁能自立，四十岁不再迷惑，五十岁懂得天命。',
      quoteSrc: '论语・为政',
    },
  },
};

// ── Nhãn 24 phần (`PHAN_LABELS` của phan-labels.ts) ─────────────────────────────────────────
/** Nhãn phần là TÊN CUNG/VẬN ⇒ lấy glossary (khớp chữ trên lá số). */
const PHAN_GLOSSARY: Record<string, [kind: string, vi: string]> = {
  'Cung Mệnh': ['cung', 'Mệnh'],
  'Phụ Mẫu': ['cung', 'Phụ Mẫu'],
  'Phúc Đức': ['cung', 'Phúc Đức'],
  'Điền Trạch': ['cung', 'Điền Trạch'],
  'Quan Lộc': ['cung', 'Quan Lộc'],
  'Nô Bộc': ['cung', 'Nô Bộc'],
  'Thiên Di': ['cung', 'Thiên Di'],
  'Tật Ách': ['cung', 'Tật Ách'],
  'Tài Bạch': ['cung', 'Tài Bạch'],
  'Tử Tức': ['cung', 'Tử Tức'],
  'Phu Thê': ['cung', 'Phu Thê'],
  'Huynh Đệ': ['cung', 'Huynh Đệ'],
  'Đại Vận': ['khai', 'Đại Vận'],
  'Tiểu Hạn': ['khai', 'Tiểu Hạn'],
  'Lưu Niên': ['khai', 'Lưu Niên'],
};
/** Nhãn chủ đề (không phải thuật ngữ cổ pháp) — viết tay. Thứ tự cột: en · ja · ko · zh-tw · zh-cn. */
const PHAN_TOPIC: Record<string, [string, string, string, string, string]> = {
  'Tổng Quan': ['Overview', '総論', '총론', '總論', '总论'],
  'Tâm Tính': ['Character', '性格', '성격', '性格', '性格'],
  'Học Vấn': ['Learning', '学業', '학업', '學業', '学业'],
  'Cách Cục': ['Chart Patterns', '格局', '격국', '格局', '格局'],
  'Sự Nghiệp': ['Career', '仕事', '직업', '事業', '事业'],
  'Tình Cảm': ['Love', '恋愛', '애정', '感情', '感情'],
  'Sức Khoẻ': ['Health', '健康', '건강', '健康', '健康'],
  'Tài Lộc': ['Wealth', '金運', '재물운', '財運', '财运'],
  'Vận Mệnh': ['Destiny', '運命', '운명', '命運', '命运'],
};
const COL: Record<GlossaryLocale, number> = { en: 0, ja: 1, ko: 2, 'zh-tw': 3, 'zh-cn': 4 };

/** Nhãn phần theo ngôn ngữ. Chữ không có trong bảng (tiêu đề client đã dịch sẵn, tiêu đề lạ) ⇒ giữ nguyên. */
export function phanTitle(locale: Locale, title: string): string {
  if (locale === 'vi') return title;
  const g = PHAN_GLOSSARY[title];
  if (g) return term(locale, g[0], g[1]);
  const t = PHAN_TOPIC[title];
  return t ? t[COL[locale]] : title;
}

/** "Nam"/"Nữ" (cột `gioi_tinh`, cũng là chữ client gửi) → chữ của ngôn ngữ đọc; giá trị lạ giữ nguyên. */
export function genderLabel(locale: Locale, v: string): string {
  const s = v.trim().toLowerCase();
  if (s === 'nam' || s === 'male') return FRAME[locale].male;
  if (s === 'nữ' || s === 'nu' || s === 'female') return FRAME[locale].female;
  return v;
}

const CHI_HAN: Record<string, [han: string, ko: string]> = {
  Tý: ['子', '자'], Sửu: ['丑', '축'], Dần: ['寅', '인'], Mão: ['卯', '묘'], Thìn: ['辰', '진'], Tỵ: ['巳', '사'],
  Tị: ['巳', '사'], Ngọ: ['午', '오'], Mùi: ['未', '미'], Thân: ['申', '신'], Dậu: ['酉', '유'], Tuất: ['戌', '술'],
  Hợi: ['亥', '해'],
};

/** Giờ sinh theo địa chi ("Tý") → cách gọi bản địa. Chi lạ ⇒ giữ nguyên. */
export function gioChiLabel(locale: Locale, chi: string): string {
  if (locale === 'vi') return `giờ ${chi}`;
  const h = CHI_HAN[chi];
  if (!h) return chi;
  if (locale === 'en') return `${(CHI_EN[chi] || chi).split(' ')[0]} hour`;
  if (locale === 'ja') return `${h[0]}の刻`;
  if (locale === 'ko') return `${h[1]}시`;
  return `${h[0]}${locale === 'zh-cn' ? '时' : '時'}`;
}

/** "d/m/y, giờ Tý" — chuỗi ngày sinh của PDF (resend-pdf · paid-reports). `vi` giữ đúng định dạng cũ. */
export function birthLine(
  locale: Locale,
  d: number | string,
  m: number | string,
  y: number | string,
  gioChi?: string | null,
): string {
  return `${d}/${m}/${y}${gioChi ? ', ' + gioChiLabel(locale, gioChi) : ''}`;
}

const INTL: Record<Locale, string> = {
  vi: 'vi-VN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', 'zh-tw': 'zh-TW', 'zh-cn': 'zh-CN',
};

/** Ngày xuất bản. `vi` = dd/mm/yyyy như cũ. */
export function issuedDate(locale: Locale, d = new Date()): string {
  if (locale === 'vi') {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  return d.toLocaleDateString(INTL[locale], { year: 'numeric', month: 'long', day: 'numeric' });
}
