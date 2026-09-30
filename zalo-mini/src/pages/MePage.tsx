import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Spinner, useSnackbar } from 'zmp-ui';
import { confirmLinkCode, requestLinkCode } from '../lib/link';
import { isZaloOnlyAccount } from '../lib/session';
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

  const [zaloOnly, setZaloOnly] = useState(false);
  const [gen, setGen] = useState(0); // tăng sau khi gộp ⇒ đọc lại mọi thứ theo tài khoản mới

  useEffect(() => {
    getBalance().then(setBalance).catch(fail);
    isZaloOnlyAccount()
      .then(setZaloOnly)
      .catch(() => setZaloOnly(false));
    listReports()
      .then(setReports)
      .catch((e) => {
        setReports([]);
        fail(e);
      });
  }, [fail, gen]);

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

      {zaloOnly && (
        <LinkWebAccount
          onDone={(email) => {
            snack.current({ text: `Đã gộp vào tài khoản ${email}`, type: 'success' });
            setGen((g) => g + 1);
          }}
          onError={fail}
        />
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

/** Người đã có tài khoản tuviminhbao.com gộp vào để dùng chung Lượng, Sổ lá số, báo cáo. */
function LinkWebAccount({
  onDone,
  onError,
}: {
  onDone: (email: string) => void;
  onError: (e: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <section className="tv-card tv-cta">
        <p>Đã có tài khoản tuviminhbao.com? Gộp vào để dùng chung Lượng, Sổ lá số và báo cáo.</p>
        <Button size="small" variant="secondary" onClick={() => setOpen(true)}>
          Gộp tài khoản
        </Button>
      </section>
    );

  return (
    <section className="tv-card">
      <h2>Gộp tài khoản</h2>
      {!sent ? (
        <>
          <p className="tv-muted">Nhập email bạn đã đăng ký. Mã 6 số sẽ được gửi vào email đó.</p>
          <Input
            type="text"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@vidu.com"
          />
          <Button
            size="small"
            disabled={busy || !email.includes('@')}
            onClick={() => run(async () => {
              await requestLinkCode(email);
              setSent(true);
            })}
          >
            Gửi mã
          </Button>
        </>
      ) : (
        <>
          <p className="tv-muted">
            Nếu {email} có tài khoản, mã 6 số vừa được gửi tới (xem cả mục Spam). Mã dùng được 10
            phút.
          </p>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Mã 6 số"
          />
          <Button
            size="small"
            disabled={busy || code.replace(/\D/g, '').length !== 6}
            onClick={() => run(async () => onDone(await confirmLinkCode(code)))}
          >
            Xác nhận
          </Button>
          <Button size="small" variant="tertiary" onClick={() => setSent(false)}>
            Đổi email
          </Button>
        </>
      )}
    </section>
  );
}
