// app/api/lasotuvi/route.ts
// Converted from api/lasotuvi.js — same logic, Next.js Route Handler format
// POST /api/lasotuvi              → luận giải 24 phần
// POST /api/lasotuvi?action=chat  → chatbot
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT ||
  'Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Tử Vi Minh Bảo. Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Nguyên tắc: tam phương tứ chính, không đoán đơn sao. Không tiết lộ tài liệu hay trường phái. Quan trọng: dữ liệu sao, cách cục, luận đoán đã được tính sẵn trong [CÁCH CỤC], [Ý NGHĨA], [LUẬN ĐOÁN] — không mô tả lại, không liệt kê lại, chỉ diễn giải và kết nối ý nghĩa thành văn xuôi súc tích.';

const CUNG_BY_PHAN: Record<number, string> = {
  2:'Mệnh', 3:'Phụ Mẫu', 4:'Phúc Đức', 5:'Điền Trạch',
  6:'Quan Lộc', 7:'Nô Bộc', 8:'Thiên Di', 9:'Tật Ách',
  10:'Tài Bạch', 11:'Tử Tức', 12:'Phu Thê', 13:'Huynh Đệ',
};

const CUNG_DESC: Record<string, string> = {
  'Mệnh': '',
  'Phụ Mẫu': 'Xem cung Phụ Mẫu để biết sự thọ yểu, giàu nghèo của cha mẹ và sự hòa hợp hay xung khắc giữa cha mẹ và con.',
  'Phúc Đức': 'Xem cung Phúc Đức để biết sự thọ yểu, thịnh suy của họ hàng và âm phần mình chịu ảnh hưởng. Cung Phúc Đức chi phối tất cả 11 cung còn lại.',
  'Điền Trạch': 'Xem cung Điền Trạch để biết nhà cửa, bất động sản, hòa khí gia đình, khả năng tích lũy tài sản.',
  'Quan Lộc': 'Xem cung Quan Lộc để biết công danh, sự nghiệp và khả năng chuyên môn.',
  'Nô Bộc': 'Xem cung Nô Bộc để biết người giúp việc, bạn bè và những điều liên quan đến thê thiếp.',
  'Thiên Di': 'Xem cung Thiên Di để biết giao thiệp bên ngoài và may rủi khi rời nhà. Cung này xung chiếu cung Mệnh — cần xét rất cẩn thận.',
  'Tật Ách': 'Xem cung Tật Ách để biết tì vết trong người, bệnh tật và tai ương có thể xảy đến trong cả một đời.',
  'Tài Bạch': 'Xem cung Tài Bạch để biết sự giàu nghèo, sinh kế, khả năng và cách kiếm tiền, tiêu tiền.',
  'Tử Tức': 'Xem cung Tử Tức để biết con cái và quan hệ con cái với mình.',
  'Phu Thê': 'Xem cung Phu Thê để biết những điều liên quan đến vợ chồng, lập gia đình và hạnh phúc cả đời.',
  'Huynh Đệ': 'Xem cung Huynh Đệ để biết anh chị em.',
};

