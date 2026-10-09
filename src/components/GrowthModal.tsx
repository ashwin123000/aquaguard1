import React, { useState } from 'react';
import { useStore, useDemoNow } from '../core/store';
import { Modal } from './Modal';
import type { Pond } from '../types/pond';
import { calculateBiomass } from '../core/calculations';

interface GrowthModalProps {
  open: boolean;
  onClose: () => void;
  pond: Pond;
}

export function GrowthModal({ open, onClose, pond }: GrowthModalProps) {
  const addGrowthRecord = useStore(state => state.addGrowthRecord);
  const addMortalityRecord = useStore(state => state.addMortalityRecord);
  const demoNow = useDemoNow();

  const currentWeight = pond.meanWeightGrams ?? 200;
  const currentCount = pond.estimatedLiveStockCount ?? pond.originalStockCount ?? 5000;

  const [sampleCount, setSampleCount] = useState<string>('30');
  const [meanWeightGrams, setMeanWeightGrams] = useState<string>(currentWeight.toFixed(0));
  const [mortalityCount, setMortalityCount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  const countNum = parseInt(sampleCount, 10) || 1;
  const abwNum = parseFloat(meanWeightGrams) || currentWeight;
  const mortNum = parseInt(mortalityCount, 10) || 0;

  const estimatedBiomassKg = calculateBiomass(currentCount - mortNum, abwNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    addGrowthRecord(pond.id, {
      pondId: pond.id,
      samplingDate: demoNow.toISOString().split('T')[0],
      sampleSize: countNum,
      meanWeightGrams: abwNum,
      survivalEstimatePercent: null,
      mortalitySincePrevious: mortNum > 0 ? mortNum : null,
      notes: notes.trim() || 'Periodic sampling',
    });

    if (mortNum > 0) {
      addMortalityRecord(pond.id, {
        pondId: pond.id,
        recordedDate: demoNow.toISOString().split('T')[0],
        count: mortNum,
        reason: 'Sampling count mortality',
        notes: 'Recorded during growth sampling',
      });
    }

    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Log Growth & Biomass Sample — ${pond.name}`}
      size="default"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="growth-form"
            className="btn btn-primary"
            id="btn-submit-growth"
          >
            Record Sample & Recalculate
          </button>
        </div>
      }
    >
      <form id="growth-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="growth-sample-count">
              Fish Sample Size (count)
            </label>
            <input
              id="growth-sample-count"
              type="number"
              min="1"
              max="500"
              className="input"
              value={sampleCount}
              onChange={(e) => setSampleCount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="growth-abw-input">
              Mean Body Weight (grams)
              <span className="text-xs text-muted" style={{ display: 'block' }}>
                Previous: {currentWeight.toFixed(0)}g
              </span>
            </label>
            <input
              id="growth-abw-input"
              type="number"
              step="0.5"
              min="1"
              max="5000"
              className="input"
              value={meanWeightGrams}
              onChange={(e) => setMeanWeightGrams(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group mb-4">
          <label className="form-label" htmlFor="growth-mortality-input">
            Mortality Observed (count)
            <span className="text-xs text-muted" style={{ display: 'block' }}>Dead fish removed</span>
          </label>
          <input
            id="growth-mortality-input"
            type="number"
            min="0"
            className="input"
            value={mortalityCount}
            onChange={(e) => setMortalityCount(e.target.value)}
          />
        </div>

        <div className="card card-sm mb-4" style={{ background: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="text-xs text-muted">Projected Pond Biomass:</span>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--color-teal)' }}>
                {estimatedBiomassKg.toFixed(1)} kg
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="text-xs text-muted">Live Stock:</span>
              <div style={{ fontWeight: 'var(--font-semibold)' }}>
                {(currentCount - mortNum).toLocaleString()} fish
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="growth-notes-input">Observations / Health Notes</label>
          <input
            id="growth-notes-input"
            type="text"
            className="input"
            placeholder="e.g. Uniform body size, healthy finnage, vigorous movement"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
