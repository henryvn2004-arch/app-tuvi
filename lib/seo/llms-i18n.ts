// lib/seo/llms-i18n.ts — llms.txt / llms-full.txt THEO NGÔN NGỮ (W10).
// Route: app/llms/[locale] (`/llms-<locale>.txt`) và app/llms-full/[locale] (`/llms-full-<locale>.txt`),
// rewrite ở next.config.mjs. Vì sao không `/<locale>/llms.txt`: proxy.ts bỏ qua mọi đường dẫn có đuôi
// khác `.html` (matcher), nên tiền tố ngôn ngữ không bóc được — cùng lý do sitemap là `/sitemap-i18n-<locale>.xml`.
//
// Chỉ liệt kê cái ĐÃ DỊCH: trang tĩnh theo `i18n/availability.json`, hồ sơ theo `nc_ho_so_i18n` (status ok)
// và ĐÃ MỞ INDEX ở bản gốc. Ngôn ngữ chưa có gì ⇒ route 404 (không phát một llms.txt rỗng).
// Phần giới thiệu viết tay ở đây (không đi qua i18n/*.json — vùng của W7); chữ hiển thị theo luật
// repo: nói engine/cổ pháp, không khoe "AI".
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Locale } from '@/lib/i18n/locales';
import { localePrefix } from '@/lib/i18n/locales';
import { urlFor } from '@/lib/i18n/links.mjs';
import { BASE_URL } from '@/lib/seo/sitemap-source';
import { danhMuc } from '@/lib/nghiem-chung/store';
import { dbDanhMucDich } from '@/lib/nghiem-chung/i18n/db';
import type { NcLocale } from '@/lib/nghiem-chung/i18n/prose';

export type LlmsLocale = Exclude<Locale, 'vi'>;

interface Copy {
  summary: string;
  disciplinesTitle: string;
  disciplines: [string, string][]; // [tên, mô tả dài (chỉ llms-full)]
  pagesTitle: string;
  profilesTitle: string;
  profilesIntro: string;
  methodTitle: string;
  method: string;
  sitemapTitle: string;
  homePage: string;
  appPage: string;
}

