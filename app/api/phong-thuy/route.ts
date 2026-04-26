// app/api/phong-thuy/route.ts
// POST /api/phong-thuy?action=analyze          — Phong thủy nội thất (Vision)
// POST /api/phong-thuy?action=ban-lam-viec     — Phong thủy bàn làm việc (Vision)
// POST /api/phong-thuy?action=cua-hang         — Phong thủy cửa hàng/VP (Vision)
// POST /api/phong-thuy?action=mau-sac          — Màu sắc hợp mệnh (no Vision)

export const maxDuration = 60;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY!;

const COSTS: Record<string, number> = {
  'analyze':       90,
  'ban-lam-viec':  90,
  'cua-hang':      90,
  'mau-sac':       20,
};

// ── Supabase helpers ─────────────────────────────────────────────

async function getUserFromToken(token: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_KEY },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u?.id ? u : null;
}

async function sbRpc(fn: string, params: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(params),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t); }
  return res.json();
}

async function logTx(userId: string, amount: number, toolType: string, description: string, slug: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ user_id: userId, amount: -amount, type: toolType, description, slug, created_at: new Date().toISOString() }),
  });
}

// ── Claude helper ────────────────────────────────────────────────

async function claude(messages: unknown[], system: string, maxTokens = 1800): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || '';
}

function parseJSON(text: string) {
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { return null; }
}

// ── Gua reference ────────────────────────────────────────────────

const GUA: Record<number, { name: string; elem: string; good: Record<string,string>; bad: Record<string,string> }> = {
  1:{name:'Khảm',elem:'Thủy',good:{SE:'Sinh Khí',E:'Thiên Y',S:'Diên Niên',N:'Phục Vị'},bad:{W:'Họa Hại',NE:'Ngũ Quỷ',NW:'Lục Sát',SW:'Tuyệt Mệnh'}},
  2:{name:'Khôn',elem:'Thổ', good:{NE:'Sinh Khí',W:'Thiên Y',NW:'Diên Niên',SW:'Phục Vị'},bad:{E:'Họa Hại',SE:'Ngũ Quỷ',S:'Lục Sát',N:'Tuyệt Mệnh'}},
  3:{name:'Chấn',elem:'Mộc', good:{S:'Sinh Khí',N:'Thiên Y',SE:'Diên Niên',E:'Phục Vị'}, bad:{SW:'Họa Hại',W:'Ngũ Quỷ',NE:'Lục Sát',NW:'Tuyệt Mệnh'}},
  4:{name:'Tốn', elem:'Mộc', good:{N:'Sinh Khí',S:'Thiên Y',E:'Diên Niên',SE:'Phục Vị'}, bad:{NW:'Họa Hại',SW:'Ngũ Quỷ',W:'Lục Sát',NE:'Tuyệt Mệnh'}},
  6:{name:'Càn', elem:'Kim', good:{W:'Sinh Khí',NE:'Thiên Y',SW:'Diên Niên',NW:'Phục Vị'},bad:{SE:'Họa Hại',S:'Ngũ Quỷ',E:'Lục Sát',N:'Tuyệt Mệnh'}},
  7:{name:'Đoài',elem:'Kim', good:{NW:'Sinh Khí',SW:'Thiên Y',NE:'Diên Niên',W:'Phục Vị'}, bad:{E:'Họa Hại',N:'Ngũ Quỷ',SE:'Lục Sát',S:'Tuyệt Mệnh'}},
  8:{name:'Cấn', elem:'Thổ', good:{SW:'Sinh Khí',NW:'Thiên Y',W:'Diên Niên',NE:'Phục Vị'}, bad:{S:'Họa Hại',E:'Ngũ Quỷ',N:'Lục Sát',SE:'Tuyệt Mệnh'}},
  9:{name:'Ly',  elem:'Hỏa', good:{E:'Sinh Khí',SE:'Thiên Y',N:'Diên Niên',S:'Phục Vị'},  bad:{NE:'Họa Hại',NW:'Ngũ Quỷ',SW:'Lục Sát',W:'Tuyệt Mệnh'}},
};

