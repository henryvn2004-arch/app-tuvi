// lib/media/que-image-prompt.ts
// ============================================================
// Dựng prompt sinh ảnh cho 64 quẻ Kinh Dịch — bộ "Quẻ Phục Hy bằng hình".
//
// Khối PHONG CÁCH giữ NGUYÊN VĂN chỉ dẫn mỹ thuật Henry đã chốt (gongbi 工笔画,
// bạch miêu, khoáng chất nhiều lớp trên lụa/giấy tuyên, triện 紫微明寶). Không
// diễn giải lại — sửa một chữ trong đó là 64 bức trôi khỏi phong cách đã duyệt.
//
// Khối CHỦ ĐỀ suy TỪ HAI QUÁI theo đúng lối 大象 (Đại Tượng) của Tượng Truyện:
// cảnh của mỗi quẻ = vật tượng quái THƯỢNG đặt trên vật tượng quái HẠ. Ví dụ
// Bí = Cấn (núi) trên, Ly (lửa) dưới → 山下有火 "lửa dưới chân núi". Cách này
// cho 64 cảnh KHÁC NHAU mà không bịa: nó chính là phép đọc tượng của cổ thư,
// chứ không phải tao nghĩ ra 64 bối cảnh rồi gán bừa.
// ============================================================

/** Vật tượng 8 quái — dùng cho cả cảnh nền lẫn chú thích tiếng Việt. */
interface TrigramNature {
  vi: string;
  /** Vật tượng bằng chữ Hán PHỒN THỂ — xem chú thích `queHanName` bên dưới. */
  han: string;
  /** Cụm tả cảnh khi quái này ở TRÊN (chiếm phần trời/nền cao của trục tranh). */
  above: string;
  /** Cụm tả cảnh khi quái này ở DƯỚI (chiếm phần đất/nền thấp). */
  below: string;
}

/** Khoá = 3 hào của quái, đọc từ hào DƯỚI lên (1 = dương). */
const TRIGRAM_NATURE: Record<string, TrigramNature> = {
  '111': { vi: 'Càn — trời', han: '天', above: 'a vast open sky of layered pale mineral blue', below: 'a high windswept plateau meeting open sky' },
  '110': { vi: 'Đoài — đầm', han: '澤', above: 'a still marsh water surface reflecting soft light', below: 'a quiet reed-fringed marsh in the foreground' },
  '101': { vi: 'Ly — lửa', han: '火', above: 'a low sun burning through thin cloud', below: 'a small clear brazier flame among rocks' },
  '100': { vi: 'Chấn — sấm', han: '雷', above: 'distant thunderheads breaking over far ridges', below: 'a storm-stirred grove bending at the base' },
  '011': { vi: 'Tốn — gió', han: '風', above: 'long wind-drawn cloud streaks across the upper scroll', below: 'tall grasses and willow combed by steady wind' },
  '010': { vi: 'Khảm — nước', han: '水', above: 'falling rain veiling the upper distance', below: 'a dark flowing stream cutting the foreground' },
  '001': { vi: 'Cấn — núi', han: '山', above: 'a steep mineral-green mountain crown rising above mist', below: 'weathered boulders and a stone path at the base' },
  '000': { vi: 'Khôn — đất', han: '地', above: 'a broad soft loess plain receding into pale haze', below: 'level cultivated earth in warm ochre in the foreground' },
};

/** Sắc thái theo cát/bình/hung — đổi dáng NGƯỜI trong tranh, không đổi phong cách. */
const MOOD_FIGURE: Record<string, string> = {
  tot: 'a single serene court lady standing composed, sleeves falling still, gaze calm and level',
  trung: 'a single court lady seated in quiet contemplation, one hand resting on a closed fan, gaze turned inward',
  canh: 'a single court lady pausing mid-step and glancing back over one shoulder, robe caught in motion, expression watchful',
};

/**
 * Khối phong cách — NGUYÊN VĂN chỉ dẫn Henry đã chốt.
 * ⚠️ Đừng "cải thiện" khối này. Nó là bản duyệt mỹ thuật, không phải bản nháp.
 */
export const GONGBI_STYLE = `Render the image in the style of an authentic traditional Chinese Gongbi (工笔画) court painting (仕女图), featuring meticulous baimiao fine-line brushwork, elegant ink outlines, and multiple layers of delicate mineral pigments on aged silk or xuan paper. Use a soft pastel color palette with muted earth tones, subtle gradients, and refined handcrafted textures. The composition should resemble a vertical hanging scroll with generous negative space, balanced asymmetry, and a serene literati aesthetic. Maintain flat, natural traditional lighting with no cinematic effects, no dramatic shadows, no HDR, and no photorealism. The overall feeling should be graceful, timeless, scholarly, and museum-quality, faithfully capturing the refined elegance of Qing dynasty imperial academy paintings. Avoid modern illustration styles, anime, manga, digital painting, watercolor, oil painting, 3D rendering, or Western art influences.`;

