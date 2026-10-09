import React, { useState } from 'react';
import { useStore, useDemoNow } from '../core/store';
import { Modal } from './Modal';
import type { Pond, WaterReading } from '../types/pond';
import type { FishActivity } from '../types/common';
import { generateId } from '../utils/ids';

interface WaterReadingModalProps {
  open: boolean;
  onClose: () => void;
  pond: Pond;
}

export function WaterReadingModal({ open, onClose, pond }: WaterReadingModalProps) {
  const addWaterReading = useStore(state => state.addWaterReading);
  const demoNow = useDemoNow();
  const currentReading = pond.water?.current;

  const [dissolvedOxygen, setDissolvedOxygen] = useState<string>(currentReading?.dissolvedOxygen?.toFixed(1) ?? '6.8');
  const [temperature, setTemperature] = useState<string>(currentReading?.temperature?.toFixed(1) ?? '28.5');
  const [ph, setPh] = useState<string>(currentReading?.pH?.toFixed(1) ?? '7.6');
  const [activity, setActivity] = useState<FishActivity>(pond.water?.activity ?? 'NORMAL');

  const doNum = parseFloat(dissolvedOxygen) || 6.8;
  const tempNum = parseFloat(temperature) || 28.5;
  const phNum = parseFloat(ph) || 7.6;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const reading: WaterReading = {
      id: generateId('wr'),
      pondId: pond.id,
      temperature: tempNum,
      dissolvedOxygen: doNum,
      pH: phNum,
      demoTimestamp: demoNow.toISOString(),
      quality: 'VALID',
    };

    addWaterReading(pond.id, reading);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Record Water Quality — ${pond.name}`}
      size="default"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="water-reading-form"
            className="btn btn-primary"
            id="btn-submit-water-reading"
          >
            Update Water Quality
          </button>
        </div>
      }
    >
      <form id="water-reading-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="wr-do-input">
              Dissolved Oxygen (DO)
              <span className="text-xs text-muted" style={{ display: 'block' }}>Optimal: 5.0 - 9.0 mg/L</span>
            </label>
            <input
              id="wr-do-input"
              type="number"
              step="0.1"
              min="0"
              max="20"
              className="input"
              value={dissolvedOxygen}
              onChange={(e) => setDissolvedOxygen(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="wr-temp-input">
              Temperature (°C)
              <span className="text-xs text-muted" style={{ display: 'block' }}>Optimal: 26.0 - 31.0 °C</span>
            </label>
            <input
              id="wr-temp-input"
              type="number"
              step="0.1"
              min="0"
              max="45"
              className="input"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="wr-ph-input">
              pH Level
              <span className="text-xs text-muted" style={{ display: 'block' }}>Optimal: 7.0 - 8.5</span>
            </label>
            <input
              id="wr-ph-input"
              type="number"
              step="0.1"
              min="3"
              max="12"
              className="input"
              value={ph}
              onChange={(e) => setPh(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="wr-activity-select">Observed Fish Activity</label>
            <select
              id="wr-activity-select"
              className="select"
              value={activity}
              onChange={(e) => setActivity(e.target.value as FishActivity)}
            >
              <option value="NORMAL">Normal Swimming</option>
              <option value="HIGH">High Surface Vigor</option>
              <option value="LOW">Low Swimming Activity</option>
              <option value="LETHARGIC">Lethargic / Gasping</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
