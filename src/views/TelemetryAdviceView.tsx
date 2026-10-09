import React, { useState } from 'react';
import { useStore, useDemoNow } from '../core/store';
import { evaluateWaterParameterStatus } from '../core/calculations';
import { formatRelativeTime } from '../utils/ids';
import { WaterReadingModal } from '../components/WaterReadingModal';
import type { Pond, WaterReading } from '../types/pond';

export function TelemetryAdviceView() {
  const ponds = useStore(state => state.ponds);
  const demoNow = useDemoNow();
  const addWaterReading = useStore(state => state.addWaterReading);

  const [selectedPondId, setSelectedPondId] = useState<string>(ponds[0]?.id ?? '');
  const [modalPond, setModalPond] = useState<Pond | null>(null);

  const currentPond = ponds.find(p => p.id === selectedPondId) || ponds[0];
  const reading = currentPond?.water?.current;

  // Simulator controls
  const [simDO, setSimDO] = useState<number>(reading?.dissolvedOxygen ?? 6.8);
  const [simTemp, setSimTemp] = useState<number>(reading?.temperature ?? 28.5);
  const [simPh, setSimPh] = useState<number>(reading?.pH ?? 7.6);

  React.useEffect(() => {
    if (reading) {
      if (reading.dissolvedOxygen !== null) setSimDO(reading.dissolvedOxygen);
      if (reading.temperature !== null) setSimTemp(reading.temperature);
      if (reading.pH !== null) setSimPh(reading.pH);
    }
  }, [selectedPondId, reading?.demoTimestamp]);

  const applySimulation = () => {
    if (!currentPond) return;
    const wr: WaterReading = {
      id: `wr-sim-${Date.now()}`,
      pondId: currentPond.id,
      temperature: simTemp,
      dissolvedOxygen: simDO,
      pH: simPh,
      demoTimestamp: demoNow.toISOString(),
      quality: 'SIMULATED',
    };
    addWaterReading(currentPond.id, wr);
  };

  return (
    <div className="telemetry-view container py-6">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-extrabold)', margin: 0, color: 'var(--color-text-primary)' }}>
          Telemetry & Water Intelligence
        </h1>
        <p className="text-sm text-muted" style={{ margin: 'var(--space-1) 0 0 0' }}>
          Fleet-wide sensor telemetry, water parameter diagnostic thresholds, and live simulator.
        </p>
      </div>

      {/* Fleet Sensor Matrix Table */}
      <div className="card card-md mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', margin: 0 }}>
            Fleet Telemetry Matrix
          </h3>
          <span className="text-xs text-muted">All active pond buoy telemetry</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Pond</th>
                <th style={{ padding: '10px 12px' }}>Dissolved O₂</th>
                <th style={{ padding: '10px 12px' }}>Temperature</th>
                <th style={{ padding: '10px 12px' }}>pH</th>
                <th style={{ padding: '10px 12px' }}>Fish Activity</th>
                <th style={{ padding: '10px 12px' }}>Freshness</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ponds.map(p => {
                const r = p.water?.current;
                const readingDate = r?.demoTimestamp ? new Date(r.demoTimestamp) : demoNow;
                const doVal = r?.dissolvedOxygen ?? 6.8;
                const tempVal = r?.temperature ?? 28.5;
                const phVal = r?.pH ?? 7.6;

                const doStat = evaluateWaterParameterStatus('dissolvedOxygen', doVal);
                const tempStat = evaluateWaterParameterStatus('temperature', tempVal);

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 'var(--font-bold)' }}>
                      {p.name}
                      <span className="text-xs text-muted" style={{ display: 'block', fontWeight: 'normal' }}>
                        {p.speciesName ?? p.speciesId ?? 'Fish'} · SIMULATED DATA
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 'var(--font-bold)', color: doStat === 'OPTIMAL' ? 'var(--color-optimal)' : doStat === 'CAUTION' ? 'var(--color-warning)' : 'var(--color-critical)' }}>
                      {doVal.toFixed(1)} mg/L
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 'var(--font-bold)', color: tempStat === 'OPTIMAL' ? 'var(--color-optimal)' : 'var(--color-warning)' }}>
                      {tempVal.toFixed(1)}°C
                    </td>
                    <td style={{ padding: '10px 12px' }}>{phVal.toFixed(1)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-neutral text-xs">{p.water?.activity ?? 'NORMAL'}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {formatRelativeTime(readingDate, demoNow)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setModalPond(p)}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulator + Advice Guidelines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-6)' }}>
        {/* Interactive Simulator */}
        <div className="card card-md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', margin: 0 }}>
              🧪 Interactive Telemetry Sandbox
            </h3>
            <select
              className="select select-sm"
              value={selectedPondId}
              onChange={(e) => setSelectedPondId(e.target.value)}
            >
              {ponds.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted mb-4">
            Slide parameters to simulate critical events (e.g. oxygen drop, heat spike) and immediately verify platform decisions.
          </p>

          <div className="form-group mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">Dissolved Oxygen: <strong>{simDO.toFixed(1)} mg/L</strong></label>
              <span className={`badge ${simDO < 3.5 ? 'badge-critical' : simDO < 5.0 ? 'badge-warning' : 'badge-optimal'} text-xs`}>
                {simDO < 3.5 ? 'CRITICAL' : simDO < 5.0 ? 'CAUTION' : 'OPTIMAL'}
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              value={simDO}
              onChange={(e) => setSimDO(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">Water Temperature: <strong>{simTemp.toFixed(1)} °C</strong></label>
              <span className={`badge ${simTemp > 33 || simTemp < 24 ? 'badge-critical' : simTemp > 31 ? 'badge-warning' : 'badge-optimal'} text-xs`}>
                {simTemp > 33 ? 'CRITICAL HIGH' : simTemp > 31 ? 'CAUTION' : 'OPTIMAL'}
              </span>
            </div>
            <input
              type="range"
              min="20.0"
              max="38.0"
              step="0.5"
              value={simTemp}
              onChange={(e) => setSimTemp(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">pH Level: <strong>{simPh.toFixed(1)}</strong></label>
              <span className={`badge ${simPh < 6.5 || simPh > 9.0 ? 'badge-critical' : 'badge-optimal'} text-xs`}>
                {simPh < 6.5 || simPh > 9.0 ? 'CRITICAL' : 'OPTIMAL'}
              </span>
            </div>
            <input
              type="range"
              min="5.0"
              max="10.5"
              step="0.1"
              value={simPh}
              onChange={(e) => setSimPh(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={applySimulation}
            id="btn-apply-telemetry-sim"
          >
            Apply Simulated Readings to {currentPond?.name}
          </button>
        </div>

        {/* Operational Telemetry Protocols */}
        <div className="card card-md">
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)' }}>
            📋 Aquaculture Operational Protocols
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--color-critical-border)', borderRadius: 'var(--radius-md)' }}>
              <strong style={{ color: 'var(--color-critical)' }}>🛑 Critical Hypoxia (DO &lt; 3.5 mg/L)</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                • Cease feeding immediately. Digestion consumes significant dissolved oxygen.<br />
                • Engage backup paddle-wheel aerators & emergency liquid oxygen if available.<br />
                • Do not resume feeding until DO recovers above 5.0 mg/L for at least 1 hour.
              </p>
            </div>

            <div style={{ padding: 'var(--space-3)', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid var(--color-warning-border)', borderRadius: 'var(--radius-md)' }}>
              <strong style={{ color: 'var(--color-warning)' }}>⚠️ Thermal Stress (&gt; 32.0°C)</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                • Reduce meal rations by 30% to 50%.<br />
                • Shift feeding windows away from peak solar noon to early morning and dusk.<br />
                • Activate vertical circulation to break thermal stratification.
              </p>
            </div>

            <div style={{ padding: 'var(--space-3)', background: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <strong style={{ color: 'var(--color-teal)' }}>💧 Low / High pH (&lt; 6.5 or &gt; 9.0)</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                • Low pH increases aluminum toxicity; apply agricultural limestone (CaCO3).<br />
                • High pH (&gt;9.0) drastically increases toxic un-ionized ammonia fraction.<br />
                • Introduce bio-floc carbon or reduce photosynthetic algae blooms.
              </p>
            </div>
          </div>
        </div>
      </div>

      {modalPond && (
        <WaterReadingModal
          open={!!modalPond}
          onClose={() => setModalPond(null)}
          pond={modalPond}
        />
      )}
    </div>
  );
}
