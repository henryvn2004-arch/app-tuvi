// scripts/nghiem-chung/pack.ts
// ============================================================
// Bước 1 của pipeline Nghiệm Chứng — KHÔNG gọi LLM.
// Với mỗi người có giờ sinh: chọn bài Wikipedia dài nhất (tiếng Anh hoặc
// tiếng bản xứ, qua sitelinks Wikidata), chạy engine (bản kê lá số + giờ
// cạnh bên nếu sát ranh giới canh giờ), ghi gói `work/nghiem-chung/pack/<slug>.json`.
//
//   npx tsx scripts/nghiem-chung/pack.ts --qids Q1,Q2      # vài người
//   npx tsx scripts/nghiem-chung/pack.ts --from 0 --to 500 # theo thứ tự ưu tiên
//
// Đầu vào: work/nghiem-chung/celebs.jsonl (xuất từ celeb_births).
// Gói đã có thì bỏ qua (chạy lại an toàn). Wikimedia: UA đàng hoàng, ≤4 luồng,
// lùi lại khi 429 — đã bị chặn một lần khi gọi trần.
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { banKeLaSo } from '@/lib/nghiem-chung/engine-ref';

const ROOT = process.cwd();
const WORK = join(ROOT, 'work', 'nghiem-chung');
const PACK = join(WORK, 'pack');
mkdirSync(PACK, { recursive: true });
const UA = 'TuviMinhBaoResearch/1.0 (https://www.tuviminhbao.com; henryvn2004@gmail.com)';
const MAX_CHARS = 22000;

export interface Celeb {
  qid: string;
  name: string;
  occupation: string | null;
  country: string | null;
  wiki_url: string | null;
  image_file: string | null;
  birth_date: string;
  birth_time: string;
  birth_tz_off: number;
  birth_place: string | null;
  rodden: 'AA' | 'A';
  gender: 'nam' | 'nu' | null;
  sitelinks: number;
  fame_score: number | null;
}

const argv = process.argv.slice(2);
const opt = (k: string) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : undefined;
};

// ── slug ────────────────────────────────────────────────────
export function slugify(s: string): string {
  return s
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/** Thứ tự ưu tiên: có bài tiếng Việt → nhiều sitelinks → fame. Slug trùng thì gắn qid. */
export function danhSach(): (Celeb & { slug: string })[] {
  const rows: Celeb[] = readFileSync(join(WORK, 'celebs.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  rows.sort(
    (a, b) =>
      Number(/vi\.wikipedia/.test(b.wiki_url || '')) - Number(/vi\.wikipedia/.test(a.wiki_url || '')) ||
      (b.sitelinks || 0) - (a.sitelinks || 0) ||
      (b.fame_score || 0) - (a.fame_score || 0) ||
      a.qid.localeCompare(b.qid),
  );
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(slugify(r.name), (seen.get(slugify(r.name)) || 0) + 1);
  return rows.map((r) => {
    const s = slugify(r.name) || r.qid.toLowerCase();
    return { ...r, slug: (seen.get(s) || 0) > 1 ? `${s}-${r.qid.toLowerCase()}` : s };
  });
}

// ── ngôn ngữ bản xứ theo quốc tịch (tên quốc gia trong DB là tiếng Việt) ──
const BAN_XU: [RegExp, string][] = [
  [/Pháp|Monaco/, 'fr'],
  [/Ý|San Marino/, 'it'],
  [/Đức|Áo|Liechtenstein/, 'de'],
  [/Tây Ban Nha|México|Argentina|Perú|Chile|Colombia|Venezuela|Cuba|Uruguay/, 'es'],
  [/Brasil|Bồ Đào Nha/, 'pt'],
  [/Hà Lan/, 'nl'],
  [/Bỉ/, 'fr'],
  [/Na Uy/, 'no'],
  [/Thụy Điển/, 'sv'],
  [/Đan Mạch/, 'da'],
  [/Phần Lan/, 'fi'],
  [/Ba Lan/, 'pl'],
  [/Thụy Sĩ/, 'de'],
  [/Nga|Liên Xô/, 'ru'],
  [/Nhật/, 'ja'],
  [/Israel/, 'he'],
  [/Séc|Tiệp/, 'cs'],
  [/Hungary/, 'hu'],
];
const banXu = (country: string | null) => BAN_XU.find(([re]) => re.test(country || ''))?.[1] || null;

// ── HTTP có lùi lại ─────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function getJson(url: string): Promise<unknown> {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) {
      const ra = Number(r.headers.get('retry-after')) || 2 ** i;
      await sleep(Math.min(60, ra) * 1000);
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  }
  throw new Error(`429/5xx lặp lại: ${url}`);
}