// Ngũ Hành color data
const NH_COLORS: Record<string, { primary: string[]; secondary: string[]; avoid: string[]; hex: Record<string,string> }> = {
  'Kim': {
    primary:   ['Trắng', 'Bạc', 'Xám nhạt', 'Vàng kim'],
    secondary: ['Vàng đất', 'Be', 'Kem'],
    avoid:     ['Đỏ', 'Cam', 'Hồng đậm'],
    hex:       { 'Trắng':'#FFFFFF','Bạc':'#C0C0C0','Xám nhạt':'#D3D3D3','Vàng kim':'#D4AF37','Vàng đất':'#C8973A','Be':'#D4B896','Kem':'#FFF8DC' },
  },
  'Mộc': {
    primary:   ['Xanh lá', 'Xanh ngọc', 'Xanh lam nhạt', 'Nâu gỗ'],
    secondary: ['Xanh mint', 'Xanh rêu', 'Xanh olive'],
    avoid:     ['Trắng', 'Bạc', 'Xám kim loại'],
    hex:       { 'Xanh lá':'#2E8B57','Xanh ngọc':'#40E0D0','Xanh lam nhạt':'#87CEEB','Nâu gỗ':'#8B4513','Xanh mint':'#98FF98','Xanh rêu':'#6B8E23','Xanh olive':'#808000' },
  },
  'Thủy': {
    primary:   ['Đen', 'Navy', 'Xanh dương đậm', 'Xanh biển'],
    secondary: ['Xám đậm', 'Tím than', 'Xanh rêu đậm'],
    avoid:     ['Vàng đất', 'Nâu', 'Cam đất'],
    hex:       { 'Đen':'#000000','Navy':'#000080','Xanh dương đậm':'#00008B','Xanh biển':'#1E90FF','Xám đậm':'#696969','Tím than':'#4B0082','Xanh rêu đậm':'#355E3B' },
  },
  'Hỏa': {
    primary:   ['Đỏ', 'Cam', 'Hồng tươi', 'Tím đỏ'],
    secondary: ['Vàng tươi', 'Hồng phấn', 'Nâu đỏ'],
    avoid:     ['Đen', 'Navy', 'Xanh dương đậm'],
    hex:       { 'Đỏ':'#CC0000','Cam':'#FF6600','Hồng tươi':'#FF69B4','Tím đỏ':'#800040','Vàng tươi':'#FFD700','Hồng phấn':'#FFB6C1','Nâu đỏ':'#8B2500' },
  },
  'Thổ': {
    primary:   ['Vàng đất', 'Nâu ấm', 'Be đậm', 'Cam đất'],
    secondary: ['Vàng nhạt', 'Kem đậm', 'Nâu vàng'],
    avoid:     ['Xanh lá', 'Xanh lam', 'Xanh ngọc'],
    hex:       { 'Vàng đất':'#C8973A','Nâu ấm':'#8B6914','Be đậm':'#D2B48C','Cam đất':'#CC7722','Vàng nhạt':'#F5DEB3','Kem đậm':'#FAEBD7','Nâu vàng':'#DAA520' },
  },
};

const NAP_AM: Record<number, string> = {
  1924:'Hỏa',1925:'Hỏa',1926:'Thổ',1927:'Thổ',1928:'Mộc',1929:'Mộc',1930:'Kim',1931:'Kim',1932:'Thủy',1933:'Thủy',
  1934:'Hỏa',1935:'Hỏa',1936:'Thổ',1937:'Thổ',1938:'Mộc',1939:'Mộc',1940:'Kim',1941:'Kim',1942:'Thủy',1943:'Thủy',
  1944:'Hỏa',1945:'Hỏa',1946:'Thổ',1947:'Thổ',1948:'Mộc',1949:'Mộc',1950:'Kim',1951:'Kim',1952:'Thủy',1953:'Thủy',
  1954:'Hỏa',1955:'Hỏa',1956:'Thổ',1957:'Thổ',1958:'Mộc',1959:'Mộc',1960:'Kim',1961:'Kim',1962:'Thủy',1963:'Thủy',
  1964:'Hỏa',1965:'Hỏa',1966:'Thổ',1967:'Thổ',1968:'Mộc',1969:'Mộc',1970:'Kim',1971:'Kim',1972:'Thủy',1973:'Thủy',
  1974:'Hỏa',1975:'Hỏa',1976:'Thổ',1977:'Thổ',1978:'Mộc',1979:'Mộc',1980:'Kim',1981:'Kim',1982:'Thủy',1983:'Thủy',
  1984:'Hỏa',1985:'Hỏa',1986:'Thổ',1987:'Thổ',1988:'Mộc',1989:'Mộc',1990:'Kim',1991:'Kim',1992:'Thủy',1993:'Thủy',
  1994:'Hỏa',1995:'Hỏa',1996:'Thổ',1997:'Thổ',1998:'Mộc',1999:'Mộc',2000:'Kim',2001:'Kim',2002:'Thủy',2003:'Thủy',
  2004:'Hỏa',2005:'Hỏa',2006:'Thổ',2007:'Thổ',2008:'Mộc',2009:'Mộc',2010:'Kim',2011:'Kim',2012:'Thủy',2013:'Thủy',
  2014:'Hỏa',2015:'Hỏa',2016:'Thổ',2017:'Thổ',2018:'Mộc',2019:'Mộc',2020:'Kim',2021:'Kim',2022:'Thủy',2023:'Thủy',
  2024:'Hỏa',2025:'Hỏa',
};

