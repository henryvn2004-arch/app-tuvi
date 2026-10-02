# Runbook — phiên cloud chạy một phần (shard) Nghiệm Chứng

Henry (chủ repo) đã duyệt chạy việc này bằng **workflow nhiều agent** và mở nhiều phiên song song.
Mỗi phiên làm MỘT phần `K/6` của danh sách 13.701 người, trên nhánh riêng. Phiên điều phối
(nhánh `claude/zen-cerf-yi0gni`) gộp kết quả, dựng manifest, mở index. **Đừng sửa code, đừng sửa
manifest, đừng tạo PR** — chỉ thêm file hồ sơ.

## 0. Chuẩn bị (một lần)
```bash
cd <gốc repo>
git checkout -B <nhánh-được-giao> origin/claude/zen-cerf-yi0gni
npm ci --no-audit --no-fund --loglevel=error
(cd tuvi-engine && npm ci --no-audit --no-fund --loglevel=error && npm run build)   # nhớ về gốc repo
echo 'work/' >> .git/info/exclude
```

## 1. Đóng gói dữ liệu cho phần của mình (chạy NỀN, ~30–40 phút, chạy lại an toàn)
```bash
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt NODE_NO_WARNINGS=1 \
  npx tsx scripts/nghiem-chung/pack.ts --shard K/6 > work/pack.log 2>&1
```
Không cần chờ xong mới viết — gói nào có rồi là viết được.

## 2. Vòng lặp viết hồ sơ (lặp đến khi hết)
```bash
npx tsx scripts/nghiem-chung/con-lai.ts --shard K/6 --limit 120 --json   # → mảng slug
npx tsx scripts/nghiem-chung/brief.ts <các slug trên>                      # agent CHỈ đọc brief
```
Chạy Workflow với `scriptPath: scripts/nghiem-chung/workflow.js` và `args: {"slugs": [...], "effort": "low"}` (mảng JSON
thật, không phải chuỗi). Có thể chạy **2 workflow cùng lúc** trên hai lô KHÁC NHAU (lấy `--limit 240`
rồi chia đôi) để tận dụng song song. Mỗi lô xong:
```bash
git add -f data/nghiem-chung/ho-so data/nghiem-chung/loai-tru
git commit -m "Nghiệm Chứng: phần K/6 — thêm hồ sơ" && git push -u origin <nhánh-được-giao>
```
(Push lỗi mạng thì thử lại 2s/4s/8s/16s.) Rồi lấy lô tiếp theo. Dừng khi `con-lai` trả mảng rỗng
VÀ `work/pack.log` đã in xong (gói hết).

## 3. Lỗi thường gặp
- Workflow trả agent lỗi cho vài slug → cứ để, lô sau `con-lai` sẽ đưa lại (slug chưa có hồ sơ).
- Một slug fail validate nhiều lần → agent tự ghi `loaiTru: khong-dat`, không cần can thiệp.
- Hết hạn mức sử dụng → commit + push những gì đã có rồi dừng, báo lại trong câu trả lời cuối.
- Đừng `pkill -f '…pack.ts…'` trong cùng câu lệnh có chuỗi đó (tự giết shell) — bắt PID rồi `kill`.

## 4. Báo cáo
Câu trả lời cuối của phiên: số hồ sơ đã đẩy, số loại trừ, slug lỗi (nếu có), nhánh đã push.
