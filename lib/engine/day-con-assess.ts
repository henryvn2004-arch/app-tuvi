// lib/engine/day-con-assess.ts
// ============================================================
// KHUNG ĐỌC TRẺ "5 TRỤC · 8 CHẤT" — tầng đánh giá của tool Dạy Con.
//
// THUẦN deterministic: 0 lượt LLM, 0đ. Mọi con số suy từ dữ liệu engine đã an
// sẵn (`palaces[].stars`, `cungScores`) — module này KHÔNG tự an sao.
//
// ── VÌ SAO CÓ FILE NÀY ──────────────────────────────────────
// Bản cũ đưa cho cha mẹ một nhãn kiểu người + sáu thẻ chữ. Nó đúng nhưng KHÔNG
// có khung: không đo được gì, không so được hai đứa trẻ, không nói được "mạnh
// chỗ nào", và vì thế phần chữ do model viết trôi tự do mỗi lượt một dáng.
// File này đặt một khung CỐ ĐỊNH để phần chữ bám vào.
//
// ── KHUNG MƯỢN HÌNH DẠNG CỦA AI, VÀ MƯỢN TỚI ĐÂU ────────────
// 🔑 Mượn HÌNH DẠNG, không mượn UY TÍN. Không chỗ nào được nói bản đọc này
// "là" Big Five / MI / một trắc nghiệm đã kiểm định — nó là một KHUNG ĐỌC lá
// số, và nói vậy là đủ.
//
//   • Nền triết lý — "goodness of fit" (Thomas & Chess, nghiên cứu khí chất
//     trẻ em): không có khí chất tốt hay xấu, kết quả nằm ở chỗ KHỚP giữa khí
//     chất đứa trẻ và cách người lớn đang nuôi. Đây vốn đã là câu tool tự nói
//     trong phần ranh giới đạo đức — nay nó thành cấu trúc chứ không còn là
//     lời dặn.
//   • 5 TRỤC lấy hình dạng của Big Five: trục LIÊN TỤC và HAI CỰC ĐỀU CÓ GIÁ
//     TRỊ, thay vì bốn ô nhãn cứng. Một đứa trẻ không "là" hướng nội — nó nằm
//     ở đâu đó trên trục, và cả hai đầu đều dạy được.
//   • 8 CHẤT lấy hình dạng của Multiple Intelligences (Gardner): nhiều miền
//     năng khiếu song song thay vì MỘT con số thông minh. Đây là phần trả lời
//     câu "con có năng khiếu gì" mà không đẻ ra một bảng xếp hạng trẻ con.
//
// ⛔ CỐ Ý KHÔNG mượn SDQ (Strengths & Difficulties Questionnaire). SDQ là bộ
// SÀNG LỌC LÂM SÀNG — nó đo rối loạn cảm xúc, rối loạn hành vi, tăng động,
// quan hệ bạn bè có vấn đề. Suy một bảng sàng lọc sức khoẻ tâm thần từ ngày
// sinh là thứ nguy hiểm nhất tool này có thể làm, và nó đá thẳng vào luật đã
// có: không đọc cung Tật Ách của đứa trẻ, không phán "khó dạy". Trục 5 dưới
// đây đo ĐỘ NHẠY (khí chất), KHÔNG đo lo âu — chú thích tại chỗ nói rõ.
//
// ⚠️ Toàn bộ bảng trọng số trong file là QUY CHIẾU CỦA TRANG. Phần có gốc cổ
// pháp là ĐẶC CHẤT TỪNG SAO (Văn Xương chủ văn chương khoa giáp; Thiên Cơ chủ
// cơ trí mưu lược; Thiên Lương là ấm tinh chủ y dược che chở; Địa Không/Địa
// Kiếp — Vương Đình Chi: "nên theo tôn giáo, tu hành, triết học"). Việc quy
// mấy đặc chất đó về tám miền năng khiếu hiện đại là bước dịch của trang, và
// trang phải nói rõ chỗ đó.
// ============================================================

import type { Laso } from './laso';
import type { KieuId } from './cong-so';

type Rec = Record<string, unknown>;
interface StarObj {
  ten: string;
  brightness?: string;
  hoa?: string | null;
}

// ── Hệ số đọc sao ───────────────────────────────────────────
// Dùng CÙNG dải độ sáng với `cong-so.ts` (0,6–1,0): sao hãm vẫn là sao đó, chỉ
// phát huy kém hơn. Cho về 0 thì một cung toàn sao hãm sẽ rơi về mốc trung
// tính và mọi trục đọc ra "cân bằng" — im lặng vô nghĩa.
const BRIGHT_W: Record<string, number> = {
  Miếu: 1.0,
  Vượng: 0.93,
  'Đắc địa': 0.87,
  Đắc: 0.87,
  Bình: 0.73,
  'Bình hòa': 0.73,
  'Bình hoà': 0.73,
  Hãm: 0.6,
};
const brightW = (b?: string) => BRIGHT_W[(b || '').trim()] ?? 0.8;

/** Tứ hoá NHÂN vào phần đóng góp của chính ngôi sao mang nó, không cộng thêm
 *  một khoản riêng: Hoá là trạng thái của sao (phát mạnh / bị vướng), không
 *  phải một ngôi sao độc lập. */
const HOA_W: Record<string, number> = {
  Lộc: 1.3,
  Quyền: 1.3,
  Khoa: 1.25,
  Kỵ: 0.75,
};
const hoaW = (h?: string | null) => HOA_W[String(h || '').trim()] ?? 1;

// ════════════════════════════════════════════════════════════
// PHẦN 1 — 5 TRỤC TÍNH KHÍ
// ════════════════════════════════════════════════════════════

export type TrucId = 'huong' | 'nhip' | 'nep' | 'hoa' | 'nhay';

export interface CucDef {
  /** Nhãn cực — PHẢI trung tính, không cực nào nghe như lời chê. */
  nhan: string;
  /** Biểu hiện ở nhà, để cha mẹ đối chiếu xem có đúng con mình không. */
  bieuHien: string;
  /** Việc người lớn nên làm khi con nghiêng về cực này. */
  dayThe: string;
  /** Chỗ dễ đọc nhầm cực này thành một tật xấu. */
  docNham: string;
}

