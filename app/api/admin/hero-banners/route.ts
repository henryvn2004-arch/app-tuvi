// app/api/admin/hero-banners/route.ts
// GET /api/admin/hero-banners?group=tu-binh&n=15  (hoặc ?tool=<tool_id>, tự
// suy ra nhóm qua resolveHeroGroup)
//
// Sinh ẢNH BANNER CHÍNH (khối hook `.intro-card` đầu trang tool) — tranh thủy
// mặc khổ ngang, CÓ MÀU, bằng gpt-image-2 — rồi cất vào Supabase Storage. Chạy
// TRÊN VERCEL vì key OpenAI ở đó — cùng lý do và cùng khuôn
// `app/api/admin/illus-images/route.ts` / `que-images/route.ts`.
//
// Banner dùng CHUNG theo NHÓM (xem lib/media/hero-banner-prompt.ts), không
// phải 1 bức/tool — và mỗi nhóm sinh NHIỀU BIẾN THỂ (n) của CÙNG một prompt
// để duyệt, chưa chốt bức nào.
//
// Cổng là cờ trong `app_config` (không phải secret trên URL) + trần ngân sách
// + bỏ qua bức đã có — cùng ba chốt chặn tiền như illus-images (xem chú thích
// ở đó cho lý do đầy đủ).

export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { generatePortraitImage } from '@/lib/image/openai-image';
import { logImageUsage } from '@/lib/agent/usage';
import { resolveHeroGroup, buildHeroBannerPrompt } from '@/lib/media/hero-banner-prompt';
import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BUCKET = 'portraits';
const PREFIX = 'hero-banners';

const BLOCKING = /401|403|429|invalid_api_key|insufficient_quota|billing|rate.?limit/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 1), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const SIZES = ['1024x1024', '1024x1536', '1536x1024'] as const;
const QUALITIES = ['low', 'medium', 'high'] as const;
type Size = (typeof SIZES)[number];
type Quality = (typeof QUALITIES)[number];

// Đo thật trên khổ 1536×1024, quality medium (xem illus-images/que-images cho
// nguồn số) — ƯỚC TÍNH, số thật lấy từ events.meta.cost_vnd.
const GIA_VND: Record<string, Record<Quality, number>> = {
  'gpt-image-2': { low: 400, medium: 1100, high: 3500 },
  'gpt-image-1': { low: 500, medium: 1625, high: 6313 },
};

// Nén `<path>.png` (đã có trong Storage) thành `.webp` cùng tên, ghi đè —
// cửa biến đổi ảnh có sẵn của Supabase Storage, không cần thư viện ảnh riêng
// (cùng khuôn `illus-images/route.ts`). 1200px rộng đủ nét cho khung banner
// rộng nhất (~1000px CSS, màn retina); quality 78 theo đúng mức đã đo ở
// illus (900px/80 ⇒ ~150KB/tấm) — banner rộng hơn nên hạ nhẹ quality để bù.
// Trả về chuỗi lỗi (rỗng nếu ok) — KHÔNG throw, gọi nơi khác tự quyết có
// chặn cả lượt hay không.
async function nenWebp(path: string): Promise<string> {
  try {
    const wUrl = `${SUPABASE_URL}/storage/v1/render/image/public/${BUCKET}/${path}?width=1200&quality=78`;
    const wResp = await fetch(wUrl, { headers: { Accept: 'image/webp' } });
    if (!wResp.ok) throw new Error(`nén webp HTTP ${wResp.status}`);
    const wBuf = new Uint8Array(await wResp.arrayBuffer());
    const wUp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.replace(/\.png$/, '.webp')}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        'Content-Type': 'image/webp',
        'x-upsert': 'true',
      },
      body: wBuf,
    });
    if (!wUp.ok) throw new Error('lưu webp hỏng: ' + (await wUp.text().catch(() => '')).slice(0, 200));
    return '';
  } catch (e) {
    return e instanceof Error ? e.message : 'không rõ';
  }
}