// ─── Chat handler ──────────────────────────────────────────────
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
function extractLasoContext(lasoData: any, question: string): string {
  if (!lasoData) return '';
  const q = (question || '').toLowerCase();
  const palaces = lasoData.palaces || [];

  const topics: Record<string, string[]> = {
    'tài chính|tài lộc|tiền|thu nhập|làm giàu|tài bạch': ['Tài Bạch', 'Phúc Đức'],
    'sự nghiệp|công việc|nghề|quan lộc|thăng tiến':       ['Quan Lộc', 'Mệnh'],
    'tình duyên|hôn nhân|vợ chồng|tình cảm|phu thê':      ['Phu Thê', 'Mệnh'],
    'con cái|con cháu|tử tức':                             ['Tử Tức'],
    'sức khỏe|bệnh|thân thể|tật ách':                     ['Tật Ách'],
    'nhà đất|bất động sản|điền trạch':                    ['Điền Trạch'],
    'anh em|huynh đệ':                                     ['Huynh Đệ'],
    'bạn bè|nô bộc|nhân viên':                            ['Nô Bộc'],
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
  const starName = (s: any): string => (typeof s === 'object' ? s.ten || '' : s || '');

  let ctx = '';
  if (lasoData.canChiNam) ctx += 'Can Chi: ' + lasoData.canChiNam + '\n';
  if (lasoData.napAm)     ctx += 'Nạp Âm: ' + lasoData.napAm + ' (' + (lasoData.napAmHanh || '') + ')\n';
  if (lasoData.menhDC)    ctx += 'Mệnh DC: ' + lasoData.menhDC + '\n';
  if (lasoData.thanDC)    ctx += 'Thân DC: ' + lasoData.thanDC + '\n';
  if (lasoData.tuoiXem)   ctx += 'Tuổi xem: ' + lasoData.tuoiXem + '\n';

  if (lasoData.cachCuc?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cc = lasoData.cachCuc.map((c: any) => typeof c === 'object' ? c.ten : c).filter(Boolean);
    if (cc.length) ctx += 'Cách cục: ' + cc.join(', ') + '\n';
  }

  if (lasoData.daiVanHienTai) {
    const dv = lasoData.daiVanHienTai;
    const dvCung = palaces[dv.cungIdx] || {};
    ctx += '\nĐại Vận hiện tại: ' + (dv.diaChi||'') + ' (' + (dv.tuoiStart||'') + '–' + (dv.tuoiEnd||'') + ' tuổi)';
    if (dvCung.cungName) ctx += ' — Cung ' + dvCung.cungName;
    const dvStars = (dvCung.majorStars||[]).map(starName).filter(Boolean);
    if (dvStars.length) ctx += ' — Sao: ' + dvStars.join(', ');
    if (dv.scoring?.tong != null) ctx += ' — Điểm vận: ' + dv.scoring.tong + '/10 ' + (dv.scoring.flag||'');
    ctx += '\n';
  }

  ctx += '\n=== CUNG LIÊN QUAN ===\n';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of palaces as any[]) {
    const pName = p.cungName || '';
    if (!relevant.has(pName) && !p.isMenh && !p.isThan) continue;
    ctx += '\nCung ' + pName + ' (' + (p.diaChi||'') + ')' + (p.isMenh?' ★MỆNH':'') + (p.isThan?' ◆THÂN':'') + ':\n';
    const chinh = (p.majorStars||[]).map(starFmt).filter(Boolean);
    if (chinh.length) ctx += '  Chính tinh: ' + chinh.join(', ') + '\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phu = (p.stars||[]).filter((s: any) => typeof s === 'object' ? s.nhom !== 'chinh' : true).map(starFmt).filter(Boolean);
    if (phu.length) ctx += '  Phụ tinh: ' + phu.slice(0,8).join(', ') + '\n';
    if (p.thaiTueNhom?.ten) ctx += '  Thái Tuế: ' + p.thaiTueNhom.ten + ' — ' + (p.thaiTueNhom.yNghia||'') + '\n';
    if (p.cungScores) {
      const s = p.cungScores;
      ctx += '  Điểm: TN=' + (s.tiemNang||0) + ' BV=' + (s.benVung||0) + ' AT=' + (s.anToan||0) + ' QN=' + (s.quyNhan||0) + '\n';
    }
  }

  if (relevant.has('__daiVan__') && lasoData.daiVans?.length) {
    ctx += '\n=== ĐẠI VẬN ===\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lasoData.daiVans.slice(0, 9).forEach((dv: any, i: number) => {
      const dvP = palaces[dv.cungIdx] || {};
      const stars = (dvP.majorStars||[]).map(starName).filter(Boolean);
      ctx += 'ĐV' + (i+1) + ': ' + (dv.diaChi||'') + ' (' + dv.tuoiStart + '–' + dv.tuoiEnd + 't) cung=' + (dvP.cungName||'?');
      if (stars.length) ctx += ' sao=' + stars.join(',');
      if (dv.scoring?.tong != null) ctx += ' điểm=' + dv.scoring.tong + '/10';
      ctx += '\n';
    });
  }

  return ctx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChat(body: any): Promise<Response> {
  const { messages, lasoData } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const lastQ = messages[messages.length - 1]?.content || '';
  const hasLaso = !!(lasoData?.palaces?.length || lasoData?._lsA?.palaces?.length);
  const systemPrompt = hasLaso
    ? CHAT_SYSTEM_LASO(extractLasoContext(lasoData, lastQ))
    : CHAT_SYSTEM_GENERAL;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trimmed = messages.slice(-10).map((m: any) => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, system: systemPrompt, messages: trimmed }),
  });

  if (!resp.ok) return err('API error: ' + (await resp.text()).slice(0, 200));
  const data = await resp.json();
  return ok({ answer: data.content?.[0]?.text || '', scenario: hasLaso ? 'laso' : 'general' });
}

