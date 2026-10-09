import React from 'react';
import type { Pond } from '../types/pond';
import { useDemoNow } from '../core/store';
import { formatRelativeTime } from '../utils/ids';
import { evaluateWaterParameterStatus } from '../core/calculations';
import { STALE_READING_MINUTES } from '../core/config';

interface LiveWaterCardProps {
  pond: Pond;
  onOpenWaterModal: () => void;
}

export function LiveWaterCard({ pond, onOpenWaterModal }: LiveWaterCardProps) {
  const demoNow = useDemoNow();
  const reading = pond.water?.current;
  const activity = pond.water?.activity ?? 'NORMAL';

  const readingTime = reading?.demoTimestamp ? new Date(reading.demoTimestamp) : demoNow;
  const minutesAgo = Math.floor((demoNow.getTime() - readingTime.getTime()) / 60000);
  const isStale = minutesAgo >= STALE_READING_MINUTES;

  const doVal = reading?.dissolvedOxygen ?? 6.8;
  const tempVal = reading?.temperature ?? 28.5;
  const phVal = reading?.pH ?? 7.6;

  const doStatus = evaluateWaterParameterStatus('dissolvedOxygen', doVal);
  const tempStatus = evaluateWaterParameterStatus('temperature', tempVal);
  const phStatus = evaluateWaterParameterStatus('ph', phVal);

  const getBadgeClass = (status: string) => {
    if (status === 'OPTIMAL') return 'badge-optimal';
    if (status === 'CAUTION') return 'badge-warning';
    return 'badge-critical';
  };

  return (
    <div className="card card-md mb-6" id="live-water-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--color-teal)' }}>💧</span> Live Water Telemetry
          </h3>
          <span className="text-xs text-muted">
            <span className="demo-simulated-badge">SIMULATED DATA</span> • {formatRelativeTime(readingTime, demoNow)}
            {isStale && <span className="badge badge-warning text-xs ml-2">⚠️ Data Stale</span>}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onOpenWaterModal}
          id="btn-card-log-water"
        >
          + Log Water Test
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
        {/* Dissolved Oxygen */}
        <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="text-xs text-muted">D.O.</span>
            <span className={`badge ${getBadgeClass(doStatus)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
              {doStatus}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', marginTop: 'var(--space-1)' }} id="card-do-value">
            {doVal.toFixed(1)} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>mg/L</span>
          </div>
          <span className="text-xs text-muted" style={{ fontSize: '11px' }}>Optimal: 5.0 - 9.0</span>
        </div>

        {/* Temperature */}
        <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="text-xs text-muted">Temperature</span>
            <span className={`badge ${getBadgeClass(tempStatus)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
              {tempStatus}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', marginTop: 'var(--space-1)' }} id="card-temp-value">
            {tempVal.toFixed(1)} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>°C</span>
          </div>
          <span className="text-xs text-muted" style={{ fontSize: '11px' }}>Optimal: 26 - 31°C</span>
        </div>

        {/* pH */}
        <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="text-xs text-muted">pH Level</span>
            <span className={`badge ${getBadgeClass(phStatus)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
              {phStatus}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', marginTop: 'var(--space-1)' }} id="card-ph-value">
            {phVal.toFixed(1)}
          </div>
          <span className="text-xs text-muted" style={{ fontSize: '11px' }}>Optimal: 7.0 - 8.5</span>
        </div>

        {/* Fish Activity */}
        <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="text-xs text-muted">Fish Activity</span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', marginTop: 'var(--space-1)', color: activity === 'NORMAL' || activity === 'HIGH' ? 'var(--color-text-primary)' : 'var(--color-warning)' }} id="card-activity-value">
            {activity}
          </div>
          <span className="text-xs text-muted" style={{ fontSize: '11px' }}>Surface observation</span>
        </div>
      </div>
    </div>
  );
}
