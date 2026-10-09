import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore, useDemoNow } from '../core/store';
import type { DemoScenarioId } from '../core/store';
import { formatDemoDateTime } from '../utils/ids';

const SCENARIOS: Array<{ id: DemoScenarioId | 'reset'; label: string; description: string }> = [
  { id: 'normal-feeding', label: 'Normal Feeding', description: 'Healthy simulated telemetry with a scheduled meal ready to record.' },
  { id: 'temperature-rise', label: 'Rapid Temperature Rise', description: 'Temperature rises by 3°C and the system advises closer monitoring.' },
  { id: 'low-oxygen', label: 'Critical Low Oxygen', description: 'DO falls to 3.2 mg/L; feed release is held pending aeration and reassessment.' },
  { id: 'combined-stress', label: 'Combined Environmental Stress', description: 'High temperature, critical oxygen, and lethargic activity trigger combined-risk guidance.' },
  { id: 'aeration-recovery', label: 'Aeration Recovery', description: 'Oxygen improves in stages; feeding remains held until safe criteria and reassessment are met.' },
  { id: 'overdue-meal', label: 'Overdue Meal', description: 'Advances the simulation clock past the next unlogged meal grace period.' },
  { id: 'low-stock', label: 'Low Feed Stock', description: 'Reduces the selected pond’s assigned batch to 5 kg.' },
  { id: 'poor-response', label: 'Poor Feeding Response', description: 'Records an actual meal, uneaten feed, and poor response to update history and the next ration.' },
  { id: 'stale-telemetry', label: 'Stale Telemetry', description: 'Ages the selected pond’s last water reading beyond the freshness threshold.' },
  { id: 'reset', label: 'Reset to Baseline', description: 'Restores ponds, telemetry, meals, inventory, alerts, and the simulation clock.' },
];

export function DemoScenarioBar() {
  const demoNow = useDemoNow();
  const ponds = useStore(state => state.ponds);
  const selectedPondId = useStore(state => state.selectedPondId);
  const inventoryBatches = useStore(state => state.inventoryBatches);
  const activeScenarioId = useStore(state => state.activeDemoScenarioId);
  const activeScenarioPondId = useStore(state => state.activeDemoPondId);
  const controlsOpen = useStore(state => state.demoControlsOpen);
  const setControlsOpen = useStore(state => state.setDemoControlsOpen);
  const advanceDemoTime = useStore(state => state.advanceDemoTime);
  const runDemoScenario = useStore(state => state.runDemoScenario);
  const restoreStock = useStore(state => state.restoreStock);
  const selectPond = useStore(state => state.selectPond);
  const navigate = useNavigate();
  const location = useLocation();
  const [scenarioId, setScenarioId] = useState<DemoScenarioId | 'reset'>('normal-feeding');
  const [targetPondId, setTargetPondId] = useState(selectedPondId ?? ponds[0]?.id ?? '');

  useEffect(() => {
    if (selectedPondId && ponds.some(pond => pond.id === selectedPondId)) {
      setTargetPondId(selectedPondId);
    }
  }, [selectedPondId, ponds]);

  const activeScenario = SCENARIOS.find(scenario => scenario.id === activeScenarioId);
  const selectedScenario = SCENARIOS.find(scenario => scenario.id === scenarioId);
  const assignedBatch = ponds.find(pond => pond.id === targetPondId)?.assignedFeedBatchId;

  const runScenario = () => {
    if (!targetPondId) return;
    selectPond(targetPondId);
    runDemoScenario(scenarioId, targetPondId);
    if (scenarioId !== 'reset') {
      navigate(`/pond/${targetPondId}`);
    } else if (location.pathname.startsWith('/pond/')) {
      navigate('/');
    }
  };

  const restoreAssignedStock = () => {
    if (!assignedBatch) return;
    restoreStock(assignedBatch);
  };

  return (
    <aside className={`demo-bar${controlsOpen ? ' demo-bar-open' : ''}`} aria-label="Demo Controls">
      <div className="demo-bar-inner">
        <div className="demo-bar-summary">
          <div className="demo-mode-status">
            <span className="demo-pulse-indicator" />
            <strong>DEMO MODE ACTIVE</strong>
            <span className="demo-simulated-badge">SIMULATED DATA</span>
          </div>
          <span className="demo-clock-value" aria-label="Simulation date and time">
            {formatDemoDateTime(demoNow)}
          </span>
          {activeScenario && (
            <span className="demo-active-scenario">
              Active: {activeScenario.label}{activeScenarioPondId ? ` · ${ponds.find(p => p.id === activeScenarioPondId)?.name ?? activeScenarioPondId}` : ''}
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm demo-toggle-btn"
            onClick={() => setControlsOpen(!controlsOpen)}
            aria-expanded={controlsOpen}
            aria-controls="demo-controls-content"
          >
            {controlsOpen ? 'Hide controls' : 'Demo controls'}
          </button>
        </div>

        {controlsOpen && (
          <div className="demo-controls-content" id="demo-controls-content">
            <div className="demo-control-row">
              <div className="demo-target-select">
                <label htmlFor="demo-target-pond-select">Target pond</label>
                <select
                  id="demo-target-pond-select"
                  className="select select-sm"
                  value={targetPondId}
                  onChange={event => setTargetPondId(event.target.value)}
                >
                  {ponds.map(pond => <option key={pond.id} value={pond.id}>{pond.name}</option>)}
                </select>
              </div>
              <div className="demo-target-select demo-scenario-select">
                <label htmlFor="demo-scenario-select">Scenario</label>
                <select
                  id="demo-scenario-select"
                  className="select select-sm"
                  value={scenarioId}
                  onChange={event => setScenarioId(event.target.value as DemoScenarioId | 'reset')}
                >
                  {SCENARIOS.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}
                </select>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={runScenario}>
                Run Scenario
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={restoreAssignedStock} disabled={!assignedBatch}>
                Restore Feed Stock
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => {
                runDemoScenario('reset', targetPondId);
                navigate('/');
              }}>
                Reset Demo
              </button>
            </div>

            <p className="demo-scenario-description">{selectedScenario?.description}</p>
            {activeScenario && (
              <p className="demo-scenario-description demo-active-description">
                {activeScenario.label}{activeScenarioPondId ? ` · ${ponds.find(p => p.id === activeScenarioPondId)?.name ?? activeScenarioPondId}` : ''}: {activeScenario.description}
              </p>
            )}
            <div className="demo-time-actions" aria-label="Advance simulation time">
              <span>Advance time</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => advanceDemoTime(15)}>+15 min</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => advanceDemoTime(60)}>+1 hour</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => advanceDemoTime(240)}>+4 hours</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => advanceDemoTime(1440)}>+1 day</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
