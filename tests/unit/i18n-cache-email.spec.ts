import './_sb-env';
import { test, expect } from '@playwright/test';
import * as mod from '../../lib/portraits/cache';
import { localizeSiteLinks, isLocalizablePath } from '../../lib/email/links';

// i18n W18 — (a) cache `portrait_cache` tách theo ngôn ngữ mà KHÔNG đổi khoá sở hữu;
// (c) link trong thư trỏ `/<locale>/…` theo người nhận.
// Thuần node: `fetch` giả thay Supabase, không gọi mạng.

// ── (a) portrait_cache ────────────────────────────────────────────────────────────────────
type Call = { url: string; method: string; body?: Record<string, unknown> };

/** Supabase giả: `rows` = các dòng portrait_cache theo laso_key, `owned` = laso_key trong bảng lịch sử. */
function fakeSupabase(rows: Record<string, Record<string, unknown>>, owned: string[]) {
  const calls: Call[] = [];
  const fake = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method, body });
    const key = decodeURIComponent(/laso_key=eq\.([^&]+)/.exec(url)?.[1] || '');
    if (method === 'GET' && url.includes('/portrait_cache')) {
      const r = rows[key];
      if (!r) return new Response('[]');
      return new Response(JSON.stringify([url.includes('select=payload') ? { payload: r } : { laso_key: key }]));
    }
    if (method === 'GET') return new Response(JSON.stringify(owned.includes(key) ? [{ id: 1 }] : []));
    return new Response('', { status: 201 });
  };
  return { calls, fake };
}

test.describe('portrait_cache theo ngôn ngữ (W18)', () => {
  const BIRTH = { day: 3, month: 6, year: 1998, hourBranch: 1, gender: 'nam' as const, isLunar: false };
  const realFetch = globalThis.fetch;
  test.afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('cacheRowKey: vi giữ NGUYÊN khoá, ngôn ngữ khác thêm hậu tố', () => {
    const key = mod.lasoKey(BIRTH);
    expect(mod.cacheRowKey(key, 'vi')).toBe(key);
    expect(mod.cacheRowKey(key, 'ja')).toBe(`${key}|loc:ja`);
  });

  test('người đã trả ở vi mở ở ja: miễn phí, không phục vụ bản Việt, khoá sở hữu không đổi', async () => {
    const key = mod.lasoKey(BIRTH);
    const { calls, fake } = fakeSupabase({ [key]: { payload: { a: 1, _shape: 1 }, row: null } }, [key]);
    globalThis.fetch = fake as typeof fetch;
    const look = await mod.cacheFor('chan-dung-vo-chong', 1).lookup('main', 'u1', BIRTH, 'ja');
    expect(look.key).toBe(key); // khoá SỞ HỮU — ghi lịch sử/`userOwnsLaso` dùng khoá này
    expect(look.cached).toBeNull(); // không trả chữ Việt cho khách Nhật
    expect(look.coDong).toBe(true);
    expect(look.owns).toBe(true);
    expect(look.free).toBe(true);
    // userOwnsLaso hỏi bảng lịch sử bằng khoá GỐC, không bằng khoá có hậu tố.
    const own = calls.find((c) => c.url.includes('/spouse_portraits'))!;
    expect(own.url).toContain(`laso_key=eq.${key}&`);
  });

  test('người CHƯA trả, chỉ có bản vi: không miễn phí', async () => {
    const key = mod.lasoKey(BIRTH);
    const { fake } = fakeSupabase({ [key]: { payload: { a: 1 }, row: null } }, []);
    globalThis.fetch = fake as typeof fetch;
    const look = await mod.cacheFor('chan-dung-vo-chong', 1).lookup('main', 'u2', BIRTH, 'ja');
    expect(look.free).toBe(false);
  });

  test('chưa có dòng nào: không miễn phí dù đã sở hữu (giữ luật cũ)', async () => {
    const key = mod.lasoKey(BIRTH);
    const { fake } = fakeSupabase({}, [key]);
    globalThis.fetch = fake as typeof fetch;
    const look = await mod.cacheFor('chan-dung-vo-chong', 1).lookup('main', 'u1', BIRTH, 'ja');
    expect(look.free).toBe(false);
  });

  test('có bản ja: phục vụ đúng bản ja', async () => {
    const key = mod.lasoKey(BIRTH);
    const { fake } = fakeSupabase(
      { [key]: { payload: { lang: 'vi' } }, [`${key}|loc:ja`]: { payload: { lang: 'ja' } } },
      [],
    );
    globalThis.fetch = fake as typeof fetch;
    const r = await mod.cacheFor('nguoi-khac', 1).get('main', key, 'ja');
    expect(r.cached?.payload.lang).toBe('ja');
  });

  test('vi: KHÔNG hỏi thêm dòng gốc, đọc đúng khoá cũ (một lượt GET portrait_cache)', async () => {
    const key = mod.lasoKey(BIRTH);
    const { calls, fake } = fakeSupabase({ [key]: { payload: { lang: 'vi' } } }, []);
    globalThis.fetch = fake as typeof fetch;
    const r = await mod.cacheFor('nguoi-khac', 1).get('main', key, 'vi');
    expect(r.cached?.payload.lang).toBe('vi');
    expect(r.coDong).toBe(true);
    expect(calls.filter((c) => c.url.includes('/portrait_cache')).length).toBe(1);
  });

  test('put/touch: ghi vào dòng của ĐÚNG ngôn ngữ', async () => {
    const key = mod.lasoKey(BIRTH);
    const { calls, fake } = fakeSupabase({}, []);
    globalThis.fetch = fake as typeof fetch;
    const c = mod.cacheFor('day-con', 2);
    c.put('main', key, { payload: { x: 1 }, row: null }, 'u1', 'ko');
    c.touch('main', key, 'ko');
    c.put('main', key, { payload: { x: 1 }, row: null }, 'u1', 'vi');
    await new Promise((r) => setTimeout(r, 20));
    const writes = calls.filter((c) => c.method === 'POST' && c.url.endsWith('/portrait_cache'));
    expect(writes.map((w) => w.body?.laso_key).sort()).toEqual([key, `${key}|loc:ko`].sort());
    const touch = calls.find((c) => c.url.includes('portrait_cache_touch'))!;
    expect(touch.body?.p_laso_key).toBe(`${key}|loc:ko`);
  });
});

