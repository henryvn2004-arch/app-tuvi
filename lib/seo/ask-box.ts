// lib/seo/ask-box.ts
// ============================================================
// Ô "Hỏi Thầy" dựng sẵn trong HTML của trang SEO (SSR) — cửa vào chat `/app`.
//
// Vì sao là LINK sang `/app` chứ không nhúng rail: `shell.js` nặng ~426 KB,
// nhúng vào đúng những trang Google đang xếp hạng là tự đốt LCP/CWV; lịch sử,
// đăng nhập, Lượng, thầy đều sống ở `/app`. Trang SEO chỉ lo MỞ câu chuyện:
// câu hỏi đi qua `?q=&thay=` (cùng hợp đồng với trang chủ `/` và
// `public/app-chat.html`), ngày sinh (nếu trang có) đi qua
// `?ngay=&thang=&nam=&gio=&gioitinh=` (`Shell._birthFromQuery`).
//
// Dựng TĨNH trong HTML (không chèn bằng JS) — box JS chèn vào đầu khung nội
// dung vừa gây CLS vừa thành phần tử LCP (CLAUDE.md "CLS"). JS ở cuối trang chỉ
// làm việc phụ: đo `cta_click`, chọn thầy cho câu gõ tự do, thanh dính đáy.
// Không có JS thì câu gợi ý (thẻ <a>) lẫn form GET vẫn chạy.
//
// ⚠️ Chữ hiển thị: không hứa "miễn phí" (khách vô danh chỉ có vài lượt thử,
// hết lượt là tường trả phí), không nhắc "AI", cửa chat chỉ có một tên "Hỏi Thầy".
// ============================================================

// ⚠️ KHÔNG import `thayChoCauHoi` (lib/agent/thay-theo-chu-de.ts) vào đây: nó kéo
// theo luan-chu-de → prompts → tools → tuvi-engine, tức cả tầng agent vào bundle
// của mọi trang SEO (cold start). Câu gợi ý tự ghi thầy (`AskChip.thay`); câu gõ
// tự do thì client hỏi `/api/thay-hoi` như trang chủ.

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

/** Thầy đứng ô hỏi theo chuyên mục trang — khớp `master_profiles.tool_ids`/môn chuyên. */
export const THAY_THEO_CHUYEN_MUC: Record<string, string> = {
  'tuong-hop-hon-nhan': 'ngoc-tinh',
  'tuong-hop-lam-an': 'ngoc-tinh',
  'van-han': 'co-nguyet',
  'tu-vi-nam-sinh': 'co-nguyet',
  'y-nghia-sao': 'co-nguyet',
  'la-so': 'co-nguyet',
  'chon-ngay': 'nhat-nguyen',
  'xem-tuong': 'bac-minh',
  'phong-thuy': 'huyen-khong',
  'lam-dep': 'huyen-khong',
  'dat-ten': 'thien-an',
};

export type ThayCard = { id: string; name: string | null; mon: string | null; greeting: string | null };

/**
 * Tên/môn/lời chào của thầy — đọc `master_profiles` (nguồn duy nhất, không chép
 * chữ vào code). Hỏng/chậm thì trả thẻ chỉ có `id`: ô hỏi vẫn dựng được, chỉ
 * thiếu tên — trang SEO không được chết vì một khối trang trí.
 */
