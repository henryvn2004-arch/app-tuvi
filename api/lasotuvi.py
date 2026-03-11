from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.parse

# ─── Thư viện an sao Tử Vi (port từ doanguyen/lasotuvi) ───

CAN  = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']
CHI  = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']
CUNG_TEN = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']
TEN_CUNG_CUNG = ['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Huynh Đệ','Thê Thiếp']

NAP_AM_60 = [
    'Kim','Kim','Hỏa','Hỏa','Mộc','Mộc','Thủy','Thủy','Thổ','Thổ',
    'Thổ','Thổ','Kim','Kim','Hỏa','Hỏa','Mộc','Mộc','Thủy','Thủy',
    'Thổ','Thổ','Kim','Kim','Hỏa','Hỏa','Mộc','Mộc','Thủy','Thủy',
    'Thổ','Thổ','Kim','Kim','Hỏa','Hỏa','Mộc','Mộc','Thủy','Thủy',
    'Thổ','Thổ','Kim','Kim','Hỏa','Hỏa','Mộc','Mộc','Thủy','Thủy',
    'Thổ','Thổ','Kim','Kim','Hỏa','Hỏa','Mộc','Mộc','Thủy','Thủy',
]

import math

def jd_from_date(d, m, y):
    a = (14 - m) // 12
    yr = y + 4800 - a
    mo = m + 12 * a - 3
    return d + (153*mo+2)//5 + 365*yr + yr//4 - yr//100 + yr//400 - 32045

def new_moon(k):
    T = k / 1236.85
    T2 = T*T; T3 = T2*T
    Jde = (2415020.75933 + 29.53058868*k + 0.0001178*T2 - 0.000000155*T3
           + 0.00033*math.sin(math.radians(166.56 + 132.87*T - 0.009173*T2)))
    M   = math.radians((359.2242 + 29.10535608*k - 0.0000333*T2 - 0.00000347*T3) % 360)
    Mpr = math.radians((306.0253 + 385.81691806*k + 0.0107306*T2 + 0.00001236*T3) % 360)
    F   = math.radians((21.2964  + 390.67050646*k - 0.0016528*T2 - 0.00000239*T3) % 360)
    dJ = ((0.1734 - 0.000393*T)*math.sin(M) + 0.0021*math.sin(2*M)
          - 0.4068*math.sin(Mpr) + 0.0161*math.sin(2*Mpr) - 0.0004*math.sin(3*Mpr)
          + 0.0104*math.sin(2*F) - 0.0051*math.sin(M+Mpr) - 0.0074*math.sin(M-Mpr)
          + 0.0004*math.sin(2*F+M) - 0.0004*math.sin(2*F-M)
          - 0.0006*math.sin(2*F+Mpr) + 0.0010*math.sin(2*F-Mpr)
          + 0.0005*math.sin(M+2*Mpr))
    return Jde + dJ

def sun_longitude(jdn):
    T = (jdn - 2451545.0) / 36525
    L0 = (280.46646 + 36000.76983*T + 0.0003032*T*T) % 360
    M  = math.radians((357.52911 + 35999.05029*T - 0.0001537*T*T) % 360)
    C  = ((1.914602 - 0.004817*T - 0.000014*T*T)*math.sin(M)
          + (0.019993 - 0.000101*T)*math.sin(2*M)
          + 0.000289*math.sin(3*M))
    theta = L0 + C
    omega = 125.04 - 1934.136*T
    lam = (theta - 0.00569 - 0.00478*math.sin(math.radians(omega))) % 360
    return lam

def get_new_moon_day(k, tz=7):
    return int(new_moon(k) + 0.5 + tz/24)

def get_lunar_month11(yy, tz=7):
    off = jd_from_date(31, 12, yy) - 2415021
    k = int(off / 29.530588853)
    nm = get_new_moon_day(k, tz)
    sun_long = int(sun_longitude(nm + 0.5 - tz/24) / 30)
    if sun_long >= 9:
        nm = get_new_moon_day(k+1, tz)
    return nm

