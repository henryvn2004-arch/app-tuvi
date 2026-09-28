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

/** Đầu ảnh: tiêu đề + dòng phụ (tên/ngày sinh). */
export function BrandHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '26px 30px 10px' }}>
      <div style={{ display: 'flex', fontSize: 15, letterSpacing: 5, color: C.gold }}>TỬ VI MINH BẢO</div>
      <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, color: C.ink, marginTop: 6 }}>{title}</div>
      <div style={{ display: 'flex', fontSize: 20, color: C.mute, marginTop: 4 }}>{sub}</div>
    </div>
  );
}