export async function fetchThayCard(id: string, timeoutMs = 1500): Promise<ThayCard> {
  const bare: ThayCard = { id, name: null, mon: null, greeting: null };
  if (!SB_URL || !SB_KEY) return bare;
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/master_profiles?id=eq.${encodeURIComponent(id)}&select=display_name,discipline,greeting&limit=1`,
      {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    if (!r.ok) return bare;
    const rows = (await r.json()) as { display_name?: string | null; discipline?: string | null; greeting?: string | null }[];
    const row = rows[0];
    if (!row) return bare;
    return { id, name: row.display_name || null, mon: row.discipline || null, greeting: row.greeting || null };
  } catch (e) {
    console.error('[ask-box] master_profiles', e);
    return bare;
  }
}

/**
 * Một câu gợi ý. `laso` = thầy cần lá số để trả lời → chat xin ngày sinh trước
 * (khi link chưa mang ngày sinh). `thay` = thầy phụ trách câu này (id
 * `master_profiles`, khớp `THAY_THEO_CHU_DE`/`VIEC` ở thay-theo-chu-de.ts);
 * bỏ trống = thầy của trang.
 */
export type AskChip = { q: string; laso?: boolean; thay?: string };

// ── Câu gợi ý theo chuyên mục /tu-vi ────────────────────────────────────────
// Câu phải TỰ ĐỦ NGHĨA (mang tên tuổi/chủ đề vào chính câu): thầy ở `/app`
// chỉ nhận đúng câu này, không nhận nội dung bài vừa đọc.

function haiTuoi(h1: string): [string, string] | null {
  const m = /Tuổi\s+(\S+\s+\S+)\s+Và\s+Tuổi\s+(\S+\s+\S+)/i.exec(h1);
  return m ? [m[1], m[2]] : null;
}

/** Phần chủ đề của h1 (bỏ đuôi " — …"). */
export function chuDeTrang(h1: string): string {
  return String(h1 || '').split(' — ')[0].trim();
}

export function chipsForSeoPage(page: { category?: string; h1?: string; title?: string; can_chi?: string | null }): AskChip[] {
  const h1 = String(page.h1 || page.title || '');
  const s = chuDeTrang(h1);
  const cc = String(page.can_chi || '').trim();
  const nam = (/Năm\s+(\d{4})/.exec(h1) || [])[1];
  switch (page.category) {
    case 'tuong-hop-hon-nhan': {
      const t = haiTuoi(h1);
      if (t) return [
        { q: `Tuổi ${t[0]} và tuổi ${t[1]} cưới năm nào thì đẹp?` },
        { q: `Tuổi ${t[0]} lấy tuổi ${t[1]} thì nên hoá giải xung khắc thế nào?` },
        { q: `Xem hợp tuổi theo ngày giờ sinh thật của hai vợ chồng mình`, laso: true },
      ];
      break;
    }
    case 'tuong-hop-lam-an': {
      const t = haiTuoi(h1);
      if (t) return [
        { q: `Tuổi ${t[0]} hùn vốn với tuổi ${t[1]} thì ai nên giữ tiền?`, thay: 'dieu-khong' },
        { q: `Tuổi ${t[0]} và tuổi ${t[1]} hợp tác năm nay có thuận không?` },
        { q: `Xem hợp tác làm ăn theo ngày giờ sinh thật của hai người`, laso: true },
      ];
      break;
    }
    case 'van-han':
      if (cc && nam) return [
        { q: `Năm ${nam} tuổi ${cc} nên tránh những việc gì?` },
        { q: `Năm ${nam} tuổi ${cc} tháng nào cần cẩn thận nhất?` },
        { q: `Xem vận hạn năm ${nam} theo đúng ngày giờ sinh của tôi`, laso: true },
      ];
      break;
    case 'tu-vi-nam-sinh':
      if (cc) return [
        { q: `Tuổi ${cc} năm nay công việc, tiền bạc thế nào?`, laso: true, thay: 'dieu-khong' },
        { q: `Tuổi ${cc} hợp làm nghề gì?`, laso: true, thay: 'dieu-khong' },
        { q: `Xem lá số của tôi theo đúng giờ sinh`, laso: true },
      ];
      break;
    case 'y-nghia-sao':
      return [
        { q: `Lá số của tôi có ${s.replace(/^Sao\s+/i, 'sao ')} không?`, laso: true },
        { q: `${s} tốt hay xấu với tôi?`, laso: true },
        { q: `Xem cả lá số của tôi xem sao nào đang chiếu mệnh`, laso: true },
      ];
    case 'chon-ngay':
      return [
        { q: `${s}: chọn giúp tôi ngày hợp tuổi nhất` },
        { q: `${s}: giờ nào tốt nhất trong ngày đó?` },
        { q: `Chọn ngày tốt cho việc riêng của tôi` },
      ];
    case 'xem-tuong':
      return [
        { q: `Xem tướng giúp tôi qua ảnh chân dung` },
        { q: `${s} nói gì về tính cách và vận số?` },
        { q: `Xem tướng khuôn mặt tôi hợp nghề gì?` },
      ];
    case 'phong-thuy':
      return [
        { q: `${s} — nhà tôi có hợp không?` },
        { q: `Xem phong thủy hướng nhà hợp tuổi tôi` },
        { q: `Bàn làm việc của tôi nên đặt hướng nào?` },
      ];
    case 'lam-dep':
      return [
        { q: `${s} — có hợp với tôi không?` },
        { q: `Tôi mệnh gì, nên dùng màu gì cho may mắn?` },
        { q: `Năm nay tôi nên chọn phong cách nào cho hợp mệnh?` },
      ];
    case 'dat-ten':
      return [
        { q: `${s}: gợi ý giúp tôi vài tên cho con` },
        { q: `Đặt tên cho con sắp sinh hợp tuổi bố mẹ` },
        { q: `Tên tôi định đặt có hợp mệnh không?` },
      ];
  }
  return [
    { q: `${s}: áp vào trường hợp của tôi thì sao?`, laso: true },
    { q: `Năm nay của tôi thế nào?`, laso: true, thay: 'co-nguyet' },
    { q: `Xem lá số của tôi theo đúng giờ sinh`, laso: true },
  ];
}

// ── Dựng HTML ───────────────────────────────────────────────────────────────

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Ngày sinh đi kèm (trang /la-so) — tên tham số khớp `Shell._birthFromQuery`. */
export type AskBirth = { ngay: number; thang: number; nam: number; gio: number; gioitinh: 'nam' | 'nu' };

function birthParams(b: AskBirth | null | undefined): Record<string, string> {
  if (!b) return {};
  return { ngay: String(b.ngay), thang: String(b.thang), nam: String(b.nam), gio: String(b.gio), gioitinh: b.gioitinh };
}

/** Link mở chat — cùng hợp đồng `?q=&thay=&laso=` với trang chủ `/`. */
export function askHref(chip: AskChip, thayTrang: string, birth?: AskBirth | null): string {
  const p = new URLSearchParams({ q: chip.q, thay: chip.thay || thayTrang, ...birthParams(birth) });
  if (!birth && chip.laso) p.set('laso', '1');
  return `/app?${p.toString()}`;
}

export type AskBoxOpts = {
  /** Vị trí trên trang — vào `cta_click.meta.box`. */
  box: 'top' | 'end';
  /** Họ trang, vd `tu-vi:tuong-hop-hon-nhan` — vào `cta_click.meta.fam`. */
  fam: string;
  thay: ThayCard;
  title: string;
  chips: AskChip[];
  placeholder: string;
  /** Câu gõ tự do được gắn đầu này (tên bài) để thầy biết đang hỏi về cái gì. */
  prefix?: string;
  birth?: AskBirth | null;
};

export function askBoxHTML(o: AskBoxOpts): string {
  const who = o.thay.name ? `Thầy ${esc(o.thay.name)}` : 'Nhóm thầy Minh Bảo';
  const mon = o.thay.mon ? `<span class="ask-mon">${esc(o.thay.mon)}</span>` : '';
  // Lời chào của thầy thường là "đưa ngày giờ sinh ra đây" — trang đã có ngày
  // sinh (/la-so) thì câu đó sai ngữ cảnh, bỏ.
  const bubble = o.box === 'top' && !o.birth && o.thay.greeting ? `<p class="ask-bubble">${esc(o.thay.greeting)}</p>` : '';
  const chips = o.chips
    .map(
      (c, i) =>
        `<a class="ask-chip" rel="nofollow" data-pos="${i + 1}" href="${esc(askHref(c, o.thay.id, o.birth))}"><span>${esc(c.q)}</span><b aria-hidden="true">→</b></a>`,
    )
    .join('');
  const hidden = Object.entries({ thay: o.thay.id, ...birthParams(o.birth) })
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`)
    .join('');
  return `<section class="ask ask-${o.box}" id="ask-${o.box}" data-fam="${esc(o.fam)}" data-box="${o.box}" aria-label="Hỏi Thầy">
  <div class="ask-head">
    <img class="ask-ava" src="/authors/${esc(o.thay.id)}.jpg" width="56" height="56" alt="" ${o.box === 'top' ? 'fetchpriority="low"' : 'loading="lazy"'} decoding="async">
    <div class="ask-id"><div class="ask-eyebrow">Hỏi Thầy</div><div class="ask-who">${who}${mon}</div></div>
  </div>
  <p class="ask-t">${esc(o.title)}</p>
  ${bubble}
  <div class="ask-chips">${chips}</div>
  <form class="ask-f" action="/app" method="get" data-prefix="${esc(o.prefix || '')}">
    ${hidden}
    <textarea name="q" rows="1" maxlength="500" required placeholder="${esc(o.placeholder)}" aria-label="Câu hỏi của bạn"></textarea>
    <button type="submit">Hỏi Thầy <b aria-hidden="true">→</b></button>
  </form>
</section>`;
}

