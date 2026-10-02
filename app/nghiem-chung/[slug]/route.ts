// app/nghiem-chung/[slug]/route.ts
// ============================================================
// Trang NGHIỆM CHỨNG một người nổi tiếng: lá số Tử Vi ↔ cuộc đời thật.
//
// 🔴 Số liệu tử vi TÍNH TỪ ENGINE ngay tại đây (cùng hàm MCP `luan_giai` /
// `van_han` dùng — deterministic, không LLM, không DB). Hồ sơ biên tập
// (`lib/nghiem-chung/ho-so/*`) KHÔNG chứa con số tử vi nào ⇒ không có bản
// chép tay để trôi khỏi engine. Bảng tổng khớp/trượt ĐẾM từ `ketLuan`.
//
// Vì sao dựng một trang riêng cho từng người mà KHÔNG phạm luật thin content
// (xem app/thu-vien/nguoi-cung-ngay-sinh/[ngay]/route.ts): mỗi hồ sơ là một
// bài đối chiếu viết tay có nguồn, không phải template rải theo 272k dòng.
// Chỉ người có hồ sơ (HO_SO viết tay hoặc data/nghiem-chung/ho-so/*.json.gz đã
// qua scripts/nghiem-chung/validate.ts) mới có trang; còn lại 404. Hồ sơ sinh
// hàng loạt chưa mở index mang `noindex` (mở theo đợt, data/nghiem-chung/indexed.txt).
// ============================================================
export const revalidate = 604800;

