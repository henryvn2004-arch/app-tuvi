import { useEffect, useRef, useState } from 'react';
import { Spinner, useSnackbar } from 'zmp-ui';
import { toBirthParams } from '../lib/birth';
import { loadMyChart } from '../lib/charts';
import { fetchCatalog, openTool, priceText, type ToolGroup, type ToolItem } from '../lib/tools';

export default function ToolsPage() {
  const { openSnackbar } = useSnackbar();
  const snack = useRef(openSnackbar);
  snack.current = openSnackbar;
  const [groups, setGroups] = useState<ToolGroup[] | null>(null);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalog()
      .then(setGroups)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function open(t: ToolItem) {
    if (opening) return;
    setOpening(t.toolId);
    try {
      const mine = await loadMyChart().catch(() => null);
      await openTool(t, toBirthParams(mine?.birth));
    } catch (e) {
      snack.current({ text: (e as Error).message, type: 'error' });
    } finally {
      setOpening(null);
    }
  }

  if (error) return <p className="tv-empty">{error}</p>;
  if (!groups)
    return (
      <div className="tv-center">
        <Spinner />
      </div>
    );

  return (
    <div className="tv-page">
      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="tv-group">{g.title}</h2>
          <div className="tv-tools">
            {g.tools.map((t) => (
              <button
                key={t.toolId}
                type="button"
                className="tv-card tv-tool"
                onClick={() => open(t)}
                disabled={!!opening}
              >
                <strong>{t.label}</strong>
                {t.description && <span className="tv-muted">{t.description}</span>}
                <span className={t.free ? 'tv-price tv-free' : 'tv-price'}>
                  {opening === t.toolId ? 'Đang mở…' : priceText(t)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