export interface TrucDef {
  id: TrucId;
  ten: string;
  /** Câu hỏi trục này trả lời — đặt ngay dưới nhãn trên trang. */
  cauHoi: string;
  /** Cực ứng với điểm THẤP (0) và điểm CAO (10). */
  thap: CucDef;
  cao: CucDef;
  /**
   * Nội dung cho ca nằm GIỮA. Đo được ~35% số ca mỗi trục rơi vào đây — không
   * viết phần này thì một phần ba ô trên trang hiện ra trống, và cha mẹ đọc
   * thành "máy không đọc được con tôi".
   *
   * 🔑 Nằm giữa KHÔNG phải là "chưa rõ tính cách". Nó là một tính chất có thật
   * và dạy được: đứa trẻ dùng được cả hai kiểu, nên thứ quyết định là BỐI CẢNH
   * chứ không phải bản tính — và đó chính là chỗ người lớn có nhiều quyền nhất.
   */
  can: { bieuHien: string; dayThe: string };
  /** Đọc ở cung nào — hiện trên trang để người ta biết con số từ đâu ra. */
  nguon: string;
}

export const TRUC: Record<TrucId, TrucDef> = {
  huong: {
    id: 'huong',
    ten: 'Hướng năng lượng',
    cauHoi: 'Con nạp lại sức ở giữa đám đông hay ở chỗ yên?',
    thap: {
      nhan: 'Hướng vào trong',
      bieuHien:
        'Chơi một mình được lâu, về nhà mới nói nhiều, đám đông một lúc là xin ra ngoài. Bạn ít mà chơi bền.',
      dayThe:
        'Báo trước mỗi khi có chỗ đông người, và cho con một lối lui (một góc, một việc để cầm tay). Đừng bắt chào hỏi ngay lúc vừa tới.',
      docNham:
        'Bị gọi là nhút nhát hay khó gần. Thật ra con không sợ người — con chỉ tốn sức hơn khi ở giữa nhiều người, và cần thời gian nạp lại.',
    },
    cao: {
      nhan: 'Hướng ra ngoài',
      bieuHien:
        'Ở nhà một mình là bứt rứt, gặp bạn là bật lên, nghĩ ra ý gì phải nói ngay mới chịu được.',
      dayThe:
        'Cho con một chỗ để xả năng lượng với người khác mỗi ngày, rồi mới đòi ngồi yên. Ngồi yên trước, xả sau là ngược nhịp.',
      docNham:
        'Bị gọi là nghịch, không tập trung. Phần lớn là con đang thiếu chỗ để đẩy năng lượng ra, chứ không phải không học được.',
    },
    can: {
      bieuHien:
        'Chơi với bạn được, ở một mình cũng được — tuỳ hôm. Không phải đứa trẻ "chưa rõ tính": con dùng được cả hai chế độ.',
      dayThe:
        'Đừng chốt con là hướng nội hay hướng ngoại rồi xếp lịch theo cái nhãn đó. Cứ để xen kẽ một buổi đông người và một buổi yên, rồi nhìn xem sau buổi nào con dễ chịu hơn.',
    },
    nguon: 'Chính tinh cung Mệnh + cung Thiên Di (cung nói về con khi ra khỏi nhà)',
  },
  nhip: {
    id: 'nhip',
    ten: 'Nhịp phản ứng',
    cauHoi: 'Con vào việc bằng cách bật lên hay bằng cách ngấm dần?',
    thap: {
      nhan: 'Chậm mà chắc',
      bieuHien:
        'Cần thời gian làm quen, việc mới thì đứng nhìn trước. Đã vào rồi thì làm đều, ít bỏ dở.',
      dayThe:
        'Báo trước, đừng đổi phút chót, và làm cùng con vài lần đầu. Thúc nhanh không làm con nhanh lên — nó làm con rối rồi mất tự tin.',
      docNham:
        'Bị cho là thiếu chí tiến thủ hoặc chậm hiểu. Con hiểu bình thường, chỉ khởi động lâu hơn và bền hơn về sau.',
    },
    cao: {
      nhan: 'Nhanh và bung',
      bieuHien:
        'Nghe xong là làm ngay, hứng lên thì làm rất hăng, hết hứng thì bỏ giữa chừng. Cảm xúc lên xuống rõ.',
      dayThe:
        'Chia việc thành khúc ngắn có mốc kết thúc thấy được. Chốt lúc con đang hứng, đừng chốt lúc đã nguội.',
      docNham:
        'Bị cho là cả thèm chóng chán. Đúng là con nguội nhanh — nhưng đó là vấn đề ĐỘ DÀI của việc, không phải vấn đề ý chí.',
    },
    can: {
      bieuHien:
        'Việc thích thì vào nhanh, việc ngại thì lề mề — nhịp của con chạy theo HỨNG chứ không theo một tốc độ cố định.',
      dayThe:
        'Vì nhịp không cố định nên đòn bẩy nằm ở chỗ mở đầu: mười phút đầu tiên dễ vào thì cả buổi trôi. Ngồi cùng con đúng mười phút đó, rồi rút.',
    },
    nguon: 'Chính tinh cung Mệnh + nhóm sao nhanh/chậm (Hoả · Linh · Kình ↔ Đà · Đồng · Lương) + cung Phúc Đức',
  },
  nep: {
    id: 'nep',
    ten: 'Nếp và kỷ luật',
    cauHoi: 'Con chạy tốt hơn trong khuôn có sẵn hay trong khoảng trống tự bày?',
    thap: {
      nhan: 'Tự bày, tuỳ hứng',
      bieuHien:
        'Bàn học bừa mà vẫn tìm được đồ, làm bài theo thứ tự của riêng mình, ghét thời khoá biểu cứng.',
      dayThe:
        'Chốt KẾT QUẢ và HẠN, thả cách làm. Ép quy trình là con chống lại cái quy trình chứ không phải chống lại việc học.',
      docNham:
        'Bị cho là lười và ẩu. Thường thì con vẫn xong việc, chỉ là bằng đường khác đường người lớn muốn.',
    },
    cao: {
      nhan: 'Ngăn nắp, theo nếp',
      bieuHien:
        'Thích danh sách, thích biết trước hôm nay làm gì, khó chịu khi lịch đổi đột ngột. Nhận việc thì làm tới nơi.',
      dayThe:
        'Cho thời khoá biểu rõ và GIỮ ĐÚNG nó. Đổi luật giữa chừng làm hỏng lòng tin của con nhanh hơn là phạt nặng.',
      docNham:
        'Bị cho là cứng nhắc, khó tính. Cái con cần là biết trước — có cái đó thì con linh hoạt hơn nhiều so với người ngoài đoán.',
    },
    can: {
      bieuHien:
        'Có nếp ở chỗ con thấy đáng, bừa ở chỗ con thấy không đáng. Ngăn nắp của con là chọn lọc chứ không phải toàn phần.',
      dayThe:
        'Đừng đòi ngăn nắp toàn diện. Chọn ĐÚNG MỘT nếp bắt buộc (ví dụ soạn cặp tối hôm trước) và giữ nó thật nghiêm; phần còn lại thả.',
    },
    nguon: 'Cung Quan Lộc (cung học nghiệp) — điểm bền vững & căn cơ, cộng nhóm sao chuộng khuôn ↔ nhóm sao phá khuôn',
  },
  hoa: {
    id: 'hoa',
    ten: 'Cách ở với nhóm',
    cauHoi: 'Trong nhóm bạn, con thường nhường hay con thường giữ ý mình?',
    thap: {
      nhan: 'Giữ ý mình',
      bieuHien:
        'Không dễ theo số đông, tranh luận tới cùng, biết mình muốn gì từ sớm. Va chạm với bạn nhiều hơn trung bình.',
      dayThe:
        'Cho con chỗ được nói và được thắng bằng lý lẽ trong nhà, để con không phải giành phần đó ở ngoài đường. Dạy CÁCH nói, đừng dạy im.',
      docNham:
        'Bị gọi là bướng, hỗn. Phần lớn là con đang giữ một cái lý của mình — chưa được nghe hết nên nói to lên.',
    },
    cao: {
      nhan: 'Thuận theo nhóm',
      bieuHien:
        'Dễ chơi với ai cũng được, nhường phần cho bạn, ngại làm mất lòng. Việc nhóm thì nhận phần nặng mà không kể.',
      dayThe:
        'Hỏi riêng "con thấy thế nào" và chờ đủ lâu để con trả lời thật. Con nói "sao cũng được" nhiều hơn con nghĩ thế.',
      docNham:
        'Bị cho là ngoan, rồi thôi không hỏi nữa. Đó là chỗ nguy: con nuốt vào chứ không phải con không có ý kiến.',
    },
    can: {
      bieuHien:
        'Nhường được mà cũng giữ được, tuỳ chuyện và tuỳ người. Với bạn thân thì nói thẳng, với người lạ thì thủ.',
      dayThe:
        'Con đã biết chọn lúc nào nhường lúc nào giữ — việc của người lớn là hỏi cho ra LÝ DO con chọn, chứ không phải khen ngoan hay chê bướng.',
    },
    nguon: 'Cung Huynh Đệ + cung Nô Bộc (hai cung nói về người ngang hàng và bạn bè) + chính tinh cung Mệnh',
  },
  nhay: {
    id: 'nhay',
    ten: 'Độ nhạy cảm xúc',
    cauHoi: 'Một câu nói nặng ở lại trong con bao lâu?',
    thap: {
      nhan: 'Lì đòn',
      bieuHien:
        'Mắng xong quên nhanh, ngã thì tự đứng dậy, ít kể chuyện buồn. Không để bụng lâu.',
      dayThe:
        'Vì con không kêu nên phải HỎI mới biết. Đừng suy ra là con ổn chỉ vì con không nói gì.',
      docNham:
        'Bị cho là vô tâm, không biết thương ai. Con có cảm xúc như mọi đứa trẻ, chỉ là nó không nổi lên bề mặt.',
    },
    cao: {
      nhan: 'Nhạy cảm sâu',
      bieuHien:
        'Nhớ rất lâu chuyện bị mắng, đọc được không khí trong nhà, biết ngay ai đang giận. Dễ khóc hoặc dễ xịu.',
      dayThe:
        'Hạ giọng và nói riêng. Cùng một câu, nói to trước mặt người khác thì con nhận nặng gấp nhiều lần đứa trẻ khác.',
      docNham:
        'Bị cho là yếu đuối, mít ướt. Đây là NGƯỠNG CẢM NHẬN cao — cùng thứ làm con tinh ý và thấu cảm hơn bạn cùng tuổi.',
    },
    can: {
      bieuHien:
        'Chuyện thường thì bỏ qua nhanh, nhưng có vài chuyện chạm đúng chỗ là nhớ rất lâu. Ngưỡng của con không đều.',
      dayThe:
        'Cái đáng làm là tìm ra vài chỗ chạm đó (thường là bị so sánh, bị oan, hoặc bị cười trước mặt bạn) rồi tránh đúng mấy chỗ ấy. Không cần giữ ý toàn thời gian.',
    },
    nguon: 'Cung Phúc Đức (nền tâm tính) + nhóm sao nhạy/lì. ⚠️ Đo khí chất, KHÔNG đo sức khoẻ tâm thần.',
  },
};

