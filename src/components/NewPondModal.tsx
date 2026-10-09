import React, { useState } from 'react';
import { useStore, useDemoNow } from '../core/store';
import { Modal } from './Modal';
import type { Pond, WaterReading, FeedingRecord, MealScheduleEntry } from '../types/pond';
import { generateId } from '../utils/ids';
import { calculateBiomass } from '../core/calculations';

interface NewPondModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewPondModal({ open, onClose }: NewPondModalProps) {
  const addPond = useStore(state => state.addPond);
  const batches = useStore(state => state.inventoryBatches);
  const demoNow = useDemoNow();

  const [name, setName] = useState<string>('Pond B1');
  const [speciesId, setSpeciesId] = useState<string>('nile-tilapia');
  const [areaM2, setAreaM2] = useState<string>('1000');
  const [stockCount, setStockCount] = useState<string>('4000');
  const [abwGrams, setAbwGrams] = useState<string>('150');
  const [assignedBatchId, setAssignedBatchId] = useState<string>(batches[0]?.id ?? '');

  const area = parseFloat(areaM2) || 1000;
  const count = parseInt(stockCount, 10) || 4000;
  const abw = parseFloat(abwGrams) || 150;
  const biomassKg = calculateBiomass(count, abw);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const pondId = generateId('pond');
    const nowIso = demoNow.toISOString();
    const dateStr = nowIso.split('T')[0];

    const initialReading: WaterReading = {
      id: generateId('wr'),
      pondId,
      temperature: 28.5,
      dissolvedOxygen: 6.8,
      pH: 7.6,
      demoTimestamp: nowIso,
      quality: 'VALID',
    };

    const scheduleEntries: MealScheduleEntry[] = [
      { id: generateId('mse'), scheduledTime: '08:00', plannedQuantityKg: (biomassKg * 0.0325) / 3 },
      { id: generateId('mse'), scheduledTime: '12:30', plannedQuantityKg: (biomassKg * 0.0325) / 3 },
      { id: generateId('mse'), scheduledTime: '17:00', plannedQuantityKg: (biomassKg * 0.0325) / 3 },
    ];

    const feedingRecords: FeedingRecord[] = scheduleEntries.map((mse, idx) => ({
      id: generateId('meal'),
      pondId,
      mealScheduleEntryId: mse.id,
      scheduledTime: `${dateStr}T${mse.scheduledTime}:00.000Z`,
      status: 'UPCOMING',
      plannedQuantityKg: mse.plannedQuantityKg,
      recommendedQuantityKg: mse.plannedQuantityKg,
      assignedFeedItemId: 'floating-fish-pellet',
      assignedFeedBatchId: assignedBatchId || null,
      confirmed: false,
      actualQuantityKg: null,
      uneatenQuantityKg: null,
      feedingResponse: null,
      consumptionTimeMinutes: null,
      surfaceActivity: null,
      behaviourNotes: '',
      notes: '',
      adjustmentReason: null,
      relatedAlertIds: [],
      demoCreatedAt: nowIso,
      demoUpdatedAt: nowIso,
    }));

    const speciesNames: Record<string, { name: string; scientific: string }> = {
      'nile-tilapia': { name: 'Nile tilapia', scientific: 'Oreochromis niloticus' },
      'rohu': { name: 'Rohu', scientific: 'Labeo rohita' },
      'catla': { name: 'Catla', scientific: 'Gibelion catla' },
    };

    const spec = speciesNames[speciesId] || speciesNames['nile-tilapia'];

    const newPond: Pond = {
      id: pondId,
      name,
      speciesId,
      speciesName: spec.name,
      scientificName: spec.scientific,
      growthStage: abw < 50 ? 'fingerling' : 'grow-out',
      stockingDate: dateStr,
      originalStockCount: count,
      estimatedLiveStockCount: count,
      meanWeightGrams: abw,
      biomassKg,
      assignedFeedItemId: 'floating-fish-pellet',
      assignedFeedBatchId: assignedBatchId || null,
      mealsPerDay: 3,
      mealSchedule: scheduleEntries,
      water: {
        current: initialReading,
        history: [initialReading],
        trend: {
          temperatureTrend: 'STABLE',
          doTrend: 'STABLE',
          rapidRise: false,
          rapidRiseDelta: null,
        },
        activity: 'NORMAL',
      },
      growthRecords: [
        {
          id: generateId('gr'),
          pondId,
          samplingDate: dateStr,
          sampleSize: 30,
          meanWeightGrams: abw,
          survivalEstimatePercent: 100,
          mortalitySincePrevious: null,
          notes: 'Initial stocking weight sample',
          demoCreatedAt: nowIso,
        },
      ],
      mortalityRecords: [],
      feedingRecords,
      notes: 'Production pond initialized',
      setupComplete: true,
      areaM2: area,
      decisionState: 'GOOD_TO_GO',
      pondGateStatus: 'GOOD_TO_GO',
      demoCreatedAt: nowIso,
      demoUpdatedAt: nowIso,
    };

    addPond(newPond);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Production Pond"
      size="default"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="new-pond-form"
            className="btn btn-primary"
            id="btn-create-pond"
          >
            Create Pond
          </button>
        </div>
      }
    >
      <form id="new-pond-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-pond-name">Pond Identifier</label>
            <input
              id="new-pond-name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-pond-species">Species Stocked</label>
            <select
              id="new-pond-species"
              className="select"
              value={speciesId}
              onChange={(e) => setSpeciesId(e.target.value)}
            >
              <option value="nile-tilapia">Nile tilapia (Oreochromis niloticus)</option>
              <option value="rohu">Rohu (Labeo rohita)</option>
              <option value="catla">Catla (Gibelion catla)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-pond-area">Surface Area (m²)</label>
            <input
              id="new-pond-area"
              type="number"
              min="50"
              className="input"
              value={areaM2}
              onChange={(e) => setAreaM2(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-pond-count">Stock Count (fish)</label>
            <input
              id="new-pond-count"
              type="number"
              min="100"
              className="input"
              value={stockCount}
              onChange={(e) => setStockCount(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group mb-4">
          <label className="form-label" htmlFor="new-pond-abw">Mean Body Weight (g)</label>
          <input
            id="new-pond-abw"
            type="number"
            min="1"
            className="input"
            value={abwGrams}
            onChange={(e) => setAbwGrams(e.target.value)}
            required
          />
        </div>

        <div className="card card-sm mb-4" style={{ background: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="text-xs text-muted">Initial Estimated Biomass:</span>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--color-teal)' }}>
                {biomassKg.toFixed(1)} kg
              </div>
            </div>
            <div>
              <span className="text-xs text-muted">Stocking Density:</span>
              <div style={{ fontWeight: 'var(--font-semibold)' }}>
                {(count / area).toFixed(2)} fish / m²
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="new-pond-feed">Assigned Compatible Feed Batch</label>
          <select
            id="new-pond-feed"
            className="select"
            value={assignedBatchId}
            onChange={(e) => setAssignedBatchId(e.target.value)}
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.sku} — {b.feedItemName} ({b.pelletSizeMm}mm, {b.quantityKg} kg available)
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
