import { useEffect, useState } from 'react';
import { Button } from 'zmp-ui';
import type { ChartBirth } from '../lib/birth';
import { loadMyChart } from '../lib/charts';
import type { Scenario } from '../lib/web-tools';
import { NATIVE_TOOLS, type NativeTool } from './tools/WebTools';

// Công cụ chạy NGAY trong app (src/pages/tools/WebTools.tsx) — không mở trang web:
// chính sách Zalo cấm dẫn người dùng ra website ngoài.
export default function ToolsPage({ onAsk }: { onAsk: (s: Scenario) => void }) {
  const [mine, setMine] = useState<ChartBirth | null>(null);
  const [open, setOpen] = useState<NativeTool | null>(null);

  // Có "lá số của tôi" thì điền sẵn năm sinh, giới tính, họ tên.
  useEffect(() => {
    loadMyChart()
      .then((c) => setMine(c?.birth || null))
      .catch(() => setMine(null));
  }, []);

  if (open)
    return (
      <div className="tv-page">
        <Button size="small" variant="tertiary" onClick={() => setOpen(null)}>
          ← Công cụ
        </Button>
        <h1 className="tv-title">{open.label}</h1>
        <open.View mine={mine} onAsk={onAsk} />
      </div>
    );

  return (
    <div className="tv-page">
      <div className="tv-tools">
        {NATIVE_TOOLS.map((t) => (
          <button key={t.id} type="button" className="tv-card tv-tool" onClick={() => setOpen(t)}>
            <strong>{t.label}</strong>
            <span className="tv-muted">{t.desc}</span>
            <span className="tv-price tv-free">Miễn phí</span>
          </button>
        ))}
      </div>
    </div>
  );
}
