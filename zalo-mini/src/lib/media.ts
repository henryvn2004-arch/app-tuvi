// Ảnh & chia sẻ qua API native của Zalo (ngoài Zalo — dev/test — lùi về trình duyệt).
//   pickImage   chụp/chọn ảnh (tướng mặt, chỉ tay, phong thuỷ…) → base64 JPEG gửi Hỏi Thầy
//   lasoImage   link ảnh lưới 12 cung đã ký (/api/v1/laso-image)
//   saveImage   lưu ảnh về máy · shareImage / shareApp  gửi vào chat Zalo
import { chooseImage, openShareSheet, saveImageToGallery } from 'zmp-sdk';
import { api } from './session';
import { insideZalo } from './storage';
import type { BirthParams } from './birth';

export interface PickedImage {
  /** base64 KHÔNG kèm tiền tố data: — đúng shape ChatImage của contract */
  data: string;
  mediaType: 'image/jpeg';
  /** data URL để xem trước */
  preview: string;
}

// Ảnh điện thoại 3–12 MP: thu về cạnh dài 1280px trước khi gửi — đủ cho đọc
// tướng/nhà cửa, nhẹ hơn hàng chục lần, không vướng trần body của hàm Vercel.
const MAX_SIDE = 1280;

function fileFromBrowser(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () =>
      input.files?.[0] ? resolve(input.files[0]) : reject(new Error('Chưa chọn ảnh'));
    input.click();
  });
}

async function toJpeg(blob: Blob): Promise<PickedImage> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không đọc được ảnh'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL('image/jpeg', 0.85);
    return { data: preview.split(',')[1]!, mediaType: 'image/jpeg', preview };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function pickImage(): Promise<PickedImage> {
  if (!insideZalo()) return toJpeg(await fileFromBrowser());
  const { filePaths } = await chooseImage({
    count: 1,
    sourceType: ['camera', 'album'],
    cameraType: 'back',
  });
  if (!filePaths[0]) throw new Error('Chưa chọn ảnh');
  return toJpeg(await (await fetch(filePaths[0])).blob());
}

export async function lasoImage(birth: BirthParams): Promise<string> {
  return (
    await api<{ url: string }>('/api/v1/laso-image', {
      method: 'POST',
      body: JSON.stringify({ birth }),
    })
  ).url;
}

export async function saveImage(url: string): Promise<void> {
  if (insideZalo()) await saveImageToGallery({ imageUrl: url });
  else window.open(url, '_blank');
}

/** false ⇒ đang ngoài Zalo, không có bảng chia sẻ (nơi gọi báo cho người dùng). */
export async function shareImage(url: string): Promise<boolean> {
  if (!insideZalo()) return false;
  await openShareSheet({ type: 'image', data: { imageUrl: url } });
  return true;
}

const THUMB = 'https://www.tuviminhbao.com/seal.webp';

export async function shareApp(title: string, description: string): Promise<boolean> {
  if (!insideZalo()) return false;
  await openShareSheet({ type: 'zmp_deep_link', data: { title, description, thumbnail: THUMB } });
  return true;
}
