import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore, useDemoNow, usePondAlerts } from '../core/store';
import { DecisionHero } from '../components/DecisionHero';
import { LiveWaterCard } from '../components/LiveWaterCard';
import { MealScheduleTable } from '../components/MealScheduleTable';
import { WhyRecommendationCard } from '../components/WhyRecommendationCard';
import { MealLogModal } from '../components/MealLogModal';
import { WaterReadingModal } from '../components/WaterReadingModal';
import { GrowthModal } from '../components/GrowthModal';
import { calculateBaseRation, calculateBiomass, calculateDaysInPond, calculateSurvivalRate } from '../core/calculations';
import { SPECIES_CONFIGS } from '../core/config';

export function PondDashboardView() {
  const { pondId } = useParams<{ pondId: string }>();
  const navigate = useNavigate();
  const ponds = useStore(state => state.ponds);
  const batches = useStore(state => state.inventoryBatches);
  const selectPond = useStore(state => state.selectPond);
  const demoNow = useDemoNow();

  const pond = ponds.find(p => p.id === pondId) || ponds[0];
  const pondAlerts = usePondAlerts(pond?.id ?? '');

  useEffect(() => {
    if (pond) selectPond(pond.id);
  }, [pond?.id, selectPond]);

  const [feedModalOpen, setFeedModalOpen] = useState(false);
  const [feedModalMealId, setFeedModalMealId] = useState<string | null>(null);
  const [feedModalRecKg, setFeedModalRecKg] = useState<number | undefined>(undefined);
  const [waterModalOpen, setWaterModalOpen] = useState(false);
  const [growthModalOpen, setGrowthModalOpen] = useState(false);

  if (!pond) {
    return (
      <div className="container py-8 text-center">
        <h2>No pond selected</h2>
        <Link to="/" className="btn btn-primary mt-4">Go to Pond Gate</Link>
      </div>
    );
  }

  const liveStock = pond.estimatedLiveStockCount ?? pond.originalStockCount ?? 0;
  const meanWeight = pond.meanWeightGrams ?? 200;
  const biomassKg = calculateBiomass(liveStock, meanWeight);
  const daysInPond = calculateDaysInPond(pond.stockingDate, demoNow);
  const survivalRate = calculateSurvivalRate(pond.originalStockCount, pond.estimatedLiveStockCount);
  const assignedBatch = batches.find(b => b.id === pond.assignedFeedBatchId);

  const dailyFeedKg = calculateBaseRation(
    biomassKg,
    (pond.speciesId ? SPECIES_CONFIGS[pond.speciesId]?.stageFeedingRates[pond.growthStage ?? ''] : undefined) ?? 0
  );
  const batchRunwayDays = assignedBatch && dailyFeedKg > 0 ? (assignedBatch.quantityKg / dailyFeedKg) : 0;

  const handleOpenFeedModal = (mealId?: string, recKg?: number) => {
    setFeedModalMealId(mealId ?? null);
    setFeedModalRecKg(recKg);
    setFeedModalOpen(true);
  };

  return (
    <div className="pond-dashboard-view container py-6">
      {/* Top Pond Switcher Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Link to="/" className="btn btn-secondary btn-sm" id="btn-back-to-gate">
            ← All Ponds
          </Link>
          <div style={{ display: 'flex', gap: 'var(--space-1)', background: 'var(--color-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            {ponds.map(p => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${p.id === pond.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => navigate(`/pond/${p.id}`)}
                id={`switch-pond-${p.id}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setGrowthModalOpen(true)}
            id="btn-log-growth-top"
          >
            📊 Sample Growth & Biomass
          </button>
          <Link
            to={`/forecast?pond=${pond.id}`}
            className="btn btn-secondary btn-sm"
            id="btn-view-forecast"
          >
            📈 Feed Forecast →
          </Link>
        </div>
      </div>

      {/* Pond Identity Bar */}
      <div className="card card-sm mb-6" style={{ background: 'var(--color-card)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-extrabold)', margin: 0, color: 'var(--color-text-primary)' }}>
              {pond.name} — {pond.speciesName ?? pond.speciesId ?? 'Production Pond'}
            </h1>
            <span className="text-xs text-muted">
              Stage: <strong>{pond.growthStage ?? 'Grow-out'}</strong> • Stocked {pond.stockingDate ?? '2026-08-01'} ({daysInPond} days in culture) • Area: {pond.areaM2 ?? 1000} m²
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)', textAlign: 'right' }}>
            <div>
              <span className="text-xs text-muted" style={{ display: 'block' }}>Total Biomass</span>
              <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--color-teal)' }} id="dash-biomass-val">
                {biomassKg.toFixed(1)} kg
              </span>
            </div>
            <div>
              <span className="text-xs text-muted" style={{ display: 'block' }}>Mean Weight</span>
              <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }} id="dash-abw-val">
                {meanWeight.toFixed(0)}g
              </span>
            </div>
            <div>
              <span className="text-xs text-muted" style={{ display: 'block' }}>Survival Rate</span>
              <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--color-optimal)' }}>
                {survivalRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Feeding Decision Hero */}
      <DecisionHero
        pond={pond}
        onOpenFeedModal={() => handleOpenFeedModal()}
        onOpenWaterModal={() => setWaterModalOpen(true)}
      />

      {/* Mathematical Transparency Card */}
      <WhyRecommendationCard pond={pond} />

      {/* Grid: Live Water Telemetry + Meal Schedule */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-6)' }}>
        <div>
          <LiveWaterCard
            pond={pond}
            onOpenWaterModal={() => setWaterModalOpen(true)}
          />

          {/* Assigned Batch Card */}
          <div className="card card-md mb-6" id="dash-inventory-card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
              📦 Assigned Feed Stock
            </h3>
            {assignedBatch ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <div>
                    <strong>{assignedBatch.feedItemName}</strong>
                    <span className="text-xs text-muted" style={{ display: 'block' }}>
                      SKU: {assignedBatch.sku} • {assignedBatch.pelletSizeMm}mm
                    </span>
                  </div>
                  <span className={`badge ${assignedBatch.isLowStock ? 'badge-warning' : 'badge-optimal'}`}>
                    {assignedBatch.isLowStock ? '⚠️ Low Stock' : 'In Stock'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', background: 'var(--color-neutral-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span className="text-xs text-muted">Remaining Stock</span>
                    <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)' }} id="dash-stock-kg">
                      {assignedBatch.quantityKg.toFixed(1)} kg
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Estimated Runway</span>
                    <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)', color: batchRunwayDays < 7 ? 'var(--color-warning)' : 'var(--color-teal)' }}>
                      ~{batchRunwayDays.toFixed(0)} days
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-3)', textAlign: 'right' }}>
                  <Link to="/inventory" className="text-xs" style={{ color: 'var(--color-teal)', fontWeight: 'var(--font-semibold)' }}>
                    Manage Inventory →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">No feed batch currently assigned to this pond.</p>
            )}
          </div>
        </div>

        <div>
          <MealScheduleTable
            pond={pond}
            onOpenFeedModal={(mealId, recKg) => handleOpenFeedModal(mealId, recKg)}
          />

          {/* Active Alerts for Pond */}
          {pondAlerts.length > 0 && (
            <div className="card card-md mb-6" style={{ borderColor: 'var(--color-warning-border)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)', color: 'var(--color-warning)' }}>
                ⚠️ Active Alerts for {pond.name} ({pondAlerts.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {pondAlerts.map(alert => (
                  <div
                    key={alert.id}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      background: alert.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                      border: `1px solid ${alert.severity === 'CRITICAL' ? 'var(--color-critical-border)' : 'var(--color-warning-border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 'var(--text-sm)' }}>{alert.title}</strong>
                      <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'} text-xs`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      {alert.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MealLogModal
        open={feedModalOpen}
        onClose={() => setFeedModalOpen(false)}
        pond={pond}
        initialMealId={feedModalMealId}
        recommendedKg={feedModalRecKg}
      />

      <WaterReadingModal
        open={waterModalOpen}
        onClose={() => setWaterModalOpen(false)}
        pond={pond}
      />

      <GrowthModal
        open={growthModalOpen}
        onClose={() => setGrowthModalOpen(false)}
        pond={pond}
      />
    </div>
  );
}
