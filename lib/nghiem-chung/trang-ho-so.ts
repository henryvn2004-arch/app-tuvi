// lib/nghiem-chung/trang-ho-so.ts — dựng trang một hồ sơ cho CẢ HAI mục:
// /nghiem-chung/<slug> (giờ sinh kiểm chứng) và /xac-dinh-gio-sinh/<slug> (giờ do hệ thống XÁC ĐỊNH, không phải giờ khai sinh).
// Tách khỏi route 2026-10-02 để hai mục dùng chung một khuôn.
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
import { NextResponse } from 'next/server';
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
import { DEFAULT_LOCALE, HREFLANG, LOCALES, localePrefix, type Locale } from '@/lib/i18n/locales';
import { term, termAny, localizeText, type GlossaryLocale } from '@/lib/i18n/glossary';
import { chuoi, fmt, type Chuoi } from './chuoi';
import { applyProse, extractProse, hashProse, thieuKhoa, type NcLocale } from './i18n/prose';
import { dbTaiBanDich, dbNgonNguCuaSlug, dbDanhMucDich } from './i18n/db';

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

const KL_KY: Record<KetLuan, string> = { khop: '✓', 'mot-phan': '◐', truot: '✗', 'chua-kiem-chung': '?', 'dang-dien-ra': '…' };
const klNhan = (L: Chuoi): Record<KetLuan, string> => ({
  khop: L.klKhop,
  'mot-phan': L.klMotPhan,
  truot: L.klTruot,
  'chua-kiem-chung': L.klChua,
  'dang-dien-ra': L.klDang,
});

/** Cờ điểm của engine là emoji màu — trang hiển thị bằng chấm CSS (luật icon). */
function hang(flag: string | null, diem: number | null): 'tot' | 'vua' | 'xau' | 'na' {
  if (flag === '🟢') return 'tot';
  if (flag === '🟡') return 'vua';
  if (flag === '🔴') return 'xau';
  return diem == null ? 'na' : 'vua';
}

const pctTxt = (n: number | null) => (n == null ? '—' : `${n}%`);

/** Tên cung/sao/can chi do ENGINE trả (tiếng Việt) → ngôn ngữ trang. `vi` giữ nguyên chữ engine. */
function dichEngine(locale: Locale) {
  const g = locale === 'vi' ? null : (locale as GlossaryLocale);
  const L = chuoi(locale);
  const T = (kind: string, vi: string) => (g ? term(g, kind, vi) : vi);
  const saoTxt = (ss: Sao[]) =>
    ss.length
      ? ss
          .map(
            (s) =>
              `${g ? termAny(g, s.ten, ['chinh', 'sao']) : s.ten}${
                s.sang ? ` (${g ? term(g, 'sang', s.sang) : s.sang.toLowerCase()})` : ''
              }${s.hoa ? fmt(L.hoaSuf, { hoa: T('tuhoa', s.hoa) }) : ''}`,
          )
          .join(', ')
      : L.voChinh;
  /**
   * Cột "Cung Mệnh" của bảng 12 giờ do MÁY sinh, dạng cố định: `Mệnh <chi>: <sao> (<độ sáng>)[, …] [hóa <Tứ hóa>]` hoặc
   * `Mệnh <chi>: vô chính diệu`. Phân tích đúng khuôn rồi đổi từng mảnh qua bảng thuật ngữ; lệch khuôn thì lùi về dò thuật ngữ.
   */
  const chuoiMay = (x: string) => {
    if (!g) return x;
    const m = x.match(/^Mệnh (\S+):\s*(.*)$/);
    if (!m) return localizeText(g, x);
    const dau = `${term(g, 'cung', 'Mệnh')} ${T('chi', m[1])}`;
    const mon = m[2].split(/,\s*/).map((p) => {
      if (/^vô chính diệu$/i.test(p.trim())) return L.voChinh;
      const q = p.match(/^([^()]+?)\s*(?:\(([^)]+)\))?\s*(?:hóa\s+(\S+))?$/);
      if (!q) return localizeText(g, p);
      const sang = q[2] ? ` (${term(g, 'sang', q[2][0].toUpperCase() + q[2].slice(1))})` : '';
      const hoa = q[3] ? fmt(L.hoaSuf, { hoa: T('tuhoa', q[3]) }) : '';
      return `${termAny(g, q[1].trim(), ['chinh', 'sao'])}${sang}${hoa}`;
    });
    return `${dau}: ${mon.join(', ')}`;
  };
  const diemTxt = (d: number | null) => (d == null ? '—' : locale === 'vi' ? String(d).replace('.', ',') : String(d));
  return { T, saoTxt, chuoiMay, diemTxt };
}

