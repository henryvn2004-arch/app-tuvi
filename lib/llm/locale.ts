// lib/llm/locale.ts — NGÔN NGỮ đầu ra của LLM theo trang khách đang đứng (i18n W8).
//
// Hợp đồng: khách ở /ja /ko /zh-tw /zh-cn /en nhận chữ SINH THẲNG bằng ngôn ngữ đó (không dịch lại);
// khách `vi` giữ nguyên TỪNG BYTE prompt — `langBlock('vi')` trả '' và mọi khoá cache của `vi` không đổi.
//
// Ba luật đứng sau file này (CLAUDE.md "Prompt LLM"):
//  · Câu chỉ định ngôn ngữ đi vào USER message, KHÔNG vào system — `cachedSystemFor`/system của rail
//    giữ nguyên byte để prompt cache còn trúng. Mỗi khối ở đây chỉ để NỐI vào cuối tin user.
//  · Khối mới phải THAY, không cộng dồn: luật xưng hô/khẩu ngữ/Hán-Việt trong system viết cho tiếng
//    Việt, nên khối này nói rõ "với ngôn ngữ này thay bằng mẫu bên dưới" thay vì dạy thêm một bộ luật.
//  · Giọng dạy bằng VÍ DỤ ngắn (một mẫu mỗi ngôn ngữ), không phải bảng luật.

import { isLocale, LOCALE_HEADER, type Locale } from '@/lib/i18n/locales';

/** Alias để route khỏi phải import thêm từ `lib/i18n/locales`. */
export type LangLocale = Locale;
import { termsInText, type GlossaryLocale } from '@/lib/i18n/glossary';

// ── Xác định ngôn ngữ của request ─────────────────────────────────────────────────────────
//
// Proxy chỉ gắn `x-tvmb-locale` cho request TRANG (`/ja/…`). Còn `fetch('/api/…')` do JS trang gọi
// luôn đi tới URL KHÔNG tiền tố ⇒ không có header. Tín hiệu duy nhất đi kèm mọi fetch cùng nguồn mà
// KHÔNG phải sửa client là `Referer` — chính URL trang, tức đúng thứ proxy đã bóc tiền tố.
//   1. Header `x-tvmb-locale` — bên gọi nói rõ (route nằm sau proxy rewrite, app native, test).
//   2. `Referer` cùng nguồn có tiền tố `/<locale>/…` — trang web gọi API.
//   3. Còn lại → `vi`.
// ⚠️ KHÔNG dùng cookie `tvmb_locale`: nó là "gợi ý nhớ lựa chọn", không phải trạng thái trang — khách
// ở trang Việt mà cookie còn `ja` sẽ nhận câu trả lời tiếng Nhật dưới giao diện tiếng Việt.
// Mất Referer (chính sách trình duyệt/extension) thì rơi về `vi`: sai ngôn ngữ chứ không sai nội dung,
// và khoá cache theo CÙNG kết quả này nên không bao giờ trộn bản của hai ngôn ngữ.
export function requestLocale(req: { headers: Headers }): Locale {
  const h = req.headers.get(LOCALE_HEADER);
  if (isLocale(h)) return h;
  const ref = req.headers.get('referer');
  if (ref) {
    try {
      const m = /^\/(en|ja|ko|zh-tw|zh-cn)(?=\/|$)/.exec(new URL(ref).pathname);
      if (m && isLocale(m[1])) return m[1];
    } catch {
      /* Referer hỏng → coi như không có */
    }
  }
  return 'vi';
}

/**
 * Hậu tố khoá cache. `vi` → '' (khoá cũ GIỮ NGUYÊN từng byte ⇒ không mồ côi cache hay quyền sở hữu của
 * khách Việt); ngôn ngữ khác thêm hậu tố riêng ⇒ bản Nhật không bao giờ trả cho khách Việt và ngược lại.
 */
export function localeKeySuffix(locale: Locale): string {
  return locale === 'vi' ? '' : `|loc:${locale}`;
}

