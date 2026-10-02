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

## 5. Lịch chạy đêm (Routine, 01:07 giờ VN, 100 hồ sơ/đêm — Henry duyệt 2026-10-02)
Mỗi lượt, từ gốc repo, trên nhánh `claude/zen-cerf-yi0gni`:
```bash
git fetch origin main claude/zen-cerf-yi0gni   # nhánh còn PR MỞ → làm tiếp trên nó; PR đã merge → làm lại nhánh từ main
git checkout claude/zen-cerf-yi0gni && git reset --hard origin/claude/zen-cerf-yi0gni   # (PR đã merge thì thay bằng: git checkout -B claude/zen-cerf-yi0gni origin/main)
S=$(npx tsx scripts/nghiem-chung/con-lai.ts --limit 100 --ca-chua-goi --json)
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt NODE_NO_WARNINGS=1 \
  npx tsx scripts/nghiem-chung/pack.ts --slugs "$(echo "$S" | node -pe 'JSON.parse(require("fs").readFileSync(0)).join(",")')"
npx tsx scripts/nghiem-chung/brief.ts $(echo "$S" | node -pe 'JSON.parse(require("fs").readFileSync(0)).join(" ")')  # in ra mảng slug có brief
```
Rồi Workflow `scriptPath: scripts/nghiem-chung/workflow.js`, `args: {"slugs": <mảng brief in ra>, "effort": "low"}`.
Xong: `manifest.ts` → `git add -f data/nghiem-chung/ho-so data/nghiem-chung/loai-tru data/nghiem-chung/manifest.json` → commit →
`git push -u origin claude/zen-cerf-yi0gni` (nhánh làm lại từ main thì `--force-with-lease`) → chưa có PR mở thì mở PR draft vào main.
Một PR gom mọi lô cho tới khi Henry merge; KHÔNG tự merge.
Chạm trần sử dụng giữa chừng thì commit phần đã xong rồi dừng — đêm sau `con-lai` tự nhặt tiếp.

## 6. Lịch chạy đêm ĐOÁN GIỜ (Routine riêng, 03:07 giờ VN, 40 hồ sơ/đêm ≈ 10% hạn mức ngày — Henry duyệt 2026-10-02)
Người KHÔNG có giờ sinh; hàng đợi `data/nghiem-chung/doan-gio.jsonl` xếp sẵn: Việt Nam → Đông/Đông Nam Á → còn lại châu Á.
Người Việt: KHÔNG chính trị, tôn giáo, Phạm Nhật Vượng (đã lọc sẵn trong file — thêm người Việt mới phải lọc tay).
```bash
git fetch origin main claude/zen-cerf-yi0gni   # nhánh còn PR MỞ → làm tiếp trên nó; PR đã merge → làm lại nhánh từ main
git checkout claude/zen-cerf-yi0gni && git reset --hard origin/claude/zen-cerf-yi0gni   # (PR đã merge thì thay bằng: git checkout -B claude/zen-cerf-yi0gni origin/main)
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt NODE_NO_WARNINGS=1 \
  npx tsx scripts/nghiem-chung/doan-gio.ts lo --limit 40      # stdout = mảng slug có brief-doan
```
Rồi Workflow `scriptPath: scripts/nghiem-chung/workflow.js`, `args: {"slugs": <mảng đó>, "effort": "low", "doan": true}`.
Xong: như mục 5 (manifest → git add -f ho-so/loai-tru/manifest → commit → push).
Hàng đợi còn < 80 người thì báo Henry để xuất thêm bậc sau (phần còn lại thế giới, sitelinks ≥ 40).