import { NextRequest, NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';
import { fetchThayCard, seoAsk } from '@/lib/seo/ask-box';
import { celebPhoto } from '@/lib/celeb/photo';
import { luanGiaiTool } from '@/lib/mcp/tools/luan-giai';
import { vanHanTool } from '@/lib/mcp/tools/van-han';
import { CHI_NAMES, parseGioSinh } from '@/lib/mcp/tools/_shared';
import { dem, type HoSoNghiemChung, type KetLuan } from '@/lib/nghiem-chung';
import { taiHoSo, danhMuc } from '@/lib/nghiem-chung/store';
import { banKeLaSo, banKeNam, bangTra } from '@/lib/nghiem-chung/engine-ref';
import { lasoChartHtml } from '@/lib/engine/laso';

const BASE = 'https://www.tuviminhbao.com';

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Kiểu tối thiểu của output engine mà trang này đọc ─────────
interface Sao { ten: string; sang?: string; hoa?: string }
interface CungOut { ten: string; dia_chi: string; is_than: boolean; diem: number | null; chinh_tinh: Sao[] }
interface DaiVanOut { thu_tu: number; cung: string; dia_chi: string; tuoi_tu: number; tuoi_den: number; diem: number | null; flag: string | null; chinh_tinh: Sao[] }
interface LuanGiaiOut {
  error?: string;
  tong_quan: { can_chi_nam: string; cuc: string; nap_am: string; menh: { dia_chi: string; chinh_tinh: Sao[]; diem: number | null } };
  diem_manh: { ten: string; dia_chi: string; diem: number }[];
  diem_yeu: { ten: string; dia_chi: string; diem: number }[];
  cung: CungOut[];
  dai_van: DaiVanOut[];
}
interface VanHanOut {
  error?: string;
  tuoi_mu: number;
  can_chi_nam_xem: string;
  luu_thai_tue: { cung: string; dia_chi: string } | null;
  tieu_han: { cung: string; dia_chi: string } | null;
  luu_tu_hoa: { hoa: string; sao: string; cung: string }[];
}

// Gọi thẳng `run` của tool MCP (không qua cổng key/quota — quota chỉ nằm ở
// `tool.quota`, `run` thuần engine). Key nội bộ chỉ để thoả chữ ký hàm.
const NOI_BO: Parameters<typeof luanGiaiTool.run>[1] = {
  key: 'internal:nghiem-chung', tier: 'master', label: 'nghiem-chung',
  charts_allowed: -1, backtest_years: -1, future_years: -1, active: true,
};

async function laSo(h: HoSoNghiemChung, gio: number): Promise<LuanGiaiOut | null> {
  const r = (await luanGiaiTool.run({ ngay_duong: h.sinh.ngay, gio_sinh: gio, gioi_tinh: h.gioiTinh }, NOI_BO)) as unknown as LuanGiaiOut;
  return r && !r.error ? r : null;
}

async function vanNam(h: HoSoNghiemChung, nam: number): Promise<VanHanOut | null> {
  const r = (await vanHanTool.run(
    { ngay_duong: h.sinh.ngay, gio_sinh: h.sinh.gioEngine, gioi_tinh: h.gioiTinh, nam_xem: nam },
    NOI_BO,
  )) as unknown as VanHanOut;
  return r && !r.error ? r : null;
}

const KL_NHAN: Record<KetLuan, string> = {
  khop: 'Khớp',
  'mot-phan': 'Khớp một phần',
  truot: 'Trượt',
  'chua-kiem-chung': 'Chưa kiểm chứng',
  'dang-dien-ra': 'Đang diễn ra',
};
const KL_KY: Record<KetLuan, string> = { khop: '✓', 'mot-phan': '◐', truot: '✗', 'chua-kiem-chung': '?', 'dang-dien-ra': '…' };
const badge = (k: KetLuan) => `<span class="kl kl-${k}"><span aria-hidden="true">${KL_KY[k]}</span> ${KL_NHAN[k]}</span>`;

/** Cờ điểm của engine là emoji màu — trang hiển thị bằng chấm CSS (luật icon). */
function hang(flag: string | null, diem: number | null): 'tot' | 'vua' | 'xau' | 'na' {
  if (flag === '🟢') return 'tot';
  if (flag === '🟡') return 'vua';
  if (flag === '🔴') return 'xau';
  return diem == null ? 'na' : 'vua';
}
const HANG_NHAN = { tot: 'Thuận', vua: 'Trung bình', xau: 'Kém', na: '—' };

const saoTxt = (ss: Sao[]) =>
  ss.length ? ss.map((s) => `${s.ten}${s.sang ? ` (${s.sang.toLowerCase()})` : ''}${s.hoa ? ` hóa ${s.hoa}` : ''}`).join(', ') : 'vô chính diệu';
const diemTxt = (d: number | null) => (d == null ? '—' : String(d).replace('.', ','));

const pctTxt = (n: number | null) => (n == null ? '—' : `${n}%`);

function ngayVN(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const h = taiHoSo(slug);
  if (!h) return new NextResponse('Không tìm thấy hồ sơ', { status: 404 });

  const ls = await laSo(h, h.sinh.gioEngine);
  if (!ls) return new NextResponse('Không lập được lá số', { status: 500 });

  const namSinh = Number(h.sinh.ngay.slice(0, 4));

  // Lưới lá số — CHÍNH renderer của tool Luận Giải (public/laso-chart.js), một khuôn cho mọi trang.
  // Người đã mất: năm xem = năm mất (ô giữa không hiện "97 tuổi" cho người mất năm 24 tuổi).
  const [yy, mm, dd] = h.sinh.ngay.split('-').map(Number);
  const gridHTML = lasoChartHtml(
    { day: dd, month: mm, year: yy, hourBranch: parseGioSinh(h.sinh.gioEngine), gender: h.gioiTinh, isLunar: false },
    h.ten,
    h.namMat || undefined,
  );
  const gioChi = CHI_NAMES[parseGioSinh(h.sinh.gioEngine)];
  const tuoiCon = ls.tong_quan.can_chi_nam.split(' ').pop() || '';
  const cungThan = ls.cung.find((c) => c.is_than);
  const menhSao = saoTxt(ls.tong_quan.menh.chinh_tinh);
  const diemCung = (ten: string) => ls.cung.find((c) => c.ten === ten)?.diem ?? null;

  const dBM = dem(h.banMenh);
  const dDV = dem(h.daiVan);
  const dNam = dem(h.namMoc);

  const url = `${BASE}/nghiem-chung/${h.slug}`;
  const hubUrl = `${BASE}/nghiem-chung`;
  const title = `Lá Số Tử Vi ${h.ten}: Đối Chiếu Với Cuộc Đời Thật | Tử Vi Minh Bảo`;
  const desc = `Lá số Tử Vi của ${h.ten} (sinh ${ngayVN(h.sinh.ngay)}, giờ ${gioChi}) đối chiếu từng mục với cuộc đời thật: ${pctTxt(dBM.tyLe)} nhận định về con người khớp, ${pctTxt(dDV.tyLe)} đại vận khớp. Có nguồn, ghi rõ chỗ trượt.`;

  const { commonsThumb, commonsFilePage } = celebPhoto();
  const anh = h.anhCommons ? commonsThumb(h.anhCommons, 360) : null;
  const trangAnh = h.anhCommons ? commonsFilePage(h.anhCommons) : null;
  const ogImg = `${BASE}/api/og?${new URLSearchParams({ title: `Lá số ${h.ten}`, sub: 'Tử vi đối chiếu cuộc đời thật' }).toString()}`;

  // Nguyên văn câu engine cho các dòng trỏ `laSoRef` (hồ sơ sinh hàng loạt).
  const coRef = [...h.banMenh, ...h.namMoc, ...h.daiVan].some((r) => r.laSoRef?.length);
  const ke = coRef ? await banKeLaSo(h.sinh.ngay, h.sinh.gioEngine, h.gioiTinh) : null;
  const tra = ke
    ? bangTra(ke, await Promise.all(h.namMoc.map((n) => banKeNam(h.sinh.ngay, h.sinh.gioEngine, h.gioiTinh, n.nam))))
    : new Map<string, string>();
  const goc = (refs?: string[]) => {
    const t = (refs || []).map((r) => tra.get(r)).filter(Boolean);
    return t.length ? `<span class="goc">Lá số gốc: ${t.map((x) => esc(x)).join(' · ')}</span>` : '';
  };

  const iADB = h.nguon.findIndex((n) => /astro-databank/i.test(n.url));
  const sup = (ids?: number[]) =>
    ids && ids.length ? ids.map((i) => `<a class="ref" href="#nguon-${i + 1}">[${i + 1}]</a>`).join('') : '';

  // ── Bảng 1: bản mệnh ─────────────────────────────────────
  const rowsBM = h.banMenh
    .map(
      (r) => `<tr class="r-${r.ketLuan}">
  <td data-l="Cung"><b>${esc(r.cung)}</b><span class="sub">điểm ${diemTxt(diemCung(r.cung))}/10</span></td>
  <td data-l="Lá số nói">${esc(r.laSoNoi)}${goc(r.laSoRef)}</td>
  <td data-l="Đời thật">${esc(r.doiThat)}${sup(r.nguon)}</td>
  <td data-l="Kết luận">${badge(r.ketLuan)}</td>
</tr>`,
    )
    .join('');

  // ── Bảng 2: đại vận ──────────────────────────────────────
  const rowsDV = h.daiVan
    .map((r) => {
      const dv = ls.dai_van.find((d) => d.thu_tu === r.thuTu);
      if (!dv) return '';
      const hg = hang(dv.flag, dv.diem);
      const pct = dv.diem == null ? 0 : Math.max(4, Math.min(100, dv.diem * 10));
      return `<tr class="r-${r.ketLuan}">
  <td data-l="Giai đoạn"><b>${dv.tuoi_tu}–${dv.tuoi_den} tuổi</b><span class="sub">${namSinh + dv.tuoi_tu - 1}–${namSinh + dv.tuoi_den - 1}</span></td>
  <td data-l="Đại vận"><b>${esc(dv.cung)}</b> <span class="sub-i">(${esc(dv.dia_chi)})</span><span class="sub">${esc(saoTxt(dv.chinh_tinh))}</span>
    <span class="bar bar-${hg}" role="img" aria-label="Điểm ${diemTxt(dv.diem)} trên 10, ${HANG_NHAN[hg]}"><i style="width:${pct}%"></i></span><span class="sub">${diemTxt(dv.diem)}/10 · ${HANG_NHAN[hg]}</span></td>
  <td data-l="Đời thật">${esc(r.doiThat)}${sup(r.nguon)}<span class="vi">${esc(r.vi)}</span></td>
  <td data-l="Kết luận">${badge(r.ketLuan)}</td>
</tr>`;
    })
    .join('');

  // ── Năm bước ngoặt ───────────────────────────────────────
  const vans = await Promise.all(h.namMoc.map((n) => vanNam(h, n.nam)));
  const cardsNam = h.namMoc
    .map((n, i) => {
      const v = vans[i];
      const tuHoa = v?.luu_tu_hoa?.length
        ? v.luu_tu_hoa.map((t) => `Hóa ${esc(t.hoa)} → ${esc(t.cung)}`).join(' · ')
        : '';
      return `<div class="nam r-${n.ketLuan}">
  <div class="nam-h"><span class="nam-y">${n.nam}</span>${badge(n.ketLuan)}</div>
  ${v ? `<div class="nam-meta">Năm ${esc(v.can_chi_nam_xem)} · ${v.tuoi_mu} tuổi mụ · Thái Tuế ở ${esc(v.luu_thai_tue?.cung || '—')} · tiểu hạn ở ${esc(v.tieu_han?.cung || '—')}</div>` : ''}
  <p class="nam-su"><b>Đời thật:</b> ${esc(n.suKien)}${sup(n.nguon)}</p>
  <p class="nam-ls"><b>Lá số năm đó:</b> ${esc(n.laSoNoi)}${goc(n.laSoRef)}</p>
  ${tuHoa ? `<div class="nam-th">Lưu tứ hóa: ${tuHoa}</div>` : ''}
</div>`;
    })
    .join('');

  // ── Giờ sinh sát ranh giới ───────────────────────────────
  let gioHtml = '';
  if (h.gioRanhGioi) {
    const g = h.gioRanhGioi;
    const lsB = await laSo(h, g.gioThay);
    if (lsB) {
      const dvRow = (thu: number) => {
        const a = ls.dai_van.find((d) => d.thu_tu === thu);
        const b = lsB.dai_van.find((d) => d.thu_tu === thu);
        const life = h.daiVan.find((d) => d.thuTu === thu);
        if (!a || !b) return '';
        const ha = hang(a.flag, a.diem);
        const hb = hang(b.flag, b.diem);
        return `<tr><td data-l="Giai đoạn"><b>${a.tuoi_tu}–${a.tuoi_den} tuổi</b><span class="sub">${namSinh + a.tuoi_tu - 1}–${namSinh + a.tuoi_den - 1}</span></td>
<td data-l="Giờ ${esc(gioChi)}"><span class="dot dot-${ha}"></span>${diemTxt(a.diem)} · ${esc(a.cung)}</td>
<td data-l="Giờ ${esc(g.tenGioThay)}"><span class="dot dot-${hb}"></span>${diemTxt(b.diem)} · ${esc(b.cung)}</td>
<td data-l="Đời thật">${esc(life?.doiThat || '')}</td></tr>`;
      };
      gioHtml = `<section class="sec" id="gio-sinh">
  <h2>Giờ sinh nằm sát ranh giới: giờ ${esc(gioChi)} hay giờ ${esc(g.tenGioThay)}?</h2>
  <p>${esc(g.lyDo)}</p>
  <div class="tbl-wrap"><table class="tbl tbl-gio">
    <thead><tr><th>Giai đoạn</th><th>Giờ ${esc(gioChi)}</th><th>Giờ ${esc(g.tenGioThay)}</th><th>Đời thật</th></tr></thead>
    <tbody>
      <tr><td data-l="Giai đoạn"><b>Cung Mệnh</b></td><td data-l="Giờ ${esc(gioChi)}">${esc(ls.tong_quan.menh.dia_chi)} · ${esc(menhSao)}</td><td data-l="Giờ ${esc(g.tenGioThay)}">${esc(lsB.tong_quan.menh.dia_chi)} · ${esc(saoTxt(lsB.tong_quan.menh.chinh_tinh))}</td><td data-l="Đời thật">—</td></tr>
      ${g.soDaiVan.map(dvRow).join('')}
    </tbody>
  </table></div>
  <p class="note">${esc(g.ketLuan)}</p>
</section>`;
    }
  }

  // ── FAQ: câu dữ kiện SINH TỪ ENGINE + câu biên tập ───────
  const faqs = [
    {
      q: `${h.ten} sinh năm nào, giờ nào, tuổi con gì?`,
      a: `${h.ten} sinh ngày ${ngayVN(h.sinh.ngay)} lúc ${h.sinh.gio} tại ${h.sinh.noi} (Astro-Databank xếp hạng ${h.sinh.rodden}). Năm sinh âm lịch là ${ls.tong_quan.can_chi_nam} — tuổi ${tuoiCon}; giờ sinh theo đồng hồ thuộc giờ ${gioChi}.`,
    },
    {
      q: `Lá số tử vi của ${h.ten} mệnh gì?`,
      a: `Cung Mệnh an tại ${ls.tong_quan.menh.dia_chi} với chính tinh ${menhSao}; cung Thân cư ${cungThan ? `${cungThan.ten} (${cungThan.dia_chi})` : '—'}; ${ls.tong_quan.cuc}. Cung mạnh nhất là ${ls.diem_manh[0]?.ten}, yếu nhất là ${ls.diem_yeu[0]?.ten}.`,
    },
    ...h.faq,
  ];

  const ngayHT = ngayVN(h.sinh.ngay);
  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `Lá số Tử Vi ${h.ten}: đối chiếu với cuộc đời thật`,
      description: desc,
      url,
      mainEntityOfPage: url,
      image: anh || ogImg,
      inLanguage: 'vi',
      datePublished: h.ngayDang,
      dateModified: h.ngayCapNhat,
      author: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
      about: {
        '@type': 'Person',
        name: h.ten,
        birthDate: h.sinh.ngay,
        birthPlace: { '@type': 'Place', name: h.sinh.noi },
        jobTitle: h.ngheNghiep,
        sameAs: h.sameAs,
        ...(anh ? { image: anh } : {}),
      },
      citation: h.nguon.map((n) => ({ '@type': 'CreativeWork', name: n.ten, url: n.url })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Nghiệm Chứng', item: hubUrl },
        { '@type': 'ListItem', position: 3, name: h.ten, item: url },
      ],
    },
  ]).replace(/</g, '\\u003c');

  const ask = seoAsk({
    fam: 'nghiem-chung',
    thay: await fetchThayCard('co-nguyet'),
    title: '',
    endTitle: `Lá số của bạn sẽ khớp đến đâu? Hỏi thầy ngay`,
    chips: [
      { q: 'Thầy xem lá số giúp tôi: tôi hợp nghề gì?', laso: true },
      { q: 'Đại vận hiện tại của tôi thuận hay nghịch?', laso: true },
      { q: 'Năm nay của tôi nên chú ý điều gì?', laso: true },
    ],
    prefix: `Đọc hồ sơ ${h.ten}`,
  });

  // Liên kết chéo: 6 hồ sơ kề bên trong danh mục (ổn định giữa các lần dựng).
  const dm = danhMuc();
  const viTri = Math.max(0, dm.findIndex((x) => x.slug === h.slug));
  const khac = [1, 2, 3, -1, -2, -3]
    .map((k) => dm[(viTri + k + dm.length) % dm.length])
    .filter((x, i, a) => x && x.slug !== h.slug && a.findIndex((y) => y?.slug === x.slug) === i)
    .slice(0, 6);

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="article:published_time" content="${h.ngayDang}">
<meta property="article:modified_time" content="${h.ngayCapNhat}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImg)}">
<meta name="robots" content="${h.indexed === false ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preload" href="/fonts/noto-serif-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/noto-serif-vietnamese-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/noto-serif.css?v=1" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/fonts/noto-serif.css?v=1"></noscript>
<link rel="stylesheet" href="/laso-chart.css?v=7">
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#0F2A3D;--navy-2:#1b4262;--gold:#7C6942;--gold-b:#C8A96A;--text:#1a1a1a;--mid:#444;--lt:#6b6b6b;--border:#D8D4CB;--blt:#E8E4DA;--bg:#FFFFFF;--soft:#F7F5EF;--ok:#2F7D4F;--ok-bg:#E7F3EC;--half:#9A6B12;--half-bg:#FBF1DC;--bad:#A8352B;--bad-bg:#F9E5E2;--na:#6b6b6b;--na-bg:#EFEDE8;--serif:'Noto Serif',Georgia,serif}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--navy)}
.bc{background:var(--soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--lt);display:flex;gap:8px;flex-wrap:wrap}
.bc a{color:var(--lt);text-decoration:none}.bc a:hover{color:var(--navy)}.bc span{color:var(--border)}
.wrap{max-width:980px;margin:0 auto;padding:40px 40px 80px}
.hero{display:grid;grid-template-columns:150px 1fr;gap:28px;align-items:start;margin-bottom:28px}
.hero-img{width:150px;height:150px;border-radius:14px;object-fit:cover;object-position:top;border:1px solid var(--blt);background:var(--soft);display:block}
.hero-ph{display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:54px;color:var(--gold);font-weight:600}
.hero-cap{font-size:11px;color:var(--lt);margin-top:6px;line-height:1.35}.hero-cap a{color:var(--lt)}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:2.4px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
h1{font-family:var(--serif);font-size:32px;line-height:1.25;color:var(--navy);font-weight:600;margin-bottom:10px}
.lede{font-size:15px;color:var(--mid);margin-bottom:14px}
.facts{display:flex;flex-wrap:wrap;gap:8px}
.fact{font-size:12.5px;background:var(--soft);border:1px solid var(--blt);border-radius:999px;padding:4px 12px;color:var(--mid)}
.fact b{color:var(--navy)}
.answer{background:linear-gradient(140deg,var(--navy) 0%,var(--navy-2) 100%);color:#fff;border-radius:16px;padding:24px 26px;margin:8px 0 34px;border:1px solid var(--gold-b)}
.answer h2{font-family:var(--serif);font-size:19px;font-weight:600;margin-bottom:10px;color:#fff}
.answer p{font-size:15.5px;line-height:1.7;color:#E9EEF3}
.score{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}
.sc{background:rgba(255,255,255,.08);border:1px solid rgba(200,169,106,.45);border-radius:12px;padding:12px 14px}
.sc-n{font-family:var(--serif);font-size:34px;font-weight:600;color:var(--gold-b);line-height:1.1}
.sc-n small{font-size:15px;color:#cfd8e0;font-weight:400}
.sc-l{font-size:12.5px;color:#cfd8e0;margin-top:4px}
.sc-d{font-size:11.5px;color:#aebccb;margin-top:2px}
.sc-note{font-size:12px!important;color:#aebccb!important;margin-top:12px}.sc-note a{color:var(--gold-b)}
.sec{margin-top:44px}
.sec h2{font-family:var(--serif);font-size:23px;color:var(--navy);font-weight:600;line-height:1.35;margin-bottom:10px}
.sec>p{color:var(--mid);margin-bottom:14px}
.ls-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:6px}
.ls-i{background:var(--soft);border:1px solid var(--blt);border-radius:10px;padding:10px 12px}
.ls-k{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--lt)}
.ls-v{font-size:14px;color:var(--navy);font-weight:600;margin-top:2px;line-height:1.4}
.tbl-wrap{border:1px solid var(--blt);border-radius:14px;overflow:hidden}
.tbl{width:100%;border-collapse:collapse;font-size:14.5px;line-height:1.55}
.tbl th{background:var(--soft);text-align:left;font-size:11.5px;letter-spacing:1px;text-transform:uppercase;color:var(--lt);font-weight:600;padding:11px 14px;border-bottom:1px solid var(--blt)}
.tbl td{padding:14px;border-bottom:1px solid var(--blt);vertical-align:top;color:var(--mid)}
.tbl tr:last-child td{border-bottom:0}
.tbl td b{color:var(--navy)}
.tbl .sub{display:block;font-size:12px;color:var(--lt);margin-top:2px}
.tbl .sub-i{font-size:12px;color:var(--lt)}
.tbl .vi{display:block;font-size:12.5px;color:var(--lt);margin-top:6px;font-style:italic}
.tbl td:first-child{width:150px}.tbl td:last-child{width:150px}
.tbl-gio td:last-child{width:auto}
.tbl-gio td:nth-child(2),.tbl-gio td:nth-child(3){width:180px}
.r-chua-kiem-chung td,.r-dang-dien-ra td{background:#FCFBF8}
.kl{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;border-radius:999px;padding:3px 10px;white-space:nowrap}
.kl-khop{color:var(--ok);background:var(--ok-bg)}
.kl-mot-phan{color:var(--half);background:var(--half-bg)}
.kl-truot{color:var(--bad);background:var(--bad-bg)}
.kl-chua-kiem-chung,.kl-dang-dien-ra{color:var(--na);background:var(--na-bg)}
.bar{display:block;height:6px;border-radius:6px;background:var(--blt);margin-top:8px;overflow:hidden;max-width:160px}
.bar i{display:block;height:100%;border-radius:6px}
.bar-tot i{background:var(--ok)}.bar-vua i{background:#C8A24A}.bar-xau i{background:var(--bad)}.bar-na i{background:var(--na)}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:1px}
.dot-tot{background:var(--ok)}.dot-vua{background:#C8A24A}.dot-xau{background:var(--bad)}.dot-na{background:var(--na)}
.ref{font-size:11px;text-decoration:none;color:var(--gold);margin-left:2px;vertical-align:super}
.nam-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.nam{border:1px solid var(--blt);border-radius:14px;padding:16px 18px;background:#fff}
.nam-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.nam-y{font-family:var(--serif);font-size:26px;font-weight:600;color:var(--navy)}
.nam-meta{font-size:12px;color:var(--lt);margin-bottom:10px}
.nam p{font-size:14px;color:var(--mid);margin-bottom:6px}
.nam p b{color:var(--navy)}
.nam-th{font-size:12px;color:var(--gold);margin-top:6px}
.goc{display:block;font-size:12px;color:var(--lt);margin-top:6px;font-style:italic}
.note{background:var(--soft);border-left:3px solid var(--gold-b);padding:14px 18px;margin-top:14px;font-size:14.5px;color:var(--mid)}
.prose p{color:var(--mid);margin-bottom:12px}
.method{font-size:14px;color:var(--mid)}
.method li{margin:0 0 6px 18px}
.src{font-size:13px;color:var(--mid)}
.src li{margin:0 0 6px 22px}
.faq-i{border-top:1px solid var(--blt);padding:14px 0}
.faq-q{font-weight:600;color:var(--navy);font-size:15px;margin-bottom:4px}
.faq-a{font-size:14.5px;color:var(--mid)}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}
.btn{display:inline-block;text-decoration:none;font-weight:600;font-size:14.5px;border-radius:10px;padding:12px 20px}
.btn-p{background:var(--navy);color:#fff}.btn-p:hover{background:var(--navy-2)}
.btn-s{border:1px solid var(--border);color:var(--navy);background:#fff}
.disc{font-size:12.5px;color:var(--lt);margin-top:34px;border-top:1px solid var(--blt);padding-top:16px}
@media(max-width:760px){
.bc,.wrap{padding-left:16px;padding-right:16px}.wrap{padding-top:24px}
.hero{grid-template-columns:96px 1fr;gap:16px}.hero-img{width:96px;height:96px}
h1{font-size:24px}.score{grid-template-columns:1fr}.ls-grid{grid-template-columns:repeat(2,1fr)}.nam-grid{grid-template-columns:1fr}
.tbl thead{display:none}.tbl,.tbl tbody,.tbl tr,.tbl td{display:block;width:100%!important}
.tbl tr{border-bottom:1px solid var(--blt);padding:6px 0}.tbl tr:last-child{border-bottom:0}
.tbl td{border:0;padding:6px 14px}
.tbl td::before{content:attr(data-l);display:block;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:var(--lt);margin-bottom:2px}
}
.laso-wrap{margin:6px 0 16px;--navy:#0F2A3D;--gold:#C8A96A;--blue:#1455A4;--text-lt:#666666}
${ask.css}
</style>
<script src="/auth.js?v=6"></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=45" defer></script>
<nav class="bc" aria-label="Breadcrumb">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="${hubUrl}">Nghiệm Chứng</a><span>›</span>
  <span>${esc(h.ten)}</span>
</nav>
<article class="wrap">
  <header class="hero">
    <div>
      ${anh ? `<img class="hero-img" src="${esc(anh)}" alt="Chân dung ${esc(h.ten)}" width="150" height="150">` : `<div class="hero-img hero-ph">${esc(h.ten.slice(0, 1))}</div>`}
      ${trangAnh ? `<div class="hero-cap">Ảnh: <a href="${esc(trangAnh)}" rel="noopener nofollow" target="_blank">Wikimedia Commons</a> — tác giả &amp; giấy phép tại trang gốc</div>` : ''}
    </div>
    <div>
      <div class="eyebrow">Nghiệm Chứng · Lá số người nổi tiếng</div>
      <h1>Lá số Tử Vi ${esc(h.ten)}: đối chiếu với cuộc đời thật</h1>
      <p class="lede">${esc(h.moTaNgan)}.</p>
      <div class="facts">
        <span class="fact">Sinh <b>${ngayHT}</b> · ${esc(h.sinh.gio)} · ${esc(h.sinh.noi)}</span>
        <span class="fact">Giờ <b>${esc(gioChi)}</b> · tuổi <b>${esc(ls.tong_quan.can_chi_nam)}</b></span>
        <span class="fact">Dữ liệu giờ sinh: <b>Rodden ${h.sinh.rodden}</b>${sup(iADB >= 0 ? [iADB] : [])}</span>${h.namMat ? `<span class="fact">Mất năm <b>${h.namMat}</b></span>` : ''}
      </div>
    </div>
  </header>

  <section class="answer" aria-labelledby="tl">
    <h2 id="tl">Lá số của ${esc(h.ten)} đoán đúng đến đâu?</h2>
    <p>${esc(h.traLoiNgan)}</p>
    <div class="score">
      <div class="sc"><div class="sc-n">${pctTxt(dBM.tyLe)}</div><div class="sc-l">nhận định về con người khớp</div><div class="sc-d">${dBM.khop} khớp · ${dBM.motPhan} khớp một phần · ${dBM.truot} trượt</div></div>
      <div class="sc"><div class="sc-n">${pctTxt(dDV.tyLe)}</div><div class="sc-l">đại vận 10 năm khớp</div><div class="sc-d">${dDV.khop} khớp · ${dDV.motPhan} khớp một phần · ${dDV.truot} trượt</div></div>
      <div class="sc"><div class="sc-n">${pctTxt(dNam.tyLe)}</div><div class="sc-l">năm bước ngoặt khớp</div><div class="sc-d">${dNam.khop} khớp · ${dNam.motPhan} khớp một phần · ${dNam.truot} trượt</div></div>
    </div>
    <p class="sc-note">Tỷ lệ = mục khớp hoặc khớp một phần trên số mục kiểm chứng được; mục chưa có nguồn không tính. <a href="#phuong-phap">Cách chấm</a></p>
  </section>

  <section class="sec" id="tieu-su">
    <h2>${esc(h.ten)} là ai?</h2>
    <div class="prose">${h.tieuSu.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  </section>

  <section class="sec" id="la-so">
    <h2>Lá số Tử Vi của ${esc(h.ten)} tóm tắt</h2>
    <p>Lập theo ngày ${ngayHT}, giờ ${esc(gioChi)} (${esc(h.sinh.gio)} giờ đồng hồ), ${h.gioiTinh === 'nam' ? 'nam' : 'nữ'} mệnh.</p>
    ${gridHTML ? `<div class="laso-wrap">${gridHTML}</div>` : ''}
    <div class="ls-grid">
      <div class="ls-i"><div class="ls-k">Năm sinh</div><div class="ls-v">${esc(ls.tong_quan.can_chi_nam)}</div></div>
      <div class="ls-i"><div class="ls-k">Cục</div><div class="ls-v">${esc(ls.tong_quan.cuc)}</div></div>
      <div class="ls-i"><div class="ls-k">Cung Mệnh</div><div class="ls-v">${esc(ls.tong_quan.menh.dia_chi)} · ${esc(menhSao)}</div></div>
      <div class="ls-i"><div class="ls-k">Cung Thân</div><div class="ls-v">${cungThan ? `${esc(cungThan.dia_chi)} · cư ${esc(cungThan.ten)}` : '—'}</div></div>
      <div class="ls-i"><div class="ls-k">Cung mạnh nhất</div><div class="ls-v">${esc(ls.diem_manh[0]?.ten)} (${diemTxt(ls.diem_manh[0]?.diem ?? null)})</div></div>
      <div class="ls-i"><div class="ls-k">Cung mạnh nhì</div><div class="ls-v">${esc(ls.diem_manh[1]?.ten)} (${diemTxt(ls.diem_manh[1]?.diem ?? null)})</div></div>
      <div class="ls-i"><div class="ls-k">Cung yếu nhất</div><div class="ls-v">${esc(ls.diem_yeu[0]?.ten)} (${diemTxt(ls.diem_yeu[0]?.diem ?? null)})</div></div>
      <div class="ls-i"><div class="ls-k">Mệnh nạp âm</div><div class="ls-v">${esc(ls.tong_quan.nap_am.split(' (')[0])}</div></div>
    </div>
  </section>

  <section class="sec" id="con-nguoi">
    <h2>Bảng 1 — Lá số nói gì về con người, đời thật ra sao</h2>
    <p>Mỗi dòng là một nhận định của lá số, đặt cạnh sự thật có nguồn. Mục nào không có nguồn công khai, chúng tôi ghi "chưa kiểm chứng" thay vì cố gán.</p>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Cung</th><th>Lá số nói</th><th>Đời thật</th><th>Kết luận</th></tr></thead>
      <tbody>${rowsBM}</tbody>
    </table></div>
  </section>

  <section class="sec" id="dai-van">
    <h2>Bảng 2 — Chu trình cuộc đời: mười năm một đại vận</h2>
    <p>Điểm đại vận (thang 10) do hệ thống chấm theo cổ pháp, trước khi nhìn vào đời thật. Một đại vận "khớp" khi điểm cao rơi vào giai đoạn thuận và điểm thấp rơi vào giai đoạn khó.</p>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Giai đoạn</th><th>Đại vận &amp; điểm</th><th>Đời thật</th><th>Kết luận</th></tr></thead>
      <tbody>${rowsDV}</tbody>
    </table></div>
  </section>

  <section class="sec" id="nam-buoc-ngoat">
    <h2>Những năm bước ngoặt: lá số có "bắt" được không?</h2>
    <p>Xét vận từng năm (lưu niên) ở đúng những năm đời ${h.gioiTinh === 'nam' ? 'ông' : 'bà'} rẽ hướng.</p>
    <div class="nam-grid">${cardsNam}</div>
  </section>

  ${gioHtml}

  <section class="sec" id="ket-luan">
    <h2>Nhận xét của ban biên tập</h2>
    <div class="prose">${h.ketLuanBienTap.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="cta">
      <a class="btn btn-p" href="/app/luan-giai">Lập lá số của bạn</a>
      <a class="btn btn-s" href="/phuong-phap">Xem phương pháp Nghiệm Chứng</a>
    </div>
  </section>

  <section class="sec" id="phuong-phap">
    <h2>Cách chúng tôi đối chiếu</h2>
    <ul class="method">
      <li><b>Giờ sinh có kiểm chứng:</b> chỉ chọn người có giờ sinh xếp hạng Rodden AA hoặc A trên Astro-Databank.</li>
      <li><b>Lá số chấm trước, đời thật đặt sau:</b> cung, sao, điểm và đại vận do hệ thống an sao tính theo cổ pháp; không chỉnh lá số cho vừa đời thật.</li>
      <li><b>Mỗi sự thật một nguồn:</b> chỉ dùng sự kiện công khai, có trích dẫn. Không suy đoán về sức khỏe, hôn nhân hay đời tư người đang sống.</li>
      <li><b>Cách tính tỷ lệ khớp:</b> mỗi dòng được chấm khớp, khớp một phần hoặc trượt. Tỷ lệ = (khớp + khớp một phần) / số dòng đã chấm — vì Tử Vi luận theo khuynh hướng, một nhận định đúng về hướng dù chưa đúng mọi chi tiết vẫn được tính là khớp. Mục chưa có nguồn và giai đoạn đang diễn ra không tính.</li>
      <li><b>Ghi cả chỗ trượt:</b> tỷ lệ được đếm thẳng từ từng dòng, kể cả những dòng lá số đoán sai.</li>
    </ul>
  </section>

  <section class="sec" id="faq">
    <h2>Câu hỏi thường gặp</h2>
    ${faqs.map((f) => `<div class="faq-i"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
  </section>

  <section class="sec" id="nguon">
    <h2>Nguồn</h2>
    <ol class="src">${h.nguon.map((n, i) => `<li id="nguon-${i + 1}"><a href="${esc(n.url)}" rel="noopener nofollow" target="_blank">${esc(n.ten)}</a></li>`).join('')}</ol>
  </section>

  ${khac.length ? `<section class="sec"><h2>Hồ sơ nghiệm chứng khác</h2><ul class="src">${khac.map((x) => `<li><a href="/nghiem-chung/${esc(x.slug)}">Lá số Tử Vi ${esc(x.ten)}</a></li>`).join('')}</ul></section>` : ''}

  ${ask.end}

  <p class="disc">Cập nhật ${ngayVN(h.ngayCapNhat)}.${h.wiki ? ` Phần đời thật được tóm lược và dịch từ <a href="${esc(h.wiki.url)}" rel="noopener nofollow" target="_blank">Wikipedia (${esc(h.wiki.lang)})</a>, giấy phép CC BY-SA.` : ''} Tử Vi là một hệ thống luận đoán cổ truyền; trang này đối chiếu nó với dữ kiện công khai để người đọc tự đánh giá, không nhằm phán xét hay dự đoán về đời tư của người được nhắc tới.</p>
</article>
${ask.tail}
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
    },
  });
}
