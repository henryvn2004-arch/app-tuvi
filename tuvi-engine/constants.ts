// ============================================================
// CONSTANTS — Tử Vi Đẩu Số Engine
// ============================================================
import type { DiaChi, ThienCan, NguHanh } from './types.js';

export const DIA_CHI: DiaChi[] = [
  'Tý','Sửu','Dần','Mão','Thìn','Tỵ',
  'Ngọ','Mùi','Thân','Dậu','Tuất','Hợi',
];

export const THIEN_CAN: ThienCan[] = [
  'Giáp','Ất','Bính','Đinh','Mậu',
  'Kỷ','Canh','Tân','Nhâm','Quý',
];

export const TEN_CUNG: string[] = [
  'Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc',
  'Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ',
];

// ─── NẠP ÂM ────────────────────────────────────────────────
export const NAP_AM: Record<string, NguHanh> = {
  'Giáp Tý':'Kim','Ất Sửu':'Kim','Bính Dần':'Hỏa','Đinh Mão':'Hỏa',
  'Mậu Thìn':'Mộc','Kỷ Tỵ':'Mộc','Canh Ngọ':'Thổ','Tân Mùi':'Thổ',
  'Nhâm Thân':'Kim','Quý Dậu':'Kim','Giáp Tuất':'Hỏa','Ất Hợi':'Hỏa',
  'Bính Tý':'Thủy','Đinh Sửu':'Thủy','Mậu Dần':'Thổ','Kỷ Mão':'Thổ',
  'Canh Thìn':'Kim','Tân Tỵ':'Kim','Nhâm Ngọ':'Mộc','Quý Mùi':'Mộc',
  'Giáp Thân':'Thủy','Ất Dậu':'Thủy','Bính Tuất':'Thổ','Đinh Hợi':'Thổ',
  'Mậu Tý':'Hỏa','Kỷ Sửu':'Hỏa','Canh Dần':'Mộc','Tân Mão':'Mộc',
  'Nhâm Thìn':'Thủy','Quý Tỵ':'Thủy','Giáp Ngọ':'Kim','Ất Mùi':'Kim',
  'Bính Thân':'Hỏa','Đinh Dậu':'Hỏa','Mậu Tuất':'Mộc','Kỷ Hợi':'Mộc',
  'Canh Tý':'Thổ','Tân Sửu':'Thổ','Nhâm Dần':'Kim','Quý Mão':'Kim',
  'Giáp Thìn':'Hỏa','Ất Tỵ':'Hỏa','Bính Ngọ':'Thủy','Đinh Mùi':'Thủy',
  'Mậu Thân':'Thổ','Kỷ Dậu':'Thổ','Canh Tuất':'Kim','Tân Hợi':'Kim',
  'Nhâm Tý':'Mộc','Quý Sửu':'Mộc','Giáp Dần':'Thủy','Ất Mão':'Thủy',
  'Bính Thìn':'Thổ','Đinh Tỵ':'Thổ','Mậu Ngọ':'Hỏa','Kỷ Mùi':'Hỏa',
  'Canh Thân':'Mộc','Tân Dậu':'Mộc','Nhâm Tuất':'Thủy','Quý Hợi':'Thủy',
};

// ─── LẬP CỤC ────────────────────────────────────────────────
export interface LapCucRule {
  cung: DiaChi[];
  can: ThienCan[];
  cuc: string;
}

