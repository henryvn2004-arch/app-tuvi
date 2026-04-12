// app/api/lasotuvi/route.ts
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

// ─── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là nhà luận giải Tử Vi Đẩu Số, phụng sự trang Tử Vi Minh Bảo.

VĂN PHONG: Trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Văn xuôi liên tục, không dùng bullet, không dùng emoji, không dùng tiêu đề con. Tiếng Việt chuẩn mực.

CÁCH DIỄN GIẢI:
Viết như một người bình thường đang giải thích cho bạn mình.
Hạn chế dùng thuật ngữ chuyên môn (tử vi, học thuật, v.v.), chỉ dùng ngắn gọn khi cần.
Không văn vẻ, không sáo rỗng. Giữ giọng trung lập, hơi thẳng, không tâng bốc.
Tập trung vào: "điều này nghĩa là gì với người đọc".
Chỉ giữ lại những ý có giá trị thực tế.
Có phân tích hệ quả tâm lý/hành vi nếu hợp lý.
Có gợi ý nhẹ nếu cần, nhưng không dạy đời.
Không tiết lộ tài liệu, trường phái, hay tên hệ thống.

NGUYÊN TẮC LUẬN GIẢI CỔ PHÁP:
1. Tam phương tứ chính: Luôn xét cung đang luận trong mối quan hệ với cung tam hợp và cung xung chiếu.
2. Không đoán đơn sao: Phải xét sao hội — tổ hợp chính tinh + phụ tinh + cách cục.
3. Cách cục ưu tiên: [CÁCH CỤC] và [Ý NGHĨA] là nền tảng — không mô tả lại, chỉ diễn giải sâu hơn.
4. Sao hóa: Tứ Hóa thay đổi căn bản tính chất cung — phải đề cập nếu có.
5. Vòng Tràng Sinh và Lộc Tồn: Vị trí cung ảnh hưởng lực của sao.

DỮ LIỆU CÓ SẴN: [CÁCH CỤC], [Ý NGHĨA], [LUẬN ĐOÁN], [CẢNH BÁO], scoring, tam hợp/xung chiếu đã tính sẵn. Nhiệm vụ là diễn giải thành văn xuôi sâu sắc.

CÁC LƯU Ý KHI LUẬN GIẢI:
- Thuận/nghịch: Xem các yếu tố sinh có "đồng pha" không. Càng đồng nhất càng dễ thuận, lệch nhiều dễ mâu thuẫn.
- Tương sinh/tương khắc: Các yếu tố có hỗ trợ nhau hay triệt tiêu nhau. Chuỗi sinh liên tục là tốt nhất.
- Tương hợp/tương phá: Có hợp nhau thì dễ thuận, phá nhau thì dễ xung đột ngầm.
- Mệnh vs Cục: Mệnh hợp với "hệ" của lá số thì dễ phát triển. Mệnh khắc Cục thì bị giảm lực.
- Năm sinh vs cung Mệnh: Đồng tính (âm/dương) thì thuận, lệch thì hơi nghịch.
- Chính tinh cung Mệnh: Sao chính mạnh và hợp mệnh thì tốt. Sao yếu hoặc khắc mệnh thì xấu.
- Mệnh vs Thân: Xem cái nào mạnh hơn để biết đời nghiêng về bản chất (MỆNH) hay hành động (THÂN).
- Cung Phúc Đức: Nền tảng may mắn và hậu thuẫn. Tốt thì đỡ vất, xấu thì dễ trầy trật.
- Sao đúng chỗ không: Sao nằm đúng cung thì phát huy tốt. Sai chỗ thì có lực mà dùng không hiệu quả.
- Tứ Hóa: Cho biết điểm mạnh về tiền, quyền, danh. Nằm ở cung nào thì mạnh ở đó.
- Lục Sát: Các yếu tố gây rắc rối. Nằm ở đâu thì chỗ đó dễ có vấn đề.
- Vận hạn: Cuộc đời chia theo giai đoạn 10 năm. Quan trọng là lúc nào lên — lúc nào xuống.

