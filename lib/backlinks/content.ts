// lib/backlinks/content.ts
// ============================================================
// SOẠN NỘI DUNG cho một cơ hội backlink — email pitch, bài web2.0, mô tả nộp
// directory. Máy soạn, người tự tay dán/gửi. Xem lý do ở đầu
// `_patches/migration-backlinks.sql` — đây LÀ trợ lý, không phải bot gửi thư.
//
// HAI LỚP QC, tách bạch với brand-check.ts (#356) có chủ đích: brand-check
// gác GIỌNG VĂN cho bài viết TRÊN CHÍNH site (ngôi 3 kiểu Khảo Luận, ngôi 1
// kiểu thầy kể chuyện — 2 profile cố định, khớp corpus `brand_voice_docs`).
// Nội dung ở đây nói VỚI người khác (chủ site, biên tập, admin group), giọng
// khác hẳn — nhét qua brand-check là áp nhầm luật, có thể chặn oan một email
// lịch sự bình thường vì nó không "kiểu Khảo Luận". Nên file này tự có một
// lớp QC RIÊNG, hẹp và rõ mục đích: chặn NGÔN NGỮ SPAM (thứ Google/nền tảng
// nào cũng phạt), không chặn văn phong.
// ============================================================

import { llmText } from '@/lib/llm/complete';
import { sbGet, sbInsert, sbPatch } from './db';
import { getConfigValue } from '@/lib/config/appConfig';
import { dataHookBlock } from './data-hook';

export type ProspectKind =
  | 'directory'
  | 'resource_page'
  | 'broken_link'
  | 'guest_post'
  | 'guest_blog'
  | 'press'
  | 'kol'
  | 'partner'
  | 'web2'
  | 'social_profile'
  | 'unlinked_mention'
  | 'other';

export type ContentKind =
  | 'directory_listing'
  | 'web2_article'
  | 'guest_pitch'
  | 'blog_pitch'
  | 'press_pitch'
  | 'kol_pitch'
  | 'outreach_email'
  | 'broken_link_pitch';

export interface Prospect {
  id: string;
  kind: ProspectKind;
  name: string;
  url: string;
  topic: string | null;
  contact_email: string | null;
  notes: string | null;
  status: string;
  priority: number;
  source: string;
  created_at: string;
  /** CRM-lite (#14) — nhịp theo dõi, do NGƯỜI đánh dấu chứ máy không gửi gì. */
  last_contacted_at?: string | null;
  follow_up_at?: string | null;
  reply?: 'none' | 'positive' | 'negative' | 'later';
}

export interface DraftedContent {
  kind: ContentKind;
  title: string | null;
  body: string;
  meta: Record<string, unknown>;
}

/** Mỗi loại cơ hội soạn ĐÚNG một loại nội dung — không để người soạn tự đoán. */
export function pickContentKind(kind: ProspectKind): ContentKind {
  switch (kind) {
    case 'directory':
    case 'social_profile':
      return 'directory_listing';
    case 'guest_blog':
      return 'blog_pitch';
    case 'press':
      return 'press_pitch';
    case 'kol':
      return 'kol_pitch';
    // `partner` (đổi giá trị qua lại giữa hai site) dùng lại `outreach_email`:
    // nó ĐÚNG là "chào hỏi làm quen, giới thiệu một công cụ có thể hữu ích cho
    // độc giả của họ" — thêm một prompt thứ hai nói cùng một việc là hai bản
    // trôi khỏi nhau. KOL thì tách RIÊNG vì đó là thư gửi MỘT NGƯỜI có khán
    // giả, giọng khác hẳn thư gửi một website.
    case 'web2':
      return 'web2_article';
    case 'guest_post':
      return 'guest_pitch';
    case 'resource_page':
    case 'broken_link':
      return 'broken_link_pitch';
    default:
      return 'outreach_email';
  }
}

/**
 * `resource_page`/`broken_link` CHỈ soạn được khi có `notes` mô tả CỤ THỂ chỗ
 * cần chèn/thay link — một email "trang bạn có link chết, chèn link tôi vào"
 * mà không nêu link chết nào là đúng loại spam blast broken-link-building bị
 * Google gọi thẳng tên. Thiếu notes thì KHÔNG soạn, chờ người tự điền sau khi
 * đã tự mắt xem qua trang đó.
 */
