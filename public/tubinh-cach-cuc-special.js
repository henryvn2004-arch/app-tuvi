// public/tubinh-cach-cuc-special.js
// Library 29 cách cục ĐẶC BIỆT của Tử Bình (cổ pháp)
// Sources: Tử Bình Chân Thuyên (Quảng Văn) + Dự Đoán Tứ Trụ (Trần Viên & Thiệu Vĩ Hoa)
//
// Usage: const matches = TuBinhSpecialCach.detectSpecialCachCuc(bt);
// Returns: array of { ten, nhomCach, description, weight, hopLe, lyDo, source }
// ============================================================

(function (root) {
  // ---- CONSTANTS ----
  const TAM_HOP_MOC  = ['Hợi','Mão','Mùi'];
  const TAM_HOP_HOA  = ['Dần','Ngọ','Tuất'];
  const TAM_HOP_KIM  = ['Tỵ','Dậu','Sửu'];
  const TAM_HOP_THUY = ['Thân','Tý','Thìn'];
  const TAM_HOI_DONG = ['Dần','Mão','Thìn'];      // Mộc-phương
  const TAM_HOI_HA   = ['Tỵ','Ngọ','Mùi'];        // Hỏa-phương
  const TAM_HOI_THU  = ['Thân','Dậu','Tuất'];     // Kim-phương
  const TAM_HOI_DONG2= ['Hợi','Tý','Sửu'];        // Thủy-phương
  const TU_KHO       = ['Thìn','Tuất','Sửu','Mùi'];

  const HANH_OF_CHI = {
    'Tý':'Thủy','Sửu':'Thổ','Dần':'Mộc','Mão':'Mộc','Thìn':'Thổ','Tỵ':'Hỏa',
    'Ngọ':'Hỏa','Mùi':'Thổ','Thân':'Kim','Dậu':'Kim','Tuất':'Thổ','Hợi':'Thủy'
  };
  const HANH_OF_CAN = {
    'Giáp':'Mộc','Ất':'Mộc','Bính':'Hỏa','Đinh':'Hỏa','Mậu':'Thổ',
    'Kỷ':'Thổ','Canh':'Kim','Tân':'Kim','Nhâm':'Thủy','Quý':'Thủy'
  };

  // ---- HELPERS ----
  function _countChi(tuTru, chis) { return tuTru.filter(t => chis.includes(t.chi)).length; }
  function _allOf(tuTru, chis) { return chis.every(c => tuTru.some(t => t.chi === c)); }
  function _hasCan(tuTru, can) { return tuTru.some(t => t.can === can); }
  function _hasChi(tuTru, chi) { return tuTru.some(t => t.chi === chi); }
  function _countHanhInTuTru(bt, hanh) {
    let n = 0;
    for (const t of bt.tuTru) {
      if (HANH_OF_CAN[t.can] === hanh) n++;
      if (HANH_OF_CHI[t.chi] === hanh) n++;
    }
    return n;
  }
  function _ttCanCountInTuTru(bt, types) {
    let n = 0;
    for (const ten of ['Năm','Tháng','Giờ']) {
      const tt = bt.thapThan?.[ten]?.thienCan;
      if (types.includes(tt)) n++;
    }
    return n;
  }

  // ============================================================
  // PATTERN DEFINITIONS
  // ============================================================
  const PATTERNS = [

    // ─── NHÓM 1: CHUYÊN VƯỢNG (5 hành cực vượng) ───────────────────
    {
      ten: 'Khúc Trực', nhomCach: 'chuyên-vượng', weight: 8, override: true,
      source: 'TBCT chunk 143',
      description: 'Mộc cục đại vượng — Giáp/Ất + tam hợp Hợi-Mão-Mùi hoặc tam hội Dần-Mão-Thìn. Cốt cách văn nhân, ngay thẳng, hợp nghề mộc/giáo dục/y dược.',
      detect: (bt) => {
        if (!['Giáp','Ất'].includes(bt.nhatCan)) return null;
        const allTamHop = _allOf(bt.tuTru, TAM_HOP_MOC);
        const allTamHoi = _allOf(bt.tuTru, TAM_HOI_DONG);
        if (!allTamHop && !allTamHoi) return null;
        const coKim = _countHanhInTuTru(bt,'Kim') > 0;
        return { hopLe: !coKim, lyDo: [allTamHop?'Tam hợp Hợi-Mão-Mùi đủ':'Tam hội Dần-Mão-Thìn đủ', coKim?'Có Kim phá → bán cách':'Không Kim phá']};
      }
    },
    {
      ten: 'Viêm Thượng', nhomCach: 'chuyên-vượng', weight: 8, override: true,
      source: 'TBCT chunk 195',
      description: 'Hỏa cục đại vượng — Bính/Đinh + tam hợp Dần-Ngọ-Tuất hoặc tam hội Tỵ-Ngọ-Mùi. Tính khí mãnh liệt, sáng láng, hợp nghệ thuật/quân sự/lửa.',
      detect: (bt) => {
        if (!['Bính','Đinh'].includes(bt.nhatCan)) return null;
        const allTamHop = _allOf(bt.tuTru, TAM_HOP_HOA);
        const allTamHoi = _allOf(bt.tuTru, TAM_HOI_HA);
        if (!allTamHop && !allTamHoi) return null;
        const coThuy = _countHanhInTuTru(bt,'Thủy') > 0;
        return { hopLe: !coThuy, lyDo: [allTamHop?'Tam hợp Dần-Ngọ-Tuất đủ':'Tam hội Tỵ-Ngọ-Mùi đủ', coThuy?'Có Thủy phá → bán cách':'Không Thủy phá']};
      }
    },
    {
      ten: 'Giá Sắc', nhomCach: 'chuyên-vượng', weight: 8, override: true,
      source: 'TBCT chunk 164',
      description: 'Thổ trung ương — Mậu/Kỷ + đủ tứ khố Thìn Tuất Sửu Mùi. "Giá sắc câu trần đắc vị", quân tử trung chính, hợp nông/đất/xây dựng.',
      detect: (bt) => {
        if (!['Mậu','Kỷ'].includes(bt.nhatCan)) return null;
        const tk = _countChi(bt.tuTru, TU_KHO);
        if (tk < 3) return null;
        const coMoc = _countHanhInTuTru(bt,'Mộc') > 0;
        return { hopLe: tk === 4 && !coMoc, lyDo: [`${tk}/4 tứ khố`, coMoc?'Có Mộc phá':'Không Mộc phá']};
      }
    },
    {
      ten: 'Tòng Cách Cách', nhomCach: 'chuyên-vượng', weight: 8, override: true,
      source: 'DDTT chunk 196',
      description: 'Kim cục đại vượng — Canh/Tân + tam hợp Tỵ-Dậu-Sửu hoặc tam hội Thân-Dậu-Tuất. Kim khí cứng cỏi, hợp kim khí/quân đội/luật.',
      detect: (bt) => {
        if (!['Canh','Tân'].includes(bt.nhatCan)) return null;
        const allTamHop = _allOf(bt.tuTru, TAM_HOP_KIM);
        const allTamHoi = _allOf(bt.tuTru, TAM_HOI_THU);
        if (!allTamHop && !allTamHoi) return null;
        const coHoa = _countHanhInTuTru(bt,'Hỏa') > 0;
        return { hopLe: !coHoa, lyDo: [allTamHop?'Tam hợp Tỵ-Dậu-Sửu đủ':'Tam hội Thân-Dậu-Tuất đủ', coHoa?'Có Hỏa phá':'Không Hỏa phá']};
      }
    },
    {
      ten: 'Nhuận Hạ', nhomCach: 'chuyên-vượng', weight: 8, override: true,
      source: 'TBCT chunk 141',
      description: 'Thủy đại vượng — Nhâm/Quý + tam hợp Thân-Tý-Thìn hoặc tam hội Hợi-Tý-Sửu. Trí tuệ sâu, cơ động, hợp nghiên cứu/nước/giao thương.',
      detect: (bt) => {
        if (!['Nhâm','Quý'].includes(bt.nhatCan)) return null;
        const allTamHop = _allOf(bt.tuTru, TAM_HOP_THUY);
        const allTamHoi = _allOf(bt.tuTru, TAM_HOI_DONG2);
        if (!allTamHop && !allTamHoi) return null;
        const coTho = bt.tuTru.filter((t,i)=>i!==2 && HANH_OF_CAN[t.can]==='Thổ').length > 0;
        return { hopLe: !coTho, lyDo: [allTamHop?'Tam hợp Thân-Tý-Thìn đủ':'Tam hội Hợi-Tý-Sửu đủ', coTho?'Có Thổ chế':'Không Thổ chế']};
      }
    },

    // ─── NHÓM 2: TÒNG CÁCH (5 loại bỏ mệnh theo thế) ────────────────
    {
      ten: 'Tòng Tài', nhomCach: 'tòng-cách', weight: 7, override: true,
      source: 'TBCT chunk 144',
      description: 'Cực nhược + Tài đa vượng + không có Ấn/Tỷ Kiếp cứu → bỏ mình theo Tài. Sống dựa vợ/của cải, có thể giàu nhưng phụ thuộc.',
      detect: (bt) => {
        if (bt.cuongNhuoc.label !== 'Cực nhược') return null;
        const taiCount = _ttCanCountInTuTru(bt, ['Chính Tài','Thiên Tài']);
        const taiHanh = HANH_OF_CAN[bt.nhatCan]; // hành mà nhật can khắc
        // Đếm hành tài trong tứ trụ
        const KHAC_DI = {'Mộc':'Thổ','Hỏa':'Kim','Thổ':'Thủy','Kim':'Mộc','Thủy':'Hỏa'};
        const taiHanhActual = KHAC_DI[HANH_OF_CAN[bt.nhatCan]];
        const taiHanhCount = _countHanhInTuTru(bt, taiHanhActual);
        if (taiCount < 1 && taiHanhCount < 3) return null;
        return { hopLe: true, lyDo: ['Nhật chủ cực nhược', `${taiCount} Tài thấu, ${taiHanhCount} hành ${taiHanhActual}`, 'Bỏ mệnh theo Tài']};
      }
    },
    {
      ten: 'Tòng Sát', nhomCach: 'tòng-cách', weight: 7, override: true,
      source: 'TBCT chunk 145',
      description: 'Cực nhược + Quan/Sát đa, không có Ấn hóa, không Thực Thương chế → theo Sát. Đại quý hoặc đại bại tùy vận.',
      detect: (bt) => {
        if (bt.cuongNhuoc.label !== 'Cực nhược') return null;
        const qsCount = _ttCanCountInTuTru(bt, ['Chính Quan','Thất Sát']);
        if (qsCount < 2) return null;
        const ttCount = _ttCanCountInTuTru(bt, ['Thực Thần','Thương Quan']);
        const anCount = _ttCanCountInTuTru(bt, ['Chính Ấn','Kiêu Thần']);
        return { hopLe: ttCount === 0 && anCount === 0, lyDo: ['Nhật chủ cực nhược', `${qsCount}+ Quan/Sát đa`, ttCount===0?'Không Thực Thương chế':'Có Thực Thương → bán cách', anCount===0?'Không Ấn hóa':'Có Ấn hóa → bán cách']};
      }
    },
    {
      ten: 'Tòng Nhi', nhomCach: 'tòng-cách', weight: 6, override: true,
      source: 'TBCT + DDTT (suy luận từ chunk 200)',
      description: 'Cực nhược + Thực Thương đa, không có Ấn cứu → theo Thực Thương. Thông minh, sáng tạo, sống nhờ tài năng.',
      detect: (bt) => {
        if (bt.cuongNhuoc.label !== 'Cực nhược') return null;
        const ttCount = _ttCanCountInTuTru(bt, ['Thực Thần','Thương Quan']);
        if (ttCount < 2) return null;
        const anCount = _ttCanCountInTuTru(bt, ['Chính Ấn','Kiêu Thần']);
        return { hopLe: anCount === 0, lyDo: ['Nhật chủ cực nhược', `${ttCount}+ Thực Thương đa`, anCount===0?'Không Ấn phá':'Có Ấn → bán cách']};
      }
    },
    {
      ten: 'Tòng Vượng', nhomCach: 'tòng-cách', weight: 7, override: true,
      source: 'DDTT chunk 187',
      description: 'Cực vượng + Tỷ Kiếp Ấn nhiều, không có Quan Sát Tài chế → theo vượng. Mạnh mẽ, độc đoán.',
      detect: (bt) => {
        if (bt.cuongNhuoc.label !== 'Cực vượng') return null;
        const tkCount = _ttCanCountInTuTru(bt, ['Tỷ Kiên','Kiếp Tài']);
        const anCount = _ttCanCountInTuTru(bt, ['Chính Ấn','Kiêu Thần']);
        if (tkCount + anCount < 2) return null;
        const qsCount = _ttCanCountInTuTru(bt, ['Chính Quan','Thất Sát']);
        return { hopLe: qsCount === 0, lyDo: ['Nhật chủ cực vượng', `${tkCount}+${anCount} Tỷ Kiếp + Ấn`, qsCount===0?'Không Quan Sát chế':'Có Quan Sát → bán cách']};
      }
    },
    {
      ten: 'Tòng Cường', nhomCach: 'tòng-cách', weight: 7, override: true,
      source: 'DDTT chunk 187',
      description: 'Cực vượng + Sát Ấn đầy đủ, Sát hóa thành Ấn càng vượng thêm → theo cường. Quý hiển nắm quyền.',
      detect: (bt) => {
        if (bt.cuongNhuoc.label !== 'Cực vượng') return null;
        const qsCount = _ttCanCountInTuTru(bt, ['Chính Quan','Thất Sát']);
        const anCount = _ttCanCountInTuTru(bt, ['Chính Ấn','Kiêu Thần']);
        if (qsCount < 1 || anCount < 1) return null;
        return { hopLe: true, lyDo: ['Nhật chủ cực vượng', 'Có Sát + Ấn liên tiếp', 'Sát hóa Ấn càng cường']};
      }
    },

    // ─── NHÓM 3: HÓA KHÍ (5 hóa của ngũ can hợp) ────────────────────
    {
      ten: 'Giáp-Kỷ hóa Thổ', nhomCach: 'hóa-khí', weight: 6, override: true,
      source: 'TBCT chunk 164',
      description: '"Trung chính chi hợp" — Giáp + Kỷ thấu thiên can + sinh tháng Thổ + đủ tứ khố. Trung dung quý cách.',
      detect: (bt) => {
        if (!['Giáp','Kỷ'].includes(bt.nhatCan)) return null;
        const coGiap = _hasCan(bt.tuTru,'Giáp');
        const coKy = _hasCan(bt.tuTru,'Kỷ');
        if (!coGiap || !coKy) return null;
        const sinhThangTho = TU_KHO.includes(bt.tuTru[1].chi);
        const tkCount = _countChi(bt.tuTru, TU_KHO);
        return { hopLe: sinhThangTho && tkCount >= 2, lyDo: ['Giáp + Kỷ thấu thiên can', sinhThangTho?'Sinh tháng Thổ':'Không sinh tháng Thổ', `${tkCount} chi tứ khố`]};
      }
    },
    {
      ten: 'Ất-Canh hóa Kim', nhomCach: 'hóa-khí', weight: 6, override: true,
      source: 'TBCT chunk 164',
      description: '"Nhân nghĩa chi hợp" — Ất + Canh thấu + đủ Tỵ Dậu Sửu (tam hợp Kim) + sinh tháng Kim. Kim khí cương trực.',
      detect: (bt) => {
        if (!['Ất','Canh'].includes(bt.nhatCan)) return null;
        if (!_hasCan(bt.tuTru,'Ất') || !_hasCan(bt.tuTru,'Canh')) return null;
        const kimCount = _countChi(bt.tuTru, TAM_HOP_KIM);
        const sinhThangKim = ['Thân','Dậu'].includes(bt.tuTru[1].chi);
        return { hopLe: kimCount >= 2 && sinhThangKim, lyDo: ['Ất + Canh thấu', `${kimCount}/3 chi Kim cục`, sinhThangKim?'Sinh tháng Kim':'Không sinh tháng Kim']};
      }
    },
    {
      ten: 'Bính-Tân hóa Thủy', nhomCach: 'hóa-khí', weight: 6, override: true,
      source: 'TBCT chunk 164',
      description: '"Uy chế chi hợp" — Bính + Tân thấu + đủ Thân Tý Thìn + sinh tháng Thủy. Hợp nghề có tính uy nghi.',
      detect: (bt) => {
        if (!['Bính','Tân'].includes(bt.nhatCan)) return null;
        if (!_hasCan(bt.tuTru,'Bính') || !_hasCan(bt.tuTru,'Tân')) return null;
        const thuyCount = _countChi(bt.tuTru, TAM_HOP_THUY);
        const sinhThangThuy = ['Hợi','Tý'].includes(bt.tuTru[1].chi);
        return { hopLe: thuyCount >= 2 && sinhThangThuy, lyDo: ['Bính + Tân thấu', `${thuyCount}/3 chi Thủy cục`, sinhThangThuy?'Sinh tháng Thủy':'Không sinh tháng Thủy']};
      }
    },
    {
      ten: 'Đinh-Nhâm hóa Mộc', nhomCach: 'hóa-khí', weight: 6, override: true,
      source: 'TBCT chunk 164',
      description: '"Dâm dật chi hợp" — Đinh + Nhâm thấu + đủ Hợi Mão Mùi + sinh tháng Mộc. Tình duyên dễ phức tạp, tài hoa.',
      detect: (bt) => {
        if (!['Đinh','Nhâm'].includes(bt.nhatCan)) return null;
        if (!_hasCan(bt.tuTru,'Đinh') || !_hasCan(bt.tuTru,'Nhâm')) return null;
        const mocCount = _countChi(bt.tuTru, TAM_HOP_MOC);
        const sinhThangMoc = ['Dần','Mão'].includes(bt.tuTru[1].chi);
        return { hopLe: mocCount >= 2 && sinhThangMoc, lyDo: ['Đinh + Nhâm thấu', `${mocCount}/3 chi Mộc cục`, sinhThangMoc?'Sinh tháng Mộc':'Không sinh tháng Mộc']};
      }
    },
    {
      ten: 'Mậu-Quý hóa Hỏa', nhomCach: 'hóa-khí', weight: 6, override: true,
      source: 'TBCT chunk 164',
      description: '"Vô tình chi hợp" — Mậu + Quý thấu + đủ Dần Ngọ Tuất + sinh tháng Hỏa. Hợp nghề lớn tuổi vợ trẻ hoặc ngược lại.',
      detect: (bt) => {
        if (!['Mậu','Quý'].includes(bt.nhatCan)) return null;
        if (!_hasCan(bt.tuTru,'Mậu') || !_hasCan(bt.tuTru,'Quý')) return null;
        const hoaCount = _countChi(bt.tuTru, TAM_HOP_HOA);
        const sinhThangHoa = ['Tỵ','Ngọ'].includes(bt.tuTru[1].chi);
        return { hopLe: hoaCount >= 2 && sinhThangHoa, lyDo: ['Mậu + Quý thấu', `${hoaCount}/3 chi Hỏa cục`, sinhThangHoa?'Sinh tháng Hỏa':'Không sinh tháng Hỏa']};
      }
    },

    // ─── NHÓM 4: ĐẶC CÁCH (named patterns) ─────────────────────────
    {
      ten: 'Tỉnh Lan Xoa', nhomCach: 'đặc-cách', weight: 9, override: true,
      source: 'TBCT chunk 132-133',
      description: 'Ngày Canh + đủ 3 chi Thân Tý Thìn (thủy cục). Thủy hư xung Quan/Tài → quý lấy hư hợp thật. Văn võ song toàn.',
      detect: (bt) => {
        if (bt.nhatCan !== 'Canh') return null;
        if (_countChi(bt.tuTru, TAM_HOP_THUY) < 3) return null;
        const coBinhDinh = _hasCan(bt.tuTru,'Bính') || _hasCan(bt.tuTru,'Đinh') || _hasChi(bt.tuTru,'Tỵ') || _hasChi(bt.tuTru,'Ngọ');
        return { hopLe: !coBinhDinh, lyDo: ['Ngày Canh', 'Đủ Thân-Tý-Thìn', coBinhDinh?'Có Hỏa phá nguyên cục':'Không Hỏa phá']};
      }
    },
    {
      ten: 'Nhâm Kỵ Long Bối', nhomCach: 'đặc-cách', weight: 8, override: true,
      source: 'TBCT chunk 130-131',
      description: 'Ngày Nhâm Thìn + nhiều Thìn (quý) hoặc nhiều Dần (phú) trong tứ trụ. "Nhâm cưỡi lưng rồng".',
      detect: (bt) => {
        if (bt.nhatCan !== 'Nhâm' || bt.tuTru[2].chi !== 'Thìn') return null;
        const thinN = _countChi(bt.tuTru, ['Thìn']);
        const danN = _countChi(bt.tuTru, ['Dần']);
        if (thinN < 2 && danN < 2) return null;
        return { hopLe: true, lyDo: ['Ngày Nhâm Thìn', thinN>=2?`${thinN} chữ Thìn (quý cách)`:'', danN>=2?`${danN} chữ Dần (phú cách)`:''].filter(Boolean)};
      }
    },
    {
      ten: 'Lục Nhâm Xu Cấn', nhomCach: 'đặc-cách', weight: 7, override: true,
      source: 'TBCT chunk 138',
      description: 'Ngày Nhâm + nhiều Dần (cung Cấn) trong tứ trụ. Dần tàng Giáp sinh thân, có Bính (Tài), Mậu (Quan) → đại quý.',
      detect: (bt) => {
        if (bt.nhatCan !== 'Nhâm') return null;
        const danN = _countChi(bt.tuTru, ['Dần']);
        if (danN < 2) return null;
        return { hopLe: true, lyDo: ['Ngày Nhâm', `${danN} chữ Dần (cung Cấn)`, 'Dần tàng Giáp Bính Mậu']};
      }
    },
    {
      ten: 'Lục Giáp Xu Càn', nhomCach: 'đặc-cách', weight: 7, override: true,
      source: 'TBCT chunk 139',
      description: 'Ngày Giáp + giờ Hợi (cung Càn). Hợi tàng Nhâm sinh Giáp = đại phú quý cách.',
      detect: (bt) => {
        if (bt.nhatCan !== 'Giáp' || bt.tuTru[3].chi !== 'Hợi') return null;
        return { hopLe: true, lyDo: ['Ngày Giáp + giờ Hợi (cung Càn)', 'Hợi tàng Nhâm sinh Giáp']};
      }
    },
    {
      ten: 'Lục Âm Triều Dương', nhomCach: 'đặc-cách', weight: 7, override: true,
      source: 'TBCT chunk 134',
      description: 'Ngày Tân + giờ Mậu Tý + sinh tháng thu (không có Hợi Tý nhiều). Mậu Tý ám hợp Quý → văn nhân, danh lợi cao.',
      detect: (bt) => {
        if (bt.nhatCan !== 'Tân') return null;
        if (bt.tuTru[3].can !== 'Mậu' || bt.tuTru[3].chi !== 'Tý') return null;
        return { hopLe: true, lyDo: ['Ngày Tân + giờ Mậu Tý']};
      }
    },
    {
      ten: 'Huyền Vũ Đương Quyền', nhomCach: 'đặc-cách', weight: 6, override: false,
      source: 'TBCT chunk 140',
      description: 'Nhật Nhâm/Quý + Tài + Quan đầy đủ thấu lộ + cục không xung phá. "Huyền Vũ Thần", quan trường thuận.',
      detect: (bt) => {
        if (!['Nhâm','Quý'].includes(bt.nhatCan)) return null;
        const taiCount = _ttCanCountInTuTru(bt, ['Chính Tài','Thiên Tài']);
        const qsCount = _ttCanCountInTuTru(bt, ['Chính Quan','Thất Sát']);
        if (taiCount < 1 || qsCount < 1) return null;
        const xungN = (bt.hinhXungHaiHop?.lucXung || []).length;
        return { hopLe: xungN === 0, lyDo: ['Nhật Nhâm/Quý', `${taiCount} Tài + ${qsCount} Quan thấu`, xungN===0?'Cục không xung phá':'Có xung → bán cách']};
      }
    },
    {
      ten: 'Tài Quan Song Mỹ', nhomCach: 'đặc-cách', weight: 7, override: true,
      source: 'TBCT chunk 59',
      description: 'Ngày Quý + chi Tỵ — Bính (Tài) + Mậu (Quan) đều ở Tỵ. Tài Quan đầy đủ ở 1 chi đẹp. Đại phú quý.',
      detect: (bt) => {
        if (bt.nhatCan !== 'Quý') return null;
        if (!_hasChi(bt.tuTru,'Tỵ')) return null;
        const thuyCucPha = _countChi(bt.tuTru, TAM_HOP_THUY) >= 2;
        return { hopLe: !thuyCucPha, lyDo: ['Ngày Quý + chi Tỵ', 'Tỵ tàng Bính (Tài) + Mậu (Quan)', thuyCucPha?'Có Thủy cục phá':'Không Thủy cục']};
      }
    },
    {
      ten: 'Phi Thiên Lộc Mã', nhomCach: 'đặc-cách', weight: 7, override: true,
      source: 'TBCT chunk 41 & 124-125',
      description: 'Canh/Nhâm + nhiều Tý (Tý ám xung Ngọ → Quan tinh đến) HOẶC Tân/Quý + nhiều Hợi (Hợi xung Tỵ). Quý nhân đặc biệt.',
      detect: (bt) => {
        if (['Canh','Nhâm'].includes(bt.nhatCan) && _countChi(bt.tuTru, ['Tý']) >= 2) {
          return { hopLe: true, lyDo: [`Ngày ${bt.nhatCan}`, `${_countChi(bt.tuTru,['Tý'])} chữ Tý ám xung Ngọ`, 'Quan tinh phi đến']};
        }
        if (['Tân','Quý'].includes(bt.nhatCan) && _countChi(bt.tuTru, ['Hợi']) >= 2) {
          return { hopLe: true, lyDo: [`Ngày ${bt.nhatCan}`, `${_countChi(bt.tuTru,['Hợi'])} chữ Hợi ám xung Tỵ`, 'Quan tinh phi đến']};
        }
        return null;
      }
    },
    {
      ten: 'Khôi Cương', nhomCach: 'đặc-cách', weight: 7, override: false,
      source: 'TBCT chunk 12 & 104',
      description: '4 ngày sinh đặc biệt: Canh Thìn / Nhâm Thìn / Mậu Tuất / Canh Tuất. Cứng cỏi quyết liệt, người lãnh đạo. Kỵ tài quan vượng.',
      detect: (bt) => {
        const day = `${bt.tuTru[2].can} ${bt.tuTru[2].chi}`;
        const KHOI_CUONG = ['Canh Thìn','Nhâm Thìn','Mậu Tuất','Canh Tuất'];
        if (!KHOI_CUONG.includes(day)) return null;
        const taiCount = _ttCanCountInTuTru(bt, ['Chính Tài','Thiên Tài']);
        const qsCount = _ttCanCountInTuTru(bt, ['Chính Quan','Thất Sát']);
        const phaCach = taiCount >= 2 || qsCount >= 2;
        return { hopLe: !phaCach, lyDo: [`Ngày ${day} (Khôi Cương)`, phaCach?'Tài Quan vượng → phá cách':'Tài Quan không vượng → giữ cách']};
      }
    },
    {
      ten: 'Nhật Đức', nhomCach: 'đặc-cách', weight: 6, override: false,
      source: 'TBCT chunk 104',
      description: '5 ngày: Giáp Dần / Mậu Thìn / Bính Thân / Canh Thìn / Nhâm Tuất. Đặc tính từ thiện trung hậu, kỵ hình xung phá hại + Khôi Cương + Tài Quan vượng.',
      detect: (bt) => {
        const day = `${bt.tuTru[2].can} ${bt.tuTru[2].chi}`;
        const NHAT_DUC = ['Giáp Dần','Mậu Thìn','Bính Thân','Canh Thìn','Nhâm Tuất'];
        if (!NHAT_DUC.includes(day)) return null;
        const xungN = (bt.hinhXungHaiHop?.lucXung || []).length;
        const hinhN = (bt.hinhXungHaiHop?.tamHinh || []).length;
        return { hopLe: xungN === 0 && hinhN === 0, lyDo: [`Ngày ${day} (Nhật Đức)`, xungN+hinhN===0?'Không hình xung':'Có hình/xung → giảm phúc']};
      }
    },
    {
      ten: 'Nhật Quý', nhomCach: 'đặc-cách', weight: 6, override: false,
      source: 'TBCT chunk 103',
      description: '4 ngày Đinh Mão / Đinh Dậu / Quý Mão / Quý Tỵ — Thiên Ất Quý Nhân ngay tại nhật chi. Phẩm chất thuần nhất, có nhân đức.',
      detect: (bt) => {
        const day = `${bt.tuTru[2].can} ${bt.tuTru[2].chi}`;
        const NHAT_QUY = ['Đinh Mão','Đinh Dậu','Quý Mão','Quý Tỵ'];
        if (!NHAT_QUY.includes(day)) return null;
        const xungN = (bt.hinhXungHaiHop?.lucXung || []).length;
        return { hopLe: xungN === 0, lyDo: [`Ngày ${day} (Nhật Quý)`, xungN===0?'Không hình xung phá':'Có xung → quý nhân phẩn nộ']};
      }
    },
    {
      ten: 'Kim Thần', nhomCach: 'đặc-cách', weight: 6, override: false,
      source: 'TBCT chunk 106-107',
      description: '3 giờ Kim Thần: Quý Dậu / Kỷ Tỵ / Ất Sửu. Cần Hỏa khắc Kim mới phát. Không Hỏa thì khốn.',
      detect: (bt) => {
        const hour = `${bt.tuTru[3].can} ${bt.tuTru[3].chi}`;
        const KIM_THAN = ['Quý Dậu','Kỷ Tỵ','Ất Sửu'];
        if (!KIM_THAN.includes(hour)) return null;
        const coHoa = _countHanhInTuTru(bt,'Hỏa') >= 2;
        return { hopLe: coHoa, lyDo: [`Giờ ${hour} (Kim Thần)`, coHoa?'Có Hỏa khắc Kim → phát':'Thiếu Hỏa → khó phát']};
      }
    },
    {
      ten: 'Lưỡng Thần Thành Tượng', nhomCach: 'đặc-cách', weight: 7, override: true,
      source: 'TBCT chunk 6 (Phùng Ngọc Tường)',
      description: 'Tứ trụ chỉ có 2 hành thuần khiết (mỗi hành 4 vị) — như "lưỡng Ngọ bao Dậu Tuất". Cách kỳ đặc, đại quý.',
      detect: (bt) => {
        const hanhCount = {};
        for (const t of bt.tuTru) {
          const hCan = HANH_OF_CAN[t.can];
          const hChi = HANH_OF_CHI[t.chi];
          hanhCount[hCan] = (hanhCount[hCan]||0)+1;
          hanhCount[hChi] = (hanhCount[hChi]||0)+1;
        }
        const nonZero = Object.keys(hanhCount).filter(h => hanhCount[h] > 0);
        if (nonZero.length !== 2) return null;
        const [h1, h2] = nonZero;
        const balanced = Math.abs(hanhCount[h1] - hanhCount[h2]) <= 2;
        return { hopLe: balanced, lyDo: [`Chỉ 2 hành: ${h1} (${hanhCount[h1]}) + ${h2} (${hanhCount[h2]})`, balanced?'Cân đối lưỡng tượng':'Không cân đối']};
      }
    },
    {
      ten: 'Sát Ấn Tương Sinh', nhomCach: 'đặc-cách', weight: 7, override: false,
      source: 'TBCT chunk 124',
      description: 'Có Thất Sát + Chính Ấn liên tiếp trong tứ trụ. Sát hóa thành quyền tinh qua Ấn → quý hiển nắm quyền.',
      detect: (bt) => {
        const ttList = ['Năm','Tháng','Ngày','Giờ'].map(ten => bt.thapThan?.[ten]?.thienCan);
        let hasSat = false, hasAn = false;
        for (let i = 0; i < ttList.length; i++) {
          if (ttList[i] === 'Thất Sát') hasSat = true;
          if (['Chính Ấn','Kiêu Thần'].includes(ttList[i])) hasAn = true;
        }
        if (!hasSat || !hasAn) return null;
        const isVuong = bt.cuongNhuoc.label.includes('vượng') || bt.cuongNhuoc.label === 'Bình hòa';
        return { hopLe: isVuong, lyDo: ['Có Thất Sát + Ấn liên tiếp', 'Sát hóa Ấn thành quyền', isVuong?'Thân vượng đảm Sát':'Thân nhược không đảm']};
      }
    },

    // ─── NHÓM 5: NHẤT KHÍ + KỲ CÁCH (cực hiếm) ─────────────────────
    {
      ten: 'Thiên Nguyên Nhất Khí', nhomCach: 'kỳ-cách', weight: 9, override: true,
      source: 'TBCT chunk 6 (Phùng Ngọc Tường)',
      description: 'Bốn thiên can giống nhau (vd 4 Canh, 4 Mậu). Cực hiếm. Khí tinh thuần, đại quý hoặc đại bại tùy hợp dụng thần.',
      detect: (bt) => {
        const cans = bt.tuTru.map(t => t.can);
        if (!cans.every(c => c === cans[0])) return null;
        return { hopLe: true, lyDo: ['Bốn thiên can đều là ' + cans[0], 'Khí thuần nhất']};
      }
    },
    {
      ten: 'Địa Nguyên Nhất Khí', nhomCach: 'kỳ-cách', weight: 9, override: true,
      source: 'TBCT chunk 6',
      description: 'Bốn địa chi giống nhau. Cực hiếm. Năng lượng dồn về 1 phương hướng → tính cách cực đoan.',
      detect: (bt) => {
        const chis = bt.tuTru.map(t => t.chi);
        if (!chis.every(c => c === chis[0])) return null;
        return { hopLe: true, lyDo: ['Bốn địa chi đều là ' + chis[0], 'Khí dồn 1 phương']};
      }
    },
    {
      ten: 'Tam Kỳ Quý Nhân', nhomCach: 'kỳ-cách', weight: 7, override: false,
      source: 'TBCT chunk 12-13',
      description: 'Ba thiên can liên tiếp Giáp-Mậu-Canh / Ất-Bính-Đinh / Nhâm-Quý-Tân thấu đủ trong tứ trụ. Đa tài đa nghệ.',
      detect: (bt) => {
        const cans = bt.tuTru.map(t => t.can);
        const TAM_KY = [
          { name: 'Thiên Tam Kỳ', kys: ['Giáp','Mậu','Canh'] },
          { name: 'Nhân Tam Kỳ',  kys: ['Ất','Bính','Đinh'] },
          { name: 'Địa Tam Kỳ',   kys: ['Nhâm','Quý','Tân'] }
        ];
        for (const tk of TAM_KY) {
          if (tk.kys.every(k => cans.includes(k))) {
            return { hopLe: true, lyDo: [tk.name + ': đủ ' + tk.kys.join('-')]};
          }
        }
        return null;
      }
    },

    // ─── NHÓM 6: ĐẶC CÁCH HỢP/ÁM ───────────────────────────────────
    {
      ten: 'Sửu Dao Tỵ', nhomCach: 'đặc-cách', weight: 6, override: true,
      source: 'TBCT chunk 43',
      description: 'Ngày Tân Sửu hoặc Quý Sửu + tứ trụ KHÔNG có Quan tinh thấu. Sửu ám động kéo Tỵ → Bính (Tài/Quan ẩn). Kỵ Tý/Tỵ ở năm/giờ.',
      detect: (bt) => {
        const day = bt.tuTru[2].can + ' ' + bt.tuTru[2].chi;
        if (!['Tân Sửu','Quý Sửu'].includes(day)) return null;
        let coQuanThau = false;
        for (const ten of ['Năm','Tháng','Giờ']) {
          const tt = bt.thapThan?.[ten]?.thienCan;
          if (['Chính Quan','Thất Sát'].includes(tt)) { coQuanThau = true; break; }
        }
        if (coQuanThau) return null;
        const yearGioChi = [bt.tuTru[0].chi, bt.tuTru[3].chi];
        const koPha = !yearGioChi.includes('Tý') && !yearGioChi.includes('Tỵ');
        return { hopLe: koPha, lyDo: ['Ngày ' + day, 'Không có Quan tinh thấu', koPha ? 'Không Tý/Tỵ phá' : 'Có Tý hoặc Tỵ phá']};
      }
    },
    {
      ten: 'Củng Lộc Cách', nhomCach: 'đặc-cách', weight: 7, override: true,
      source: 'TBCT chunk 136',
      description: 'Ngày + giờ CÙNG can, hai chi củng vào 1 chi trống ở giữa = lộc của nhật can. Vd Giáp Tý + Giáp Dần củng Sửu. Kỵ điền thực + Quan tinh.',
      detect: (bt) => {
        const dayCan = bt.tuTru[2].can;
        const hourCan = bt.tuTru[3].can;
        if (dayCan !== hourCan) return null;
        const dayChi = bt.tuTru[2].chi;
        const hourChi = bt.tuTru[3].chi;
        const CHI_ORDER = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
        const di = CHI_ORDER.indexOf(dayChi);
        const hi = CHI_ORDER.indexOf(hourChi);
        const diff = Math.abs(di - hi);
        if (diff !== 2 && diff !== 10) return null;
        const midIdx = (di + hi) / 2;
        const midChi = CHI_ORDER[(midIdx + 12) % 12];
        const LOC = {'Giáp':'Dần','Ất':'Mão','Bính':'Tỵ','Đinh':'Ngọ','Mậu':'Tỵ','Kỷ':'Ngọ','Canh':'Thân','Tân':'Dậu','Nhâm':'Hợi','Quý':'Tý'};
        if (LOC[dayCan] !== midChi) return null;
        const dienThuc = [bt.tuTru[0].chi, bt.tuTru[1].chi].includes(midChi);
        let coQuanThau = false;
        for (const ten of ['Năm','Tháng']) {
          const tt = bt.thapThan?.[ten]?.thienCan;
          if (['Chính Quan','Thất Sát'].includes(tt)) coQuanThau = true;
        }
        return { hopLe: !dienThuc && !coQuanThau, lyDo: ['Ngày + giờ cùng ' + dayCan, 'Củng ' + midChi + ' (lộc của ' + dayCan + ')', dienThuc?'Bị điền thực':'', coQuanThau?'Có Quan thấu phá':''].filter(Boolean)};
      }
    },
    {
      ten: 'Thực Lộc Hợp Cách', nhomCach: 'đặc-cách', weight: 6, override: true,
      source: 'TBCT chunk 62',
      description: 'Ngày Mậu + chi Tỵ + chi Thân. Tỵ là vị trí Mậu, Thân là lộc Canh (Thực Thần của Mậu). Tỵ-Thân hợp → Thực Thần ám tới qua hợp.',
      detect: (bt) => {
        if (bt.nhatCan !== 'Mậu') return null;
        const chis = bt.tuTru.map(t => t.chi);
        if (!chis.includes('Tỵ') || !chis.includes('Thân')) return null;
        let coQuanAn = false;
        for (const ten of ['Năm','Tháng','Giờ']) {
          const tt = bt.thapThan?.[ten]?.thienCan;
          if (['Chính Quan','Thất Sát','Chính Ấn','Kiêu Thần'].includes(tt)) coQuanAn = true;
        }
        return { hopLe: !coQuanAn, lyDo: ['Ngày Mậu', 'Có Tỵ + Thân (Tỵ-Thân hợp)', coQuanAn?'Có Quan/Ấn thấu phá':'Không Quan/Ấn phá']};
      }
    },

    // ─── NHÓM 7: PHỐI HỢP CÁCH (cảnh báo / hỗ trợ) ─────────────────
    {
      ten: 'Tham Hợp Vong Quan', nhomCach: 'phối-hợp', weight: 5, override: false,
      source: 'TBCT chunk 27 & 52',
      description: 'Cảnh báo XẤU: Chính Quan bị thiên can khác hợp đi → quan tinh không phát huy. Sự nghiệp bị trói buộc, công danh khó thi thố.',
      detect: (bt) => {
        const HOP_PAIRS = {'Giáp':'Kỷ','Kỷ':'Giáp','Ất':'Canh','Canh':'Ất','Bính':'Tân','Tân':'Bính','Đinh':'Nhâm','Nhâm':'Đinh','Mậu':'Quý','Quý':'Mậu'};
        const cans = bt.tuTru.map(t => t.can);
        const tens = ['Năm','Tháng','Ngày','Giờ'];
        let quanCan = null, quanIdx = -1;
        for (let i = 0; i < 4; i++) {
          if (i === 2) continue;
          const tt = bt.thapThan?.[tens[i]]?.thienCan;
          if (tt === 'Chính Quan') { quanCan = cans[i]; quanIdx = i; break; }
        }
        if (!quanCan) return null;
        for (let j = 0; j < 4; j++) {
          if (j === quanIdx || j === 2) continue;
          if (HOP_PAIRS[quanCan] === cans[j]) {
            return { hopLe: false, lyDo: ['Chính Quan ' + quanCan + ' bị hợp với ' + cans[j], 'Vong Quan — sự nghiệp khó thi thố']};
          }
        }
        return null;
      }
    },
    {
      ten: 'Tham Hợp Vong Sát', nhomCach: 'phối-hợp', weight: 6, override: false,
      source: 'TBCT chunk 27',
      description: 'TỐT: Thất Sát bị thiên can khác hợp đi → "tham hợp vong sát vi kỷ phúc". Sát hung bị chế ngự = phúc, hung không còn hung.',
      detect: (bt) => {
        const HOP_PAIRS = {'Giáp':'Kỷ','Kỷ':'Giáp','Ất':'Canh','Canh':'Ất','Bính':'Tân','Tân':'Bính','Đinh':'Nhâm','Nhâm':'Đinh','Mậu':'Quý','Quý':'Mậu'};
        const cans = bt.tuTru.map(t => t.can);
        const tens = ['Năm','Tháng','Ngày','Giờ'];
        let satCan = null, satIdx = -1;
        for (let i = 0; i < 4; i++) {
          if (i === 2) continue;
          const tt = bt.thapThan?.[tens[i]]?.thienCan;
          if (tt === 'Thất Sát') { satCan = cans[i]; satIdx = i; break; }
        }
        if (!satCan) return null;
        for (let j = 0; j < 4; j++) {
          if (j === satIdx || j === 2) continue;
          if (HOP_PAIRS[satCan] === cans[j]) {
            return { hopLe: true, lyDo: ['Thất Sát ' + satCan + ' bị hợp với ' + cans[j], 'Vong Sát — hung bị chế thành phúc']};
          }
        }
        return null;
      }
    },
    {
      ten: 'Thương Quan Đới Sát', nhomCach: 'phối-hợp', weight: 6, override: false,
      source: 'TBCT chunk 145',
      description: 'Có Thương Quan + Thất Sát đồng thời. Thương Quan chế Sát = thành tài, hợp võ chức/người sắc bén. Cần thân vượng để gánh được.',
      detect: (bt) => {
        let coTQ = false, coTS = false;
        const tens = ['Năm','Tháng','Ngày','Giờ'];
        for (let i = 0; i < 4; i++) {
          if (i === 2) continue;
          const tt = bt.thapThan?.[tens[i]]?.thienCan;
          if (tt === 'Thương Quan') coTQ = true;
          if (tt === 'Thất Sát') coTS = true;
        }
        if (!coTQ || !coTS) return null;
        const isVuong = bt.cuongNhuoc.label.includes('vượng') || bt.cuongNhuoc.label === 'Bình hòa';
        return { hopLe: isVuong, lyDo: ['Có Thương Quan + Thất Sát', 'Thương Quan chế Sát', isVuong?'Thân vượng đảm Sát':'Thân nhược không đảm']};
      }
    },
    {
      ten: 'Tuế Đức Phù Tài', nhomCach: 'phối-hợp', weight: 5, override: false,
      source: 'TBCT chunk 146',
      description: 'Năm sinh là Tài tinh của nhật can + thân vượng. Tuế can là Tài tinh, được phụ tài tổ tiên. Có khả năng kế thừa cơ nghiệp.',
      detect: (bt) => {
        const yearTT = bt.thapThan?.['Năm']?.thienCan;
        if (!['Chính Tài','Thiên Tài'].includes(yearTT)) return null;
        const isVuong = bt.cuongNhuoc.label.includes('vượng') || bt.cuongNhuoc.label === 'Bình hòa';
        return { hopLe: isVuong, lyDo: ['Năm sinh = ' + yearTT, isVuong?'Thân vượng đảm tài':'Thân nhược không đảm']};
      }
    },
  ];

  // ============================================================
  // MAIN API
  // ============================================================
  function detectSpecialCachCuc(bt) {
    const matches = [];
    for (const p of PATTERNS) {
      try {
        const result = p.detect(bt);
        if (result) {
          matches.push({
            ten: p.ten,
            nhomCach: p.nhomCach,
            description: p.description,
            weight: p.weight,
            source: p.source,
            override: p.override || false,
            hopLe: result.hopLe,
            lyDo: result.lyDo.filter(Boolean),
          });
        }
      } catch (e) {
        if (typeof console !== 'undefined') console.warn(`[tubinh-special] ${p.ten} detect err:`, e.message);
      }
    }
    // Sort by weight desc, hopLe first
    matches.sort((a, b) => {
      if (a.hopLe !== b.hopLe) return a.hopLe ? -1 : 1;
      if (a.override !== b.override) return a.override ? -1 : 1;
      return b.weight - a.weight;
    });
    return matches;
  }

  if (typeof module !== 'undefined') {
    module.exports = { detectSpecialCachCuc, PATTERNS };
  } else {
    root.TuBinhSpecialCach = { detectSpecialCachCuc, PATTERNS };
  }
})(typeof window !== 'undefined' ? window : globalThis);