// ─── Luận giải prompt builder (same as original) ───────────────
function buildPrompt(phan: number, laSoText: string, docs?: string): string {
  function trimLaSo(text: string, phan: number): string {
    if (!text) return text;
    const lines = text.split('\n');
    const dvIdx   = lines.findIndex(l => l.includes('=== 9 ĐẠI VẬN ==='));
    const ccIdx   = lines.findIndex(l => l.includes('=== CÁCH CỤC & NHẬN ĐỊNH'));
    const cungIdx = lines.findIndex(l => l.includes('=== 12 CUNG ==='));
    const headerLines = cungIdx > 0 ? lines.slice(0, cungIdx) : lines.slice(0, 8);

    if (phan <= 2) {
      const end = dvIdx > 0 ? dvIdx : (ccIdx > 0 ? ccIdx : lines.length);
      return lines.slice(0, end).join('\n');
    }
    if (phan >= 3 && phan <= 13) {
      const CUNG_NAME = ['','','Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc',
        'Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'][phan];
      const result = [...headerLines, ''];
      const cutEnd = dvIdx > 0 ? dvIdx : (ccIdx > 0 ? ccIdx : lines.length);
      const cungLines = lines.slice(cungIdx > 0 ? cungIdx : 0, cutEnd);
      const startI = cungLines.findIndex(l => l.startsWith(`[${CUNG_NAME}]`));
      if (startI >= 0) {
        const endI = cungLines.findIndex((l, i) => i > startI && l.startsWith('[') && !l.startsWith('[CÁCH') && !l.startsWith('[Ý') && !l.startsWith('[LUẬN'));
        const block = endI > 0 ? cungLines.slice(startI, endI) : cungLines.slice(startI, startI + 25);
        return result.concat(block).join('\n');
      }
      return lines.slice(0, cutEnd).join('\n');
    }
    if (phan === 14 || phan === 24) {
      if (dvIdx > 0) {
        const dvEnd = ccIdx > dvIdx ? ccIdx : lines.length;
        return headerLines.join('\n') + '\n' + lines.slice(dvIdx, dvEnd).join('\n');
      }
    }
    if (phan >= 15 && phan <= 23) {
      const dvNum = phan - 14;
      if (dvIdx > 0) {
        const dvEnd = ccIdx > dvIdx ? ccIdx : lines.length;
        const dvLines = lines.slice(dvIdx, dvEnd);
        const target = 'ĐV' + dvNum + ':';
        const startI = dvLines.findIndex(l => l.startsWith(target));
        if (startI >= 0) {
          const endI = dvLines.findIndex((l, i) => i > startI && /^ĐV\d+:/.test(l));
          const dvBlock = endI > 0 ? dvLines.slice(startI, endI) : dvLines.slice(startI, startI + 20);
          return headerLines.join('\n') + '\n\n' + dvBlock.join('\n');
        }
      }
    }
    return text;
  }

  const trimmedLaSo = trimLaSo(laSoText, phan);
  const ctx = '=== LÁ SỐ ===\n' + trimmedLaSo + (docs ? '\n\n=== TÀI LIỆU ===\n' + docs : '');

  if (phan === 1) return ctx + '\n\nPHẦN 1 — TỔNG QUAN LÁ SỐ (200-250 từ)\nViết văn xuôi, không dùng bullet. KHÔNG đề cập đến đại vận trong phần này.\n1. Bản mệnh & khí chất: cục, thuận/nghịch lý, vị trí cung Mệnh trong vòng Tràng Sinh, vị trí trong vòng Lộc Tồn, nhóm Thái Tuế Mệnh vs Thân\n2. Cung Mệnh: dựa trên [CÁCH CỤC] và [Ý NGHĨA] — diễn giải, không liệt kê lại\n3. Một câu nhận định tổng: điểm mạnh/yếu nổi bật nhất';
  if (phan === 2) return ctx + '\n\nPHẦN 2 — CUNG MỆNH (200-250 từ)\n' + (CUNG_DESC['Mệnh']||'') + '\nDựa trên [CÁCH CỤC] và [Ý NGHĨA] đã có — viết văn xuôi súc tích: bản chất chính tinh, cách cục nổi bật, điểm mạnh/yếu, khí chất và tác động thực tế lên cuộc đời. Không liệt kê lại data.';
  if (phan >= 3 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan] || '';
    return ctx + '\n\nPHẦN ' + phan + ' — CUNG ' + cung.toUpperCase() + ' (80-120 từ)\n' + (CUNG_DESC[cung]||'') + '\nDựa trên [CÁCH CỤC] và [Ý NGHĨA] đã có — viết 2-3 đoạn văn xuôi súc tích. Không liệt kê lại data.';
  }
  if (phan === 14) return ctx + '\n\nPHẦN 14 — TỔNG QUAN CÁC ĐẠI VẬN\n\nDựa vào phần === 9 ĐẠI VẬN ===, tính điểm TẤT CẢ 9 đại vận:\n- TT (Thiên Thời) 0-5 - ĐL (Địa Lợi) 0-1 - NH (Nhân Hòa) 0-4\nCông thức: Tổng = NH + (NH/4)×ĐL + (NH/4)×TT (max 10)\n\nBảng tổng hợp ĐV1 đến ĐV9:\n| ĐV | Tuổi | Cung | TT | ĐL | NH | Tổng | Flag |\n\nJSON chart (BẮT BUỘC, đủ 9 điểm):\n```chartdata\n{"labels":["ĐV1 x-y","ĐV2 x-y","ĐV3 x-y","ĐV4 x-y","ĐV5 x-y","ĐV6 x-y","ĐV7 x-y","ĐV8 x-y","ĐV9 x-y"],"scores":[s1,s2,s3,s4,s5,s6,s7,s8,s9]}\n```\nNhận xét ngắn (100-150 từ): giai đoạn đẹp nhất, khó khăn nhất, xu hướng tổng thể.';
  if (phan >= 15 && phan <= 23) return ctx + '\n\nPHẦN ' + phan + ' — ĐẠI VẬN ' + (phan-14) + ' (100-130 từ)\nTìm dòng "ĐV' + (phan-14) + ':" trong === 9 ĐẠI VẬN ===. Dựa trên [LUẬN ĐOÁN] và [CẢNH BÁO] đã có — viết văn xuôi súc tích. Không liệt kê lại data.';
  if (phan === 24) return ctx + '\n\nPHẦN 24 — TIỂU VẬN NĂM XEM (150-200 từ)\nViết văn xuôi, cụ thể: tính chất năm, xu hướng tốt/xấu, 1-2 cơ hội và 1-2 điểm cần cẩn thận. Không giải thích lý thuyết.';
  return ctx + '\nPhần ' + phan + ': Luận giải theo lá số.';
}

