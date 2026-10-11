// lib/nghiem-chung/sinh/viet.ts
// ============================================================
// Viết MỘT hồ sơ Nghiệm Chứng bằng Claude qua API (tính vào credit API, không vào hạn
// mức gói). Quy trình A→B→C giống scripts/nghiem-chung/gemini.ts: (A) chọn 3–4 năm bước
// ngoặt hoặc loại trừ → engine tính vận các năm đó → (B) viết nháp → bộ kiểm tra →
// lỗi thì (C) gửi lại danh sách lỗi để sửa, tối đa 2 lần. Luật viết đọc THẲNG từ
// scripts/nghiem-chung/PROMPT.md (một nguồn — agent, Gemini và cron cùng một luật).
// Không đụng đĩa ngoài việc đọc PROMPT.md; bộ kiểm tra do caller truyền vào.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { banKeNam } from '@/lib/nghiem-chung/engine-ref';
import { llmTextFull } from '@/lib/llm/complete';
import { parseLlmJson } from '@/lib/llm/json';
import type { Goi } from './goi';
import { briefDoan, chotGio } from './doan';

const WIKI_MAX = 16000;
const NAM_XEM = 2026;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let luat: string | null = null;
/** Luật lấy từ PROMPT.md: từ "## Khi nào LOẠI TRỪ" tới trước "## Trả về". */
function layLuat(): string {
  if (luat) return luat;
  const md = readFileSync(join(process.cwd(), 'scripts', 'nghiem-chung', 'PROMPT.md'), 'utf8');
  const a = md.indexOf('## Khi nào LOẠI TRỪ');
  const b = md.indexOf('## Trả về');
  if (a < 0 || b < 0) throw new Error('PROMPT.md mất mốc "## Khi nào LOẠI TRỪ" / "## Trả về"');
  luat = md.slice(a, b).trim();
  return luat;
}

export interface DungToken {
  vao: number;
  ra: number;
  luot: number;
  model: string;
}