export const LAP_CUC_RULES: LapCucRule[] = [
  { cung:['Tý','Sửu'],              can:['Giáp','Kỷ'],   cuc:'Thủy Nhị Cục' },
  { cung:['Tý','Sửu'],              can:['Ất','Canh'],   cuc:'Hỏa Lục Cục'  },
  { cung:['Tý','Sửu'],              can:['Bính','Tân'],  cuc:'Thổ Ngũ Cục'  },
  { cung:['Tý','Sửu'],              can:['Đinh','Nhâm'], cuc:'Mộc Tam Cục'  },
  { cung:['Tý','Sửu'],              can:['Mậu','Quý'],   cuc:'Kim Tứ Cục'   },
  { cung:['Dần','Mão','Tuất','Hợi'],can:['Giáp','Kỷ'],   cuc:'Hỏa Lục Cục'  },
  { cung:['Dần','Mão','Tuất','Hợi'],can:['Ất','Canh'],   cuc:'Thổ Ngũ Cục'  },
  { cung:['Dần','Mão','Tuất','Hợi'],can:['Bính','Tân'],  cuc:'Mộc Tam Cục'  },
  { cung:['Dần','Mão','Tuất','Hợi'],can:['Đinh','Nhâm'], cuc:'Kim Tứ Cục'   },
  { cung:['Dần','Mão','Tuất','Hợi'],can:['Mậu','Quý'],   cuc:'Thủy Nhị Cục' },
  { cung:['Thìn','Tỵ'],             can:['Giáp','Kỷ'],   cuc:'Mộc Tam Cục'  },
  { cung:['Thìn','Tỵ'],             can:['Ất','Canh'],   cuc:'Kim Tứ Cục'   },
  { cung:['Thìn','Tỵ'],             can:['Bính','Tân'],  cuc:'Thủy Nhị Cục' },
  { cung:['Thìn','Tỵ'],             can:['Đinh','Nhâm'], cuc:'Hỏa Lục Cục'  },
  { cung:['Thìn','Tỵ'],             can:['Mậu','Quý'],   cuc:'Thổ Ngũ Cục'  },
  { cung:['Ngọ','Mùi'],             can:['Giáp','Kỷ'],   cuc:'Thổ Ngũ Cục'  },
  { cung:['Ngọ','Mùi'],             can:['Ất','Canh'],   cuc:'Mộc Tam Cục'  },
  { cung:['Ngọ','Mùi'],             can:['Bính','Tân'],  cuc:'Kim Tứ Cục'   },
  { cung:['Ngọ','Mùi'],             can:['Đinh','Nhâm'], cuc:'Thủy Nhị Cục' },
  { cung:['Ngọ','Mùi'],             can:['Mậu','Quý'],   cuc:'Hỏa Lục Cục'  },
  { cung:['Thân','Dậu'],            can:['Giáp','Kỷ'],   cuc:'Kim Tứ Cục'   },
  { cung:['Thân','Dậu'],            can:['Ất','Canh'],   cuc:'Thủy Nhị Cục' },
  { cung:['Thân','Dậu'],            can:['Bính','Tân'],  cuc:'Hỏa Lục Cục'  },
  { cung:['Thân','Dậu'],            can:['Đinh','Nhâm'], cuc:'Thổ Ngũ Cục'  },
  { cung:['Thân','Dậu'],            can:['Mậu','Quý'],   cuc:'Mộc Tam Cục'  },
];

// ─── BẢNG AN TỬ VI ───────────────────────────────────────────
export const TU_VI_BANG: Record<string, Record<string, number[]>> = {
  'Thủy Nhị Cục': {'Tỵ':[8,9],'Ngọ':[10,11],'Mùi':[12,13],'Thân':[14,15],'Dậu':[16,17],'Tuất':[18,19],'Hợi':[20,21],'Tý':[22,23],'Sửu':[1,24,25],'Dần':[2,3,26,27],'Mão':[4,5,28,29],'Thìn':[6,7,30]},
  'Mộc Tam Cục':  {'Tỵ':[4,12,14],'Ngọ':[7,15,17],'Mùi':[10,18,20],'Thân':[13,21,23],'Dậu':[16,24,26],'Tuất':[19,27,29],'Hợi':[22,30],'Tý':[25],'Sửu':[2,28],'Dần':[3,5],'Mão':[6,8],'Thìn':[1,9,11]},
  'Kim Tứ Cục':   {'Tỵ':[6,16,19,25],'Ngọ':[10,20,23,29],'Mùi':[14,24,27],'Thân':[18,28],'Dậu':[22],'Tuất':[26],'Hợi':[1,30],'Tý':[5],'Sửu':[3,9],'Dần':[4,7,13],'Mão':[8,11,17],'Thìn':[2,12,15,21]},
  'Thổ Ngũ Cục':  {'Tỵ':[8,20,24],'Ngọ':[1,13,25,29],'Mùi':[6,18,30],'Thân':[11,23],'Dậu':[16,28],'Tuất':[21],'Hợi':[2,26],'Tý':[7],'Sửu':[4,12],'Dần':[5,9,17],'Mão':[10,14,22],'Thìn':[3,15,19,27]},
  'Hỏa Lục Cục':  {'Tỵ':[10,24,29],'Ngọ':[2,16,30],'Mùi':[8,22],'Thân':[14,28],'Dậu':[1,20],'Tuất':[7,26],'Hợi':[3,13],'Tý':[9,19],'Sửu':[5,15,25],'Dần':[6,11,21],'Mão':[12,17,27],'Thìn':[4,18,23]},
};