/** Thanh dính đáy — hiện khi cả hai ô hỏi đều khuất (JS bật `.on`). */
export function askBarHTML(thay: ThayCard, label: string, fam: string): string {
  return `<div class="ask-bar" id="ask-bar" data-fam="${esc(fam)}" data-box="bar" hidden>
  <a class="ask-bar-go" href="#ask-top"><img src="/authors/${esc(thay.id)}.jpg" width="32" height="32" alt="" loading="lazy" decoding="async"><span>${esc(label)}</span><b aria-hidden="true">→</b></a>
  <button class="ask-bar-x" type="button" aria-label="Ẩn">✕</button>
</div>`;
}

export const ASK_CSS = `
.ask{margin:28px 0;padding:22px 22px 20px;border-radius:16px;background:linear-gradient(140deg,#0F2A3D 0%,#1b4262 100%);color:#fff;border:1px solid #C8A96A;box-shadow:0 10px 30px rgba(15,42,61,.22);font-family:'Be Vietnam Pro',Arial,sans-serif;font-weight:400;line-height:1.5}
.ask-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.ask-ava{width:56px;height:56px;border-radius:50%;border:2px solid #C8A96A;object-fit:cover;background:#F9F4EB;flex:none}
.ask .ask-eyebrow{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C8A96A}
.ask .ask-who{font-size:15px;font-weight:600;color:#fff;line-height:1.35}
.ask .ask-mon{display:block;font-size:12px;font-weight:400;color:rgba(255,255,255,.72)}
.ask .ask-t{font-family:'Noto Serif',Georgia,serif;font-size:22px;line-height:1.35;font-weight:600;color:#fff;margin:0 0 10px}
.ask .ask-bubble{position:relative;margin:0 0 14px;padding:10px 14px;border-radius:4px 14px 14px 14px;background:rgba(255,255,255,.1);font-size:14px;line-height:1.6;color:rgba(255,255,255,.92);font-style:italic}
.ask-chips{display:grid;gap:8px;margin-bottom:12px}
.ask .ask-chip{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:10px;background:#fff;color:#0F2A3D;text-decoration:none;font-size:15px;font-weight:500;line-height:1.4;border-left:4px solid #C8A96A;transition:transform .12s,box-shadow .12s}
.ask .ask-chip b{color:#7C6942;font-size:18px;flex:none}
.ask .ask-chip:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.18)}
.ask-f{display:flex;gap:8px;align-items:stretch}
.ask-f textarea{flex:1;min-width:0;resize:none;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:12px 14px;font:inherit;font-size:16px;line-height:1.4;min-height:48px}
.ask-f textarea::placeholder{color:rgba(255,255,255,.6)}
.ask-f textarea:focus{outline:2px solid #C8A96A;outline-offset:1px}
.ask-f button{flex:none;border:0;border-radius:10px;background:#C8A96A;color:#0F2A3D;font:inherit;font-size:15px;font-weight:700;padding:0 18px;cursor:pointer;white-space:nowrap}
.ask-f button:hover{background:#d8bb80}
.ask-f button[disabled]{opacity:.6;cursor:wait}
.ask-bar{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translate(-50%,140%);z-index:900;display:flex;align-items:center;gap:4px;max-width:calc(100% - 24px);padding:6px 6px 6px 8px;border-radius:999px;background:#0F2A3D;border:1px solid #C8A96A;box-shadow:0 8px 28px rgba(0,0,0,.28);transition:transform .25s ease}
.ask-bar[hidden]{display:none}
.ask-bar.on{transform:translate(-50%,0)}
.ask-bar-go{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding-right:6px;min-width:0}
.ask-bar-go img{width:32px;height:32px;border-radius:50%;border:1.5px solid #C8A96A;object-fit:cover;flex:none}
.ask-bar-go span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ask-bar-go b{color:#C8A96A}
.ask-bar-x{flex:none;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:rgba(255,255,255,.6);font-size:14px;cursor:pointer}
@media(max-width:600px){.ask{padding:18px 16px 16px;margin:22px -4px}.ask .ask-t{font-size:19px}.ask-f{flex-direction:column}.ask-f button{padding:13px 18px}}
@media(prefers-reduced-motion:reduce){.ask-bar,.ask-chip{transition:none}}
`;