// ── Auth + credit deduct common ──────────────────────────────────

async function authAndDeduct(request: NextRequest, action: string) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
  const token = auth.slice(7);
  const user = await getUserFromToken(token);
  if (!user?.id) return { error: 'Unauthorized', status: 401 };

  const cost = COSTS[action] || 90;
  let balance: number;
  try { balance = await sbRpc('get_credit_balance', { p_user_id: user.id }); } catch { balance = 0; }
  if (balance < cost) return { error: 'insufficient_balance', balance, required: cost };

  let newBalance: number;
  try {
    newBalance = await sbRpc('deduct_credits', { p_user_id: user.id, p_amount: cost });
  } catch (e: unknown) {
    const msg = (e as Error).message || '';
    if (msg.includes('insufficient')) return { error: 'insufficient_balance', balance, required: cost };
    throw e;
  }
  return { user, token, cost, newBalance };
}

// ── Vision + Feng Shui shared handler ────────────────────────────

async function handleVisionTool(
  request: NextRequest,
  body: Record<string, unknown>,
  action: string,
  visionPrompt: string,
  analysisSystemPrompt: string,
  analysisUserPrompt: (detected: Record<string, unknown>, guaCtx: string, body: Record<string, unknown>) => string,
) {
  const auth = await authAndDeduct(request, action);
  if ('error' in auth) return ok(auth);

  const { imageBase64, imageType, doorDir, guaNumber, namSinh } = body as Record<string, string>;
  if (!imageBase64) return err('Missing image');

  const guaNum = parseInt(String(guaNumber || 0));
  const guaData = GUA[guaNum];
  const guaCtx = guaData
    ? `Quái ${guaNum} — ${guaData.name} (${guaData.elem})\nTốt: ${Object.entries(guaData.good).map(([d,v])=>`${d}=${v}`).join(', ')}\nXấu: ${Object.entries(guaData.bad).map(([d,v])=>`${d}=${v}`).join(', ')}`
    : `Quái ${guaNum}`;

  // Vision detect
  const visionText = await claude([{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 } },
      { type: 'text', text: visionPrompt + (doorDir ? `\nCửa/mặt hướng: ${doorDir}.` : '') + '\nChỉ trả về JSON hợp lệ.' },
    ],
  }], 'Bạn là chuyên gia phân tích không gian. Chỉ trả về JSON hợp lệ, không có text khác.');

  const detected = parseJSON(visionText) || { detectedItems: [], observations: 'Không thể nhận diện.' };

  // Analysis
  const analysisText = await claude(
    [{ role: 'user', content: analysisUserPrompt(detected, guaCtx, body) }],
    analysisSystemPrompt,
    2000,
  );
  const analysis = parseJSON(analysisText) || { beforeScore: 40, afterScore: 72, recommendations: [], shoppingList: [], generalAdvice: analysisText };

  const slug = `${action}-${auth.user.id.slice(0,8)}-${Date.now()}`;
  await logTx(auth.user.id, auth.cost, action.replace('-','_'), `Phong Thủy ${action}`, slug);

  return ok({ success: true, balance: auth.newBalance, detected, analysis });
}

// ── Handler: Phong Thủy Nội Thất ────────────────────────────────