def get_leap_month_offset(a11, tz=7):
    k = round((a11 - 2415021.076998695) / 29.530588853)
    i, last = 1, 0
    arc = int(sun_longitude(get_new_moon_day(k+i, tz) + 0.5 - tz/24) / 30)
    while arc != last and i < 14:
        last = arc
        i += 1
        arc = int(sun_longitude(get_new_moon_day(k+i, tz) + 0.5 - tz/24) / 30)
    return i - 1

def solar_to_lunar(dd, mm, yy, tz=7):
    day_number = jd_from_date(dd, mm, yy)
    k = int((day_number - 2415021.076998695) / 29.530588853)
    month_start = get_new_moon_day(k+1, tz)
    if month_start > day_number:
        month_start = get_new_moon_day(k, tz)
    a11 = get_lunar_month11(yy, tz)
    b11 = get_lunar_month11(yy+1, tz)
    lunar_day = day_number - month_start + 1
    diff = round((month_start - a11) / 29)
    is_leap = False
    leap11 = round((b11 - a11) / 29) == 13
    if leap11:
        leap_off = get_leap_month_offset(a11, tz)
        leap_month = leap_off - (1 if leap_off >= 11 else -1)
        if diff >= leap_off - 1 and diff < leap_off + 1:
            lunar_month = leap_month
            is_leap = True
        else:
            lunar_month = diff + (0 if diff >= leap_off else 1)
            if lunar_month > 12:
                lunar_month -= 12
    else:
        lunar_month = diff + 1
        if lunar_month > 12:
            lunar_month -= 12
    lunar_year = yy - 1 if (lunar_month >= 11 and diff < 4) else yy
    return lunar_day, lunar_month, lunar_year, is_leap

def get_can_chi(year):
    can = CAN[(year - 4) % 10]
    chi = CHI[(year - 4) % 12]
    return f"{can} {chi}"

def get_nap_am(year):
    return NAP_AM_60[((year - 4) % 60 + 60) % 60]

def gio_to_chi(hour):
    return ((hour + 1) % 24) // 2

def get_cuc_so(nap_am, chi_gio):
    bang = {
        'Kim':  [4,2,6,4,2,6,4,2,6,4,2,6],
        'Thủy': [2,6,4,2,6,4,2,6,4,2,6,4],
        'Mộc':  [3,5,3,5,3,5,3,5,3,5,3,5],
        'Hỏa':  [6,4,2,6,4,2,6,4,2,6,4,2],
        'Thổ':  [5,3,5,3,5,3,5,3,5,3,5,3],
    }
    return bang.get(nap_am, bang['Thổ'])[chi_gio % 12]

def get_cung_menh(thang_am, chi_gio):
    # Tháng 1 âm bắt đầu tại Dần(2), mỗi tháng +1 xuôi
    # Giờ đếm ngược từ cung tháng
    idx = (2 + thang_am - 1 - chi_gio) % 12
    return idx

def get_tu_vi_cung(ngay_am, cuc_so):
    du = ngay_am % cuc_so
    thuong = ngay_am // cuc_so
    if du == 0:
        return (2 + (thuong - 1) * 2) % 12
    else:
        return ((2 + thuong * 2 - (cuc_so - du)) % 12 + 12) % 12

