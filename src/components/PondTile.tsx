import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Pond } from '../types/pond';
import { usePondFeedingDecision, usePondAlerts } from '../core/store';
import { calculateBiomass } from '../core/calculations';

interface PondTileProps {
  pond: Pond;
  onOpenFeedModal: (pond: Pond) => void;
}

export function PondTile({ pond, onOpenFeedModal }: PondTileProps) {
  const navigate = useNavigate();
  const decision = usePondFeedingDecision(pond.id);
  const pondAlerts = usePondAlerts(pond.id);
  const primaryAlert = pondAlerts[0];

  const stockCount = pond.estimatedLiveStockCount ?? pond.originalStockCount ?? 0;
  const meanWeight = pond.meanWeightGrams ?? 200;
  const biomassKg = calculateBiomass(stockCount, meanWeight);
  const reading = pond.water?.current;

  const decisionState = decision?.decisionState ?? pond.decisionState ?? 'GOOD_TO_GO';

  const stateBadgeClass = {
    'GOOD_TO_GO': 'badge-optimal',
    'UPCOMING': 'badge-info',
    'MONITOR_CONDITIONS': 'badge-warning',
    'TEMPERATURE_RISING': 'badge-warning',
    'WAIT_BEFORE_FEEDING': 'badge-warning',
    'LOW_OXYGEN': 'badge-critical',
    'FEEDING_ON_HOLD': 'badge-critical',
    'STOP_FEEDING': 'badge-critical',
    'REASSESSING': 'badge-info',
    'MEAL_OVERDUE': 'badge-warning',
    'DATA_STALE': 'badge-neutral',
    'SENSOR_UNAVAILABLE': 'badge-neutral',
    'SETUP_INCOMPLETE': 'badge-neutral',
  }[decisionState] || 'badge-neutral';

  return (
    <div
      className="card card-md pond-tile"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        border: primaryAlert?.severity === 'CRITICAL' ? '2px solid var(--color-critical)' : undefined,
      }}
      onClick={() => navigate(`/pond/${pond.id}`)}
      id={`pond-tile-${pond.id}`}
    >
      <div>
        {/* Header: Pond Name + Decision Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', margin: 0, color: 'var(--color-text-primary)' }}>
              {pond.name}
            </h3>
            <span className="text-xs text-muted" style={{ fontWeight: 'var(--font-medium)' }}>
              {pond.speciesName ?? pond.speciesId ?? 'Fish'} • {pond.growthStage ?? 'Grow-out'}
            </span>
          </div>

          <span
            className={`badge ${stateBadgeClass}`}
            style={{ fontWeight: 'var(--font-bold)', textTransform: 'uppercase', fontSize: '11px', padding: '4px 8px' }}
            id={`tile-state-${pond.id}`}
          >
            {decisionState.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Primary Alert Banner if active */}
        {primaryAlert && (
          <div
            className="alert-banner mb-3"
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              background: primaryAlert.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              color: primaryAlert.severity === 'CRITICAL' ? 'var(--color-critical)' : 'var(--color-warning)',
              border: `1px solid ${primaryAlert.severity === 'CRITICAL' ? 'var(--color-critical-border)' : 'var(--color-warning-border)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span>{primaryAlert.severity === 'CRITICAL' ? '🛑' : '⚠️'}</span>
            <span style={{ fontWeight: 'var(--font-semibold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {primaryAlert.title}
            </span>
          </div>
        )}

        {/* Biomass & Stock Numbers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--color-neutral-bg)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div>
            <span className="text-xs text-muted" style={{ display: 'block' }}>Biomass</span>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--color-teal)' }}>
              {biomassKg.toFixed(1)} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal' }}>kg</span>
            </span>
          </div>
          <div>
            <span className="text-xs text-muted" style={{ display: 'block' }}>Population</span>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>
              {stockCount.toLocaleString()} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal' }}>fish</span>
            </span>
          </div>
          <div>
            <span className="text-xs text-muted" style={{ display: 'block' }}>Mean Weight</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
              {meanWeight.toFixed(0)}g
            </span>
          </div>
          <div>
            <span className="text-xs text-muted" style={{ display: 'block' }}>Recommended</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
              {decision?.recommendedQuantityKg ? `${decision.recommendedQuantityKg.toFixed(1)} kg` : '—'}
            </span>
          </div>
        </div>

        {/* Live Water Telemetry Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <div style={{ textAlign: 'center', padding: '4px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <span className="text-xs text-muted" style={{ display: 'block', fontSize: '10px' }}>DO</span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: (reading?.dissolvedOxygen ?? 6.8) < 3.5 ? 'var(--color-critical)' : (reading?.dissolvedOxygen ?? 6.8) < 5.0 ? 'var(--color-warning)' : 'var(--color-optimal)' }}>
              {reading?.dissolvedOxygen?.toFixed(1) ?? '—'}
            </span>
          </div>

          <div style={{ textAlign: 'center', padding: '4px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <span className="text-xs text-muted" style={{ display: 'block', fontSize: '10px' }}>Temp</span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: (reading?.temperature ?? 28) > 31 ? 'var(--color-warning)' : 'var(--color-optimal)' }}>
              {reading?.temperature?.toFixed(1) ?? '—'}°
            </span>
          </div>

          <div style={{ textAlign: 'center', padding: '4px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <span className="text-xs text-muted" style={{ display: 'block', fontSize: '10px' }}>pH</span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--color-optimal)' }}>
              {reading?.pH?.toFixed(1) ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/pond/${pond.id}`);
          }}
          id={`btn-open-pond-${pond.id}`}
        >
          Pond Details →
        </button>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFeedModal(pond);
          }}
          id={`btn-quick-feed-${pond.id}`}
          title="Quickly log today's meal"
        >
          Feed Now
        </button>
      </div>
    </div>
  );
}
