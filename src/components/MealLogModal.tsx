import React, { useState, useEffect } from 'react';
import { useStore, useDemoNow, usePondFeedingDecision } from '../core/store';
import { Modal } from './Modal';
import type { Pond, FeedingRecord } from '../types/pond';
import type { FeedingResponse, FishActivity } from '../types/common';
import { formatTimeOnly } from '../utils/ids';

interface MealLogModalProps {
  open: boolean;
  onClose: () => void;
  pond: Pond;
  initialMealId?: string | null;
  recommendedKg?: number;
}

export function MealLogModal({
  open,
  onClose,
  pond,
  initialMealId,
  recommendedKg = 0,
}: MealLogModalProps) {
  const logMeal = useStore(state => state.logMeal);
  const batches = useStore(state => state.inventoryBatches);
  const feedItems = useStore(state => state.feedItems);
  const demoNow = useDemoNow();
  const decision = usePondFeedingDecision(pond.id);
  const feedingHeld = decision?.decisionState === 'LOW_OXYGEN' ||
    decision?.decisionState === 'STOP_FEEDING' ||
    decision?.decisionState === 'FEEDING_ON_HOLD' ||
    decision?.decisionState === 'REASSESSING';

  const todayMeals = pond.feedingRecords;
  const targetMeal = (initialMealId ? todayMeals.find(m => m.id === initialMealId) : null) ||
    todayMeals.find(m => m.status === 'READY' || m.status === 'OVERDUE' || m.status === 'UPCOMING') ||
    todayMeals[0];

  const [selectedMealId, setSelectedMealId] = useState<string>(targetMeal?.id ?? '');
  const [outcome, setOutcome] = useState<'GIVEN' | 'REDUCED' | 'SKIPPED'>('GIVEN');
  const [actualKg, setActualKg] = useState<string>(
    recommendedKg > 0 ? recommendedKg.toFixed(1) : (targetMeal?.recommendedQuantityKg?.toFixed(1) ?? '10.0')
  );
  const [uneatenKg, setUneatenKg] = useState<string>('0');
  const [feedingResponse, setFeedingResponse] = useState<FeedingResponse>('GOOD');
  const [surfaceActivity, setSurfaceActivity] = useState<FishActivity>('NORMAL');
  const [consumptionMinutes, setConsumptionMinutes] = useState<string>('15');
  const [behaviourNotes, setBehaviourNotes] = useState<string>('');

  useEffect(() => {
    if (targetMeal) {
      setSelectedMealId(targetMeal.id);
      const defaultKg = recommendedKg > 0 ? recommendedKg : targetMeal.recommendedQuantityKg;
      setActualKg(defaultKg.toFixed(1));
    }
  }, [targetMeal?.id, recommendedKg, open]);

  const activeMeal = todayMeals.find(m => m.id === selectedMealId) || targetMeal;
  const assignedFeedItemId = activeMeal?.assignedFeedItemId ??
    batches.find(batch => batch.id === activeMeal?.assignedFeedBatchId)?.feedItemId;
  const assignedFeedItem = feedItems.find(item => item.id === assignedFeedItemId);
  const compatibleStockKg = assignedFeedItem
    ? batches.filter(batch => {
      const expiry = batch.expiryDate ? new Date(batch.expiryDate) : null;
      const assignedElsewhere = batch.assignedPondIds.length > 0 &&
        !batch.assignedPondIds.some(id => [pond.id, pond.name].includes(id));
      return batch.feedItemId === assignedFeedItem.id &&
        batch.isAvailable &&
        (!expiry || demoNow < expiry) &&
        !assignedElsewhere;
    }).reduce((sum, batch) => sum + batch.quantityKg, 0)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMealId) return;

    const actual = outcome === 'SKIPPED' ? 0 : parseFloat(actualKg) || 0;
    const uneaten = outcome === 'SKIPPED' ? 0 : parseFloat(uneatenKg) || 0;
    const minutes = parseInt(consumptionMinutes, 10) || 15;

    const recorded = logMeal({
      pondId: pond.id,
      mealId: selectedMealId,
      outcome,
      actualQuantityKg: actual,
      uneatenQuantityKg: uneaten,
      feedingResponse,
      consumptionTimeMinutes: minutes,
      surfaceActivity,
      behaviourNotes: behaviourNotes.trim() || undefined,
      notes: `Logged at demo time ${formatTimeOnly(demoNow)}`,
    });

    if (recorded) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Log Feeding — ${pond.name} (${pond.speciesName ?? pond.speciesId ?? 'Fish'})`}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="meal-log-form"
            className="btn btn-primary"
            disabled={feedingHeld && outcome !== 'SKIPPED'}
            id="btn-submit-meal-log"
          >
            Confirm & Record Meal
          </button>
        </div>
      }
    >
      <form id="meal-log-form" onSubmit={handleSubmit} className="meal-log-form">
        {/* Meal selection */}
        <div className="form-group mb-4">
          <label className="form-label" htmlFor="meal-select">Select Meal Window</label>
          <select
            id="meal-select"
            className="select"
            value={selectedMealId}
            onChange={(e) => {
              setSelectedMealId(e.target.value);
              const m = todayMeals.find(item => item.id === e.target.value);
              if (m) {
                setActualKg(m.recommendedQuantityKg.toFixed(1));
              }
            }}
          >
            {todayMeals.map((m, idx) => (
              <option key={m.id} value={m.id}>
                Meal {idx + 1} — {formatTimeOnly(m.scheduledTime)} [{m.status}] — {m.recommendedQuantityKg.toFixed(1)} kg rec.
              </option>
            ))}
          </select>
        </div>

        {/* Feeding Outcome */}
        <div className="form-group mb-4">
          <label className="form-label">Feeding Outcome</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className={`btn ${outcome === 'GIVEN' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setOutcome('GIVEN')}
              disabled={feedingHeld}
              id="outcome-given-btn"
            >
              ✓ Meal Given
            </button>
            <button
              type="button"
              className={`btn ${outcome === 'REDUCED' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setOutcome('REDUCED')}
              disabled={feedingHeld}
              id="outcome-reduced-btn"
            >
              ↓ Meal Reduced
            </button>
            <button
              type="button"
              className={`btn ${outcome === 'SKIPPED' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => {
                setOutcome('SKIPPED');
                setActualKg('0');
              }}
              id="outcome-skipped-btn"
            >
              ✕ Meal Skipped
            </button>
          </div>
        </div>
        {feedingHeld && (
          <p className="text-sm" role="alert" style={{ color: 'var(--color-critical)', marginTop: 'var(--space-2)' }}>
            Feed release is disabled while conditions are critical or under reassessment. You may record a skipped meal, then remeasure water before feeding.
          </p>
        )}

        {outcome !== 'SKIPPED' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="actual-kg-input">
                Actual Quantity Fed (kg)
                <span className="text-xs text-muted" style={{ display: 'block' }}>
                  Rec: {activeMeal ? activeMeal.recommendedQuantityKg.toFixed(1) : recommendedKg.toFixed(1)} kg
                </span>
              </label>
              <input
                id="actual-kg-input"
                type="number"
                step="0.1"
                min="0"
                className="input"
                value={actualKg}
                onChange={(e) => setActualKg(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="uneaten-kg-input">
                Uneaten Feed Residual (kg)
                <span className="text-xs text-muted" style={{ display: 'block' }}>Estimated feed leftover</span>
              </label>
              <input
                id="uneaten-kg-input"
                type="number"
                step="0.1"
                min="0"
                className="input"
                value={uneatenKg}
                onChange={(e) => setUneatenKg(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Feed inventory availability */}
        <div className="form-group mb-4">
          <label className="form-label">Feed product and available stock</label>
          <div className="card card-sm" style={{ padding: 'var(--space-3)' }}>
            <strong>{assignedFeedItem?.name ?? 'No compatible feed assigned'}</strong>
            <span className="text-sm text-muted" style={{ display: 'block', marginTop: '4px' }}>
              {compatibleStockKg.toFixed(1)} kg available across non-expired compatible batches. Actual quantity dispensed is issued FEFO when this meal is confirmed.
            </span>
            {outcome !== 'SKIPPED' && actualKg.trim() !== '' && Number(actualKg) > compatibleStockKg && (
              <span role="alert" className="text-sm" style={{ display: 'block', color: 'var(--color-critical)', marginTop: 'var(--space-2)' }}>
                Insufficient compatible stock for this quantity.
              </span>
            )}
          </div>
        </div>

        {/* Fish Appetite & Response */}
        <div className="form-group mb-4">
          <label className="form-label">Observed Feeding Response</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-2)' }}>
            {(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'REFUSED'] as FeedingResponse[]).map(res => (
              <button
                key={res}
                type="button"
                className={`btn btn-sm ${feedingResponse === res ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFeedingResponse(res)}
                id={`response-${res.toLowerCase()}-btn`}
              >
                {res === 'EXCELLENT' && '🟢 Aggressive (Exc)'}
                {res === 'GOOD' && '🔵 Good Normal'}
                {res === 'FAIR' && '🟡 Fair Moderate'}
                {res === 'POOR' && '🟠 Poor Sluggish'}
                {res === 'REFUSED' && '🔴 Refused'}
              </button>
            ))}
          </div>
        </div>

        {/* Surface activity & Consumption duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="activity-select">Surface Fish Activity</label>
            <select
              id="activity-select"
              className="select"
              value={surfaceActivity}
              onChange={(e) => setSurfaceActivity(e.target.value as FishActivity)}
            >
              <option value="NORMAL">Normal Swimming</option>
              <option value="HIGH">High Surface Vigor</option>
              <option value="LOW">Low Swimming Activity</option>
              <option value="LETHARGIC">Lethargic / Bottom Sitting</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="duration-input">Duration to Clear Feed (min)</label>
            <input
              id="duration-input"
              type="number"
              min="1"
              max="120"
              className="input"
              value={consumptionMinutes}
              onChange={(e) => setConsumptionMinutes(e.target.value)}
            />
          </div>
        </div>

        {/* Behaviour Notes */}
        <div className="form-group">
          <label className="form-label" htmlFor="notes-input">Farmer Notes & Observations</label>
          <textarea
            id="notes-input"
            className="input"
            rows={2}
            placeholder="e.g. Fish surfaced promptly; feed cleared within 12 minutes."
            value={behaviourNotes}
            onChange={(e) => setBehaviourNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
