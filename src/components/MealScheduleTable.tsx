import React from 'react';
import type { Pond, FeedingRecord } from '../types/pond';
import { formatTimeOnly } from '../utils/ids';
import type { MealStatus } from '../types/common';

interface MealScheduleTableProps {
  pond: Pond;
  onOpenFeedModal: (mealId?: string, recKg?: number) => void;
}

export function MealScheduleTable({ pond, onOpenFeedModal }: MealScheduleTableProps) {
  const meals = pond.feedingRecords;

  const getStatusBadge = (status: MealStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge badge-optimal">✓ Given</span>;
      case 'ADJUSTED':
        return <span className="badge badge-warning">↓ Adjusted</span>;
      case 'SKIPPED':
        return <span className="badge badge-critical">✕ Skipped</span>;
      case 'OVERDUE':
        return <span className="badge badge-critical">⏰ Overdue</span>;
      case 'READY':
        return <span className="badge badge-optimal">Ready Now</span>;
      case 'ON_HOLD':
        return <span className="badge badge-critical">On Hold</span>;
      case 'UPCOMING':
      default:
        return <span className="badge badge-neutral">⏳ Upcoming</span>;
    }
  };

  const getResponseTag = (meal: FeedingRecord) => {
    if (!meal.feedingResponse) return <span className="text-muted">—</span>;
    switch (meal.feedingResponse) {
      case 'EXCELLENT':
      case 'GOOD':
        return <span className="badge badge-optimal text-xs">{meal.feedingResponse}</span>;
      case 'FAIR':
        return <span className="badge badge-info text-xs">{meal.feedingResponse}</span>;
      case 'POOR':
      case 'REFUSED':
        return <span className="badge badge-critical text-xs">{meal.feedingResponse}</span>;
      default:
        return <span>{meal.feedingResponse}</span>;
    }
  };

  return (
    <div className="card card-md mb-6" id="meal-schedule-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--color-teal)' }}>🍽️</span> Today's Feeding Schedule
          </h3>
          <span className="text-xs text-muted">
            {meals.length} scheduled meals • Total planned: {meals.reduce((sum, m) => sum + (m.recommendedQuantityKg || m.plannedQuantityKg), 0).toFixed(1)} kg
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onOpenFeedModal()}
          id="btn-schedule-quick-log"
        >
          + Log Meal
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
              <th style={{ padding: '8px 12px' }}>Meal Window</th>
              <th style={{ padding: '8px 12px' }}>Time</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Recommended</th>
              <th style={{ padding: '8px 12px' }}>Actual Fed</th>
              <th style={{ padding: '8px 12px' }}>Response</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {meals.map((meal, idx) => {
              const isActionable = !meal.confirmed && (meal.status === 'READY' || meal.status === 'OVERDUE' || meal.status === 'UPCOMING');
              return (
                <tr
                  key={meal.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: meal.status === 'OVERDUE' ? 'rgba(239, 68, 68, 0.04)' : undefined,
                  }}
                  id={`meal-row-${idx + 1}`}
                >
                  <td style={{ padding: '12px', fontWeight: 'var(--font-semibold)' }}>
                    Meal {idx + 1}
                  </td>
                  <td style={{ padding: '12px', fontSize: 'var(--text-sm)' }}>
                    {formatTimeOnly(meal.scheduledTime)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {getStatusBadge(meal.status)}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'var(--font-semibold)' }}>
                    {(meal.recommendedQuantityKg ?? meal.plannedQuantityKg).toFixed(1)} kg
                  </td>
                  <td style={{ padding: '12px' }}>
                    {meal.actualQuantityKg !== null && meal.actualQuantityKg !== undefined ? (
                      <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-teal)' }}>
                        {meal.actualQuantityKg.toFixed(1)} kg
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    {meal.uneatenQuantityKg ? (
                      <span className="text-xs text-muted" style={{ display: 'block', color: 'var(--color-critical)' }}>
                        ({meal.uneatenQuantityKg.toFixed(1)} kg uneaten)
                      </span>
                    ) : null}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {getResponseTag(meal)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${isActionable ? 'btn-primary' : 'btn-secondary'}`}
                      disabled={meal.confirmed}
                      onClick={() => onOpenFeedModal(meal.id, meal.recommendedQuantityKg || meal.plannedQuantityKg)}
                      id={`btn-log-meal-${idx + 1}`}
                    >
                      {meal.confirmed ? 'Recorded' : isActionable ? 'Log Meal' : 'View Meal'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