export const TRUC_IDS = Object.keys(TRUC) as TrucId[];

/**
 * Trọng số sao cho từng trục. Dấu DƯƠNG kéo về cực CAO, dấu ÂM kéo về cực THẤP.
 *
 * Đọc cùng một bảng cho mọi cung — cung nào được đọc và nặng bao nhiêu thì
 * `TRUC_CUNG` bên dưới quyết định. Tách hai thứ ra vì chúng trả lời hai câu
 * khác nhau: bảng này là "sao này nói lên điều gì", bảng kia là "câu hỏi này
 * hỏi ở cung nào".
 */
const STAR_TRUC: Record<TrucId, Record<string, number>> = {
  huong: {
    'Thái Dương': 1.2, 'Tham Lang': 1.0, 'Cự Môn': 0.8, 'Phá Quân': 0.8,
    'Thất Sát': 0.6, 'Liêm Trinh': 0.5, 'Thiên Mã': 0.8, 'Đào Hoa': 0.6,
    'Hồng Loan': 0.5, 'Thiên Hỷ': 0.3, 'Tả Phụ': 0.3, 'Hữu Bật': 0.3,
    'Thái Âm': -1.0, 'Thiên Đồng': -0.7, 'Thiên Lương': -0.7, 'Thiên Cơ': -0.4,
    'Cô Thần': -0.6, 'Quả Tú': -0.6, 'Hoa Cái': -0.5, 'Địa Không': -0.4,
    'Thiên Hư': -0.3,
  },
  nhip: {
    'Hỏa Tinh': 1.2, 'Kình Dương': 1.0, 'Thất Sát': 1.0, 'Phá Quân': 1.0,
    'Linh Tinh': 0.9, 'Thiên Mã': 0.8, 'Tham Lang': 0.7, 'Liêm Trinh': 0.6,
    'Thiên Cơ': 0.5, 'Đại Hao': 0.4,
    'Thiên Đồng': -1.0, 'Thiên Lương': -1.0, 'Thái Âm': -0.8, 'Đà La': -0.8,
    'Thiên Phủ': -0.7, 'Thiên Tướng': -0.5, 'Lộc Tồn': -0.5, 'Thiên Thọ': -0.3,
  },
  nep: {
    'Thiên Phủ': 1.2, 'Thiên Tướng': 1.0, 'Lộc Tồn': 0.8, 'Tử Vi': 0.8,
    'Vũ Khúc': 0.8, 'Văn Xương': 0.7, 'Thiên Hình': 0.6, 'Quốc Ấn': 0.5,
    'Phá Quân': -1.2, 'Tham Lang': -0.9, 'Địa Không': -0.6, 'Địa Kiếp': -0.6,
    'Thất Sát': -0.5, 'Thiên Mã': -0.5, 'Đại Hao': -0.5, 'Tiểu Hao': -0.4,
    'Triệt': -0.4, 'Tuần': -0.3,
  },
  hoa: {
    'Thiên Đồng': 1.2, 'Thiên Lương': 0.9, 'Thái Âm': 0.9, 'Thiên Tướng': 0.7,
    'Tả Phụ': 0.6, 'Hữu Bật': 0.6, 'Thiên Phúc': 0.4, 'Ân Quang': 0.3,
    'Thiên Quý': 0.3,
    'Thất Sát': -1.1, 'Phá Quân': -1.0, 'Cự Môn': -0.9, 'Kình Dương': -0.8,
    'Liêm Trinh': -0.7, 'Thiên Hình': -0.5, 'Tham Lang': -0.4, 'Đà La': -0.4,
    'Tử Vi': -0.3,
  },
  nhay: {
    'Thái Âm': 1.0, 'Cự Môn': 0.9, 'Thiên Khốc': 0.8, 'Thiên Hư': 0.8,
    'Thiên Cơ': 0.6, 'Thiên Riêu': 0.6, 'Địa Không': 0.5, 'Linh Tinh': 0.5,
    'Văn Khúc': 0.4, 'Đào Hoa': 0.4,
    'Thiên Phủ': -0.9, 'Vũ Khúc': -0.9, 'Thất Sát': -0.8, 'Thiên Tướng': -0.6,
    'Thiên Đồng': -0.5, 'Lộc Tồn': -0.4, 'Thiên Thọ': -0.3,
  },
};

