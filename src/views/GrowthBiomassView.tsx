import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore, useDemoNow } from '../core/store';
import { GrowthModal } from '../components/GrowthModal';
import { Modal } from '../components/Modal';
import { calculateBiomass, calculateSurvivalRate, calculateFCR } from '../core/calculations';

export function GrowthBiomassView() {
  const [searchParams] = useSearchParams();
  const ponds = useStore(state => state.ponds);
  const addMortalityRecord = useStore(state => state.addMortalityRecord);
  const demoNow = useDemoNow();

  const initialPondId = searchParams.get('pond') || ponds[0]?.id || '';
  const [selectedPondId, setSelectedPondId] = useState<string>(initialPondId);
  const [growthModalOpen, setGrowthModalOpen] = useState(false);
  const [mortalityModalOpen, setMortalityModalOpen] = useState(false);

  const [mortCount, setMortCount] = useState<string>('5');
  const [mortReason, setMortReason] = useState<string>('Natural background mortality');

  const pond = ponds.find(p => p.id === selectedPondId) || ponds[0];

  if (!pond) {
    return <div className="container py-8">No pond found.</div>;
  }

  const liveStock = pond.estimatedLiveStockCount ?? pond.originalStockCount ?? 0;
  const meanWeight = pond.meanWeightGrams ?? 200;
  const biomassKg = calculateBiomass(liveStock, meanWeight);
  const survivalRate = calculateSurvivalRate(pond.originalStockCount, pond.estimatedLiveStockCount);

  // Total feed fed to this pond
  const totalFeedFedKg = pond.feedingRecords
    .filter(m => m.status === 'COMPLETED' || m.status === 'ADJUSTED')
    .reduce((sum, m) => sum + (m.actualQuantityKg ?? m.recommendedQuantityKg), 0);

  // Initial biomass
  const initialBiomassKg = calculateBiomass(pond.originalStockCount ?? 5000, 25);
  const biomassGainKg = Math.max(1, biomassKg - initialBiomassKg);
  const fcr = calculateFCR(totalFeedFedKg, biomassGainKg);

  const handleMortalitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(mortCount, 10) || 1;

    addMortalityRecord(pond.id, {
      pondId: pond.id,
      recordedDate: demoNow.toISOString().split('T')[0],
      count,
      reason: mortReason,
      notes: 'Reported from Growth & Biomass view',
    });

    setMortalityModalOpen(false);
  };

  return (
    <div className="growth-biomass-view container py-6">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-extrabold)', margin: 0, color: 'var(--color-text-primary)' }}>
            Growth & Biomass Analytics
          </h1>
          <p className="text-sm text-muted" style={{ margin: 'var(--space-1) 0 0 0' }}>
            Periodic sampling history, feed conversion ratios (FCR), mortality audits, and stage transitions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <select
            className="select"
            value={selectedPondId}
            onChange={(e) => setSelectedPondId(e.target.value)}
            id="growth-pond-select"
          >
            {ponds.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.speciesName ?? p.speciesId ?? 'Fish'})</option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setGrowthModalOpen(true)}
            id="btn-log-growth-sample"
          >
            + Log Sampling Weight
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setMortalityModalOpen(true)}
          >
            + Report Mortality
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="card card-sm" style={{ background: 'var(--color-card)', padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Estimated Pond Biomass</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-teal)' }} id="growth-biomass-display">
            {biomassKg.toFixed(1)} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal' }}>kg</span>
          </div>
          <span className="text-xs text-muted">Stock: {liveStock.toLocaleString()} fish</span>
        </div>

        <div className="card card-sm" style={{ background: 'var(--color-card)', padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Mean Body Weight (ABW)</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }} id="growth-abw-display">
            {meanWeight.toFixed(0)} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal' }}>grams</span>
          </div>
          <span className="text-xs text-muted">Stage: {pond.growthStage ?? 'Grow-out'}</span>
        </div>

        <div className="card card-sm" style={{ background: 'var(--color-card)', padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Survival Rate</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-optimal)' }}>
            {survivalRate.toFixed(1)}%
          </div>
          <span className="text-xs text-muted">Initial: {(pond.originalStockCount ?? liveStock).toLocaleString()} fish</span>
        </div>

        <div className="card card-sm" style={{ background: 'var(--color-card)', padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Estimated FCR</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: fcr < 1.6 ? 'var(--color-optimal)' : 'var(--color-warning)' }}>
            {fcr.toFixed(2)}
          </div>
          <span className="text-xs text-muted">Feed Conversion Ratio</span>
        </div>
      </div>

      {/* Sampling Records Table */}
      <div className="card card-md mb-6">
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)' }}>
          Biomass Sampling History — {pond.name} ({pond.growthRecords.length} records)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Sampling Date</th>
                <th style={{ padding: '10px 12px' }}>Sample Count</th>
                <th style={{ padding: '10px 12px' }}>Mean Weight (grams)</th>
                <th style={{ padding: '10px 12px' }}>Est. Biomass</th>
                <th style={{ padding: '10px 12px' }}>Survival Estimate</th>
                <th style={{ padding: '10px 12px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {pond.growthRecords.map(rec => (
                <tr key={rec.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 'var(--font-semibold)' }}>{rec.samplingDate}</td>
                  <td style={{ padding: '10px 12px' }}>{rec.sampleSize} fish</td>
                  <td style={{ padding: '10px 12px', fontWeight: 'var(--font-bold)', color: 'var(--color-teal)' }}>
                    {rec.meanWeightGrams.toFixed(0)}g
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {calculateBiomass(liveStock, rec.meanWeightGrams).toFixed(1)} kg
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {rec.survivalEstimatePercent !== null ? `${rec.survivalEstimatePercent.toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{rec.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mortality History Table */}
      <div className="card card-md mb-6">
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)' }}>
          Mortality Audit Log ({pond.mortalityRecords.length} events)
        </h3>
        {pond.mortalityRecords.length === 0 ? (
          <p className="text-sm text-muted">No mortality events recorded for this pond.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                  <th style={{ padding: '8px 12px' }}>Date</th>
                  <th style={{ padding: '8px 12px' }}>Dead Count</th>
                  <th style={{ padding: '8px 12px' }}>Identified Cause / Observation</th>
                </tr>
              </thead>
              <tbody>
                {pond.mortalityRecords.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 12px' }}>{m.recordedDate}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 'var(--font-bold)', color: 'var(--color-critical)' }}>
                      -{m.count} fish
                    </td>
                    <td style={{ padding: '8px 12px' }}>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <GrowthModal
        open={growthModalOpen}
        onClose={() => setGrowthModalOpen(false)}
        pond={pond}
      />

      {mortalityModalOpen && (
        <Modal
          open={mortalityModalOpen}
          onClose={() => setMortalityModalOpen(false)}
          title={`Report Mortality — ${pond.name}`}
          footer={
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setMortalityModalOpen(false)}>Cancel</button>
              <button type="submit" form="mort-form" className="btn btn-danger">Record Loss</button>
            </div>
          }
        >
          <form id="mort-form" onSubmit={handleMortalitySubmit}>
            <div className="form-group mb-4">
              <label className="form-label" htmlFor="mort-count">Dead Fish Count</label>
              <input
                id="mort-count"
                type="number"
                min="1"
                className="input"
                value={mortCount}
                onChange={(e) => setMortCount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="mort-reason">Reason / Circumstance</label>
              <input
                id="mort-reason"
                type="text"
                className="input"
                value={mortReason}
                onChange={(e) => setMortReason(e.target.value)}
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