export function contentReady(p: Prospect): boolean {
  if ((p.kind === 'resource_page' || p.kind === 'broken_link') && !(p.notes || '').trim()) return false;
  // Pitch báo chí KHÔNG soạn được khi chưa có bộ dữ liệu: bỏ móc số liệu đi thì
  // nó tụt xuống thành thư quảng cáo, mà thư quảng cáo gửi toà soạn vừa vô ích
  // vừa đốt đúng một lần liên hệ. Thà không soạn.
  if (p.kind === 'press' && !dataHookBlock()) return false;
  return true;
}

// Mô tả site TRUNG THỰC, không số liệu bịa — model không được thêm số liệu
// nào ngoài đây (users/traffic/ranking là những con số dễ bị nói quá).
const SITE_FACTS = `Tên: Tử Vi Minh Bảo (tuviminhbao.com).
Đây là gì: một website/ứng dụng web tra cứu và luận giải Tử Vi Đẩu Số (chiêm tinh
học phương Đông của người Việt) — lập lá số theo giờ/ngày/tháng/năm sinh, luận
giải bằng AI dựa trên cổ pháp Tử Vi, có công cụ liên quan (Bát Tự, xem tuổi hợp,
đặt tên, chọn ngày, phong thủy...).
Mô hình: một phần công cụ MIỄN PHÍ, một phần luận giải sâu hơn tính phí theo lượt.
Ngôn ngữ: tiếng Việt, nhắm người dùng Việt Nam.
CẤM: không được thêm bất kỳ con số nào về lượng người dùng/traffic/thứ hạng/đánh
giá — không có số nào ở đây để dùng, thêm vào là bịa.`;

const JSON_RULE =
  'Trả JSON THUẦN, KHÔNG bọc markdown, KHÔNG thêm chữ nào ngoài JSON.';

function prospectBlock(p: Prospect): string {
  return JSON.stringify({
    ten: p.name,
    url: p.url,
    chu_de: p.topic || '(không ghi rõ)',
    ghi_chu: p.notes || '(không có)',
  });
}

async function ask(system: string, prospect: Prospect, extraMax = 1200): Promise<Record<string, unknown> | null> {
  try {
    const raw = await llmText({
      system,
      prompt: prospectBlock(prospect),
      maxTokens: extraMax,
      json: true,
    });
    let text = raw.trim();
    if (text.startsWith('```')) text = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return null;
      return JSON.parse(m[0]) as Record<string, unknown>;
    }
  } catch {
    return null;
  }
}

const STR = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

async function draftDirectoryListing(p: Prospect): Promise<DraftedContent | null> {
  const system = `Bạn soạn PHẦN MÔ TẢ để nộp vào một danh bạ/directory hoặc hồ sơ mạng xã hội.

Bối cảnh site sẽ nộp:
${SITE_FACTS}

${JSON_RULE}
{"title":"...", "tagline":"câu 1 dòng, tối đa 90 ký tự", "description":"120-220 từ", "suggestedCategory":"gợi ý danh mục phù hợp trên directory này"}

LUẬT:
- Viết cho ĐÚNG directory "${p.name}" (${p.url}) — nếu biết chủ đề directory, bám vào đó, đừng viết chung chung dùng được ở mọi nơi.
- Nêu ĐÚNG SỰ THẬT có trong phần bối cảnh, không thêm tính năng/con số không có.
- Không dùng cấp so sánh tuyệt đối ("tốt nhất", "số 1", "duy nhất") — directory nào cũng thấy loại câu này và bỏ qua ngay.
- Giọng trung tính, giới thiệu sản phẩm, KHÔNG chèn kêu gọi mua/nạp tiền.`;
  const out = await ask(system, p);
  if (!out) return null;
  const description = STR(out.description);
  if (!description) return null;
  return {
    kind: 'directory_listing',
    title: STR(out.title) || p.name,
    body: description,
    meta: { tagline: STR(out.tagline), suggestedCategory: STR(out.suggestedCategory) },
  };
}

