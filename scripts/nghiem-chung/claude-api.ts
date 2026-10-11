// scripts/nghiem-chung/claude-api.ts
// ============================================================
// Viết hồ sơ Nghiệm Chứng bằng Anthropic API (claude-sonnet-5-5, tính vào credit API chứ không vào
// hạn mức gói). Cùng quy trình A→B→C và cùng validate.ts với gemini.ts. Chưa hỗ trợ chế độ doan.
//
//   npx tsx scripts/nghiem-chung/claude-api.ts --slugs a,b,c
//   npx tsx scripts/nghiem-chung/claude-api.ts --shard 0/1 --limit 500 --conc 16
//
// Token từng người ghi vào work/nghiem-chung/claude-usage.jsonl để tính chi phí.
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { banKeNam } from '@/lib/nghiem-chung/engine-ref';
import { parseLlmJson } from '@/lib/llm/json';
import { kiem } from './validate';
import { danhSach } from './pack';

const ROOT = process.cwd();
const WORK = join(ROOT, 'work', 'nghiem-chung');
mkdirSync(join(WORK, 'draft'), { recursive: true });
const KEY = process.env.ANTHROPIC_API_KEY || '';
const argv = process.argv.slice(2);
const opt = (k: string) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : undefined;
};
const MODEL = opt('model') || 'claude-sonnet-5-5';
const WIKI_MAX = 16000;

// Luật lấy từ PROMPT.md: từ "## Khi nào LOẠI TRỪ" tới trước "## Trả về".
const PROMPT_MD = readFileSync(join(ROOT, 'scripts', 'nghiem-chung', 'PROMPT.md'), 'utf8');
const LUAT = PROMPT_MD.slice(PROMPT_MD.indexOf('## Khi nào LOẠI TRỪ'), PROMPT_MD.indexOf('## Trả về')).trim();

interface Dung {
  vao: number;
  ra: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function goi(system: string, user: string, dung: Dung, maxOut = 16000): Promise<unknown> {
  // max_tokens gồm cả token "nghĩ" của Sonnet 5.5 (không tắt được) và tiếng Việt ~2.5× token → cộng đệm.
  const body = {
    model: MODEL,
    max_tokens: maxOut + 12000,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low' },
  };
  for (let i = 0; i < 6; i++) {
    let r: Response;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(300000),
      });
    } catch {
      await sleep(2 ** i * 2000);
      continue;
    }
    if (r.status === 429 || r.status === 529 || r.status >= 500) {
      await sleep(2 ** i * 3000);
      continue;
    }
    if (!r.ok) throw new Error(`claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    dung.vao += (j?.usage?.input_tokens || 0) + (j?.usage?.cache_creation_input_tokens || 0) + (j?.usage?.cache_read_input_tokens || 0);
    dung.ra += j?.usage?.output_tokens || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (j?.content as any[] | undefined)?.filter((p) => p.type === 'text').map((p) => p.text).join('') || '';
    if (j?.stop_reason === 'max_tokens') throw new Error('claude cắt giữa chừng (max_tokens)');
    const v = parseLlmJson(t);
    if (!v) throw new Error('claude trả về không phải JSON');
    return v;
  }
  throw new Error('claude: 429/5xx/mạng lặp lại');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function ngCanh(pack: Any): string {
  const ls = pack.laSo;
  const dong: string[] = [
    `# Người: ${pack.ten} (${pack.qid}) — ${pack.ngheNghiep || ''}, ${pack.quocGia || ''}`,
    `Sinh ${pack.sinh.ngay} ${pack.sinh.gio}, ${pack.gioiTinh}. Năm nay: 2026.`,
    `\n# Lá số (mã câu | câu engine)`,
    `Năm ${ls.canChi} · ${ls.cuc} · Mệnh ${ls.menh.diaChi}: ${ls.menh.sao} · Thân ${ls.than}`,
  ];
  for (const c of ls.cung) for (const x of c.cau) dong.push(`${x.id} | ${x.text}`);
  dong.push(`\n# Đại vận (thuTu · cung · tuổi · năm · điểm · hang)`);
  for (const d of ls.daiVan) {
    dong.push(`DV${d.thuTu} · ${d.cung} · ${d.tuoiTu}–${d.tuoiDen} tuổi · ${d.namTu}–${d.namDen} · ${d.diem} · ${d.hang}`);
    for (const x of d.cau) dong.push(`${x.id} | ${x.text}`);
  }
  if (pack.gioCanh) {
    dong.push(`\n# gioCanh: lá số giờ ${pack.gioCanh.gio}h (giờ sinh sát ranh giới canh giờ)`);
    for (const d of pack.gioCanh.laSo.daiVan) dong.push(`DV${d.thuTu} (giờ cạnh) · ${d.cung} · ${d.namTu}–${d.namDen} · ${d.diem} · ${d.hang}`);
  }
  dong.push(`\n# wiki.text (${pack.wiki?.lang}, "${pack.wiki?.title}") — nguồn sự thật DUY NHẤT`);
  dong.push((pack.wiki?.text || '').slice(0, WIKI_MAX));
  return dong.join('\n');
}

