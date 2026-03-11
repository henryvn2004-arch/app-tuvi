from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse
import re

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
    with urllib.request.urlopen(req, timeout=15) as resp:
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

def call_claude(api_key, la_so_text, ho_ten, nam_sinh, gioi_tinh, nam_xem):
    prompt = f"""Bạn là một chuyên gia Tử Vi Đẩu Số. Dưới đây là lá số tử vi của {ho_ten}, sinh năm {nam_sinh}, {'nam' if gioi_tinh == 'nam' else 'nữ'}, xem hạn năm {nam_xem}.

DỮ LIỆU LÁ SỐ TỪ KABALA.VN:
{la_so_text}

Hãy luận giải lá số theo cấu trúc sau:

## 🌟 TỔNG QUAN VẬN MỆNH

**Cung Mệnh & Bản Chất:**
[Phân tích cung mệnh, chính tinh, tính cách tổng quát]

**Sự Nghiệp & Tài Lộc:**
[Phân tích cung Quan Lộc, Tài Bạch]

**Tình Duyên & Gia Đình:**
[Phân tích cung Phu Thê, Tử Tức]

**Sức Khỏe:**
[Phân tích cung Tật Ách]

---

## 📅 VẬN HẠN NĂM {nam_xem}

**Đại Vận hiện tại:**
[Phân tích đại vận đang đi]

**Tiểu Hạn năm {nam_xem}:**
[Phân tích tiểu hạn, các sao lưu niên]

**Những điều cần lưu ý:**
[Cảnh báo và lời khuyên cụ thể cho năm {nam_xem}]

**Lời Khuyên:**
[Hướng dẫn thực tế để tận dụng vận tốt và hóa giải vận xấu]

Viết bằng tiếng Việt, rõ ràng, dễ hiểu, có chiều sâu. Phân tích ý nghĩa các sao, không liệt kê đơn thuần."""

    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}]
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
    with urllib.request.urlopen(req, timeout=60) as resp:
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

            api_key   = body.get('apiKey', '').strip()
            ho_ten    = body.get('hoTen', 'Bạn').strip()
            ngay      = body.get('ngay', '1')
            thang     = body.get('thang', '1')
            nam       = body.get('nam', '1990')
            gio       = body.get('gio', '0')
            phut      = body.get('phut', '0')
            gioi_tinh = body.get('gioiTinh', 'nam')
            nam_xem   = body.get('namXem', '2026')

            if not api_key.startswith('sk-ant-'):
                self._json(400, {"error": "API key không hợp lệ. Phải bắt đầu bằng sk-ant-"})
                return

            kabala_url = build_kabala_url(ho_ten, ngay, thang, nam, gio, phut, gioi_tinh, nam_xem)

            try:
                la_so_text = scrape_kabala(kabala_url)
            except Exception as e:
                self._json(500, {"error": f"Không thể lấy dữ liệu từ Kabala.vn: {str(e)}"})
                return

            if not la_so_text:
                self._json(500, {"error": "Không tìm thấy dữ liệu lá số từ Kabala.vn"})
                return

            try:
                luan_giai = call_claude(api_key, la_so_text, ho_ten, nam, gioi_tinh, nam_xem)
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