async function draftWeb2Article(p: Prospect): Promise<DraftedContent | null> {
  const system = `Bạn soạn MỘT BÀI VIẾT ngắn để đăng trên nền tảng web2.0 (Medium, Hashnode, Blogger...), người đọc là người Việt quan tâm tử vi/chiêm tinh.

Bối cảnh site sẽ nhắc tới (chèn link tự nhiên trong bài, KHÔNG spam link):
${SITE_FACTS}

${JSON_RULE}
{"title":"...", "body":"550-800 từ, có 2-3 đoạn, kết bằng câu dẫn link tự nhiên"}

LUẬT:
- Bài phải TỰ ĐỨNG VỮNG như một bài viết thật (kiến thức tử vi phổ thông, câu chuyện, góc nhìn) — không phải một quảng cáo trá hình.
- Nhắc site + link ĐÚNG MỘT LẦN, đặt gần cuối, như một gợi ý tham khảo tự nhiên ("nếu muốn tra thử, có vài công cụ như tuviminhbao.com").
- Không hứa hẹn "chính xác 100%", không dùng ngôn ngữ bói toán đe dọa (hạn nặng, tai ương chắc chắn xảy ra).
- KHÔNG chèn nhiều hơn 1 link, KHÔNG chèn danh sách nhiều site khác.`;
  const out = await ask(system, p, 1800);
  if (!out) return null;
  const body = STR(out.body);
  if (!body) return null;
  return { kind: 'web2_article', title: STR(out.title) || null, body, meta: {} };
}

async function draftGuestPitch(p: Prospect): Promise<DraftedContent | null> {
  const system = `Bạn soạn MỘT EMAIL đề nghị viết bài khách (guest post) gửi tới ban biên tập của "${p.name}" (${p.url}).

Bối cảnh người gửi:
${SITE_FACTS}

${JSON_RULE}
{"subject":"...", "body":"email 120-180 từ", "articleOutline":["3-4 gợi ý dàn ý bài viết, mỗi mục 1 câu ngắn"]}

LUẬT:
- Ngôi thứ nhất, giọng người thật viết cho người thật — KHÔNG mẫu "Dear Sir/Madam" máy móc.
- Nêu RÕ vì sao chọn đúng "${p.name}" (dựa trên chủ đề/ghi chú được đưa), không phải email hàng loạt.
- Đề nghị viết bài KIẾN THỨC THẬT (không phải bài PR trá hình), gợi ý 3-4 chủ đề cụ thể.
- Không hứa trả tiền/đổi link qua lại, không nói "SEO"/"backlink" trong email — biên tập viên đọc thấy chữ đó là từ chối ngay.
- Kết bằng câu hỏi mở (họ có quan tâm không), không chốt sẵn.`;
  const out = await ask(system, p, 900);
  if (!out) return null;
  const body = STR(out.body);
  if (!body) return null;
  const outline = Array.isArray(out.articleOutline)
    ? (out.articleOutline as unknown[]).map((s) => STR(s)).filter(Boolean).slice(0, 5)
    : [];
  return { kind: 'guest_pitch', title: STR(out.subject) || null, body, meta: { articleOutline: outline } };
}

/**
 * Thư gửi BLOG NHỎ / blog cá nhân — tầng nhẹ hơn `draftGuestPitch`.
 *
 * Vì sao tách hẳn một hàm thay vì nới prompt của guest pitch: hai bên đọc thư
 * bằng hai tư cách khác nhau. Toà soạn cần biết bài sẽ có dàn ý gì, đúng
 * chuyên mục nào; chủ một blog cá nhân đọc email dài dòng kiểu đó là đóng
 * ngay vì nó nghe như thư hàng loạt. Gộp một prompt thì phải viết "nếu là
 * blog nhỏ thì..." — model chọn nhánh tuỳ hứng, không kiểm được.
 */
async function draftBlogPitch(p: Prospect): Promise<DraftedContent | null> {
  const system = `Bạn soạn MỘT THƯ NGẮN gửi cho chủ blog "${p.name}" (${p.url}) — đây là BLOG CÁ NHÂN / blog nhỏ, người nhận là MỘT NGƯỜI chứ không phải ban biên tập.

Bối cảnh người gửi:
${SITE_FACTS}

${JSON_RULE}
{"subject":"...", "body":"thư 70-120 từ", "ideas":["2-3 ý bài, mỗi ý 1 câu"]}

LUẬT:
- NGẮN. Blog cá nhân đọc thư dài là đóng ngay vì nghe như thư hàng loạt.
- Xưng hô với MỘT NGƯỜI (anh/chị/bạn tuỳ giọng blog), KHÔNG "kính gửi ban biên tập".
- Mở bằng một chi tiết CÓ THẬT về blog của họ lấy từ "chu_de"/"ghi_chu" — không có thông tin cụ thể thì nói thẳng là mới biết tới blog, ĐỪNG giả vờ đã đọc lâu.
- Đề nghị viết một bài kiến thức, nói rõ là gửi miễn phí, họ toàn quyền biên tập hoặc từ chối.
- CẤM chữ "SEO"/"backlink"/"trao đổi link"/"hợp tác truyền thông".
- Kết bằng một câu hỏi mở, không giục.`;
  const out = await ask(system, p, 700);
  if (!out) return null;
  const body = STR(out.body);
  if (!body) return null;
  const ideas = Array.isArray(out.ideas)
    ? (out.ideas as unknown[]).map((s) => STR(s)).filter(Boolean).slice(0, 3)
    : [];
  return { kind: 'blog_pitch', title: STR(out.subject) || null, body, meta: { ideas } };
}

