// app/api/admin/chan-dung-thu/route.ts
// GET /api/admin/chan-dung-thu?ngay=3&thang=6&nam=1998&gio=1&gioi=nam
//
// Vẽ THỬ chân dung tiền kiếp ở NHIỀU mức chất lượng trên CÙNG MỘT prompt, rồi
// trả về một TRANG HTML xem hai bức cạnh nhau. Mục đích duy nhất: quyết định
// `quality` nào đủ dùng, và soi xem đổi sang gpt-image-2 có giữ được nét vẽ
// painterly pastel + 5 nền văn minh không.
//
// 🔑 VÌ SAO LÀ ROUTE TRÊN VERCEL CHỨ KHÔNG PHẢI SCRIPT CHẠY TAY:
// key OpenAI nằm sẵn ở đây và ra Internet được. Container Claude Code thì bị
// egress policy chặn `api.openai.com` (403 ở bước CONNECT), còn bắt người dùng
// mở terminal chạy script thì thừa một lớp việc — mở URL là xong.
//
// Cổng là CỜ TRONG `app_config`, không phải `?secret=` trên URL: secret nằm
// trên URL sẽ đọng lại trong log truy cập và trong bất cứ chỗ nào chép cái URL
// đó (đúng lý do đã phải rotate service_role key Supabase một lần). TẮT là mặc
// định; khi tắt route thoát ngay, 0 lượt gọi OpenAI, 0 đồng.
//
// Ba chốt chặn tiền, chép thẳng `que-images`/`yt-drain`:
//   1. cờ tắt          → thoát trước mọi lượt gọi model
//   2. trần số bức     → tối đa 3 bức một lượt, dù query xin bao nhiêu
//   3. ngân sách giờ   → dừng TRƯỚC khi mở bức mới nếu sắp hết hạn hàm
// Lỗi CHẶN (401/429/quota) thì dừng CẢ LƯỢT chứ không thử tiếp mức sau.

export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { generatePortraitImage } from '@/lib/image/openai-image';
import { logImageUsage } from '@/lib/agent/usage';
import { computeLaso } from '@/lib/engine/laso';
import { computePastLife } from '@/lib/engine/past-life';
import { buildFinalPastLifeImagePrompt } from '@/lib/agent/past-life-story';
import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BUCKET = 'portraits';
const PREFIX = 'chan-dung-thu';

const SIZES = ['1024x1024', '1024x1536', '1536x1024'] as const;
const QUALITIES = ['low', 'medium', 'high'] as const;
type Size = (typeof SIZES)[number];
type Quality = (typeof QUALITIES)[number];

/** Trần cứng số bức mỗi lượt gọi — cao nhất cũng chỉ 3 mức chất lượng. */
const MAX_ANH = 3;
/** Dừng trước khi mở bức mới nếu đã quá mốc này. `high` có tầng "reasoning"
 *  dựng bố cục trước khi vẽ nên lâu hơn hẳn — hết hạn hàm giữa lúc upload là
 *  mất bức vừa trả tiền. */
const NGAN_SACH_MS = 235_000;

const BLOCKING = /401|403|429|invalid_api_key|insufficient_quota|billing|rate.?limit/i;

// Giá USD/1M token — khớp IMAGE_MODEL_PRICING trong lib/agent/usage.ts.
const GIA = {
  'gpt-image-2': { text: 5, imgOut: 30 },
  'gpt-image-1': { text: 5, imgOut: 40 },
} as const;
const USD_VND = 25000;

const CHI_TEN = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const esc = (s: string) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 1), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

interface Ket {
  quality: Quality;
  url?: string;
  vnd?: number;
  giay?: string;
  tokenRa?: number;
  loi?: string;
}

