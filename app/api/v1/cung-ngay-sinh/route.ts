// app/api/v1/cung-ngay-sinh/route.ts
// ============================================================
// "AI SINH CÙNG NGÀY VỚI BẠN" — 5 người nổi tiếng cùng lá số
//
// MIỄN PHÍ, 0 TOKEN LLM. Đây là tra bảng, không sinh nội dung: không trừ Lượng,
// không gọi model, không chạm paywall. Nhờ vậy nhét được vào cuối MỌI bản luận
// giải mà không thêm một đồng chi phí biến đổi.
//
// ── KHOÁ LÀ ÂM LỊCH ─────────────────────────────────────────
// An sao chỉ phụ thuộc (can chi năm · tháng ÂL · ngày ÂL · giờ · giới); SỐ năm
// âm KHÔNG vào an sao ⇒ lá số lặp đúng chu kỳ 60 năm (đo: 0/48 khác biệt giữa
// Giáp Thân 1884/1944/2004). Người sinh 1930 khớp THẲNG người sinh 1990.
//
// ── BỐN TẦNG, NHÃN TRUNG THỰC ───────────────────────────────
//   T2  can chi năm·tháng·ngày·GIỜ·GIỚI → "CÙNG MỘT LÁ SỐ"  (đo được 8,47%)
//   T2b cùng thế nhưng BỎ giới          → "cùng khung lá số" (16,27%)
//       — đo trên 912 lá số: nam vs nữ cùng ngày+giờ thì cung Mệnh/Cục/14
//         chính tinh khác 0,0%, nhưng phụ tinh khác 100% và đại vận ngược
//         chiều. Nên nhãn phải nói rõ "khác giới", không được nói "cùng lá số".
//   T1  can chi năm·tháng·ngày (khác giờ) → "cùng ngày–tháng–năm âm lịch"
//   T0  ngày·tháng DƯƠNG                  → "cùng ngày sinh nhật" (luôn đầy)
//
// Thiếu giờ sinh thì T2/T2b tự rụng, KHÔNG đoán giờ: đoán giờ là đoán canh
// giờ, mà canh giờ sai thì badge "CÙNG MỘT LÁ SỐ" thành trúng số GIẢ.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { CORS_HEADERS, options } from '@/lib/cors';
import { lunarOf } from '@/lib/engine/laso';
import { celebPhoto } from '@/lib/celeb/photo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export { options as OPTIONS };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SLOTS = 5;
/** Ưu tiên châu lục — Henry chốt: Á > Mỹ > Âu > khác. */
const REGION_RANK: Record<string, number> = { asia: 0, americas: 1, europe: 2, other: 3 };

type Tier = 't2' | 't2b' | 't1' | 't0';
const TIER_LABEL: Record<Tier, string> = {
  t2: 'CÙNG MỘT LÁ SỐ',
  t2b: 'Cùng khung lá số',
  t1: 'Cùng ngày âm lịch',
  t0: 'Cùng ngày sinh nhật',
};
const TIER_NOTE: Record<Tier, string> = {
  t2: 'Trùng cả ngày lẫn canh giờ sinh — an sao ra đúng một lá số.',
  t2b: 'Trùng ngày và canh giờ, khác giới tính: cùng cung Mệnh, cùng Cục, cùng 14 chính tinh — nhưng vận trình đi ngược chiều.',
  t1: 'Cùng ngày, tháng, năm âm lịch. Khác giờ sinh nên cung Mệnh khác.',
  t0: 'Cùng ngày sinh nhật dương lịch.',
};

interface Row {
  qid: string; name: string; occupation: string | null; country: string | null;
  region: string; wiki_url: string | null; image_file: string | null;
  birth_date: string; birth_time: string | null; birth_tz_off: number | null;
  rodden: string | null; gio_idx: number | null; gender: string | null;
  fame_score: number; key_t1: string;
  image_url: string | null; image_credit: string | null; image_license: string | null;
}

/** `key_t1` = "<canChi năm>|<tháng ÂL>|<ngày ÂL>" — đã tính sẵn lúc import,
 * đọc lại để hiện NGÀY ÂM LỊCH thật của từng người lên thẻ. Không tính lại
 * bằng engine ở đây: đọc field có sẵn rẻ hơn và không thể trôi khỏi khoá đã
 * dùng để MATCH. */
function parseT1(key: string) {
  const [canChi, thang, ngay] = key.split('|');
  return { canChi, thang: Number(thang), ngay: Number(ngay) };
}

