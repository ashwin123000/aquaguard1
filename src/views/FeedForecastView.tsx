import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore, useDemoNow } from '../core/store';
import { calculateBiomass } from '../core/calculations';
import { formatDemoDate } from '../utils/ids';

export function FeedForecastView() {
  const [searchParams] = useSearchParams();
  const ponds = useStore(state => state.ponds);
  const batches = useStore(state => state.inventoryBatches);
  const demoNow = useDemoNow();

  const initialPondId = searchParams.get('pond') || 'ALL';
  const [selectedPondId, setSelectedPondId] = useState<string>(initialPondId);
  const [forecastHorizonDays, setForecastHorizonDays] = useState<7 | 14 | 30>(14);

  const totalWarehouseStockKg = batches.reduce((sum, b) => sum + b.quantityKg, 0);

  // Filter ponds
  const activePonds = selectedPondId === 'ALL'
    ? ponds
    : ponds.filter(p => p.id === selectedPondId);

  // Generate day-by-day projection
  const forecastDays = Array.from({ length: forecastHorizonDays }, (_, idx) => {
    const dayNumber = idx + 1;
    const date = new Date(demoNow);
    date.setDate(date.getDate() + dayNumber);

    let dayFeedDemandKg = 0;
    let dayTotalBiomassKg = 0;

    activePonds.forEach(p => {
      const count = p.estimatedLiveStockCount ?? p.originalStockCount ?? 0;
      const abw = p.meanWeightGrams ?? 200;
      const adg = (p.speciesId?.includes('tilapia') ?? false) ? 1.5 : 2.2;
      const projectedAbw = abw + (adg * dayNumber);
      const projectedBiomass = calculateBiomass(count, projectedAbw);
      const feedKg = projectedBiomass * 0.03;
      dayFeedDemandKg += feedKg;
      dayTotalBiomassKg += projectedBiomass;
    });

    return {
      dayNumber,
      date,
      dailyFeedKg: dayFeedDemandKg,
      totalBiomassKg: dayTotalBiomassKg,
    };
  });

  let cumulative = 0;
  const projectionWithCumulative = forecastDays.map(d => {
    cumulative += d.dailyFeedKg;
    const remainingStock = totalWarehouseStockKg - cumulative;
    const isStockout = remainingStock < 0;
    return {
      ...d,
      cumulativeFeedKg: cumulative,
      cumulativeBags: Math.ceil(cumulative / 40),
      remainingStockKg: remainingStock,
      isStockout,
    };
  });

  const totalDemandKg = cumulative;
  const totalBagsNeeded = Math.ceil(totalDemandKg / 40);
  const firstStockoutDay = projectionWithCumulative.find(d => d.isStockout);

  return (
    <div className="feed-forecast-view container py-6">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-extrabold)', margin: 0, color: 'var(--color-text-primary)' }}>
            Feed Demand & Growth Forecast
          </h1>
          <p className="text-sm text-muted" style={{ margin: 'var(--space-1) 0 0 0' }}>
            Biological growth projections, feed consumption forecasting, and inventory exhaustion timeline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <select
            className="select"
            value={selectedPondId}
            onChange={(e) => setSelectedPondId(e.target.value)}
            id="forecast-pond-select"
          >
            <option value="ALL">All Ponds Fleet Forecast</option>
            {ponds.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.speciesName ?? p.speciesId ?? 'Fish'})</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '2px', background: 'var(--color-card)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className={`btn btn-sm ${forecastHorizonDays === 7 ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForecastHorizonDays(7)}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`btn btn-sm ${forecastHorizonDays === 14 ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForecastHorizonDays(14)}
            >
              14 Days
            </button>
            <button
              type="button"
              className={`btn btn-sm ${forecastHorizonDays === 30 ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForecastHorizonDays(30)}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="card card-sm" style={{ background: 'var(--color-card)', padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">{forecastHorizonDays}-Day Projected Demand</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-teal)' }} id="forecast-total-demand">
            {totalDemandKg.toFixed(1)} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal' }}>kg</span>
          </div>
          <span className="text-xs text-muted">~{totalBagsNeeded} bags (40kg each)</span>
        </div>

        <div className="card card-sm" style={{ background: 'var(--color-card)', padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Current Warehouse Stock</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>
            {totalWarehouseStockKg.toFixed(1)} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal' }}>kg</span>
          </div>
          <span className="text-xs text-muted">Across all batches</span>
        </div>

        <div className="card card-sm" style={{ background: 'var(--color-card)', padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Stockout Risk Horizon</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: firstStockoutDay ? 'var(--color-critical)' : 'var(--color-optimal)' }}>
            {firstStockoutDay ? (
              <span>Day {firstStockoutDay.dayNumber} ({formatDemoDate(firstStockoutDay.date.toISOString())})</span>
            ) : (
              <span>✓ Safe ({forecastHorizonDays}d+)</span>
            )}
          </div>
          <span className="text-xs text-muted">
            {firstStockoutDay ? 'Re-order needed before exhaustion' : 'Adequate feed in stock'}
          </span>
        </div>

        <div className="card card-sm" style={{ background: 'var(--color-card)', padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Estimated Feed Cost</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>
            ${(totalDemandKg * 1.35).toFixed(2)}
          </div>
          <span className="text-xs text-muted">Estimated at $1.35/kg</span>
        </div>
      </div>

      {/* Forecast Data Table */}
      <div className="card card-md mb-6">
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)' }}>
          Day-by-Day Projection Schedule ({forecastHorizonDays} Days)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Day</th>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Projected Biomass</th>
                <th style={{ padding: '10px 12px' }}>Daily Feed (kg)</th>
                <th style={{ padding: '10px 12px' }}>Cumulative Feed (kg)</th>
                <th style={{ padding: '10px 12px' }}>Cumulative Bags</th>
                <th style={{ padding: '10px 12px' }}>Stock Balance</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {projectionWithCumulative.map(row => (
                <tr
                  key={row.dayNumber}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: row.isStockout ? 'rgba(239, 68, 68, 0.05)' : undefined,
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 'var(--font-semibold)' }}>Day +{row.dayNumber}</td>
                  <td style={{ padding: '10px 12px' }}>{formatDemoDate(row.date.toISOString())}</td>
                  <td style={{ padding: '10px 12px' }}>{row.totalBiomassKg.toFixed(1)} kg</td>
                  <td style={{ padding: '10px 12px', fontWeight: 'var(--font-bold)', color: 'var(--color-teal)' }}>
                    {row.dailyFeedKg.toFixed(1)} kg
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 'var(--font-semibold)' }}>{row.cumulativeFeedKg.toFixed(1)} kg</td>
                  <td style={{ padding: '10px 12px' }}>{row.cumulativeBags} bags</td>
                  <td style={{ padding: '10px 12px', fontWeight: 'var(--font-semibold)', color: row.remainingStockKg < 0 ? 'var(--color-critical)' : 'var(--color-text-primary)' }}>
                    {row.remainingStockKg.toFixed(1)} kg
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {row.isStockout ? (
                      <span className="badge badge-critical text-xs">⚠️ Depleted</span>
                    ) : row.remainingStockKg < 100 ? (
                      <span className="badge badge-warning text-xs">Low Stock</span>
                    ) : (
                      <span className="badge badge-optimal text-xs">Sufficient</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