export const THIEN_PHU_FROM_TUVI: Record<DiaChi, DiaChi> = {
  'Tý':'Thìn','Sửu':'Mão','Dần':'Dần','Mão':'Sửu','Thìn':'Tý','Tỵ':'Hợi',
  'Ngọ':'Tuất','Mùi':'Dậu','Thân':'Thân','Dậu':'Mùi','Tuất':'Ngọ','Hợi':'Tỵ',
};

// ─── VÒNG THÁI TUẾ ──────────────────────────────────────────
export const THAI_TUE_SEQ: string[] = [
  'Thái Tuế','Thiếu Dương','Tang Môn','Thiếu Âm','Quan Phù',
  'Tử Phù','Tuế Phá','Long Đức','Bạch Hổ','Phúc Đức','Điếu Khách','Trực Phù',
];

export const THAI_TUE_NHOM: Record<string, number> = {
  'Thái Tuế':1,'Quan Phù':1,'Bạch Hổ':1,
  'Thiếu Dương':2,'Tử Phù':2,'Phúc Đức':2,
  'Tang Môn':3,'Tuế Phá':3,'Điếu Khách':3,
  'Thiếu Âm':4,'Long Đức':4,'Trực Phù':4,
};

export const THAI_TUE_NHOM_Y_NGHIA: Record<number, { ten: string; yNghia: string }> = {
  1: { ten:'Nhóm 1 — Thái Tuế · Quan Phù · Bạch Hổ',
       yNghia:'Người có lý tưởng, tính tình ngay thẳng, đàng hoàng, có tư cách. Dễ thành đạt, làm được việc hợp sở thích. Được người xung quanh yêu chuộng, mến trọng.' },
  2: { ten:'Nhóm 2 — Thiếu Dương · Tử Phù · Phúc Đức',
       yNghia:'Sáng suốt nhưng hay cạnh tranh lấn át người khác. Nếu dùng thủ đoạn để thắng thì dù thành công cũng dễ hỏng, thậm chí mắc họa. Có Phúc Đức khuyên nhủ làm việc lành — nếu làm được vậy thì vận mạng yên ổn.' },
  3: { ten:'Nhóm 3 — Tang Môn · Tuế Phá · Điếu Khách',
       yNghia:'Xung phá, đối kháng với Thái Tuế. Gặp khó khăn trong việc đạt chí nguyện, thường làm công việc không đúng sở nguyện. Bù lại thông minh, tháo vát, hoạt bát — mạng ở thế đối kháng Thái Tuế thường có Thiên Mã.' },
  4: { ten:'Nhóm 4 — Thiếu Âm · Long Đức · Trực Phù',
       yNghia:'Thế của người làm công hoặc phụ thuộc người khác. Thường làm thành công nhưng không được hưởng lợi xứng đáng, dễ bị bạc đãi. Tuy nhiên được hưởng phúc, an lành nhờ Long Đức — một số còn được hưởng cả Lộc Tồn.' },
};

// ─── VÒNG LỘC TỒN ───────────────────────────────────────────
export const LOC_TON_START: Record<ThienCan, DiaChi> = {
  'Giáp':'Dần','Ất':'Mão','Bính':'Tỵ','Đinh':'Ngọ',
  'Mậu':'Tỵ','Kỷ':'Ngọ','Canh':'Thân','Tân':'Dậu',
  'Nhâm':'Hợi','Quý':'Tý',
};

export const LOC_TON_SEQ: string[] = [
  'Lộc Tồn','Lực Sỹ','Thanh Long','Tiểu Hao','Tướng Quân',
  'Tấu Thư','Phi Liêm','Hỷ Thần','Bệnh Phù','Đại Hao','Phục Binh','Quan Phủ',
];

// ─── VÒNG TRÀNG SINH ────────────────────────────────────────
export const TRANG_SINH_START: Record<string, DiaChi> = {
  'Thủy Nhị Cục':'Thân','Mộc Tam Cục':'Hợi',
  'Kim Tứ Cục':'Tỵ','Thổ Ngũ Cục':'Thân','Hỏa Lục Cục':'Dần',
};

export const TRANG_SINH_SEQ: string[] = [
  'Tràng Sinh','Mộc Dục','Quan Đới','Lâm Quan','Đế Vượng',
  'Suy','Bệnh','Tử','Mộ','Tuyệt','Thai','Dưỡng',
];

