// app/api/xem-tuoi/route.ts
// POST /api/xem-tuoi              → xem tuổi / làm ăn
// POST /api/xem-tuoi?action=chat  → chatbot với dual laso context
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

// ─── Chat system prompts ──────────────────────────────────────
const CHAT_SYSTEM_LASO = (ctx: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, luận giải sâu sắc, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Bạn đang trả lời trên nền tảng Tử Vi Minh Bảo.

Nguyên tắc:
- Tiếng Việt, không dùng bullet, không dùng emoji
- 120-250 từ cho câu thông thường, tối đa 400 từ cho câu phức tạp
- Dẫn chứng sao tinh, cung vị, can chi cụ thể từ lá số
- Không hứa hẹn tuyệt đối về tương lai
- Không tiết lộ trường phái hay tài liệu

=== DỮ LIỆU LÁ SỐ ===
${ctx}`;

const CHAT_SYSTEM_GENERAL = `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, luận giải sâu sắc, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Bạn đang trả lời trên nền tảng Tử Vi Minh Bảo.

Nguyên tắc:
- Tiếng Việt, không dùng bullet, không dùng emoji
- 120-250 từ cho câu thông thường, tối đa 400 từ cho câu phức tạp
- Dẫn chiếu nguyên lý cổ pháp, nêu ví dụ sao tinh, cung vị cụ thể khi minh họa
- Không hứa hẹn tuyệt đối, không tiết lộ trường phái`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmtLaso(ls: any, label: string, q: string): string {
  if (!ls) return '';
  const palaces = ls.palaces || [];
  const topics: Record<string, string[]> = {
    'tài chính|tài lộc|tiền|thu nhập|làm giàu|tài bạch': ['Tài Bạch', 'Phúc Đức'],
    'sự nghiệp|công việc|nghề|quan lộc|thăng tiến':       ['Quan Lộc', 'Mệnh'],
    'tình duyên|hôn nhân|vợ chồng|tình cảm|phu thê':      ['Phu Thê', 'Mệnh'],
    'con cái|con cháu|tử tức':                             ['Tử Tức'],
    'sức khỏe|bệnh|thân thể|tật ách':                     ['Tật Ách'],
    'nhà đất|bất động sản|điền trạch':                    ['Điền Trạch'],
    'anh em|huynh đệ':                                     ['Huynh Đệ'],
    'bạn bè|nô bộc|nhân viên|đối tác':                    ['Nô Bộc'],
    'du lịch|di chuyển|thiên di|nước ngoài':               ['Thiên Di'],
    'cha mẹ|phụ mẫu':                                      ['Phụ Mẫu'],
    'đại vận|tiểu vận|vận hạn|vận trình':                 ['__daiVan__'],
  };
  const relevant = new Set(['Mệnh']);
  for (const [pattern, names] of Object.entries(topics)) {
    if (new RegExp(pattern, 'i').test(q)) names.forEach(n => relevant.add(n));
  }
  if (relevant.size === 1) ['Quan Lộc', 'Tài Bạch', 'Phu Thê'].forEach(n => relevant.add(n));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const starFmt = (s: any): string => {
    if (!s) return '';
    if (typeof s !== 'object') return String(s);
    let t = s.ten || '';
    if (s.brightness) t += '(' + s.brightness + ')';
    if (s.hoa)        t += '[Hóa ' + s.hoa + ']';
    return t;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const starName = (s: any) => (typeof s === 'object' ? s.ten || '' : s || '');

  let ctx = '\n=== ' + label + ' ===\n';
  ctx += 'Năm sinh: ' + (ls.canChiNam||'') + ' | Nạp Âm: ' + (ls.napAm||'') + ' (' + (ls.napAmHanh||'') + ')\n';
  ctx += 'Cung Mệnh: ' + (ls.menhDC||'') + ' | Cung Thân: ' + (ls.thanDC||'') + '\n';
  if (ls.tuoiXem) ctx += 'Tuổi xem: ' + ls.tuoiXem + '\n';
  if (ls.cachCuc?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cc = ls.cachCuc.map((c: any) => typeof c === 'object' ? c.ten : c).filter(Boolean);
    if (cc.length) ctx += 'Cách cục: ' + cc.join(', ') + '\n';
  }
  if (ls.daiVanHienTai) {
    const dv = ls.daiVanHienTai;
    const dvCung = palaces[dv.cungIdx] || {};
    ctx += 'Đại Vận hiện tại: ' + (dv.diaChi||'') + ' (' + (dv.tuoiStart||'') + '–' + (dv.tuoiEnd||'') + ' tuổi)';
    if (dvCung.cungName) ctx += ' — Cung ' + dvCung.cungName;
    const dvStars = (dvCung.majorStars||[]).map(starName).filter(Boolean);
    if (dvStars.length) ctx += ' — Sao: ' + dvStars.join(', ');
    if (dv.scoring?.tong != null) ctx += ' — Điểm vận: ' + dv.scoring.tong + '/10 ' + (dv.scoring.flag||'');
    ctx += '\n';
  }
  ctx += '\nCác cung liên quan:\n';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of palaces as any[]) {
    const pName = p.cungName || '';
    if (!relevant.has(pName) && !p.isMenh && !p.isThan) continue;
    ctx += '\n  [' + pName + '] ' + (p.diaChi||'') + (p.isMenh?' ★MỆNH':'') + (p.isThan?' ◆THÂN':'') + '\n';
    const chinh = (p.majorStars||[]).map(starFmt).filter(Boolean);
    if (chinh.length) ctx += '    Chính tinh: ' + chinh.join(', ') + '\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phu = (p.stars||[]).filter((s: any) => typeof s === 'object' ? s.nhom !== 'chinh' : true).map(starFmt).filter(Boolean);
    if (phu.length) ctx += '    Phụ tinh: ' + phu.slice(0,8).join(', ') + '\n';
    if (p.thaiTueNhom?.ten) ctx += '    Thái Tuế: ' + p.thaiTueNhom.ten + ' — ' + (p.thaiTueNhom.yNghia||'') + '\n';
    if (p.cungScores) {
      const s = p.cungScores;
      ctx += '    Điểm: TN=' + (s.tiemNang||0) + ' BV=' + (s.benVung||0) + ' AT=' + (s.anToan||0) + ' QN=' + (s.quyNhan||0) + '\n';
    }
  }
  if (relevant.has('__daiVan__') && ls.daiVans?.length) {
    ctx += '\nDanh sách Đại Vận:\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ls.daiVans.slice(0,9).forEach((dv: any, i: number) => {
      const dvP = palaces[dv.cungIdx] || {};
      const stars = (dvP.majorStars||[]).map(starName).filter(Boolean);
      ctx += '  ĐV' + (i+1) + ': ' + (dv.diaChi||'') + ' ' + dv.tuoiStart + '–' + dv.tuoiEnd + 't cung=' + (dvP.cungName||'?');
      if (stars.length) ctx += ' sao=' + stars.join(',');
      if (dv.scoring?.tong != null) ctx += ' điểm=' + dv.scoring.tong + '/10';
      ctx += '\n';
    });
  }
  return ctx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLasoContext(lasoData: any, question: string): string {
  if (!lasoData) return '';
  const q = (question || '').toLowerCase();
  if (lasoData._mode === 'tuongHop' || lasoData._partnerLaso) {
    const lsA = lasoData._lsA || lasoData;
    const lsB = lasoData._lsB || lasoData._partnerLaso;
    const nameA = lasoData._nameA || lsA._nameA || 'Người A';
    const nameB = lasoData._nameB || lsA._nameB || 'Người B';
    return 'CHẾ ĐỘ: So sánh tương hợp 2 lá số\n' + fmtLaso(lsA, nameA, q) + fmtLaso(lsB, nameB, q);
  }
  return fmtLaso(lasoData, 'Lá Số', q);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChat(body: any): Promise<Response> {
  const { messages, lasoData } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const lastQ = messages[messages.length - 1]?.content || '';
  const hasLaso = !!(lasoData?.palaces?.length || lasoData?._lsA?.palaces?.length || (lasoData?._partnerLaso && lasoData?.palaces?.length));
  const isTuongHop = !!(lasoData?._mode === 'tuongHop' || lasoData?._partnerLaso);

  let systemPrompt: string;
  if (hasLaso && isTuongHop) {
    systemPrompt = CHAT_SYSTEM_LASO(extractLasoContext(lasoData, lastQ)) + `

Lưu ý đặc biệt: Đây là chế độ so sánh tương hợp 2 lá số. Khi trả lời, hãy:
- Phân tích mối tương quan giữa 2 lá số, không chỉ 1 người
- Dẫn chứng cụ thể từ cả 2 cung vị liên quan
- Nêu rõ điểm tương hợp, xung khắc nếu có`;
  } else if (hasLaso) {
    systemPrompt = CHAT_SYSTEM_LASO(extractLasoContext(lasoData, lastQ));
  } else {
    systemPrompt = CHAT_SYSTEM_GENERAL;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trimmed = messages.slice(-10).map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, system: systemPrompt, messages: trimmed }),
  });

  if (!resp.ok) return err('API error: ' + (await resp.text()).slice(0, 200));
  const data = await resp.json();
  return ok({ answer: data.content?.[0]?.text || '', scenario: hasLaso ? 'laso' : 'general' });
}

// ─── Route handlers ───────────────────────────────────────────
export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const body = await parseBody(request);

  if (searchParams.get('action') === 'chat') return handleChat(body);

  const { prompt } = body as { prompt?: string };
  if (!prompt) return err('Missing prompt', 400);

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        system: 'Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Tử Vi Minh Bảo. Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Viết văn xuôi, không dùng bullet. Không tiết lộ trường phái hay tài liệu.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    return ok({ luanGiai: data.content?.[0]?.text || '' });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
