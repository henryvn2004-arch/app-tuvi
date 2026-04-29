// app/api/admin/gen-pregen/route.ts
// One-time: generates 2880 pre-computed lá số and inserts to Supabase
// Secured with ADMIN_SECRET env var
// Call: GET /api/admin/gen-pregen?secret=...&batch=0&size=100
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
const GIO_CHI   = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
// Unique slugs for each chi — Tý(0)='ty' vs Tỵ(5)='ti' to avoid collision
const GIO_SLUG = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const GIO_HOURS = [23,1,3,5,7,9,11,13,15,17,19,21];

function getBaseYears(ci: number, cii: number): number[] {
  const years: number[] = [];
  for (let y = 1924; y <= 2043; y++) {
    if ((y-4+400)%10===ci && (y-4+480)%12===cii) years.push(y);
  }
  return years;
}

type LasoRecord = Record<string, unknown>;

function generateBatch(batchIdx: number, batchSize: number, fns: { convertDuongToAm: (...args: unknown[]) => unknown; anSaoLaSo: (...args: unknown[]) => unknown }): LasoRecord[] {
  const { convertDuongToAm, anSaoLaSo } = fns;
  const all: LasoRecord[] = [];

  for (let ci = 0; ci < 10; ci++) {
    for (let cii = 0; cii < 12; cii++) {
      const cc = `${CAN[ci]} ${CHI[cii]}`;
      const yrs = getBaseYears(ci, cii);
      for (const y of yrs) {
        for (let gi = 0; gi < 12; gi++) {
          for (const gt of ['nam','nu']) {
            all.push({ ci, cii, cc, y, gi, gt });
          }
        }
      }
    }
  }

  const slice = all.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);
  const records: LasoRecord[] = [];

  for (const item of slice) {
    const { cc, y, gi, gt } = item as { cc:string; y:number; gi:number; gt:string };
    const gc = GIO_CHI[gi];
    const gh = GIO_HOURS[gi];
    try {
      const conv = convertDuongToAm(15, 6, y, gh) as Record<string,unknown>;
      if (!conv?.amLich) continue;
      const amLich = conv.amLich as Record<string,number>;
      const ls = anSaoLaSo({
        ngayAL: amLich.day, thangAL: amLich.month, namAL: y,
        canNam: conv.canNam, chiNam: conv.chiNam, gioIdx: conv.gioIdx,
        gioitinh: gt, namXem: 2026,
      }) as Record<string,unknown>;
      if (!ls) continue;

      const palaces = (ls.palaces as Array<Record<string,unknown>>) || [];
      const mp = palaces.find(p => p.isMenh);
      const cm = String(mp?.cungName || '');
      const ct = ((mp?.majorStars as Array<Record<string,string>>) || []).map(s => s.ten || s).join(', ');

      const cs: Record<string,unknown> = {};
      const rawScores = ls.cungScores as Record<string,Record<string,number>> || {};
      for (const [k,v] of Object.entries(rawScores)) {
        if (v && Object.values(v).some(x => x > 0)) cs[k] = v;
      }

      const slug = `${toSlug(cc)}-${gt}-${y}-gio-${toSlug(gc)}`;
      records.push({
        slug, can_chi: cc, gioi_tinh: gt, nam_sinh: y, thang_sinh: 6, ngay_sinh: 15,
        gio_chi: gc, gio_idx: gi, cung_menh: cm, chinh_tinh_menh: ct,
        nap_am: ls.napAm || '', nap_am_hanh: ls.napAmHanh || '',
        cuc: ls.cuc || '', am_duong: ls.amDuong || '',
        cach_cuc: ls.cachCuc || [],
        cung_scores: cs,
        dai_van: ((ls.daiVans as Array<Record<string,unknown>>) || []).slice(0,10).map(d => ({
          startAge: d.startAge, endAge: d.endAge, canChi: d.canChi, isCurrentDV: d.isCurrentDV || false,
        })),
        engine_data: {
          palaces: palaces.map(p => ({
            cungName: p.cungName, diaChi: p.diaChi, isMenh: p.isMenh || false,
            majorStars: ((p.majorStars as Array<Record<string,string>>) || []).map(s => ({ ten: s.ten || s })),
            stars: ((p.stars as Array<Record<string,string>>) || []).slice(0,6).map(s => s.ten || s),
          })),
          canChiNam: ls.canChiNam, napAm: ls.napAm, napAmHanh: ls.napAmHanh,
        },
        seo_title: `Lá Số Tử Vi ${cc} ${gt==='nu'?'Nữ':'Nam'} ${y} Giờ ${gc} — Tử Vi Minh Bảo`,
        seo_desc:  `Lá số tử vi ${cc} ${gt==='nu'?'nữ':'nam'} năm ${y} giờ ${gc}, cung mệnh ${cm}, nạp âm ${String(ls.napAm||'')}. Cách cục và phân tích 12 cung theo cổ pháp.`,
      });
    } catch(_) { /* skip */ }
  }
  return records;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get('secret') !== ADMIN_SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const batchIdx  = parseInt(sp.get('batch') || '0');
  const batchSize = parseInt(sp.get('size')  || '200');
  const totalAll  = 2880;
  const totalBatches = Math.ceil(totalAll / batchSize);

  // Load engine dynamically
  let engineFns: { convertDuongToAm: (...args: unknown[]) => unknown; anSaoLaSo: (...args: unknown[]) => unknown };
  try {
    const enginePath = join(process.cwd(), 'public', 'tuvi-ansao-engine.js');
    const code = readFileSync(enginePath, 'utf-8');
    const g = globalThis as Record<string,unknown>;
    g.window = g;
    const fn = new Function('window','globalThis', code + '\nreturn { convertDuongToAm, anSaoLaSo };');
    engineFns = fn(g, g) as typeof engineFns;
  } catch(e) {
    return NextResponse.json({ error: 'Engine load failed: ' + String(e) }, { status: 500 });
  }

  const records = generateBatch(batchIdx, batchSize, engineFns);

  // Insert to Supabase — split into 50-record chunks to avoid internal duplicates
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
    const debug = await res.text().catch(()=>''); if (res.ok || res.status === 201 || res.status === 204) { totalInserted += chunk.length; } else { return NextResponse.json({error: 'Supabase error: '+res.status+' '+debug.slice(0,200), sb_url: SB_URL, has_key: !!SB_KEY}); }
  }

  return NextResponse.json({
    batch: batchIdx,
    total_batches: totalBatches,
    generated: records.length,
    inserted: totalInserted,
    error: null,
    next_url: batchIdx + 1 < totalBatches
      ? `/api/admin/gen-pregen?secret=${ADMIN_SECRET}&batch=${batchIdx+1}&size=${batchSize}`
      : null,
    done: batchIdx + 1 >= totalBatches,
  });
}