const COPY: Record<LlmsLocale, Copy> = {
  en: {
    summary:
      'Online Zi Wei Dou Shu (Purple Star Astrology) and BaZi (Four Pillars of Destiny) charts, calculated by a deterministic engine that follows the classical rules, plus a verification library that checks readings against documented life events of real public figures.',
    disciplinesTitle: 'Disciplines',
    disciplines: [
      ['Zi Wei Dou Shu', 'A Chinese system that places stars across twelve palaces from the lunar birth date and hour; the chart is computed exactly by rule, never estimated.'],
      ['BaZi (Four Pillars)', 'Reads the heavenly stems and earthly branches of the birth year, month, day and hour to describe the balance of the five elements.'],
      ['Qi Men Dun Jia', 'A classical timing system that builds a nine-palace chart for a given moment.'],
      ['Da Liu Ren', 'A classical divination method built from the day and hour branches.'],
      ['Chinese almanac (Huang Li)', 'Daily auspicious and inauspicious activities derived from the lunisolar calendar.'],
    ],
    pagesTitle: 'Pages available in English',
    profilesTitle: 'Verification profiles',
    profilesIntro: 'Each profile compares chart readings with documented events in the life of a real public figure.',
    methodTitle: 'Method and reliability',
    method:
      'Chart positions come from a rule-based engine; the wording only describes what the engine produced. Readings are checked against recorded life events of public figures with documented birth data.',
    sitemapTitle: 'Sitemap',
    homePage: 'Home',
    appPage: 'Ask the Masters (chart reading chat)',
  },
  ja: {
    summary:
      '古典の規則どおりに厳密に計算する紫微斗数・四柱推命（八字）のオンライン命盤と、実在する著名人の人生の出来事に照らして読み解きを検証するライブラリ。',
    disciplinesTitle: '対応する術数',
    disciplines: [
      ['紫微斗数', '旧暦の生年月日と時刻から十二宮に星を配置する中国の命術。命盤は規則に従って正確に算出され、推測は含まれません。'],
      ['四柱推命（八字）', '生年・月・日・時の干支から五行のバランスを読み解きます。'],
      ['奇門遁甲', '特定の時刻に九宮の盤を立てる古典的な時間占術。'],
      ['大六壬', '日と時の地支から立てる古典的な占術。'],
      ['暦（黄暦）', '太陰太陽暦に基づく日ごとの吉凶。'],
    ],
    pagesTitle: '日本語で利用できるページ',
    profilesTitle: '検証プロフィール',
    profilesIntro: '各プロフィールは、実在する著名人の人生の出来事と命盤の読み解きを照らし合わせています。',
    methodTitle: '方法と信頼性',
    method:
      '命盤の配置は規則ベースのエンジンが算出し、文章はその結果を説明するだけです。出生データが記録された著名人の人生の出来事と照合して検証しています。',
    sitemapTitle: 'サイトマップ',
    homePage: 'ホーム',
    appPage: '師に相談する（命盤鑑定チャット）',
  },
  ko: {
    summary:
      '고전 규칙대로 정확하게 계산하는 자미두수·사주(팔자) 온라인 명반과, 실존 유명인의 생애 사건에 비추어 풀이를 검증하는 라이브러리.',
    disciplinesTitle: '다루는 술수',
    disciplines: [
      ['자미두수', '음력 생년월일시로 열두 궁에 별을 배치하는 중국의 명리 체계. 명반은 규칙에 따라 정확히 계산되며 추정이 들어가지 않습니다.'],
      ['사주(팔자)', '태어난 해·달·날·시의 천간지지로 오행의 균형을 풀이합니다.'],
      ['기문둔갑', '특정 시각에 구궁 반을 세우는 고전 시간 점술.'],
      ['대육임', '일진과 시진의 지지로 세우는 고전 점술.'],
      ['황력(만세력)', '음양력에 따른 날짜별 길흉.'],
    ],
    pagesTitle: '한국어로 이용할 수 있는 페이지',
    profilesTitle: '검증 프로필',
    profilesIntro: '각 프로필은 실존 유명인의 생애 사건과 명반 풀이를 대조합니다.',
    methodTitle: '방법과 신뢰성',
    method:
      '명반 배치는 규칙 기반 엔진이 계산하고, 글은 그 결과를 설명할 뿐입니다. 출생 정보가 기록된 유명인의 생애 사건과 대조해 검증합니다.',
    sitemapTitle: '사이트맵',
    homePage: '홈',
    appPage: '스승에게 묻기 (명반 풀이 채팅)',
  },
  'zh-tw': {
    summary:
      '依古法嚴格運算的紫微斗數、八字線上命盤，以及以真實公眾人物生平事件對照命盤解讀的驗證資料庫。',
    disciplinesTitle: '涵蓋術數',
    disciplines: [
      ['紫微斗數', '依農曆生辰將星曜安入十二宮的命理體系；命盤依規則精確運算，不含臆測。'],
      ['八字（四柱）', '以出生年、月、日、時的干支，推論五行的強弱平衡。'],
      ['奇門遁甲', '為特定時刻起九宮盤的古典時間術數。'],
      ['大六壬', '以日辰與時辰地支起課的古典占法。'],
      ['黃曆', '依陰陽合曆而來的每日宜忌。'],
    ],
    pagesTitle: '繁體中文可用頁面',
    profilesTitle: '驗證檔案',
    profilesIntro: '每份檔案都將命盤解讀與真實公眾人物生平中有記載的事件相互對照。',
    methodTitle: '方法與可信度',
    method: '命盤排布由規則引擎運算，文字僅說明引擎的結果。解讀以出生資料有記載的公眾人物之生平事件加以驗證。',
    sitemapTitle: '網站地圖',
    homePage: '首頁',
    appPage: '問老師（命盤解讀對話）',
  },
  'zh-cn': {
    summary:
      '依古法严格运算的紫微斗数、八字在线命盘，以及以真实公众人物生平事件对照命盘解读的验证资料库。',
    disciplinesTitle: '涵盖术数',
    disciplines: [
      ['紫微斗数', '依农历生辰将星曜安入十二宫的命理体系；命盘依规则精确运算，不含臆测。'],
      ['八字（四柱）', '以出生年、月、日、时的干支，推论五行的强弱平衡。'],
      ['奇门遁甲', '为特定时刻起九宫盘的古典时间术数。'],
      ['大六壬', '以日辰与时辰地支起课的古典占法。'],
      ['黄历', '依阴阳合历而来的每日宜忌。'],
    ],
    pagesTitle: '简体中文可用页面',
    profilesTitle: '验证档案',
    profilesIntro: '每份档案都将命盘解读与真实公众人物生平中有记载的事件相互对照。',
    methodTitle: '方法与可信度',
    method: '命盘排布由规则引擎运算，文字仅说明引擎的结果。解读以出生资料有记载的公众人物之生平事件加以验证。',
    sitemapTitle: '站点地图',
    homePage: '首页',
    appPage: '问老师（命盘解读对话）',
  },
};

