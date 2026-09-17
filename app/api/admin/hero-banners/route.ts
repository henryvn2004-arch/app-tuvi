// app/api/admin/hero-banners/route.ts
// GET /api/admin/hero-banners?group=tu-binh&n=15  (hoặc ?tool=<tool_id>, tự
// suy ra nhóm qua resolveHeroGroup)
//
// Sinh ẢNH BANNER CHÍNH (khối hook `.intro-card` đầu trang tool) — webtoon
// Ghibli/chibi Minh Bảo, khổ ngang, CÓ MÀU, bằng gpt-image-2 — rồi cất vào
// Supabase Storage. Chạy TRÊN VERCEL vì key OpenAI ở đó — cùng lý do và cùng
// khuôn `app/api/admin/illus-images/route.ts` / `que-images/route.ts`.
//
// 🔴 Reskin 2026-09-16: LUÔN gọi qua `images/edits` (neo ẢNH, không phải
// `images/generations` thuần) — đọc `ANCHOR_IMAGE_PATH` (đã commit trong
// `public/`) TỪ ĐĨA lúc khởi động route, không phải fetch qua mạng. Thiếu
// hẳn Minh Bảo trong ảnh là dấu hiệu neo bị bỏ qua — không được âm thầm lùi
// về text-to-image (xem lib/image/openai-image.ts).
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
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { generatePortraitImage } from '@/lib/image/openai-image';
import { logImageUsage } from '@/lib/agent/usage';
import { resolveHeroGroup, buildHeroBannerPrompt, ANCHOR_IMAGE_PATH } from '@/lib/media/hero-banner-prompt';
import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BUCKET = 'portraits';
const PREFIX = 'hero-banners';

// Đọc MỘT LẦN lúc route nạp (không phải mỗi request) — file tĩnh trong
// `public/`, không đổi giữa các lượt gọi. `process.cwd()` là gốc repo khi
// chạy trên Vercel (Next.js serverless function).
const ANCHOR_BYTES = readFileSync(join(process.cwd(), ANCHOR_IMAGE_PATH));
const ANCHOR_FILE_NAME = ANCHOR_IMAGE_PATH.split('/').pop()!;
const ANCHOR_MIME = ANCHOR_FILE_NAME.endsWith('.webp') ? 'image/webp' : 'image/png';

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

// Độ rộng dải PHAI ALPHA ở rìa TRÁI ảnh — tỉ lệ trên bề rộng đã resize (không
// phải px cứng, co giãn cùng ảnh). 5% đủ mượt mép mà không chạm tới Minh Bảo/
// nhân vật phụ (luôn vẽ gần rìa trái nhưng chưa tới sát x=0 ở cả 11 nhóm).
const FADE_PCT = 0.05;

// Nén `<path>.png` thành `.webp` cùng tên, ghi đè. `pngBytes` khi đã có sẵn
// trong bộ nhớ (vừa vẽ xong) — tránh tải lại; thiếu thì tự HEAD/GET từ Storage
// (đường `compressOnly`, ảnh đã có từ trước).
//
// 🔴 KHÔNG dùng cổng biến đổi ảnh `render/image` của Supabase Storage — nó ép
// cứng RỘNG mà GIỮ NGUYÊN CAO GỐC thay vì co theo tỉ lệ (chỉ truyền `width`,
// không có `height`, là bug của chính dịch vụ, không phải cách gọi sai): với
// nguồn 1536×1024 co về rộng 1200 mà cao vẫn 1024 ⇒ CẮT ~22% hai bên trái/phải
// để vừa khung — đúng chỗ 11 nhóm banner đặt Minh Bảo/nhân vật phụ (rìa khung
// theo `hero-banner-prompt.ts`), tức là bị cắt ngay phần Henry cần thấy. Bài
// học NÀY ĐÃ vá ở `illus-images/route.ts` (2026-09-14, PR #851, "cắt mất ~40%
// khung ngang trên cả 230 ảnh") nhưng chưa kịp áp cho route này — vá lại đây
// theo đúng khuôn đó: encode bằng `sharp` tại chỗ, `resize({width})` của sharp
// tự suy chiều cao ĐÚNG TỈ LỆ (không như cổng transform ở trên).
//
// 🎨 Phai alpha rìa TRÁI (Henry 2026-09-17, "cho hình và background blend lại
// với nhau"): `.intro-photo` neo PHẢI trong khung to bằng cả `.intro-card`
// (`object-fit:contain`), nên mép TRÁI thật của ảnh luôn rơi vào GIỮA card ở
// một % khác nhau tuỳ bề rộng màn hình — không thể tính trước một mốc % cố
// định trong CSS để làm mềm đúng chỗ. Phai NGAY TRONG ảnh (theo % bề rộng của
// chính nó, đi theo ảnh dù hiển thị ở đâu) là cách DUY NHẤT đúng ở MỌI bề rộng
// — nền `.intro-photo{background:#F3E7C8}` lộ ra qua phần trong suốt, khớp
// tông với nền `.intro-card`. `dest-in` nhân alpha mask (SVG gradient) vào
// ảnh gốc, KHÔNG đổi màu, chỉ đổi độ trong suốt.
// Trả về chuỗi lỗi (rỗng nếu ok) — KHÔNG throw, gọi nơi khác tự quyết có
// chặn cả lượt hay không.
async function nenWebp(path: string, pngBytes?: Buffer): Promise<string> {
  try {
    let src = pngBytes;
    if (!src) {
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`tải PNG gốc HTTP ${r.status}`);
      src = Buffer.from(await r.arrayBuffer());
    }
    // 1200px rộng đủ nét cho khung banner rộng nhất (~1000px CSS, màn retina);
    // quality 78 theo đúng mức đã đo ở illus (900px/80 ⇒ ~150KB/tấm) — banner
    // rộng hơn nên hạ nhẹ quality để bù.
    const resized = await sharp(src).resize({ width: 1200 }).toBuffer();
    const { width, height } = await sharp(resized).metadata();
    const fadeMask = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/>
        <stop offset="${FADE_PCT}" stop-color="#fff" stop-opacity="1"/>
        <stop offset="1" stop-color="#fff" stop-opacity="1"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`;
    const faded = await sharp(resized)
      .ensureAlpha()
      .composite([{ input: Buffer.from(fadeMask), blend: 'dest-in' }])
      .toBuffer();
    const wBuf = await sharp(faded).webp({ quality: 78 }).toBuffer();
    const wUp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.replace(/\.png$/, '.webp')}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        'Content-Type': 'image/webp',
        'x-upsert': 'true',
      },
      body: new Uint8Array(wBuf),
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
      const img = await generatePortraitImage({
        prompt,
        size,
        quality,
        model,
        anchorImage: { bytes: ANCHOR_BYTES, mimeType: ANCHOR_MIME, fileName: ANCHOR_FILE_NAME },
      });
      void logImageUsage('hero-banner', img.model, img.usage, img.durationMs);

      const pngBytes = Buffer.from(img.b64, 'base64');
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        body: new Uint8Array(pngBytes),
      });
      if (!up.ok) throw new Error('lưu ảnh hỏng: ' + (await up.text().catch(() => '')).slice(0, 200));

      // Bản .webp NÉN SẴN, đúng tỉ lệ (xem ghi chú ở `nenWebp`). Lỗi bước này
      // KHÔNG chặn cả lượt — PNG gốc đã lưu xong.
      const err = await nenWebp(path, pngBytes);
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