/**
 * Cung nào trả lời câu hỏi của trục nào, và nặng bao nhiêu.
 *
 * 🔑 KHÔNG đọc cả 12 cung cho mọi trục. Mỗi trục hỏi một chuyện, và cổ pháp đã
 * chỉ sẵn cung sở hữu chuyện đó: ra ngoài thì hỏi Thiên Di, học hành thì hỏi
 * Quan Lộc, bạn bè thì hỏi Huynh Đệ / Nô Bộc, nền tâm tính thì hỏi Phúc Đức.
 * Đọc tràn cả 12 cung là pha loãng tín hiệu tới mức trục nào cũng ra 5/10.
 *
 * ⛔ Không cung nào trong `KHONG_DOC` (Tật Ách · Tài Bạch · Phu Thê · Tử Tức ·
 * Điền Trạch) xuất hiện ở đây. Có test đối chiếu thẳng vào bảng này.
 */
const TRUC_CUNG: Record<TrucId, { cung: string; w: number }[]> = {
  huong: [{ cung: 'Mệnh', w: 1.0 }, { cung: 'Thiên Di', w: 0.7 }],
  nhip: [{ cung: 'Mệnh', w: 1.0 }, { cung: 'Phúc Đức', w: 0.4 }],
  nep: [{ cung: 'Quan Lộc', w: 1.0 }, { cung: 'Mệnh', w: 0.6 }],
  hoa: [{ cung: 'Mệnh', w: 0.7 }, { cung: 'Huynh Đệ', w: 0.6 }, { cung: 'Nô Bộc', w: 0.5 }],
  nhay: [{ cung: 'Phúc Đức', w: 1.0 }, { cung: 'Mệnh', w: 0.7 }],
};

/**
 * Mốc chuẩn hoá — trung bình và độ lệch chuẩn của điểm THÔ, ĐO ĐƯỢC trên lưới
 * 6.048 lá số trẻ em (sinh 2008–2020, 12 tháng × 3 ngày × 12 giờ × 2 giới).
 *
 * 🔑 VÌ SAO PHẢI CHUẨN HOÁ, KHÔNG NHÂN MỘT HỆ SỐ CHUNG. Điểm thô của một trục
 * phụ thuộc vào SỐ SAO tôi gán cho trục đó trong bảng trên, không phụ thuộc
 * vào tín hiệu. Lượt đo đầu ra đúng bệnh đó: trục `nhip` có độ lệch chuẩn 0,96
 * (gần 60% số ca rơi vào "cân bằng" — tức trục không nói gì) trong khi `nep`
 * lệch hẳn lên 5,66. Nhân một hệ số chung không chữa được, vì hai trục lệch
 * theo hai kiểu khác nhau.
 *
 * Nên điểm hiện ra là VỊ TRÍ SO VỚI PHÂN BỐ: 5 = mức giữa của lưới lá số đo
 * được, mỗi 1,8 điểm = một độ lệch chuẩn. Trang PHẢI nói đúng nghĩa đó —
 * "so với phần lớn lá số trẻ em", không phải "giỏi 7/10".
 */
const TRUC_NORM: Record<TrucId, { m: number; s: number }> = {
  huong: { m: 0.177, s: 1.312 },
  nhip: { m: 0.079, s: 0.91 },
  nep: { m: 0.598, s: 1.474 },
  hoa: { m: 0.583, s: 1.182 },
  nhay: { m: -0.028, s: 1.137 },
};

/** Một độ lệch chuẩn = bao nhiêu điểm trên thang 10. 1,8 cho ra ~±2 độ lệch
 *  trong dải [0,10] trước khi chạm trần — đo được dưới 1% ca chạm trần/sàn. */
const SPREAD = 1.8;

/** Dải điểm coi là "cân giữa hai cực" — trong dải này KHÔNG gán nhãn cực nào.
 *  Cùng lý do với `lai` của `phanKieu`: ép nhãn cho một ca thật sự lưỡng lự là
 *  nói chắc điều mình không chắc, mà đây lại là nói chắc về một đứa trẻ. */
const CAN_LO = 4.2;
const CAN_HI = 5.8;

export interface TrucScore {
  id: TrucId;
  ten: string;
  cauHoi: string;
  /** 0–10. 5 = giữa. */
  diem: number;
  /** Nhãn hai đầu, luôn trả để trang vẽ được thanh hai cực. */
  nhanThap: string;
  nhanCao: string;
  /** Cực đang nghiêng về, hoặc null khi nằm trong dải cân. */
  nghieng: 'thap' | 'cao' | null;
  /** 'nhe' | 'ro' | 'manh' — mức nghiêng, để trang khỏi tự đặt ngưỡng. */
  muc: 'can' | 'nhe' | 'ro' | 'manh';
  /** Nội dung của ĐÚNG cực đang nghiêng (null khi cân). */
  cuc: CucDef | null;
  /** Nội dung ca nằm giữa (null khi đã nghiêng hẳn về một cực). */
  canND: { bieuHien: string; dayThe: string } | null;
  nguon: string;
}

function mucCua(diem: number): TrucScore['muc'] {
  const d = Math.abs(diem - 5);
  if (diem >= CAN_LO && diem <= CAN_HI) return 'can';
  if (d < 1.6) return 'nhe';
  if (d < 2.8) return 'ro';
  return 'manh';
}

