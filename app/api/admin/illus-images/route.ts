// app/api/admin/illus-images/route.ts
// GET /api/admin/illus-images?ids=quan-loc:tot:nam,tai-bach:xau:nu | ?tierA=1
//
// Sinh THƯ VIỆN HÌNH MINH HOẠ (mỗi phần luận giải một bức, 3 sắc thái ×
// 2 giới) bằng gpt-image-2 rồi cất vào Supabase Storage. Chạy TRÊN VERCEL vì
// key OpenAI ở đó — cùng lý do và cùng khuôn `app/api/admin/que-images/route.ts`.
//
// 🔑 VÌ SAO CỔNG LÀ CỜ TRONG `app_config` CHỨ KHÔNG PHẢI SECRET TRÊN URL:
// route này được gọi bằng một cú GET trần (công cụ gọi được dùng không gắn được
// header). Nhét `?secret=` vào URL thì cái secret nằm lại trong log truy cập,
// trong lịch sử hội thoại, trong bất cứ chỗ nào chép cái URL đó — đúng thứ đã
// phải rotate service_role key Supabase một lần vì nó. Cổng vì thế là một cờ
// dưới DB, chỉ bật/tắt được bằng service key. TẮT là mặc định, và khi tắt thì
// route thoát ngay: 0 lượt gọi OpenAI, 0 đồng.
//
// Ba chốt chặn tiền, chép thẳng bài học `yt-drain`/`publish.ts`/`que-images`:
//   1. cờ tắt         → thoát trước mọi lượt gọi model
//   2. trần mỗi lượt  → `budget` trong config, một cú GET không đốt quá số đó
//   3. bức đã có      → bỏ qua (HEAD storage trước), gọi lại không vẽ lại
// Và lỗi CHẶN (401/403/429/quota) thì dừng CẢ LƯỢT chứ không thử tiếp phần còn lại.

export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { generatePortraitImage } from '@/lib/image/openai-image';
import { logImageUsage } from '@/lib/agent/usage';
import {
  buildIllusPrompt,
  buildThangPrompt,
  KHIA_CANH,
  THANG_CANH,
  type Sac,
  type Gioi,
  type Tuoi,
} from '@/lib/media/illus-prompt';
import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BUCKET = 'portraits';
const PREFIX = 'illus';

/** Lỗi CHẶN — hỏng ở tầng tài khoản/cửa, thử bức tiếp theo cũng hỏng y hệt. */
const BLOCKING = /401|403|429|invalid_api_key|insufficient_quota|billing|rate.?limit/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 1), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

interface Id {
  kind: 'cung';
  khia: string;
  sac: Sac;
  gioi: Gioi;
  tuoi: Tuoi;
  v: number;
}

/** Vận Hạn 12 Tháng — KHÔNG có `sac` (xem lý do ở `THANG_CANH`, illus-prompt.ts). */
interface ThangId {
  kind: 'thang';
  thang: string;
  gioi: Gioi;
  tuoi: Tuoi;
  v: number;
}

type Pick = Id | ThangId;

const TUOIS: Tuoi[] = ['nhi-dong', 'thanh-nien', 'truong-thanh', 'trung-nien', 'lao-nien'];

/**
 * "quan-loc:tot:nam" hoặc "quan-loc:tot:nam:trung-nien:v2" → Id (12 cung +
 * tổng quan). "thang-08:nu" hoặc "thang-08:nu:truong-thanh:v1" → ThangId
 * (Vận Hạn 12 Tháng, không có phần sắc thái — phân biệt bằng tiền tố "thang-").
 */
function parseId(s: string): Pick | null {
  const parts = s.split(':');
  const khiaOrThang = parts[0];
  if (khiaOrThang && khiaOrThang.startsWith('thang-')) {
    if (!THANG_CANH[khiaOrThang]) return null;
    const [, gioi, tuoi, vRaw] = parts;
    if (gioi !== 'nam' && gioi !== 'nu') return null;
    const tuoiVal = (tuoi as Tuoi) || 'truong-thanh';
    if (!TUOIS.includes(tuoiVal)) return null;
    const v = vRaw ? Number(String(vRaw).replace(/^v/, '')) : 1;
    if (!Number.isInteger(v) || v < 1) return null;
    return { kind: 'thang', thang: khiaOrThang, gioi, tuoi: tuoiVal, v };
  }
  const [khia, sac, gioi, tuoi, vRaw] = parts;
  if (!khia || !KHIA_CANH[khia]) return null;
  if (sac !== 'tot' && sac !== 'trung' && sac !== 'xau') return null;
  if (gioi !== 'nam' && gioi !== 'nu') return null;
  const tuoiVal = (tuoi as Tuoi) || 'truong-thanh';
  if (!TUOIS.includes(tuoiVal)) return null;
  const v = vRaw ? Number(String(vRaw).replace(/^v/, '')) : 1;
  if (!Number.isInteger(v) || v < 1) return null;
  return { kind: 'cung', khia, sac, gioi, tuoi: tuoiVal, v };
}

const SACS: Sac[] = ['tot', 'trung', 'xau'];
const GIOIS: Gioi[] = ['nam', 'nu'];

/** Tier A: 13 khía cạnh × 3 sắc thái × 2 giới, v1, người trưởng thành — phủ
 * đúng 13 phần (1 tổng quan + 12 cung) của Luận Giải / Chu Trình Cuộc Đời. */