/**
 * Thư gửi TOÀ SOẠN / nhà báo — mục #11/14.
 *
 * 🔑 Khác `draftGuestPitch` ở chỗ căn bản, không phải ở độ dài: guest pitch
 * bán CÔNG SỨC VIẾT ("để tôi viết cho anh một bài"), press pitch bán MỘT TIN
 * ("có chuyện này, anh muốn viết thì đây là số liệu"). Toà soạn không cần ai
 * viết hộ — họ có phóng viên; thứ họ thiếu là đề tài có số liệu tra lại được.
 * Gộp hai cái vào một prompt thì model tự chọn nhánh tuỳ hứng, và nhánh nó hay
 * chọn là nhánh xin-viết-bài — đúng cái toà soạn bỏ qua.
 *
 * Vì thế thư này KHÔNG xin đăng bài, KHÔNG xin link. Nó đưa số + đưa nguồn +
 * mời hỏi thêm. Link về site đến từ việc nhà báo dẫn nguồn dữ liệu, tức từ
 * ĐIỀU KIỆN CỦA GIẤY PHÉP chứ không từ việc đi xin.
 */
async function draftPressPitch(p: Prospect): Promise<DraftedContent | null> {
  const hooks = dataHookBlock();
  if (!hooks) return null;

  const system = `Bạn soạn MỘT THƯ GỬI TOÀ SOẠN/nhà báo của "${p.name}" (${p.url}) để giới thiệu một bộ dữ liệu vừa công bố.

${hooks}

Bối cảnh bên gửi:
${SITE_FACTS}

${JSON_RULE}
{"subject":"...", "body":"thư 110-170 từ", "angles":["2-3 góc bài gợi ý, mỗi góc 1 câu"]}

LUẬT:
- Đây KHÔNG phải thư xin đăng bài và KHÔNG phải thư quảng cáo sản phẩm. Nó đưa một đề tài kèm số liệu; họ viết hay không là quyền họ.
- Mở bằng CON SỐ, không mở bằng lời tự giới thiệu. Nhà báo đọc 2 dòng đầu rồi quyết.
- Chỉ được dùng số có trong phần "SỐ LIỆU CÓ THẬT" ở trên. TUYỆT ĐỐI không thêm, không làm tròn khác đi, không suy ra số mới.
- BẮT BUỘC nêu cách đọc đúng (phân bố trên thời điểm sinh, không phải phân bố dân số) — nêu số mà bỏ ý này là sai nghiêm trọng, vì nhà báo sẽ viết thành "X% người Việt".
- Nói rõ dữ liệu miễn phí, giấy phép CC BY 4.0, tải được JSON/CSV, và dẫn trang nguồn.
- CẤM chữ "SEO"/"backlink"/"truyền thông"/"PR"/"booking bài"/"hợp tác".
- Đề nghị sẵn sàng cắt số theo chiều khác nếu toà soạn cần, và kết bằng câu hỏi mở.`;

  const out = await ask(system, p, 1000);
  if (!out) return null;
  const body = STR(out.body);
  if (!body) return null;
  const angles = Array.isArray(out.angles)
    ? (out.angles as unknown[]).map((s) => STR(s)).filter(Boolean).slice(0, 3)
    : [];
  return { kind: 'press_pitch', title: STR(out.subject) || null, body, meta: { angles, dataset: 'tuvi-dataset-v1' } };
}