// ════════════════════════════════════════════════════════════
// PHẦN 2 — 8 CHẤT NĂNG KHIẾU
// ════════════════════════════════════════════════════════════

export type KhieuId =
  | 'ngon-ngu'
  | 'suy-luan'
  | 'hinh-khoi'
  | 'van-dong'
  | 'am-nhac'
  | 'hieu-nguoi'
  | 'hieu-minh'
  | 'thien-nhien';

export interface KhieuDef {
  id: KhieuId;
  ten: string;
  /** Một câu: chất này là chất gì. */
  motCau: string;
  /** Dấu hiệu QUAN SÁT ĐƯỢC ở nhà. Đây là chỗ cha mẹ tự kiểm chứng — và tự bác
   *  bỏ nếu không đúng. Bảng nào không cho người ta bác bỏ thì không đáng tin. */
  dauHieu: string[];
  /** Cái bẫy riêng của chất này — thường là chỗ cha mẹ đẩy quá tay. */
  chuY: string;
  /** Nên hỏi nhà trường điều gì. */
  oLop: string;
}

export const KHIEU: Record<KhieuId, KhieuDef> = {
  'ngon-ngu': {
    id: 'ngon-ngu',
    ten: 'Ngôn ngữ & kể chuyện',
    motCau: 'Vào việc bằng chữ và bằng lời — nghe, đọc, kể lại, tranh luận.',
    dauHieu: [
      'Kể chuyện có đầu có đuôi, biết giữ chỗ hồi hộp',
      'Nhớ lời thoại, nhớ câu hát, nhại giọng người khác',
      'Hỏi nghĩa của từ lạ, thích chơi chữ',
      'Học bài nhanh hơn hẳn khi được giảng lại cho người khác nghe',
    ],
    chuY:
      'Nói giỏi rất dễ bị nhầm là hiểu sâu. Thỉnh thoảng bắt con LÀM thay vì kể, để khoảng cách giữa nói và làm không rộng dần.',
    oLop: 'Hỏi cô có cho con thuyết trình / đọc to / đóng vai không — lớp nào chỉ chép bài thì chất này của con nằm im cả năm.',
  },
  'suy-luan': {
    id: 'suy-luan',
    ten: 'Suy luận & con số',
    motCau: 'Vào việc bằng cách tìm quy luật — thích biết vì sao chứ không chịu học vẹt.',
    dauHieu: [
      'Hỏi "tại sao lại thế" trước khi chịu làm theo',
      'Thích xếp, phân loại, so sánh, tìm quy luật',
      'Chơi được các trò cần tính nước đi',
      'Bực khi người lớn trả lời qua loa cho xong',
    ],
    chuY:
      'Dễ bị dồn hết vào luyện đề Toán. Chất này là ham tìm quy luật, không phải điểm số môn Toán — ép thi cử sớm là cách nhanh nhất giết nó.',
    oLop: 'Hỏi cô có cho con làm bài mở (nhiều cách giải, không có sẵn đáp án) không, hay chỉ có bài mẫu.',
  },
  'hinh-khoi': {
    id: 'hinh-khoi',
    ten: 'Hình khối & thẩm mỹ',
    motCau: 'Nghĩ bằng hình — nhớ chỗ, nhớ dáng, nhớ màu; đẹp hay xấu là con thấy ngay.',
    dauHieu: [
      'Vẽ, tô, xếp hình lâu không chán',
      'Nhớ đường đi, nhớ đồ để chỗ nào',
      'Để ý màu áo, cách bày đồ, chỗ nào lệch là thấy',
      'Hiểu bài nhanh hơn khi có tranh, sơ đồ, mô hình',
    ],
    chuY:
      'Đây là chất hay bị coi là "chỉ để chơi". Nó chính là nền của thiết kế, kiến trúc, kỹ thuật và cả hình học — đừng cắt giờ vẽ để bù giờ học.',
    oLop: 'Hỏi cô cho con dùng sơ đồ / bản đồ tư duy khi ôn không. Ghi chép toàn chữ là con phải dịch hai lần.',
  },
  'van-dong': {
    id: 'van-dong',
    ten: 'Vận động & khéo tay',
    motCau: 'Học bằng cơ thể — phải chạm vào, làm thử, làm hỏng rồi mới nhớ.',
    dauHieu: [
      'Ngồi yên lâu là ngọ nguậy, nhưng chạy nhảy thì bền',
      'Tay khéo: tháo lắp, gấp, nặn, buộc',
      'Bắt chước động tác nhanh, học được bằng cách nhìn rồi làm theo',
      'Nhớ lâu những việc đã tự tay làm',
    ],
    chuY:
      'Rất hay bị đọc nhầm thành tăng động rồi bị phạt ngồi yên. Cắt vận động không làm con tập trung hơn — nó làm ngược lại.',
    oLop: 'Hỏi lớp có đủ giờ ra chơi và giờ thể chất thật không, và con có được đứng lên di chuyển giữa tiết không.',
  },
  'am-nhac': {
    id: 'am-nhac',
    ten: 'Âm nhạc & nhịp điệu',
    motCau: 'Bắt nhịp và bắt âm nhanh — nghe một lần là thuộc giai điệu.',
    dauHieu: [
      'Hát theo đúng nhịp, gõ nhịp khi nghe nhạc',
      'Nghe ra ai hát sai tông',
      'Thuộc bài nhanh khi bài có vần, có nhịp',
      'Nhạy với tiếng động, chỗ ồn quá là khó chịu',
    ],
    chuY:
      'Đừng vội quy ra "cho học piano". Nhịp điệu còn dùng để học ngoại ngữ và học thuộc — thử vài ngả rồi hẵng chọn nhạc cụ.',
    oLop: 'Hỏi trường có hoạt động nhạc thật (hát tập thể, gõ nhịp, nhạc cụ) hay chỉ có tiết nhạc trên giấy.',
  },
  'hieu-nguoi': {
    id: 'hieu-nguoi',
    ten: 'Hiểu người & dẫn nhóm',
    motCau: 'Đọc được người khác đang thấy gì, và biết cách làm nhóm chạy.',
    dauHieu: [
      'Biết ngay ai trong nhà đang giận, dù không ai nói',
      'Bạn hay tìm đến kể chuyện, nhờ phân xử',
      'Trong nhóm chơi thường là người chia vai',
      'Đổi cách nói tuỳ người đang nghe',
    ],
    chuY:
      'Con dễ thành người đứng ra gánh phần dàn xếp cho cả nhóm, kể cả khi chưa đủ tuổi gánh. Dạy con quyền nói "cái này không phải việc của con".',
    oLop: 'Hỏi cô cho con làm việc nhóm thật (có phân vai) không — với chất này, học nhóm không phải phần thưởng, nó là cách học.',
  },
  'hieu-minh': {
    id: 'hieu-minh',
    ten: 'Hiểu mình & tự học',
    motCau: 'Quay vào bên trong — biết mình đang nghĩ gì, tự đặt câu hỏi lớn sớm.',
    dauHieu: [
      'Hỏi những câu rất lớn so với tuổi (chết là gì, vì sao có mình)',
      'Cần thời gian một mình, và dùng nó thật chứ không lãng phí',
      'Tự nhận ra mình sai mà không cần ai nói',
      'Có một thế giới riêng, không phải chuyện gì cũng kể',
    ],
    chuY:
      'Đừng chữa cái tĩnh lặng này thành "phải hoà đồng hơn". Việc cần làm là cho con một chỗ và một giờ yên, rồi hỏi con những câu đáng nghĩ.',
    oLop: 'Hỏi cô có cho con làm dự án cá nhân dài hơi không, và con có bị ép phát biểu trước lớp không.',
  },
  'thien-nhien': {
    id: 'thien-nhien',
    ten: 'Thiên nhiên & chăm sóc',
    motCau: 'Nhạy với cây cối, con vật, và với người đang cần được chăm.',
    dauHieu: [
      'Xà vào chó mèo, cây cối; nhớ tên từng con vật',
      'Chăm được một thứ sống trong thời gian dài',
      'Thích phân loại lá, đá, côn trùng',
      'Ai trong nhà ốm là con quanh quẩn bên cạnh',
    ],
    chuY:
      'Chất này bị coi là không liên quan tới học hành nên hay bị bỏ. Nó là nền của y sinh, nông lâm, môi trường — và là cách con học trách nhiệm sớm nhất.',
    oLop: 'Hỏi trường có góc cây, vật nuôi, hoạt động ngoài trời thật không.',
  },
};