export interface QueImageInput {
  /** Số thứ tự King Wen 1–64 (để đối chiếu, không vào prompt). */
  kingWen: number;
  /** Mã 6 hào, hào 1 (dưới) → hào 6 (trên). */
  li: string;
  /** Tên Việt, ví dụ "Bí". */
  ten: string;
  /** Tên Hán MỘT CHỮ của quẻ, PHỒN THỂ — lấy từ cột `zh` của bảng 64 quẻ ("賁"). */
  zh: string;
  /** Sắc thái: 'tot' | 'trung' | 'canh'. */
  sacThai: string;
}

export interface QueImagePrompt {
  kingWen: number;
  phucHy: number;
  ten: string;
  /** Tên Hán đề lên tranh, phồn thể ("山火賁"). */
  hanTu: string;
  /** Cảnh suy từ hai quái, để đọc lại bằng mắt khi soát 64 prompt. */
  canh: string;
  prompt: string;
}

/** Chỉ số Phục Hy (tiên thiên) = nhị phân, hào 1 là bit thấp nhất. */
export function phucHyIndex(li: string): number {
  return li.split('').reduce((sum, c, i) => sum + (c === '1' ? 1 << i : 0), 0);
}

/**
 * Tên Hán đầy đủ để đề lên tranh: quái THƯỢNG + quái HẠ + tên quẻ ("山火賁").
 * Tám quẻ thuần đi theo lối riêng của cổ thư: "乾為天", "坎為水"…
 *
 * ⚠️ Dựng TẠI ĐÂY bằng phồn thể chứ KHÔNG lấy tên đầy đủ từ bộ dữ liệu tiếng
 * Trung nào khác: các bộ đó phần lớn là GIẢN THỂ ("山火贲"), mà triện của mình
 * là phồn thể ("紫微明寶"). Trộn hai hệ chữ trên cùng một bức tranh Thanh triều
 * là lỗi người biết chữ Hán nhận ra ngay, và model sẽ vẽ đúng cái mình đưa.
 */
export function queHanName(li: string, zh: string): string {
  const lower = TRIGRAM_NATURE[li.slice(0, 3)];
  const upper = TRIGRAM_NATURE[li.slice(3)];
  if (!lower || !upper) throw new Error(`que-image-prompt: mã hào không hợp lệ "${li}"`);
  if (li.slice(0, 3) === li.slice(3)) return `${zh}為${upper.han}`;
  return `${upper.han}${lower.han}${zh}`;
}

export function buildQueImagePrompt(q: QueImageInput): QueImagePrompt {
  const lower = TRIGRAM_NATURE[q.li.slice(0, 3)];
  const upper = TRIGRAM_NATURE[q.li.slice(3)];
  if (!lower || !upper) throw new Error(`que-image-prompt: mã hào không hợp lệ "${q.li}"`);

  const figure = MOOD_FIGURE[q.sacThai] || MOOD_FIGURE.trung;
  const canh = `${upper.above}, above ${lower.below}`;
  const hanTu = queHanName(q.li, q.zh);

  // Thứ tự khối cố ý: CHỦ ĐỀ trước, PHONG CÁCH sau, chữ/triện cuối. Model đọc
  // phần đầu nặng hơn — để phong cách lên đầu thì 64 bức na ná nhau vì phần
  // phân biệt (cảnh) bị đẩy xuống đuôi.
  const prompt = [
    `A vertical hanging-scroll painting depicting: ${canh}. In the middle ground, ${figure}.`,
    `The scene is quiet and uninhabited apart from this one figure. No text or lettering anywhere in the painted scene itself.`,
    GONGBI_STYLE,
    `In the upper corner, include a column of traditional Chinese calligraphy reading exactly "${hanTu}", brushed in classical regular script, vertically, as an authentic scroll inscription. Use traditional (not simplified) character forms.`,
    `Include a single carved red Chinese seal reading exactly "紫微明寶", naturally integrated as if it were the original painter's signature.`,
  ].join('\n\n');

  return { kingWen: q.kingWen, phucHy: phucHyIndex(q.li), ten: q.ten, hanTu, canh, prompt };
}

/** Nhãn tiếng Việt của hai quái — cho panel admin đối chiếu bức với quẻ. */
export function trigramLabels(li: string): { duoi: string; tren: string } {
  return { duoi: TRIGRAM_NATURE[li.slice(0, 3)].vi, tren: TRIGRAM_NATURE[li.slice(3)].vi };
}