async function handleAnalyze(request: NextRequest, body: Record<string, unknown>) {
  const { roomType } = body as Record<string, string>;
  const roomLabel = roomType === 'bedroom' ? 'phòng ngủ' : roomType === 'living' ? 'phòng khách' : 'phòng làm việc';
  return handleVisionTool(request, body, 'analyze',
    `Quan sát ảnh ${roomLabel}. Nhận diện đồ vật và ước lượng vị trí theo 8 hướng la bàn (N/NE/E/SE/S/SW/W/NW/C).
Trả về JSON: {"detectedFurniture":[{"id":"bed|desk|sofa|altar|stove|plant|mirror|door|toilet|water|wardrobe|tv","name":"tên VN","currentPosition":"N|NE|...","notes":""}],"roomObservations":"","lightSources":"","clutter":"gọn|bình thường|lộn xộn"}`,
    'Bạn là thầy phong thủy Bát Trạch. Chỉ trả về JSON hợp lệ.',
    (detected, guaCtx) => `Phân tích phong thủy Bát Trạch cho ${roomLabel}.\n${guaCtx}\nĐồ vật: ${JSON.stringify((detected as {detectedFurniture?: unknown[]}).detectedFurniture || [])}\n
Trả về JSON: {"beforeScore":<0-100>,"afterScore":<cao hơn ít nhất 15>,"scoreExplanation":"","recommendations":[{"furnitureId":"","furnitureName":"","currentPosition":"","action":"move|keep|remove","recommendedPosition":"","reason":"","priority":"high|medium|low","improvement":<số>}],"shoppingList":[{"item":"","icon":"emoji","category":"cây|đèn|tranh|vật phẩm|màu sắc","position":"","reason":"","priceRange":"xxx.000đ","urgency":"nên có|tốt nếu có|tuỳ ý"}],"generalAdvice":""}`,
  );
}

// ── Handler: Bàn Làm Việc ────────────────────────────────────────

async function handleBanLamViec(request: NextRequest, body: Record<string, unknown>) {
  return handleVisionTool(request, body, 'ban-lam-viec',
    `Quan sát ảnh bàn làm việc / góc học tập. Nhận diện các vật dụng trên và xung quanh bàn, ước lượng vị trí tương đối (trái/phải/trước/sau/trung tâm → map sang hướng la bàn nếu biết).
Trả về JSON: {"detectedItems":[{"id":"monitor|laptop|lamp|plant|phone|notebook|keyboard|mouse|mirror|clock|speaker|printer|drawer","name":"tên VN","position":"N|NE|E|SE|S|SW|W|NW|C|trai|phai|truoc|sau","notes":""}],"deskCondition":"gọn gàng|bình thường|lộn xộn","lightQuality":"tốt|thiếu sáng|chói","chairFacing":"hướng người ngồi nhìn ra"}`,
    'Bạn là thầy phong thủy chuyên về không gian làm việc và học tập. Áp dụng Bát Trạch + Ngũ Hành. Chỉ trả về JSON hợp lệ.',
    (detected, guaCtx, b) => {
      const { workType } = b as Record<string,string>;
      const wl = workType === 'study' ? 'học tập' : workType === 'creative' ? 'sáng tạo' : 'làm việc văn phòng';
      return `Phân tích phong thủy bàn làm việc cho mục đích ${wl}.\n${guaCtx}\n
Vật dụng phát hiện: ${JSON.stringify((detected as {detectedItems?: unknown[]}).detectedItems || [])}\n
Hướng người ngồi hiện tại: ${(detected as {chairFacing?: string}).chairFacing || 'chưa xác định'}\n
Nguyên tắc: hướng ngồi làm việc hướng Sinh Khí/Thiên Y là tốt nhất; đèn bên trái; cây góc Đông/Đông Nam; gương không được chiếu thẳng vào mặt; màn hình không sát tường sau lưng.\n
Trả về JSON: {"beforeScore":<0-100>,"afterScore":<cao hơn ít nhất 15>,"scoreExplanation":"","chairDirection":{"current":"","recommended":"","reason":""},"recommendations":[{"itemId":"","itemName":"","currentPosition":"","action":"move|rotate|remove|add","recommendedPosition":"","reason":"","priority":"high|medium|low","improvement":<số>}],"shoppingList":[{"item":"","icon":"emoji","category":"cây|đèn|vật phẩm|tổ chức","position":"","reason":"","priceRange":"xxx.000đ","urgency":"nên có|tốt nếu có|tuỳ ý"}],"generalAdvice":"","focusTips":"3 mẹo tăng tập trung theo phong thủy"}`;
    },
  );
}

// ── Handler: Cửa Hàng / Văn Phòng ───────────────────────────────