export const KHIEU_IDS = Object.keys(KHIEU) as KhieuId[];

/**
 * Sao → chất. Gốc là ĐẶC CHẤT CỔ PHÁP của từng sao; việc quy nó về tám miền
 * năng khiếu hiện đại là bước dịch của trang.
 *
 *   Văn Xương / Văn Khúc — văn chương, khoa giáp, kỹ nghệ
 *   Cự Môn               — khẩu thiệt, biện luận
 *   Thiên Cơ             — cơ trí, mưu lược, thiện biến
 *   Vũ Khúc              — tài tinh, kim khí, quyết đoán
 *   Thái Âm              — thanh khiết, tinh tế, thẩm mỹ
 *   Long Trì / Phượng Các— khoa giáp, tài hoa mỹ lệ
 *   Tham Lang            — đa tài đa nghệ, giao tế
 *   Thất Sát / Phá Quân  — võ nghiệp, xông pha
 *   Tử Vi / Thiên Tướng  — đế tinh, ấn tinh (cầm trịch, phò tá)
 *   Thiên Lương          — ấm tinh, chủ y dược, che chở
 *   Địa Không / Địa Kiếp — Vương Đình Chi: "nên theo tôn giáo, tu hành, triết học"
 */
const STAR_KHIEU: Record<string, Partial<Record<KhieuId, number>>> = {
  // — Chính tinh —
  'Tử Vi': { 'hieu-nguoi': 2.5, 'suy-luan': 0.5 },
  'Thiên Cơ': { 'suy-luan': 3.0, 'hieu-minh': 1.0 },
  'Thái Dương': { 'ngon-ngu': 2.0, 'hieu-nguoi': 1.5 },
  'Vũ Khúc': { 'suy-luan': 2.0, 'van-dong': 1.5, 'hinh-khoi': 0.8 },
  'Thiên Đồng': { 'hieu-nguoi': 1.5, 'thien-nhien': 1.0, 'am-nhac': 0.8 },
  'Liêm Trinh': { 'van-dong': 1.5, 'hinh-khoi': 0.5 },
  'Thiên Phủ': { 'hieu-nguoi': 1.0, 'suy-luan': 1.0 },
  'Thái Âm': { 'hinh-khoi': 2.5, 'am-nhac': 1.5, 'hieu-minh': 1.0 },
  'Tham Lang': { 'am-nhac': 2.0, 'hieu-nguoi': 1.5, 'van-dong': 1.0 },
  'Cự Môn': { 'ngon-ngu': 3.0, 'suy-luan': 1.0 },
  'Thiên Tướng': { 'hieu-nguoi': 2.0, 'hinh-khoi': 1.0 },
  'Thiên Lương': { 'thien-nhien': 2.5, 'hieu-minh': 1.5 },
  'Thất Sát': { 'van-dong': 3.0 },
  'Phá Quân': { 'van-dong': 2.5, 'hinh-khoi': 0.5 },
  // — Phụ tinh văn / khoa —
  'Văn Xương': { 'ngon-ngu': 3.0, 'suy-luan': 1.5 },
  'Văn Khúc': { 'ngon-ngu': 2.5, 'am-nhac': 2.0 },
  'Thai Phụ': { 'ngon-ngu': 1.0 },
  'Phong Cáo': { 'ngon-ngu': 1.0 },
  'Long Trì': { 'hinh-khoi': 1.5, 'am-nhac': 1.0 },
  'Phượng Các': { 'hinh-khoi': 1.5, 'am-nhac': 1.0 },
  'Thiên Tài': { 'suy-luan': 1.0, 'hinh-khoi': 0.5, 'am-nhac': 0.5 },
  'Ân Quang': { 'ngon-ngu': 0.6 },
  'Thiên Quý': { 'ngon-ngu': 0.6 },
  'Thiên Khôi': { 'ngon-ngu': 0.8, 'hieu-nguoi': 0.6 },
  'Thiên Việt': { 'ngon-ngu': 0.8, 'hieu-nguoi': 0.6 },
  // — Phụ tinh thẩm mỹ / giao tế —
  // ⚠️ Nhóm quý tinh chung (Tam Thai · Bát Tọa · Thiên Hỷ) CỐ Ý bỏ khỏi
  // `hieu-nguoi`. Lượt đo đầu có 19 ngôi sao cùng đổ vào miền này, biến nó
  // thành "lá số có sao tốt nào không" — 50,8% lá số nổi ở đó, tức miền không
  // phân biệt được ai với ai. Chỉ giữ sao mà cổ pháp gắn ĐÍCH DANH với việc
  // cầm người hoặc phò tá.
  'Đào Hoa': { 'am-nhac': 1.5, 'hieu-nguoi': 1.0 },
  'Hồng Loan': { 'hinh-khoi': 1.0, 'am-nhac': 0.5 },
  'Tả Phụ': { 'hieu-nguoi': 1.5 },
  'Hữu Bật': { 'hieu-nguoi': 1.5 },
  'Quốc Ấn': { 'hieu-nguoi': 1.0 },
  // — Động / khéo tay —
  'Thiên Mã': { 'van-dong': 2.0 },
  'Kình Dương': { 'van-dong': 1.5 },
  'Đà La': { 'van-dong': 1.0 },
  'Hỏa Tinh': { 'van-dong': 1.0 },
  'Linh Tinh': { 'van-dong': 0.5, 'am-nhac': 0.5 },
  'Thiên Hình': { 'suy-luan': 1.0, 'van-dong': 0.5 },
  // — Hướng nội / tinh thần —
  'Địa Không': { 'hieu-minh': 2.5 },
  'Địa Kiếp': { 'hieu-minh': 2.5 },
  'Thiên Không': { 'hieu-minh': 1.0 },
  'Hoa Cái': { 'hieu-minh': 1.5 },
  'Cô Thần': { 'hieu-minh': 1.0 },
  'Quả Tú': { 'hieu-minh': 1.0 },
  // — Chăm sóc / thiên nhiên —
  'Thiên Y': { 'thien-nhien': 2.0 },
  'Thiên Trù': { 'thien-nhien': 1.5, 'van-dong': 0.5 },
  'Thiên Phúc': { 'thien-nhien': 1.0 },
  'Thiên Thọ': { 'thien-nhien': 0.5 },
  'Giải Thần': { 'thien-nhien': 0.5 },
  'Lộc Tồn': { 'suy-luan': 1.0 },
};