export const LLMS_LOCALES = Object.keys(COPY) as LlmsLocale[];
export const isLlmsLocale = (x: string): x is LlmsLocale => x in COPY;

/** Nhãn cho trang tĩnh đã biết; trang khác lùi về chính đường dẫn. */
function pageLabel(c: Copy, path: string): string {
  if (path === '/') return c.homePage;
  if (path === '/app') return c.appPage;
  return path;
}

function staticPages(locale: LlmsLocale): string[] {
  const avail = JSON.parse(readFileSync(join(process.cwd(), 'i18n', 'availability.json'), 'utf8')) as Record<string, string[]>;
  return Object.entries(avail)
    .filter(([, ls]) => ls.includes(locale))
    .map(([p]) => p);
}

/** Hồ sơ đã dịch + đã mở index ở bản gốc (cùng luật sitemap-nghiem-chung / xac-dinh-gio-sinh). */
async function profiles(locale: LlmsLocale) {
  const goc = new Map((await danhMuc()).filter((x) => x.indexed).map((x) => [x.slug, x]));
  return (await dbDanhMucDich(locale as NcLocale))
    .filter((x) => goc.has(x.slug))
    .map((x) => ({
      url: `${BASE_URL}${localePrefix(locale)}/${goc.get(x.slug)!.gioDoan ? 'xac-dinh-gio-sinh' : 'nghiem-chung'}/${x.slug}`,
      ten: x.ten,
      ngheNghiep: x.ngheNghiep,
    }));
}

/** null = ngôn ngữ chưa dịch gì (route trả 404). */
export async function buildLlms(locale: LlmsLocale, full: boolean): Promise<string | null> {
  const c = COPY[locale];
  const pages = staticPages(locale);
  const profs = await profiles(locale);
  if (!pages.length && !profs.length) return null;

  const L: string[] = [`# Tử Vi Minh Bảo — tuviminhbao.com`, '', `> ${c.summary}`, ''];
  L.push(`## ${c.disciplinesTitle}`);
  for (const [n, d] of c.disciplines) L.push(full ? `- **${n}**: ${d}` : `- ${n}`);
  L.push('');
  L.push(`## ${c.methodTitle}`, c.method, '');
  if (pages.length) {
    L.push(`## ${c.pagesTitle}`);
    for (const p of pages) L.push(`- [${pageLabel(c, p)}](${urlFor(locale, p)})`);
    L.push('');
  }
  if (profs.length) {
    const cap = full ? 2000 : 100;
    L.push(`## ${c.profilesTitle}`, c.profilesIntro);
    for (const x of profs.slice(0, cap)) L.push(`- [${x.ten}](${x.url})${full && x.ngheNghiep ? `: ${x.ngheNghiep}` : ''}`);
    L.push('');
  }
  L.push(`## ${c.sitemapTitle}`, `- ${BASE_URL}/sitemap-i18n-${locale}.xml`, '');
  return L.join('\n');
}