/** Mẫu tên nguồn cố định của generator ('… — dữ liệu giờ sinh (…)', '… — ngày sinh (giờ sinh không công bố; …)') → ngôn ngữ trang. Tên bài Wikipedia giữ nguyên. */
function nguonTen(ten: string, L: Chuoi): string {
  return ten
    .replace('ngày sinh (giờ sinh không công bố; giờ trong bài là giờ do hệ thống xác định)', L.nguonNgayXacDinh)
    .replace('ngày sinh (giờ sinh không công bố; giờ trong bài là suy đoán)', L.nguonNgaySuyDoan)
    .replace('dữ liệu giờ sinh', L.nguonGio);
}

function ngayHienThi(iso: string, L: Chuoi): string {
  const [y, m, d] = iso.split('-');
  return fmt(L.ngay, { y, m, d, mn: Number(m), dn: Number(d) });
}

/** Chồng font hệ thống cho CJK (không tải webfont — font CJK đầy đủ là việc khung W4). vi/en: rỗng ⇒ trang tiếng Việt không đổi byte nào. */
const cjk = (sans: string, serif: string) => `body{font-family:Arial,${sans},sans-serif}:root{--serif:'Noto Serif',${serif},serif}\n`;
export const CJK_CSS: Record<Locale, string> = {
  vi: '',
  en: '',
  ja: cjk('"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic","Meiryo"', '"Hiragino Mincho ProN","Yu Mincho"'),
  ko: cjk('"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR"', '"Noto Serif KR","Batang"'),
  'zh-tw': cjk('"PingFang TC","Microsoft JhengHei","Noto Sans TC"', '"Songti TC","PMingLiU"'),
  'zh-cn': cjk('"PingFang SC","Microsoft YaHei","Noto Sans SC"', '"Songti SC","SimSun"'),
};

export type Muc = 'nghiem-chung' | 'xac-dinh-gio-sinh';