async function sitelinks(qids: string[]): Promise<Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, string>> = {};
  for (let i = 0; i < qids.length; i += 50) {
    const ids = qids.slice(i, i + 50).join('|');
    const j = (await getJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=sitelinks&format=json`,
    )) as { entities: Record<string, { sitelinks?: Record<string, { title: string }> }> };
    for (const [q, e] of Object.entries(j.entities || {})) {
      out[q] = {};
      for (const [site, v] of Object.entries(e.sitelinks || {})) out[q][site] = v.title;
    }
  }
  return out;
}

/**
 * Lấy mã wiki qua `index.php?action=raw` (đi đường cache trang) rồi tự bóc thành
 * chữ thường. KHÔNG dùng `api.php?prop=extracts`: đường đó bị Wikimedia trả 429
 * (`x-envoy-ratelimited`) ngay từ vài chục request đầu qua proxy container.
 * Agent chép `trich` từ chính chữ đã bóc này, nên bộ kiểm tra vẫn dò khớp được.
 */
async function extract(lang: string, title: string, depth = 0): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(
      `https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=raw`,
      { headers: { 'User-Agent': UA } },
    );
    if (r.status === 429 || r.status >= 500) {
      await sleep(Math.min(60, Number(r.headers.get('retry-after')) || 2 ** i) * 1000);
      continue;
    }
    if (!r.ok) return '';
    const raw = await r.text();
    const redirect = raw.match(/^#[A-ZÀ-Ỹ]+\s*:?\s*\[\[([^\]|#]+)/i);
    if (redirect && depth < 2) return extract(lang, redirect[1], depth + 1);
    return boc(raw);
  }
  return '';
}

/** Bóc mã wiki → chữ thường (đủ cho đọc hiểu + dò trích dẫn, không cần hoàn hảo). */
function boc(w: string): string {
  let s = w
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>/]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<(gallery|timeline|math|score|syntaxhighlight)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Bỏ template lồng nhau {{…}} và bảng {|…|} từ trong ra ngoài.
  for (let i = 0; i < 10; i++) {
    const t = s.replace(/\{\{[^{}]*\}\}/g, '').replace(/\{\|[^{}]*?\|\}/g, '');
    if (t === s) break;
    s = t;
  }
  s = s
    .replace(
      /\[\[(?:File|Image|Fichier|Datei|Immagine|Archivo|Imagem|Tập tin|Hình|Bestand|Fil|Plik|Category|Catégorie|Kategorie|Categoria|Categoría|Kategori|Thể loại)\s*:[^\[\]]*(?:\[\[[^\]]*\]\][^\[\]]*)*\]\]/gi,
      '',
    )
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:[^\s\]]+ ([^\]]*)\]/g, '$1')
    .replace(/\[https?:[^\]]*\]/g, '')
    .replace(/'{2,}/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/^[*#:;]+\s*/gm, '')
    .replace(/^(=+)\s*(.*?)\s*\1\s*$/gm, '\n$1 $2 $1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** Cắt phần đuôi vô ích (tham khảo, liên kết ngoài, danh mục phim…) rồi giới hạn độ dài. */
function gon(text: string): string {
  const cut = text.search(
    /\n==+ *(References|Notes|External links|See also|Bibliography|Further reading|Références|Notes et références|Liens externes|Voir aussi|Note|Bibliografia|Collegamenti esterni|Voci correlate|Einzelnachweise|Weblinks|Literatur|Referencias|Enlaces externos|Véase también|Referências|Ligações externas|Tham khảo|Liên kết ngoài|Chú thích) *==+/,
  );
  return (cut > 0 ? text.slice(0, cut) : text).replace(/\n{3,}/g, '\n\n').slice(0, MAX_CHARS);
}

/** Giờ cạnh bên khi giờ đồng hồ cách ranh giới canh giờ (giờ lẻ:00) ≤ 20 phút. */
export function gioCanh(time: string): number | null {
  const [h, m] = time.split(':').map(Number);
  if (h % 2 === 1 && m <= 20) return (h + 23) % 24;
  if (h % 2 === 0 && 60 - m <= 20) return (h + 1) % 24;
  return null;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

async function main() {
  const all = danhSach();
  writeFileSync(join(WORK, 'queue.txt'), all.map((c) => c.slug).join('\n') + '\n');
  let pick = all;
  if (opt('qids')) {
    const set = new Set(opt('qids')!.split(','));
    pick = all.filter((c) => set.has(c.qid));
  } else if (opt('slugs')) {
    const set = new Set(opt('slugs')!.split(','));
    pick = all.filter((c) => set.has(c.slug));
  } else {
    pick = all.slice(Number(opt('from') || 0), Number(opt('to') || all.length));
  }
  pick = pick.filter((c) => !existsSync(join(PACK, `${c.slug}.json`)));
  console.log(`Cần đóng gói: ${pick.length}`);
  let done = 0;
  let fail = 0;
  for (let i = 0; i < pick.length; i += 200) {
    const chunk = pick.slice(i, i + 200);
    const sl = await sitelinks(chunk.map((c) => c.qid));
    await pool(chunk, 4, async (c) => {
      try {
        const links = sl[c.qid] || {};
        const cands: { lang: string; title: string }[] = [];
        if (links.enwiki) cands.push({ lang: 'en', title: links.enwiki });
        const bx = banXu(c.country);
        if (bx && links[`${bx}wiki`]) cands.push({ lang: bx, title: links[`${bx}wiki`] });
        if (!cands.length && links.viwiki) cands.push({ lang: 'vi', title: links.viwiki });
        let best = { lang: '', title: '', text: '' };
        for (const k of cands) {
          const t = await extract(k.lang, k.title);
          if (t.length > best.text.length) best = { ...k, text: t };
        }
        const hour = Number(c.birth_time.slice(0, 2));
        const gender = c.gender === 'nu' ? 'nu' : 'nam';
        const laSo = await banKeLaSo(c.birth_date, hour, gender);
        const alt = gioCanh(c.birth_time);
        const laSoCanh = alt == null ? null : await banKeLaSo(c.birth_date, alt, gender);
        const pack = {
          slug: c.slug,
          qid: c.qid,
          ten: c.name,
          ngheNghiep: c.occupation,
          quocGia: c.country,
          gioiTinh: gender,
          sinh: { ngay: c.birth_date, gio: c.birth_time.slice(0, 5), gioEngine: hour, tzOffsetPhut: c.birth_tz_off, rodden: c.rodden },
          anhCommons: c.image_file,
          sitelinks: c.sitelinks,
          sameAs: [
            `https://www.wikidata.org/wiki/${c.qid}`,
            ...(links.viwiki ? [`https://vi.wikipedia.org/wiki/${encodeURIComponent(links.viwiki.replace(/ /g, '_'))}`] : []),
            ...(links.enwiki ? [`https://en.wikipedia.org/wiki/${encodeURIComponent(links.enwiki.replace(/ /g, '_'))}`] : []),
          ],
          wiki: best.title
            ? {
                lang: best.lang,
                title: best.title,
                url: `https://${best.lang}.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, '_'))}`,
                text: gon(best.text),
              }
            : null,
          laSo,
          gioCanh: alt == null || !laSoCanh ? null : { gio: alt, laSo: laSoCanh },
        };
        writeFileSync(join(PACK, `${c.slug}.json`), JSON.stringify(pack));
        done++;
      } catch (e) {
        fail++;
        console.error(`✗ ${c.slug}: ${(e as Error).message}`);
      }
    });
    console.log(`… ${done} xong, ${fail} lỗi`);
  }
}

if (process.argv[1]?.endsWith('pack.ts')) main();