QUY TẮC CHUNG CHO MỌI PHẦN LUẬN GIẢI:
- Không liệt kê lại tên sao, không mô tả lại dữ liệu thô.
- Nếu cung vô chính diệu thì nói rõ phải mượn cung xung chiếu để luận.
- Quan hệ với Mệnh là ưu tiên: cung đang xét hỗ trợ hay khắc bản mệnh?
- Tổ hợp sao: nhiều sao tốt → xu hướng tốt, nhiều sao xấu → dễ vấn đề; sát tinh/bại tinh mạnh thì phải cảnh báo rõ.
- Cung rơi vào lĩnh vực nào thì chuyện xảy ra xoay quanh lĩnh vực đó.
- Check nền Phúc–Mệnh–Thân: 3 cung này tốt thì giảm xấu, xấu thì khuếch đại rủi ro.`;
// ─── Cung descriptions ─────────────────────────────────────────
const CUNG_BY_PHAN: Record<number, string> = {
  2:'Mệnh', 3:'Phụ Mẫu', 4:'Phúc Đức', 5:'Điền Trạch',
  6:'Quan Lộc', 7:'Nô Bộc', 8:'Thiên Di', 9:'Tật Ách',
  10:'Tài Bạch', 11:'Tử Tức', 12:'Phu Thê', 13:'Huynh Đệ',
};

const CUNG_DESC: Record<string, string> = {
  'Mệnh': 'Cung Mệnh định khí chất, bản năng, và con đường chính của cuộc đời.',
  'Phụ Mẫu': 'Cung Phụ Mẫu xem sự thọ yểu, giàu nghèo của cha mẹ; sự hòa hợp hay xung khắc giữa cha mẹ và đương số; cũng xem văn bằng, học vấn.',
  'Phúc Đức': 'Cung Phúc Đức xem phúc khí tổ tiên để lại, âm phần, và phúc lộc cuối đời. Cung chi phối toàn bộ 11 cung còn lại về phúc đức.',
  'Điền Trạch': 'Cung Điền Trạch xem nhà cửa, bất động sản, hòa khí gia đình, khả năng tích lũy tài sản vật chất.',
  'Quan Lộc': 'Cung Quan Lộc xem công danh, sự nghiệp, khả năng thăng tiến, chuyên môn và thành tựu xã hội.',
  'Nô Bộc': 'Cung Nô Bộc xem người giúp việc, bạn bè thân thiết, người cộng sự; cũng xét quan hệ với cấp dưới và quý nhân.',
  'Thiên Di': 'Cung Thiên Di xem giao thiệp bên ngoài, may rủi khi xuất hành, định cư xa xứ, và quan hệ với thế giới bên ngoài. Xung chiếu Mệnh — cần xét kỹ.',
  'Tật Ách': 'Cung Tật Ách xem tì vết trong người, các bệnh có xu hướng mắc phải, tai ương thể xác trong cuộc đời.',
  'Tài Bạch': 'Cung Tài Bạch xem sự giàu nghèo, cách kiếm tiền, tiêu tiền, và khả năng tích lũy tài chính.',
  'Tử Tức': 'Cung Tử Tức xem con cái, quan hệ với con, và phần nào về đệ tử, người theo học.',
  'Phu Thê': 'Cung Phu Thê xem những điều liên quan đến vợ chồng, tình duyên, hôn nhân và hạnh phúc đôi lứa cả đời.',
  'Huynh Đệ': 'Cung Huynh Đệ xem anh chị em, bạn bè cùng trang lứa, và một phần về tài chính lưu động.',
};

// ─── Chat handler ──────────────────────────────────────────────
const CHAT_SYSTEM_LASO = (ctx: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.

Nguyên tắc trả lời:
- Tiếng Việt chuẩn mực, không dùng bullet, không dùng emoji
- 150-300 từ cho câu thông thường, tối đa 450 từ cho câu phức tạp
- Dẫn chứng sao tinh, cung vị, can chi cụ thể từ lá số bên dưới
- Xét tam phương tứ chính, không đoán đơn sao
- Không hứa hẹn tuyệt đối, dùng ngôn ngữ xác suất
- Không tiết lộ trường phái hay tài liệu

=== DỮ LIỆU LÁ SỐ ===
${ctx}`;

