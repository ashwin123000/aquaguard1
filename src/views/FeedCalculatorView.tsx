import React, { useState } from 'react';
import { useStore } from '../core/store';
import { calculateBiomass, calculateWaterAdjustment } from '../core/calculations';

export function FeedCalculatorView() {
  const ponds = useStore(state => state.ponds);
  const updatePond = useStore(state => state.updatePond);
  const addToast = useStore(state => state.addToast);

  const [species, setSpecies] = useState<'Nile tilapia' | 'Rohu' | 'Catla' | 'Pangasius'>('Nile tilapia');
  const [fishCount, setFishCount] = useState<string>('5000');
  const [abwGrams, setAbwGrams] = useState<string>('200');
  const [feedRatePercent, setFeedRatePercent] = useState<string>('2.5');
  const [temperature, setTemperature] = useState<string>('28.5');
  const [dissolvedOxygen, setDissolvedOxygen] = useState<string>('6.5');
  const [selectedPondToApply, setSelectedPondToApply] = useState<string>(ponds[0]?.id ?? '');

  const count = parseInt(fishCount, 10) || 1000;
  const abw = parseFloat(abwGrams) || 100;
  const ratePct = parseFloat(feedRatePercent) || 2.5;
  const temp = parseFloat(temperature) || 28;
  const doVal = parseFloat(dissolvedOxygen) || 6.5;

  const biomassKg = calculateBiomass(count, abw);
  const baseDailyKg = (biomassKg * ratePct) / 100;

  const waterAdj = calculateWaterAdjustment({
    temperature: temp,
    dissolvedOxygen: doVal,
    pH: 7.5,
  });

  const adjustedDailyKg = baseDailyKg * waterAdj.fraction;

  const meal1Kg = adjustedDailyKg * 0.30;
  const meal2Kg = adjustedDailyKg * 0.35;
  const meal3Kg = adjustedDailyKg * 0.35;

  const tempCurve = [22, 24, 26, 28, 30, 32, 34].map(t => {
    const adj = calculateWaterAdjustment({
      temperature: t,
      dissolvedOxygen: doVal,
      pH: 7.5,
    });
    return {
      temp: t,
      multiplier: adj.fraction,
      dailyFeedKg: baseDailyKg * adj.fraction,
      status: adj.fraction === 0 ? 'STOP' : adj.fraction < 0.8 ? 'REDUCED' : 'OPTIMAL',
    };
  });

  const handleApplyToPond = () => {
    if (!selectedPondToApply) return;
    updatePond(selectedPondToApply, {
      meanWeightGrams: abw,
      estimatedLiveStockCount: count,
    });
    addToast({
      type: 'success',
      title: 'Parameters Applied',
      message: `Updated pond stock count to ${count.toLocaleString()} and ABW to ${abw}g.`,
    });
  };

  return (
    <div className="feed-calculator-view container py-6">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-extrabold)', margin: 0, color: 'var(--color-text-primary)' }}>
          Precision Feed Sandbox Calculator
        </h1>
        <p className="text-sm text-muted" style={{ margin: 'var(--space-1) 0 0 0' }}>
          Simulate biological feeding rates, environmental adjustments, and temperature sensitivity curves.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-6)' }}>
        {/* Left Input Panel */}
        <div className="card card-md">
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-4)' }}>
            Biomass & Environmental Inputs
          </h3>

          <div className="form-group mb-4">
            <label className="form-label" htmlFor="calc-species">Species</label>
            <select
              id="calc-species"
              className="select"
              value={species}
              onChange={(e) => setSpecies(e.target.value as any)}
            >
              <option value="Nile tilapia">Nile tilapia (Oreochromis niloticus)</option>
              <option value="Rohu">Rohu (Labeo rohita)</option>
              <option value="Catla">Catla (Gibelion catla)</option>
              <option value="Pangasius">Pangasius (Pangasianodon hypophthalmus)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="calc-count">Fish Population (count)</label>
              <input
                id="calc-count"
                type="number"
                min="100"
                className="input"
                value={fishCount}
                onChange={(e) => setFishCount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="calc-abw">Mean Weight (grams)</label>
              <input
                id="calc-abw"
                type="number"
                step="1"
                min="1"
                className="input"
                value={abwGrams}
                onChange={(e) => setAbwGrams(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group mb-4">
            <label className="form-label" htmlFor="calc-rate">
              Base Feeding Rate (% of Body Weight)
              <span className="text-xs text-muted" style={{ display: 'block' }}>Typical: 2.0% - 3.5%</span>
            </label>
            <input
              id="calc-rate"
              type="number"
              step="0.1"
              min="0.5"
              max="10"
              className="input"
              value={feedRatePercent}
              onChange={(e) => setFeedRatePercent(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="calc-temp">
                Water Temperature (°C)
              </label>
              <input
                id="calc-temp"
                type="number"
                step="0.5"
                min="18"
                max="38"
                className="input"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="calc-do">
                Dissolved Oxygen (mg/L)
              </label>
              <input
                id="calc-do"
                type="number"
                step="0.1"
                min="1"
                max="12"
                className="input"
                value={dissolvedOxygen}
                onChange={(e) => setDissolvedOxygen(e.target.value)}
              />
            </div>
          </div>

          {/* Apply to Pond Footer */}
          <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <label className="form-label" htmlFor="apply-pond-select">Apply parameters to production pond:</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <select
                id="apply-pond-select"
                className="select"
                value={selectedPondToApply}
                onChange={(e) => setSelectedPondToApply(e.target.value)}
              >
                {ponds.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.speciesName ?? p.speciesId ?? 'Fish'})</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleApplyToPond}
                id="btn-apply-calc-to-pond"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Right Output Panel */}
        <div>
          {/* Main Calculation Card */}
          <div className="card card-md mb-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-teal)' }}>
            <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Derived Feeding Recommendation
            </span>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-extrabold)', color: 'var(--color-teal)', margin: 'var(--space-1) 0 var(--space-4) 0' }} id="calc-adjusted-ration">
              {adjustedDailyKg.toFixed(1)} <span style={{ fontSize: 'var(--text-md)', fontWeight: 'normal' }}>kg / day</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-2)' }}>
                <span className="text-xs text-muted">Biomass</span>
                <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)' }}>
                  {biomassKg.toFixed(1)} kg
                </div>
              </div>

              <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-2)' }}>
                <span className="text-xs text-muted">Base Ration</span>
                <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)' }}>
                  {baseDailyKg.toFixed(1)} kg
                </div>
              </div>

              <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-2)' }}>
                <span className="text-xs text-muted">Env. Multiplier</span>
                <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)', color: waterAdj.fraction < 0.8 ? 'var(--color-warning)' : 'var(--color-optimal)' }}>
                  {(waterAdj.fraction * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Meal Split */}
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
              Scheduled Meal Allocations (3 Daily Windows)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
              <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-2)', textAlign: 'center' }}>
                <span className="text-xs text-muted">Meal 1 (Morning 30%)</span>
                <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)', color: 'var(--color-teal)' }}>
                  {meal1Kg.toFixed(1)} kg
                </div>
              </div>

              <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-2)', textAlign: 'center' }}>
                <span className="text-xs text-muted">Meal 2 (Noon 35%)</span>
                <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)', color: 'var(--color-teal)' }}>
                  {meal2Kg.toFixed(1)} kg
                </div>
              </div>

              <div className="card card-sm" style={{ background: 'var(--color-neutral-bg)', padding: 'var(--space-2)', textAlign: 'center' }}>
                <span className="text-xs text-muted">Meal 3 (Evening 35%)</span>
                <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)', color: 'var(--color-teal)' }}>
                  {meal3Kg.toFixed(1)} kg
                </div>
              </div>
            </div>
          </div>

          {/* Temperature Sensitivity Curve */}
          <div className="card card-md">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
              Temperature Sensitivity Response Curve
            </h3>
            <p className="text-xs text-muted mb-3">
              Shows how temperature impacts the daily feeding recommendation at DO = {doVal} mg/L.
            </p>

            <table className="table" style={{ width: '100%', fontSize: 'var(--text-xs)', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '6px 8px' }}>Temp (°C)</th>
                  <th style={{ padding: '6px 8px' }}>Multiplier</th>
                  <th style={{ padding: '6px 8px' }}>Recommended Feed (kg)</th>
                  <th style={{ padding: '6px 8px' }}>Condition</th>
                </tr>
              </thead>
              <tbody>
                {tempCurve.map(row => (
                  <tr
                    key={row.temp}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: Math.abs(row.temp - temp) < 1.0 ? 'rgba(14, 116, 144, 0.08)' : undefined,
                    }}
                  >
                    <td style={{ padding: '6px 8px', fontWeight: 'var(--font-semibold)' }}>{row.temp}°C</td>
                    <td style={{ padding: '6px 8px' }}>{(row.multiplier * 100).toFixed(0)}%</td>
                    <td style={{ padding: '6px 8px', fontWeight: 'var(--font-bold)' }}>{row.dailyFeedKg.toFixed(1)} kg</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span className={`badge ${row.status === 'OPTIMAL' ? 'badge-optimal' : row.status === 'REDUCED' ? 'badge-warning' : 'badge-critical'} text-xs`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