// ── (c) link trong email ──────────────────────────────────────────────────────────────────
test.describe('link email theo ngôn ngữ người nhận (W18)', () => {
  const HTML =
    '<a href="https://tuviminhbao.com/app/luan-giai?x=1#a">a</a>' +
    "<a href='https://www.tuviminhbao.com'>b</a>" +
    '<a href="https://tuviminhbao.com/ja/app">c</a>' +
    '<a href="https://tuviminhbao.com/api/email/unsubscribe?email=a&sig=b">d</a>' +
    '<img src="https://tuviminhbao.com/seal.webp">' +
    '<a href="https://tuviminhbao.com/chinh-sach-bao-mat.html">e</a>' +
    '<a href="https://tuviminhbao.com/files/mau.pdf">f</a>' +
    '<a href="https://example.com/app">g</a>';

  test('vi / thiếu locale: trả NGUYÊN chuỗi', () => {
    expect(localizeSiteLinks(HTML, 'vi')).toBe(HTML);
    expect(localizeSiteLinks(HTML, undefined)).toBe(HTML);
  });

  test('ja: trang site → /ja/…, giữ query/hash; bỏ qua api, file tĩnh, link đã có tiền tố, site ngoài', () => {
    const out = localizeSiteLinks(HTML, 'ja');
    expect(out).toContain('href="https://tuviminhbao.com/ja/app/luan-giai?x=1#a"');
    expect(out).toContain("href='https://www.tuviminhbao.com/ja'");
    expect(out).toContain('href="https://tuviminhbao.com/ja/app"');
    expect(out).not.toContain('/ja/ja/');
    expect(out).toContain('href="https://tuviminhbao.com/api/email/unsubscribe?email=a&sig=b"');
    expect(out).toContain('src="https://tuviminhbao.com/seal.webp"');
    expect(out).toContain('href="https://tuviminhbao.com/ja/chinh-sach-bao-mat.html"');
    expect(out).toContain('href="https://tuviminhbao.com/files/mau.pdf"');
    expect(out).toContain('href="https://example.com/app"');
  });

  test('isLocalizablePath', () => {
    expect(isLocalizablePath('/app')).toBe(true);
    expect(isLocalizablePath('/zh-tw/app')).toBe(false);
    expect(isLocalizablePath('/_next/static/x.js')).toBe(false);
  });
});