export async function GET(req: NextRequest) {
  // Fail-CLOSED: đọc config hỏng thì coi như tắt. Hỏng theo hướng "mở" ở đây là
  // tự đốt tiền model, không phải chặn oan người đã trả.
  const cfg = await getConfigValue<{ enabled?: boolean; model?: string }>('chan_dung_thu.gen', {
    enabled: false,
  });

  if (!cfg?.enabled) {
    return json(
      {
        ok: false,
        lyDo: 'Cổng đang TẮT. Bật bằng SQL rồi mở lại URL:',
        sql:
          `insert into app_config (key, value) values ('chan_dung_thu.gen', '{"enabled":true}'::jsonb)\n` +
          `  on conflict (key) do update set value = jsonb_set(app_config.value,'{enabled}','true');`,
        tatLai: `update app_config set value = jsonb_set(value,'{enabled}','false') where key = 'chan_dung_thu.gen';`,
        goiModel: 0,
      },
      403
    );
  }

  const sp = req.nextUrl.searchParams;
  const num = (ten: string, mac: number) => {
    const v = Number(sp.get(ten));
    return Number.isFinite(v) && sp.get(ten) !== null ? v : mac;
  };

  // `hourBranch` là ĐỊA CHI 0..11 (Tý..Hợi), KHÔNG phải giờ đồng hồ — nhập nhầm
  // thì ra lá số khác mà không có gì báo. Nhận `?gio=` (0..23, tự quy đổi; giờ
  // Tý ôm 23h–01h nên cộng 1 trước khi chia đôi) hoặc `?chi=` (thẳng địa chi).
  const hourBranch =
    sp.get('chi') !== null
      ? Math.min(11, Math.max(0, num('chi', 1)))
      : Math.floor(((num('gio', 1) + 1) % 24) / 2);

  const birth = {
    day: num('ngay', 3),
    month: num('thang', 6),
    year: num('nam', 1998),
    hourBranch,
    gender: (sp.get('gioi') === 'nu' ? 'nu' : 'nam') as 'nam' | 'nu',
    isLunar: sp.get('am') === '1',
  };

  const lasoRes = computeLaso(birth);
  if (!lasoRes.ok || !lasoRes.ls) {
    return json({ ok: false, lyDo: lasoRes.error || 'Không lập được lá số.' }, 400);
  }
  const profile = computePastLife(lasoRes.ls, birth.gender);

  // `faceDescriptionEn` để RỖNG có chủ ý. Prod lấy đoạn tả mặt từ một lượt LLM
  // và nhánh đó vốn best-effort (rỗng vẫn vẽ). Gọi LLM cho từng mức thì ra hai
  // đoạn tả khác nhau → không còn biết ảnh khác nhau vì CHẤT LƯỢNG hay vì LỜI
  // TẢ, tức phép so mất hết ý nghĩa.
  const prompt = buildFinalPastLifeImagePrompt(profile, '');

  const size = (SIZES as readonly string[]).includes(sp.get('size') || '')
    ? (sp.get('size') as Size)
    : '1024x1536';
  const model = sp.get('model') && GIA[sp.get('model') as keyof typeof GIA] ? sp.get('model')! : cfg.model || 'gpt-image-2';
  const pick = (sp.get('quality') || 'medium,high')
    .split(',')
    .map((s) => s.trim())
    .filter((q): q is Quality => (QUALITIES as readonly string[]).includes(q))
    .slice(0, MAX_ANH);

  if (!pick.length) return json({ ok: false, lyDo: 'quality phải là low|medium|high' }, 400);

  const t0 = Date.now();
  const tag = (sp.get('tag') || String(t0).slice(-6)).replace(/[^a-z0-9-]/gi, '').slice(0, 24);
  const ketQua: Ket[] = [];
  let chan = '';
  let hetGio = false;

  for (const quality of pick) {
    if (chan) break;
    if (Date.now() - t0 > NGAN_SACH_MS) {
      hetGio = true;
      break;
    }

    const t1 = Date.now();
    try {
      const img = await generatePortraitImage({ prompt, size, quality, model });
      void logImageUsage('chan-dung-thu', img.model, img.usage);

      const path = `${PREFIX}/${tag}-${img.model}-${quality}.png`;
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        // `new Uint8Array(...)` chứ không đưa thẳng Buffer: kiểu BodyInit của
        // fetch không nhận Buffer, dù lúc chạy vẫn được.
        body: new Uint8Array(Buffer.from(img.b64, 'base64')),
      });
      if (!up.ok) throw new Error('lưu ảnh hỏng: ' + (await up.text().catch(() => '')).slice(0, 200));

      const p = GIA[img.model as keyof typeof GIA] || GIA['gpt-image-2'];
      ketQua.push({
        quality,
        url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`,
        tokenRa: img.usage.image_output_tokens,
        vnd: Math.round(
          ((img.usage.text_tokens * p.text + img.usage.image_output_tokens * p.imgOut) / 1e6) * USD_VND
        ),
        giay: ((Date.now() - t1) / 1000).toFixed(1),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'không rõ';
      ketQua.push({ quality, loi: msg });
      if (BLOCKING.test(msg)) chan = msg; // dừng cả lượt, đừng đốt tiếp mức sau
    }
  }

  // ── Trang xem ─────────────────────────────────────────────────────────
  const tong = ketQua.reduce((s, k) => s + (k.vnd || 0), 0);
  const the = ketQua
    .map((k) => {
      if (k.loi) {
        return `<div class="c"><h2>${esc(k.quality)}</h2><p class="err">✗ ${esc(k.loi)}</p></div>`;
      }
      return (
        `<div class="c"><h2>${esc(k.quality)}</h2>` +
        `<a href="${esc(k.url!)}" target="_blank"><img src="${esc(k.url!)}" alt="${esc(k.quality)}"></a>` +
        `<p class="m"><b>${(k.vnd || 0).toLocaleString('vi-VN')}đ</b> · ${esc(k.giay || '')}s · ${k.tokenRa} token ảnh</p></div>`
      );
    })
    .join('');

  const conLai = pick.filter((q) => !ketQua.some((k) => k.quality === q));

  return html(`<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>So chất lượng chân dung — ${esc(model)}</title>
<style>
:root{--bg:#0f1420;--fg:#e8eaf0;--mut:#9aa3b2;--line:#242c3d;--gold:#c9a961}
*{box-sizing:border-box}
body{margin:0;padding:24px;background:var(--bg);color:var(--fg);
 font:15px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif}
h1{font-size:19px;margin:0 0 4px;color:var(--gold)}
.sub{color:var(--mut);font-size:13px;margin:0 0 20px}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;max-width:1100px}
.c{border:1px solid var(--line);border-radius:10px;padding:14px;background:#141a28}
.c h2{margin:0 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:var(--gold)}
img{width:100%;height:auto;border-radius:6px;display:block;background:#000}
.m{margin:10px 0 0;font-size:13px;color:var(--mut)}
.m b{color:var(--fg);font-size:15px}
.err{color:#ff8a8a;font-size:13px;word-break:break-word}
.box{max-width:1100px;margin:22px 0 0;border:1px solid var(--line);border-radius:10px;
 padding:14px;background:#141a28}
.box h3{margin:0 0 8px;font-size:13px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;color:var(--mut);margin:0;
 font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.warn{color:#ffcf7a}
a{color:var(--gold)}
</style></head><body>
<h1>${esc(profile.occupation.title)} · ${esc(profile.era.label)} · ${profile.arc.portraitAge} tuổi</h1>
<p class="sub">${birth.gender === 'nu' ? 'Nữ' : 'Nam'} · ${birth.day}/${birth.month}/${birth.year}
 (${birth.isLunar ? 'âm' : 'dương'} lịch) · giờ ${esc(CHI_TEN[hourBranch] || '?')}
 — ${esc(model)} · ${esc(size)} · <b>tổng ${tong.toLocaleString('vi-VN')}đ</b></p>
<div class="row">${the || '<p class="err">Không vẽ được bức nào.</p>'}</div>
${chan ? `<div class="box"><h3>Dừng cả lượt</h3><p class="err">${esc(chan)}</p></div>` : ''}
${
  hetGio || conLai.length
    ? `<div class="box"><h3>Chưa vẽ</h3><p class="warn">${esc(conLai.join(', '))} — ${
        hetGio ? 'hết ngân sách thời gian của một lượt' : 'dừng sớm'
      }. Mở lại URL với <code>?quality=${esc(conLai.join(','))}</code> để vẽ nốt.</p></div>`
    : ''
}
<div class="box"><h3>Prompt gửi đi (${prompt.length} ký tự — CÙNG MỘT chuỗi cho mọi mức)</h3>
<pre>${esc(prompt)}</pre></div>
<div class="box"><h3>Xong thì tắt cổng lại</h3>
<pre>update app_config set value = jsonb_set(value,'{enabled}','false') where key = 'chan_dung_thu.gen';</pre></div>
</body></html>`);
}