async function handleCuaHang(request: NextRequest, body: Record<string, unknown>) {
  const { spaceType } = body as Record<string,string>;
  const spaceLabel = spaceType === 'office' ? 'văn phòng' : spaceType === 'restaurant' ? 'nhà hàng/quán ăn' : 'cửa hàng kinh doanh';
  return handleVisionTool(request, body, 'cua-hang',
    `Quan sát ảnh ${spaceLabel}. Nhận diện các khu vực và vật dụng quan trọng, ước lượng vị trí theo hướng la bàn.
Trả về JSON: {"detectedItems":[{"id":"cashier|entrance|display|storage|desk|seating|counter|safe|plant|sign|light","name":"tên VN","position":"N|NE|E|SE|S|SW|W|NW|C","notes":""}],"spaceObservations":"","trafficFlow":"mô tả luồng khách","lightingQuality":"tốt|thiếu|chói"}`,
    'Bạn là thầy phong thủy chuyên về không gian kinh doanh và thương mại. Áp dụng Loan Đầu + Bát Trạch + Ngũ Hành để tối ưu tài lộc và khách hàng. Chỉ trả về JSON hợp lệ.',
    (detected, guaCtx, b) => {
      const { spaceType: st } = b as Record<string,string>;
      return `Phân tích phong thủy ${spaceLabel} theo góc nhìn tài lộc và kinh doanh.\n${guaCtx}\n
Khu vực/vật dụng phát hiện: ${JSON.stringify((detected as {detectedItems?: unknown[]}).detectedItems || [])}\nLuồng khách: ${(detected as {trafficFlow?: string}).trafficFlow || ''}\n
Nguyên tắc: thu ngân hướng Sinh Khí; cửa chính đón khí tốt; két sắt tránh hướng xấu; khu trưng bày hướng tốt; cây xanh kích hoạt Mộc tài; gương thu hút khách.\n${st === 'office' ? 'Bàn sếp/giám đốc hướng Sinh Khí; nhân viên ngồi lưng tựa tường; phòng họp góc tốt.' : ''}\n
Trả về JSON: {"beforeScore":<0-100>,"afterScore":<cao hơn ít nhất 15>,"scoreExplanation":"","recommendations":[{"itemId":"","itemName":"","currentPosition":"","action":"move|keep|add|remove","recommendedPosition":"","reason":"","priority":"high|medium|low","improvement":<số>,"businessImpact":"tác động kinh doanh"}],"shoppingList":[{"item":"","icon":"emoji","category":"cây|đèn|vật phẩm|trang trí","position":"","reason":"","priceRange":"xxx.000đ","urgency":"nên có|tốt nếu có|tuỳ ý"}],"generalAdvice":"","wealthTips":"3 mẹo kích hoạt tài lộc theo phong thủy"}`;
    },
  );
}

// ── Handler: Màu Sắc Hợp Mệnh ────────────────────────────────────

