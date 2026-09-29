// Lưu cục bộ: nativeStorage của Zalo (đồng bộ, sống qua các lần mở app). Ngoài
// Zalo (trình duyệt khi dev/test) API này ném -1404 ⇒ lùi về localStorage.
// Hỏng cả hai thì coi như trống — không bao giờ ném ra ngoài.
import { nativeStorage } from 'zmp-sdk';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
let picked: Store | null = null;

function store(): Store {
  if (!picked) {
    try {
      nativeStorage.setItem('tvmb.probe', '1'); // getItem không ném ngoài Zalo, setItem mới ném
      picked = nativeStorage;
    } catch {
      picked = window.localStorage;
    }
  }
  return picked;
}

/** Đang chạy trong Zalo (API native có thật) hay trình duyệt thường (dev/test). */
export const insideZalo = (): boolean => store() !== window.localStorage;

export function load<T>(key: string): T | null {
  try {
    const s = store().getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): void {
  try {
    if (value == null) store().removeItem(key);
    else store().setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[storage] ghi hỏng', key, e);
  }
}
