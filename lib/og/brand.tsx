// lib/og/brand.tsx
// Đồ dùng chung cho các ẢNH gửi qua kênh chat (/api/og/la-so-anh, duong-doi,
// radar-cung, van-12-thang): bảng màu + CHÂN ẢNH có QR Zalo OA.
//
// Ảnh này sẽ được khách chia sẻ tiếp — người nhận quét QR (trong Zalo: nhấn giữ
// ảnh → "Quét mã QR") là vào thẳng OA. `public/zalo-oa-qr.png` cắt từ mã QR
// chính thức của OA (giải ra zalo.me/4164696755090443744); có Zalo Mini App thì
// thay file đó là mọi ảnh đổi theo.

export const W = 1080;
export const H = 1350;
export const FOOT = 150;
const QR = 132;

export const C = {
  bg: '#FBF8F1',
  paper: '#FFFFFF',
  line: '#6B5B3E',
  grid: '#E3DACB',
  ink: '#1F1A14',
  mute: '#6E6250',
  gold: '#A8843A',
  red: '#B03A2E',
  green: '#1E6B3C',
  blue: '#1455A4',
  curVan: '#FFF4D9',
};

/** Vị trí [hàng, cột] của từng địa chi (0=Tý…11=Hợi) trên lưới lá số 4×4 — Tý hàng dưới, cột 3. */
export const LUOI_CHI: Record<number, [number, number]> = {
  5: [0, 0], 6: [0, 1], 7: [0, 2], 8: [0, 3],
  4: [1, 0], 9: [1, 3],
  3: [2, 0], 10: [2, 3],
  2: [3, 0], 1: [3, 1], 0: [3, 2], 11: [3, 3],
};

/** Màu ngũ hành — cùng bảng lá số Tử Vi (laso-chart.css, ảnh la-so-anh). */
export const HANH_COLOR: Record<string, string> = {
  Kim: '#7F8C8D',
  Mộc: '#27AE60',
  Thủy: '#1A1A1A',
  Hỏa: '#E74C3C',
  Thổ: '#B8860B',
};

/** "Minh Anh · Nam · 3/6/1998 DL · giờ Thìn" — dòng phụ chung của các ảnh theo ngày sinh. */
export function birthLine(b: { name?: string; gender?: string; day?: number; month?: number; year?: number; isLunar?: boolean; isLeapMonth?: boolean; hourBranch?: number | null }): string {
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const gio = b.hourBranch != null && b.hourBranch >= 0 ? ` · giờ ${CHI[b.hourBranch]}` : '';
  return `${b.name ? b.name + ' · ' : ''}${b.gender === 'nu' ? 'Nữ' : 'Nam'} · ${b.day}/${b.month}${b.isLunar && b.isLeapMonth ? ' nhuận' : ''}/${b.year} ${b.isLunar ? 'ÂL' : 'DL'}${gio}`;
}

/** "10:15 29/9/2026" giờ Việt Nam — mốc lập khóa/dựng bàn in lên ảnh theo thời điểm. */
export function gioVN(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`;
}

/** Chân ảnh: lời mời quét + dòng chú thích riêng của ảnh + QR Zalo OA. */
export function BrandFooter({ origin, note }: { origin: string; note?: string }) {
  const qrSrc = new URL('/zalo-oa-qr.png', origin).toString();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: FOOT,
        padding: '0 22px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: C.ink }}>
          Quét mã để xem lá số của bạn trên Zalo
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: C.mute, marginTop: 6 }}>
          Zalo: Tử Vi Minh Bảo · nhấn giữ ảnh → Quét mã QR
        </div>
        {note ? <div style={{ display: 'flex', fontSize: 14, color: C.mute, marginTop: 10 }}>{note}</div> : null}
        <div style={{ display: 'flex', fontSize: 15, fontWeight: 700, color: C.gold, marginTop: note ? 4 : 10 }}>
          TỬ VI MINH BẢO · tuviminhbao.com
        </div>
      </div>
      <img src={qrSrc} width={QR} height={QR} style={{ borderRadius: 8 }} />
    </div>
  );
}

/** Đầu ảnh: tiêu đề + dòng phụ (tên/ngày sinh) + dòng phụ thứ hai (nếu có). */
export function BrandHeader({ title, sub, sub2 }: { title: string; sub: string; sub2?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '26px 30px 10px' }}>
      <div style={{ display: 'flex', fontSize: 15, letterSpacing: 5, color: C.gold }}>TỬ VI MINH BẢO</div>
      <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, color: C.ink, marginTop: 6 }}>{title}</div>
      <div style={{ display: 'flex', fontSize: 20, color: C.mute, marginTop: 4 }}>{sub}</div>
      {sub2 ? <div style={{ display: 'flex', fontSize: 20, color: C.mute, marginTop: 2 }}>{sub2}</div> : null}
    </div>
  );
}