async function handleMauSac(request: NextRequest, body: Record<string, unknown>) {
  const auth = await authAndDeduct(request, 'mau-sac');
  if ('error' in auth) return ok(auth);

  const { namSinh, gioiTinh } = body as Record<string, string>;
  const year = parseInt(String(namSinh || 0));
  if (!year || year < 1900 || year > 2025) return err('Invalid year');

  // Calc gua + napam
  function calcGua(y: number, g: string): number {
    let s = String(y).split('').reduce((a,c)=>a+parseInt(c),0);
    while(s>=10) s=String(s).split('').reduce((a,c)=>a+parseInt(c),0);
    let gua: number;
    if(g==='male'){ gua=y>=2000?9-s:10-s; if(gua<=0)gua+=9; if(gua===5)gua=2; }
    else{ gua=y>=2000?s+6:s+5; while(gua>=10)gua=String(gua).split('').reduce((a,c)=>a+parseInt(c),0); if(gua===5)gua=8; }
    return gua;
  }

  const guaNum = calcGua(year, gioiTinh || 'male');
  const guaData = GUA[guaNum];
  const napAmHanh = NAP_AM[year] || 'Hỏa';
  const colorData = NH_COLORS[napAmHanh] || NH_COLORS['Hỏa'];

  // Claude generate detailed style guide
  const styleText = await claude([{
    role: 'user',
    content: `Tạo hướng dẫn màu sắc trang phục hợp mệnh cho người:
- Năm sinh: ${year}
- Giới tính: ${gioiTinh === 'male' ? 'Nam' : 'Nữ'}
- Nạp Âm Ngũ Hành: ${napAmHanh}
- Bản Mệnh Quái: ${guaNum} — ${guaData?.name || ''} (${guaData?.elem || ''})

Màu chính tốt cho hành ${napAmHanh}: ${colorData.primary.join(', ')}
Màu phụ: ${colorData.secondary.join(', ')}
Màu nên tránh: ${colorData.avoid.join(', ')}

Trả về JSON:
{
  "napAmHanh": "${napAmHanh}",
  "guaNum": ${guaNum},
  "guaName": "${guaData?.name || ''}",
  "summary": "tóm tắt 2-3 câu về màu sắc phù hợp",
  "clothing": {
    "topColors": ["màu 1","màu 2","màu 3"],
    "bottomColors": ["màu 1","màu 2","màu 3"],
    "outerColors": ["màu 1","màu 2"],
    "shoeColors": ["màu 1","màu 2","màu 3"],
    "bagColors": ["màu 1","màu 2"],
    "accessoryColors": ["màu 1","màu 2","màu 3"],
    "avoidColors": ["màu 1","màu 2","màu 3"]
  },
  "occasions": {
    "interview": {"colors":["màu 1","màu 2"],"tip":"lý do ngắn"},
    "date":      {"colors":["màu 1","màu 2"],"tip":"lý do ngắn"},
    "business":  {"colors":["màu 1","màu 2"],"tip":"lý do ngắn"},
    "daily":     {"colors":["màu 1","màu 2"],"tip":"lý do ngắn"}
  },
  "colorCombos": [
    {"name":"Tên combo","items":["áo X","quần Y","giày Z"],"vibe":"mô tả phong cách","score":95},
    {"name":"Tên combo","items":["áo X","quần Y","giày Z"],"vibe":"mô tả phong cách","score":88},
    {"name":"Tên combo","items":["áo X","quần Y","giày Z"],"vibe":"mô tả phong cách","score":82}
  ],
  "avoidExplanation": "giải thích tại sao tránh màu xấu theo Ngũ Hành",
  "bonusTip": "1 mẹo đặc biệt theo bản mệnh"
}`,
  }], 'Bạn là chuyên gia phong thủy và thời trang. Tư vấn màu sắc dựa trên Ngũ Hành Nạp Âm và Bát Trạch. Chỉ trả về JSON hợp lệ.', 1600);

  const styleGuide = parseJSON(styleText) || {
    napAmHanh, guaNum, guaName: guaData?.name || '',
    summary: `Người mệnh ${napAmHanh} hợp với các tông màu ${colorData.primary.slice(0,2).join(', ')}.`,
    clothing: { topColors: colorData.primary, bottomColors: colorData.secondary, outerColors: colorData.primary.slice(0,2), shoeColors: colorData.secondary, bagColors: colorData.primary.slice(0,2), accessoryColors: colorData.secondary, avoidColors: colorData.avoid },
    occasions: {},
    colorCombos: [],
    avoidExplanation: `Màu ${colorData.avoid.join(', ')} khắc hành ${napAmHanh} theo Ngũ Hành tương khắc.`,
    bonusTip: '',
  };

  // Attach hex colors
  const slug = `mau-sac-${auth.user.id.slice(0,8)}-${Date.now()}`;
  await logTx(auth.user.id, auth.cost, 'mau_sac', 'Màu Sắc Hợp Mệnh', slug);

  return ok({ success: true, balance: auth.newBalance, napAmHanh, colorData, styleGuide });
}

// ── Phong Thủy Room Render (Replicate) ───────────────────────────

const GUA_ROOM_STYLE: Record<number, { colors: string; mood: string; elem: string }> = {
  1: { elem: 'Thủy', colors: 'navy blue and deep teal with dark wood accents', mood: 'serene and flowing' },
  2: { elem: 'Thổ', colors: 'warm beige and soft yellow with terracotta accents', mood: 'grounded and nurturing' },
  3: { elem: 'Mộc', colors: 'forest green with natural wood tones', mood: 'fresh and vibrant' },
  4: { elem: 'Mộc', colors: 'sage green and light teal with bamboo accents', mood: 'calm and expansive' },
  6: { elem: 'Kim', colors: 'crisp white with gold and silver metallic accents', mood: 'refined and elegant' },
  7: { elem: 'Kim', colors: 'soft white with polished gold accents', mood: 'bright and balanced' },
  8: { elem: 'Thổ', colors: 'warm brown and sandy beige with golden yellow', mood: 'cozy and stable' },
  9: { elem: 'Hỏa', colors: 'warm red and orange with wood tones', mood: 'energetic and welcoming' },
};

