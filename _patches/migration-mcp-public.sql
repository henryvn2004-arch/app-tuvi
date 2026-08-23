-- _patches/migration-mcp-public.sql
-- ============================================================
-- MCP CÔNG KHAI (mục #9/14) — một dòng khoá SENTINEL cho endpoint không key.
--
-- 🔑 VÌ SAO PHẢI CÓ DÒNG NÀY: `mcp_usage.key` có FK trỏ `mcp_keys.key`. Endpoint
-- công khai vẫn muốn ghi usage (đó là tín hiệu tăng trưởng DUY NHẤT đo được của
-- mục #9), mà `logUsage` nuốt lỗi im lặng — không có dòng này thì mọi lượt ghi
-- vi phạm FK rồi biến mất, và panel sẽ nói "không ai dùng" trong khi thật ra là
-- "không ghi được". Đúng lớp hỏng-im-lặng cả repo này đi vá.
--
-- Ai gõ thẳng /mcp/__public__ thì nhận ĐÚNG những gì /mcp cho — không leo thang
-- quyền gì cả, nên để `active = true` cho thẳng thắn.
--
-- `backtest_years = -1` (quá khứ vô hạn) CÓ CHỦ Ý: tra vận hạn quá khứ là tra
-- bảng thuần, 0đ. Nếu để số hữu hạn thì hạn mức đếm theo KEY, mà cả thiên hạ
-- dùng chung một key ⇒ vài người đầu tiên đốt sạch hạn mức của mọi người sau.
-- `future_years = 0` giữ nguyên: năm TƯƠNG LAI mới là thứ người ta trả tiền,
-- và thông điệp từ chối sẵn có đã trỏ về trang lấy key.
-- ============================================================

insert into public.mcp_keys (key, tier, label, charts_allowed, backtest_years, future_years, active)
values ('__public__', 'free', 'Endpoint MCP công khai (/mcp) — không key', 1, -1, 0, true)
on conflict (key) do update
  set tier = excluded.tier,
      label = excluded.label,
      backtest_years = excluded.backtest_years,
      future_years = excluded.future_years,
      active = excluded.active;
