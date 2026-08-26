// lib/video/stock-catalog.ts
// ============================================================
// TRA MÔ TẢ ẢNH — nguồn DUY NHẤT trả lời "bức ảnh này là ảnh gì".
//
// 🔑 VÌ SAO FILE NÀY TỒN TẠI
// Cổng 2 (hội đồng người xem) chấm clip qua MỘT bảng thời gian bằng chữ. Với
// phần CHỮ thì nó đọc đúng thứ người xem sẽ nghe. Với phần HÌNH thì trước đây
// nó nhận:
//     · cảnh `typo`  → một câu hằng số, giống hệt nhau ở mọi clip
//     · cảnh `image` → `Ảnh: https://…/get/abc123_1280.jpg`  ← URL THÔ
//     · `backdrop`   → KHÔNG NHẮC MỘT CHỮ NÀO
// ⇒ kênh hình có phương sai bằng không, và model buộc phải bịa từ một chuỗi
// URL. Mọi lời chê về hình vì thế là ĐỊNH KIẾN CHỦNG LOẠI rút từ text huấn
// luyện, không phải quan sát.
//
// 🔑 ĐIỀU KIỆN SỐNG CÒN: mô tả ở đây KHÔNG do người viết prompt nghĩ ra.
// Nó là TAG CỦA NHÀ CUNG CẤP, chép nguyên (chỉ khử trùng lặp) lúc nhập kho.
// Nếu để tôi tự viết mô tả thì hội đồng chấm VĂN CỦA TÔI chứ không chấm bức
// ảnh — mô tả hay thì điểm lên, mô tả nhạt thì điểm xuống. Đó là cái gương,
// không phải cái thước. Bản vá kiểu đó đã bị rút lại một lần, đừng làm lại.
//
// ⛔ VÀ ĐỪNG HỨA QUÁ: có mô tả thì hội đồng SO ĐƯỢC hai văn bản nó đều nhận
// (lời đọc ↔ mô tả ảnh) — tức trả lời được "ảnh có ăn nhập với lời không".
// Nó vẫn KHÔNG chấm được ĐẸP / THU HÚT: cái đó cần nhìn bằng mắt.
// ============================================================

import manifest from './stock-manifest.json';
import videoManifest from './stock-video-manifest.json';

export interface StockImage {
  id: string;
  bucket: string;
  key: string;
  /** Đường dẫn trong kho, ví dụ `tone/mo-mit/7543646.jpg`. */
  file: string;
  /** URL công khai sau khi đẩy lên Storage. Chưa đẩy thì chưa có. */
  url?: string;
  /** Tag của nhà cung cấp, đã khử trùng lặp. KHÔNG phải chữ mình viết. */
  caption: string;
  brightness?: { mean: number; sd: number } | null;
  /** Bão hoà màu cả khung — cao là "màu tươi", trái brief moody. */
  sat?: number;
  /** Độ rối dải giữa khung — cao là nền lộn xộn, chữ khó đọc. */
  detail?: number;
  /**
   * Mức KHỚP BRIEF (châu Á · moody · retro · huyền bí + ba số đo ảnh).
   * ⚠️ KHÔNG phải "ảnh đẹp bao nhiêu" — máy không chấm được đẹp.
   */
  score?: number;
  /** Tiêu chí brief mà bức này khớp, để đọc được vì sao nó được chọn. */
  matched?: string[];
  /** Dải giữa khung đủ tối để đặt chữ lên không. */
  textSafe?: boolean | null;
  provider: string;
  providerId: number;
  pageURL: string;
  author: string;
  authorURL: string;
  license: string;
}

const IMAGES = manifest.images as StockImage[];

/**
 * Tra theo phần đuôi đường dẫn, vì cùng một bức đi qua nhiều dạng địa chỉ:
 * đường dẫn kho (`tone/mo-mit/123.jpg`), URL công khai Storage, và bản đã
 * tải về máy của `gen-insight.mjs` (`img-cache/<băm>.jpg`).
 */
const BY_FILE = new Map(IMAGES.map((i) => [i.file, i]));
const BY_PROVIDER_ID = new Map(IMAGES.map((i) => [String(i.providerId), i]));

export function findStockImage(src: string): StockImage | null {
  if (!src) return null;
  const clean = src.split('?')[0];
  for (const [file, img] of BY_FILE) if (clean.endsWith(file)) return img;
  const m = clean.match(/(\d{4,})\.jpg$/);
  if (m) return BY_PROVIDER_ID.get(m[1]) ?? null;
  return null;
}

/**
 * Mô tả một bức ảnh cho hội đồng đọc.
 *
 * 🔴 Ba nhánh, và nhánh CUỐI mới là nhánh quan trọng: khi không biết bức ảnh
 * là ảnh gì thì phải NÓI THẲNG là không biết. Trước đây chỗ này in ra URL —
 * mà model không đọc được URL thành hình, nó chỉ có thể bịa. Nói "chưa có mô
 * tả" thì hội đồng biết mình đang thiếu dữ kiện; đưa một chuỗi URL thì hội
 * đồng tưởng mình có dữ kiện. Xanh oan nguy hơn đỏ oan.
 */
export function describeImage(src: string, caption?: string): string {
  if (caption?.trim()) return caption.trim();
  const found = findStockImage(src);
  if (found) return found.caption;
  // 64 bức tranh quẻ Kinh Dịch sinh sẵn — biết được VAI TRÒ của chúng từ
  // đường dẫn, đó là dữ kiện có thật chứ không phải suy đoán về nội dung.
  const que = src.match(/que-phuc-hy\/(\d+)-kw/);
  if (que) return `tranh vẽ quẻ Kinh Dịch số ${que[1]}, tông trầm, vẽ tay`;
  return 'CHƯA CÓ MÔ TẢ — đừng phán đoán gì về bức ảnh này';
}

