import React from 'react';
import type { Pond } from '../types/pond';
import { usePondFeedingDecision } from '../core/store';
import type { DecisionState } from '../types/common';

interface DecisionHeroProps {
  pond: Pond;
  onOpenFeedModal: () => void;
  onOpenWaterModal: () => void;
}

export function DecisionHero({ pond, onOpenFeedModal, onOpenWaterModal }: DecisionHeroProps) {
  const decision = usePondFeedingDecision(pond.id);

  if (!decision) {
    return (
      <div className="card card-lg decision-hero mb-6">
        <p className="text-muted">Loading feeding recommendation...</p>
      </div>
    );
  }

  const {
    decisionState,
    headline,
    reason,
    recommendedQuantityKg,
    countdownMinutes,
    overdueDurationMinutes,
    feedType,
    primaryAction,
  } = decision;

  const stateColorMap: Record<DecisionState, { bg: string; border: string; text: string; badgeClass: string }> = {
    'GOOD_TO_GO': { bg: 'rgba(16, 185, 129, 0.08)', border: '#10B981', text: '#059669', badgeClass: 'badge-optimal' },
    'UPCOMING': { bg: 'rgba(59, 130, 246, 0.08)', border: '#3B82F6', text: '#2563EB', badgeClass: 'badge-info' },
    'MONITOR_CONDITIONS': { bg: 'rgba(245, 158, 11, 0.08)', border: '#F59E0B', text: '#D97706', badgeClass: 'badge-warning' },
    'TEMPERATURE_RISING': { bg: 'rgba(245, 158, 11, 0.08)', border: '#F59E0B', text: '#D97706', badgeClass: 'badge-warning' },
    'WAIT_BEFORE_FEEDING': { bg: 'rgba(245, 158, 11, 0.08)', border: '#F59E0B', text: '#D97706', badgeClass: 'badge-warning' },
    'LOW_OXYGEN': { bg: 'rgba(239, 68, 68, 0.08)', border: '#EF4444', text: '#DC2626', badgeClass: 'badge-critical' },
    'FEEDING_ON_HOLD': { bg: 'rgba(239, 68, 68, 0.08)', border: '#EF4444', text: '#DC2626', badgeClass: 'badge-critical' },
    'STOP_FEEDING': { bg: 'rgba(239, 68, 68, 0.08)', border: '#EF4444', text: '#DC2626', badgeClass: 'badge-critical' },
    'REASSESSING': { bg: 'rgba(139, 92, 246, 0.08)', border: '#8B5CF6', text: '#7C3AED', badgeClass: 'badge-info' },
    'MEAL_OVERDUE': { bg: 'rgba(245, 158, 11, 0.08)', border: '#F59E0B', text: '#D97706', badgeClass: 'badge-warning' },
    'DATA_STALE': { bg: 'rgba(100, 116, 139, 0.08)', border: '#64748B', text: '#475569', badgeClass: 'badge-neutral' },
    'SENSOR_UNAVAILABLE': { bg: 'rgba(100, 116, 139, 0.08)', border: '#64748B', text: '#475569', badgeClass: 'badge-neutral' },
    'SETUP_INCOMPLETE': { bg: 'rgba(100, 116, 139, 0.08)', border: '#64748B', text: '#475569', badgeClass: 'badge-neutral' },
  };

  const style = stateColorMap[decisionState] || stateColorMap['GOOD_TO_GO'];

  const isFeedable = decisionState === 'GOOD_TO_GO' || decisionState === 'UPCOMING' || decisionState === 'MEAL_OVERDUE';
  const isCritical = decisionState === 'LOW_OXYGEN' || decisionState === 'STOP_FEEDING' || decisionState === 'FEEDING_ON_HOLD';

  return (
    <div
      className="card card-lg decision-hero mb-6"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        borderWidth: '2px',
        position: 'relative',
        overflow: 'hidden',
      }}
      id="feeding-decision-hero"
    >
      <div className="decision-hero-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <span
              className={`badge ${style.badgeClass}`}
              style={{ fontSize: 'var(--text-sm)', padding: '6px 12px', fontWeight: 'var(--font-bold)', textTransform: 'uppercase' }}
              id="decision-state-badge"
            >
              {decisionState.replace(/_/g, ' ')}
            </span>
            {countdownMinutes !== null && countdownMinutes > 0 && (
              <span className="badge badge-info text-xs">
                In {countdownMinutes} min
              </span>
            )}
            {overdueDurationMinutes !== null && overdueDurationMinutes > 0 && (
              <span className="badge badge-warning text-xs">
                {overdueDurationMinutes} min overdue
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
            {headline}
          </h2>
        </div>

        <div className="decision-hero-quantity-box" style={{ textAlign: 'right' }}>
          <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recommended Ration
          </span>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-extrabold)', color: isCritical ? 'var(--color-critical)' : 'var(--color-teal)' }} id="recommended-quantity-display">
            {recommendedQuantityKg.toFixed(1)} <span style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-normal)' }}>kg</span>
          </div>
          {feedType && (
            <span className="text-xs text-muted" style={{ display: 'block' }}>
              {feedType}
            </span>
          )}
        </div>
      </div>

      <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-5)', maxWidth: '780px' }} id="decision-reason-text">
        {reason}
      </p>

      <div className="decision-hero-actions" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        {isFeedable ? (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onOpenFeedModal}
            id="btn-hero-log-feeding"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Record Meal / Feed Now ({recommendedQuantityKg.toFixed(1)} kg)
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={onOpenFeedModal}
            id="btn-hero-record-override"
          >
            Record Meal / Override ({primaryAction})
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenWaterModal}
          id="btn-hero-update-water"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          Update Water Telemetry
        </button>
      </div>
    </div>
  );
}
