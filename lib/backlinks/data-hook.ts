// lib/backlinks/data-hook.ts
// ============================================================
// MÓC DỮ LIỆU cho thư gửi báo chí — mục #11/14.
//
// 🔑 Vì sao pitch báo chí cần một thứ riêng, không dùng chung prompt guest
// post: toà soạn không đăng vì site hay, họ đăng vì có CÁI GÌ MỚI để kể. Thư
// "bên tôi có công cụ tử vi" là thư quảng cáo và bị bỏ ngay; thư "chúng tôi
// vừa công bố bộ số đầu tiên về X, đây là con số lạ nhất trong đó" là một
// tin. Nên móc câu chuyện phải là MỘT CON SỐ CÓ THẬT, tra lại được.
//
// Con số lấy THẲNG từ bộ dữ liệu mở (#10) — không gõ tay, không nhờ model
// nghĩ ra. Model bịa một con số thống kê trong thư gửi nhà báo là thứ hỏng
// nặng nhất cả track này có thể gây ra: nó đi vào bài báo rồi không rút lại
// được, và nó phá đúng thứ duy nhất bộ dữ liệu bán — sự đáng tin.
//
// ⚠️ Mỗi móc BẮT BUỘC đi kèm `caveat`. Thiếu nó thì nhà báo viết thành
// "X% người Việt có mệnh Tử Vi" — câu mình KHÔNG có dữ liệu để nói (xem cảnh
// báo ở `app/du-lieu/route.ts`). Vì thế hàm này trả CẶP số-và-cách-đọc, và
// prompt bị cấm nêu số mà bỏ cách đọc.
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Item { value: string; count: number; percent: number }
interface Dist { label: string; note?: string; items?: Item[]; count?: number; percent?: number }
interface Dataset {
  version: string;
  generatedAt: string;
  totals: { charts: number; yearsCovered: number; dayStep: number };
  distributions: Record<string, Dist>;
}

export interface DataHook {
  /** Câu tin, đã gói sẵn con số. */
  fact: string;
  /** Cách đọc BẮT BUỘC kèm theo — chống suy rộng thành phân bố dân số. */
  caveat: string;
  /** Trang để nhà báo tự tra lại. */
  source: string;
  version: string;
  charts: number;
}

const DATASET_URL = 'https://www.tuviminhbao.com/du-lieu';
const CAVEAT =
  'Đây là phân bố trên KHÔNG GIAN THỜI ĐIỂM SINH (mọi giờ/ngày sinh có thể có), ' +
  'KHÔNG phải phân bố dân số Việt Nam — không được viết "X% người Việt", ' +
  'câu đúng là "trong các thời điểm sinh có thể có, X% cho ra…".';

function load(): Dataset | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'tuvi-dataset-v1.json'), 'utf8'));
  } catch {
    return null;
  }
}

const nf = (n: number) => n.toLocaleString('vi-VN');
// Thập phân theo lối Việt (dấu phẩy) — thư gửi nhà báo Việt mà viết "16.5%"
// thì cùng dấu chấm đó ở "96.480 lá số" lại là hàng nghìn, đọc lẫn ngay.
const pct = (n: number) => n.toFixed(1).replace('.', ',');

/**
 * Chọn vài con số ĐÁNG KỂ trong bộ dữ liệu.
 *
 * 🪤 ĐÍNH CHÍNH của chính tôi — bản đầu của hàm này viết theo giả định "chắc
 * có sao hiếm, cục hiếm", với câu mẫu kiểu "chênh nhau N lần". Đo xong thì
 * NGƯỢC LẠI: 14 chính tinh trải 8,23–8,42%, năm cục đều ~20%, cung an Thân
 * đúng 16,67% mỗi cung. Ép câu "không hề chia đều" vào bộ số đó là nói dối
 * ngay trong thư gửi nhà báo — thứ hỏng nặng nhất track này có thể gây ra.
 *
 * Nên móc câu chuyện đổi hẳn hướng: chính SỰ ĐỀU ĐẶN mới là cái phản trực
 * giác (người ta mặc định "số hiếm" là có thật), còn con số lệch duy nhất
 * đáng kể là mệnh vô chính diệu ~1/6. Đây là lý do hàm này đọc file thay vì
 * để model nghĩ ra số: model sẽ nghĩ ra đúng cái giả định sai ở trên.
 */
export function buildDataHooks(): DataHook[] {
  const d = load();
  if (!d) return [];
  const base = { caveat: CAVEAT, source: DATASET_URL, version: d.version, charts: d.totals.charts };
  const hooks: DataHook[] = [];

  // 1) Mệnh vô chính diệu — con số lệch RÕ duy nhất, và là khái niệm người
  //    ngoài chưa nghe bao giờ ⇒ móc mạnh nhất, để đầu.
  const vcd = d.distributions.menhVoChinhDieu;
  if (vcd?.percent != null) {
    hooks.push({
      ...base,
      fact:
        `Cứ khoảng 6 lá số thì có 1 rơi vào "Mệnh vô chính diệu" (${pct(vcd.percent)}%) — ` +
        `cung Mệnh không có chính tinh nào, một trạng thái mà cổ thư phải luận bằng cách ` +
        `mượn sao từ cung đối diện.`,
    });
  }

  // 2) Sự ĐỀU ĐẶN — phản trực giác, và chỉ nói được khi có bộ số.
  const stars = d.distributions.menhMajorStar?.items || [];
  if (stars.length >= 2) {
    const hi = stars[0];
    const lo = stars[stars.length - 1];
    const spread = hi.percent - lo.percent;
    if (spread < 2) {
      hooks.push({
        ...base,
        fact:
          `Không có "sao hiếm": trong ${nf(d.totals.charts)} lá số phủ trọn một vòng can chi 60 năm, ` +
          `cả 14 chính tinh đều đóng cung Mệnh với tần suất sát nhau — cao nhất ${hi.value} ` +
          `${pct(hi.percent)}%, thấp nhất ${lo.value} ${pct(lo.percent)}%, chênh chưa tới ` +
          `${pct(spread)} điểm phần trăm.`,
      });
    } else {
      hooks.push({
        ...base,
        fact:
          `Trong ${nf(d.totals.charts)} lá số, chính tinh hay đóng cung Mệnh nhất là ${hi.value} ` +
          `(${pct(hi.percent)}%), hiếm nhất là ${lo.value} (${pct(lo.percent)}%).`,
      });
    }
  }

  // 3) Số chính tinh tại Mệnh — cách đọc gọn nhất của cùng bộ số trên.
  const cnt = d.distributions.menhMajorStarCount?.items || [];
  const one = cnt.find((i) => i.value === '1');
  const two = cnt.find((i) => i.value === '2');
  if (one && two) {
    hooks.push({
      ...base,
      fact:
        `Quá nửa số lá số (${pct(one.percent)}%) chỉ có đúng một chính tinh ở cung Mệnh, ` +
        `${pct(two.percent)}% có hai sao cùng đóng.`,
    });
  }

  // 4) Cục — CHỈ nêu khi thật sự lệch. Đo được là ~20% đều nhau, nên nhánh
  //    "chia đều" mới là nhánh đúng; giữ cả hai để bộ số bản sau đổi thì câu
  //    chữ đổi theo, không phải sửa tay.
  const cuc = d.distributions.cuc?.items || [];
  if (cuc.length >= 2) {
    const hi = cuc[0];
    const lo = cuc[cuc.length - 1];
    const spread = hi.percent - lo.percent;
    hooks.push({
      ...base,
      fact:
        spread < 2
          ? `Năm "cục" của Tử Vi chia gần như đều nhau, mỗi cục khoảng ${Math.round(hi.percent)}% — ` +
            `không cục nào hiếm hơn cục nào.`
          : `Năm "cục" không chia đều: ${hi.value} ${pct(hi.percent)}%, ` +
            `${lo.value} chỉ ${pct(lo.percent)}%.`,
    });
  }

  // 5) Quy mô bảng cách cục — con số "có bao nhiêu" tự nó là một dữ kiện.
  const cc = d.distributions.cachCuc?.items || [];
  if (cc.length) {
    hooks.push({
      ...base,
      fact:
        `Bộ dữ liệu liệt kê ${nf(cc.length)} cách cục cùng tỉ lệ xuất hiện của từng cái — ` +
        `một lá số thường mang nhiều cách cục cùng lúc, nên các tỉ lệ này không cộng thành 100%.`,
    });
  }

  return hooks;
}

/** Khối chữ nhét vào prompt. '' khi chưa có dữ liệu — lúc đó KHÔNG soạn pitch. */
export function dataHookBlock(): string {
  const hooks = buildDataHooks();
  if (!hooks.length) return '';
  const h = hooks[0];
  const lines = hooks.map((x, i) => `${i + 1}. ${x.fact}`).join('\n');
  return `SỐ LIỆU CÓ THẬT (lấy từ bộ dữ liệu mở đã công bố, bản ${h.version}):
${lines}

Trang dữ liệu để dẫn nguồn: ${h.source} (giấy phép CC BY 4.0, tải JSON/CSV miễn phí)

⚠️ CÁCH ĐỌC BẮT BUỘC — nêu số nào thì phải kèm ý này: ${h.caveat}`;
}