/**
 * JS phụ (ES5, inline, cuối trang). Mọi nhánh đều tự lùi: không có `Track`,
 * `IntersectionObserver`, `sessionStorage` hay `/api/thay-hoi` thì ô hỏi vẫn
 * mở chat bằng link/form thường.
 */
export const ASK_SCRIPT = `<script>
(function(){
  function tr(el,kind,extra){
    try{
      var box=el.closest('[data-fam]'),m={from:'seo_ask',kind:kind,fam:box&&box.getAttribute('data-fam'),box:box&&box.getAttribute('data-box')};
      for(var k in extra){ if(Object.prototype.hasOwnProperty.call(extra,k)) m[k]=extra[k]; }
      if(window.Track) window.Track.event('cta_click',{tool_id:'app-home',meta:m});
    }catch(e){ /* đo đếm không được chặn đường đi */ }
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('.ask-chip');
    if(a) tr(a,'chip',{pos:+a.getAttribute('data-pos')});
  });
  var forms=document.querySelectorAll('.ask-f');
  for(var i=0;i<forms.length;i++) (function(f){
    var ta=f.querySelector('textarea'),btn=f.querySelector('button');
    ta.addEventListener('keydown',function(e){
      if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){ e.preventDefault(); if(f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit',{cancelable:true})); }
    });
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var t=ta.value.trim().slice(0,450);
      if(!t){ ta.focus(); return; }
      var pre=f.getAttribute('data-prefix'),q=(pre?pre+': ':'')+t;
      var p=new URLSearchParams(new FormData(f)); p.set('q',q);
      if(btn) btn.disabled=true;
      var gone=false;
      function go(thay,laso){
        if(gone) return; gone=true;
        if(thay) p.set('thay',thay);
        if(laso&&!p.get('ngay')) p.set('laso','1');
        tr(f,'free',{thay:p.get('thay')});
        location.href='/app?'+p.toString();
      }
      // Câu tự do có thể lệch chủ đề trang — hỏi /api/thay-hoi (không gọi model)
      // như trang chủ; chậm/hỏng thì giao cho thầy của trang.
      setTimeout(function(){ go(null,false); },1500);
      fetch('/api/thay-hoi?q='+encodeURIComponent(t),{cache:'no-store'})
        .then(function(r){ return r.ok?r.json():null; })
        .then(function(j){ go(j&&j.thay&&j.thay!=='thai-hu'?j.thay:null,!!(j&&j.chuDe)); })
        .catch(function(){ go(null,false); });
    });
  })(forms[i]);

  var bar=document.getElementById('ask-bar'),top=document.getElementById('ask-top');
  if(!bar||!top||!('IntersectionObserver' in window)) return;
  try{ if(sessionStorage.getItem('ask_bar_off')) return; }catch(e){}
  var boxes=document.querySelectorAll('.ask'),seen={},off=false;
  bar.hidden=false;
  function paint(){
    var any=false; for(var k in seen) if(seen[k]) any=true;
    var past=top.getBoundingClientRect().bottom<0;
    bar.classList.toggle('on',!off&&!any&&past);
  }
  var io=new IntersectionObserver(function(es){
    es.forEach(function(en){ seen[en.target.id]=en.isIntersecting; }); paint();
  });
  for(var j=0;j<boxes.length;j++) io.observe(boxes[j]);
  window.addEventListener('scroll',paint,{passive:true});
  bar.querySelector('.ask-bar-x').addEventListener('click',function(){
    off=true; paint(); try{ sessionStorage.setItem('ask_bar_off','1'); }catch(e){}
  });
  bar.querySelector('.ask-bar-go').addEventListener('click',function(e){
    e.preventDefault(); tr(bar,'bar',{});
    top.scrollIntoView({behavior:'smooth',block:'center'});
    var t=top.querySelector('textarea'); if(t) setTimeout(function(){ t.focus({preventScroll:true}); },400);
  });
})();
</script>`;
