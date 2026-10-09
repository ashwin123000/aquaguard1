import React, { useState } from 'react';
import type { Pond } from '../types/pond';
import { usePondFeedingDecision } from '../core/store';
import { calculateBiomass } from '../core/calculations';

interface WhyRecommendationCardProps {
  pond: Pond;
}

export function WhyRecommendationCard({ pond }: WhyRecommendationCardProps) {
  const decision = usePondFeedingDecision(pond.id);
  const [expanded, setExpanded] = useState(false);

  if (!decision) return null;

  const count = pond.estimatedLiveStockCount ?? pond.originalStockCount ?? 5000;
  const abw = pond.meanWeightGrams ?? 200;
  const biomass = calculateBiomass(count, abw);
  const baseDailyKg = decision.baseRationKg > 0 ? decision.baseRationKg : (biomass * 0.0325);

  return (
    <div className="card card-md mb-6" id="why-recommendation-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
        aria-expanded={expanded}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-teal)' }}>📐</span>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', margin: 0 }}>
            Why This Recommendation?
          </h3>
          <span className="badge badge-neutral text-xs">Mathematical Transparency</span>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm text-muted"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {expanded ? '▲ Hide Math' : '▼ View Breakdown'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          <p className="text-sm text-muted mb-4">
            AquaFeed Pond Pilot applies dynamic biological modeling and water telemetry constraints to determine safe feed quantities without guesswork.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }} className="mb-4">
            {/* Step 1: Biomass */}
            <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-3)' }}>
              <div className="text-xs text-muted">1. Current Biomass</div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>
                {biomass.toFixed(1)} kg
              </div>
              <span className="text-xs text-muted">
                {count.toLocaleString()} fish × {abw.toFixed(0)}g
              </span>
            </div>

            {/* Step 2: Base Ration */}
            <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-3)' }}>
              <div className="text-xs text-muted">2. Base Daily Ration</div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>
                {baseDailyKg.toFixed(1)} kg/day
              </div>
              <span className="text-xs text-muted">
                Biomass × configured feeding rate
              </span>
            </div>

            {/* Step 3: Water Factor */}
            <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-3)' }}>
              <div className="text-xs text-muted">3. Environmental Factor</div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: decision.waterAdjustmentFraction < 0 ? 'var(--color-warning)' : 'var(--color-teal)' }}>
                {((1 + decision.waterAdjustmentFraction) * 100).toFixed(0)}%
              </div>
              <span className="text-xs text-muted">
                {decision.waterAdjustmentReason || 'Conditions within optimal window'}
              </span>
            </div>

            {/* Step 4: Feeding Response */}
            <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-3)' }}>
              <div className="text-xs text-muted">4. Appetite Adjustment</div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>
                {(decision.feedingResponseAdjustment * 100).toFixed(0)}%
              </div>
              <span className="text-xs text-muted">
                Based on prior meal response
              </span>
            </div>
          </div>

          {/* Detailed Step Breakdown */}
          {decision.calculationSteps && decision.calculationSteps.length > 0 && (
            <div className="calculation-steps-list" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <span className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Calculation Audit Trail:
              </span>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {decision.calculationSteps.map((step, idx) => (
                  <li key={idx}>
                    <strong>{step.label}:</strong> {step.value} {step.formula ? `(${step.formula})` : ''} {step.note ? `— ${step.note}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
