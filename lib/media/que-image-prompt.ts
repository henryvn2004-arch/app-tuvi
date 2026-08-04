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

/**
 * Sắc thái cát/bình/hung → ÁNH SÁNG và MÙA, không phải dáng người.
 *
 * ⚠️ Bản đầu dùng `f` để chọn 1 trong 3 dáng "mỹ nữ cung đình". Sai hai đường:
 * (a) 3 biến thể chia cho 64 bức nghĩa là trung bình 21 bức dùng chung một câu
 * tả nhân vật — nhìn là thấy giống nhau; (b) ép mỹ nữ vào quẻ Sư (quân đội) hay
 * quẻ Khốn (kiệt quệ) thì vừa gượng vừa sai nghĩa. Nay NHÂN VẬT do hào từ quyết
 * định (xem `scene`), còn `f` chỉ còn lo bầu không khí — thứ nó thật sự nói được.
 */
const MOOD_LIGHT: Record<string, string> = {
  tot: 'clear late-morning light, air still and luminous, colours at their fullest',
  trung: 'even overcast daylight, neither bright nor grim, colours held in balance',
  canh: 'thin failing light of late afternoon, air cooling, colours drawing towards grey',
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
  /**
   * SỰ VIỆC trong tranh, rút từ HÀO TỪ của chính quẻ đó — người nào, vật gì,
   * đang làm gì. Đây là phần mang nội dung; thiếu nó thì tranh chỉ còn phong
   * cảnh trống (đúng lỗi của lượt sinh đầu tiên).
   *
   * Bỏ trống → lùi về phong cảnh thuần từ hai quái, KHÔNG bịa nhân vật.
   */
  scene?: string;
  /**
   * SÁU sự việc, theo thứ tự hào 1 → hào 6. Ưu tiên hơn `scene`.
   *
   * 🔑 VÌ SAO XẾP DỌC DƯỚI→TRÊN: hào vốn đã là không gian — hào 1 gọi là "sơ"
   * (dưới cùng), hào 6 gọi là "thượng" (trên cùng) — mà tranh trục treo Trung
   * Hoa đọc đúng chiều đó (phép tam viễn). Hình thức bức tranh trùng khít cấu
   * trúc quẻ, nên đây không phải mẹo xếp hình mà là dịch đúng cái quẻ ra tranh.
   *
   * Lời dặn bố cục dựng Ở ĐÂY chứ không để người gọi tự viết: cùng một khung
   * cho cả 64 bức thì bộ tranh mới nhất quán, và cách ép model không bỏ sót
   * mô-típ là thứ phải sửa MỘT chỗ khi tìm ra cách tốt hơn.
   */
  motifs?: string[];
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

  const light = MOOD_LIGHT[q.sacThai] || MOOD_LIGHT.trung;
  const canh = `${upper.above}, above ${lower.below}`;
  const hanTu = queHanName(q.li, q.zh);
  const scene = (q.scene || '').trim();
  const motifs = (q.motifs || []).map((s) => s.trim()).filter(Boolean);

  // Ép model đặt ĐỦ mô-típ: đánh số, neo vào dải chiều cao cụ thể, và nói
  // thẳng là không được gộp/bỏ. Đo thực tế lượt trước (chỉ mô tả bằng "lowest /
  // just above / midway…") thì quẻ Bí RỤNG hào 1 và hào 5 — chữ chỉ vị trí
  // tương đối không đủ, phải cho toạ độ.
  const BANDS = [
    'in the lowest sixth of the picture (nearest the viewer)',
    'in the second band up from the bottom',
    'in the third band, just below the middle',
    'in the fourth band, just above the middle',
    'in the fifth band, in the upper distance',
    'in the highest sixth of the picture (farthest away)',
  ];
  const khoiMotif = motifs.length
    ? [
        `The composition is a single continuous landscape divided into six clearly separated depth levels — terraces, ledges and receding planes — read from the bottom of the scroll upward. Place EXACTLY these six incidents, one in each level, all six visible:`,
        ...motifs.slice(0, 6).map((m, i) => `${i + 1}. ${BANDS[i]}: ${m}`),
        `All six must appear. Do not omit, merge or duplicate any of them. Each is small within the landscape but distinct and unmistakable. They are separate moments in one place, not one crowd.`,
      ].join('\n')
    : '';

  // Thứ tự khối cố ý: CHỦ ĐỀ trước, PHONG CÁCH sau, chữ/triện cuối. Model đọc
  // phần đầu nặng hơn — để phong cách lên đầu thì 64 bức na ná nhau vì phần
  // phân biệt (cảnh) bị đẩy xuống đuôi.
  const prompt = [
    khoiMotif
      ? `A vertical hanging-scroll painting. Setting: ${canh}. ${light}.\n\n${khoiMotif}`
      : scene
        ? `A vertical hanging-scroll painting. Setting: ${canh}. Depicted event: ${scene}. ${light}.`
        : `A vertical hanging-scroll painting depicting: ${canh}. ${light}. An empty landscape with no people.`,
    `No text or lettering anywhere in the painted scene itself, apart from the inscription described below.`,
    GONGBI_STYLE,
    `In the upper corner, include a column of traditional Chinese calligraphy reading exactly "${hanTu}", brushed in classical regular script, vertically, as an authentic scroll inscription. Use traditional (not simplified) character forms.`,
    // ⚠️ KHÔNG bảo model vẽ triện. Nó vẽ mỗi bức một kiểu, chữ sai, và 64 bức
    // ra 64 con dấu khác nhau — hỏng đúng thứ mà con dấu sinh ra để làm.
    // Triện THẬT (`public/seal.png`) được ghép vào sau khi sinh xong, xem
    // `app/api/admin/que-images/route.ts`. Dặn thẳng để nó chừa chỗ trống.
    `Leave the lower-left corner clear of detail — no seal, no stamp, no signature, no red square anywhere in the image.`,
  ].join('\n\n');

  return { kingWen: q.kingWen, phucHy: phucHyIndex(q.li), ten: q.ten, hanTu, canh, prompt };
}

/** Nhãn tiếng Việt của hai quái — cho panel admin đối chiếu bức với quẻ. */
export function trigramLabels(li: string): { duoi: string; tren: string } {
  return { duoi: TRIGRAM_NATURE[li.slice(0, 3)].vi, tren: TRIGRAM_NATURE[li.slice(3)].vi };
}