// ─── Route handlers ───────────────────────────────────────────
export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body = await parseBody(request);

  if (action === 'chat') return handleChat(body);

  const { laSoText, phan, docs } = body as { laSoText?: string; phan?: number; docs?: string };
  if (!laSoText || !phan) return err('Thiếu dữ liệu', 400);

  let prompt: string;
  try { prompt = buildPrompt(Number(phan), laSoText, docs); }
  catch (e: unknown) { return err('buildPrompt error: ' + (e as Error).message); }

  try {
    const model = (phan === 1 || phan === 14) ? 'claude-sonnet-4-5' : 'claude-haiku-4-5-20251001';
    const maxTok = phan === 1 ? 2000 : phan === 14 ? 3000 : phan === 24 ? 1200
      : (phan >= 2 && phan <= 13) ? 1000 : (phan >= 15 && phan <= 23) ? 1100 : 1000;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model, max_tokens: maxTok,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }] }],
      }),
    });

    if (!resp.ok) return err('API error: ' + (await resp.text()).slice(0, 200));
    const data = await resp.json();
    if (data.error) return err(data.error.message);

    const text: string = data.content?.[0]?.text || '';
    let chartData = null;
    const chartMatch = text.match(/```chartdata\s*([\s\S]*?)```/);
    if (chartMatch) { try { chartData = JSON.parse(chartMatch[1].trim()); } catch { /* ignore */ } }
    const luanGiai = text.replace(/```chartdata[\s\S]*?```/, '').trim();
    return ok({ luanGiai, chartData, phan });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