/**
 * Thư gửi KOL / người có khán giả — mục #14/14.
 *
 * ⛔ CHỈ SOẠN, KHÔNG GỬI. Không có đường tự nhắn tin nào trong file này, và đó
 * là ràng buộc đã chốt của cả track: nhắn tin hàng loạt cho KOL là spam, mà
 * spam từ một tài khoản thương hiệu thì mất luôn tài khoản đó.
 *
 * 🔑 Khác `outreach_email` ở chỗ người nhận là MỘT NGƯỜI CÓ KHÁN GIẢ, không
 * phải quản trị một website. Hai thứ họ cân nhắc khác hẳn nhau: chủ site hỏi
 * "cái này có ích cho độc giả của tôi không", KOL hỏi "cái này có ra được một
 * nội dung tôi muốn đăng không". Thư nào không trả lời câu đó thì bị lướt qua.
 *
 * Nên thư này đưa MỘT Ý TƯỞNG NỘI DUNG cụ thể, không đưa lời mời hợp tác
 * chung chung — và nói thẳng là dùng miễn phí, không ràng buộc, vì thứ mình
 * thật sự muốn là họ thử rồi tự thấy đáng kể lại.
 */
async function draftKolPitch(p: Prospect): Promise<DraftedContent | null> {
  const system = `Bạn soạn MỘT TIN NHẮN NGẮN gửi cho "${p.name}" (${p.url}) — một người sáng tạo nội dung / người có khán giả (TikToker, YouTuber, admin group, chủ kênh).

Bối cảnh bên gửi:
${SITE_FACTS}

${JSON_RULE}
{"subject":"...", "body":"tin nhắn 60-110 từ", "contentIdeas":["2-3 ý nội dung CỤ THỂ họ có thể làm, mỗi ý 1 câu"]}

LUẬT:
- RẤT NGẮN. Đây là tin nhắn, không phải email doanh nghiệp. Dài là bị lướt.
- Xưng hô với MỘT NGƯỜI, giọng bình thường như người nhắn cho người.
- Nêu MỘT chi tiết CÓ THẬT về kênh của họ lấy từ "chu_de"/"ghi_chu". Không có thông tin cụ thể thì nói thẳng là mới biết tới kênh — ĐỪNG giả vờ đã theo dõi lâu.
- Trọng tâm là Ý TƯỞNG NỘI DUNG cho HỌ, không phải lời khen sản phẩm của mình. Gợi ý 2-3 ý cụ thể (vd: quay thử một lá số rồi phản ứng, so kết quả hai người, thử công cụ đoán tính cách).
- Nói rõ: dùng miễn phí, không cần đăng gì, không ràng buộc. KHÔNG nhắc tiền, KHÔNG đề nghị trả phí quảng cáo, KHÔNG đòi gắn link.
- CẤM chữ "hợp tác truyền thông"/"booking"/"KOL"/"campaign"/"SEO"/"backlink".
- Kết bằng một câu hỏi mở, không giục, chấp nhận họ có thể không trả lời.`;

  const out = await ask(system, p, 800);
  if (!out) return null;
  const body = STR(out.body);
  if (!body) return null;
  const ideas = Array.isArray(out.contentIdeas)
    ? (out.contentIdeas as unknown[]).map((s) => STR(s)).filter(Boolean).slice(0, 3)
    : [];
  return { kind: 'kol_pitch', title: STR(out.subject) || null, body, meta: { contentIdeas: ideas } };
}

async function draftOutreachEmail(p: Prospect): Promise<DraftedContent | null> {
  const isMention = p.kind === 'unlinked_mention';
  const system = `Bạn soạn MỘT EMAIL ngắn gửi cho "${p.name}" (${p.url}).
${isMention
    ? 'Họ ĐÃ nhắc tới site này ở đâu đó trên trang của họ nhưng CHƯA gắn link — email lịch sự cảm ơn + hỏi có thể xin gắn link không.'
    : 'Chào hỏi làm quen, giới thiệu ngắn một công cụ có thể hữu ích cho độc giả của họ.'}

Bối cảnh:
${SITE_FACTS}

${JSON_RULE}
{"subject":"...", "body":"email 80-140 từ"}

LUẬT:
- Ngắn gọn, lịch sự, KHÔNG có chữ "SEO"/"backlink"/"link building" trong email.
- ${isMention ? 'Nếu "ghi_chu" có mô tả chỗ họ nhắc tới, dẫn lại đúng chỗ đó — không nói chung chung "tôi thấy bạn có nhắc".' : 'Không giả vờ đã đọc hết nội dung của họ nếu không có thông tin cụ thể.'}
- KHÔNG kèm bất kỳ lời đề nghị đổi link qua lại nào.`;
  const out = await ask(system, p, 700);
  if (!out) return null;
  const body = STR(out.body);
  if (!body) return null;
  return { kind: 'outreach_email', title: STR(out.subject) || null, body, meta: {} };
}

