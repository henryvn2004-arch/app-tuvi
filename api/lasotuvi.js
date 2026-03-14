const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || 'Bạn là nhà luận giải Tử Vi chuyên nghiệp.';

// Query để tìm tài liệu liên quan cho từng phần
const QUERIES = {
  1: (laSoText) => `lục thập hoa giáp tinh hệ tổng quan mệnh cục chính tinh khí chất cách cục pre-check`,
  2: (laSoText) => `luận giải 12 cung mệnh phụ mẫu phúc đức điền trạch quan lộc tài bạch phu thê tử tức tật ách`,
  3: (laSoText) => `đại vận thiên thời địa lợi nhân hòa scoring vận hạn VDTTL giai đoạn`,
  4: (laSoText) => `vận hiện tại tiểu hạn lưu niên lưu thái tuế lưu lộc sao lưu động`,
  5: (laSoText) => `tổng kết cuộc đời đại vận tốt xấu khuyến nghị hành động phúc đức`,
};

const PROMPTS = {
  1: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

MỤC ĐÍCH
Phân tích tổng thể cấu trúc lá số để xác định:
- khí thế cuộc đời
- bản chất con người
- xu hướng phát triển
- điểm mạnh và điểm yếu của lá số

Đây là bước định hình toàn bộ lá số trước khi đi vào từng cung và vận hạn.

--------------------------------

PHƯƠNG PHÁP LUẬN

NGUYÊN TẮC CỐT LÕI

Không luận sao rời rạc.
Mọi nhận định phải dựa trên tổng thể cách cục.

Thứ tự phân tích:

1. Thế đứng cung Mệnh trong 3 vòng:
   - vòng Thái Tuế
   - vòng Lộc Tồn
   - vòng Tràng Sinh

2. Cách cục / bộ sao

3. Chính tinh

4. Hóa tinh

5. Sát tinh

6. Phụ tinh

--------------------------------

Ý NGHĨA CUNG MỆNH TRONG 3 VÒNG

Ba vòng dùng để xác định:
- khí chất con người
- khí thế cuộc đời
- mức độ thuận nghịch của lá số

PHẢI xét ba vòng trước khi luận chính tinh.

--------------------------------

VÒNG THÁI TUẾ

Chia 4 bộ:

TUẾ – HỔ – PHÙ
(Thái Tuế, Bạch Hổ, Quan Phù)
→ khí cương, mạnh mẽ, dễ đứng đầu.

ÂM – LONG – TRỰC
(Thiếu Âm, Long Đức, Trực Phù)
→ khí hòa, mềm mỏng, dễ gặp quý nhân.

ĐÀO – KHÔNG – SÁT
(Đào Hoa, Thiên Không, Kiếp Sát)
→ khí động, cuộc đời nhiều biến động.

TANG – TUẾ – ĐIẾU
(Tang Môn, Tuế Phá, Điếu Khách)
→ khí trầm, nhiều thử thách.

--------------------------------

VÒNG LỘC TỒN

Chỉ phát huy đầy đủ với các tuổi:

Giáp Dần, Giáp Ngọ, Giáp Tuất
Ất Hợi, Ất Mão, Ất Mùi
Canh Thân, Canh Tý, Canh Thìn
Tân Tị, Tân Dậu, Tân Sửu

Nếu không thuộc các tuổi này
→ ảnh hưởng Lộc Tồn giảm.

--------------------------------

VÒNG TRÀNG SINH

Chia 4 nhóm:

SINH – VƯỢNG – MỘ
(Tràng Sinh, Đế Vượng, Mộ)
→ khí lực mạnh.

MỘC – SUY – TUYỆT
(Mộc Dục, Suy, Tuyệt)
→ khí lực yếu.

THAI – ĐỚI – BỆNH
(Thai, Quan Đới, Bệnh)
→ khí lực trung bình.

LÂM – TỬ – DƯỠNG
(Lâm Quan, Tử, Dưỡng)
→ cuộc đời nhiều biến chuyển.

--------------------------------

TAM PHƯƠNG TỨ CHÍNH

Khi luận một cung phải xét 4 cung:

- cung đang xét
- 2 cung tam hợp
- 1 cung xung chiếu

Tam hợp:

Mệnh – Tài Bạch – Quan Lộc
Phụ Mẫu – Nô Bộc – Tử Tức
Phúc Đức – Thiên Di – Phu Thê
Điền Trạch – Tật Ách – Huynh Đệ

Xung chiếu:

Mệnh – Thiên Di
Phụ Mẫu – Tật Ách
Phúc Đức – Tài Bạch
Điền Trạch – Tử Tức
Quan Lộc – Phu Thê
Nô Bộc – Huynh Đệ

Sai cấu trúc → không kết luận.

--------------------------------

QUY TRÌNH LUẬN

1. gom sao của 4 cung liên quan
2. tìm bộ sao / cách cục
3. xét chính tinh
4. xét hóa tinh
5. xét sát tinh
6. xét phụ tinh
7. đánh giá mạnh / trung / yếu

--------------------------------

ĐIỀU CHỈNH

Khi kết luận phải xét:

- âm dương
- ngũ hành
- mệnh và thân
- sinh khắc của sao

Gia giảm bằng:

- hóa tinh
- sát tinh

--------------------------------

OUTPUT

AI phải trả ra:

1. Tổng quan khí vận của lá số
2. Khí chất và bản chất con người
3. Xu hướng cuộc đời
4. Điểm mạnh của lá số
5. Điểm yếu và thử thách`,

  2: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

MỤC ĐÍCH
Phân tích chi tiết 12 cung trong lá số để hiểu các lĩnh vực của cuộc đời
Luận từng cung riêng nhưng phải đặt trong tổng thể lá số.

--------------------------------

DANH SÁCH 12 CUNG CẦN LUẬN

1. Cung Mệnh
2. Cung Phụ Mẫu
3. Cung Phúc Đức
4. Cung Điền Trạch
5. Cung Quan Lộc
6. Cung Nô Bộc
7. Cung Thiên Di
8. Cung Tật Ách
9. Cung Tài Bạch
10. Cung Tử Tức
11. Cung Phu Thê
12. Cung Huynh Đệ

Phải luận từng cung theo thứ tự.

--------------------------------

PHƯƠNG PHÁP LUẬN

Không luận sao riêng lẻ.
Mọi nhận định phải dựa trên tổng thể cách cục.

Khi luận một cung phải xét hệ thống 4 cung:

- cung đang xét
- 2 cung tam hợp
- 1 cung xung chiếu

--------------------------------

TAM HỢP

Mệnh – Tài Bạch – Quan Lộc  
Phụ Mẫu – Nô Bộc – Tử Tức  
Phúc Đức – Thiên Di – Phu Thê  
Điền Trạch – Tật Ách – Huynh Đệ  

--------------------------------

XUNG CHIẾU

Mệnh – Thiên Di  
Phụ Mẫu – Tật Ách  
Phúc Đức – Tài Bạch  
Điền Trạch – Tử Tức  
Quan Lộc – Phu Thê  
Nô Bộc – Huynh Đệ  

Nếu xác định sai cấu trúc cung → không kết luận.

--------------------------------

QUY TRÌNH LUẬN

1. gom toàn bộ sao của 4 cung liên quan
2. tìm bộ sao / cách cục
3. xét chính tinh
4. xét hóa tinh
5. xét sát tinh
6. xét phụ tinh
7. đánh giá mức độ:

- tốt
- trung bình
- yếu

--------------------------------

ĐIỀU CHỈNH

Khi kết luận phải xét:

- âm dương
- ngũ hành
- quan hệ mệnh – thân
- sinh khắc của sao

Gia giảm bằng:

- hóa tinh
- sát tinh

--------------------------------

OUTPUT

Với mỗi cung phải trả ra:

1. ý nghĩa của cung đó trong lá số
2. mức độ tốt / trung / yếu
3. ảnh hưởng tới cuộc đời
4. lời khuyên thực tế`,

  3: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

MỤC ĐÍCH
Phân tích toàn bộ các đại vận (mỗi vận 10 năm) để xác định:
- giai đoạn thuận lợi của cuộc đời
- giai đoạn khó khăn
- xu hướng thăng trầm theo thời gian

Luận từng đại vận nhưng luôn so sánh với cung Mệnh.

------------------------------------------------

PHƯƠNG PHÁP LUẬN

Đánh giá mỗi đại vận theo 3 tiêu chí:

1. THIÊN THỜI
2. ĐỊA LỢI
3. NHÂN HÒA

------------------------------------------------

1. THIÊN THỜI (chỉ xét TAM HỢP + NGŨ HÀNH)

Lấy HÀNH của TAM HỢP CUNG ĐẠI VẬN so với HÀNH của TAM HỢP TUỔI.

Quy tắc tam hợp → hành:

Thân – Tí – Thìn → Thủy  
Dần – Ngọ – Tuất → Hỏa  
Tỵ – Dậu – Sửu → Kim  
Hợi – Mão – Mùi → Mộc  

So sánh hành:

Đồng hành → ĐẮC Thiên Thời (5/5)

Sinh nhập → ĐẮC Thiên Thời (4/5)

Khắc xuất → Thiên Thời kém (3/5)

Sinh xuất → Thiên Thời kém (2/5)

Khắc nhập → MẤT Thiên Thời (1/5)

Thiên Thời chỉ xét cơ hội và xu hướng vận.
Không xét sao.

------------------------------------------------

2. ĐỊA LỢI

So sánh:

HÀNH CUNG ĐẠI VẬN ↔ HÀNH BẢN MỆNH

Quy tắc:

Mệnh sinh Cung / Cung sinh Mệnh  
→ ĐẮC Địa Lợi

Đồng hành  
→ Có Địa Lợi

Sinh xuất  
→ Hao lực

Khắc xuất  
→ Vất vả nhưng có thể thắng

Khắc nhập  
→ MẤT Địa Lợi

Địa Lợi thể hiện vị thế của bản thân trong vận.
Không xét sao.

------------------------------------------------

3. NHÂN HÒA (YẾU TỐ QUYẾT ĐỊNH)

So sánh BỘ CHÍNH TINH của:

(Mệnh + tam hợp)  
với  
(Đại vận + tam hợp)

Phân loại bộ sao:

Sát Phá Tham Liêm  
→ 100% thực hành

Tử Phủ Vũ Tướng Liêm  
→ 60% hành động / 40% lý thuyết

Cơ Nguyệt Đồng Lương  
→ 40% hành động / 60% lý thuyết

Cự Nhật  
→ 100% lý thuyết

Sau đó xét toàn bộ sao của:

- cung đại vận
- 2 cung tam hợp
- cung xung chiếu

Theo thứ tự:

Cách cục → Chính tinh → Hóa tinh → Sát tinh → Phụ tinh

Tra cứu ý nghĩa vận trong:
[A_LUAT_GOC] GIAI DOAN VAN HAN THEO VDTTL

Lưu ý:

Sau 30 tuổi:
- sao Triệt giảm tác dụng
- sao Tuần phát huy tác dụng

Triệt đóng cung Kim → Triệt đáo Kim cung (có thể tốt)

Tuần đóng cung Hỏa → Tuần lâm Hỏa địa (có thể tốt)

Kết luận Nhân Hòa:

Cùng bộ / gần tỷ lệ  
→ Nhân Hòa tốt

Chênh lệch vừa  
→ Nhân Hòa trung bình

Chênh lệch cực đoan  
→ Nhân Hòa xấu

Nếu Nhân Hòa xấu  
→ không được kết luận vận tốt dù Thiên Thời và Địa Lợi đẹp.

------------------------------------------------

SCORE & FLAG

Mỗi đại vận phải:

Chấm điểm vận:  
0 – 10

Gắn cảnh báo:

GREEN → vận tốt  
ORANGE → vận trung bình  
RED → vận khó khăn

Không dùng từ trung tính để che vận xấu.

------------------------------------------------

OUTPUT

Lập bảng đánh giá tốt/ xấu từng đại vận, gồm:

1. Đánh giá Thiên Thời – Địa Lợi – Nhân Hòa
2. SCORE (0–10)
3. FLAG (GREEN / ORANGE / RED)
4. Kết luận vận tốt / xấu / mức độ
5. Giải thích các sự kiện chính xảy ra trong đại vận đó: công danh, sự nghiệp, tài chính, gia đình, sức khỏe,...`,

  4: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

MỤC ĐÍCH
Phân tích chi tiết đại vận hiện tại (10 năm đang trải qua) để hiểu:
- bản chất vận đang sống
- cơ hội và khó khăn của giai đoạn này
- ảnh hưởng của vận đến tài chính, công danh, gia đình, sức khỏe và các mối quan hệ.

------------------------------------------------

PHƯƠNG PHÁP LUẬN

Đánh giá đại vận theo ba tiêu chí:

1. THIÊN THỜI
2. ĐỊA LỢI
3. NHÂN HÒA

------------------------------------------------

1. THIÊN THỜI

So sánh HÀNH của TAM HỢP CUNG ĐẠI VẬN với HÀNH của TAM HỢP TUỔI.

Quy tắc tam hợp → hành:

Thân – Tí – Thìn → Thủy  
Dần – Ngọ – Tuất → Hỏa  
Tỵ – Dậu – Sửu → Kim  
Hợi – Mão – Mùi → Mộc  

Kết luận:

Đồng hành → ĐẮC Thiên Thời (5/5)  
Sinh nhập → ĐẮC Thiên Thời (4/5)  
Khắc xuất → Thiên Thời kém (3/5)  
Sinh xuất → Thiên Thời kém (2/5)  
Khắc nhập → MẤT Thiên Thời (1/5)

Thiên Thời chỉ xét cơ hội và xu hướng vận.
Không xét sao.

------------------------------------------------

2. ĐỊA LỢI

So sánh:

HÀNH CUNG ĐẠI VẬN ↔ HÀNH BẢN MỆNH

Quy tắc:

Mệnh sinh Cung / Cung sinh Mệnh → ĐẮC Địa Lợi  
Đồng hành → Có Địa Lợi  
Sinh xuất → Hao lực  
Khắc xuất → Vất vả nhưng có thể thắng  
Khắc nhập → MẤT Địa Lợi

Địa Lợi phản ánh vị thế và sức chịu đựng của bản thân trong vận.
Không xét sao.

------------------------------------------------

3. NHÂN HÒA (QUYẾT ĐỊNH KẾT QUẢ)

So sánh bộ chính tinh của:

(Mệnh + tam hợp)  
với  
(Đại vận + tam hợp)

Phân loại bộ sao:

Sát Phá Tham Liêm → thiên về hành động mạnh  
Tử Phủ Vũ Tướng Liêm → cân bằng hành động và chiến lược  
Cơ Nguyệt Đồng Lương → thiên về tư duy và kế hoạch  
Cự Nhật → thiên về lý luận và học thuật

------------------------------------------------

PHÂN TÍCH CÁCH CỤC SAO CỦA ĐẠI VẬN

Phải xét toàn bộ sao của 4 cung:

- cung đại vận
- 2 cung tam hợp
- 1 cung xung chiếu

Quy trình:

1. gom toàn bộ sao của 4 cung
2. xác định bộ sao / cách cục
3. xét chính tinh
4. xét hóa tinh
5. xét sát tinh
6. xét phụ tinh

Sau đó xác định cách cục của vận đang hình thành.

------------------------------------------------

LUẬN ẢNH HƯỞNG CỦA CÁCH CỤC VẬN

Dựa vào tổ hợp sao để đánh giá tác động của vận lên các lĩnh vực:

Tài chính  
→ khả năng kiếm tiền, tích lũy, hao tán.

Công danh / sự nghiệp  
→ cơ hội thăng tiến, thay đổi nghề nghiệp.

Gia đình / hôn nhân  
→ ổn định, biến động hay mâu thuẫn.

Quan hệ xã hội  
→ quý nhân, bạn bè, đối tác.

Sức khỏe  
→ áp lực, bệnh tật, hoặc cải thiện thể chất.

------------------------------------------------

LƯU Ý

Sau 30 tuổi:

- sao Triệt giảm tác dụng
- sao Tuần phát huy tác dụng

Triệt đóng cung Kim → có thể hóa giải xấu  
Tuần đóng cung Hỏa → có thể giảm hung.

------------------------------------------------

SCORE & FLAG

Chấm điểm đại vận:

0 – 10

Gắn cảnh báo:

GREEN → vận tốt  
ORANGE → vận trung bình  
RED → vận khó khăn

Nếu Nhân Hòa xấu → không kết luận vận tốt dù Thiên Thời và Địa Lợi đẹp.

------------------------------------------------

OUTPUT

Phải trả ra:

1. bản chất của đại vận hiện tại
2. đánh giá Thiên Thời – Địa Lợi – Nhân Hòa
3. phân tích cách cục sao của vận
4. ảnh hưởng của vận tới:
   - tài chính
   - công danh
   - gia đình
   - sức khỏe
5. SCORE (0–10)
6. FLAG (GREEN / ORANGE / RED)
7. khuyến nghị hành động (nên / không nên)`,

  5: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

MỤC ĐÍCH
Phân tích vận khí của năm hiện tại (tiểu vận / lưu niên) để xác định:
- xu hướng tốt xấu của năm
- lĩnh vực cuộc sống dễ thay đổi
- cơ hội và rủi ro trong năm

------------------------------------------------

NGUYÊN TẮC CHUNG

Tính chất của năm chịu ảnh hưởng chủ yếu bởi đại vận.

Quy tắc:

80% → tính chất đại vận đang đi  
20% → ảnh hưởng của tiểu vận (lưu niên)

Do đó phải xét:

1. đại vận đang sống
2. cung tiểu vận của năm
3. cách cục sao của tiểu vận

------------------------------------------------

BƯỚC 1 – XÁC ĐỊNH ĐẠI VẬN

Xác định năm hiện tại nằm trong đại vận nào.

Phân tích bản chất của đại vận đó:

- tốt / trung bình / khó khăn
- xu hướng chung của giai đoạn

Kết luận:

Đại vận quyết định phần lớn tính tốt xấu của năm.

------------------------------------------------

BƯỚC 2 – XÁC ĐỊNH TIỂU VẬN

Xác định cung của năm (lưu niên).

Ví dụ:

năm Giáp Tý  
→ tiểu vận nằm tại cung Tý.

Cung đó chính là **cung tiểu vận của năm**.

------------------------------------------------

BƯỚC 3 – TAM PHƯƠNG TỨ CHÍNH

Khi xét tiểu vận phải xét 4 cung:

- cung tiểu vận
- 2 cung tam hợp
- 1 cung xung chiếu

Tam hợp:

Mệnh – Tài Bạch – Quan Lộc  
Phụ Mẫu – Nô Bộc – Tử Tức  
Phúc Đức – Thiên Di – Phu Thê  
Điền Trạch – Tật Ách – Huynh Đệ  

Xung chiếu:

Mệnh – Thiên Di  
Phụ Mẫu – Tật Ách  
Phúc Đức – Tài Bạch  
Điền Trạch – Tử Tức  
Quan Lộc – Phu Thê  
Nô Bộc – Huynh Đệ  

------------------------------------------------

BƯỚC 4 – PHÂN TÍCH SAO

Gom toàn bộ sao của:

- cung tiểu vận
- 2 cung tam hợp
- cung xung chiếu

Sau đó phân tích theo thứ tự:

1. cách cục / bộ sao
2. chính tinh
3. hóa tinh
4. sát tinh
5. phụ tinh

Xác định cách cục của năm.

------------------------------------------------

BƯỚC 5 – LUẬN BIẾN ĐỘNG CỦA NĂM

Dựa trên cách cục sao để xác định các thay đổi có thể xảy ra:

Tài chính  
→ kiếm tiền, hao tán, đầu tư.

Công danh / công việc  
→ thăng tiến, thay đổi, áp lực.

Gia đình / hôn nhân  
→ ổn định hoặc mâu thuẫn.

Quan hệ xã hội  
→ quý nhân hoặc tiểu nhân.

Sức khỏe  
→ áp lực, bệnh tật hoặc cải thiện.

------------------------------------------------

KẾT LUẬN

Phải kết hợp:

- tính chất của đại vận
- cách cục sao của tiểu vận

để đưa ra kết luận cuối cùng về vận năm.

------------------------------------------------

OUTPUT

AI phải trả ra:

1. tổng quan vận năm
2. ảnh hưởng của đại vận lên năm
3. cách cục sao của tiểu vận
4. lĩnh vực dễ biến động:
   - tài chính
   - công danh
   - gia đình
   - sức khỏe
5. mức độ thuận lợi của năm
6. lời khuyên nên / không nên trong năm`,
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const setHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  };

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { hoTen = 'Bạn', nam, gioiTinh, namXem, laSoText, phan = 1, docs = '', engineResult = '' } = body;

    const apiKey = ANTHROPIC_API_KEY;
    if (!apiKey) { setHeaders(res); return res.status(500).json({ error: 'Thiếu ANTHROPIC_API_KEY.' }); }
    if (!laSoText) { setHeaders(res); return res.status(400).json({ error: 'Không có dữ liệu lá số.' }); }

    const gioi = gioiTinh === 'nam' ? 'nam' : 'nữ';
    const ctx = `Lá số của: ${hoTen}, sinh năm ${nam}, ${gioi}, năm xem: ${namXem || new Date().getFullYear()}.

DỮ LIỆU LÁ SỐ:
${laSoText}${engineResult ? '\n\n' + engineResult : ''}`;

    const promptFn = PROMPTS[phan] || PROMPTS[1];
    const userPrompt = promptFn(ctx, docs || '(Không có tài liệu tham khảo)');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      if (err.includes('overloaded')) setHeaders(res); return res.status(503).json({ error: 'Claude đang bận, thử lại sau 30 giây.' });
      setHeaders(res); return res.status(500).json({ error: `Lỗi Claude API: ${err.slice(0, 200)}` });
    }

    const data = await resp.json();
    setHeaders(res); return res.status(200).json({ luanGiai: data.content[0].text });

  } catch (e) {
    setHeaders(res); return res.status(500).json({ error: `Lỗi server: ${e.message}` });
  }
}
