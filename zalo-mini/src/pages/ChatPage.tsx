import { useEffect, useRef, useState } from 'react';
import { Button, Input } from 'zmp-ui';
import { toBirthParams, type Chart } from '../lib/birth';
import { askThay, newSessionId } from '../lib/chat';
import { loadMyChart } from '../lib/charts';
import { RichText } from '../lib/text';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  error?: boolean;
}

const GOI_Y = [
  'Vận tháng này của tôi thế nào?',
  'Công việc năm nay ra sao?',
  'Chuyện tình cảm của tôi?',
];

export default function ChatPage({
  chart,
  onPickChart,
}: {
  chart: Chart | null;
  onPickChart: () => void;
}) {
  const [subject, setSubject] = useState<Chart | null>(chart);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [chips, setChips] = useState<string[]>(GOI_Y);
  const endRef = useRef<HTMLDivElement>(null);

  // Không được chọn từ Sổ thì hỏi về lá số "của tôi" (nếu đã lưu).
  useEffect(() => {
    if (chart) return;
    loadMyChart()
      .then(setSubject)
      .catch(() => setSubject(null));
  }, [chart]);

  // Đổi người được hỏi ⇒ phiên mới: server ghép lịch sử theo session_id, trộn
  // hai lá số vào một phiên là Thầy luận nhầm người.
  useEffect(() => {
    setSessionId(newSessionId());
    setMsgs([]);
    setChips(GOI_Y);
  }, [subject?.id]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, status]);

  const patchLast = (fn: (m: Msg) => Msg) =>
    setMsgs((ms) => [...ms.slice(0, -1), fn(ms[ms.length - 1]!)]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    setChips([]);
    setBusy(true);
    setMsgs((ms) => [...ms, { role: 'user', text: q }, { role: 'assistant', text: '' }]);
    try {
      await askThay(sessionId, q, toBirthParams(subject?.birth), {
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
                'Đã hết lượt hỏi miễn phí. Nạp thêm Lượng trên tuviminhbao.com để hỏi tiếp.',
            }));
          }
          setChips(d.suggestions?.slice(0, 3) || []);
        },
      });
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
        <strong>{subject?.label || 'chưa chọn lá số'}</strong>
        <Button size="small" variant="tertiary" onClick={onPickChart}>
          Đổi
        </Button>
      </div>

      {msgs.length === 0 && (
        <p className="tv-empty">
          {subject
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
            m.text
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

      <form
        className="tv-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi…"
          disabled={busy}
        />
        <Button htmlType="submit" size="small" disabled={busy || !input.trim()}>
          Gửi
        </Button>
      </form>
    </div>
  );
}
