/**
 * Central application store using Zustand.
 * Single source of truth for all application state.
 * All mutations pass through typed actions defined here.
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Pond, FeedingRecord, GrowthRecord, MortalityRecord, WaterReading, WaterState } from '../types/pond';
import type { InventoryBatch, InventoryTransaction, FeedItem } from '../types/inventory';
import type { Alert } from '../types/alert';
import type { ToastMessage, FeedingResponse, FishActivity, MealStatus, PondGateStatus } from '../types/common';
import { DEMO_INITIAL_TIME, STATE_VERSION, SPECIES_CONFIGS, FEEDING_WINDOW_CONFIG, CRITICAL_DO_THRESHOLD, STALE_READING_MINUTES, NEAR_EXPIRY_DAYS } from '../core/config';
import { createSeedPonds, createSeedInventoryBatches, SEED_FEED_ITEMS, SEED_TRANSACTIONS } from '../core/seedData';
import { generateAlerts } from '../core/alertEngine';
import { deriveFeedingDecision } from '../core/decisionEngine';
import { generateId } from '../utils/ids';
import { evaluateMealStatus, calculateBiomass, calculateLiveStock } from '../core/calculations';

// ========================
// STATE SHAPE
// ========================

export interface AppState {
  // Versioning
  stateVersion: string;

  // Demo clock
  demoClock: string; // ISO timestamp

  // Farm
  farmName: string;

  // Ponds
  ponds: Pond[];
  selectedPondId: string | null;

  // Inventory
  feedItems: FeedItem[];
  inventoryBatches: InventoryBatch[];
  inventoryTransactions: InventoryTransaction[];

  // Alerts
  alerts: Alert[];

  // UI
  toasts: ToastMessage[];
  alertDrawerOpen: boolean;
  demoControlsOpen: boolean;

  // Demo scenarios
  isReassessing: boolean;
  reassessingPondId: string | null;
  reassessingUntil: string | null;
  activeDemoScenarioId: DemoScenarioId | null;
  activeDemoPondId: string | null;
}

export type DemoScenarioId =
  | 'normal-feeding'
  | 'temperature-rise'
  | 'low-oxygen'
  | 'combined-stress'
  | 'aeration-recovery'
  | 'overdue-meal'
  | 'low-stock'
  | 'poor-response'
  | 'stale-telemetry';

// ========================
// ACTIONS
// ========================

export interface AppActions {
  // Clock
  setDemoTime(isoTime: string): void;
  advanceDemoTime(minutes: number): void;

  // Pond management
  addPond(pond: Pond): void;
  updatePond(pondId: string, updates: Partial<Pond>): void;
  selectPond(pondId: string | null): void;

  // Water readings
  addWaterReading(pondId: string, reading: WaterReading): void;
  updateWaterActivity(pondId: string, activity: FishActivity): void;

  // Meal logging
  logMeal(params: {
    pondId: string;
    mealId: string;
    outcome: 'GIVEN' | 'REDUCED' | 'SKIPPED' | 'PENDING';
    actualQuantityKg?: number;
    uneatenQuantityKg?: number;
    feedingResponse?: FeedingResponse;
    consumptionTimeMinutes?: number;
    surfaceActivity?: FishActivity;
    behaviourNotes?: string;
    notes?: string;
  }): boolean;

  // Growth records
  addGrowthRecord(pondId: string, record: Omit<GrowthRecord, 'id' | 'demoCreatedAt'>): void;

  // Mortality
  addMortalityRecord(pondId: string, record: Omit<MortalityRecord, 'id' | 'demoCreatedAt'>): void;

  // Inventory
  addInventoryBatch(batch: Omit<InventoryBatch, 'id' | 'demoCreatedAt' | 'demoUpdatedAt' | 'isExpired' | 'isLowStock' | 'isNearExpiry' | 'isAvailable'>): boolean;
  updateInventoryBatch(batchId: string, updates: Partial<Omit<InventoryBatch, 'quantityKg' | 'isExpired' | 'isLowStock' | 'isNearExpiry' | 'isAvailable' | 'demoCreatedAt' | 'demoUpdatedAt'>>): boolean;
  deleteInventoryBatch(batchId: string): void;
  recordStockUsage(params: { batchId: string; quantityKg: number; pondId?: string; mealId?: string; reason: string; notes?: string }): boolean;
  receiveInventoryStock(params: { batchId: string; quantityKg: number; reason: string; notes?: string; receivedAt?: string }): boolean;
  adjustInventoryStock(params: { batchId: string; quantityKg: number; reason: string; notes?: string }): boolean;
  assignBatchToPond(batchId: string, pondId: string): void;
  unassignBatchFromPond(batchId: string, pondId: string): void;

  // Alerts
  markAlertRead(alertId: string): void;
  markAllAlertsRead(): void;
  resolveAlert(alertId: string, resolvedBy?: string): void;
  dismissAlert(alertId: string, reason?: string): void;
  refreshAlerts(): void;

  // UI
  addToast(toast: Omit<ToastMessage, 'id'>): void;
  removeToast(id: string): void;
  setAlertDrawerOpen(open: boolean): void;
  setDemoControlsOpen(open: boolean): void;

  // Demo scenarios
  simulateHealthyConditions(pondId: string): void;
  simulateRapidTemperatureRise(pondId: string): void;
  simulateFallingOxygen(pondId: string): void;
  simulateCombinedCritical(pondId: string): void;
  simulateRecovery(pondId: string): void;
  makeReadingsStale(pondId: string): void;
  sendImplausibleReading(pondId: string): void;
  triggerOverdueMeal(pondId: string): void;
  simulateLowStock(batchId: string): void;
  restoreStock(batchId: string): void;
  runDemoScenario(scenarioId: DemoScenarioId | 'reset', pondId: string): void;
  resetAllDemoData(): void;

  // Internal
  _recomputePondStates(): void;
  _refreshBatchStatus(): void;
}

type Store = AppState & AppActions;

// ========================
// HELPERS
// ========================

function computeDemoNow(state: AppState): Date {
  return new Date(state.demoClock);
}

function recomputeInventoryBatch(batch: InventoryBatch, demoNow: Date): InventoryBatch {
  const nearExpiryThresholdMs = NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const expiry = batch.expiryDate ? new Date(batch.expiryDate) : null;
  const isExpired = expiry !== null && demoNow >= expiry;
  const msToExpiry = expiry ? expiry.getTime() - demoNow.getTime() : Number.POSITIVE_INFINITY;
  const isNearExpiry = !isExpired && msToExpiry <= nearExpiryThresholdMs;
  const isLowStock = batch.quantityKg <= (batch.minimumStockKg ?? 50);
  return {
    ...batch,
    isExpired,
    isNearExpiry,
    isLowStock,
    isAvailable: !isExpired && batch.quantityKg > 0 && !batch.archived && !batch.quarantined && !batch.spoiled,
    demoUpdatedAt: demoNow.toISOString(),
  };
}

function recomputeMealStatuses(pond: Pond, demoNow: Date): FeedingRecord[] {
  return pond.feedingRecords.map(meal => {
    if (meal.status === 'COMPLETED' || meal.status === 'SKIPPED') return meal;
    const scheduledTime = new Date(meal.scheduledTime);
    const result = evaluateMealStatus(scheduledTime, demoNow, meal.confirmed, meal.status, FEEDING_WINDOW_CONFIG);
    return { ...meal, status: result.status as MealStatus };
  });
}

function gateStatusForDecision(decisionState: Pond['decisionState']): PondGateStatus {
  if (decisionState === 'SETUP_INCOMPLETE') return 'SETUP_INCOMPLETE';
  if (decisionState === 'MEAL_OVERDUE') return 'OVERDUE';
  if (decisionState === 'UPCOMING') return 'UPCOMING';
  if (decisionState === 'GOOD_TO_GO') return 'GOOD_TO_GO';
  if (decisionState === 'FEEDING_ON_HOLD' || decisionState === 'STOP_FEEDING' || decisionState === 'LOW_OXYGEN' || decisionState === 'REASSESSING') return 'ON_HOLD';
  if (decisionState === 'DATA_STALE' || decisionState === 'SENSOR_UNAVAILABLE') return 'MONITOR';
  return 'WARNING';
}

function refreshPondStatuses(ponds: Pond[], batches: InventoryBatch[], demoNow: Date): Pond[] {
  return ponds.map(pond => {
    const decision = deriveFeedingDecision(pond, batches, demoNow);
    return {
      ...pond,
      decisionState: decision.decisionState,
      pondGateStatus: gateStatusForDecision(decision.decisionState),
    };
  });
}

function buildInitialState(): AppState {
  const demoNow = new Date(DEMO_INITIAL_TIME);
  const ponds = createSeedPonds(demoNow);
  const batches = createSeedInventoryBatches(demoNow);

  // Recompute meal statuses from demo clock
  const pondsWithStatuses = ponds.map(p => ({
    ...p,
    feedingRecords: recomputeMealStatuses(p, demoNow),
  }));

  const initialState: AppState = {
    stateVersion: STATE_VERSION,
    demoClock: DEMO_INITIAL_TIME,
    farmName: 'Sangli Aqua Farm',
    ponds: pondsWithStatuses,
    selectedPondId: null,
    feedItems: SEED_FEED_ITEMS,
    inventoryBatches: batches,
    inventoryTransactions: SEED_TRANSACTIONS,
    alerts: [],
    toasts: [],
    alertDrawerOpen: false,
    demoControlsOpen: false,
    isReassessing: false,
    reassessingPondId: null,
    reassessingUntil: null,
    activeDemoScenarioId: null,
    activeDemoPondId: null,
  };

  // Generate initial alerts
  const alerts = generateAlerts({
    ponds: pondsWithStatuses,
    batches,
    demoNow,
    existingAlerts: [],
  });

  return { ...initialState, alerts };
}

// ========================
// STORE
// ========================

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Initial state
      ...buildInitialState(),

      // ---- CLOCK ----

      setDemoTime(isoTime: string) {
        set(state => {
          const demoNow = new Date(isoTime);
          const updatedBatches = state.inventoryBatches.map(b => recomputeInventoryBatch(b, demoNow));
          let updatedPonds = state.ponds.map(p => ({
            ...p,
            feedingRecords: recomputeMealStatuses(p, demoNow),
            demoUpdatedAt: isoTime,
          }));
          let isReassessing = state.isReassessing;
          let reassessingPondId = state.reassessingPondId;
          let reassessingUntil = state.reassessingUntil;
          if (isReassessing && reassessingPondId && reassessingUntil && demoNow >= new Date(reassessingUntil)) {
            const recoveringPond = updatedPonds.find(p => p.id === reassessingPondId);
            const preferences = recoveringPond?.speciesId ? SPECIES_CONFIGS[recoveringPond.speciesId]?.waterPreferences : undefined;
            const reading = recoveringPond?.water?.current;
            if (
              preferences &&
              reading?.dissolvedOxygen !== null &&
              reading?.dissolvedOxygen !== undefined &&
              reading.dissolvedOxygen >= preferences.fullFeedingDOMin &&
              reading.temperature !== null &&
              reading.temperature <= preferences.preferredTempMax &&
              demoNow.getTime() - new Date(reading.demoTimestamp).getTime() <= STALE_READING_MINUTES * 60000 &&
              recoveringPond?.water?.activity !== 'LETHARGIC'
            ) {
              isReassessing = false;
              reassessingPondId = null;
              reassessingUntil = null;
            } else {
              reassessingUntil = new Date(demoNow.getTime() + 15 * 60000).toISOString();
            }
          }
          updatedPonds = refreshPondStatuses(updatedPonds, updatedBatches, demoNow);
          const alerts = generateAlerts({
            ponds: updatedPonds,
            batches: updatedBatches,
            demoNow,
            existingAlerts: state.alerts,
          });
          if (isReassessing && reassessingPondId) {
            updatedPonds = updatedPonds.map(p => p.id === reassessingPondId ? { ...p, decisionState: 'REASSESSING', pondGateStatus: 'ON_HOLD' } : p);
          }
          return {
            demoClock: isoTime,
            ponds: updatedPonds,
            inventoryBatches: updatedBatches,
            alerts,
            isReassessing,
            reassessingPondId,
            reassessingUntil,
          };
        });
      },

      advanceDemoTime(minutes: number) {
        const current = get().demoClock;
        const newTime = new Date(new Date(current).getTime() + minutes * 60000).toISOString();
        get().setDemoTime(newTime);
      },

      // ---- PONDS ----

      addPond(pond: Pond) {
        set(state => {
          const existing = state.ponds.find(p => p.id === pond.id);
          if (existing) {
            throw new Error(`Pond ID ${pond.id} already exists.`);
          }
          const newPonds = [...state.ponds, pond];
          const alerts = generateAlerts({ ponds: newPonds, batches: state.inventoryBatches, demoNow: computeDemoNow(state), existingAlerts: state.alerts });
          return { ponds: newPonds, alerts };
        });
      },

      updatePond(pondId: string, updates: Partial<Pond>) {
        set(state => {
          const newPonds = state.ponds.map(p => p.id === pondId ? { ...p, ...updates, demoUpdatedAt: state.demoClock } : p);
          const alerts = generateAlerts({ ponds: newPonds, batches: state.inventoryBatches, demoNow: computeDemoNow(state), existingAlerts: state.alerts });
          return { ponds: newPonds, alerts };
        });
      },

      selectPond(pondId: string | null) {
        set({ selectedPondId: pondId });
      },

      // ---- WATER ----

      addWaterReading(pondId: string, reading: WaterReading) {
        set(state => {
          const demoNow = computeDemoNow(state);
          const newPonds = state.ponds.map(p => {
            if (p.id !== pondId) return p;

            const history = p.water ? [...p.water.history, p.water.current].filter(Boolean) as WaterReading[] : [];
            const maxHistory = 10;
            const trimmedHistory = history.slice(-maxHistory);

            // Compute trend
            let temperatureTrend: 'RISING' | 'STABLE' | 'FALLING' | 'UNKNOWN' = 'UNKNOWN';
            let doTrend: 'RISING' | 'STABLE' | 'FALLING' | 'UNKNOWN' = 'UNKNOWN';
            let rapidRise = false;
            let rapidRiseDelta: number | null = null;

            const species = p.speciesId ? SPECIES_CONFIGS[p.speciesId] : null;

            if (history.length > 0 && reading.temperature !== null) {
              const prevTemp = history[history.length - 1]?.temperature;
              if (prevTemp !== null && prevTemp !== undefined) {
                const delta = reading.temperature - prevTemp;
                temperatureTrend = delta > 0.2 ? 'RISING' : delta < -0.2 ? 'FALLING' : 'STABLE';
                if (species && Math.abs(delta) >= species.waterPreferences.rapidRiseTempDelta) {
                  rapidRise = delta > 0;
                  rapidRiseDelta = delta;
                }
              }
            }

            if (history.length > 0 && reading.dissolvedOxygen !== null) {
              const prevDO = history[history.length - 1]?.dissolvedOxygen;
              if (prevDO !== null && prevDO !== undefined) {
                const delta = reading.dissolvedOxygen - prevDO;
                doTrend = delta > 0.1 ? 'RISING' : delta < -0.1 ? 'FALLING' : 'STABLE';
              }
            }

            const newWater: WaterState = {
              current: reading,
              history: trimmedHistory,
              trend: { temperatureTrend, doTrend, rapidRise, rapidRiseDelta },
              activity: p.water?.activity ?? 'NORMAL',
            };

            return { ...p, water: newWater, demoUpdatedAt: state.demoClock };
          });

          const refreshedPonds = refreshPondStatuses(newPonds, state.inventoryBatches, demoNow);
          const alerts = generateAlerts({ ponds: refreshedPonds, batches: state.inventoryBatches, demoNow, existingAlerts: state.alerts });
          return { ponds: refreshedPonds, alerts };
        });
      },

      updateWaterActivity(pondId: string, activity: FishActivity) {
        set(state => {
          const newPonds = state.ponds.map(p => {
            if (p.id !== pondId || !p.water) return p;
            return { ...p, water: { ...p.water, activity }, demoUpdatedAt: state.demoClock };
          });
          const demoNow = computeDemoNow(state);
          const refreshedPonds = refreshPondStatuses(newPonds, state.inventoryBatches, demoNow);
          const alerts = generateAlerts({ ponds: refreshedPonds, batches: state.inventoryBatches, demoNow, existingAlerts: state.alerts });
          return { ponds: refreshedPonds, alerts };
        });
      },

      // ---- MEAL LOGGING ----

      logMeal({ pondId, mealId, outcome, actualQuantityKg, uneatenQuantityKg, feedingResponse, consumptionTimeMinutes, surfaceActivity, behaviourNotes, notes }) {
        const state = get();
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) throw new Error(`Pond ${pondId} not found`);

        const meal = pond.feedingRecords.find(m => m.id === mealId);
        if (!meal) throw new Error(`Meal ${mealId} not found`);
        if (meal.confirmed || meal.status === 'COMPLETED' || meal.status === 'ADJUSTED' || meal.status === 'SKIPPED') {
          get().addToast({ type: 'error', title: 'Meal Already Recorded', message: 'This meal has already been recorded.', duration: 4000 });
          return false;
        }

        const waterDecision = pond.speciesId && pond.water
          ? deriveFeedingDecision(pond, state.inventoryBatches, computeDemoNow(state))
          : null;
        const waterPreferences = pond.speciesId ? SPECIES_CONFIGS[pond.speciesId]?.waterPreferences : undefined;
        const criticalOxygen = (pond.water?.current?.dissolvedOxygen ?? Number.POSITIVE_INFINITY) < Math.max(waterPreferences?.criticalDOMin ?? 0, CRITICAL_DO_THRESHOLD);
        if (
          outcome !== 'SKIPPED' &&
          (criticalOxygen || (state.isReassessing && state.reassessingPondId === pondId) ||
            waterDecision?.decisionState === 'FEEDING_ON_HOLD' ||
            waterDecision?.decisionState === 'STOP_FEEDING')
        ) {
          get().addToast({
            type: 'error',
            title: 'Feeding Safely Held',
            message: 'Critical water conditions or reassessment prevent feed release. Check aeration and remeasure before feeding.',
            duration: 5000,
          });
          return false;
        }

        const demoNow = computeDemoNow(state);

        // Determine final status and quantity
        let finalStatus: MealStatus = 'COMPLETED';
        let finalQty = actualQuantityKg ?? meal.plannedQuantityKg;
        let deductQty: number | null = null;

        if (outcome === 'SKIPPED') {
          finalStatus = 'SKIPPED';
          deductQty = null; // No deduction for skip
          finalQty = 0;
        } else if (outcome === 'PENDING') {
          finalStatus = 'IN_PROGRESS';
          deductQty = null; // No deduction yet
        } else if (outcome === 'GIVEN' || outcome === 'REDUCED') {
          finalStatus = outcome === 'REDUCED' ? 'ADJUSTED' : 'COMPLETED';
          deductQty = finalQty;
        }

        // Validate stock if deducting
        if (deductQty !== null && (!Number.isFinite(deductQty) || deductQty < 0)) {
          get().addToast({ type: 'error', title: 'Invalid Feed Quantity', message: 'Enter a valid non-negative quantity.', duration: 4000 });
          return false;
        }

        const allocations: Array<{ batch: InventoryBatch; quantityKg: number }> = [];
        if (deductQty !== null && deductQty > 0) {
          const sourceBatch = state.inventoryBatches.find(b => b.id === meal.assignedFeedBatchId);
          const feedItemId = meal.assignedFeedItemId ?? sourceBatch?.feedItemId;
          const feedItem = feedItemId && state.feedItems.find(item => item.id === feedItemId);
          const growthStage = pond.growthStage;
          if (!sourceBatch || !feedItem) {
            get().addToast({ type: 'error', title: 'Feed Product Unavailable', message: 'Assign a valid feed product to this pond before recording the meal.', duration: 5000 });
            return false;
          }
          if (
            (pond.speciesId && !feedItem.compatibleSpeciesIds.includes(pond.speciesId)) ||
            (growthStage && !feedItem.compatibleStages.includes(growthStage))
          ) {
            get().addToast({ type: 'error', title: 'Incompatible Feed', message: `${feedItem.name} is not configured for this pond's species or growth stage.`, duration: 5000 });
            return false;
          }

          const pondNames = [pond.id, pond.name];
          const eligibleBatches = state.inventoryBatches
            .filter(batch => {
              const expiry = batch.expiryDate ? new Date(batch.expiryDate) : null;
              const expired = expiry !== null && demoNow >= expiry;
              const assignedElsewhere = batch.assignedPondIds.length > 0 &&
                !batch.assignedPondIds.some(id => pondNames.includes(id));
              return batch.feedItemId === feedItem.id &&
                batch.quantityKg > 0 &&
                !expired &&
                !batch.archived &&
                !batch.quarantined &&
                !batch.spoiled &&
                !assignedElsewhere;
            })
            .sort((left, right) =>
              (left.expiryDate || '9999-12-31').localeCompare(right.expiryDate || '9999-12-31') ||
              left.id.localeCompare(right.id)
            );
          const eligibleTotal = eligibleBatches.reduce((sum, batch) => sum + batch.quantityKg, 0);
          if (eligibleTotal + Number.EPSILON < deductQty) {
            get().addToast({
              type: 'error',
              title: 'Insufficient Compatible Feed',
              message: `${eligibleTotal.toFixed(1)} kg of non-expired compatible feed is available; ${deductQty.toFixed(1)} kg is required.`,
              duration: 5000,
            });
            return false;
          }

          let remaining = deductQty;
          for (const batch of eligibleBatches) {
            if (remaining <= 0) break;
            const quantityKg = Math.min(batch.quantityKg, remaining);
            allocations.push({ batch, quantityKg });
            remaining = Math.max(0, remaining - quantityKg);
          }
        }

        // Update meal record
        const updatedMeal: FeedingRecord = {
          ...meal,
          status: finalStatus,
          confirmed: outcome !== 'PENDING',
          actualQuantityKg: outcome !== 'PENDING' ? finalQty : null,
          uneatenQuantityKg: uneatenQuantityKg ?? null,
          feedingResponse: feedingResponse ?? null,
          consumptionTimeMinutes: consumptionTimeMinutes ?? null,
          surfaceActivity: surfaceActivity ?? null,
          behaviourNotes: behaviourNotes ?? '',
          notes: notes ?? '',
          adjustmentReason: outcome === 'REDUCED' ? notes ?? '' : null,
          demoUpdatedAt: demoNow.toISOString(),
        };

        // Deduct inventory
        let newBatches = state.inventoryBatches;
        let newTransactions = state.inventoryTransactions;

        if (allocations.length > 0) {
          const quantitiesByBatch = new Map(allocations.map(allocation => [allocation.batch.id, allocation.quantityKg]));
          newBatches = state.inventoryBatches.map(batch => {
            const quantityKg = quantitiesByBatch.get(batch.id);
            return quantityKg === undefined
              ? batch
              : recomputeInventoryBatch({ ...batch, quantityKg: batch.quantityKg - quantityKg }, demoNow);
          });
          const transactions = allocations.map(({ batch, quantityKg }): InventoryTransaction => {
            const quantityAfterKg = batch.quantityKg - quantityKg;
            return {
              id: generateId('txn'),
              batchId: batch.id,
              pondId,
              mealId,
              type: 'ISSUE',
              quantityKg: -quantityKg,
              quantityAfterKg,
              reason: `Feed issued for meal - ${pond.name}`,
              notes: notes ?? '',
              demoTimestamp: demoNow.toISOString(),
            };
          });
          newTransactions = [...state.inventoryTransactions, ...transactions];
        }

        // Update pond
        let newPonds = state.ponds.map(p => {
          if (p.id !== pondId) return p;
          const newRecords = p.feedingRecords.map(m => m.id === mealId ? updatedMeal : m);
          return { ...p, feedingRecords: newRecords, demoUpdatedAt: demoNow.toISOString() };
        });
        if (feedingResponse === 'POOR' || feedingResponse === 'REFUSED') {
          const updatedPond = newPonds.find(p => p.id === pondId);
          if (updatedPond) {
            const recommendation = deriveFeedingDecision(updatedPond, newBatches, demoNow).adjustedQuantityKg;
            newPonds = newPonds.map(p => p.id !== pondId ? p : {
              ...p,
              feedingRecords: p.feedingRecords.map(record =>
                !record.confirmed ? { ...record, recommendedQuantityKg: recommendation } : record
              ),
            });
          }
        }
        newPonds = refreshPondStatuses(newPonds, newBatches, demoNow);

        // Refresh alerts
        const alerts = generateAlerts({ ponds: newPonds, batches: newBatches, demoNow, existingAlerts: state.alerts });

        set({ ponds: newPonds, inventoryBatches: newBatches, inventoryTransactions: newTransactions, alerts });

        get().addToast({
          type: 'success',
          title: outcome === 'SKIPPED' ? 'Meal Skipped' : outcome === 'PENDING' ? 'Meal In Progress' : 'Meal Logged Successfully',
          message: outcome === 'GIVEN' ? `${finalQty.toFixed(1)} kg fed to ${pondId}.` : undefined,
          duration: 3000,
        });
        return true;
      },

      // ---- GROWTH ----

      addGrowthRecord(pondId: string, record: Omit<GrowthRecord, 'id' | 'demoCreatedAt'>) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;

        const newRecord: GrowthRecord = {
          ...record,
          id: generateId('gr'),
          demoCreatedAt: demoNow.toISOString(),
        };

        // Recalculate live stock if mortality provided
        const liveStock = pond.estimatedLiveStockCount ?? pond.originalStockCount ?? 0;
        const newBiomass = calculateBiomass(liveStock, record.meanWeightGrams);

        const newPonds = state.ponds.map(p => {
          if (p.id !== pondId) return p;
          return {
            ...p,
            growthRecords: [...p.growthRecords, newRecord],
            meanWeightGrams: record.meanWeightGrams,
            biomassKg: newBiomass,
            demoUpdatedAt: demoNow.toISOString(),
          };
        });

        const alerts = generateAlerts({ ponds: newPonds, batches: state.inventoryBatches, demoNow, existingAlerts: state.alerts });
        set({ ponds: refreshPondStatuses(newPonds, state.inventoryBatches, demoNow), alerts });

        get().addToast({ type: 'success', title: 'Growth Record Added', message: `Mean weight updated to ${record.meanWeightGrams}g. Biomass: ${newBiomass.toFixed(1)} kg.`, duration: 3000 });
      },

      // ---- MORTALITY ----

      addMortalityRecord(pondId: string, record: Omit<MortalityRecord, 'id' | 'demoCreatedAt'>) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;

        const newRecord: MortalityRecord = {
          ...record,
          id: generateId('mort'),
          demoCreatedAt: demoNow.toISOString(),
        };

        const allMortality = [...(pond.mortalityRecords ?? []), newRecord];
        const newLiveStock = calculateLiveStock(
          pond.originalStockCount ?? 0,
          allMortality
        );
        const newBiomass = calculateBiomass(newLiveStock, pond.meanWeightGrams ?? 0);

        const newPonds = state.ponds.map(p => {
          if (p.id !== pondId) return p;
          return {
            ...p,
            mortalityRecords: allMortality,
            estimatedLiveStockCount: newLiveStock,
            biomassKg: newBiomass,
            demoUpdatedAt: demoNow.toISOString(),
          };
        });

        const refreshedPonds = refreshPondStatuses(newPonds, state.inventoryBatches, demoNow);
        const alerts = generateAlerts({ ponds: refreshedPonds, batches: state.inventoryBatches, demoNow, existingAlerts: state.alerts });
        set({ ponds: refreshedPonds, alerts });

        get().addToast({ type: 'success', title: 'Mortality Recorded', message: `${record.count} fish. Live stock updated to ${newLiveStock.toLocaleString()}.`, duration: 3000 });
      },

      // ---- INVENTORY ----

      addInventoryBatch(batch) {
        const state = get();
        const demoNow = computeDemoNow(state);
        if (!batch.sku.trim() || !Number.isFinite(batch.quantityKg) || batch.quantityKg <= 0 ||
          state.inventoryBatches.some(existing => existing.sku.toLowerCase() === batch.sku.trim().toLowerCase())) {
          get().addToast({ type: 'error', title: 'Invalid Batch', message: 'Enter a unique batch number and a quantity greater than zero.', duration: 4000 });
          return false;
        }
        const computed = recomputeInventoryBatch(
          {
            ...batch,
            id: generateId('batch'),
            demoCreatedAt: demoNow.toISOString(),
            demoUpdatedAt: demoNow.toISOString(),
            isExpired: false,
            isLowStock: false,
            isNearExpiry: false,
            isAvailable: true,
          },
          demoNow
        );
        const newBatches = [...state.inventoryBatches, computed];
        const transaction: InventoryTransaction = {
          id: generateId('txn'),
          batchId: computed.id,
          pondId: null,
          mealId: null,
          type: 'INITIAL_RECEIPT',
          quantityKg: computed.quantityKg,
          quantityAfterKg: computed.quantityKg,
          reason: 'Initial stock receipt',
          notes: computed.notes,
          demoTimestamp: demoNow.toISOString(),
        };
        const alerts = generateAlerts({ ponds: state.ponds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({ inventoryBatches: newBatches, inventoryTransactions: [...state.inventoryTransactions, transaction], alerts });
        get().addToast({ type: 'success', title: 'Batch Added', message: `${batch.feedItemName} added to inventory.`, duration: 3000 });
        return true;
      },

      updateInventoryBatch(batchId: string, updates: Partial<Omit<InventoryBatch, 'quantityKg' | 'isExpired' | 'isLowStock' | 'isNearExpiry' | 'isAvailable' | 'demoCreatedAt' | 'demoUpdatedAt'>>) {
        const state = get();
        const currentBatch = state.inventoryBatches.find(batch => batch.id === batchId);
        if (!currentBatch || (updates.sku !== undefined && state.inventoryBatches.some(batch =>
          batch.id !== batchId && batch.sku.toLowerCase() === updates.sku?.trim().toLowerCase()
        ))) {
          get().addToast({ type: 'error', title: currentBatch ? 'Batch Number Already Exists' : 'Batch not found', message: currentBatch ? 'Use a unique batch number.' : undefined, duration: 4000 });
          return false;
        }
        const demoNow = computeDemoNow(state);
        const newBatches = state.inventoryBatches.map(b => {
          if (b.id !== batchId) return b;
          return recomputeInventoryBatch({ ...b, ...updates }, demoNow);
        });
        const refreshedPonds = refreshPondStatuses(state.ponds, newBatches, demoNow);
        const alerts = generateAlerts({ ponds: refreshedPonds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({ ponds: refreshedPonds, inventoryBatches: newBatches, alerts });
        get().addToast({ type: 'success', title: 'Batch Details Updated', message: `${currentBatch.sku} saved.`, duration: 3000 });
        return true;
      },

      deleteInventoryBatch(batchId: string) {
        const state = get();
        const hasHistory = state.inventoryTransactions.some(transaction => transaction.batchId === batchId) ||
          state.ponds.some(pond => pond.assignedFeedBatchId === batchId ||
            pond.feedingRecords.some(meal => meal.assignedFeedBatchId === batchId));
        if (hasHistory) {
          get().addToast({ type: 'error', title: 'Batch Has History', message: 'Archive this batch instead so its stock movement history is preserved.', duration: 5000 });
          return;
        }
        const newBatches = state.inventoryBatches.filter(b => b.id !== batchId);
        const demoNow = computeDemoNow(state);
        const alerts = generateAlerts({ ponds: state.ponds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({ inventoryBatches: newBatches, alerts });
        get().addToast({ type: 'success', title: 'Batch Deleted', duration: 2000 });
      },

      recordStockUsage({ batchId, quantityKg, pondId, mealId, reason, notes }) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const batch = state.inventoryBatches.find(b => b.id === batchId);
        
        if (!batch) {
          get().addToast({ type: 'error', title: 'Batch not found', duration: 3000 });
          return false;
        }

        if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
          get().addToast({ type: 'error', title: 'Invalid Quantity', message: 'Enter a quantity greater than zero.', duration: 4000 });
          return false;
        }
        if (quantityKg > batch.quantityKg) {
          get().addToast({ type: 'error', title: 'Insufficient Stock', message: `Only ${batch.quantityKg.toFixed(1)} kg available.`, duration: 5000 });
          return false;
        }

        const quantityAfterKg = batch.quantityKg - quantityKg;
        const newBatches = state.inventoryBatches.map(b => {
          if (b.id !== batchId) return b;
          return recomputeInventoryBatch({ ...b, quantityKg: quantityAfterKg }, demoNow);
        });

        const transaction: InventoryTransaction = {
          id: generateId('txn'),
          batchId,
          pondId: pondId ?? null,
          mealId: mealId ?? null,
          type: 'LOSS',
          quantityKg: -quantityKg,
          quantityAfterKg,
          reason,
          notes: notes ?? '',
          demoTimestamp: demoNow.toISOString(),
        };

        const alerts = generateAlerts({ ponds: state.ponds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({ inventoryBatches: newBatches, inventoryTransactions: [...state.inventoryTransactions, transaction], alerts });
        get().addToast({ type: 'success', title: 'Stock Usage Recorded', message: `${quantityKg.toFixed(1)} kg deducted.`, duration: 3000 });
        return true;
      },

      receiveInventoryStock({ batchId, quantityKg, reason, notes, receivedAt }) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const batch = state.inventoryBatches.find(item => item.id === batchId);
        if (!batch) {
          get().addToast({ type: 'error', title: 'Batch not found', duration: 3000 });
          return false;
        }
        if (!Number.isFinite(quantityKg) || quantityKg <= 0 || !reason.trim() ||
          (receivedAt !== undefined && Number.isNaN(new Date(receivedAt).getTime()))) {
          get().addToast({ type: 'error', title: 'Invalid Receipt', message: 'Enter a positive quantity and receipt reference.', duration: 4000 });
          return false;
        }
        const quantityAfterKg = batch.quantityKg + quantityKg;
        const newBatches = state.inventoryBatches.map(item => item.id === batchId
          ? recomputeInventoryBatch({ ...item, quantityKg: quantityAfterKg }, demoNow)
          : item);
        const transaction: InventoryTransaction = {
          id: generateId('txn'),
          batchId,
          pondId: null,
          mealId: null,
          type: 'RECEIPT',
          quantityKg,
          quantityAfterKg,
          reason,
          notes: notes ?? '',
          demoTimestamp: receivedAt ? new Date(receivedAt).toISOString() : demoNow.toISOString(),
        };
        const alerts = generateAlerts({ ponds: state.ponds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({ inventoryBatches: newBatches, inventoryTransactions: [...state.inventoryTransactions, transaction], alerts });
        get().addToast({ type: 'success', title: 'Stock Receipt Recorded', message: `${quantityKg.toFixed(1)} kg added to ${batch.sku}.`, duration: 3000 });
        return true;
      },

      adjustInventoryStock({ batchId, quantityKg, reason, notes }) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const batch = state.inventoryBatches.find(item => item.id === batchId);
        if (!batch) {
          get().addToast({ type: 'error', title: 'Batch not found', duration: 3000 });
          return false;
        }
        if (!Number.isFinite(quantityKg) || quantityKg === 0 || !reason.trim()) {
          get().addToast({ type: 'error', title: 'Invalid Adjustment', message: 'Enter a non-zero quantity and a reason.', duration: 4000 });
          return false;
        }
        const quantityAfterKg = batch.quantityKg + quantityKg;
        if (quantityAfterKg < 0) {
          get().addToast({ type: 'error', title: 'Adjustment Exceeds Stock', message: `Only ${batch.quantityKg.toFixed(1)} kg is available.`, duration: 5000 });
          return false;
        }
        const newBatches = state.inventoryBatches.map(item => item.id === batchId
          ? recomputeInventoryBatch({ ...item, quantityKg: quantityAfterKg }, demoNow)
          : item);
        const transaction: InventoryTransaction = {
          id: generateId('txn'),
          batchId,
          pondId: null,
          mealId: null,
          type: quantityKg > 0 ? 'CORRECTION' : 'LOSS',
          quantityKg,
          quantityAfterKg,
          reason,
          notes: notes ?? '',
          demoTimestamp: demoNow.toISOString(),
        };
        const alerts = generateAlerts({ ponds: state.ponds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({ inventoryBatches: newBatches, inventoryTransactions: [...state.inventoryTransactions, transaction], alerts });
        get().addToast({ type: 'success', title: 'Stock Adjustment Recorded', message: `Stock updated to ${quantityAfterKg.toFixed(1)} kg.`, duration: 3000 });
        return true;
      },

      assignBatchToPond(batchId: string, pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const newBatches = state.inventoryBatches.map(b => {
          if (b.id !== batchId) return b;
          const ids = [...new Set([...b.assignedPondIds, pondId])];
          return recomputeInventoryBatch({ ...b, assignedPondIds: ids }, demoNow);
        });
        const selectedBatch = newBatches.find(batch => batch.id === batchId);
        const newPonds = state.ponds.map(pond => pond.id !== pondId || !selectedBatch ? pond : {
          ...pond,
          assignedFeedBatchId: batchId,
          feedingRecords: pond.feedingRecords.map(meal => meal.confirmed ? meal : {
            ...meal,
            assignedFeedBatchId: batchId,
            assignedFeedItemId: selectedBatch.feedItemId,
          }),
          demoUpdatedAt: demoNow.toISOString(),
        });
        const alerts = generateAlerts({ ponds: newPonds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({ ponds: newPonds, inventoryBatches: newBatches, alerts });
      },

      unassignBatchFromPond(batchId: string, pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const newBatches = state.inventoryBatches.map(b => {
          if (b.id !== batchId) return b;
          const ids = b.assignedPondIds.filter(id => id !== pondId);
          return recomputeInventoryBatch({ ...b, assignedPondIds: ids }, demoNow);
        });
        const newPonds = state.ponds.map(pond => pond.id !== pondId || pond.assignedFeedBatchId !== batchId ? pond : {
          ...pond,
          assignedFeedBatchId: null,
          feedingRecords: pond.feedingRecords.map(meal => meal.confirmed || meal.assignedFeedBatchId !== batchId ? meal : {
            ...meal,
            assignedFeedBatchId: null,
            assignedFeedItemId: null,
          }),
          demoUpdatedAt: demoNow.toISOString(),
        });
        const alerts = generateAlerts({ ponds: newPonds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({ ponds: newPonds, inventoryBatches: newBatches, alerts });
      },

      // ---- ALERTS ----

      markAlertRead(alertId: string) {
        set(state => ({
          alerts: state.alerts.map(a => a.id === alertId ? { ...a, readState: 'READ' } : a),
        }));
      },

      markAllAlertsRead() {
        set(state => ({
          alerts: state.alerts.map(a => ({ ...a, readState: 'READ' })),
        }));
      },

      resolveAlert(alertId: string, resolvedBy = 'user') {
        const state = get();
        set({
          alerts: state.alerts.map(a => a.id === alertId ? {
            ...a,
            status: 'RESOLVED',
            readState: 'READ',
            resolvedAt: state.demoClock,
            resolvedBy,
            demoUpdatedAt: state.demoClock,
          } : a),
        });
      },

      dismissAlert(alertId: string, reason = '') {
        const state = get();
        set({
          alerts: state.alerts.map(a => a.id === alertId ? {
            ...a,
            status: 'DISMISSED',
            readState: 'READ',
            dismissedAt: state.demoClock,
            dismissedReason: reason,
            demoUpdatedAt: state.demoClock,
          } : a),
        });
      },

      refreshAlerts() {
        const state = get();
        const demoNow = computeDemoNow(state);
        const alerts = generateAlerts({ ponds: state.ponds, batches: state.inventoryBatches, demoNow, existingAlerts: state.alerts });
        set({ alerts });
      },

      // ---- UI ----

      addToast(toast: Omit<ToastMessage, 'id'>) {
        const id = generateId('toast');
        const newToast = { ...toast, id };
        set(state => ({ toasts: [...state.toasts, newToast] }));
        // Auto-remove after duration
        setTimeout(() => get().removeToast(id), toast.duration ?? 4000);
      },

      removeToast(id: string) {
        set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
      },

      setAlertDrawerOpen(open: boolean) {
        set({ alertDrawerOpen: open });
      },

      setDemoControlsOpen(open: boolean) {
        set({ demoControlsOpen: open });
      },

      // ---- DEMO SCENARIOS ----

      simulateHealthyConditions(pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;

        const reading: WaterReading = {
          id: generateId('wr'),
          pondId,
          temperature: 27.0,
          dissolvedOxygen: 6.2,
          pH: 7.4,
          demoTimestamp: demoNow.toISOString(),
          quality: 'SIMULATED',
        };
        const nextMeal = pond.feedingRecords.find(m => !m.confirmed && m.status !== 'COMPLETED' && m.status !== 'SKIPPED');
        if (nextMeal) {
          const scheduleTime = `${String(demoNow.getHours()).padStart(2, '0')}:${String(demoNow.getMinutes()).padStart(2, '0')}`;
          set(current => ({
            ponds: current.ponds.map(p => p.id !== pondId ? p : {
              ...p,
              mealSchedule: p.mealSchedule.map(entry => entry.id === nextMeal.mealScheduleEntryId
                ? { ...entry, scheduledTime: scheduleTime }
                : entry),
              feedingRecords: p.feedingRecords.map(record => record.id === nextMeal.id
                ? { ...record, scheduledTime: demoNow.toISOString() }
                : record),
            }),
          }));
        }
        get().addWaterReading(pondId, reading);
        get().updateWaterActivity(pondId, 'NORMAL');
        get().setDemoTime(state.demoClock);
        get().addToast({ type: 'success', title: 'Normal feeding scenario active', message: 'Healthy simulated water conditions and a ready scheduled meal are in place.', duration: 4000 });
      },

      simulateRapidTemperatureRise(pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;

        const baselineTemp = createSeedPonds(new Date(DEMO_INITIAL_TIME)).find(p => p.id === pondId)?.water?.current?.temperature ?? 27.0;
        const baselineWater = createSeedPonds(new Date(DEMO_INITIAL_TIME)).find(p => p.id === pondId)?.water?.current;
        const reading: WaterReading = {
          id: generateId('wr'),
          pondId,
          temperature: baselineTemp + 3,
          dissolvedOxygen: baselineWater?.dissolvedOxygen ?? 5.5,
          pH: baselineWater?.pH ?? 7.4,
          demoTimestamp: demoNow.toISOString(),
          quality: 'SIMULATED',
        };
        get().addWaterReading(pondId, reading);
        set(current => {
          const newPonds = current.ponds.map(p => p.id !== pondId || !p.water ? p : {
            ...p,
            water: { ...p.water, trend: { ...p.water.trend, temperatureTrend: 'RISING' as const, rapidRise: true, rapidRiseDelta: 3 } },
          });
          const alerts = generateAlerts({ ponds: newPonds, batches: current.inventoryBatches, demoNow, existingAlerts: current.alerts });
          return { ponds: refreshPondStatuses(newPonds, current.inventoryBatches, demoNow), alerts };
        });
        get().addToast({ type: 'warning', title: 'Rapid temperature rise simulated', message: `Temperature is now ${reading.temperature?.toFixed(1)}°C (+3.0°C). Monitor aeration and feeding.`, duration: 4000 });
      },

      simulateFallingOxygen(pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;

        const baselineWater = createSeedPonds(new Date(DEMO_INITIAL_TIME)).find(p => p.id === pondId)?.water?.current;
        const reading: WaterReading = {
          id: generateId('wr'),
          pondId,
          temperature: baselineWater?.temperature ?? 27.0,
          dissolvedOxygen: 3.2,
          pH: baselineWater?.pH ?? 7.4,
          demoTimestamp: demoNow.toISOString(),
          quality: 'SIMULATED',
        };
        get().addWaterReading(pondId, reading);
        get().addToast({ type: 'error', title: 'Critical low oxygen simulated', message: 'Dissolved oxygen is 3.2 mg/L. Feeding is held; check aeration immediately.', duration: 4500 });
      },

      simulateCombinedCritical(pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;

        const reading: WaterReading = {
          id: generateId('wr'),
          pondId,
          temperature: (pond.speciesId ? SPECIES_CONFIGS[pond.speciesId]?.waterPreferences.criticalTempMax ?? 31 : 31) + 1,
          dissolvedOxygen: Math.max(0, (pond.speciesId ? SPECIES_CONFIGS[pond.speciesId]?.waterPreferences.criticalDOMin ?? 2 : 2) - 0.2),
          pH: 7.4,
          demoTimestamp: demoNow.toISOString(),
          quality: 'SIMULATED',
        };
        get().addWaterReading(pondId, reading);
        get().updateWaterActivity(pondId, 'LETHARGIC');
        set({ isReassessing: false, reassessingPondId: null, reassessingUntil: null });
        get().addToast({ type: 'error', title: 'Combined environmental stress simulated', message: 'Critical heat, low oxygen, and lethargic activity require immediate aeration and a feeding hold.', duration: 4500 });
      },

      simulateRecovery(pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;

        const preferences = pond.speciesId ? SPECIES_CONFIGS[pond.speciesId]?.waterPreferences : undefined;
        const currentDo = pond.water?.current?.dissolvedOxygen ?? 3.2;
        const nextDo = Math.min(
          preferences?.fullFeedingDOMin ?? 5,
          Math.max(currentDo + 1, (preferences?.criticalDOMin ?? 2) + 0.2)
        );
        const reading: WaterReading = {
          id: generateId('wr'),
          pondId,
          temperature: Math.min(pond.water?.current?.temperature ?? 28.5, preferences?.preferredTempMax ?? 30),
          dissolvedOxygen: nextDo,
          pH: 7.4,
          demoTimestamp: demoNow.toISOString(),
          quality: 'SIMULATED',
        };
        get().addWaterReading(pondId, reading);
        get().updateWaterActivity(pondId, 'NORMAL');
        const until = new Date(demoNow.getTime() + 15 * 60000).toISOString();
        set(state => ({
          isReassessing: true,
          reassessingPondId: pondId,
          reassessingUntil: until,
          ponds: state.ponds.map(p => p.id === pondId ? { ...p, decisionState: 'REASSESSING', pondGateStatus: 'ON_HOLD' } : p),
        }));
        get().addToast({
          type: 'info',
          title: 'Aeration recovery simulated',
          message: `DO improved to ${nextDo.toFixed(1)} mg/L. Feeding remains on hold for reassessment until ${new Date(until).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`,
          duration: 5000,
        });
      },

      makeReadingsStale(pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const staleTime = new Date(demoNow.getTime() - 45 * 60000).toISOString(); // 45 min ago

        const newPonds = state.ponds.map(p => {
          if (p.id !== pondId || !p.water?.current) return p;
          return {
            ...p,
            water: {
              ...p.water,
              current: { ...p.water.current, demoTimestamp: staleTime, quality: 'STALE' as const },
            },
            demoUpdatedAt: state.demoClock,
          };
        });

        const refreshedPonds = refreshPondStatuses(newPonds, state.inventoryBatches, demoNow);
        const alerts = generateAlerts({ ponds: refreshedPonds, batches: state.inventoryBatches, demoNow, existingAlerts: state.alerts });
        set({ ponds: refreshedPonds, alerts });
        get().addToast({ type: 'warning', title: 'Stale telemetry simulated', message: 'The last reading is 45 minutes old. Remeasure before feeding.', duration: 4000 });
      },

      sendImplausibleReading(pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);

        const reading: WaterReading = {
          id: generateId('wr'),
          pondId,
          temperature: 99.9, // implausible
          dissolvedOxygen: -5.0, // implausible
          pH: 7.4,
          demoTimestamp: demoNow.toISOString(),
          quality: 'IMPLAUSIBLE',
        };
        get().addWaterReading(pondId, reading);
        get().addToast({ type: 'warning', title: 'Demo: Implausible reading sent', duration: 3000 });
      },

      triggerOverdueMeal(pondId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        const pond = state.ponds.find(p => p.id === pondId);
        if (!pond) return;

        // Find first unconfirmed meal and make it overdue by setting time 40 min in the past
        const nextMeal = pond.feedingRecords
          .filter(m => !m.confirmed && m.status !== 'COMPLETED' && m.status !== 'SKIPPED')
          .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())[0];
        if (!nextMeal) {
          get().addToast({ type: 'error', title: 'No unlogged meal available', message: `${pond.name} has no scheduled meal to mark overdue.`, duration: 4000 });
          return;
        }
        const overdueAtMs = new Date(nextMeal.scheduledTime).getTime() + (FEEDING_WINDOW_CONFIG.overdueAfterMinutes + 1) * 60000;
        const targetTime = new Date(Math.max(demoNow.getTime(), overdueAtMs));
        if (targetTime.getTime() > demoNow.getTime()) get().setDemoTime(targetTime.toISOString());
        get().addToast({ type: 'warning', title: 'Overdue meal scenario active', message: `${pond.name} has an unlogged scheduled meal past its grace period.`, duration: 4000 });
      },

      simulateLowStock(batchId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        if (!state.inventoryBatches.some(batch => batch.id === batchId)) {
          get().addToast({ type: 'error', title: 'Feed batch not found', message: 'Select a valid assigned feed batch.', duration: 4000 });
          return;
        }
        const newBatches = state.inventoryBatches.map(b => {
          if (b.id !== batchId) return b;
          return recomputeInventoryBatch({ ...b, quantityKg: 5 }, demoNow);
        });
        const alerts = generateAlerts({ ponds: state.ponds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({ inventoryBatches: newBatches, alerts });
        get().addToast({ type: 'warning', title: 'Demo: Low stock simulated (5 kg)', duration: 3000 });
      },

      restoreStock(batchId: string) {
        const state = get();
        const demoNow = computeDemoNow(state);
        // Find seed quantity
        const qty = createSeedInventoryBatches(demoNow).find(b => b.id === batchId)?.quantityKg;
        if (qty === undefined || !state.inventoryBatches.some(b => b.id === batchId)) {
          get().addToast({ type: 'error', title: 'Feed batch not found', message: 'Select a valid assigned feed batch.', duration: 4000 });
          return;
        }
        const newBatches = state.inventoryBatches.map(b => {
          if (b.id !== batchId) return b;
          return recomputeInventoryBatch({ ...b, quantityKg: qty }, demoNow);
        });
        const alerts = generateAlerts({ ponds: state.ponds, batches: newBatches, demoNow, existingAlerts: state.alerts });
        set({
          inventoryBatches: newBatches,
          alerts,
          ...(state.activeDemoScenarioId === 'low-stock' ? { activeDemoScenarioId: null, activeDemoPondId: null } : {}),
        });
        get().addToast({ type: 'success', title: 'Feed stock restored', message: `${qty} kg restored to the selected batch.`, duration: 3500 });
      },

      runDemoScenario(scenarioId, pondId) {
        if (scenarioId === 'reset') {
          get().resetAllDemoData();
          return;
        }
        const pond = get().ponds.find(p => p.id === pondId);
        if (!pond) {
          get().addToast({ type: 'error', title: 'Pond not found', message: 'Select a valid pond before running a scenario.', duration: 4000 });
          return;
        }
        if (scenarioId === 'low-stock' && !pond.assignedFeedBatchId) {
          get().addToast({ type: 'error', title: 'No feed batch assigned', message: `Assign a feed batch to ${pond.name} before running Low Feed Stock.`, duration: 4500 });
          return;
        }
        if (
          (scenarioId === 'normal-feeding' || scenarioId === 'overdue-meal' || scenarioId === 'poor-response') &&
          !pond.feedingRecords.some(record => !record.confirmed && record.status !== 'COMPLETED' && record.status !== 'SKIPPED')
        ) {
          get().addToast({ type: 'error', title: 'No unlogged meal available', message: `Reset the demo or schedule a meal for ${pond.name} before running this scenario.`, duration: 4500 });
          return;
        }
        set({ activeDemoScenarioId: scenarioId, activeDemoPondId: pondId });
        switch (scenarioId) {
          case 'normal-feeding':
            get().simulateHealthyConditions(pondId);
            break;
          case 'temperature-rise':
            get().simulateRapidTemperatureRise(pondId);
            break;
          case 'low-oxygen':
            get().simulateFallingOxygen(pondId);
            break;
          case 'combined-stress':
            get().simulateCombinedCritical(pondId);
            break;
          case 'aeration-recovery':
            get().simulateRecovery(pondId);
            break;
          case 'overdue-meal':
            get().triggerOverdueMeal(pondId);
            break;
          case 'low-stock':
            get().simulateLowStock(pond.assignedFeedBatchId!);
            break;
          case 'poor-response': {
            const meal = pond.feedingRecords
              .filter(record => !record.confirmed && record.status !== 'COMPLETED' && record.status !== 'SKIPPED')
              .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())[0];
            if (!meal) {
              set({ activeDemoScenarioId: null, activeDemoPondId: null });
              get().addToast({ type: 'error', title: 'No unlogged meal available', message: `${pond.name} has no scheduled meal for the response simulation.`, duration: 4000 });
              return;
            }
            const available = get().inventoryBatches.find(batch => batch.id === meal.assignedFeedBatchId)?.quantityKg ?? 0;
            const quantity = Math.min(meal.recommendedQuantityKg || meal.plannedQuantityKg, available);
            if (quantity <= 0) {
              set({ activeDemoScenarioId: null, activeDemoPondId: null });
              get().addToast({ type: 'error', title: 'No feed available', message: 'Restore stock before simulating a completed meal.', duration: 4000 });
              return;
            }
            const recorded = get().logMeal({
              pondId,
              mealId: meal.id,
              outcome: 'GIVEN',
              actualQuantityKg: quantity,
              uneatenQuantityKg: Math.min(1, quantity),
              feedingResponse: 'POOR',
              consumptionTimeMinutes: 35,
              surfaceActivity: 'LOW',
              behaviourNotes: 'Simulated slow feeding with visible uneaten feed.',
              notes: 'SIH demo: simulated poor feeding response.',
            });
            if (!recorded) {
              set({ activeDemoScenarioId: null, activeDemoPondId: null });
              return;
            }
            get().addToast({ type: 'warning', title: 'Poor feeding response recorded', message: 'Meal history, remaining stock, and subsequent ration recommendations were updated.', duration: 4500 });
            break;
          }
          case 'stale-telemetry':
            get().makeReadingsStale(pondId);
            break;
        }
      },

      resetAllDemoData() {
        const initial = buildInitialState();
        set({ ...initial });
        get().addToast({ type: 'success', title: 'Demo reset complete', message: 'All ponds, telemetry, meals, inventory, alerts, and the simulation clock are back to baseline.', duration: 4500 });
      },

      // ---- INTERNAL ----

      _recomputePondStates() {
        const state = get();
        const demoNow = computeDemoNow(state);
        const newPonds = state.ponds.map(p => ({
          ...p,
          feedingRecords: recomputeMealStatuses(p, demoNow),
        }));
        set({ ponds: refreshPondStatuses(newPonds, state.inventoryBatches, demoNow) });
      },

      _refreshBatchStatus() {
        const state = get();
        const demoNow = computeDemoNow(state);
        const newBatches = state.inventoryBatches.map(b => recomputeInventoryBatch(b, demoNow));
        set({ inventoryBatches: newBatches });
      },
    }),
    {
      name: 'aquafeed-pond-pilot-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate(persistedState: any, version: number) {
        if (version === 0 || !persistedState?.stateVersion) {
          // Stale or incompatible state - reset to seed
          return buildInitialState();
        }
        return persistedState as AppState;
      },
      partialize: (state) => ({
        stateVersion: state.stateVersion,
        demoClock: state.demoClock,
        farmName: state.farmName,
        ponds: state.ponds,
        selectedPondId: state.selectedPondId,
        feedItems: state.feedItems,
        inventoryBatches: state.inventoryBatches,
        inventoryTransactions: state.inventoryTransactions,
        alerts: state.alerts,
        isReassessing: state.isReassessing,
        reassessingPondId: state.reassessingPondId,
        reassessingUntil: state.reassessingUntil,
        activeDemoScenarioId: state.activeDemoScenarioId,
        activeDemoPondId: state.activeDemoPondId,
      }),
    }
  )
);

// ========================
// SELECTORS
// ========================

export function useSelectedPond() {
  const selectedPondId = useStore(state => state.selectedPondId);
  const ponds = useStore(state => state.ponds);
  return useMemo(() => {
    if (!selectedPondId) return null;
    return ponds.find(p => p.id === selectedPondId) ?? null;
  }, [selectedPondId, ponds]);
}

export function useDemoNow() {
  const demoClock = useStore(state => state.demoClock);
  return useMemo(() => new Date(demoClock), [demoClock]);
}

export function useUnreadAlertCount() {
  return useStore(state => state.alerts.filter(a => a.status === 'ACTIVE' && a.readState === 'UNREAD').length);
}

export function useActiveAlerts() {
  const alerts = useStore(state => state.alerts);
  return useMemo(() => alerts.filter(a => a.status === 'ACTIVE'), [alerts]);
}

export function usePondAlerts(pondId: string) {
  const alerts = useStore(state => state.alerts);
  return useMemo(() => alerts.filter(a => a.status === 'ACTIVE' && (a.pondId === pondId || a.relatedPondId === pondId)), [alerts, pondId]);
}

export function usePondFeedingDecision(pondId: string) {
  const pond = useStore(state => state.ponds.find(p => p.id === pondId));
  const batches = useStore(state => state.inventoryBatches);
  const demoClock = useStore(state => state.demoClock);
  const isReassessing = useStore(state => state.isReassessing);
  const reassessingPondId = useStore(state => state.reassessingPondId);

  return useMemo(() => {
    if (!pond) return null;
    const demoNow = new Date(demoClock);

    // Check reassessing state
    if (isReassessing && reassessingPondId === pondId) {
      return {
        decisionState: 'REASSESSING' as const,
        headline: 'Reassessing Conditions',
        reason: 'Evaluating conditions after recovery before restoring feeding recommendation.',
        recommendedQuantityKg: 0,
        adjustedQuantityKg: 0,
        waterAdjustmentFraction: 0,
        waterAdjustmentReason: '',
        feedingResponseAdjustment: 0,
        baseRationKg: 0,
        unroundedRationKg: 0,
        roundedDailyRationKg: 0,
        currentMealId: null,
        currentMealTime: null,
        countdownMinutes: null,
        overdueDurationMinutes: null,
        feedType: null,
        batchId: null,
        primaryAction: 'Wait',
        secondaryAction: null,
        isReassessing: true,
        calculationSteps: [],
      };
    }

    return deriveFeedingDecision(pond, batches, demoNow);
  }, [pond, batches, demoClock, isReassessing, reassessingPondId, pondId]);
}
