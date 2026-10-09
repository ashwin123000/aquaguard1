import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore, usePondFeedingDecision, usePondAlerts } from '../core/store';
import { NewPondModal } from '../components/NewPondModal';
import { calculateBiomass } from '../core/calculations';

function PondSelectionCard({ pond }: { pond: ReturnType<typeof useStore.getState>['ponds'][number] }) {
  const decision = usePondFeedingDecision(pond.id);
  const alerts = usePondAlerts(pond.id);
  const biomass = calculateBiomass(
    pond.estimatedLiveStockCount ?? pond.originalStockCount ?? 0,
    pond.meanWeightGrams ?? 0
  );
  const status = decision?.decisionState ?? pond.decisionState;
  const critical = status === 'LOW_OXYGEN' || status === 'STOP_FEEDING' || status === 'FEEDING_ON_HOLD';
  const warning = status !== 'GOOD_TO_GO' && status !== 'UPCOMING' && status !== 'MEAL_OVERDUE';

  return (
    <Link to={`/pond/${pond.id}`} className={`pond-selection-card${critical ? ' pond-selection-critical' : ''}`} id={`pond-tile-${pond.id}`}>
      <div className="pond-selection-topline">
        <span className="pond-selection-index">POND · {pond.id}</span>
        <span className={`pond-selection-status${critical ? ' is-critical' : warning ? ' is-warning' : ''}`}>
          <i aria-hidden="true" /> {status.replace(/_/g, ' ')}
        </span>
      </div>
      <h2>{pond.name}</h2>
      <p className="pond-selection-species">{pond.speciesName ?? 'Production pond'} <span>·</span> {pond.growthStage ?? 'Grow-out'}</p>
      {alerts[0] && (
        <p className={`pond-selection-alert${alerts[0].severity === 'CRITICAL' ? ' is-critical' : ''}`}>
          <span aria-hidden="true">!</span> {alerts[0].title}
        </p>
      )}
      <div className="pond-selection-measures">
        <div>
          <span>Biomass</span>
          <strong>{biomass.toLocaleString('en-IN', { maximumFractionDigits: 1 })}<small> kg</small></strong>
        </div>
        <div>
          <span>Water · DO / Temp</span>
          <strong>{pond.water?.current?.dissolvedOxygen?.toFixed(1) ?? '—'}<small> mg/L</small><span className="pond-reading-divider">/</span>{pond.water?.current?.temperature?.toFixed(1) ?? '—'}<small>°C</small></strong>
        </div>
      </div>
      <div className="pond-selection-footer">
        <span>View pond plan and telemetry</span>
        <span className="pond-selection-arrow" aria-hidden="true">↗</span>
      </div>
    </Link>
  );
}

export function PondGateView() {
  const ponds = useStore(state => state.ponds);
  const [newPondModalOpen, setNewPondModalOpen] = useState(false);

  return (
    <div className="pond-gate-view">
      <section className="pond-selection-heading">
        <span className="home-section-kicker">FARMER WORKSPACE</span>
        <div className="pond-selection-heading-row">
          <div>
            <h1>Your ponds, one clear view.</h1>
            <p>Choose a pond to review its water, feeding plan and history.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setNewPondModalOpen(true)} id="btn-add-pond-gate">
            + Add production pond
          </button>
        </div>
      </section>

      <section className="pond-selection-grid" id="ponds-grid" aria-label="Select a pond">
        {ponds.map(pond => <PondSelectionCard key={pond.id} pond={pond} />)}
      </section>
      <p className="pond-selection-footnote"><span className="demo-simulated-badge">SIMULATED DATA</span> Demonstration readings are software simulations, not live sensor measurements.</p>

      <NewPondModal open={newPondModalOpen} onClose={() => setNewPondModalOpen(false)} />
    </div>
  );
}
