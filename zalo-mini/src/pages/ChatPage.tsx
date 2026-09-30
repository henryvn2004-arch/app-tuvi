import { useEffect, useRef, useState } from 'react';
import { Button, Icon, Input, useSnackbar } from 'zmp-ui';
import { toBirthParams, type Chart } from '../lib/birth';
import { askThay, newSessionId } from '../lib/chat';
import { loadMyChart } from '../lib/charts';
import { pickImage, type PickedImage } from '../lib/media';
import { RichText } from '../lib/text';
import type { Scenario } from '../lib/web-tools';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  error?: boolean;
  /** ảnh người hỏi gửi kèm (data URL xem trước) */
  image?: string;
}

const GOI_Y = [
  'Vận tháng này của tôi thế nào?',
  'Công việc năm nay ra sao?',
  'Chuyện tình cảm của tôi?',
];

export default function ChatPage({
  chart,
  scenario,
  onPickChart,
}: {
  chart: Chart | null;
  /** Kết quả công cụ vừa xem (tab Công cụ) — có thì hỏi về kết quả đó thay vì lá số. */
  scenario: Scenario | null;
  onPickChart: () => void;
}) {
  const [subject, setSubject] = useState<Chart | null>(chart);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [chips, setChips] = useState<string[]>(scenario?.chips || GOI_Y);
  const endRef = useRef<HTMLDivElement>(null);
  const { openSnackbar } = useSnackbar();

  // Không được chọn từ Sổ thì hỏi về lá số "của tôi" (nếu đã lưu).
  useEffect(() => {
    if (chart) return;
    loadMyChart()
      .then(setSubject)
      .catch(() => setSubject(null));
  }, [chart]);

  // Đổi người/kết quả được hỏi ⇒ phiên mới: server ghép lịch sử theo session_id,
  // trộn hai lá số vào một phiên là Thầy luận nhầm người.
  useEffect(() => {
    setSessionId(newSessionId());
    setMsgs([]);
    setChips(scenario?.chips || GOI_Y);
  }, [subject?.id, scenario]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, status]);

  const patchLast = (fn: (m: Msg) => Msg) =>
    setMsgs((ms) => [...ms.slice(0, -1), fn(ms[ms.length - 1]!)]);

  async function attach() {
    try {
      setPhoto(await pickImage());
    } catch (e) {
      // Huỷ chọn (-2003) thì im; lỗi khác phải hiện kèm mã — nuốt hết thì bấm
      // máy ảnh không ra gì mà không ai biết vì sao (chưa được cấp quyền chọn
      // media của Zalo, -1403…).
      const { code, message } = e as { code?: number; message?: string };
      if (code === -2003 || message === 'Chưa chọn ảnh') return;
      openSnackbar({
        text: `Chưa mở được ảnh${code ? ` (Zalo ${code})` : ''}: ${message || 'lỗi lạ'}`,
        type: 'error',
      });
    }
  }

  async function send(text: string) {
    const shot = photo;
    // Ảnh tướng mặt / chỉ tay / nhà cửa gửi không kèm chữ cũng được — Thầy tự xem.
    const q = text.trim() || (shot ? 'Thầy xem giúp tấm ảnh này.' : '');
    if (!q || busy) return;
    setInput('');
    setPhoto(null);
    setChips([]);
    setBusy(true);
    setMsgs((ms) => [
      ...ms,
      { role: 'user', text: q, image: shot?.preview },
      { role: 'assistant', text: '' },
    ]);
    try {
      await askThay(
        sessionId,
        q,
        toBirthParams(subject?.birth),
        {
          onStatus: setStatus,
          onText: (delta) => {
            setStatus('');
            patchLast((m) => ({ ...m, text: m.text + delta }));
          },
          onDone: (d) => {
            if (d.paywall?.blocked) {
              patchLast((m) => ({
                ...m,
                error: true,
                text:
                  m.text ||
                  d.paywall?.reason ||
                  'Đã hết lượt hỏi miễn phí và số dư Lượng chưa đủ cho câu hỏi này.',
              }));
            }
            setChips(d.suggestions?.slice(0, 3) || []);
          },
        },
        shot ? [{ data: shot.data, mediaType: shot.mediaType }] : [],
        scenario ? { type: scenario.type, data: scenario.data } : null
      );
    } catch (e) {
      patchLast((m) => ({ ...m, error: true, text: m.text || (e as Error).message }));
    } finally {
      setStatus('');
      setBusy(false);
    }
  }

  return (
    <div className="tv-page tv-chat">
      <div className="tv-subject">
        <span className="tv-muted">Đang hỏi về:</span>{' '}
        <strong>{scenario?.label || subject?.label || 'chưa chọn lá số'}</strong>
        <Button size="small" variant="tertiary" onClick={onPickChart}>
          Đổi
        </Button>
      </div>

      {msgs.length === 0 && (
        <p className="tv-empty">
          {scenario
            ? 'Hỏi Thầy về kết quả bạn vừa xem.'
            : subject
            ? 'Hỏi Thầy bất cứ điều gì về lá số này.'
            : 'Hỏi Thầy bất cứ điều gì. Có lá số trong Sổ thì Thầy luận sát hơn.'}
        </p>
      )}

      {msgs.map((m, i) => (
        <div key={i} className={`tv-msg tv-${m.role}${m.error ? ' tv-msg-error' : ''}`}>
          {m.role === 'assistant' ? (
            m.text ? (
              <RichText text={m.text} />
            ) : (
              <span className="tv-muted">{status || 'Thầy đang xem…'}</span>
            )
          ) : (
            <>
              {m.image && <img className="tv-msg-img" src={m.image} alt="" />}
              {m.text}
            </>
          )}
        </div>
      ))}

      {chips.length > 0 && !busy && (
        <div className="tv-chips">
          {chips.map((c) => (
            <button key={c} type="button" className="tv-chip" onClick={() => send(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div ref={endRef} />

      {photo && (
        <div className="tv-attach">
          <img src={photo.preview} alt="" />
          <button type="button" aria-label="Bỏ ảnh" onClick={() => setPhoto(null)}>
            ✕
          </button>
        </div>
      )}
      <form
        className="tv-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <Button
          htmlType="button"
          size="small"
          variant="tertiary"
          aria-label="Chụp hoặc chọn ảnh"
          icon={<Icon icon="zi-camera" />}
          disabled={busy}
          onClick={attach}
        />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi…"
          disabled={busy}
        />
        <Button htmlType="submit" size="small" disabled={busy || (!input.trim() && !photo)}>
          Gửi
        </Button>
      </form>
    </div>
  );
}
