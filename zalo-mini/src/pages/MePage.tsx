import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Spinner, useSnackbar } from 'zmp-ui';
import { RichText } from '../lib/text';
import { getReport, listReports, type Report, type ReportItem } from '../lib/reports';
import { getBalance } from '../lib/wallet';

// KHÔNG có nút nạp Lượng ở đây: chính sách Zalo cấm Mini App "nạp tiền vào tài
// khoản" (ví nội bộ) lẫn dẫn người dùng ra website ngoài. Mini App chỉ HIỆN và
// TIÊU số dư chung với tài khoản web.

export default function MePage() {
  const { openSnackbar } = useSnackbar();
  const snack = useRef(openSnackbar);
  snack.current = openSnackbar;
  const fail = useCallback(
    (e: unknown) => snack.current({ text: (e as Error).message, type: 'error' }),
    []
  );

  const [balance, setBalance] = useState<number | null>(null);
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [open, setOpen] = useState<Report | null>(null);

  const refreshBalance = useCallback(() => {
    getBalance().then(setBalance).catch(fail);
  }, [fail]);

  useEffect(() => {
    refreshBalance();
    listReports()
      .then(setReports)
      .catch((e) => {
        setReports([]);
        fail(e);
      });
  }, [refreshBalance, fail]);

  async function view(r: ReportItem) {
    try {
      setOpen(await getReport(r.id));
    } catch (e) {
      fail(e);
    }
  }

  if (open) {
    return (
      <div className="tv-page">
        <Button size="small" variant="tertiary" onClick={() => setOpen(null)}>
          ← Báo cáo của tôi
        </Button>
        <section className="tv-card tv-report">
          <div className="tv-muted">{open.toolLabel}</div>
          <h1>{open.title}</h1>
          {open.subtitle && <p className="tv-muted">{open.subtitle}</p>}
          {open.imageUrl && <img src={open.imageUrl} alt="" />}
          {open.blocks.map((b, i) => (
            <div key={i}>
              {b.header && <h2>{b.header}</h2>}
              {b.image && <img src={b.image} alt="" />}
              {b.text && <RichText text={b.text} />}
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="tv-page">
      <section className="tv-card tv-hero">
        <div className="tv-muted">Số dư</div>
        <h1>{balance == null ? '…' : `${balance.toLocaleString('vi-VN')} Lượng`}</h1>
        <p className="tv-muted">Số dư dùng chung với tài khoản của bạn ở mọi nơi.</p>
      </section>

      <h2 className="tv-group">Báo cáo của tôi</h2>
      {!reports ? (
        <div className="tv-center">
          <Spinner />
        </div>
      ) : reports.length === 0 ? (
        <p className="tv-empty">
          Chưa có báo cáo nào. Báo cáo xem ở web hay trong app đều hiện ở đây.
        </p>
      ) : (
        reports.map((r) => (
          <button key={r.id} type="button" className="tv-card tv-row" onClick={() => view(r)}>
            <span>
              <strong>{r.title}</strong>
              <span className="tv-muted">
                {' '}
                {[r.toolLabel, r.subtitle].filter(Boolean).join(' · ')}
              </span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}