/** Ảnh trong kho theo tông/chủ đề, chỉ lấy bức đặt chữ lên còn đọc được. */
export function stockByKey(bucket: string, key: string): StockImage[] {
  return IMAGES.filter((i) => i.bucket === bucket && i.key === key && i.textSafe !== false);
}

/** Băm chuỗi ổn định — cùng clip thì đời nào cũng ra cùng bộ ảnh. */
function stableHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Số ảnh đầu bảng được đưa vào rổ bốc. Xem `stockBackdrop`.
 */
const TOP_K = 5;

/**
 * Chọn ẢNH NỀN cho một clip, theo TÔNG. **Trả về ĐÚNG MỘT bức.**
 *
 * 🔑 VÌ SAO MỘT: bản trước rải 3 bức và cho chúng chuyển tiếp giữa clip. Đo
 * bằng mắt trên bản render thật thì ba bức cùng một tông vẫn **không ăn nhập
 * với nhau** — mỗi lần chuyển là một lần mắt phải làm lại việc "đây là cảnh
 * gì", trong khi thứ đang chạy là CHỮ. Một bức đứng yên dưới lớp Ken Burns
 * trôi chậm đọc là *một khung hình đang thở*; ba bức nối nhau đọc là *trình
 * chiếu ảnh*. Vẫn trả `string[]` vì `ScriptSpec.backdrop` là mảng — đổi kiểu
 * là đụng cả `InsightClip`, không đáng.
 *
 * 🔑 VÌ SAO BỐC TRONG TOP-5 chứ không lấy hạng nhất:
 * Lấy thẳng bức điểm cao nhất thì **mọi clip cùng tông ra cùng một bức** — với
 * 6 kịch bản insight là chuyện sẽ xảy ra ngay. Bốc trong nhóm đầu bảng giữ
 * được cả hai: điểm vẫn cao, mà hai clip khác nhau vẫn khác ảnh.
 *
 * ⚠️ `score` là mức KHỚP BRIEF (châu Á · moody · tối · ít màu · ít rối),
 * **không phải "gây cảm xúc mạnh"**. Máy không đo được cảm xúc. Đừng đọc thứ
 * tự này rộng hơn thế — nó chỉ nói bức nào bám brief hơn.
 *
 * 🔑 Chọn theo BĂM của `seed` (thường là id clip), **không random** — tiền lệ
 * `pickEraForLaso`. Render lại sau sáu tháng phải ra đúng clip đó; random thì
 * mỗi lượt dựng một clip khác, và không ai đối chiếu được với bản đã duyệt.
 *
 * ⚠️ Trả `url` (Storage) nếu đã đẩy kho, KHÔNG thì trả đường dẫn trong
 * `remotion/public/`. Nhánh thứ hai chỉ chạy được ở MÁY ĐÃ NHẬP KHO — thư mục
 * đó nằm ngoài git nên trên Actions sẽ không có. Tức: **chưa chạy
 * `stock-upload.mjs` thì đừng ghim tông vào kịch bản dựng tự động**, mới chỉ
 * dùng để xem thử tại chỗ.
 */
export function stockBackdrop(tone: string, seed: string): string[] {
  const pool = stockByKey('tone', tone);
  if (!pool.length) return [];
  const top = [...pool].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, TOP_K);
  const img = top[stableHash(seed) % top.length];
  return [img.url || `stock/${img.file}`];
}

export const STOCK_COUNT = IMAGES.length;

// ============================================================
// KHO VIDEO NỀN
// ============================================================
/**
 * Cùng nguyên tắc với ảnh: mô tả là TAG CỦA NHÀ CUNG CẤP, không phải chữ tôi
 * viết. Nếu tôi tự tả đoạn phim thì hội đồng chấm văn của tôi, không chấm cái
 * nền — đúng cái gương đã bị rút lại một lần.
 *
 * 🔴 Vì sao phải có: cổng 2 vừa chê một clip CÓ nền mưa là *"chỉ chữ trên nền
 * xanh đơn điệu"* — vì `buildTimeline` chưa biết `backdropVideo`. Đây đúng lớp
 * lỗi "hội đồng chấm hình mà không nhìn thấy hình": thêm một loại hình mới mà
 * quên dạy bảng thời gian là hội đồng lại chê đúng thứ mình vừa sửa xong.
 */
export interface StockVideo {
  id: string;
  bucket: string;
  key: string;
  file: string;
  caption: string;
  width: number;
  height: number;
  duration: number;
  brightness?: { mean: number; sd: number } | null;
  score?: number;
  matched?: string[];
  textSafe?: boolean | null;
  provider: string;
  providerId: number;
  pageURL: string;
  author: string;
  authorURL: string;
  license: string;
}

const VIDEOS = (videoManifest.videos ?? []) as StockVideo[];

export function findStockVideo(src: string): StockVideo | null {
  if (!src) return null;
  const clean = src.split('?')[0];
  return VIDEOS.find((v) => clean.endsWith(v.file)) ?? null;
}

/** Mô tả đoạn phim nền cho hội đồng đọc. Không biết thì NÓI là không biết. */
export function describeVideo(src: string): string {
  const v = findStockVideo(src);
  if (!v) return 'CHƯA CÓ MÔ TẢ — đừng phán đoán gì về đoạn phim này';
  return `${v.caption} (đoạn phim quay thật, dài ${v.duration}s)`;
}

export const STOCK_VIDEO_COUNT = VIDEOS.length;
