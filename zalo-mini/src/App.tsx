import { useState } from 'react';
import { App as ZApp, BottomNavigation, Icon, SnackbarProvider } from 'zmp-ui';
import type { Chart } from './lib/birth';
import TodayPage from './pages/TodayPage';
import ChatPage from './pages/ChatPage';
import ChartsPage from './pages/ChartsPage';

type Tab = 'today' | 'chat' | 'charts';

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  // Lá số đang hỏi Thầy — Sổ lá số bấm "Hỏi Thầy" thì chuyển tab kèm lá số đó.
  const [askChart, setAskChart] = useState<Chart | null>(null);

  const askAbout = (c: Chart) => {
    setAskChart(c);
    setTab('chat');
  };

  return (
    <ZApp>
      <SnackbarProvider>
        <main className="tv-main">
          {tab === 'today' && (
            <TodayPage onOpenCharts={() => setTab('charts')} onAsk={() => setTab('chat')} />
          )}
          {tab === 'chat' && <ChatPage chart={askChart} onPickChart={() => setTab('charts')} />}
          {tab === 'charts' && <ChartsPage onAsk={askAbout} />}
        </main>
        <BottomNavigation fixed activeKey={tab} onChange={(k) => setTab(k as Tab)}>
          <BottomNavigation.Item
            itemKey="today"
            label="Hôm nay"
            icon={<Icon icon="zi-calendar" />}
          />
          <BottomNavigation.Item itemKey="chat" label="Hỏi Thầy" icon={<Icon icon="zi-chat" />} />
          <BottomNavigation.Item
            itemKey="charts"
            label="Sổ lá số"
            icon={<Icon icon="zi-bookmark" />}
          />
        </BottomNavigation>
      </SnackbarProvider>
    </ZApp>
  );
}