const CHAT_SYSTEM_GENERAL = `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.

Nguyên tắc:
- Tiếng Việt chuẩn mực, không dùng bullet, không dùng emoji
- 150-300 từ cho câu thông thường, tối đa 450 từ cho câu phức tạp
- Dẫn chiếu nguyên lý cổ pháp, nêu ví dụ sao tinh cụ thể khi minh họa
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
    if (p.cachCuc?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx += '  Cách cục: ' + p.cachCuc.map((c: any) => c.ten || c).join(', ') + '\n';
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
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, system: systemPrompt, messages: trimmed }),
  });

  if (!resp.ok) return err('API error: ' + (await resp.text()).slice(0, 200));
  const data = await resp.json();
  return ok({ answer: data.content?.[0]?.text || '', scenario: hasLaso ? 'laso' : 'general' });
}

// ─── Prompt builder ────────────────────────────────────────────
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
        const block = endI > 0 ? cungLines.slice(startI, endI) : cungLines.slice(startI, startI + 30);
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
          const dvBlock = endI > 0 ? dvLines.slice(startI, endI) : dvLines.slice(startI, startI + 25);
          // Also include header for context
          return headerLines.join('\n') + '\n\n' + dvBlock.join('\n');
        }
      }
    }
    return text;
  }

  const trimmedLaSo = trimLaSo(laSoText, phan);
  const docsSection = docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';
  const ctx = '=== LÁ SỐ ===\n' + trimmedLaSo + docsSection;

  if (phan === 1) return ctx + `

PHẦN 1 — TỔNG QUAN LÁ SỐ (220-280 từ)
Viết văn xuôi liền mạch, không dùng bullet, không đề cập đại vận trong phần này.

Cấu trúc gợi ý (không cần tiêu đề con):
① Bản mệnh & cục: Can chi năm sinh, nạp âm, cục — ý nghĩa thực tế với con người này là gì? Mệnh có thuận lý hay nghịch lý với cục?
② Cung Mệnh: Chính tinh, cách cục nổi bật — khí chất và điểm mạnh/yếu cốt lõi. Xét vị trí Tràng Sinh và vòng Lộc Tồn nếu có.
③ Nhóm Thái Tuế tại Mệnh vs Thân: Hai nhóm phản ánh hai chiều con người — bên trong và bên ngoài xã hội.
④ Một nhận định tổng: Điểm đặc biệt nhất của lá số này là gì?

Lưu ý: Dựa trên [CÁCH CỤC] và [Ý NGHĨA] đã có — diễn giải, không liệt kê lại.`;

  if (phan === 2) return ctx + `

PHẦN 2 — CUNG MỆNH (220-280 từ)
${CUNG_DESC['Mệnh']}

Viết văn xuôi súc tích, đi thẳng vào tính cách và số phận:
① Chính tinh tại Mệnh: Bản chất cốt lõi — người này là kiểu người gì? Miếu/Hãm ảnh hưởng thế nào?
② Cách cục Mệnh: Dựa trên [CÁCH CỤC] và [Ý NGHĨA] — đây là điểm sống còn của lá số, diễn giải thật rõ tác động thực tế.
③ Sao phụ nổi bật: Chỉ đề cập sao phụ thực sự ảnh hưởng (Văn Xương/Khúc, Tả/Hữu, Kình/Đà, Hỏa/Linh...).
④ Điểm mạnh và điểm cần cảnh giác trong con người và cuộc đời.

Xét thêm cung Thiên Di (xung chiếu Mệnh) — ảnh hưởng gì đến tính cách bên ngoài?`;

  if (phan >= 3 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan] || '';
    const cungDesc = CUNG_DESC[cung] || '';
    return ctx + `

PHẦN ${phan} — CUNG ${cung.toUpperCase()} (120-160 từ)
${cungDesc}

Viết 2-3 đoạn văn xuôi súc tích. Cấu trúc:
① Nhận định chính: Dựa trên [CÁCH CỤC] và [Ý NGHĨA] — đây là phần quan trọng nhất, diễn giải thật rõ.
② Tam phương: Xét sao ở cung tam hợp có hỗ trợ hay phá cách không?
③ Kết luận thực tế: 1-2 câu về tác động cụ thể trong cuộc đời người này.

Không liệt kê lại tên sao, không mô tả lại dữ liệu thô. Nếu cung vô chính diệu thì nói rõ phải mượn cung xung chiếu để luận.`;
  }

  if (phan === 14) return ctx + `