// ── Bản sắc từng ngôn ngữ ─────────────────────────────────────────────────────────────────
type NonVi = GlossaryLocale;
interface Voice {
  name: string; // tên ngôn ngữ, viết bằng tiếng Việt để khối nằm đúng ngôn ngữ của system
  thay: string; // "Thầy"
  nhom: string; // "nhóm" (15 thầy) — KHÔNG "hội đồng"
  brand: string; // tên thương hiệu
  tuvi: string;
  battu: string;
  hoiThay: string;
  mau: string; // MỘT mẫu giọng: mở chắc → hành vi cụ thể → rủi ro kèm cách phòng → việc làm được
}

// Bảng thương hiệu/bộ môn theo W7: ja 明宝/紫微斗数/四柱推命/先生に聞く · ko 명보/자미두수/사주/선생님께 묻기 ·
// zh-tw 明寶/紫微斗數/八字/問老師 · en Minh Bao/Zi Wei Dou Shu/BaZi/Ask the Master.
// zh-cn là bản giản thể tất định của zh-tw (OpenCC, WORKPLAN) — không có cột riêng ở bảng W7.
const VOICE: Record<NonVi, Voice> = {
  ja: {
    name: 'tiếng Nhật (日本語, 新字体)',
    thay: '先生',
    nhom: '明宝の先生方',
    brand: '明宝',
    tuvi: '紫微斗数',
    battu: '四柱推命',
    hoiThay: '先生に聞く',
    mau: '「お金を稼ぐのは難しくありません。難しいのは残すほうです。いちばん減りやすいのは、知人に貸すお金。月給を超える額なら、必ず借用書を。今週、口座をひとつ別に作って、給料日に2割だけ移して、そのまま忘れてしまいましょう。」',
  },
  ko: {
    name: 'tiếng Hàn (한국어)',
    thay: '선생님',
    nhom: '명보 선생님들',
    brand: '명보',
    tuvi: '자미두수',
    battu: '사주',
    hoiThay: '선생님께 묻기',
    mau: '"돈을 버는 건 어렵지 않아요. 지키는 게 어렵죠. 가장 새기 쉬운 돈은 지인에게 빌려주는 돈이에요. 월급보다 큰 금액이면 꼭 차용증을 쓰세요. 이번 주에 통장을 하나 따로 만들고, 월급날 20%만 옮겨 둔 뒤 잊어버리세요."',
  },
  'zh-tw': {
    name: 'tiếng Trung phồn thể (繁體中文, cách dùng Đài Loan)',
    thay: '老師',
    nhom: '明寶老師團',
    brand: '明寶',
    tuvi: '紫微斗數',
    battu: '八字',
    hoiThay: '問老師',
    mau: '「賺錢不難，難的是留住。最容易流失的不是零碎花費，而是借給熟人的錢——超過一個月薪水的，一定要有借據。這週先另開一個帳戶，發薪日轉進兩成，然後就忘了它。」',
  },
  'zh-cn': {
    name: 'tiếng Trung giản thể (简体中文, cách dùng Đại lục)',
    thay: '老师',
    nhom: '明宝老师团',
    brand: '明宝',
    tuvi: '紫微斗数',
    battu: '八字',
    hoiThay: '问老师',
    mau: '“赚钱不难，难的是留住。最容易流失的不是零碎花销，而是借给熟人的钱——超过一个月工资的，一定要有借条。这周先另开一个账户，发薪日转进两成，然后就忘了它。”',
  },
  en: {
    name: 'tiếng Anh (English)',
    thay: 'the Master',
    nhom: 'the Minh Bao masters',
    brand: 'Minh Bao',
    tuvi: 'Zi Wei Dou Shu',
    battu: 'BaZi',
    hoiThay: 'Ask the Master',
    mau: '"Making money isn\'t the hard part — keeping it is. The easiest money to lose isn\'t small spending but loans to people you know; anything above a month\'s salary needs a written note. This week, open a separate account, move 20% on payday, and forget about it."',
  },
};

