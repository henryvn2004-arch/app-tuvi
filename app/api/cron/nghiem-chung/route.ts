// app/api/cron/nghiem-chung/route.ts
// Sinh hồ sơ Nghiệm Chứng mỗi đêm bằng Claude qua API (credit API, KHÔNG phải hạn mức gói),
// ghi vào Supabase (nc_ho_so / nc_loai_tru) — trang đọc từ DB sau khi hết file
// (lib/nghiem-chung/store.ts). Cùng bộ luật + bộ kiểm tra với pipeline agent
// (scripts/nghiem-chung/PROMPT.md · lib/nghiem-chung/sinh/kiem.ts): không nới cho cron.
//
// Mỗi lượt xử lý vài người (LIMIT) rồi thôi; lịch dày (vercel.json) mới đủ ~100 người/đêm,
// vì một hồ sơ = 2–4 lượt gọi model và hàm chỉ sống tối đa maxDuration.
//
// Chặn chi tiêu: `nghiem_chung.daily_cap` (app_config, mặc định 100) = trần số người/ngày VN;
// `nghiem_chung.enabled=false` tắt hẳn. Mutex từng người: nc_claim (lib/nghiem-chung/db.ts).
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ok, err, options } from '@/lib/cors';
import { withCronLog } from '@/lib/cron/log';
import { getConfigValue } from '@/lib/config/appConfig';
import { logLlmUsage } from '@/lib/agent/usage';
import { HO_SO } from '@/lib/nghiem-chung';
import { danhSach, sitelinks, dongGoi } from '@/lib/nghiem-chung/sinh/goi';
import { kiemNhap, type KetQuaKiem } from '@/lib/nghiem-chung/sinh/kiem';
import { vietHoSo } from '@/lib/nghiem-chung/sinh/viet';
import { dbDaXong, dbHetLuot, dbGiu, dbLoi, dbLuuHoSo, dbLuuLoaiTru } from '@/lib/nghiem-chung/db';

const DATA = join(process.cwd(), 'data', 'nghiem-chung');
const LIMIT = 5;
// Hàm chết ở maxDuration thì mọi lượt đang bay mất trắng: sau mốc này không mở thêm lượt sửa lỗi nào.
const HAN_SUA_MS = 200_000;

export async function OPTIONS() {
  return options();
}

/** Slug đã có trong file của repo: hồ sơ (manifest), loại trừ, viết tay. */
function slugTrongFile(): Set<string> {
  const s = new Set<string>(HO_SO.map((h) => h.slug));
  const mf = join(DATA, 'manifest.json');
  if (existsSync(mf)) for (const x of JSON.parse(readFileSync(mf, 'utf8')) as { slug: string }[]) s.add(x.slug);
  const lt = join(DATA, 'loai-tru');
  if (existsSync(lt)) for (const f of readdirSync(lt)) if (f.endsWith('.txt')) s.add(f.slice(0, -4));
  return s;
}

const SB = () => ({
  url: process.env.SUPABASE_URL!,
  headers: { apikey: process.env.SUPABASE_SERVICE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}` },
});

/** Số người cron đã xử lý từ 00:00 giờ VN hôm nay (hồ sơ + loại trừ). */
async function daXuLyHomNay(): Promise<number> {
  const { url, headers } = SB();
  const vn = new Date(Date.now() + 7 * 3600_000);
  const dauNgay = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 3600_000).toISOString();
  let tong = 0;
  for (const bang of ['nc_ho_so', 'nc_loai_tru']) {
    const r = await fetch(`${url}/rest/v1/${bang}?select=slug&created_at=gte.${encodeURIComponent(dauNgay)}`, {
      cache: 'no-store',
      headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
    });
    if (!r.ok) throw new Error(`đếm ${bang}: ${r.status}`);
    tong += Number(r.headers.get('content-range')?.split('/')[1] || 0);
  }
  return tong;
}

async function xuLy(c: Awaited<ReturnType<typeof danhSach>>[number], links: Record<string, string>, ngay: string, batDau: number) {
  if (!(await dbGiu(c.slug))) return { slug: c.slug, kq: 'bo-qua' };
  try {
    const pack = await dongGoi(c, links);
    let cuoi: KetQuaKiem = { loi: [] };
    const r = await vietHoSo(pack, async (nhap) => {
      if (Date.now() - batDau > HAN_SUA_MS) throw new Error('hết giờ hàm — để lượt sau');
      cuoi = await kiemNhap(pack, nhap, null, ngay);
      return cuoi.loi;
    });
    const [, model = ''] = r.dung.model.split(':');
    await logLlmUsage(
      'nghiem-chung-cron',
      model || 'claude-sonnet-5-5',
      { input_tokens: r.dung.vao, output_tokens: r.dung.ra, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      Date.now() - batDau,
    );
    if (r.kq === 'loai') {
      await dbLuuLoaiTru(c.slug, c.qid, r.nhap.loaiTru);
      return { slug: c.slug, kq: 'loai-tru' };
    }
    if (r.kq === 'khong-dat') {
      await dbLuuLoaiTru(c.slug, c.qid, `khong-dat: ${r.loi.length} lỗi — ${r.loi.slice(0, 2).join(' | ')}`.slice(0, 500));
      return { slug: c.slug, kq: 'khong-dat' };
    }
    if (cuoi.loaiTru) {
      await dbLuuLoaiTru(c.slug, c.qid, cuoi.loaiTru);
      return { slug: c.slug, kq: 'loai-tru' };
    }
    await dbLuuHoSo(cuoi.hoSo, c.qid);
    return { slug: c.slug, kq: 'ok' };
  } catch (e) {
    const m = (e as Error).message;
    console.error(`[cron nghiem-chung] ${c.slug}:`, m);
    await dbLoi(c.slug, m);
    return { slug: c.slug, kq: 'loi', loi: m };
  }
}

async function handle(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return err('Unauthorized', 401);
  const batDau = Date.now();
  if (!(await getConfigValue<boolean>('nghiem_chung.enabled', true))) return ok({ message: 'Tắt (nghiem_chung.enabled=false)' });
  const tran = await getConfigValue<number>('nghiem_chung.daily_cap', 100);
  const homNay = await daXuLyHomNay();
  const conLai = Math.min(LIMIT, tran - homNay);
  if (conLai <= 0) return ok({ message: `Đủ trần ngày (${homNay}/${tran})` });

  const xong = slugTrongFile();
  for (const s of await dbDaXong()) xong.add(s);
  for (const s of await dbHetLuot()) xong.add(s);
  const hang = danhSach().filter((c) => !xong.has(c.slug));
  const chon = hang.slice(0, conLai);
  if (!chon.length) return ok({ message: 'Hết hàng đợi.' });

  const links = await sitelinks(chon.map((c) => c.qid));
  const ngay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const kq = await Promise.all(chon.map((c) => xuLy(c, links[c.qid] || {}, ngay, batDau)));
  return ok({
    message: 'OK',
    duration_ms: Date.now() - batDau,
    con_lai_hang_doi: hang.length - chon.length,
    results: kq,
  });
}

export async function GET(request: NextRequest) {
  return withCronLog('nghiem-chung', 'vercel', () => handle(request));
}
export async function POST(request: NextRequest) {
  return withCronLog('nghiem-chung', 'vercel', () => handle(request));
}