function tierA(): Pick[] {
  const out: Pick[] = [];
  for (const khia of Object.keys(KHIA_CANH)) {
    for (const sac of SACS) {
      for (const gioi of GIOIS) {
        out.push({ kind: 'cung', khia, sac, gioi, tuoi: 'truong-thanh', v: 1 });
      }
    }
  }
  return out;
}

/** Tier Tháng: 12 tháng âm lịch × 2 giới, v1, người trưởng thành — phủ đúng
 * 12 phần (5-16) của Vận Hạn 12 Tháng chưa có ảnh. */
function tierThang(): Pick[] {
  const out: Pick[] = [];
  for (const thang of Object.keys(THANG_CANH)) {
    for (const gioi of GIOIS) {
      out.push({ kind: 'thang', thang, gioi, tuoi: 'truong-thanh', v: 1 });
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  // Fallback là cổng ĐÓNG: đọc config hỏng (mạng chớp, khoá chưa tạo) thì coi
  // như tắt. Fail-CLOSED có chủ ý — hỏng theo hướng "mở" ở đây là tự đốt tiền
  // model, không phải chặn oan người đã trả.
  const cfg = await getConfigValue<{
    enabled?: boolean;
    budget?: number;
    size?: string;
    quality?: string;
    model?: string;
  }>('illus_images.gen', { enabled: false });

  if (!cfg?.enabled) {
    return json(
      {
        ok: false,
        lyDo: 'Cổng đang TẮT. Bật bằng SQL rồi gọi lại:',
        sql: `update app_config set value = jsonb_set(value,'{enabled}','true') where key = 'illus_images.gen';`,
        goiModel: 0,
      },
      403
    );
  }

  const sp = req.nextUrl.searchParams;
  let pick: Pick[];
  if (sp.get('tierA')) pick = tierA();
  else if (sp.get('tierThang')) pick = tierThang();
  else if (sp.get('ids')) {
    const raw = sp
      .get('ids')!
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsed = raw.map(parseId);
    const bad = raw.filter((_, i) => !parsed[i]);
    if (bad.length) return json({ ok: false, lyDo: `id không hợp lệ: ${bad.join(', ')}` }, 400);
    pick = parsed as Pick[];
  } else {
    // Mặc định: 2 bức mẫu (đủ để soi phong cách + biên độ sắc thái), cùng
    // tinh thần "SAMPLE" của que-images (không tự ý đốt tiền khi gọi trần).
    pick = [
      { kind: 'cung', khia: 'quan-loc', sac: 'tot', gioi: 'nam', tuoi: 'truong-thanh', v: 1 },
      { kind: 'cung', khia: 'tai-bach', sac: 'xau', gioi: 'nu', tuoi: 'truong-thanh', v: 1 },
    ];
  }

  const budget = Math.max(0, Number(cfg.budget ?? 5));
  const SIZES = ['1024x1024', '1024x1536', '1536x1024'] as const;
  const QUALITIES = ['low', 'medium', 'high'] as const;
  type Size = (typeof SIZES)[number];
  type Quality = (typeof QUALITIES)[number];
  const size: Size = SIZES.includes(cfg.size as Size) ? (cfg.size as Size) : '1536x1024';
  const quality: Quality = QUALITIES.includes(cfg.quality as Quality) ? (cfg.quality as Quality) : 'medium';

  // Model đọc từ config, allowlist chứ không nhận chuỗi tự do — cùng lý do
  // `que-images`: giá trị này đi thẳng vào body gọi OpenAI.
  const GIA_VND: Record<string, Record<Quality, number>> = {
    // Đo thật trên khổ 1536×1024, quality medium (3 bức đầu, xem PR #821).
    'gpt-image-2': { low: 400, medium: 1100, high: 3500 },
  };
  const model = cfg.model && GIA_VND[cfg.model] ? cfg.model : 'gpt-image-2';

  const ketQua: { id: string; url?: string; loi?: string }[] = [];
  let daVe = 0,
    boQua = 0,
    chan: string | null = null;

  for (const it of pick) {
    if (chan) break;
    if (daVe >= budget) break;

    const p = it.kind === 'thang' ? buildThangPrompt(it) : buildIllusPrompt(it);
    const path = `${PREFIX}/${p.id}.png`;
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    // `?vede=1` — vẽ đè có chủ đích (đổi model/prompt), KHÔNG đổi id. Không có
    // cờ này thì "đã có thì thôi" giữ nguyên bản cũ — cần khi so sánh phong
    // cách hai lượt sinh mà không muốn mồ côi URL đang được trang tham chiếu.
    const veDe = sp.get('vede') === '1';
    const co = veDe ? null : await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
    if (co?.ok) {
      boQua++;
      ketQua.push({ id: p.id, url });
      continue;
    }

    try {
      const img = await generatePortraitImage({ prompt: p.prompt, size, quality, model });
      void logImageUsage('illus', img.model, img.usage, img.durationMs);

      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        // `new Uint8Array(...)` chứ không đưa thẳng base64 string: kiểu
        // `BodyInit` của fetch không nhận Buffer, dù lúc chạy vẫn được.
        body: new Uint8Array(Buffer.from(img.b64, 'base64')),
      });
      if (!up.ok) throw new Error('lưu ảnh hỏng: ' + (await up.text().catch(() => '')).slice(0, 200));

      daVe++;
      ketQua.push({ id: p.id, url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'không rõ';
      ketQua.push({ id: p.id, loi: msg });
      if (BLOCKING.test(msg)) chan = msg; // dừng cả lượt, đừng đốt tiếp phần còn lại
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
    model,
    chiPhiUocTinhVnd: daVe * GIA_VND[model][quality],
    anh: ketQua,
  });
}
