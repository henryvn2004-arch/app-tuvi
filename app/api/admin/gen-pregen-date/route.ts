// app/api/admin/gen-pregen-date/route.ts
// Generate date-specific lá số for SEO: ngay/thang/nam + gio + gioi_tinh
// Scale: 50 years (1960-2010) × 365 days × 12 gio × 2 gioi ≈ 438k records
// Call: GET /api/admin/gen-pregen-date?secret=...&year=1984&month=9&day=5&preview=1
//       GET /api/admin/gen-pregen-date?secret=...&year=1984&batch=0&size=100
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'tuvi2024admin';

function toSlug(str: string): string {
  return str.toLowerCase()
    .replace(/á|à|ã|ả|ạ|ă|ắ|ằ|ẵ|ẳ|ặ|â|ấ|ầ|ẫ|ẩ|ậ/g,'a')
    .replace(/é|è|ẽ|ẻ|ẹ|ê|ế|ề|ễ|ể|ệ/g,'e')
    .replace(/í|ì|ĩ|ỉ|ị/g,'i')
    .replace(/ó|ò|õ|ỏ|ọ|ô|ố|ồ|ỗ|ổ|ộ|ơ|ớ|ờ|ỡ|ở|ợ/g,'o')
    .replace(/ú|ù|ũ|ủ|ụ|ư|ứ|ừ|ữ|ử|ự/g,'u')
    .replace(/ý|ỳ|ỹ|ỷ|ỵ/g,'y')
    .replace(/đ/g,'d')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

const CAN  = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const CHI  = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_CHI  = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_SLUG = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const GIO_HOURS= [23,1,3,5,7,9,11,13,15,17,19,21];

function getCanChi(year: number): string {
  const ci  = (year - 4 + 400) % 10;
  const cii = (year - 4 + 480) % 12;
  return `${CAN[ci]} ${CHI[cii]}`;
}

function pad2(n: number) { return String(n).padStart(2,'0'); }

function loadEngine() {
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  const g = globalThis as Record<string,unknown>;
  g.window = g;
  const fn = new Function('window','globalThis', code + '\nreturn { convertDuongToAm, anSaoLaSo };');
  return fn(g, g) as { convertDuongToAm: (...a: unknown[]) => unknown; anSaoLaSo: (...a: unknown[]) => unknown };
}

type StarData = { ten: string; hoa: string | null; nhom: string; brightness: string };
type PalaceData = { cungName: string; diaChi: string; isMenh: boolean; majorStars: StarData[]; stars: StarData[] };
type DaiVanData = { startAge: number; endAge: number; canChi: string; isCurrentDV: boolean; cungIdx: number; scoring: Record<string,unknown> | null; rules: Array<{type:string;text:string}> };

function serializeStar(s: Record<string,unknown>): StarData {
  return { ten: String(s.ten||''), hoa: s.hoa ? String(s.hoa) : null, nhom: String(s.nhom||''), brightness: String(s.brightness||'') };
}

function serializePalaces(palaces: Array<Record<string,unknown>>): PalaceData[] {
  return palaces.map(p => ({
    cungName: String(p.cungName||''),
    diaChi:   String(p.diaChi||''),
    isMenh:   Boolean(p.isMenh),
    majorStars: ((p.majorStars as Array<Record<string,unknown>>) || []).map(serializeStar),
    stars:      ((p.stars     as Array<Record<string,unknown>>) || []).map(serializeStar),
  }));
}

function generateRecord(
  day: number, month: number, year: number, gioIdx: number, gt: string, namXem: number,
  fns: ReturnType<typeof loadEngine>
): Record<string,unknown> | null {
  const { convertDuongToAm, anSaoLaSo } = fns;
  const gc = GIO_CHI[gioIdx];
  const gh = GIO_HOURS[gioIdx];
  const cc = getCanChi(year);

  const conv = convertDuongToAm(day, month, year, gh) as Record<string,unknown>;
  if (!conv?.amLich) return null;
  const amLich = conv.amLich as Record<string,number>;

  const ls = anSaoLaSo({
    ngayAL: amLich.day, thangAL: amLich.month, namAL: year,
    canNam: conv.canNam, chiNam: conv.chiNam, gioIdx: conv.gioIdx,
    gioitinh: gt, namXem,
  }) as Record<string,unknown>;
  if (!ls) return null;

  const palaces = (ls.palaces as Array<Record<string,unknown>>) || [];
  const mp = palaces.find(p => p.isMenh);
  const cm = String(mp?.cungName || '');
  const ct = ((mp?.majorStars as Array<Record<string,string>>) || []).map(s => s.ten || s).join(', ');

  const cs: Record<string,unknown> = {};
  for (const [k,v] of Object.entries((ls.cungScores as Record<string,Record<string,number>>) || {})) {
    if (v && Object.values(v).some(x => x > 0)) cs[k] = v;
  }

  // daiVans: capture scoring + rules + cungIdx (no circular palace refs)
  const daiVans: DaiVanData[] = ((ls.daiVans as Array<Record<string,unknown>>) || []).slice(0,10).map(d => ({
    startAge:    Number(d.startAge||0),
    endAge:      Number(d.endAge||0),
    canChi:      String(d.canChi||''),
    isCurrentDV: Boolean(d.isCurrentDV),
    cungIdx:     Number(d.cungIdx ?? -1),
    scoring:     (d.scoring as Record<string,unknown>) || null,
    rules:       ((d.rules as Array<{type:string;text:string}>) || []),
  }));

  const slug = `${toSlug(cc)}-${pad2(day)}-${pad2(month)}-${year}-gio-${GIO_SLUG[gioIdx]}-${gt}`;
  const gtLabel = gt === 'nu' ? 'Nữ' : 'Nam';

  return {
    slug,
    can_chi: cc,
    gioi_tinh: gt,
    nam_sinh: year,
    thang_sinh: month,
    ngay_sinh: day,
    gio_chi: gc,
    gio_idx: gioIdx,
    cung_menh: cm,
    chinh_tinh_menh: ct,
    nap_am:     String(ls.napAm||''),
    nap_am_hanh:String(ls.napAmHanh||''),
    cuc:        String(ls.cuc||''),
    am_duong:   String(ls.amDuong||''),
    cach_cuc:   ls.cachCuc || [],
    cung_scores: cs,
    dai_van: daiVans,
    engine_data: {
      palaces: serializePalaces(palaces),
      canChiNam:  ls.canChiNam,
      napAm:      ls.napAm,
      napAmHanh:  ls.napAmHanh,
      menhDC:     ls.menhDC,
      thanDC:     ls.thanDC,
      // Per-cung star analysis (ý nghĩa sao) — key SEO unique content
      cachCucTungCung: ls.cachCucTungCung || {},
      // Tiểu vận scores for candlestick (per-year scoring)
      tieuVanScores: ls.tieuVanScores || [],
    },
    nam_xem: namXem,
    seo_title: `Lá Số Tử Vi ${cc} ${gtLabel} Sinh ${pad2(day)}/${pad2(month)}/${year} Giờ ${gc} — Tử Vi Minh Bảo`,
    seo_desc: `Lá số tử vi ${cc} ${gtLabel.toLowerCase()} sinh ngày ${day}/${month}/${year} giờ ${gc}, cung mệnh ${cm}, nạp âm ${String(ls.napAm||'')}. Xem cách cục đặc biệt, đại vận ${namXem} và phân tích 12 cung theo cổ pháp.`,
  };
}

// Count days in a month (Gregorian)
function daysInMonth(m: number, y: number): number {
  return new Date(y, m, 0).getDate();
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get('secret') !== ADMIN_SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const namXem = parseInt(sp.get('namXem') || '2026');

  // --- PREVIEW mode: single record ---
  if (sp.get('preview') === '1') {
    const day   = parseInt(sp.get('day')   || '5');
    const month = parseInt(sp.get('month') || '9');
    const year  = parseInt(sp.get('year')  || '1984');
    const gioIdx= parseInt(sp.get('gio')   || '2'); // 2 = Dần
    const gt    = sp.get('gt') || 'nam';

    let fns: ReturnType<typeof loadEngine>;
    try { fns = loadEngine(); } catch(e) { return NextResponse.json({ error: 'Engine: '+String(e) }, { status: 500 }); }

    const rec = generateRecord(day, month, year, gioIdx, gt, namXem, fns);
    if (!rec) return NextResponse.json({ error: 'Engine returned null' }, { status: 500 });
    return NextResponse.json({ record: rec, slug: rec.slug, url: `/la-so/${rec.slug}` });
  }

  // --- BATCH mode: generate all combos for a given year ---
  const year      = parseInt(sp.get('year') || '1984');
  const batchIdx  = parseInt(sp.get('batch')|| '0');
  const batchSize = parseInt(sp.get('size') || '200');

  // Build full list: every day × every giờ × 2 giới for this year
  const allCombos: Array<{ day: number; month: number; gioIdx: number; gt: string }> = [];
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= daysInMonth(m, year); d++) {
      for (let gi = 0; gi < 12; gi++) {
        for (const gt of ['nam', 'nu']) {
          allCombos.push({ day: d, month: m, gioIdx: gi, gt });
        }
      }
    }
  }

  const totalAll = allCombos.length; // ~8,784 per year (365×12×2)
  const totalBatches = Math.ceil(totalAll / batchSize);
  const slice = allCombos.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);

  let fns: ReturnType<typeof loadEngine>;
  try { fns = loadEngine(); } catch(e) { return NextResponse.json({ error: 'Engine: '+String(e) }, { status: 500 }); }

  const records: Record<string,unknown>[] = [];
  for (const { day, month, gioIdx, gt } of slice) {
    try {
      const rec = generateRecord(day, month, year, gioIdx, gt, namXem, fns);
      if (rec) records.push(rec);
    } catch(_) { /* skip invalid dates */ }
  }

  // Insert to Supabase (upsert by slug)
  let totalInserted = 0;
  const CHUNK = 50;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    const res = await fetch(`${SB_URL}/rest/v1/laso_pregen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    const debug = await res.text().catch(() => '');
    if (res.ok || res.status === 201 || res.status === 204) {
      totalInserted += chunk.length;
    } else {
      return NextResponse.json({ error: `Supabase ${res.status}: ${debug.slice(0,200)}` });
    }
  }

  return NextResponse.json({
    year,
    batch: batchIdx,
    total_batches: totalBatches,
    total_combos_this_year: totalAll,
    generated: records.length,
    inserted: totalInserted,
    next_url: batchIdx + 1 < totalBatches
      ? `/api/admin/gen-pregen-date?secret=${ADMIN_SECRET}&year=${year}&batch=${batchIdx+1}&size=${batchSize}&namXem=${namXem}`
      : null,
    done: batchIdx + 1 >= totalBatches,
  });
}