async function draftBrokenLinkPitch(p: Prospect): Promise<DraftedContent | null> {
  const system = `Bạn soạn MỘT EMAIL gửi cho quản trị/tác giả trang "${p.name}" (${p.url}) về một tài nguyên trong trang họ.

"ghi_chu" mô tả CHÍNH XÁC chỗ cần nhắc tới (link chết, hoặc mục tài nguyên có thể bổ sung) — email PHẢI dẫn lại đúng chi tiết đó, không được viết chung chung.

Bối cảnh người gửi:
${SITE_FACTS}

${JSON_RULE}
{"subject":"...", "body":"email 100-160 từ"}

LUẬT:
- Nêu ĐÚNG chi tiết trong "ghi_chu" trước, coi đó là lý do liên hệ chính — KHÔNG mở đầu bằng lời tự giới thiệu về site mình.
- Đề nghị nhẹ nhàng, không đòi hỏi, chấp nhận việc họ có thể không phản hồi.
- KHÔNG dùng chữ "SEO"/"backlink"/"đổi link".`;
  const out = await ask(system, p, 900);
  if (!out) return null;
  const body = STR(out.body);
  if (!body) return null;
  return { kind: 'broken_link_pitch', title: STR(out.subject) || null, body, meta: {} };
}

/** Soạn nội dung cho một prospect. `null` = LLM không trả được bản dùng được (giữ status='new', thử lại lượt sau). */
export async function draftContentForProspect(p: Prospect): Promise<DraftedContent | null> {
  if (!contentReady(p)) return null;
  switch (pickContentKind(p.kind)) {
    case 'directory_listing':
      return draftDirectoryListing(p);
    case 'web2_article':
      return draftWeb2Article(p);
    case 'guest_pitch':
      return draftGuestPitch(p);
    case 'blog_pitch':
      return draftBlogPitch(p);
    case 'press_pitch':
      return draftPressPitch(p);
    case 'kol_pitch':
      return draftKolPitch(p);
    case 'broken_link_pitch':
      return draftBrokenLinkPitch(p);
    default:
      return draftOutreachEmail(p);
  }
}

// ── QC ngôn ngữ spam ─────────────────────────────────────────────────────────
// Hẹp có chủ đích: chặn đúng những cụm mà Google/mọi nền tảng gọi thẳng tên là
// tín hiệu link-spam, KHÔNG chặn theo văn phong (đó là việc của người duyệt).
const SPAM_PHRASES = [
  'buy backlink', 'buy backlinks', 'mua backlink', 'mua liên kết',
  'guaranteed ranking', 'guaranteed rank', 'đảm bảo lên top', 'đảm bảo thứ hạng',
  'seo package', 'gói seo giá rẻ', 'gói seo',
  'increase your da', 'tăng da/pa', 'tăng domain authority',
  'link exchange', 'trao đổi liên kết', 'đổi link qua lại',
  'bulk email', 'gửi hàng loạt', 'mass email',
  'pbn', 'private blog network',
  'click here now', 'act now', 'limited time offer',
];

export interface SpamCheckResult {
  pass: boolean;
  reasons: string[];
}

