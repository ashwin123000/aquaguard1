import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { AlertDrawer } from './components/AlertDrawer';
import { ToastHost } from './components/ToastHost';
import { DemoScenarioBar } from './components/DemoScenarioBar';
import { PondGateView } from './views/PondGateView';
import { PondDashboardView } from './views/PondDashboardView';
import { InventoryView } from './views/InventoryView';
import { FeedForecastView } from './views/FeedForecastView';
import { GrowthBiomassView } from './views/GrowthBiomassView';
import { FeedCalculatorView } from './views/FeedCalculatorView';
import { TelemetryAdviceView } from './views/TelemetryAdviceView';
import { useStore } from './core/store';
import { HomePage } from './views/HomePage';

export function App() {
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);
  const demoControlsOpen = useStore(state => state.demoControlsOpen);

  return (
    <BrowserRouter>
      <div className="app-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: demoControlsOpen ? 'min(54vh, 430px)' : '82px' }}>
        {/* Top Header */}
        <AppHeader onAlertClick={() => setAlertDrawerOpen(true)} />

        {/* Main Content Area */}
        <main className="app-main" style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ponds" element={<PondGateView />} />
            <Route path="/pond/:pondId" element={<PondDashboardView />} />
            <Route path="/inventory" element={<InventoryView />} />
            <Route path="/forecast" element={<FeedForecastView />} />
            <Route path="/growth" element={<GrowthBiomassView />} />
            <Route path="/calculator" element={<FeedCalculatorView />} />
            <Route path="/telemetry" element={<TelemetryAdviceView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Global Slide-in Alert Drawer */}
        <AlertDrawer
          open={alertDrawerOpen}
          onClose={() => setAlertDrawerOpen(false)}
        />

        {/* Global Toast Host */}
        <ToastHost />

        {/* Deterministic Demo Clock & Scenario Control Bar */}
        <DemoScenarioBar />
      </div>
    </BrowserRouter>
  );
}

export default App;