/** Tối đa bao nhiêu thuật ngữ nhét vào MỘT tin user — chặn lá số nhiều sao làm phình input mỗi lượt. */
const MAX_TERMS = 90;

/**
 * Thuật ngữ của ĐÚNG những cung/sao xuất hiện trong văn bản lá số (tiếng Việt, do engine sinh) — không
 * nhồi cả bảng. `termsInText` trả theo thứ tự bảng (cung → chính tinh → phụ tinh…), nên khi vượt trần
 * thì phần bị cắt là phụ tinh cuối bảng, không phải cung/chính tinh.
 */
export function glossaryFor(locale: Locale, texts: string[]): string {
  if (locale === 'vi' || !texts.some(Boolean)) return '';
  const loc = locale as NonVi;
  return termsInText(texts.filter(Boolean))
    .slice(0, MAX_TERMS)
    .map((t) => `${t.vi}=${t[loc]}`)
    .join(' · ');
}

interface LangOpts {
  /** Tool trả JSON có schema: giữ nguyên khoá/enum, chỉ viết giá trị chữ bằng ngôn ngữ đích. */
  json?: boolean;
  /** Rail chat: dòng `SUGGEST: a | b | c` cuối câu trả lời giữ nguyên thẻ, chỉ ba gợi ý đổi ngôn ngữ. */
  rail?: boolean;
}

/**
 * Khối chỉ định ngôn ngữ — NỐI vào CUỐI tin user (không bao giờ vào system). `vi` → '' nên tin user của
 * khách Việt không đổi một byte.
 *
 * @param texts văn bản tiếng Việt chứa lá số đang luận (để chọn đúng phần thuật ngữ)
 */
export function langBlock(locale: Locale, texts: string[] = [], opts: LangOpts = {}): string {
  if (locale === 'vi') return '';
  const v = VOICE[locale as NonVi];
  const gl = glossaryFor(locale, texts);
  return [
    `[NGÔN NGỮ TRẢ LỜI: ${v.name}. Viết THẲNG bằng ngôn ngữ này cho khách bản địa — không soạn tiếng Việt rồi dịch, không để chữ Việt hay âm Hán-Việt lọt vào câu trả lời (số liệu, ngày tháng, tên riêng của người xem giữ nguyên).`,
    `Luật xưng hô (anh/chị/em), khẩu ngữ, thành ngữ và Hán-Việt ở trên viết cho tiếng Việt — với ngôn ngữ này THAY bằng mẫu giọng dưới đây; bố cục, độ dài (tính theo lượng ý của bản Việt, không đếm chữ), nghiệp vụ và mọi con số giữ nguyên.`,
    `Bạn là "${v.thay}" của "${v.nhom}"; không bao giờ tự nhận là AI, mô hình hay chatbot. Tên riêng của từng thầy giữ nguyên như trong ngữ cảnh.`,
    `Tên gọi: ${v.brand} · ${v.tuvi} · ${v.battu} · ${v.hoiThay}.`,
    ...(opts.json
      ? ['Đầu ra là JSON: giữ NGUYÊN mọi khoá và giá trị enum (vd tone), chỉ viết các giá trị chữ bằng ngôn ngữ này.']
      : []),
    ...(opts.rail
      ? ['Dòng cuối `SUGGEST: a | b | c` giữ NGUYÊN chữ `SUGGEST:` và dấu `|`; chỉ ba gợi ý viết bằng ngôn ngữ này (là lời người dùng sẽ tự gõ).']
      : []),
    `Mẫu giọng (học nhịp, không chép chữ): ${v.mau}`,
    ...(gl ? [`Thuật ngữ dùng đúng như bảng, không tự dịch khác: ${gl}`] : []),
    ']',
  ].join('\n');
}

/** Nối khối ngôn ngữ vào cuối một chuỗi user. `vi` → trả NGUYÊN chuỗi cũ (cùng tham chiếu nội dung). */
export function withLang(userText: string, locale: Locale, texts: string[] = [], opts: LangOpts = {}): string {
  const b = langBlock(locale, texts, opts);
  return b ? `${userText}\n\n${b}` : userText;
}