export function spamSafetyCheck(body: string, title?: string | null): SpamCheckResult {
  const reasons: string[] = [];
  const full = `${title || ''}\n${body}`.toLowerCase();
  for (const phrase of SPAM_PHRASES) {
    if (full.includes(phrase)) reasons.push(`chứa cụm cấm: "${phrase}"`);
  }
  if (body.trim().length < 30) reasons.push('nội dung quá ngắn (<30 ký tự)');
  if (body.trim().length > 6000) reasons.push('nội dung quá dài (>6000 ký tự) — nghi lặp/hỏng');
  // Đếm link — một email/listing có quá nhiều link là dấu hiệu spam blast.
  const linkCount = (body.match(/https?:\/\//g) || []).length;
  if (linkCount > 3) reasons.push(`quá nhiều link trong nội dung (${linkCount})`);
  return { pass: reasons.length === 0, reasons };
}

// ── Soạn hàng loạt (cron + nút "Soạn ngay" trong admin) ─────────────────────

const DEFAULT_CONTENT_CAP = 5;
const CONTENT_HARD_MAX = 20;

export interface BuildContentResult {
  built: { prospectId: string; name: string; kind: ContentKind }[];
  skipped: { name: string; reason: string }[];
  due: number;
  stoppedReason?: string;
}

/**
 * Soạn nội dung cho tối đa `limit` cơ hội đang `status='new'`. KHÔNG đăng/gửi
 * gì — chỉ ghi `backlink_content` (status='draft') rồi đẩy prospect sang
 * 'content_ready'. Hàm này KHÔNG import bất kỳ adapter gửi-đi-đâu nào, và đó
 * là chủ đích (xem đầu file migration).
 */
export async function buildContentDrafts(limit?: number): Promise<BuildContentResult> {
  const result: BuildContentResult = { built: [], skipped: [], due: 0 };

  const configured = await getConfigValue<number>('backlinks.content_daily_cap', DEFAULT_CONTENT_CAP);
  const cap = Math.max(0, Math.min(limit ?? configured, CONTENT_HARD_MAX));

  const prospects = await sbGet<Prospect>(
    'backlink_prospects?status=eq.new&select=*&order=priority.desc,created_at.asc&limit=100',
  );
  result.due = prospects.length;
  if (!prospects.length) return result;
  if (cap === 0) {
    result.stoppedReason = 'backlinks.content_daily_cap = 0 — đang tắt, không soạn bài nào';
    return result;
  }

  for (const p of prospects) {
    if (result.built.length >= cap) {
      result.stoppedReason = `chạm trần ${cap}/lượt — ${result.due - result.built.length} cơ hội còn lại chờ lượt sau`;
      break;
    }
    if (!contentReady(p)) {
      result.skipped.push({
        name: p.name,
        reason:
          p.kind === 'press'
            ? 'chưa đọc được bộ dữ liệu mở — pitch báo chí phải có số liệu thật mới soạn'
            : 'thiếu "ghi chú" mô tả cụ thể chỗ cần chèn/thay link — điền tay rồi soạn lại',
      });
      continue;
    }
    const draft = await draftContentForProspect(p);
    if (!draft) {
      result.skipped.push({ name: p.name, reason: 'LLM không trả bản dùng được — thử lại lượt sau' });
      continue;
    }
    const qc = spamSafetyCheck(draft.body, draft.title);
    if (!qc.pass) {
      result.skipped.push({ name: p.name, reason: `chặn ở QC spam: ${qc.reasons.join('; ')}` });
      continue;
    }

    const row = await sbInsert<{ id: string }>('backlink_content', {
      prospect_id: p.id,
      kind: draft.kind,
      title: draft.title,
      body: draft.body,
      meta: draft.meta,
      status: 'draft',
    });
    if (!row) {
      result.skipped.push({ name: p.name, reason: 'không lưu được bản nháp' });
      continue;
    }
    await sbPatch('backlink_prospects', `id=eq.${p.id}`, { status: 'content_ready', updated_at: new Date().toISOString() });
    result.built.push({ prospectId: p.id, name: p.name, kind: draft.kind });
  }

  return result;
}

/** Bản tin Telegram. Trả '' khi không có gì đáng báo — im lặng là một kết quả. */
export function formatBuildReport(r: BuildContentResult): string {
  if (!r.built.length && !r.skipped.length && !r.stoppedReason) return '';
  const lines: string[] = [];
  if (r.built.length) {
    lines.push(`✍️ Đã soạn ${r.built.length} nội dung, chờ duyệt:`);
    for (const b of r.built) lines.push(`  • ${b.name} (${b.kind})`);
  }
  if (r.skipped.length) {
    lines.push(`⚠️ Bỏ qua ${r.skipped.length} cơ hội:`);
    for (const s of r.skipped.slice(0, 10)) lines.push(`  • ${s.name} — ${s.reason}`);
    if (r.skipped.length > 10) lines.push(`  • …và ${r.skipped.length - 10} cái nữa`);
  }
  if (r.stoppedReason) lines.push(`⏸️ ${r.stoppedReason}`);
  if (r.built.length) {
    lines.push('\n📋 Mở Admin → Backlink: mỗi bản có nút Copy, đánh dấu Đã dùng hoặc Bỏ qua.');
  }
  return lines.join('\n');
}