// ─── HỎA TINH / LINH TINH ───────────────────────────────────
export const HOA_LINH_KHOI: Record<DiaChi, { hoa: DiaChi; linh: DiaChi }> = {
  'Dần':{'hoa':'Sửu','linh':'Thìn'},'Ngọ':{'hoa':'Sửu','linh':'Thìn'},'Tuất':{'hoa':'Sửu','linh':'Thìn'},
  'Thân':{'hoa':'Dần','linh':'Tuất'},'Tý':{'hoa':'Dần','linh':'Tuất'},'Thìn':{'hoa':'Dần','linh':'Tuất'},
  'Hợi':{'hoa':'Tý','linh':'Dậu'},'Mão':{'hoa':'Tý','linh':'Dậu'},'Mùi':{'hoa':'Tý','linh':'Dậu'},
  'Tỵ':{'hoa':'Mão','linh':'Tuất'},'Dậu':{'hoa':'Mão','linh':'Tuất'},'Sửu':{'hoa':'Mão','linh':'Tuất'},
};

// ─── TỨ HÓA ─────────────────────────────────────────────────
export const TU_HOA: Record<ThienCan, Record<string, string>> = {
  'Giáp':{'Lộc':'Liêm Trinh','Quyền':'Phá Quân','Khoa':'Vũ Khúc','Kỵ':'Thái Dương'},
  'Ất':  {'Lộc':'Thiên Cơ','Quyền':'Thiên Lương','Khoa':'Tử Vi','Kỵ':'Thái Âm'},
  'Bính':{'Lộc':'Thiên Đồng','Quyền':'Thiên Cơ','Khoa':'Văn Xương','Kỵ':'Liêm Trinh'},
  'Đinh':{'Lộc':'Thái Âm','Quyền':'Thiên Đồng','Khoa':'Thiên Cơ','Kỵ':'Cự Môn'},
  'Mậu': {'Lộc':'Tham Lang','Quyền':'Thái Âm','Khoa':'Hữu Bật','Kỵ':'Thiên Cơ'},
  'Kỷ':  {'Lộc':'Vũ Khúc','Quyền':'Tham Lang','Khoa':'Thiên Lương','Kỵ':'Văn Khúc'},
  'Canh':{'Lộc':'Thái Dương','Quyền':'Vũ Khúc','Khoa':'Thái Âm','Kỵ':'Thiên Đồng'},
  'Tân': {'Lộc':'Cự Môn','Quyền':'Thái Dương','Khoa':'Văn Khúc','Kỵ':'Văn Xương'},
  'Nhâm':{'Lộc':'Thiên Lương','Quyền':'Tử Vi','Khoa':'Tả Phụ','Kỵ':'Vũ Khúc'},
  'Quý': {'Lộc':'Phá Quân','Quyền':'Cự Môn','Khoa':'Thái Âm','Kỵ':'Tham Lang'},
};

// ─── TUẦN & TRIỆT ────────────────────────────────────────────
export const TUAN_BANG: Record<string, DiaChi[]> = {
  'Giáp Tý':['Tuất','Hợi'],'Giáp Tuất':['Thân','Dậu'],'Giáp Thân':['Ngọ','Mùi'],
  'Giáp Ngọ':['Thìn','Tỵ'],'Giáp Thìn':['Dần','Mão'],'Giáp Dần':['Tý','Sửu'],
};

export const TRIET_BANG: Record<ThienCan, DiaChi[]> = {
  'Giáp':['Thân','Dậu'],'Ất':['Ngọ','Mùi'],'Bính':['Thìn','Tỵ'],
  'Đinh':['Dần','Mão'],'Mậu':['Tý','Sửu'],'Kỷ':['Thân','Dậu'],
  'Canh':['Ngọ','Mùi'],'Tân':['Thìn','Tỵ'],'Nhâm':['Dần','Mão'],'Quý':['Tý','Sửu'],
};

