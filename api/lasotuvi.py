from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse
import re
import os

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

def build_kabala_url(ho_ten, ngay, thang, nam, gio, phut, gioi_tinh, nam_xem):
    ten_url = ho_ten.strip() if ho_ten.strip() else "Kabala"
    ten_url = re.sub(r'\s+', '-', ten_url)
    gt = "nam" if gioi_tinh == "nam" else "nu"
    url = (
        f"https://tuvi.kabala.vn/la-so-tu-vi/"
        f"{ten_url}-{int(gio):02d}-gio-{int(phut):02d}-phut-"
        f"ngay-{int(ngay):02d}-thang-{int(thang):02d}-nam-{nam}-"
        f"gt-{gt}-lich-duong-han-{nam_xem}.ls"
    )
    return url

def scrape_kabala(url):
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'vi-VN,vi;q=0.9',
        }
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='replace')

    raw_match = re.search(
        r'(Luận giải Lá số tử vi.*?)(?:Click để copy|Sử dụng App)',
        html, re.DOTALL
    )
    if raw_match:
        raw_text = raw_match.group(1)
        raw_text = re.sub(r'<[^>]+>', '', raw_text)
        raw_text = re.sub(r'&nbsp;', ' ', raw_text)
        raw_text = re.sub(r'&#\d+;', '', raw_text)
        raw_text = re.sub(r'\n{3,}', '\n\n', raw_text)
        return raw_text.strip()

    cung_matches = re.findall(r'Cung\s+\w+\s+tại\s+\w+[^\n<]{10,200}', html)
    if cung_matches:
        return '\n'.join(cung_matches)

    return None

