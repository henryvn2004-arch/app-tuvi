/* tools-shared/kinh-dich-doc.js — LUẬT ĐỌC QUẺ theo số hào động.
   Dùng CHUNG cho standalone /tools/kinh-dich.html + shell /app/kinh-dich.

   ⚠️ ĐÂY LÀ CHỖ DỄ NÓI SAI NHẤT CỦA CẢ TOOL. Cách hiểu phổ biến "gieo ra hào
   động nào thì đọc hào từ đó" CHỈ ĐÚNG khi có ĐÚNG MỘT hào động. Cổ pháp
   (考變占, Chu Hy — 《易學啟蒙》) rẽ theo SỐ hào động, và có ca không đọc hào nào,
   có ca đọc hào của quẻ BIẾN chứ không phải quẻ chính:

     0 động → chỉ lời quẻ của quẻ CHÍNH
     1 động → hào từ của chính hào đó (quẻ chính)
     2 động → hào từ cả hai (quẻ chính), hào TRÊN làm chủ
     3 động → lời quẻ của CẢ quẻ chính lẫn quẻ biến, quẻ chính làm chủ
     4 động → hào từ của 2 hào KHÔNG động, đọc trong quẻ BIẾN, hào DƯỚI làm chủ
     5 động → hào từ của hào KHÔNG động duy nhất, trong quẻ BIẾN
     6 động → Càn dùng "Dụng Cửu", Khôn dùng "Dụng Lục", còn lại lời quẻ quẻ BIẾN

   Trả về DANH SÁCH mục cần đọc chứ không trả sẵn chữ: phần chữ nằm ở
   `kinh-dich-hao.js`, tách ra để luật và dữ liệu không dính nhau.

   window.KinhDichDoc = { chonLoiDoc }
*/
(function (root) {
  /** @param {{yang:boolean,changing:boolean}[]} lines 6 hào, phần tử 0 = hào 1 (dưới) */
  function chonLoiDoc(lines) {
    const dong = [];
    const tinh = [];
    (lines || []).forEach((l, i) => (l && l.changing ? dong : tinh).push(i + 1));
    const n = dong.length;

    const li = (lines || []).map((l) => (l && l.yang ? '1' : '0')).join('');
    const thuanCan = li === '111111';
    const thuanKhon = li === '000000';

    // `chinh: true` = mục CHỦ, cái còn lại là phụ. Thứ tự trong mảng là thứ tự đọc.
    switch (n) {
      case 0:
        return {
          soHaoDong: 0,
          luat: 'Không có hào động — chỉ đọc lời quẻ của quẻ chính.',
          doc: [{ nguon: 'chinh', loai: 'que', hao: null, chinh: true }],
        };

      case 1:
        return {
          soHaoDong: 1,
          luat: `Một hào động — đọc hào từ của hào ${dong[0]}.`,
          doc: [{ nguon: 'chinh', loai: 'hao', hao: dong[0], chinh: true }],
        };

      case 2: {
        // Hào TRÊN làm chủ → sắp giảm dần.
        const [tren, duoi] = [...dong].sort((a, b) => b - a);
        return {
          soHaoDong: 2,
          luat: `Hai hào động — đọc cả hai hào từ, hào ${tren} (ở trên) làm chủ.`,
          doc: [
            { nguon: 'chinh', loai: 'hao', hao: tren, chinh: true },
            { nguon: 'chinh', loai: 'hao', hao: duoi, chinh: false },
          ],
        };
      }

      case 3:
        return {
          soHaoDong: 3,
          luat: 'Ba hào động — không đọc hào nào; đọc lời quẻ của cả quẻ chính lẫn quẻ biến, quẻ chính làm chủ.',
          doc: [
            { nguon: 'chinh', loai: 'que', hao: null, chinh: true },
            { nguon: 'bien', loai: 'que', hao: null, chinh: false },
          ],
        };

      case 4: {
        // Đọc trong quẻ BIẾN, và là 2 hào KHÔNG động. Hào DƯỚI làm chủ → sắp tăng.
        const [duoi, tren] = [...tinh].sort((a, b) => a - b);
        return {
          soHaoDong: 4,
          luat: `Bốn hào động — đọc hào từ của hai hào KHÔNG động (${duoi} và ${tren}) trong quẻ BIẾN, hào ${duoi} (ở dưới) làm chủ.`,
          doc: [
            { nguon: 'bien', loai: 'hao', hao: duoi, chinh: true },
            { nguon: 'bien', loai: 'hao', hao: tren, chinh: false },
          ],
        };
      }

      case 5:
        return {
          soHaoDong: 5,
          luat: `Năm hào động — đọc hào từ của hào KHÔNG động duy nhất (hào ${tinh[0]}) trong quẻ BIẾN.`,
          doc: [{ nguon: 'bien', loai: 'hao', hao: tinh[0], chinh: true }],
        };

      default:
        if (thuanCan)
          return {
            soHaoDong: 6,
            luat: 'Sáu hào động, quẻ thuần Càn — đọc lời "Dụng Cửu".',
            doc: [{ nguon: 'chinh', loai: 'dungCuu', hao: null, chinh: true }],
          };
        if (thuanKhon)
          return {
            soHaoDong: 6,
            luat: 'Sáu hào động, quẻ thuần Khôn — đọc lời "Dụng Lục".',
            doc: [{ nguon: 'chinh', loai: 'dungLuc', hao: null, chinh: true }],
          };
        return {
          soHaoDong: 6,
          luat: 'Sáu hào động — đọc lời quẻ của quẻ BIẾN.',
          doc: [{ nguon: 'bien', loai: 'que', hao: null, chinh: true }],
        };
    }
  }

  const API = { chonLoiDoc };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.KinhDichDoc = API;
})(typeof window !== 'undefined' ? window : globalThis);