export async function GET(req: NextRequest) {
  // Fallback là cổng ĐÓNG — cùng lý do illus-images: hỏng theo hướng "mở" ở
  // đây là tự đốt tiền model, không phải chặn oan người đã trả.
  const cfg = await getConfigValue<{
    enabled?: boolean;
    budget?: number;
    size?: string;
    quality?: string;
    model?: string;
  }>('hero_banners.gen', { enabled: false });

  if (!cfg?.enabled) {
    return json(
      {
        ok: false,
        lyDo: 'Cổng đang TẮT. Bật bằng SQL rồi gọi lại:',
        sql: `update app_config set value = jsonb_set(value,'{enabled}','true') where key = 'hero_banners.gen';`,
        goiModel: 0,
      },
      403
    );
  }

  const sp = req.nextUrl.searchParams;
  // `?group=` chọn thẳng nhóm; `?tool=` (mặc định 'laso') suy ra nhóm qua
  // resolveHeroGroup — banner dùng CHUNG theo nhóm, không phải 1 bức/tool.
  const raw = sp.get('group') || sp.get('tool') || 'laso';
  let spec;
  try {
    spec = resolveHeroGroup(raw);
  } catch (e) {
    return json({ ok: false, lyDo: e instanceof Error ? e.message : String(e) }, 400);
  }
  const groupId = spec.id;

  const n = Math.max(1, Math.min(30, Number(sp.get('n')) || 15));
  const budget = Math.max(0, Number(cfg.budget ?? 5));
  const size: Size = SIZES.includes(cfg.size as Size) ? (cfg.size as Size) : '1536x1024';
  const quality: Quality = QUALITIES.includes(cfg.quality as Quality) ? (cfg.quality as Quality) : 'medium';
  const model = cfg.model && GIA_VND[cfg.model] ? cfg.model : 'gpt-image-2';
  const prompt = buildHeroBannerPrompt(spec);

  // `?vede=1` — vẽ đè có chủ đích, KHÔNG đổi id. Không có cờ này thì "đã có
  // thì thôi" giữ nguyên bản cũ.
  const veDe = sp.get('vede') === '1';
  // `?compressOnly=1` — KHÔNG gọi model, chỉ nén lại .png ĐÃ CÓ thành .webp
  // (dùng khi ảnh đã vẽ xong từ trước, chỉ cần thêm bản nén — không đốt lại
  // tiền gpt-image-2). Bỏ qua id nào chưa có .png.
  const compressOnly = sp.get('compressOnly') === '1';

  const ketQua: { id: string; url?: string; loi?: string }[] = [];
  let daVe = 0,
    boQua = 0,
    chan: string | null = null;

  for (let i = 1; i <= n; i++) {
    if (chan) break;
    if (!compressOnly && daVe >= budget) break;

    const id = `${groupId}-${String(i).padStart(2, '0')}`;
    const path = `${PREFIX}/${id}.png`;
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    if (compressOnly) {
      const co = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
      if (!co?.ok) {
        boQua++;
        continue;
      }
      const err = await nenWebp(path);
      if (err) ketQua.push({ id: id + ' (webp)', loi: err });
      else daVe++;
      ketQua.push({ id, url });
      continue;
    }

    const co = veDe ? null : await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
    if (co?.ok) {
      boQua++;
      ketQua.push({ id, url });
      continue;
    }

    try {
      const img = await generatePortraitImage({ prompt, size, quality, model });
      void logImageUsage('hero-banner', img.model, img.usage, img.durationMs);

      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        body: new Uint8Array(Buffer.from(img.b64, 'base64')),
      });
      if (!up.ok) throw new Error('lưu ảnh hỏng: ' + (await up.text().catch(() => '')).slice(0, 200));

      // Bản .webp NÉN SẴN — cùng khuôn `illus-images/route.ts` (dùng cổng
      // biến đổi ảnh có sẵn của Supabase Storage, không cần thư viện riêng).
      // Lỗi bước này KHÔNG chặn cả lượt — PNG gốc đã lưu xong.
      const err = await nenWebp(path);
      if (err) ketQua.push({ id: id + ' (webp)', loi: err });

      daVe++;
      ketQua.push({ id, url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'không rõ';
      ketQua.push({ id, loi: msg });
      if (BLOCKING.test(msg)) chan = msg; // dừng cả lượt, đừng đốt tiếp phần còn lại
    }
  }

  return json({
    ok: !chan,
    daVe,
    boQua,
    loi: ketQua.filter((r) => r.loi).length,
    dungCaLuot: chan,
    conLai: n - ketQua.length,
    quality,
    model,
    chiPhiUocTinhVnd: compressOnly ? 0 : daVe * GIA_VND[model][quality],
    anh: ketQua,
  });
}