const ROOM_LABELS: Record<string, string> = {
  bedroom:   'bedroom interior',
  living:    'living room interior',
  workspace: 'home office workspace',
  study:     'study room and learning space',
  creative:  'creative studio workspace',
  store:     'retail store interior',
  office:    'corporate office interior',
  restaurant:'restaurant or cafe interior',
};

async function handlePhongThuyRender(request: NextRequest, body: Record<string, unknown>) {
  const replKey = process.env.REPLICATE_API_KEY;
  if (!replKey) return err('Replicate API key chưa cấu hình.', 500);

  // Auth check only (TuviPaywall handles deduction client-side)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return err('Unauthorized', 401);
  const user = await getUserFromToken(authHeader.slice(7));
  if (!user?.id) return err('Unauthorized', 401);

  const { imageBase64, imageType, guaNumber, roomType, topRecs } = body as {
    imageBase64?: string; imageType?: string; guaNumber?: number;
    roomType?: string; topRecs?: string[];
  };
  if (!imageBase64) return err('Missing image', 400);

  const guaNum = parseInt(String(guaNumber || 1));
  const style = GUA_ROOM_STYLE[guaNum] || GUA_ROOM_STYLE[1];
  const roomLabel = ROOM_LABELS[roomType || 'bedroom'] || 'bedroom';

  // Build a rich interior design prompt
  const recsText = (topRecs || []).slice(0, 3).join(', ');
  const prompt = [
    `feng shui optimized ${roomLabel} interior`,
    `${style.colors} color scheme`,
    `${style.mood} atmosphere`,
    'clean and organized layout',
    recsText ? recsText.substring(0, 120) : '',
    'natural lighting, harmonious proportions',
    'professional interior design photography',
    'photorealistic, high quality, 8k',
  ].filter(Boolean).join(', ');

  const negPrompt = 'cluttered, dark, ugly, low quality, blurry, cartoon, painting, watermark, text, bad lighting, distorted';
  const imageDataUri = `data:${imageType || 'image/jpeg'};base64,${imageBase64}`;

  // Call Replicate adirik/interior-design
  const startResp = await fetch('https://api.replicate.com/v1/models/adirik/interior-design/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${replKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: {
        image: imageDataUri,
        prompt,
        negative_prompt: negPrompt,
        guidance_scale: 15,
        num_inference_steps: 50,
        strength: 0.55,
        num_outputs: 1,
      }
    })
  });

  if (!startResp.ok) {
    const e = await startResp.json().catch(() => ({})) as Record<string, string>;
    return err(e.detail || 'Lỗi khởi tạo Replicate.', 500);
  }

  const prediction = await startResp.json() as { id?: string; status?: string; output?: string | string[] };

  if (prediction.status === 'succeeded') {
    const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    return ok({ imageUrl: url });
  }

  const predId = prediction.id;
  if (!predId) return err('Không tạo được prediction ID.', 500);

  // Poll up to ~54s
  for (let i = 0; i < 27; i++) {
    await _sleep(2000);
    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { 'Authorization': `Bearer ${replKey}` }
    });
    if (!pollResp.ok) continue;
    const data = await pollResp.json() as { status?: string; output?: string | string[]; error?: string };
    if (data.status === 'succeeded') {
      const url = Array.isArray(data.output) ? data.output[0] : data.output;
      return ok({ imageUrl: url });
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      return err(data.error || 'Replicate xử lý thất bại.', 500);
    }
  }
  return err('Hết thời gian chờ. Vui lòng thử lại.', 504);
}

// ── Trang Phục Try-On (Replicate) ────────────────────────────────

const NH_OUTFIT: Record<string, { main: string; accent: string }> = {
  'Kim':  { main: 'white and silver grey',         accent: 'cream and light gold' },
  'Mộc':  { main: 'forest green and warm brown',   accent: 'sage green and mint' },
  'Thủy': { main: 'navy blue and charcoal black',  accent: 'deep teal and dark grey' },
  'Hỏa':  { main: 'red and coral orange',          accent: 'burgundy and warm rose' },
  'Thổ':  { main: 'warm beige and earthy brown',   accent: 'golden yellow and terracotta' },
};