PHẦN 14 — TỔNG QUAN CÁC ĐẠI VẬN

Dựa vào phần === 9 ĐẠI VẬN ===, tính điểm scoring cho TẤT CẢ 9 đại vận:
- TT (Thiên Thời) 0-5 | ĐL (Địa Lợi) 0-1 | NH (Nhân Hòa) 0-4
- Công thức: Tổng = NH + (NH/4)×ĐL + (NH/4)×TT (max 10)

Bảng tổng hợp ĐV1 đến ĐV9:
| ĐV | Tuổi | Cung | TT | ĐL | NH | Tổng | Flag |

JSON chart (BẮT BUỘC, đủ 9 điểm):
\`\`\`chartdata
{"labels":["ĐV1 x-y","ĐV2 x-y","ĐV3 x-y","ĐV4 x-y","ĐV5 x-y","ĐV6 x-y","ĐV7 x-y","ĐV8 x-y","ĐV9 x-y"],"scores":[s1,s2,s3,s4,s5,s6,s7,s8,s9]}
\`\`\`

Nhận xét tổng (120-160 từ): Giai đoạn đẹp nhất, khó khăn nhất, xu hướng tổng thể của cuộc đời theo vận trình. Nếu người đang trong đại vận nào thì nhận xét thêm về giai đoạn hiện tại.`;

  if (phan >= 15 && phan <= 23) {
    const dvNum = phan - 14;
    return ctx + `

PHẦN ${phan} — ĐẠI VẬN ${dvNum} (120-160 từ)
Tìm dòng "ĐV${dvNum}:" trong === 9 ĐẠI VẬN ===.

Viết văn xuôi, 2-3 đoạn:
① Tính chất vận: Điểm scoring nói lên điều gì về giai đoạn này?
② Nhận định chính: Dựa trên [LUẬN ĐOÁN] và [CẢNH BÁO] — diễn giải thực tế, không liệt kê lại.
③ Tam phương: Sao ở cung tam hợp của cung đại vận có hỗ trợ hay phá không?
④ Kết luận thực tế: 1-2 câu tác động cụ thể + gợi ý nhẹ nếu cần.`;
  }

  if (phan === 24) return ctx + `

PHẦN 24 — TIỂU VẬN & NĂM XEM (180-220 từ)
Quan sát 3 lớp hạn cùng lúc: gốc đại vận (10 năm) + tiểu hạn năm đó + lưu niên đại vận.
Dữ liệu có sẵn: Tiểu hạn (cung + sao), Lưu đại hạn (cung + sao), Đại vận hiện tại.

Viết văn xuôi, đi thẳng vào thực tế:
① Tổng hợp 3 lớp hạn: Đếm sao tốt/xấu trong cả 3 cung — xu hướng chung là thuận hay nghịch?
② Quan hệ với Mệnh: Cung tiểu hạn sinh hay khắc Mệnh? Sao nhập hạn hợp hay đối lập bản mệnh?
③ Đại hạn vs tiểu hạn: Đại hạn tốt thì tiểu hạn xấu cũng đỡ nặng; đại hạn xấu thì tiểu hạn tốt cũng bị giảm.
④ Cơ hội và rủi ro: 1-2 điểm thuận + 1-2 điểm cần cẩn thận cụ thể.
⑤ Lời khuyên ngắn cho năm này.

Lưu ý khi nhận định:
- Mệnh sinh cung hạn → hao tổn, dễ gặp vấn đề.
- Mệnh khắc cung hạn → căng thẳng, nguy hiểm.
- Có sao tốt hoặc Tuần/Triệt → giảm xấu (nhưng cũng giảm tốt).
- Sát/Bại tinh mạnh → phải cảnh báo rõ.

Không giải thích lý thuyết. Đi thẳng vào tác động với người này.\`;

  return ctx + `\nPhần ${phan}: Luận giải theo lá số.`;
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
    const model = (phan === 1 || phan === 14) ? 'claude-sonnet-4-6' : 'claude-sonnet-4-6';
    const maxTok = phan === 1 ? 2000 : phan === 14 ? 3000 : phan === 24 ? 1400
      : (phan >= 2 && phan <= 13) ? 1100 : (phan >= 15 && phan <= 23) ? 1100 : 1000;

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