const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

async function fetchTier(col: string, key: string, limit: number, needPhoto: boolean): Promise<Row[]> {
  const q =
    `${SUPABASE_URL}/rest/v1/celeb_births` +
    `?${col}=eq.${encodeURIComponent(key)}&blocked=is.false` +
    (needPhoto ? '&image_file=not.is.null' : '') +
    `&select=qid,name,occupation,country,region,wiki_url,image_file,image_url,image_credit,image_license,birth_date,birth_time,birth_tz_off,rodden,gio_idx,gender,fame_score,key_t1` +
    `&order=fame_score.desc&limit=${limit}`;
  // 🔴 `cache:'no-store'` BẮT BUỘC: Next bọc fetch toàn cục và nhớ kết quả kể
  // cả khi dynamic='force-dynamic'. Repo đã cắn 3 lần vì thiếu dòng này.
  const res = await fetch(q, {
    headers: { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${SUPABASE_KEY || ''}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`celeb_births ${res.status}`);
  return (await res.json()) as Row[];
}

/**
 * Chọn 5 suất. Thứ tự ưu tiên Henry chốt: CÓ ẢNH → tầng → châu lục → nổi tiếng.
 *
 * Ngoại lệ CÓ CHỦ Ý ở T2/T2b: chúng hiếm (8,47% / 16,27%) và là thứ đáng khoe
 * nhất của cả feature — giấu một quả trúng số chỉ vì thiếu ảnh Commons thì mất
 * nhiều hơn được. Nhánh đó cho qua, UI dùng avatar chữ cái.
 */
function pick(pool: { row: Row; tier: Tier }[]): { row: Row; tier: Tier }[] {
  const seen = new Set<string>();
  const uniq = pool.filter((p) => (seen.has(p.row.qid) ? false : (seen.add(p.row.qid), true)));
  const TIER_RANK: Record<Tier, number> = { t2: 0, t2b: 1, t1: 2, t0: 3 };
  uniq.sort(
    (a, b) =>
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      (REGION_RANK[a.row.region] ?? 3) - (REGION_RANK[b.row.region] ?? 3) ||
      b.row.fame_score - a.row.fame_score
  );

  // Đa dạng nghề: 5 cầu thủ Pháp thì đọc chán. Ép ≤2 người cùng nghề, nhưng
  // KHÔNG bỏ trống suất vì luật này — hết người mới thì nới ra.
  const out: { row: Row; tier: Tier }[] = [];
  const perOcc = new Map<string, number>();
  for (const p of uniq) {
    if (out.length >= SLOTS) break;
    const occ = p.row.occupation || '?';
    if ((perOcc.get(occ) || 0) >= 2) continue;
    perOcc.set(occ, (perOcc.get(occ) || 0) + 1);
    out.push(p);
  }
  for (const p of uniq) {
    if (out.length >= SLOTS) break;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const d = Number(sp.get('d')), m = Number(sp.get('m')), y = Number(sp.get('y'));
  const hRaw = sp.get('h');
  const h = hRaw === null || hRaw === '' ? -1 : Number(hRaw);
  const g = sp.get('g') === 'nu' ? 'nu' : sp.get('g') === 'nam' ? 'nam' : null;

  if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12) {
    return NextResponse.json({ ok: false, error: 'Thiếu hoặc sai ngày sinh dương lịch.' }, { status: 400, headers: CORS_HEADERS });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: 'Chưa cấu hình kho dữ liệu.' }, { status: 503, headers: CORS_HEADERS });
  }

  const lunar = lunarOf(d, m, y);
  if (!lunar) {
    // Ngoài tầm bảng âm lịch — trả rỗng TỬ TẾ chứ không bịa khoá.
    return NextResponse.json(
      { ok: true, items: [], note: 'Ngày sinh nằm ngoài tầm bảng âm lịch (1900–2100).' },
      { headers: CORS_HEADERS }
    );
  }

  const t1 = `${lunar.canNam}${lunar.chiNam}|${lunar.thangAL}|${lunar.ngayAL}`;
  const t2b = h >= 0 && h <= 11 ? `${t1}|h${h}` : null;
  const t2 = t2b && g ? `${t2b}|${g}` : null;
  const t0 = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const pool: { row: Row; tier: Tier }[] = [];
  try {
    // T2/T2b KHÔNG ép có ảnh (xem `pick`); T1/T0 thì ép.
    if (t2) (await fetchTier('key_t2', t2, SLOTS, false)).forEach((row) => pool.push({ row, tier: 't2' }));
    if (t2b) (await fetchTier('key_t2b', t2b, SLOTS, false)).forEach((row) => pool.push({ row, tier: 't2b' }));
    if (pool.length < SLOTS) (await fetchTier('key_t1', t1, SLOTS * 3, true)).forEach((row) => pool.push({ row, tier: 't1' }));
    if (pool.length < SLOTS) (await fetchTier('key_t0', t0, SLOTS * 3, true)).forEach((row) => pool.push({ row, tier: 't0' }));
  } catch (e) {
    // Best-effort: mục này KHÔNG được làm hỏng bản luận giải phía trên.
    console.error('[cung-ngay-sinh]', e);
    return NextResponse.json({ ok: true, items: [] }, { headers: CORS_HEADERS });
  }

  const { anhCho, commonsFilePage } = celebPhoto();

  const items = pick(pool).map(({ row, tier }) => {
    const anh = anhCho(row);
    return {
      ten: row.name,
      nghe: row.occupation,
      quocGia: row.country,
      tang: tier,
      nhan: TIER_LABEL[tier],
      ghiChu: TIER_NOTE[tier],
      ngaySinh: row.birth_date,
      // Ngày ÂM LỊCH thật của người này — để hiện cạnh ngày dương, vì badge
      // T1/T0 tự nó không đủ giải thích "sao dương lịch không trùng khít".
      amLich: parseT1(row.key_t1),
      gioSinh: row.birth_time,
      muiGio: row.birth_tz_off,
      canhGio: row.gio_idx == null ? null : CHI[row.gio_idx],
      doTinCayGio: row.rodden,
      gioiTinh: row.gender,
      // Ảnh: bản đã kéo về Supabase Storage TRƯỚC, chưa có thì rơi về Commons.
      // Chuỗi rơi nằm trong `tools-shared/celeb-photo.js` — CÙNG file mà
      // `scripts/sync-celeb-photos.mjs` chạy. Ghép URL riêng ở đây là hai bản
      // trôi khỏi nhau, mà triệu chứng của "trôi" giống hệt "chưa đồng bộ".
      //
      // 🔢 Chú thích cũ ở đây viết "~350k ảnh × 40KB ≈ 4GB" để biện minh cho
      // việc KHÔNG kéo ảnh về. Sai hai lần: 351.294 × 40KB là 14 GB, và mẫu số
      // cũng sai — tập ảnh có thể BAO GIỜ lên hình bị chặn trên bởi số khoá T1
      // (21.379) × ứng viên mỗi khoá, tức ~2 GB. Xem `WARM_PER_KEY`.
      anh: anh.url,
      // Nguồn ảnh, để ĐO được "đã kéo về bao nhiêu %". Không có trường này thì
      // câu đó không trả lời được mà mọi thứ vẫn trông như đang chạy tốt.
      anhNguon: anh.nguon,
      // Ghi công. Hotlink thì mình chỉ DẪN tới tác phẩm; kéo về là mình PHÂN
      // PHỐI nó, nên CC BY-SA đòi ghi tác giả + license ngay trên trang.
      // Chưa đồng bộ ⇒ chưa có credit ⇒ UI lùi về link trang mô tả file.
      anhTacGia: row.image_credit,
      anhLicense: row.image_license,
      anhTrang: commonsFilePage(row.image_file),
      // Luôn trỏ tới bài EN qua trang chuyển hướng CỦA Wikidata — không phải
      // link vi.wikipedia lưu sẵn ở `wiki_url`. Lý do: `wiki_url` ưu tiên bài
      // vi (chỉ 25.905/272.783 dòng có), phần lớn KHÔNG tồn tại bài .vi nên
      // link vỡ; đi lại 350k dòng để đổi sang enTitle tốn ngang một lượt scrape
      // Wikidata mới. `Special:GoToLinkedPage/enwiki/<qid>` giải quyết bằng
      // MỘT field đã có sẵn trên mọi dòng (`qid`) — 302 sang bài EN nếu có,
      // không có thì Wikidata tự hiện trang báo "chưa có bài" (đã kiểm bằng
      // curl), không bao giờ 404 thẳng như link .vi bịa trước đây.
      lienKet: `https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/${row.qid}`,
    };
  });

  return NextResponse.json(
    { ok: true, khoa: { t1, t2b, t2, t0 }, amLich: lunar, items },
    { headers: CORS_HEADERS }
  );
}