const STYLE_DESC: Record<string, { nam: string; nu: string }> = {
  'cong-so': {
    nam: 'professional office attire, dress shirt and tailored trousers, business formal style',
    nu:  'professional office wear, elegant blouse and tailored pants or pencil skirt, business formal style',
  },
  'casual': {
    nam: 'casual everyday outfit, clean polo shirt and chinos, modern relaxed style',
    nu:  'casual chic outfit, stylish blouse and jeans or casual midi skirt, modern relaxed style',
  },
  'sang-trong': {
    nam: 'elegant formal wear, well-fitted blazer and dress pants with tie, luxury fashion style',
    nu:  'elegant evening wear, sophisticated dress or blouse with wide-leg trousers, luxury fashion style',
  },
  'dao-pho': {
    nam: 'trendy street fashion, casual graphic tee and jogger pants, modern urban style',
    nu:  'trendy street style outfit, fashionable casual top and wide pants, modern urban fashion',
  },
};

const REPL_NEG = 'nsfw, ugly, deformed, bad anatomy, distorted face, blurry, low quality, cartoon, painting, watermark, text, logo';

function _sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

async function handleTrangPhucTryon(request: NextRequest, body: Record<string, unknown>) {
  const replKey = process.env.REPLICATE_API_KEY;
  if (!replKey) return err('Replicate API key chưa cấu hình.', 500);

  // Auth check only (no deduct — TuviPaywall handled client-side)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return err('Unauthorized', 401);
  const user = await getUserFromToken(authHeader.slice(7));
  if (!user?.id) return err('Unauthorized', 401);

  const { imageBase64, imageType, napAmHanh, gioiTinh, style } = body as Record<string, string>;
  if (!imageBase64) return err('Missing image', 400);

  const nh = napAmHanh || 'Hỏa';
  const gender = gioiTinh === 'female' ? 'nu' : 'nam';
  const st = style || 'casual';
  const nhColors = NH_OUTFIT[nh] || NH_OUTFIT['Hỏa'];
  const styleDesc = STYLE_DESC[st] || STYLE_DESC['casual'];
  const genderLabel = gender === 'nu' ? 'woman' : 'man';

  const prompt = `portrait photo of a ${genderLabel} img wearing ${styleDesc[gender]} in ${nhColors.main} and ${nhColors.accent} colors, photorealistic, professional fashion photography, high quality, sharp focus`;
  const imageDataUri = `data:${imageType || 'image/jpeg'};base64,${imageBase64}`;

  // Start Replicate prediction (PhotoMaker)
  const startResp = await fetch('https://api.replicate.com/v1/models/tencentarc/photomaker/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${replKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: {
        input_image: imageDataUri,
        prompt,
        negative_prompt: REPL_NEG,
        style_strength_ratio: 20,
        num_outputs: 1,
        guidance_scale: 5,
        num_inference_steps: 30,
      }
    })
  });

  if (!startResp.ok) {
    const e = await startResp.json().catch(() => ({})) as Record<string, string>;
    return err(e.detail || 'Lỗi khởi tạo Replicate.', 500);
  }

  const prediction = await startResp.json() as { id?: string; status?: string; output?: string | string[] };

  if (prediction.status === 'succeeded') {
    const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    return ok({ imageUrl: url });
  }

  const predId = prediction.id;
  if (!predId) return err('Không tạo được prediction ID.', 500);

  // Poll up to ~54s
  for (let i = 0; i < 27; i++) {
    await _sleep(2000);
    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { 'Authorization': `Bearer ${replKey}` }
    });
    if (!pollResp.ok) continue;
    const data = await pollResp.json() as { status?: string; output?: string | string[]; error?: string };
    if (data.status === 'succeeded') {
      const url = Array.isArray(data.output) ? data.output[0] : data.output;
      return ok({ imageUrl: url });
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      return err(data.error || 'Replicate xử lý thất bại.', 500);
    }
  }
  return err('Hết thời gian chờ. Vui lòng thử lại.', 504);
}

// ── Routes ───────────────────────────────────────────────────────

export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'analyze';
  const body = await parseBody(request) as Record<string, unknown>;
  if (action === 'analyze')             return handleAnalyze(request, body);
  if (action === 'ban-lam-viec')        return handleBanLamViec(request, body);
  if (action === 'cua-hang')            return handleCuaHang(request, body);
  if (action === 'mau-sac')            return handleMauSac(request, body);
  if (action === 'trang-phuc-tryon')   return handleTrangPhucTryon(request, body);
  if (action === 'phong-thuy-render')  return handlePhongThuyRender(request, body);
  return err('Invalid action', 400);
}