// ─── TIỂU HẠN ────────────────────────────────────────────────
export const TIEU_HAN_KHOI: Record<'nam'|'nu', Record<DiaChi, DiaChi>> = {
  'nam': {'Tý':'Tuất','Sửu':'Dậu','Dần':'Thân','Mão':'Mùi','Thìn':'Ngọ','Tỵ':'Tỵ',
          'Ngọ':'Thìn','Mùi':'Mão','Thân':'Dần','Dậu':'Sửu','Tuất':'Tý','Hợi':'Hợi'},
  'nu':  {'Tý':'Thìn','Sửu':'Tỵ','Dần':'Ngọ','Mão':'Mùi','Thìn':'Thân','Tỵ':'Dậu',
          'Ngọ':'Tuất','Mùi':'Hợi','Thân':'Tý','Dậu':'Sửu','Tuất':'Dần','Hợi':'Mão'},
};

// ─── SCORING CONSTANTS ──────────────────────────────────────
export const TAM_HOP_HANH: Record<DiaChi, NguHanh> = {
  'Thân':'Thủy','Tý':'Thủy','Thìn':'Thủy',
  'Hợi':'Mộc','Mão':'Mộc','Mùi':'Mộc',
  'Dần':'Hỏa','Ngọ':'Hỏa','Tuất':'Hỏa',
  'Tỵ':'Kim','Dậu':'Kim','Sửu':'Kim',
};

export const DC_HANH: Record<DiaChi, NguHanh> = {
  'Tý':'Thủy','Hợi':'Thủy',
  'Dần':'Mộc','Mão':'Mộc',
  'Tỵ':'Hỏa','Ngọ':'Hỏa',
  'Thìn':'Thổ','Tuất':'Thổ','Sửu':'Thổ','Mùi':'Thổ',
  'Thân':'Kim','Dậu':'Kim',
};

export const NGU_HANH_SINH: Record<NguHanh, NguHanh> = {
  'Mộc':'Hỏa','Hỏa':'Thổ','Thổ':'Kim','Kim':'Thủy','Thủy':'Mộc',
};
export const NGU_HANH_KHAC: Record<NguHanh, NguHanh> = {
  'Kim':'Mộc','Mộc':'Thổ','Thổ':'Thủy','Thủy':'Hỏa','Hỏa':'Kim',
};

// ─── TAM PHƯƠNG TỨ CHÍNH ────────────────────────────────────
export const TAM_PHUONG_TU_CHINH: Record<string, { tamHop: string[]; xung: string }> = {
  'Mệnh':     { tamHop:['Tài Bạch','Quan Lộc'],       xung:'Thiên Di'  },
  'Thiên Di':  { tamHop:['Tật Ách','Phu Thê'],          xung:'Mệnh'      },
  'Tài Bạch':  { tamHop:['Mệnh','Quan Lộc'],            xung:'Tử Tức'   },
  'Quan Lộc':  { tamHop:['Mệnh','Tài Bạch'],            xung:'Điền Trạch'},
  'Tật Ách':   { tamHop:['Thiên Di','Phu Thê'],         xung:'Phúc Đức' },
  'Phu Thê':   { tamHop:['Thiên Di','Tật Ách'],         xung:'Huynh Đệ' },
  'Tử Tức':   { tamHop:['Phúc Đức','Huynh Đệ'],       xung:'Tài Bạch'  },
  'Phúc Đức':  { tamHop:['Tử Tức','Huynh Đệ'],         xung:'Tật Ách'   },
  'Huynh Đệ':  { tamHop:['Tử Tức','Phúc Đức'],         xung:'Phu Thê'   },
  'Nô Bộc':   { tamHop:['Phụ Mẫu','Điền Trạch'],      xung:'Quan Lộc'  },
  'Điền Trạch': { tamHop:['Nô Bộc','Phụ Mẫu'],          xung:'Quan Lộc'  },
  'Phụ Mẫu':  { tamHop:['Nô Bộc','Điền Trạch'],       xung:'Tật Ách'   },
};

// ─── CAT TINH / SAT BAI ─────────────────────────────────────
export const CAT_TINH: string[] = [
  'Tử Vi','Thiên Phủ','Thiên Cơ','Thái Âm','Thiên Đồng','Thiên Lương',
  'Thái Dương','Vũ Khúc','Liêm Trinh',
  'Thiên Khôi','Thiên Việt','Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc',
  'Thiên Quan','Thiên Phúc','Long Trì','Phượng Các','Thiên Đức','Nguyệt Đức',
  'Lộc Tồn','Thiên Mã',
];

export const SAT_BAI: string[] = [
  'Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp',
  'Kiếp Sát','Phá Toái','Đại Hao','Tiểu Hao','Bệnh Phù','Phục Binh',
  'Thiên Hình','Thiên Riêu','Cô Thần','Quả Tú',
];