def an_sao(ngay_dl, thang_dl, nam_dl, gio_so, gioi_tinh):
    # Âm lịch
    ngay_am, thang_am, nam_am, is_leap = solar_to_lunar(ngay_dl, thang_dl, nam_dl)

    # Can Chi
    can_nam = (nam_dl - 4) % 10
    nap_am = get_nap_am(nam_dl)

    # Địa chi giờ
    chi_gio = gio_to_chi(gio_so)

    # Cục số
    cuc_so = get_cuc_so(nap_am, chi_gio)

    # Cung Mệnh
    menh_idx = get_cung_menh(thang_am, chi_gio)

    # An Tử Vi
    tu_vi_idx = get_tu_vi_cung(ngay_am, cuc_so)
    phu_idx   = (tu_vi_idx + 8) % 12

    # Chính tinh
    sao = {}
    sao['Tử Vi']       = tu_vi_idx
    sao['Thiên Cơ']    = (tu_vi_idx - 1) % 12
    sao['Vũ Khúc']     = (tu_vi_idx + 1) % 12
    sao['Thiên Đồng']  = (tu_vi_idx + 2) % 12
    sao['Liêm Trinh']  = (tu_vi_idx + 4) % 12
    sao['Tham Lang']   = (tu_vi_idx + 10) % 12
    sao['Thất Sát']    = (tu_vi_idx + 2) % 12  # check lại
    sao['Phá Quân']    = (tu_vi_idx + 6) % 12
    sao['Thiên Tướng'] = tu_vi_idx
    sao['Thiên Phủ']   = phu_idx
    sao['Thái Dương']  = (phu_idx + 1) % 12
    sao['Thái Âm']     = (phu_idx + 1) % 12
    sao['Cự Môn']      = (phu_idx + 3) % 12
    sao['Thiên Lương'] = (tu_vi_idx + 8) % 12

    # Phụ tinh
    loc_ton_bang = [2,3,5,5,7,7,9,9,11,11]
    loc_idx = loc_ton_bang[can_nam % 10]
    sao['Lộc Tồn']   = loc_idx
    sao['Kình Dương'] = (loc_idx + 1) % 12
    sao['Đà La']      = (loc_idx - 1) % 12
    sao['Văn Xương']  = (10 - chi_gio) % 12
    sao['Văn Khúc']   = (4 + chi_gio) % 12

    # Tứ Hóa theo Can năm
    tu_hoa_bang = [
        ['Liêm Trinh','Phá Quân','Vũ Khúc','Thái Dương'],       # Giáp
        ['Thiên Cơ','Thiên Lương','Tử Vi','Thái Âm'],             # Ất
        ['Thiên Đồng','Thiên Cơ','Văn Xương','Liêm Trinh'],       # Bính
        ['Thái Âm','Thiên Đồng','Thiên Cơ','Cự Môn'],             # Đinh
        ['Tham Lang','Thái Âm','Hữu Bật','Thiên Cơ'],             # Mậu
        ['Vũ Khúc','Tham Lang','Thiên Lương','Văn Khúc'],         # Kỷ
        ['Thái Dương','Vũ Khúc','Thái Âm','Thiên Đồng'],          # Canh
        ['Cự Môn','Thái Dương','Văn Khúc','Văn Xương'],           # Tân
        ['Thiên Lương','Tử Vi','Tả Phù','Vũ Khúc'],               # Nhâm
        ['Phá Quân','Cự Môn','Thái Âm','Tham Lang'],              # Quý
    ]
    hoa_row = tu_hoa_bang[can_nam % 10]

    # Tên 12 cung (Mệnh, Phụ Mẫu, ...)
    cung_names = {}
    for i in range(12):
        chi_idx = (menh_idx + i) % 12
        cung_names[CUNG_TEN[chi_idx]] = TEN_CUNG_CUNG[i]

    # Build output
    chinh_tinh = {ten: CUNG_TEN[idx % 12] for ten, idx in sao.items()}

    ten_cuc = {2:'Thủy Nhị Cục', 3:'Mộc Tam Cục', 4:'Kim Tứ Cục', 5:'Thổ Ngũ Cục', 6:'Hỏa Lục Cục'}

    return {
        'cung_menh': CUNG_TEN[menh_idx],
        'nap_am': nap_am,
        'cuc_so': cuc_so,
        'ten_cuc': ten_cuc.get(cuc_so, f'Cục {cuc_so}'),
        'can_chi': get_can_chi(nam_dl),
        'lunar': f"{ngay_am}/{thang_am}/{nam_am}{'(nhuận)' if is_leap else ''}",
        'chinh_tinh': chinh_tinh,
        'hoa_loc': hoa_row[0],
        'hoa_quyen': hoa_row[1],
        'hoa_khoa': hoa_row[2],
        'hoa_ky': hoa_row[3],
        'cung_names': cung_names,
    }


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))

        try:
            ngay      = int(body['ngay'])
            thang     = int(body['thang'])
            nam       = int(body['nam'])
            gio_so    = int(body['gio'])   # giờ thực (0-23)
            gioi_tinh = body.get('gioi_tinh', 'nam')
            hoten     = body.get('hoten', '')
            api_key   = body.get('api_key', '')

            # An sao
            la_so = an_sao(ngay, thang, nam, gio_so, gioi_tinh)

            # Build text cho Claude
            chi_gio_ten = CHI[((gio_so + 1) % 24) // 2]
            la_so_text = build_la_so_text(hoten, ngay, thang, nam, chi_gio_ten, gioi_tinh, la_so)

            # Gọi Claude API
            luan_giai = call_claude(api_key, la_so_text, gioi_tinh)

            result = {
                'success': True,
                'la_so': la_so,
                'luan_giai': luan_giai,
                'la_so_text': la_so_text,
            }
        except Exception as e:
            result = {'success': False, 'error': str(e)}

        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        pass


def build_la_so_text(hoten, ngay, thang, nam, chi_gio, gioi_tinh, la_so):
    lines = [
        "LÁ SỐ TỬ VI",
        f"Họ tên: {hoten}",
        f"Ngày sinh DL: {ngay}/{thang}/{nam}  |  ÂL: {la_so['lunar']}",
        f"Giờ sinh: Giờ {chi_gio}",
        f"Giới tính: {'Nam' if gioi_tinh == 'nam' else 'Nữ'}",
        f"Năm: {la_so['can_chi']}",
        f"Mệnh Nạp Âm: {la_so['nap_am']}",
        f"Cung Mệnh: {la_so['cung_menh']}",
        f"Cục: {la_so['ten_cuc']}",
        "",
        "CHÍNH TINH:",
    ]
    sao_order = ['Tử Vi','Thiên Cơ','Thái Dương','Vũ Khúc','Thiên Đồng','Liêm Trinh',
                 'Thiên Phủ','Thái Âm','Tham Lang','Cự Môn','Thiên Tướng','Thiên Lương','Thất Sát','Phá Quân']
    for s in sao_order:
        if s in la_so['chinh_tinh']:
            chi = la_so['chinh_tinh'][s]
            ten_cung = la_so['cung_names'].get(chi, '')
            lines.append(f"  {s}: {chi} ({ten_cung})")
    lines += [
        "",
        "PHỤ TINH:",
        f"  Lộc Tồn: {la_so['chinh_tinh'].get('Lộc Tồn','')} ({la_so['cung_names'].get(la_so['chinh_tinh'].get('Lộc Tồn',''),'')})",
        f"  Kình Dương: {la_so['chinh_tinh'].get('Kình Dương','')}",
        f"  Đà La: {la_so['chinh_tinh'].get('Đà La','')}",
        f"  Văn Xương: {la_so['chinh_tinh'].get('Văn Xương','')}",
        f"  Văn Khúc: {la_so['chinh_tinh'].get('Văn Khúc','')}",
        "",
        "TỨ HÓA:",
        f"  {la_so['hoa_loc']} Hóa Lộc",
        f"  {la_so['hoa_quyen']} Hóa Quyền",
        f"  {la_so['hoa_khoa']} Hóa Khoa",
        f"  {la_so['hoa_ky']} Hóa Kỵ",
    ]
    return "\n".join(lines)


def call_claude(api_key, la_so_text, gioi_tinh):
    prompt = f"""Bạn là một thầy Tử Vi uyên thâm, am hiểu Tử Vi Đẩu Số theo trường phái Thái Thứ Lang. Hãy luận giải lá số sau một cách chi tiết, sâu sắc và nhân văn.

{la_so_text}

Luận giải theo 2 phần:

## TỔNG QUAN VẬN MỆNH
Luận giải tổng quan về tính cách, bản chất, đường đời của {'người nam' if gioi_tinh == 'nam' else 'người nữ'} này. Phân tích Cung Mệnh, Mệnh Nạp Âm, chính tinh tại Mệnh và các cung quan trọng. Nêu rõ ưu điểm, thách thức và đặc điểm nổi bật trong cuộc đời.

## HẠN NĂM & VẬN HẠN
Phân tích xu hướng vận hạn theo từng giai đoạn trong cuộc đời. Chỉ ra những thời điểm thuận lợi cần nắm bắt và những giai đoạn cần thận trọng. Đưa ra lời khuyên thực tế.

Viết bằng tiếng Việt, văn phong cổ điển nhưng dễ hiểu. Hướng đến sự tích cực và xây dựng."""

    req_data = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}]
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=req_data,
        headers={
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    return data['content'][0]['text']
