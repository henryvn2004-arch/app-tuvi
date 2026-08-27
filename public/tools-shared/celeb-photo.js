/* tools-shared/celeb-photo.js — Ảnh người nổi tiếng: NGUỒN DUY NHẤT của
   chuỗi rơi và của mọi URL Commons.
   window.CelebPhoto = { BUCKET, WARM_PER_KEY, THUMB_W, commonsThumb,
                         commonsFilePage, storageKey, storageUrl, anhCho }

   ── VÌ SAO PHẢI DÙNG CHUNG ─────────────────────────────────
   Ảnh đi qua BA chặng, và mỗi chặng hỏng theo kiểu IM LẶNG:
     1. `image_url` — bản đã kéo về Supabase Storage (nhanh, mình làm chủ)
     2. URL Commons dựng từ `image_file` (đường lùi khi chưa kịp đồng bộ)
     3. `null` ⇒ UI hiện avatar chữ cái
   Route API chọn chặng nào, script đồng bộ quyết định kéo ảnh nào về — hai bên
   mà ghép URL riêng thì sẽ trôi khỏi nhau, và triệu chứng của "trôi" giống hệt
   triệu chứng của "ảnh chưa đồng bộ": thẻ vẫn hiện, chỉ là hiện avatar chữ.
   Không có gì báo. Nên chuỗi rơi ở ĐÂY, và chỉ ở đây.

   ⚠️ KHÔNG tự dựng URL `upload.wikimedia.org/.../thumb/...`: dạng đó cần băm
   MD5 của tên file. Dựng tay là sai lặng lẽ (ảnh vỡ, không lỗi). Dùng
   `Special:FilePath?width=` — Wikimedia tự chuyển hướng sang bản thumb. */
(function (root) {
  /** Bucket Supabase Storage chứa ảnh đã kéo về. Công khai (ảnh vốn tự do). */
  var BUCKET = 'celeb-photos';

  /** Bề rộng thumb. Thẻ hiện ảnh 56px, ×2 cho màn Retina, ×2 nữa cho dư địa. */
  var THUMB_W = 240;

  /* Mỗi khoá T1 kéo về bao nhiêu ảnh.

     API lấy `SLOTS*3 = 15` dòng đầu theo `fame_score` cho tầng T1 rồi mới xếp
     lại theo châu lục, nên tập ỨNG VIÊN của một khoá đúng bằng 15 dòng đó.
     Kéo cả 15 thì tốn ~3× mà phần lớn không bao giờ lên hình.

     ⚠️ ĐÂY LÀ MỘT CÁI TRẦN, VÀ NÓ PHẢI ĐƯỢC NÓI TO. Ảnh xếp hạng 9–15 của một
     khoá KHÔNG được kéo về ⇒ vẫn hotlink Commons. Script đồng bộ in ra đúng số
     dòng nó bỏ lại — trần im lặng thì đọc thành "đã phủ hết", mà không phải. */
  var WARM_PER_KEY = 8;

  /** Chuẩn hoá tên file Commons: khoảng trắng → gạch dưới, rồi encode. */
  function encFile(file) {
    return encodeURIComponent(String(file).replace(/ /g, '_'));
  }

  /** URL thumb trên Commons — đường LÙI khi chưa kéo ảnh về. */
  function commonsThumb(file, width) {
    if (!file) return null;
    return (
      'https://commons.wikimedia.org/wiki/Special:FilePath/' +
      encFile(file) +
      '?width=' +
      (width || THUMB_W)
    );
  }

  /** Trang mô tả file — nơi có tác giả + license. Luôn dẫn về đây để ghi công. */
  function commonsFilePage(file) {
    if (!file) return null;
    return 'https://commons.wikimedia.org/wiki/File:' + encFile(file);
  }

  /* Đường dẫn trong bucket. Khoá theo `qid` (Wikidata Q-id) chứ KHÔNG theo tên
     file Commons: tên file Commons đổi được (đổi tên, gỡ, tải lại), qid thì
     không. Khoá theo thứ đổi được là mồ côi cả đống ảnh sau một lượt đồng bộ. */
  function storageKey(qid, ext) {
    return String(qid) + '.' + (ext || 'jpg');
  }

  function storageUrl(supabaseUrl, key) {
    return String(supabaseUrl).replace(/\/+$/, '') + '/storage/v1/object/public/' + BUCKET + '/' + key;
  }

  /* CHUỖI RƠI — hàm này là lý do file tồn tại.
     Trả { url, nguon } với nguon ∈ 'storage' | 'commons' | null. `nguon` để
     đo được: không có nó thì "đã kéo về bao nhiêu %" là câu không trả lời được
     mà vẫn trông như đang chạy tốt. */
  function anhCho(row) {
    if (row && row.image_url) return { url: row.image_url, nguon: 'storage' };
    if (row && row.image_file) return { url: commonsThumb(row.image_file, THUMB_W), nguon: 'commons' };
    return { url: null, nguon: null };
  }

  var API = {
    BUCKET: BUCKET,
    THUMB_W: THUMB_W,
    WARM_PER_KEY: WARM_PER_KEY,
    commonsThumb: commonsThumb,
    commonsFilePage: commonsFilePage,
    storageKey: storageKey,
    storageUrl: storageUrl,
    anhCho: anhCho,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.CelebPhoto = API;
})(typeof window !== 'undefined' ? window : globalThis);
