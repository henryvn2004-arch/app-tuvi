import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Spinner, useSnackbar } from 'zmp-ui';
import { openWebview } from 'zmp-sdk';
import { insideZalo } from '../lib/storage';
import { RichText } from '../lib/text';
import { getReport, listReports, type Report, type ReportItem } from '../lib/reports';
import {
  createBankOrder,
  getBalance,
  isOrderPaid,
  listPackages,
  type CreditPackage,
} from '../lib/wallet';

const POLL_MS = 4000;
const POLL_FOR_MS = 15 * 60_000; // đơn payOS còn hạn ~15 phút

export default function MePage() {
  const { openSnackbar } = useSnackbar();
  const snack = useRef(openSnackbar);
  snack.current = openSnackbar;
  const fail = useCallback(
    (e: unknown) => snack.current({ text: (e as Error).message, type: 'error' }),
    []
  );

  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CreditPackage[] | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [open, setOpen] = useState<Report | null>(null);
  const alive = useRef(true);

  const refreshBalance = useCallback(() => {
    getBalance().then(setBalance).catch(fail);
  }, [fail]);

  useEffect(() => {
    alive.current = true;
    refreshBalance();
    listReports()
      .then(setReports)
      .catch((e) => {
        setReports([]);
        fail(e);
      });
    return () => {
      alive.current = false;
    };
  }, [refreshBalance, fail]);

  async function showPackages() {
    try {
      setPackages(await listPackages());
    } catch (e) {
      fail(e);
    }
  }

  async function buy(p: CreditPackage) {
    setPackages(null);
    try {
      const order = await createBankOrder(p.package_id);
      if (insideZalo()) await openWebview({ url: order.checkoutUrl });
      else window.open(order.checkoutUrl, '_blank');
      // Chờ webhook payOS cộng Lượng — hỏi lại tới khi đơn "paid" hoặc hết hạn đơn.
      setWaiting(true);
      const until = Date.now() + POLL_FOR_MS;
      while (alive.current && Date.now() < until) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (await isOrderPaid(order.orderCode).catch(() => false)) {
          snack.current({ text: `Đã nhận ${order.credits} Lượng`, type: 'success' });
          refreshBalance();
          break;
        }
      }
    } catch (e) {
      fail(e);
    } finally {
      if (alive.current) setWaiting(false);
    }
  }

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
        {waiting ? (
          <p>Đang chờ xác nhận chuyển khoản…</p>
        ) : (
          <Button size="small" onClick={showPackages}>
            Nạp Lượng
          </Button>
        )}
      </section>

      {packages && (
        <section className="tv-card">
          <h2>Chọn gói nạp</h2>
          {packages.map((p) => (
            <button key={p.package_id} type="button" className="tv-row" onClick={() => buy(p)}>
              <strong>{p.credits.toLocaleString('vi-VN')} Lượng</strong>
              <span>{p.amount_vnd.toLocaleString('vi-VN')}đ</span>
            </button>
          ))}
          <Button size="small" variant="tertiary" onClick={() => setPackages(null)}>
            Huỷ
          </Button>
        </section>
      )}

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
