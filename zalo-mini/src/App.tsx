import { useState } from 'react';
import { App as ZApp, BottomNavigation, Icon, SnackbarProvider } from 'zmp-ui';
import type { Chart } from './lib/birth';
import type { Scenario } from './lib/web-tools';
import TodayPage from './pages/TodayPage';
import ChatPage from './pages/ChatPage';
import ChartsPage from './pages/ChartsPage';
import ToolsPage from './pages/ToolsPage';
import MePage from './pages/MePage';

type Tab = 'today' | 'chat' | 'tools' | 'charts' | 'me';

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  // Lá số đang hỏi Thầy — Sổ lá số bấm "Hỏi Thầy" thì chuyển tab kèm lá số đó.
  const [askChart, setAskChart] = useState<Chart | null>(null);
  // Kết quả công cụ đang hỏi Thầy — tab Công cụ bấm "Hỏi Thầy…" thì chuyển tab kèm nó.
  const [askScenario, setAskScenario] = useState<Scenario | null>(null);

  const askAbout = (c: Chart) => {
    setAskChart(c);
    setAskScenario(null);
    setTab('chat');
  };
  const askResult = (s: Scenario) => {
    setAskScenario(s);
    setTab('chat');
  };

  return (
    <ZApp>
      <SnackbarProvider>
        <main className="tv-main">
          {tab === 'today' && (
            <TodayPage onOpenCharts={() => setTab('charts')} onAsk={() => setTab('chat')} />
          )}
          {tab === 'chat' && (
            <ChatPage
              chart={askChart}
              scenario={askScenario}
              onPickChart={() => {
                setAskScenario(null);
                setTab('charts');
              }}
            />
          )}
          {tab === 'tools' && <ToolsPage onAsk={askResult} />}
          {tab === 'charts' && <ChartsPage onAsk={askAbout} />}
          {tab === 'me' && <MePage />}
        </main>
        <BottomNavigation fixed activeKey={tab} onChange={(k) => setTab(k as Tab)}>
          <BottomNavigation.Item
            itemKey="today"
            label="Hôm nay"
            icon={<Icon icon="zi-calendar" />}
          />
          <BottomNavigation.Item itemKey="chat" label="Hỏi Thầy" icon={<Icon icon="zi-chat" />} />
          <BottomNavigation.Item
            itemKey="tools"
            label="Công cụ"
            icon={<Icon icon="zi-grid-solid" />}
          />
          <BottomNavigation.Item
            itemKey="charts"
            label="Sổ lá số"
            icon={<Icon icon="zi-bookmark" />}
          />
          <BottomNavigation.Item itemKey="me" label="Của tôi" icon={<Icon icon="zi-user" />} />
        </BottomNavigation>
      </SnackbarProvider>
    </ZApp>
  );
}