function ngCanh(pack: Goi): string {
  const ls = pack.laSo;
  const dong: string[] = [
    `# Người: ${pack.ten} (${pack.qid}) — ${pack.ngheNghiep || ''}, ${pack.quocGia || ''}`,
    `Sinh ${pack.sinh.ngay} ${pack.sinh.gio}, ${pack.gioiTinh}. Năm nay: ${NAM_XEM}.`,
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

async function goi(system: string, prompt: string, dung: DungToken, maxTokens: number): Promise<Any> {
  // `maxTokens` truyền vào là trần CHỮ; llmTextFull tự nhân hệ số cho token "nghĩ" + tiếng Việt.
  const r = await llmTextFull({ system, prompt, maxTokens, provider: 'anthropic', effort: 'low', json: true });
  dung.vao += r.usage.input_tokens + r.usage.cache_creation_input_tokens + r.usage.cache_read_input_tokens;
  dung.ra += r.usage.output_tokens;
  dung.luot++;
  dung.model = `${r.provider}:${r.model}`;
  if (r.truncated) throw new Error('model trả về bị cắt giữa chừng (max_tokens)');
  const v = parseLlmJson(r.text);
  if (!v) throw new Error('model trả về không phải JSON');
  return v;
}

export type KetQuaViet =
  | { kq: 'loai'; nhap: { loaiTru: string }; dung: DungToken }
  | { kq: 'xong'; nhap: Any; doan?: Any; dung: DungToken }
  | { kq: 'khong-dat'; nhap: Any; loi: string[]; dung: DungToken };

/** Brief chấm 12 giờ, bỏ các dòng chỉ dẫn dành cho agent chạy lệnh (cron không có shell). */
function promptDoan(pack: Goi): string {
  const brief = briefDoan(pack)
    .split('\n')
    .filter((l) => !l.startsWith('Rồi chạy:') && !l.startsWith('## Bước 2'))
    .join('\n');
  return `${brief}\n\n---\nChỉ làm Bước 1: trả về DUY NHẤT JSON bảng chấm 12 giờ.`;
}

/**
 * `kiem(nhap, doanG)` trả danh sách lỗi (rỗng = đạt). `opts.doan`: người chưa có giờ sinh — thêm bước 0
 * (chấm 12 giờ, chốt giờ vào gói) và lỗi mang tiền tố "doan." sẽ gửi lại để sửa BẢNG CHẤM, không phải nháp.
 */
export async function vietHoSo(
  pack: Goi,
  kiem: (nhap: Any, doanG: Any) => Promise<string[]>,
  opts: { doan?: boolean } = {},
): Promise<KetQuaViet> {
  const dung: DungToken = { vao: 0, ra: 0, luot: 0, model: '' };
  const SYS = `Bạn là biên tập viên viết hồ sơ "Nghiệm Chứng" cho tuviminhbao.com: đối chiếu lá số Tử Vi (do engine tính sẵn) với cuộc đời thật của người nổi tiếng, viết tiếng Việt tự nhiên. Chỉ trả về JSON.\n\n${layLuat()}`;

  // (0) chỉ người chưa có giờ: chấm 12 giờ → chốt giờ vào gói
  let doanG: Any = null;
  const p0 = opts.doan ? promptDoan(pack) : '';
  if (opts.doan) {
    doanG = await goi(SYS, p0, dung, 8000);
    chotGio(pack, String(doanG?.chon));
  }

  // (A) chọn năm bước ngoặt / loại trừ  +  (B) viết nháp — dựng lại từ đầu nếu giờ đổi
  async function lapNhap(): Promise<{ loaiTru?: string; yeuCau?: string; nhap?: Any }> {
    const ctx = ngCanh(pack);
    const a = await goi(
      SYS,
      `${ctx}\n\n---\nBước 1. Đọc wiki.text. Nếu người này thuộc diện LOẠI TRỪ, trả {"loaiTru":"<mã>: <lý do ngắn>"}. Nếu không, chọn 3–4 năm bước ngoặt (năm có sự kiện lớn, cả tốt lẫn xấu, nằm trong đời người, có trong bài) và trả {"nams":[năm,…]}.`,
      dung,
      2000,
    );
    if (a?.loaiTru) return { loaiTru: String(a.loaiTru) };
    const nams: number[] = (Array.isArray(a?.nams) ? a.nams : []).map(Number).filter(Number.isInteger).slice(0, 5);
    const kes = await Promise.all(nams.map((y) => banKeNam(pack.sinh.ngay, pack.sinh.gioEngine, pack.gioiTinh, y)));
    const keTxt = kes
      .filter(Boolean)
      .map((k) => [`## Năm ${k!.nam} (${k!.canChi}, ${k!.tuoiMu} tuổi mụ)`, ...k!.cau.map((x) => `${x.id} | ${x.text}`)].join('\n'))
      .join('\n');
    const yeuCau = `${ctx}\n\n# Vận các năm bước ngoặt (mã N<năm>.*)\n${keTxt}\n\n---\nBước 2. Viết nháp hồ sơ đúng "Định dạng nháp" (JSON, không chú thích). Dùng các năm: ${nams.join(', ')}. Mọi "trich" phải chép NGUYÊN VĂN từ wiki.text. Mọi "laSoRef" phải là mã có thật ở trên.`;
    return { yeuCau, nhap: await goi(SYS, yeuCau, dung, 16000) };
  }

  let cur = await lapNhap();
  if (cur.loaiTru) return { kq: 'loai', nhap: { loaiTru: cur.loaiTru }, dung };
  for (let lan = 0; ; lan++) {
    const loi = await kiem(cur.nhap, doanG);
    if (!loi.length) return { kq: 'xong', nhap: cur.nhap, ...(doanG ? { doan: doanG } : {}), dung };
    if (lan === 2) return { kq: 'khong-dat', nhap: cur.nhap, loi, dung };
    const loiDoan = loi.filter((l) => l.startsWith('doan.'));
    if (opts.doan && loiDoan.length) {
      // (0') sửa bảng chấm; giờ đổi thì lá số đổi ⇒ nháp cũ vô nghĩa, viết lại từ bước A.
      const gioCu = pack.sinh.gio;
      doanG = await goi(
        SYS,
        `${p0}\n\n# Bảng chấm trước của bạn\n${JSON.stringify(doanG)}\n\n# Bộ kiểm tra báo lỗi — sửa HẾT rồi trả lại TOÀN BỘ bảng\n- ${loiDoan.join('\n- ')}`,
        dung,
        8000,
      );
      chotGio(pack, String(doanG?.chon));
      if (pack.sinh.gio !== gioCu) {
        cur = await lapNhap();
        if (cur.loaiTru) return { kq: 'loai', nhap: { loaiTru: cur.loaiTru }, dung };
        continue;
      }
    }
    // (C) sửa nháp theo danh sách lỗi
    cur.nhap = await goi(
      SYS,
      `${cur.yeuCau}\n\n# Nháp trước của bạn\n${JSON.stringify(cur.nhap)}\n\n# Bộ kiểm tra báo lỗi — sửa HẾT rồi trả lại TOÀN BỘ nháp\n- ${loi.filter((l) => !l.startsWith('doan.')).join('\n- ') || loi.join('\n- ')}`,
      dung,
      16000,
    );
  }
}