export async function trangHoSo(slug: string, muc: Muc, locale: Locale = DEFAULT_LOCALE): Promise<Response> {
  const L = chuoi(locale);
  const pre = localePrefix(locale);
  const hGoc = await taiHoSo(slug);
  // Ngôn ngữ ngoài `vi`: CHỈ render khi có bản dịch ĐÃ DUYỆT, đủ khoá và còn khớp văn xuôi gốc (source_hash);
  // không thì 404 — tuyệt đối không lùi về chữ Việt (hợp đồng W6, và để hreflang không trỏ vào trang rỗng).
  let h = hGoc;
  if (hGoc && locale !== 'vi') {
    const nc = locale as NcLocale;
    const tr = await dbTaiBanDich(slug, nc);
    const src = extractProse(hGoc);
    h = tr && tr.sourceHash === hashProse(src) && thieuKhoa(src, tr).length === 0 ? applyProse(hGoc, tr) : null;
    // Tên nguồn do hệ thống đặt theo mẫu cố định ("… — dữ liệu giờ sinh (Rodden A)") ⇒ đổi bằng chữ khung, không bắt người dịch dịch lại.
    if (h) h.nguon = h.nguon.map((n) => ({ ...n, ten: nguonTen(n.ten, L) }));
  }
  if (!h) {
    return new NextResponse(L.notFound, { status: 404, headers: locale === 'vi' ? {} : { 'X-Robots-Tag': 'noindex' } });
  }
  const dich = dichEngine(locale);
  const { T, saoTxt, chuoiMay, diemTxt } = dich;
  const nhan = klNhan(L);
  const badge = (k: KetLuan) => `<span class="kl kl-${k}"><span aria-hidden="true">${KL_KY[k]}</span> ${nhan[k]}</span>`;
  const HANG_NHAN = { tot: L.hangTot, vua: L.hangVua, xau: L.hangXau, na: '—' };
  // Mỗi hồ sơ thuộc ĐÚNG một mục: giờ do hệ thống xác định ở /xac-dinh-gio-sinh, giờ kiểm chứng ở /nghiem-chung.
  const mucDung: Muc = h.gioDoan ? 'xac-dinh-gio-sinh' : 'nghiem-chung';
  if (muc !== mucDung) return new NextResponse(null, { status: 308, headers: { Location: `${pre}/${mucDung}/${h.slug}` } });
  const tenMuc = h.gioDoan ? L.mucGd : L.mucNc;
  // Ngôn ngữ đã có bản dịch của hồ sơ này → hreflang (chỉ bản ĐANG CÓ; x-default → vi).
  const coDich = await dbNgonNguCuaSlug(h.slug);
  // Cờ index lấy từ MANIFEST (ngưỡng + indexed.txt), không từ file hồ sơ — validate.ts luôn ghi `indexed:false`.
  const moIndex = h.indexed !== false || !!(await danhMuc()).find((x) => x.slug === h.slug)?.indexed;

  const ls = await laSo(h, h.sinh.gioEngine);
  if (!ls) return new NextResponse(L.noChart, { status: 500 });

  const namSinh = Number(h.sinh.ngay.slice(0, 4));

  // Lưới lá số — CHÍNH renderer của tool Luận Giải (public/laso-chart.js), một khuôn cho mọi trang.
  // Người đã mất: năm xem = năm mất (ô giữa không hiện "97 tuổi" cho người mất năm 24 tuổi).
  const [yy, mm, dd] = h.sinh.ngay.split('-').map(Number);
  // Lưới lá số là renderer chung của tool Luận Giải, chữ Việt — chưa có bản đa ngôn ngữ (engine thuộc W3) nên
  // trang ngôn ngữ khác BỎ lưới thay vì phát một khối chữ Việt giữa trang Nhật/Hàn/Trung.
  const gridHTML =
    locale === 'vi'
      ? lasoChartHtml(
          { day: dd, month: mm, year: yy, hourBranch: parseGioSinh(h.sinh.gioEngine), gender: h.gioiTinh, isLunar: false },
          h.ten,
          h.namMat || undefined,
        )
      : '';
  const gioChiVi = CHI_NAMES[parseGioSinh(h.sinh.gioEngine)];
  const gioChi = T('chi', gioChiVi);
  const canChiNam = T('canchi', ls.tong_quan.can_chi_nam);
  const tuoiCon = T('chi', ls.tong_quan.can_chi_nam.split(' ').pop() || '');
  const cungThan = ls.cung.find((c) => c.is_than);
  const menhSao = saoTxt(ls.tong_quan.menh.chinh_tinh);
  const diemCung = (ten: string) => ls.cung.find((c) => c.ten === ten)?.diem ?? null;
  const ngayHT = ngayHienThi(h.sinh.ngay, L);

  const dBM = dem(h.banMenh);
  const dDV = dem(h.daiVan);
  const dNam = dem(h.namMoc);
  // Giờ do hệ thống XÁC ĐỊNH (người không có giờ sinh công khai): giờ được chọn THEO đời thật, nên trang không
  // khoe tỷ lệ khớp như phép thử độc lập — thay bằng bảng 12 giờ.
  const gd = h.gioDoan;
  const gdTin = gd ? { cao: L.tinCao, vua: L.tinVua, thap: L.tinThap }[gd.doTinCay] : '';
  const gdChon = gd ? T('chi', gd.chon) : '';

  const url = `${BASE}${pre}/${muc}/${h.slug}`;
  const hubUrl = `${BASE}${pre}/${muc}`;
  const h1 = fmt(gd ? L.h1Gd : L.h1Nc, { ten: h.ten });
  const title = `${fmt(gd ? L.titleGd : L.titleNc, { ten: h.ten })} | ${L.brand}`;
  const desc = gd
    ? fmt(L.descGd, { ten: h.ten, ngay: ngayHT, chon: gdChon, tin: gdTin })
    : fmt(L.descNc, { ten: h.ten, ngay: ngayHT, chi: gioChi, pBM: pctTxt(dBM.tyLe), pDV: pctTxt(dDV.tyLe) });
  const alt = [...new Set<Locale>(['vi', ...coDich])]
    .filter((l): l is Locale => (LOCALES as readonly string[]).includes(l))
    .sort((x, y) => LOCALES.indexOf(x) - LOCALES.indexOf(y));
  const hreflang = coDich.length
    ? alt.map((l) => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${BASE}${localePrefix(l)}/${muc}/${h.slug}">`).join('\n') +
      `\n<link rel="alternate" hreflang="x-default" href="${BASE}/${muc}/${h.slug}">\n`
    : '';

  const { commonsThumb, commonsFilePage } = celebPhoto();
  const anh = h.anhCommons ? commonsThumb(h.anhCommons, 360) : null;
  const trangAnh = h.anhCommons ? commonsFilePage(h.anhCommons) : null;
  const ogImg = `${BASE}/api/og?${new URLSearchParams({ title: fmt(gd ? L.ogTitleGd : L.ogTitleNc, { ten: h.ten }), sub: gd ? L.ogSubGd : L.ogSubNc }).toString()}`;

  // Nguyên văn câu engine cho các dòng trỏ `laSoRef` (hồ sơ sinh hàng loạt).
  const coRef = locale === 'vi' && [...h.banMenh, ...h.namMoc, ...h.daiVan].some((r) => r.laSoRef?.length);
  const ke = coRef ? await banKeLaSo(h.sinh.ngay, h.sinh.gioEngine, h.gioiTinh) : null;
  const tra = ke
    ? bangTra(ke, await Promise.all(h.namMoc.map((n) => banKeNam(h.sinh.ngay, h.sinh.gioEngine, h.gioiTinh, n.nam))))
    : new Map<string, string>();
  const goc = (refs?: string[]) => {
    const t = (refs || []).map((r) => tra.get(r)).filter(Boolean);
    return t.length ? `<span class="goc">${fmt(L.gocLabel, { x: t.map((x) => esc(x)).join(' · ') })}</span>` : '';
  };

  const iADB = h.nguon.findIndex((n) => /astro-databank/i.test(n.url));
  const sup = (ids?: number[]) =>
    ids && ids.length ? ids.map((i) => `<a class="ref" href="#nguon-${i + 1}">[${i + 1}]</a>`).join('') : '';

  // ── Bảng 1: bản mệnh ─────────────────────────────────────
  const rowsBM = h.banMenh
    .map(
      (r) => `<tr class="r-${r.ketLuan}">
  <td data-l="${esc(L.thCung)}"><b>${esc(T('cung', r.cung))}</b><span class="sub">${fmt(L.diemCung, { d: diemTxt(diemCung(r.cung)) })}</span></td>
  <td data-l="${esc(L.thLaSo)}">${esc(r.laSoNoi)}${goc(r.laSoRef)}</td>
  <td data-l="${esc(L.thDoiThat)}">${esc(r.doiThat)}${sup(r.nguon)}</td>
  <td data-l="${esc(L.thKetLuan)}">${badge(r.ketLuan)}</td>
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
  <td data-l="${esc(L.thGiaiDoan)}"><b>${fmt(L.tuoiTu, { a: dv.tuoi_tu, b: dv.tuoi_den })}</b><span class="sub">${namSinh + dv.tuoi_tu - 1}–${namSinh + dv.tuoi_den - 1}</span></td>
  <td data-l="${esc(L.thDaiVanL)}"><b>${esc(T('cung', dv.cung))}</b> <span class="sub-i">(${esc(T('chi', dv.dia_chi))})</span><span class="sub">${esc(saoTxt(dv.chinh_tinh))}</span>
    <span class="bar bar-${hg}" role="img" aria-label="${esc(fmt(L.diemAria, { d: diemTxt(dv.diem), h: HANG_NHAN[hg] }))}"><i style="width:${pct}%"></i></span><span class="sub">${fmt(L.diemHang, { d: diemTxt(dv.diem), h: HANG_NHAN[hg] })}</span></td>
  <td data-l="${esc(L.thDoiThat)}">${esc(r.doiThat)}${sup(r.nguon)}<span class="vi">${esc(r.vi)}</span></td>
  <td data-l="${esc(L.thKetLuan)}">${badge(r.ketLuan)}</td>
</tr>`;
    })
    .join('');

  // ── Năm bước ngoặt ───────────────────────────────────────
  const vans = await Promise.all(h.namMoc.map((n) => vanNam(h, n.nam)));
  const cardsNam = h.namMoc
    .map((n, i) => {
      const v = vans[i];
      const tuHoa = v?.luu_tu_hoa?.length
        ? v.luu_tu_hoa.map((t) => fmt(L.hoaTo, { hoa: esc(T('tuhoa', t.hoa)), cung: esc(T('cung', t.cung)) })).join(' · ')
        : '';
      return `<div class="nam r-${n.ketLuan}">
  <div class="nam-h"><span class="nam-y">${n.nam}</span>${badge(n.ketLuan)}</div>
  ${v ? `<div class="nam-meta">${fmt(L.namMeta, { cc: esc(T('canchi', v.can_chi_nam_xem)), tuoi: v.tuoi_mu, tt: esc(v.luu_thai_tue ? T('cung', v.luu_thai_tue.cung) : '—'), th: esc(v.tieu_han ? T('cung', v.tieu_han.cung) : '—') })}</div>` : ''}
  <p class="nam-su">${fmt(L.namSu, { x: `${esc(n.suKien)}${sup(n.nguon)}` })}</p>
  <p class="nam-ls">${fmt(L.namLs, { x: `${esc(n.laSoNoi)}${goc(n.laSoRef)}` })}</p>
  ${tuHoa ? `<div class="nam-th">${fmt(L.namTh, { x: tuHoa })}</div>` : ''}
</div>`;
    })
    .join('');

  // ── Giờ sinh sát ranh giới ───────────────────────────────
  let gioHtml = '';
  if (h.gioRanhGioi) {
    const g = h.gioRanhGioi;
    const lsB = await laSo(h, g.gioThay);
    if (lsB) {
      const gioThay = T('chi', g.tenGioThay);
      const dvRow = (thu: number) => {
        const a = ls.dai_van.find((d) => d.thu_tu === thu);
        const b = lsB.dai_van.find((d) => d.thu_tu === thu);
        const life = h.daiVan.find((d) => d.thuTu === thu);
        if (!a || !b) return '';
        const ha = hang(a.flag, a.diem);
        const hb = hang(b.flag, b.diem);
        return `<tr><td data-l="${esc(L.thGiaiDoan)}"><b>${fmt(L.tuoiTu, { a: a.tuoi_tu, b: a.tuoi_den })}</b><span class="sub">${namSinh + a.tuoi_tu - 1}–${namSinh + a.tuoi_den - 1}</span></td>
<td data-l="${esc(fmt(L.gio, { g: gioChi }))}"><span class="dot dot-${ha}"></span>${diemTxt(a.diem)} · ${esc(T('cung', a.cung))}</td>
<td data-l="${esc(fmt(L.gio, { g: gioThay }))}"><span class="dot dot-${hb}"></span>${diemTxt(b.diem)} · ${esc(T('cung', b.cung))}</td>
<td data-l="${esc(L.thDoiThat)}">${esc(life?.doiThat || '')}</td></tr>`;
      };
      gioHtml = `<section class="sec" id="gio-sinh">
  <h2>${fmt(L.gioRgH, { a: esc(gioChi), b: esc(gioThay) })}</h2>
  <p>${esc(g.lyDo)}</p>
  <div class="tbl-wrap"><table class="tbl tbl-gio">
    <thead><tr><th>${L.thGiaiDoan}</th><th>${fmt(L.gio, { g: esc(gioChi) })}</th><th>${fmt(L.gio, { g: esc(gioThay) })}</th><th>${L.thDoiThat}</th></tr></thead>
    <tbody>
      <tr><td data-l="${esc(L.thGiaiDoan)}"><b>${esc(L.lsMenh)}</b></td><td data-l="${esc(fmt(L.gio, { g: gioChi }))}">${esc(T('chi', ls.tong_quan.menh.dia_chi))} · ${esc(menhSao)}</td><td data-l="${esc(fmt(L.gio, { g: gioThay }))}">${esc(T('chi', lsB.tong_quan.menh.dia_chi))} · ${esc(saoTxt(lsB.tong_quan.menh.chinh_tinh))}</td><td data-l="${esc(L.thDoiThat)}">—</td></tr>
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
      q: fmt(L.faq1Q, { ten: h.ten }),
      a: gd
        ? fmt(L.faq1AGd, { ten: h.ten, ngay: ngayHT, noi: h.sinh.noi, cc: canChiNam, tuoi: tuoiCon, chon: gdChon })
        : fmt(L.faq1ANc, { ten: h.ten, ngay: ngayHT, gio: h.sinh.gio, noi: h.sinh.noi, r: h.sinh.rodden, cc: canChiNam, tuoi: tuoiCon, chi: gioChi }),
    },
    {
      q: fmt(L.faq2Q, { ten: h.ten }),
      a: fmt(L.faq2A, {
        dc: T('chi', ls.tong_quan.menh.dia_chi),
        sao: menhSao,
        than: cungThan ? `${T('cung', cungThan.ten)} (${T('chi', cungThan.dia_chi)})` : '—',
        cuc: T('cuc', ls.tong_quan.cuc),
        manh: T('cung', ls.diem_manh[0]?.ten),
        yeu: T('cung', ls.diem_yeu[0]?.ten),
      }),
    },
    ...h.faq,
  ];

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: h1,
      description: desc,
      url,
      mainEntityOfPage: url,
      image: anh || ogImg,
      inLanguage: HREFLANG[locale],
      datePublished: h.ngayDang,
      dateModified: h.ngayCapNhat,
      author: { '@type': 'Organization', '@id': ORG_ID, name: L.brand, url: BASE },
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: L.brand, url: BASE },
      about: {
        '@type': 'Person',
        name: h.ten,
        ...(hGoc && hGoc.ten !== h.ten ? { alternateName: hGoc.ten } : {}),
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
        { '@type': 'ListItem', position: 1, name: L.home, item: `${BASE}${pre}/` },
        { '@type': 'ListItem', position: 2, name: tenMuc, item: hubUrl },
        { '@type': 'ListItem', position: 3, name: h.ten, item: url },
      ],
    },
  ]).replace(/</g, '\\u003c');

  // Ô "Hỏi Thầy" là rail tiếng Việt — ngôn ngữ khác chờ W8 (đầu ra LLM theo ngôn ngữ), nên chưa gắn.
  const ask =
    locale === 'vi'
      ? seoAsk({
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
        })
      : { css: '', end: '', tail: '' };

  // Liên kết chéo: 6 hồ sơ kề bên trong danh mục (ổn định giữa các lần dựng).
  const dmGoc = await danhMuc();
  const dm: { slug: string; ten: string }[] =
    locale === 'vi'
      ? dmGoc.filter((x) => !!x.gioDoan === !!gd)
      : (await dbDanhMucDich(locale as NcLocale)).filter((x) => !!dmGoc.find((g0) => g0.slug === x.slug)?.gioDoan === !!gd);
  const viTri = Math.max(0, dm.findIndex((x) => x.slug === h.slug));
  const khac = [1, 2, 3, -1, -2, -3]
    .map((k) => dm[(viTri + k + dm.length) % dm.length])
    .filter((x, i, a) => x && x.slug !== h.slug && a.findIndex((y) => y?.slug === x.slug) === i)
    .slice(0, 6);

  const html = `<!DOCTYPE html><html lang="${HREFLANG[locale]}"><head>
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
<meta name="robots" content="${moIndex ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
<link rel="canonical" href="${url}">
${hreflang}<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preload" href="/fonts/noto-serif-latin-400.woff2" as="font" type="font/woff2" crossorigin>
${locale === 'vi' ? '<link rel="preload" href="/fonts/noto-serif-vietnamese-400.woff2" as="font" type="font/woff2" crossorigin>\n' : ''}<link rel="preload" href="/fonts/noto-serif.css?v=1" as="style" onload="this.onload=null;this.rel='stylesheet'">
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
.tbl-doan .bar{height:8px;background:var(--blt);border-radius:4px;overflow:hidden;min-width:80px}.tbl-doan .bar i{display:block;height:100%;background:var(--gold-b)}.tbl-doan tr.r-chon td{background:var(--soft)}
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
${CJK_CSS[locale]}${ask.css}
</style>
<script src="/auth.js?v=9"></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<script src="/track.js?v=8" defer></script><script src="/nav.js?v=49" defer></script>
<nav class="bc" aria-label="Breadcrumb">
  <a href="${pre}/">${L.home}</a><span>›</span>
  <a href="${hubUrl}">${tenMuc}</a><span>›</span>
  <span>${esc(h.ten)}</span>
</nav>
<article class="wrap">
  <header class="hero">
    <div>
      ${anh ? `<img class="hero-img" src="${esc(anh)}" alt="${esc(fmt(L.anhAlt, { ten: h.ten }))}" width="150" height="150">` : `<div class="hero-img hero-ph">${esc(h.ten.slice(0, 1))}</div>`}
      ${trangAnh ? `<div class="hero-cap">${fmt(L.anhCap, { url: esc(trangAnh) })}</div>` : ''}
    </div>
    <div>
      <div class="eyebrow">${gd ? L.eyebrowGd : L.eyebrowNc}</div>
      <h1>${esc(h1)}</h1>
      <p class="lede">${esc(h.moTaNgan)}${L.dot}</p>
      <div class="facts">
        <span class="fact">${gd ? fmt(L.factSinhGd, { ngay: ngayHT, noi: esc(h.sinh.noi) }) : fmt(L.factSinhNc, { ngay: ngayHT, gio: esc(h.sinh.gio), noi: esc(h.sinh.noi) })}</span>
        <span class="fact">${fmt(gd ? L.factGioGd : L.factGioNc, { chi: esc(gioChi), cc: esc(canChiNam) })}</span>
        ${gd ? `<span class="fact">${fmt(L.factGdTin, { tin: gdTin })}</span>` : `<span class="fact">${fmt(L.factRodden, { r: h.sinh.rodden, ref: sup(iADB >= 0 ? [iADB] : []) })}</span>`}${h.namMat ? `<span class="fact">${fmt(L.factMat, { nam: h.namMat })}</span>` : ''}
      </div>
    </div>
  </header>

  ${
    gd
      ? `<section class="answer" aria-labelledby="tl">
    <h2 id="tl">${esc(fmt(L.ansGdH, { ten: h.ten }))}</h2>
    <p>${esc(h.traLoiNgan)}</p>
    <div class="score">
      ${[...gd.bang]
        .sort((a, b) => b.diem - a.diem)
        .slice(0, 3)
        .map((b, i) => `<div class="sc"><div class="sc-n">${fmt(L.gio, { g: esc(T('chi', b.gio)) })}</div><div class="sc-l">${[L.hang1, L.hang2, L.hang3][i]} · ${b.diem}/100</div><div class="sc-d">${esc(chuoiMay(b.menh))}</div></div>`)
        .join('')}
    </div>
    <p class="sc-note">${L.ansGdNote}</p>
  </section>

  <section class="sec" id="doan-gio">
    <h2>${esc(fmt(L.doanH, { ten: h.ten }))}</h2>
    <p>${esc(gd.giaiThich)}</p>
    <div class="tbl-wrap"><table class="tbl tbl-doan">
      <thead><tr><th>${L.doanTh1}</th><th>${L.doanTh2}</th><th>${L.doanTh3}</th><th>${L.doanTh4}</th></tr></thead>
      <tbody>${gd.bang
        .map(
          (b) => `<tr class="${b.gio === gd.chon ? 'r-chon' : ''}"><td data-l="${esc(L.doanTh1)}"><b>${esc(T('chi', b.gio))}</b>${b.gio === gd.chon ? `<span class="sub">${L.gioXacDinh}</span>` : ''}</td><td data-l="${esc(L.doanTh2)}">${esc(chuoiMay(b.menh))}</td><td data-l="${esc(L.doanTh3)}"><div class="bar"><i style="width:${b.diem}%"></i></div><span class="sub">${b.diem}/100</span></td><td data-l="${esc(L.doanTh4)}">${esc(b.lyDo)}</td></tr>`,
        )
        .join('')}</tbody>
    </table></div>
  </section>`
      : `  <section class="answer" aria-labelledby="tl">
    <h2 id="tl">${esc(fmt(L.ansNcH, { ten: h.ten }))}</h2>
    <p>${esc(h.traLoiNgan)}</p>
    <div class="score">
      <div class="sc"><div class="sc-n">${pctTxt(dBM.tyLe)}</div><div class="sc-l">${L.scBM}</div><div class="sc-d">${fmt(L.scDetail, { k: dBM.khop, m: dBM.motPhan, t: dBM.truot })}</div></div>
      <div class="sc"><div class="sc-n">${pctTxt(dDV.tyLe)}</div><div class="sc-l">${L.scDV}</div><div class="sc-d">${fmt(L.scDetail, { k: dDV.khop, m: dDV.motPhan, t: dDV.truot })}</div></div>
      <div class="sc"><div class="sc-n">${pctTxt(dNam.tyLe)}</div><div class="sc-l">${L.scNam}</div><div class="sc-d">${fmt(L.scDetail, { k: dNam.khop, m: dNam.motPhan, t: dNam.truot })}</div></div>
    </div>
    <p class="sc-note">${L.ansNcNote}</p>
  </section>`
  }

  <section class="sec" id="tieu-su">
    <h2>${esc(fmt(L.tieuSuH, { ten: h.ten }))}</h2>
    <div class="prose">${h.tieuSu.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  </section>

  <section class="sec" id="la-so">
    <h2>${esc(fmt(L.laSoH, { ten: h.ten }))}</h2>
    <p>${fmt(gd ? L.laSoGd : L.laSoNc, { ngay: ngayHT, chi: esc(gioChi), gio: esc(h.sinh.gio), gt: h.gioiTinh === 'nam' ? L.nam : L.nu })}</p>
    ${gridHTML ? `<div class="laso-wrap">${gridHTML}</div>` : ''}
    <div class="ls-grid">
      <div class="ls-i"><div class="ls-k">${L.lsNamSinh}</div><div class="ls-v">${esc(canChiNam)}</div></div>
      <div class="ls-i"><div class="ls-k">${L.lsCuc}</div><div class="ls-v">${esc(T('cuc', ls.tong_quan.cuc))}</div></div>
      <div class="ls-i"><div class="ls-k">${L.lsMenh}</div><div class="ls-v">${esc(T('chi', ls.tong_quan.menh.dia_chi))} · ${esc(menhSao)}</div></div>
      <div class="ls-i"><div class="ls-k">${L.lsThan}</div><div class="ls-v">${cungThan ? esc(fmt(L.thanCu, { dc: T('chi', cungThan.dia_chi), cung: T('cung', cungThan.ten) })) : '—'}</div></div>
      <div class="ls-i"><div class="ls-k">${L.lsManh1}</div><div class="ls-v">${esc(T('cung', ls.diem_manh[0]?.ten ?? ''))} (${diemTxt(ls.diem_manh[0]?.diem ?? null)})</div></div>
      <div class="ls-i"><div class="ls-k">${L.lsManh2}</div><div class="ls-v">${esc(T('cung', ls.diem_manh[1]?.ten ?? ''))} (${diemTxt(ls.diem_manh[1]?.diem ?? null)})</div></div>
      <div class="ls-i"><div class="ls-k">${L.lsYeu1}</div><div class="ls-v">${esc(T('cung', ls.diem_yeu[0]?.ten ?? ''))} (${diemTxt(ls.diem_yeu[0]?.diem ?? null)})</div></div>
      <div class="ls-i"><div class="ls-k">${L.lsNapAm}</div><div class="ls-v">${esc(T('hanh', ls.tong_quan.nap_am.split(' (')[0]))}</div></div>
    </div>
  </section>

  <section class="sec" id="con-nguoi">
    <h2>${L.bm1H}</h2>
    <p>${L.bm1P}</p>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>${L.thCung}</th><th>${L.thLaSo}</th><th>${L.thDoiThat}</th><th>${L.thKetLuan}</th></tr></thead>
      <tbody>${rowsBM}</tbody>
    </table></div>
  </section>

  <section class="sec" id="dai-van">
    <h2>${L.bm2H}</h2>
    <p>${L.bm2P}</p>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>${L.thGiaiDoan}</th><th>${L.thDaiVan}</th><th>${L.thDoiThat}</th><th>${L.thKetLuan}</th></tr></thead>
      <tbody>${rowsDV}</tbody>
    </table></div>
  </section>

  <section class="sec" id="nam-buoc-ngoat">
    <h2>${L.namH}</h2>
    <p>${fmt(L.namP, { ong: h.gioiTinh === 'nam' ? L.ong : L.ba })}</p>
    <div class="nam-grid">${cardsNam}</div>
  </section>

  ${gioHtml}

  <section class="sec" id="ket-luan">
    <h2>${L.ketLuanH}</h2>
    <div class="prose">${h.ketLuanBienTap.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="cta">
      <a class="btn btn-p" href="${pre}/app/luan-giai">${L.ctaLap}</a>
      <a class="btn btn-s" href="${pre}/phuong-phap">${L.ctaPp}</a>
    </div>
  </section>

  <section class="sec" id="phuong-phap">
    <h2>${L.ppH}</h2>
    <ul class="method">
      ${gd ? L.ppGd : L.ppNc}
      ${L.pp2}
      ${L.pp3}
      ${L.pp4}
      ${L.pp5}
    </ul>
  </section>

  <section class="sec" id="faq">
    <h2>${L.faqH}</h2>
    ${faqs.map((f) => `<div class="faq-i"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
  </section>

  <section class="sec" id="nguon">
    <h2>${L.nguonH}</h2>
    <ol class="src">${h.nguon.map((n, i) => `<li id="nguon-${i + 1}"><a href="${esc(n.url)}" rel="noopener nofollow" target="_blank">${esc(n.ten)}</a></li>`).join('')}</ol>
  </section>

  ${khac.length ? `<section class="sec"><h2>${gd ? L.khacHGd : L.khacHNc}</h2><ul class="src">${khac.map((x) => `<li><a href="${pre}/${muc}/${esc(x.slug)}">${fmt(gd ? L.khacLinkGd : L.khacLinkNc, { ten: esc(x.ten) })}</a></li>`).join('')}</ul></section>` : ''}
  <p class="disc">${gd ? fmt(L.discGd, { url: `${pre}/nghiem-chung` }) : fmt(L.discNc, { url: `${pre}/xac-dinh-gio-sinh` })}</p>

  ${ask.end}

  <p class="disc">${fmt(L.capNhat, { ngay: ngayHienThi(h.ngayCapNhat, L) })}${h.wiki ? fmt(L.wikiDich, { url: esc(h.wiki.url), lang: esc(h.wiki.lang) }) : ''}${L.discCuoi}</p>
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
