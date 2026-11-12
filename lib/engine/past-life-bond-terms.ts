/**
 * lib/engine/past-life-bond-terms.ts — chữ do engine Duyên Nợ Tiền Kiếp viết sẵn (nhãn + câu mô tả 7 loại
 * duyên, nhãn + câu của các "dấu hiệu cổ pháp"). Engine dựng chữ Việt từ ĐÚNG các bảng này (byte-giống bản
 * cũ: chữ còn vào prompt truyện + `portrait_cache`) và trả kèm mã tra (`kind` ở BondType, `ma`/`bien` ở
 * BondSignal) để CLIENT dịch tại chỗ vẽ — ns `duyen-no`, docs/i18n/QUY-UOC.md "Văn engine server".
 *
 * Khoá `SIGNAL_DETAIL`: `<nhóm>.<biến thể>` — phần trước dấu chấm CŨNG là khoá của `SIGNAL_LABEL`.
 * `{x}` là biến: tên nhân vật (giữ nguyên) · hành nạp âm (qua glossary `hanh` ở client) · danh xưng.
 */
export const BOND_LABEL: Record<string, string> = {
  'phu-the': 'Duyên phu thê',
  'kim-lan': 'Nghĩa kim lan',
  'an-nhan': 'Ơn cứu mạng',
  'thay-tro': 'Nghĩa thầy trò',
  'oan-gia': 'Nợ chưa trả',
  'doi-dau': 'Hai bờ chiến tuyến',
  'ban-huu': 'Duyên tao ngộ',
};

export const BOND_GIST: Record<string, string> = {
  'phu-the': 'Hai người từng nên duyên chồng vợ, sống chung một mái, chia nhau cả phúc lẫn hoạ.',
  'kim-lan': 'Hai người từng kết nghĩa sinh tử, coi nhau như ruột thịt dù không cùng huyết thống.',
  'an-nhan': 'Một người từng ra tay cứu hoặc nâng đỡ người kia qua lúc ngặt nghèo nhất.',
  'thay-tro': 'Một người từng truyền nghề, truyền chữ hoặc dẫn đường cho người kia vào đời.',
  'oan-gia': 'Hai người từng làm tổn thương nhau, món nợ ấy khép lại mà chưa thật sự xong.',
  'doi-dau': 'Hai người từng đứng ở hai phía đối nghịch, không hẳn vì thù riêng mà vì thời cuộc.',
  'ban-huu': 'Hai người từng gặp nhau giữa đường đời, không ràng buộc gì lớn, nhưng lần gặp ấy để lại dấu.',
};

export const SIGNAL_LABEL: Record<string, string> = {
  chi: 'Địa chi cung Mệnh',
  hanh: 'Ngũ hành nạp âm',
  star: 'Chính tinh cung Mệnh',
  chucphan: 'Chức phận',
  phuthe: 'Địa chi cung Phu Thê',
};

export const SIGNAL_DETAIL: Record<string, string> = {
  'chi.luchop': 'Mệnh hai người Lục Hợp — cổ pháp coi là duyên gắn bó bậc nhất',
  'chi.tamhop': 'Mệnh hai người cùng Tam Hợp — một phe, một hướng',
  'chi.same': 'Mệnh hai người cùng địa chi — cùng khí chất',
  'chi.tuxung': 'Mệnh hai người Tứ Xung — ở hai đầu đối nhau',
  'chi.tamhinh': 'Mệnh hai người phạm Tam Hình — dấu hiệu tổn thương lẫn nhau',
  'chi.neutral': 'Mệnh hai người không hợp không xung',
  'hanh.dong': 'Nạp âm cùng một hành — đồng khí tương cầu',
  'hanh.sinh': 'Nạp âm {x} sinh {y} — {p} nuôi dưỡng {q}',
  'hanh.khac': 'Nạp âm {x} khắc {y} — {p} kìm {q}',
  'hanh.neutral': 'Nạp âm hai người không sinh không khắc',
  'star.cap-hoa-hop': 'Chính tinh tại Mệnh hai người là một cặp cổ thư coi là đi liền nhau',
  'star.dong-khi': 'Hai người có chung chính tinh tại Mệnh — cùng một chất người',
  'star.hai-sao-cung': 'Cả hai đều mang sao cứng (Thất Sát / Phá Quân) tại Mệnh — dễ va nhau',
  'star.neutral': 'Chính tinh tại Mệnh hai người không có tương quan đặc biệt',
  'chucphan': 'Chênh nhau rõ về vị thế ({a} — {b})',
  'phuthe.same': 'Phu Thê hai người cùng địa chi — dấu hiệu ràng buộc đôi lứa',
  'phuthe.luchop': 'Phu Thê hai người Lục Hợp — dấu hiệu ràng buộc đôi lứa',
  'phuthe.tamhop': 'Phu Thê hai người cùng Tam Hợp — dấu hiệu ràng buộc đôi lứa',
};
