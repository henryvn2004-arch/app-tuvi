// lib/nghiem-chung/sinh/chay.ts
// ============================================================
// Vòng chạy cron dùng chung cho HAI mục: Nghiệm Chứng (app/api/cron/nghiem-chung) và Xác Định Giờ Sinh
// (app/api/cron/xac-dinh-gio-sinh). Mỗi lượt xử lý vài người rồi thôi; lịch dày ở vercel.json mới đủ số
// người/đêm vì một hồ sơ = 2–5 lượt gọi model và hàm chỉ sống tối đa maxDuration.
//
// Chặn chi tiêu: trần người/ngày VN đọc từ app_config (`nghiem_chung.daily_cap` · `nghiem_chung.doan_daily_cap`),
// `nghiem_chung.enabled=false` tắt cả hai. Mutex từng người: nc_claim (lib/nghiem-chung/db.ts).
// ============================================================
import { NextRequest } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ok, err } from '@/lib/cors';
import { getConfigValue } from '@/lib/config/appConfig';
import { logLlmUsage } from '@/lib/agent/usage';
import { HO_SO } from '@/lib/nghiem-chung';
import { sitelinks, type Goi } from './goi';
import { kiemNhap, type KetQuaKiem } from './kiem';
import { vietHoSo } from './viet';
import { dbDaXong, dbHetLuot, dbGiu, dbLoi, dbLuuHoSo, dbLuuLoaiTru } from '../db';

const DATA = join(process.cwd(), 'data', 'nghiem-chung');
const LIMIT = 5;
// Hàm chết ở maxDuration thì mọi lượt đang bay mất trắng: sau mốc này không mở thêm lượt sửa lỗi nào.
const HAN_SUA_MS = 200_000;

export type Muc = 'nghiem-chung' | 'xac-dinh-gio-sinh';

export interface CauHinh {
  muc: Muc;
  /** Tên job trong cron_runs / lib/ops/jobs.ts. */
  job: string;
  capKey: string;
  capMacDinh: number;
  hangDoi: () => { slug: string; qid: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dongGoi: (c: any, links: Record<string, string>) => Promise<Goi>;
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

/** Số người của mục này cron đã xử lý từ 00:00 giờ VN hôm nay (hồ sơ + loại trừ). */
async function daXuLyHomNay(muc: Muc): Promise<number> {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  const vn = new Date(Date.now() + 7 * 3600_000);
  const dauNgay = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 3600_000).toISOString();
  let tong = 0;
  for (const bang of ['nc_ho_so', 'nc_loai_tru']) {
    const r = await fetch(`${url}/rest/v1/${bang}?select=slug&muc=eq.${muc}&created_at=gte.${encodeURIComponent(dauNgay)}`, {
      cache: 'no-store',
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' },
    });
    if (!r.ok) throw new Error(`đếm ${bang}: ${r.status}`);
    tong += Number(r.headers.get('content-range')?.split('/')[1] || 0);
  }
  return tong;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function xuLy(cfg: CauHinh, c: any, links: Record<string, string>, ngay: string, batDau: number) {
  if (!(await dbGiu(c.slug))) return { slug: c.slug, kq: 'bo-qua' };
  const doan = cfg.muc === 'xac-dinh-gio-sinh';
  try {
    const pack = await cfg.dongGoi(c, links);
    let cuoi: KetQuaKiem = { loi: [] };
    const r = await vietHoSo(
      pack,
      async (nhap, doanG) => {
        if (Date.now() - batDau > HAN_SUA_MS) throw new Error('hết giờ hàm — để lượt sau');
        cuoi = await kiemNhap(pack, nhap, doanG, ngay);
        return cuoi.loi;
      },
      { doan },
    );
    const [, model = ''] = r.dung.model.split(':');
    await logLlmUsage(
      doan ? 'xac-dinh-gio-sinh-cron' : 'nghiem-chung-cron',
      model || 'claude-sonnet-5-5',
      { input_tokens: r.dung.vao, output_tokens: r.dung.ra, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      Date.now() - batDau,
    );
    if (r.kq === 'loai') {
      await dbLuuLoaiTru(c.slug, c.qid, r.nhap.loaiTru, cfg.muc);
      return { slug: c.slug, kq: 'loai-tru' };
    }
    if (r.kq === 'khong-dat') {
      await dbLuuLoaiTru(c.slug, c.qid, `khong-dat: ${r.loi.length} lỗi — ${r.loi.slice(0, 2).join(' | ')}`.slice(0, 500), cfg.muc);
      return { slug: c.slug, kq: 'khong-dat' };
    }
    if (cuoi.loaiTru) {
      await dbLuuLoaiTru(c.slug, c.qid, cuoi.loaiTru, cfg.muc);
      return { slug: c.slug, kq: 'loai-tru' };
    }
    await dbLuuHoSo(cuoi.hoSo, c.qid);
    return { slug: c.slug, kq: 'ok' };
  } catch (e) {
    const m = (e as Error).message;
    console.error(`[cron ${cfg.job}] ${c.slug}:`, m);
    await dbLoi(c.slug, m);
    return { slug: c.slug, kq: 'loi', loi: m };
  }
}

export async function chay(request: NextRequest, cfg: CauHinh) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return err('Unauthorized', 401);
  const batDau = Date.now();
  if (!(await getConfigValue<boolean>('nghiem_chung.enabled', true))) return ok({ message: 'Tắt (nghiem_chung.enabled=false)' });
  const tran = await getConfigValue<number>(cfg.capKey, cfg.capMacDinh);
  const homNay = await daXuLyHomNay(cfg.muc);
  const conLai = Math.min(LIMIT, tran - homNay);
  if (conLai <= 0) return ok({ message: `Đủ trần ngày (${homNay}/${tran})` });

  const xong = slugTrongFile();
  for (const s of await dbDaXong()) xong.add(s);
  for (const s of await dbHetLuot()) xong.add(s);
  const hang = cfg.hangDoi().filter((c) => !xong.has(c.slug));
  const chon = hang.slice(0, conLai);
  if (!chon.length) return ok({ message: 'Hết hàng đợi.' });

  const links = await sitelinks(chon.map((c) => c.qid));
  const ngay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const kq = await Promise.all(chon.map((c) => xuLy(cfg, c, links[c.qid] || {}, ngay, batDau)));
  return ok({ message: 'OK', duration_ms: Date.now() - batDau, con_lai_hang_doi: hang.length - chon.length, results: kq });
}