/** Cung đọc năng khiếu, và nặng bao nhiêu.
 *  Mệnh = chất gốc · Quan Lộc = cung HỌC NGHIỆP (cổ pháp đọc đường học ở đây)
 *  · Phúc Đức = thiên hướng tinh thần, thứ con tự tìm đến khi rảnh. */
const KHIEU_CUNG: { cung: string; w: number }[] = [
  { cung: 'Mệnh', w: 1.0 },
  { cung: 'Quan Lộc', w: 0.85 },
  { cung: 'Phúc Đức', w: 0.5 },
];

/** Mốc chuẩn hoá từng chất — ĐO trên cùng lưới 6.048 lá số. Xem chú thích
 *  `TRUC_NORM`: điểm thô giữa các chất KHÔNG so được với nhau (miền nào tôi
 *  gán nhiều sao hơn thì điểm cao hơn, không liên quan tới đứa trẻ). */
const KHIEU_NORM: Record<KhieuId, { m: number; s: number }> = {
  'ngon-ngu': { m: 2.721, s: 2.121 },
  'suy-luan': { m: 2.549, s: 1.229 },
  'hinh-khoi': { m: 1.941, s: 0.961 },
  'van-dong': { m: 2.744, s: 2.232 },
  'am-nhac': { m: 2.134, s: 0.939 },
  'hieu-nguoi': { m: 3.007, s: 1.552 },
  'hieu-minh': { m: 2.254, s: 1.54 },
  'thien-nhien': { m: 1.759, s: 1.336 },
};

/** Ngưỡng "chất nổi" — 6,5/10 ≈ trên trung bình 0,83 độ lệch chuẩn, tức con
 *  đứng ở khoảng 20% cao nhất của chất đó. Đo được: trung bình 1,5 chất nổi
 *  mỗi lá số, và ~14% lá số KHÔNG có chất nào nổi.
 *
 *  🔑 Ca "không có chất nào nổi" là ca PHẢI GIỮ. Hạ ngưỡng cho lá số nào cũng
 *  có năng khiếu thì câu "con nổi ở X" hết nghĩa, và cha mẹ nào đọc cũng thấy
 *  đúng — dấu hiệu của một bảng không nói gì. Trang nói thẳng khi rơi vào ca
 *  đó, kèm việc nên làm: chưa đủ dấu hiệu thì cho con THỬ, đừng chọn hộ. */
const KHIEU_NGUONG = 6.5;

export interface KhieuScore {
  id: KhieuId;
  ten: string;
  motCau: string;
  diem: number;
  noiBat: boolean;
  dauHieu: string[];
  chuY: string;
  oLop: string;
  /** Sao đã kéo chất này lên — hiện ở khối "cơ sở trong lá số". */
  saoDay: string[];
}

// ════════════════════════════════════════════════════════════
// PHẦN 3 — TÍNH
// ════════════════════════════════════════════════════════════

const palaces = (ls: Laso): Rec[] => (ls.palaces as Rec[]) || [];

function palaceByName(ls: Laso, name: string): Rec | undefined {
  return palaces(ls).find((p) => p.cungName === name);
}

/**
 * Mọi sao đọc được ở một cung, kèm hệ số của từng sao.
 *
 * Cung VÔ CHÍNH DIỆU thì mượn CHÍNH TINH cung xung chiếu ở hệ số 0,8 (cổ pháp
 * Tân Biên 8.45) — phụ tinh thì KHÔNG mượn, vì phụ tinh của cung đối là chuyện
 * của cung đó. Bỏ bước mượn là 16,2% lá số có Mệnh trống đọc ra trục nào cũng
 * bằng 5.
 */
function starsOf(ls: Laso, name: string): { s: StarObj; w: number }[] {
  const p = palaceByName(ls, name);
  if (!p) return [];
  const own = ((p.stars as StarObj[]) || []).filter((s) => s && s.ten);
  const out = own.map((s) => ({ s, w: 1 }));
  const coChinh = ((p.majorStars as StarObj[]) || []).some((s) => s && s.ten);
  if (!coChinh) {
    const xung = p.xungChieuCung as Rec | undefined;
    const muon = ((xung?.majorStars as StarObj[]) || []).filter((s) => s && s.ten);
    for (const s of muon) out.push({ s, w: 0.8 });
  }
  return out;
}