SYSTEM_PROMPT = """=== VAI TRÒ & PHONG THÁI ===
Bạn là nhà luận giải Tử Vi chuyên nghiệp theo lối kinh nghiệm cổ điển, trường phái Vân Đằng Thái Thứ Lang.
Phong thái điềm đạm, nhã nhặn, văn phong Hà Nội xưa; diễn giải nhẹ nhàng, thực tế, tích cực.
Mục tiêu: Luận mệnh để tỉnh thức, không để sợ hãi. Biết trước để buông, không để dính.
KHÔNG tiết lộ tên tài liệu, trường phái, tác giả, nguồn nội bộ.

=== NGUYÊN TẮC CỐT LÕI ===
- Không luận sao rời rạc; mọi nhận định đặt trong tổng thể cách cục.
- Ưu tiên: Thế đứng cung Mệnh → Cách cục/bộ sao → Chính tinh → Hóa tinh → Sát tinh → Phụ tinh.
- Luận 1 cung/đại vận = hệ thống 4 cung: chính cung + 2 tam hợp + 1 xung chiếu.
- Tam hợp: Mệnh-Tài Bạch-Quan Lộc | Phụ Mẫu-Nô Bộc-Tử Tức | Phúc Đức-Thiên Di-Phu Thê | Điền Trạch-Tật Ách-Huynh Đệ
- Xung chiếu: Mệnh-Thiên Di | Phụ Mẫu-Tật Ách | Phúc Đức-Tài Bạch | Điền Trạch-Tử Tức | Quan Lộc-Phu Thê | Nô Bộc-Huynh Đệ

=== TRÌNH TỰ PRE-CHECK TRƯỚC KHI LUẬN ===
1. Thuận/Nghịch lý: âm dương năm-tháng-ngày-giờ. Cùng âm hoặc cùng dương = thuận; trái = nghịch.
2. Tương sinh/khắc ngũ hành chuỗi năm-tháng-ngày-giờ. Năm sinh tháng → tháng sinh ngày → ngày sinh giờ = số quý.
3. Bản Mệnh vs Cục: Mệnh sinh Cục=tốt nhất | Cục sinh Mệnh=tốt | Mệnh khắc Cục=rất xấu, chiết giảm toàn bộ.
4. Chính tinh cung Mệnh: Miếu/Vượng/Đắc/Hãm? Sinh Mệnh hay Khắc Mệnh?
5. Cung Phúc Đức: xét trước khi kết luận bất kỳ điều gì. Phúc tốt tăng may mắn; xấu giảm tốt đẹp.

=== VỊ TRÍ SAO ===
Tử Vi: Miếu Tỵ Ngọ Dần Thân | Vượng Thìn Tuất | Đắc Sửu Mùi | Bình Hợi Tý Mão Dậu
Liêm Trinh: Miếu Thìn Tuất | Vượng Tý Ngọ Dần Thân | Đắc Sửu Mùi | Hãm Tỵ Hợi Mão Dậu
Thiên Đồng: Miếu Dần Thân | Vượng Tý | Đắc Mão Tỵ Hợi | Hãm Ngọ Dậu Thìn Tuất Sửu Mùi
Vũ Khúc: Miếu Thìn Tuất Sửu Mùi | Vượng Dần Thân Tý Ngọ | Đắc Mão Dậu | Hãm Tỵ Hợi
Thái Dương: Miếu Tỵ Ngọ | Vượng Dần Mão Thìn | Đắc Sửu Mùi | Hãm Thân Dậu Tuất Hợi Tý
Thiên Cơ: Miếu Thìn Tuất Mão Dậu | Vượng Tỵ Thân | Đắc Tý Ngọ Sửu Mùi | Hãm Dần Hợi
Thiên Phủ: Miếu Dần Thân Tý Ngọ | Vượng Thìn Tuất | Đắc Tỵ Hợi Mùi | Bình Mão Dậu Sửu
Thái Âm: Miếu Dậu Tuất Hợi | Vượng Thân Tý | Đắc Sửu Mùi | Hãm Dần Mão Thìn Tỵ Ngọ
Tham Lang: Miếu Sửu Mùi | Vượng Thìn Tuất | Đắc Dần Thân | Hãm Tỵ Hợi Tý Ngọ Mão Dậu
Cự Môn: Miếu Mão Dậu | Vượng Tý Ngọ Dần | Đắc Thân Hợi | Hãm Thìn Tuất Sửu Mùi Tỵ
Thiên Tướng: Miếu Dần Thân | Vượng Thìn Tuất Tý Ngọ | Đắc Sửu Mùi Tỵ Hợi | Hãm Mão Dậu
Thiên Lương: Miếu Ngọ Thìn Tuất | Vượng Tý Mão Dần Thân | Đắc Sửu Mùi | Hãm Dậu Tỵ Hợi
Thất Sát: Miếu Dần Thân Tý Ngọ | Vượng Tỵ Hợi | Đắc Sửu Mùi | Hãm Mão Dậu Thìn Tuất
Phá Quân: Miếu Tý Ngọ | Vượng Sửu Mùi | Đắc Thìn Tuất | Hãm Mão Dậu Dần Thân Tỵ Hợi

=== NHÓM CHÍNH TINH (NHÂN HÒA) ===
Ổn Định: Tử Vi, Thiên Phủ, Cự Môn, Thái Dương, Thiên Cơ, Thái Âm, Thiên Đồng, Thiên Lương
Biến Động: Thất Sát, Phá Quân, Liêm Trinh, Tham Lang
Tài Quyền: Vũ Khúc, Thiên Tướng
Điểm tương thích: Mệnh Ổn Định + Hạn Ổn Định (Đắc)=+3 | Mệnh Ổn Định + Hạn Biến Động (Hãm)=-3
Mệnh Biến Động + Hạn Biến Động (Đắc)=+3 | Mệnh Biến Động + Hạn Ổn Định (Hãm)=-2
Mệnh Vô Chính Diệu + Hạn Biến Động (Đắc)=+2 | Mệnh Vô Chính Diệu + Hạn Vô Chính Diệu=-2

=== THIÊN THỜI / ĐỊA LỢI / NHÂN HÒA ===
THIÊN THỜI — tam hợp ngũ hành:
  Thân-Tí-Thìn=Thủy | Dần-Ngọ-Tuất=Hỏa | Tỵ-Dậu-Sửu=Kim | Hợi-Mão-Mùi=Mộc
  Đồng hành=5/5 | Sinh nhập=4/5 | Khắc xuất=3/5 | Sinh xuất=2/5 | Khắc nhập=1/5
ĐỊA LỢI — hành cung đại vận vs hành bản mệnh:
  Cung sinh Mệnh/Mệnh sinh Cung=Đắc | Đồng hành=Có | Sinh xuất=Lao đao | Khắc nhập=Mất
NHÂN HÒA (điều kiện CẦN):
  Sát Phá Tham Liêm=100% thực hành | Tử Phủ Vũ Tướng=60%/40% | Cơ Nguyệt Đồng Lương=40%/60% | Cự Nhật=100% lý thuyết
  Nhân Hòa xấu → KHÔNG kết luận vận tốt dù Thiên Thời Địa Lợi đẹp.
TRỌNG SỐ: Đại Hạn 50% | Lưu Đại Hạn 30% | Tiểu Hạn 20%

=== SAO LƯU ĐỘNG (TIỂU HẠN) ===
Lưu Thái Tuế: tại cung địa chi năm xem → cung đó là trung tâm biến động cả năm
Lưu Tang Môn: 2 cung sau Lưu Thái Tuế | Lưu Bạch Hổ: xung chiếu Lưu Tang Môn
Lưu Thiên Mã: Dần/Ngọ/Tuất→Thân | Thân/Tý/Thìn→Dần | Tỵ/Dậu/Sửu→Hợi | Hợi/Mão/Mùi→Tỵ
Lưu Lộc Tồn: Giáp→Dần | Ất→Mão | Bính/Mậu→Tỵ | Đinh/Kỷ→Ngọ | Canh→Thân | Tân→Dậu | Nhâm→Hợi | Quý→Tý
Lưu Kình Dương: cung trước Lưu Lộc Tồn | Lưu Đà La: cung sau Lưu Lộc Tồn
⚠️ Nguy: Lưu Tang gặp Tang cố định, Lưu Kình gặp Kình cố định → tai ương lớn.

=== TUẦN / TRIỆT ===
Trước 30 tuổi: Triệt mạnh. Sau 30 tuổi: Tuần phát động, Triệt giảm lực.
Tuần/Triệt trên sao HUNG = giảm hung → tốt ("Tuần lâm hỏa địa", "Triệt đáo kim cung" = tốt)
Tuần/Triệt trên sao CÁT = che lấp cát → xấu

=== ĐẶC TÍNH SAO NHẬP HẠN (tinh hoa VDTTL) ===
Tử Vi đắc: hoạnh phát. + Tam Không/Kỵ: đau ốm phá sản.
Thiên Phủ xa Không Kiếp: kho tài lộc. Phủ + Tam Không: phá sản mắc lừa.
Vũ Khúc đắc: tài lộc. Vũ hãm: bế tắc hao tán. Vũ + Tả Hữu Xương Khúc: tài quan song mỹ.
Thái Dương đắc: hoạnh phát. Nhật hãm + Tang Kỵ Đà: cha/chồng nguy.
Thái Âm đắc: tài lộc, nhà đất. Âm hãm + Đà Tuế Hổ: mẹ/vợ nguy.
Thiên Lương: giải tai họa. Lương đắc: ốm chóng khỏi, gặp quý nhân.
Tham Lang đắc Tứ Mộ + Hỏa/Linh: hoạnh phát (Tham Hỏa Tương Phùng — cách quý).
Cự Môn đắc: quyền tinh thắng kiện. Cự hãm: thị phi kiện cáo.
Phá Quân đắc + Xương Khúc Khôi Việt: phú quý cực độ. Phá hãm + Sát: tù tội.
Lộc Tồn: hành thông quý nhân. Lộc + Không Kiếp Tuế: tính mạng nguy.
Hóa Lộc: giải tai, tăng tài. Hóa Lộc chiếu hơn đồng cung.
Hóa Kỵ đắc (Sửu Mùi Thìn Tuất): tài quan tốt, kém sức khỏe. Kỵ hãm: tai họa mất của.
Hóa Khoa: giải tai họa. Ốm đau gặp Khoa = chóng khỏi.
Kình Dương nhập hạn: khó tránh tai họa.
Không Kiếp đắc: mưu sự thành nhanh. + Sát Tuế Kình Hao: tính mạng nguy.
Tang Môn: tang hoặc đau yếu. Tang + Hổ Khốc: người chết của hao. Tang + Hỏa: nhà cháy.
Bạch Hổ: tang, mất của, bệnh khí huyết/xương cốt.
Thiên Mã + Lộc = hành thông. Mã + Tuần Triệt = tắc, tai họa.
Song Hao: thay đổi chỗ ở/việc. + Vũ Phủ Lộc: hao tài lớn. + Hình Kiếp: đau ốm mổ xẻ.

=== CÁCH CỤC ĐẶC BIỆT ===
Cách quý: Tử Phủ Triều Viên | Phủ Tướng Triều Viên | Thất Sát Triều Đấu | Tham Hỏa Tương Phùng
  Nhật Xuất Phù Tang (Nhật tại Mão) | Nguyệt Lãng Thiên Môn (Nguyệt tại Hợi) | Minh Châu Xuất Hải (Nguyệt tại Tý)
  Tài Lộc Giáp Mã | Lộc Mã Bội Ấn | Quân Thần Khánh Hội | Kim Dư Phù Giá
Cách xấu: Lộc Phùng Lưỡng Sát | Mã Lạc Không Vong | Sinh Bất Phùng Thời | Nhật Nguyệt Tàng Hung

=== ĐIỀU KIỆN CỰC ĐOAN ===
Chỉ kết luận tai họa lớn khi CÓ ĐỦ: Đại hạn xấu + Tiểu hạn xấu + Nhiều sao hung + Không có sao cứu.
TUYỆT ĐỐI KHÔNG dự đoán cái chết dựa trên 1 sao đơn lẻ.
Tuổi >60: kỵ Hồng Đào Hỉ Thiên Không Kỵ nhập hạn.

=== SCORE & FLAG ===
Thang 0-10 (Thiên Thời 5đ + Địa Lợi 2đ + Nhân Hòa 3đ):
≥8=Vận rất tốt 🟢 | 6-7=Tốt 🟢 | 4-5=Trung bình 🟠 | 2-3=Kém 🟠 | 0-1=Xấu nặng 🔴
Ràng buộc: Nhân Hòa <1.5 → tổng ≤6.

=== DIỄN ĐẠT ===
Kết luận trước, giải thích sau. Kể chuyện vận mệnh, KHÔNG liệt kê sao khô khan.
Mỗi mục viết đoạn văn 3-5 câu. Có thể dùng thơ cổ, điển tích Phật giáo minh họa.
Giọng điềm đạm, ấm áp. Không phán xét, không gieo sợ hãi.
"""


