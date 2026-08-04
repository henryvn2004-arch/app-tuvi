// app/api/admin/que-images/route.ts
// GET /api/admin/que-images?que=22,23 | ?sample=1 | ?all=1
//
// Sinh bộ tranh 64 quẻ ("Quẻ Phục Hy bằng hình") bằng gpt-image-1 rồi cất vào
// Supabase Storage. Chạy TRÊN VERCEL vì key OpenAI ở đó — không phải bê key đi
// đâu cả, và cũng chính là đường sẽ dùng khi cần dựng lại bộ ảnh sau này.
//
// 🔑 VÌ SAO CỔNG LÀ CỜ TRONG `app_config` CHỨ KHÔNG PHẢI SECRET TRÊN URL:
// route này được gọi bằng một cú GET trần (công cụ gọi được dùng không gắn được
// header). Nhét `?secret=` vào URL thì cái secret nằm lại trong log truy cập,
// trong lịch sử hội thoại, trong bất cứ chỗ nào chép cái URL đó — đúng thứ đã
// phải rotate service_role key Supabase một lần vì nó. Cổng vì thế là một cờ
// dưới DB, chỉ bật/tắt được bằng service key. TẮT là mặc định, và khi tắt thì
// route thoát ngay: 0 lượt gọi OpenAI, 0 đồng.
//
// Ba chốt chặn tiền, chép thẳng bài học `yt-drain`/`publish.ts`:
//   1. cờ tắt         → thoát trước mọi lượt gọi model
//   2. trần mỗi lượt  → `budget` trong config, một cú GET không đốt quá số đó
//   3. bức đã có      → bỏ qua (HEAD storage trước), gọi lại không vẽ lại
// Và lỗi CHẶN (401/429/quota) thì dừng CẢ LƯỢT chứ không thử tiếp 63 lần.

export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { generatePortraitImage } from '@/lib/image/openai-image';
import { logImageUsage } from '@/lib/agent/usage';
import { buildQueImagePrompt } from '@/lib/media/que-image-prompt';
import { getConfigValue } from '@/lib/config/appConfig';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BUCKET = 'portraits';
const PREFIX = 'que-phuc-hy';
/** Trần độ dài phần SỰ VIỆC nhận từ query — một cảnh thật chỉ cỡ 300 ký tự. */
const MAX_SCENE = 700;

interface QueRow {
  n: string;
  zh: string;
  li: string;
  f: string;
}

/** Nạp bảng 64 quẻ từ CHÍNH file client đang dùng — một nguồn, không chép lại. */
let _que: QueRow[] | null = null;
function loadQue(): QueRow[] {
  if (_que) return _que;
  const src = readFileSync(join(process.cwd(), 'public/tools-shared/kinh-dich.js'), 'utf8');
  const mod: { exports: { QUE?: QueRow[] } } = { exports: {} };
  new Function('module', 'exports', src)(mod, mod.exports);
  const q = mod.exports.QUE;
  if (!q || q.length !== 64) throw new Error(`bảng quẻ hỏng: đọc được ${q?.length ?? 0} dòng`);
  _que = q;
  return q;
}

/**
 * Đóng TRIỆN THẬT (`public/seal.png`) vào góc dưới-trái sau khi model vẽ xong.
 *
 * VÌ SAO KHÔNG ĐỂ MODEL VẼ: bảo nó "vẽ con dấu đỏ ghi 紫微明寶" thì mỗi bức ra
 * một con dấu khác nhau, chữ thường sai nét — 64 bức thành 64 con dấu, hỏng
 * đúng cái việc mà con dấu sinh ra để làm là NHẬN DIỆN.
 *
 * `blend: 'multiply'` chứ không ghép thẳng: file triện nền TRẮNG, không có
 * alpha (đã kiểm: 1024×1024, 3 kênh) nên ghép thẳng ra một ô trắng đè lên
 * tranh. Multiply cho trắng biến mất và giữ nguyên sắc đỏ — cũng đúng cách mực
 * dấu ăn vào giấy.
 */
async function dongTrien(pngB64: string): Promise<Buffer> {
  const anh = Buffer.from(pngB64, 'base64');
  const { width = 1024, height = 1536 } = await sharp(anh).metadata();
  const canh = Math.round(Math.min(width, height) * 0.085); // ~87px trên bản 1024
  const le = Math.round(canh * 0.7);
  const trien = await sharp(join(process.cwd(), 'public/seal.png')).resize(canh, canh).toBuffer();
  return sharp(anh)
    .composite([{ input: trien, top: height - canh - le, left: le, blend: 'multiply' }])
    .png()
    .toBuffer();
}

/** Lỗi CHẶN — hỏng ở tầng tài khoản/cửa, thử bức tiếp theo cũng hỏng y hệt. */
const BLOCKING = /401|403|429|invalid_api_key|insufficient_quota|billing|rate.?limit/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 1), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export async function GET(req: NextRequest) {
  // Fallback là cổng ĐÓNG: đọc config hỏng (mạng chớp, khoá chưa tạo) thì coi
  // như tắt. Fail-CLOSED có chủ ý — ngược `viral-budget.ts` — vì hỏng theo
  // hướng "mở" ở đây là tự đốt tiền model, không phải chặn oan người đã trả.
  const cfg = await getConfigValue<{
    enabled?: boolean;
    budget?: number;
    size?: string;
    quality?: string;
  }>('que_images.gen', { enabled: false });

  if (!cfg?.enabled) {
    return json(
      {
        ok: false,
        lyDo: 'Cổng đang TẮT. Bật bằng SQL rồi gọi lại:',
        sql: `update app_config set value = jsonb_set(value,'{enabled}','true') where key = 'que_images.gen';`,
        goiModel: 0,
      },
      403
    );
  }

  const QUE = loadQue();
  const sp = req.nextUrl.searchParams;
  let pick: number[];
  if (sp.get('all')) pick = QUE.map((_, i) => i + 1);
  else if (sp.get('que'))
    pick = sp
      .get('que')!
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n));
  else pick = [1, 2, 22, 23, 63]; // Càn · Khôn · Bí · Bác · Ký Tế

  const xau = pick.filter((k) => k < 1 || k > 64);
  if (xau.length) return json({ ok: false, lyDo: `Số quẻ ngoài 1–64: ${xau.join(', ')}` }, 400);

  const budget = Math.max(0, Number(cfg.budget ?? 5));
  const size = (cfg.size as '1024x1536') || '1024x1536';
  const quality = (cfg.quality as 'medium') || 'medium';

  const ketQua: { kingWen: number; ten: string; hanTu: string; url?: string; loi?: string }[] = [];
  let daVe = 0,
    boQua = 0,
    chan: string | null = null;

  for (const kw of pick) {
    if (chan) break;
    if (daVe >= budget) break;

    const q = QUE[kw - 1];
    // `?scene=` cho phép thử SỰ VIỆC mới mà không phải deploy lại mỗi vòng.
    // CỐ Ý chỉ nhận phần sự việc: khối phong cách, dòng thư pháp và triện
    // 紫微明寶 dựng ở server, người gọi không ghi đè được — nếu không thì
    // route thành cửa sinh ảnh tuỳ ý bằng tiền của mình.
    const p = buildQueImagePrompt({
      kingWen: kw,
      li: q.li,
      ten: q.n,
      zh: q.zh,
      sacThai: q.f,
      scene: (sp.get('scene') || '').slice(0, MAX_SCENE),
      // `?motifs=` — sáu sự việc theo thứ tự hào 1→6, ngăn bằng dấu `|`.
      motifs: (sp.get('motifs') || '')
        .slice(0, MAX_SCENE * 2)
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    // `?tag=` → ghi ra tên file khác thay vì đè bản cũ. Cần cho việc SO SÁNH:
    // muốn biết `quality=medium` có đủ không thì phải có cả hai bản cùng lúc mà
    // nhìn, chứ vẽ đè lên rồi thì mất bản để đối chiếu. Lọc ký tự lạ vì chuỗi
    // này đi thẳng vào đường dẫn lưu trữ.
    const tag = (sp.get('tag') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24);
    const path =
      `${PREFIX}/${String(p.phucHy).padStart(2, '0')}-kw${String(kw).padStart(2, '0')}` +
      `${tag ? '-' + tag : ''}.png`;
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    // Đã có thì thôi — gọi lại route sau khi đứt giữa chừng không vẽ lại từ đầu.
    // NHƯNG khi người gọi đưa `?scene=` thì ý định là VẼ ĐÈ bản cũ bằng sự việc
    // mới, nên bỏ qua chốt này — nếu không thì mọi lượt thử cảnh mới đều bị
    // chính bản cũ chặn lại và không hiểu vì sao không có gì đổi.
    const veDe = !!sp.get('scene') || !!sp.get('motifs');
    const co = veDe ? null : await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
    if (co?.ok) {
      boQua++;
      ketQua.push({ kingWen: kw, ten: p.ten, hanTu: p.hanTu, url });
      continue;
    }

    try {
      const img = await generatePortraitImage({ prompt: p.prompt, size, quality });
      void logImageUsage('que-phuc-hy', 'gpt-image-1', img.usage);
      const daDong = await dongTrien(img.b64);

      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        // `new Uint8Array(...)` chứ không đưa thẳng Buffer: kiểu `BodyInit` của
        // fetch không nhận Buffer, dù lúc chạy vẫn được.
        body: new Uint8Array(daDong),
      });
      if (!up.ok) throw new Error('lưu ảnh hỏng: ' + (await up.text().catch(() => '')).slice(0, 200));

      daVe++;
      ketQua.push({ kingWen: kw, ten: p.ten, hanTu: p.hanTu, url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'không rõ';
      ketQua.push({ kingWen: kw, ten: p.ten, hanTu: p.hanTu, loi: msg });
      if (BLOCKING.test(msg)) chan = msg; // dừng cả lượt, đừng đốt tiếp 63 lần
    }
  }

  return json({
    ok: !chan,
    daVe,
    boQua,
    loi: ketQua.filter((r) => r.loi).length,
    dungCaLuot: chan,
    conLai: pick.length - ketQua.length,
    quality,
    // Đo thật trên prod: medium ≈ 1.625đ/bức, high ≈ 6.313đ/bức (gấp 3,9 lần).
    // Trước đây chốt cứng 1.658 nên lượt `high` báo rẻ hơn thực tế 4 lần — đúng
    // loại "một con số chép tay rồi đứng im" mà repo đã dính nhiều lần.
    chiPhiUocTinhVnd: daVe * (quality === 'high' ? 6313 : quality === 'low' ? 500 : 1625),
    anh: ketQua,
  });
}