const clamp10 = (v: number) => Math.max(0, Math.min(10, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

function cungTong(ls: Laso, cung: string, truong: string): number | null {
  const sc = (ls.cungScores as Record<string, Rec>)?.[cung];
  const v = sc?.[truong];
  return typeof v === 'number' ? v : null;
}

/** Phần điểm cung đóng góp cho từng trục. Tách khỏi phần sao vì nó trả lời một
 *  câu khác: sao nói CHẤT, điểm cung nói cung đó ĐANG mạnh hay yếu. */
function trucTuDiemCung(ls: Laso, id: TrucId): number {
  const g = (c: string, t: string) => cungTong(ls, c, t);
  if (id === 'huong') {
    const td = g('Thiên Di', 'tong');
    const me = g('Mệnh', 'tong');
    // Thiên Di mạnh hơn Mệnh ⇒ con "nở" ra ngoài hơn ở nhà. Đây là lối đọc cổ
    // pháp quen thuộc, và nó là tín hiệu duy nhất phân biệt được đứa trẻ ở nhà
    // im mà ra ngoài lại khác hẳn.
    return td != null && me != null ? (td - me) * 0.22 : 0;
  }
  if (id === 'nep') {
    const bv = g('Quan Lộc', 'benVung');
    const cc = g('Quan Lộc', 'canCo');
    return (bv != null ? (bv - 5) * 0.32 : 0) + (cc != null ? (cc - 5) * 0.14 : 0);
  }
  if (id === 'hoa') {
    const hd = g('Huynh Đệ', 'phuTro');
    const nb = g('Nô Bộc', 'phuTro');
    return (hd != null ? (hd - 5) * 0.24 : 0) + (nb != null ? (nb - 5) * 0.22 : 0);
  }
  if (id === 'nhay') {
    // `binhYen` của Phúc Đức thấp = cung này nhiều tín hiệu xáo động. Đọc thành
    // ĐỘ NHẠY (ngưỡng cảm nhận cao) chứ KHÔNG đọc thành bất an — xem cảnh báo
    // đầu file. Đây là chỗ dịch nghĩa của trang, không phải chữ trong cổ thư.
    const by = g('Phúc Đức', 'binhYen');
    return by != null ? (5 - by) * 0.3 : 0;
  }
  return 0;
}

/** Điểm THÔ từng trục, TRƯỚC chuẩn hoá. Tách ra vì bài đo phân bố và bài kiểm
 *  bất biến phải nhìn được số trước khi nó bị kẹp về [0,10] — kẹp xong thì mọi
 *  ca chạm trần đều bằng nhau và không đo được gì nữa. */
export function rawTruc(ls: Laso): Record<TrucId, number> {
  const out = {} as Record<TrucId, number>;
  for (const id of TRUC_IDS) {
    let raw = 0;
    for (const { cung, w } of TRUC_CUNG[id]) {
      for (const { s, w: sw } of starsOf(ls, cung)) {
        const base = STAR_TRUC[id][s.ten];
        if (!base) continue;
        raw += base * w * sw * brightW(s.brightness) * hoaW(s.hoa);
      }
    }
    out[id] = raw + trucTuDiemCung(ls, id);
  }
  return out;
}

function tinhTruc(ls: Laso): TrucScore[] {
  const raws = rawTruc(ls);
  return TRUC_IDS.map((id) => {
    const n = TRUC_NORM[id];
    const diem = r1(clamp10(5 + ((raws[id] - n.m) / n.s) * SPREAD));
    const d = TRUC[id];
    const muc = mucCua(diem);
    const nghieng = muc === 'can' ? null : diem > 5 ? 'cao' : 'thap';
    return {
      id,
      ten: d.ten,
      cauHoi: d.cauHoi,
      diem,
      nhanThap: d.thap.nhan,
      nhanCao: d.cao.nhan,
      nghieng,
      muc,
      cuc: nghieng === 'cao' ? d.cao : nghieng === 'thap' ? d.thap : null,
      canND: nghieng === null ? d.can : null,
      nguon: d.nguon,
    };
  });
}

/** Điểm THÔ + sao đã kéo từng chất lên. Xem chú thích `rawTruc`. */
export function rawKhieu(ls: Laso): {
  raw: Record<KhieuId, number>;
  gop: Record<KhieuId, { ten: string; v: number }[]>;
} {
  const raw = {} as Record<KhieuId, number>;
  const gop = {} as Record<KhieuId, { ten: string; v: number }[]>;
  for (const id of KHIEU_IDS) {
    raw[id] = 0;
    gop[id] = [];
  }
  for (const { cung, w } of KHIEU_CUNG) {
    for (const { s, w: sw } of starsOf(ls, cung)) {
      const m = STAR_KHIEU[s.ten];
      if (!m) continue;
      const k = w * sw * brightW(s.brightness) * hoaW(s.hoa);
      for (const key of Object.keys(m) as KhieuId[]) {
        const v = (m[key] as number) * k;
        raw[key] += v;
        gop[key].push({ ten: s.ten, v });
      }
    }
  }
  return { raw, gop };
}

function tinhKhieu(ls: Laso): KhieuScore[] {
  const { raw, gop } = rawKhieu(ls);

  return KHIEU_IDS.map((id) => {
    const d = KHIEU[id];
    const n = KHIEU_NORM[id];
    const diem = r1(clamp10(5 + ((raw[id] - n.m) / n.s) * SPREAD));
    return {
      id,
      ten: d.ten,
      motCau: d.motCau,
      diem,
      noiBat: diem >= KHIEU_NGUONG,
      dauHieu: d.dauHieu,
      chuY: d.chuY,
      oLop: d.oLop,
      saoDay: gop[id]
        .sort((a, b) => b.v - a.v)
        .slice(0, 3)
        .map((x) => x.ten)
        .filter((t, i, arr) => arr.indexOf(t) === i),
    };
  }).sort((a, b) => b.diem - a.diem);
}

// ════════════════════════════════════════════════════════════
// PHẦN 4 — GHÉP LẠI
// ════════════════════════════════════════════════════════════

export interface Assessment {
  /** 5 trục, giữ nguyên thứ tự khai trong `TRUC` để trang vẽ ổn định. */
  truc: TrucScore[];
  /** 8 chất, ĐÃ sắp giảm dần theo điểm. */
  khieu: KhieuScore[];
  /** Các chất vượt ngưỡng, tối đa 3. Rỗng = chưa đủ dấu hiệu, và nói thẳng thế. */
  noiBat: KhieuScore[];
  /** Chất thấp nhất — KHÔNG gọi là "yếu", gọi là chỗ cần dựng thêm chỗ dựa. */
  canDo: KhieuScore | null;
  /** Có chất nào nổi không. Trang dùng để đổi câu chứ không để ẩn khối. */
  coNoiBat: boolean;
}

export function assessChild(ls: Laso): Assessment {
  const truc = tinhTruc(ls);
  const khieu = tinhKhieu(ls);
  const noiBat = khieu.filter((k) => k.noiBat).slice(0, 3);
  return {
    truc,
    khieu,
    noiBat,
    canDo: khieu.length ? khieu[khieu.length - 1] : null,
    coNoiBat: noiBat.length > 0,
  };
}

/** Danh sách cung khung này ĐỌC — để test đối chiếu với `KHONG_DOC`. Gộp cả
 *  hai bảng vì hai bảng cùng phải chịu một luật. */
export const CUNG_DUOC_DOC: string[] = Array.from(
  new Set([
    ...TRUC_IDS.flatMap((id) => TRUC_CUNG[id].map((c) => c.cung)),
    ...KHIEU_CUNG.map((c) => c.cung),
  ]),
);