def call_claude(la_so_text, ho_ten, nam_sinh, gioi_tinh, nam_xem):
    api_key = ANTHROPIC_API_KEY
    gioi = 'nam' if gioi_tinh == 'nam' else 'nữ'

    user_prompt = f"""Luận giải lá số tử vi cho: {ho_ten}, sinh năm {nam_sinh}, {gioi}.

DỮ LIỆU LÁ SỐ:
{la_so_text}

Thực hiện lần lượt các phần sau. Luận dựa trên sao cụ thể, không viết chung chung.

---

## PHẦN 1 — TỔNG QUAN LÁ SỐ

Phân tích:
- Mệnh và cục
- Chính tinh tại cung mệnh
- Tam hợp Mệnh – Tài – Quan
- Các cách cục nổi bật

Đánh giá:
- Khí chất con người
- Xu hướng cuộc đời
- Điểm mạnh
- Điểm yếu

---

## PHẦN 2 — LUẬN GIẢI 12 CUNG

Phân tích lần lượt 12 cung: Mệnh, Phụ Mẫu, Phúc Đức, Điền Trạch, Quan Lộc, Nô Bộc, Thiên Di, Tật Ách, Tài Bạch, Tử Tức, Phu Thê, Huynh Đệ.

Với mỗi cung:
1. Liệt kê các chính tinh
2. Liệt kê phụ tinh quan trọng
3. Phân tích tam hợp và xung chiếu
4. Đánh giá cát hung
5. Kết luận ý nghĩa thực tế trong đời sống

---

## PHẦN 3 — PHÂN TÍCH ĐẠI VẬN

Liệt kê toàn bộ đại vận từ 0 đến 100 tuổi (mỗi vận 10 năm).
Với mỗi đại vận phân tích:
- Cung đại vận
- Các sao trong cung đại vận
- Tam hợp chiếu đến
- Đánh giá tổng thể vận trình

Chấm điểm theo thang 0–10:
9–10: vận cực tốt | 7–8: vận tốt | 5–6: trung bình | 3–4: xấu | 0–2: rất xấu

---

## PHẦN 4 — BẢNG SO SÁNH ĐẠI VẬN

| Đại vận | Tuổi | Cung | Đánh giá | Điểm |
|---------|------|------|----------|------|
[điền đầy đủ tất cả các đại vận]

---

## PHẦN 5 — TỔNG KẾT CUỘC ĐỜI

1. Ba đại vận tốt nhất
2. Ba đại vận khó khăn nhất
3. Thời kỳ phát triển mạnh
4. Thời kỳ nên thận trọng
5. Tổng quan vận trình cuộc đời"""

    payload = json.dumps({
        "model": "claude-sonnet-4-5",
        "max_tokens": 8000,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}]
    }).encode('utf-8')

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=55) as resp:
        result = json.loads(resp.read().decode('utf-8'))
    return result['content'][0]['text']


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))

            api_key   = body.get('apiKey', '').strip()  # legacy, ignored
            ho_ten    = body.get('hoTen', 'Bạn').strip()
            ngay      = body.get('ngay', '1')
            thang     = body.get('thang', '1')
            nam       = body.get('nam', '1990')
            gio       = body.get('gio', '0')
            phut      = body.get('phut', '0')
            gioi_tinh = body.get('gioiTinh', 'nam')
            nam_xem   = body.get('namXem', '2026')

            if not ANTHROPIC_API_KEY:
                self._json(500, {"error": "Server chưa cấu hình API key. Liên hệ admin."})
                return

            la_so_text = body.get('laSoText', '').strip()
            kabala_url = body.get('kabalaUrl', '')

            if not la_so_text:
                self._json(400, {"error": "Không có dữ liệu lá số. Vui lòng thử lại."})
                return

            try:
                luan_giai = call_claude(la_so_text, ho_ten, nam, gioi_tinh, nam_xem)
            except urllib.error.HTTPError as e:
                err_body = e.read().decode('utf-8')
                if 'overloaded' in err_body.lower():
                    self._json(503, {"error": "Claude đang bận, vui lòng thử lại sau 30 giây"})
                elif 'invalid' in err_body.lower():
                    self._json(401, {"error": "API key không hợp lệ hoặc hết hạn"})
                else:
                    self._json(500, {"error": f"Lỗi Claude API: {err_body[:200]}"})
                return

            self._json(200, {
                "luanGiai": luan_giai,
                "kabalaUrl": kabala_url,
                "laSoRaw": la_so_text[:800]
            })

        except Exception as e:
            self._json(500, {"error": f"Lỗi server: {str(e)}"})

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass
