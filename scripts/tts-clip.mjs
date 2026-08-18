/**
 * Sinh giọng đọc cho TỪNG CẢNH của clip, tải về `remotion/public/audio/`, và
 * ĐO ĐỘ DÀI THẬT của từng file.
 *
 * 🔑 Vì sao đo thật chứ không ước lượng: đã đo và thấy tốc độ đọc câu ngắn dao
 * động rất mạnh (11–18 ký tự/giây tuỳ câu) — ước lượng sai 1–2 giây, đủ để
 * hình lệch hẳn khỏi tiếng. Với đoạn dài thì hằng số 13,59 đúng, nhưng cảnh
 * clip toàn câu ngắn nên phải đo.
 *
 * Cache theo HASH của (text + giọng + tốc độ): chạy lại không đốt lại quota, và
 * sửa một câu thì chỉ câu đó sinh lại.
 */
import { createHash } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const AUDIO_DIR = join(ROOT, 'remotion/public/audio');

const FN_URL = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL}/functions/v1/tts-clip`
  : 'https://dciwkfdqhhddeymlisey.supabase.co/functions/v1/tts-clip';

/**
 * Khoá gọi hàm edge. Ưu tiên biến môi trường; không có thì dùng anon key công
 * khai của project (chính là key nằm sẵn trong mã client của site, không phải
 * bí mật). Hàm edge có trần 600 ký tự mỗi lượt để hạn chế thiệt hại nếu ai đó
 * dùng bừa — nhưng nếu hàm này còn sống lâu dài thì nên đặt `CLIP_TTS_SECRET`.
 */
const KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/**
 * Đo thời lượng mp3.
 *
 * Vbee trả mp3 CBR 128kbps nên kích thước chia cho 16.000 ra số giây — nhưng
 * thẻ ID3 (nếu có) làm lệch vài phần trăm giây. Dùng bộ phân tích thật của
 * Remotion cho chắc; hỏng thì mới rơi về phép chia.
 */
async function measure(path, bytes) {
  try {
    const { parseMedia } = await import(
      join(ROOT, 'remotion/node_modules/@remotion/media-parser/dist/esm/index.mjs')
    );
    const { nodeReader } = await import(
      join(ROOT, 'remotion/node_modules/@remotion/media-parser/dist/esm/node.mjs')
    );
    const r = await parseMedia({
      src: path,
      reader: nodeReader,
      fields: { durationInSeconds: true },
      acknowledgeRemotionLicense: true,
    });
    if (r.durationInSeconds) return r.durationInSeconds;
  } catch {
    /* rơi về phép chia bên dưới */
  }
  return bytes / 16000;
}

/**
 * @returns {Promise<{file:string, seconds:number, cached:boolean}>}
 *   `file` là đường dẫn TƯƠNG ĐỐI so với `remotion/public/` — đúng thứ
 *   `staticFile()` của Remotion cần.
 */
/**
 * Tốc độ đọc mặc định.
 *
 * ⚠️ 1.15 chứ KHÔNG phải 0.9 như pipeline vấn đáp. Hai loại nội dung khác hẳn
 * nhau: video vấn đáp là nghe thủng thẳng vài phút, còn clip TikTok phải dồn —
 * bản dựng đầu ở 0.9 nghe buồn ngủ, và trên TikTok buồn ngủ nghĩa là bị lướt.
 *
 * 🔗 SỐ NÀY GẮN VỚI `TTS_CHARS_PER_SECOND` (`lib/video/script-spec.ts`, hiện
 * 13,59) — hằng số đó đo được ở ĐÚNG tốc độ 1.15. Đổi ở đây mà quên bên kia
 * thì cổng 1 lặng lẽ ước sai và đi cắt lời đọc cho một vấn đề không có thật.
 * Sửa thì sửa CẢ HAI trong cùng một lượt.
 */
export const CLIP_SPEED = '1.15';

/**
 * Các giọng Vbee ĐÃ THỬ CHẠY THẬT trên tài khoản này (không phải chép từ tài
 * liệu — đã gọi từng mã và giữ lại mã nào trả về audio).
 *
 * ⚠️ Mã giọng KHÔNG phải muốn đặt gì cũng được: đã thử 8 mã, chỉ 4 mã dưới đây
 * nhận. Thêm giọng mới thì phải gọi thử trước, đừng đoán theo quy luật đặt tên.
 *
 * Vì sao đổi giọng theo clip: 18 clip cùng một giọng nghe như một kênh đọc
 * máy. Giọng khác nhau làm dòng video trên trang cá nhân đỡ đơn điệu, và mỗi
 * giọng hợp một loại nội dung khác nhau.
 */
export const VOICES = [
  { code: 's_sg_male_thientam_ytstable_vc', ten: 'nam Sài Gòn · trầm ấm' },
  { code: 'hn_female_ngochuyen_full_48k-fhg', ten: 'nữ Hà Nội · rõ ràng' },
  { code: 'sg_female_thaotrinh_full_48k-fhg', ten: 'nữ Sài Gòn · mềm' },
  { code: 'hn_male_manhdung_news_48k-fhg', ten: 'nam Hà Nội · dứt khoát' },
];

/**
 * Chọn giọng theo KHOÁ (thường là tool_id) chứ không bốc ngẫu nhiên mỗi lượt:
 * cùng một clip dựng lại phải ra cùng giọng, nếu không thì mỗi lần render là
 * một giọng khác và không so được hai bản với nhau.
 */
export function pickVoice(key) {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  return VOICES[h % VOICES.length];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Nghỉ giữa hai lượt gọi TTS, và số lượt thử lại.
 *
 * 🔴 ĐO ĐƯỢC, KHÔNG PHẢI PHÒNG XA: clip demo công cụ chỉ tốn 7 lượt TTS nên
 * chưa bao giờ đụng trần. Clip dài đầu tiên (18 cảnh = 20 lượt) sinh trót lọt
 * 11 câu liên tiếp rồi hỏng ở câu 12, và cả 3 lượt thử lại đều hỏng tiếp với
 * cùng một lỗi — nhà cung cấp trả HTML thay vì JSON (`<!DOCTYPE …`), dấu hiệu
 * kinh điển của trang lỗi ở tầng cổng chứ không phải lỗi nội dung.
 *
 * Backoff cũ 1,5s→3s quá ngắn cho trần tính theo PHÚT. Hai thay đổi đi cùng
 * nhau: giãn nhịp để đỡ chạm trần ngay từ đầu, và chờ lâu hơn khi đã chạm.
 */
const TTS_GAP_MS = Number(process.env.CLIP_TTS_GAP_MS || 500);
const RETRIES = 4;

/**
 * Ngưỡng "ngắn tới mức không thể là giọng đọc của câu này".
 *
 * 🔑 Đo theo SỐ KÝ TỰ chứ không theo một hằng số: một câu 60 ký tự mà ra 0,3
 * giây thì chắc chắn hỏng, còn một câu 8 ký tự ra 0,3 giây thì bình thường.
 * 25 ký tự/giây là mức đọc nhanh gần ngưỡng vật lý của tiếng Việt (bản thật đo
 * được 11–18), nên ngưỡng này rộng — nó chỉ bắt ca hỏng THẬT, không kêu oan.
 */
function quaNgan(seconds, text) {
  return seconds < Math.max(0.3, text.trim().length / 25);
}

export async function ttsScene(text, { voice = '', speed = CLIP_SPEED } = {}) {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const key = hash(`${text}|${voice}|${speed}`);
  const rel = `audio/${key}.mp3`;
  const abs = join(AUDIO_DIR, `${key}.mp3`);

  if (existsSync(abs)) {
    const { statSync, unlinkSync } = await import('fs');
    const bytes = statSync(abs).size;
    const seconds = await measure(abs, bytes);
    // ⚠️ PHẢI KIỂM CẢ NHÁNH CACHE. Một file hỏng lọt vào cache thì mọi lượt
    // dựng SAU đều lấy nó ra dùng mà không hỏi lại nhà cung cấp — tức bug tự
    // đóng băng chính nó, và chạy lại bao nhiêu lần cũng ra kết quả hỏng y hệt.
    if (quaNgan(seconds, text)) {
      console.warn(`   ⚠️ bỏ file giọng hỏng trong cache (${seconds.toFixed(2)}s) — sinh lại`);
      unlinkSync(abs);
    } else {
      return { file: rel, seconds, cached: true };
    }
  }

  /**
   * Thử lại 3 lượt, giãn dần.
   *
   * 🔑 Vì sao cần: đo thật trên một lượt dựng 2 clip — TTS chớp một nhịp ở
   * clip đầu, `--require-voice` chặn đúng (thà trượt còn hơn ra clip câm), và
   * mất trắng một clip; chạy lại ngay sau đó thì xong. Trong lượt 18 clip thì
   * một nhịp chớp như thế là một clip mất mà không có lý do nào đáng.
   *
   * ⚠️ Thử lại ở ĐÂY chứ không ở tầng gọi: chỗ này biết chắc lỗi là của MỘT
   * câu, và mấy câu đã sinh xong đều đã nằm trong cache nên lượt sau không đọc
   * lại — thử lại cả clip thì tốn thêm một lượt render.
   */
  let lastErr = null;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
          ...(process.env.CLIP_TTS_SECRET ? { 'x-clip-secret': process.env.CLIP_TTS_SECRET } : {}),
        },
        body: JSON.stringify({ text, key, ...(voice ? { voice } : {}), speed }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.audio_url) {
        throw new Error(`TTS hỏng (${res.status}): ${JSON.stringify(data).slice(0, 200)}`);
      }

      /**
       * 🔴 LƯỢT TẢI FILE CŨNG PHẢI KIỂM — bản đầu tin nó vô điều kiện và đã
       * trả giá: hàm edge trả 200 kèm `audio_url` đàng hoàng, nhưng lượt tải
       * chính URL đó lại nhận về **một trang HTML báo lỗi** (nhà cung cấp chặn
       * theo nhịp). 150 byte `<html><head>…` được ghi thẳng vào file `.mp3`,
       * `parseMedia` đọc không ra nên rơi về phép chia kích thước và báo
       * **0,01 giây** — rồi được CACHE lại, nên chạy lại vẫn hỏng y nguyên.
       *
       * Hậu quả nếu lọt: cảnh đó câm, và vì thời lượng cảnh tính từ độ dài mp3
       * nên chữ chỉ loé qua vài khung hình. Không có lỗi nào bắn ra — đúng loại
       * hỏng mà `--require-voice` sinh ra để chặn, chỉ khác là nó chặn ở tầng
       * "có giọng hay không", còn ca này giọng CÓ mà rỗng ruột.
       */
      const dl = await fetch(data.audio_url);
      if (!dl.ok) throw new Error(`tải giọng hỏng (${dl.status}) từ ${data.audio_url}`);
      const bin = Buffer.from(await dl.arrayBuffer());
      const head = bin.slice(0, 5).toString('latin1').toLowerCase();
      if (bin.length < 2048 || head.startsWith('<html') || head.startsWith('<!doc')) {
        throw new Error(
          `giọng trả về không phải mp3 (${bin.length} byte, mở đầu "${head.trim()}")`
        );
      }
      writeFileSync(abs, bin);
      const seconds = await measure(abs, bin.length);
      if (quaNgan(seconds, text)) {
        const { unlinkSync } = await import('fs');
        unlinkSync(abs); // đừng để bản hỏng nằm lại cache cho lượt sau lấy ra
        throw new Error(`giọng đọc quá ngắn (${seconds.toFixed(2)}s cho ${text.length} ký tự)`);
      }
      // Nghỉ SAU MỖI LƯỢT SINH MỚI — xem `TTS_GAP_MS`. Không nghỉ ở nhánh
      // cache vì nhánh đó không chạm mạng.
      await sleep(TTS_GAP_MS);
      return { file: rel, seconds, cached: false };
    } catch (e) {
      lastErr = e;
      if (attempt < RETRIES) {
        // 🔑 HAI LOẠI HỎNG, CHỜ HAI KIỂU KHÁC HẲN.
        //
        // Nhà cung cấp trả HTML (`<!DOCTYPE`) thay vì JSON là trang lỗi ở tầng
        // CỔNG — chạm trần, không phải lỗi của câu này. Đo trên Actions
        // (32125541824): 19 câu trót lọt rồi 5 lượt liên tiếp cùng chữ ký đó,
        // và cả 4 lượt thử lại trong ~2,5 phút đều hỏng ⇒ backoff 4→16 giây là
        // quá ngắn cho thứ đang chặn.
        //
        // ⚠️ CHƯA BIẾT trần đó tính theo PHÚT hay theo tổng lượt/ký tự của tài
        // khoản. Chờ lâu chỉ cứu được ca thứ nhất. Lưới đỡ THẬT cho ca thứ hai
        // nằm ở chỗ khác: cache giọng đọc nay lưu kể cả khi job trượt
        // (`video-build.yml`), nên mỗi lượt chạy giữ được phần đã sinh.
        const congChan = /<!DOCTYPE|<html/i.test(e.message);
        const cho = congChan ? [30000, 75000, 150000][attempt - 1] || 150000 : attempt * 4000;
        console.warn(
          `   ⚠️ TTS lượt ${attempt} hỏng (${e.message.slice(0, 80)}) — ` +
            `${congChan ? `nghi chạm trần, chờ ${cho / 1000}s` : 'thử lại'}…`
        );
        await sleep(cho);
      }
    }
  }
  throw lastErr;
}