const SYS = `Bạn là biên tập viên viết hồ sơ "Nghiệm Chứng" cho tuviminhbao.com: đối chiếu lá số Tử Vi (do engine tính sẵn) với cuộc đời thật của người nổi tiếng, viết tiếng Việt tự nhiên. Chỉ trả về JSON.

${LUAT}`;

async function mot(slug: string): Promise<string> {
  const pack = JSON.parse(readFileSync(join(WORK, 'pack', `${slug}.json`), 'utf8'));
  const dung: Dung = { vao: 0, ra: 0 };
  const ctx = ngCanh(pack);
  const dPath = join(WORK, 'draft', `${slug}.json`);
  const ghiDung = (kq: string) =>
    appendFileSync(join(WORK, 'claude-usage.jsonl'), JSON.stringify({ slug, model: MODEL, ...dung, kq }) + '\n');

  // (A) chọn năm bước ngoặt / loại trừ
  const a = (await goi(
    SYS,
    `${ctx}\n\n---\nBước 1. Đọc wiki.text. Nếu người này thuộc diện LOẠI TRỪ, trả {"loaiTru":"<mã>: <lý do ngắn>"}. Nếu không, chọn 3–4 năm bước ngoặt (năm có sự kiện lớn, cả tốt lẫn xấu, nằm trong đời người, có trong bài) và trả {"nams":[năm,…]}.`,
    dung,
    2000,
  )) as Any;
  if (a?.loaiTru) {
    writeFileSync(dPath, JSON.stringify({ loaiTru: String(a.loaiTru) }));
    await kiem(slug);
    ghiDung('loai');
    return `${slug}: ⊘ ${a.loaiTru}`;
  }
  const nams: number[] = (Array.isArray(a?.nams) ? a.nams : []).map(Number).filter(Number.isInteger).slice(0, 5);
  const kes = await Promise.all(nams.map((y) => banKeNam(pack.sinh.ngay, pack.sinh.gioEngine, pack.gioiTinh, y)));
  const keTxt = kes
    .filter(Boolean)
    .map((k) => [`## Năm ${k!.nam} (${k!.canChi}, ${k!.tuoiMu} tuổi mụ)`, ...k!.cau.map((x) => `${x.id} | ${x.text}`)].join('\n'))
    .join('\n');

  // (B) viết nháp
  const yeuCau = `${ctx}\n\n# Vận các năm bước ngoặt (mã N<năm>.*)\n${keTxt}\n\n---\nBước 2. Viết nháp hồ sơ đúng "Định dạng nháp" (JSON, không chú thích). Dùng các năm: ${nams.join(', ')}. Mọi "trich" phải chép NGUYÊN VĂN từ wiki.text. Mọi "laSoRef" phải là mã có thật ở trên.`;
  let nhap = (await goi(SYS, yeuCau, dung)) as Any;
  for (let lan = 0; lan < 3; lan++) {
    writeFileSync(dPath, JSON.stringify(nhap, null, 1));
    const loi = await kiem(slug);
    if (!loi.length) {
      ghiDung('xong');
      return `${slug}: ✓`;
    }
    if (lan === 2) {
      ghiDung('khong-dat');
      return `${slug}: ✗ ${loi.length} lỗi — ${loi.slice(0, 2).join(' | ')}`;
    }
    // (C) sửa theo danh sách lỗi
    nhap = (await goi(
      SYS,
      `${yeuCau}\n\n# Nháp trước của bạn\n${JSON.stringify(nhap)}\n\n# Bộ kiểm tra báo lỗi — sửa HẾT rồi trả lại TOÀN BỘ nháp\n- ${loi.join('\n- ')}`,
      dung,
    )) as Any;
  }
  return `${slug}: ?`;
}

async function main() {
  if (!KEY) throw new Error('thiếu ANTHROPIC_API_KEY');
  let slugs: string[];
  if (opt('slugs')) slugs = opt('slugs')!.split(',');
  else {
    const [k, n] = (opt('shard') || '0/1').split('/').map(Number);
    slugs = danhSach()
      .filter((_, i) => i % n === k)
      .map((c) => c.slug)
      .filter(
        (s) =>
          existsSync(join(WORK, 'pack', `${s}.json`)) &&
          !existsSync(join(ROOT, 'data', 'nghiem-chung', 'ho-so', `${s}.json.gz`)) &&
          !existsSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru', `${s}.txt`)),
      )
      .slice(0, Number(opt('limit') || 1e9));
  }
  const conc = Number(opt('conc') || 8);
  console.log(`${slugs.length} người · model ${MODEL} · ${conc} luồng`);
  let i = 0;
  await Promise.all(
    Array.from({ length: conc }, async () => {
      while (i < slugs.length) {
        const s = slugs[i++];
        try {
          console.log(await mot(s));
        } catch (e) {
          console.log(`${s}: ✗ ${(e as Error).message}`);
        }
      }
    }),
  );
}
main();
