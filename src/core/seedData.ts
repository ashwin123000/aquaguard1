/**
 * Seed data for the Sangli Aqua Farm demo.
 * All values are illustrative demo assumptions, not validated aquaculture recommendations.
 * See README for known discrepancies in original spec data.
 */

import type { Pond, WaterState, WaterReading, MealScheduleEntry, FeedingRecord, GrowthRecord } from '../types/pond';
import type { FeedItem, InventoryBatch, InventoryTransaction } from '../types/inventory';
import { DEMO_INITIAL_TIME } from './config';

// ========================
// FEED ITEMS (products)
// ========================

export const SEED_FEED_ITEMS: FeedItem[] = [
  {
    id: 'floating-fish-pellet',
    name: 'Floating Fish Pellet',
    pelletSizeMm: 3,
    category: 'FLOATING',
    compatibleSpeciesIds: ['nile-tilapia'],
    compatibleStages: ['fingerling', 'grow-out'],
    defaultBagSizeKg: 40,
  },
  {
    id: 'tilapia-grower-crumbles',
    name: 'Tilapia Grower Crumbles',
    pelletSizeMm: 2,
    category: 'CRUMBLE',
    // NOTE: Assigned to Catla as demo config only - not a validated recommendation
    compatibleSpeciesIds: ['nile-tilapia', 'catla', 'common-carp'],
    compatibleStages: ['fingerling', 'grow-out'],
    defaultBagSizeKg: 40,
  },
  {
    id: 'sinking-catfish-pellets',
    name: 'Sinking Catfish Pellets',
    pelletSizeMm: 5,
    category: 'SINKING',
    compatibleSpeciesIds: ['rohu', 'common-carp'],
    compatibleStages: ['grow-out'],
    defaultBagSizeKg: 40,
  },
  {
    id: 'nursery-fry-meal',
    name: 'Nursery Fry Meal',
    pelletSizeMm: 0.8,
    category: 'MEAL',
    compatibleSpeciesIds: ['nile-tilapia', 'rohu', 'catla', 'common-carp'],
    compatibleStages: ['fry'],
    defaultBagSizeKg: 40,
  },
];

// ========================
// INVENTORY BATCHES
// ========================

export function createSeedInventoryBatches(demoNow: Date): InventoryBatch[] {
  const nearExpiryThresholdMs = 30 * 24 * 60 * 60 * 1000; // 30 days

  const batches: Omit<InventoryBatch, 'isExpired' | 'isLowStock' | 'isNearExpiry' | 'isAvailable'>[] = [
    {
      id: 'batch-ffp-001',
      feedItemId: 'floating-fish-pellet',
      feedItemName: 'Floating Fish Pellet',
      sku: 'F23091',
      pelletSizeMm: 3,
      quantityKg: 48,
      expiryDate: '2026-11-24',
      minimumStockKg: 50,
      assignedPondIds: ['A1'],
      notes: '',
      demoCreatedAt: DEMO_INITIAL_TIME,
      demoUpdatedAt: DEMO_INITIAL_TIME,
    },
    {
      id: 'batch-tgc-001',
      feedItemId: 'tilapia-grower-crumbles',
      feedItemName: 'Tilapia Grower Crumbles',
      sku: 'T24018',
      pelletSizeMm: 2,
      quantityKg: 420,
      expiryDate: '2027-08-15',
      minimumStockKg: 50,
      assignedPondIds: ['A3'],
      notes: 'NOTE: Demo assignment to Catla. Not a validated nutritional recommendation.',
      demoCreatedAt: DEMO_INITIAL_TIME,
      demoUpdatedAt: DEMO_INITIAL_TIME,
    },
    {
      id: 'batch-scp-001',
      feedItemId: 'sinking-catfish-pellets',
      feedItemName: 'Sinking Catfish Pellets',
      sku: 'SC-8820',
      pelletSizeMm: 5,
      quantityKg: 180,
      // Using 2027 date per spec resolution. Original spec had conflicting dates (2025 vs 2027).
      // See README for details. This date is editable.
      expiryDate: '2027-04-12',
      minimumStockKg: 50,
      assignedPondIds: ['A2'],
      notes: 'Expiry date resolved to 2027-04-12. Original spec had conflicting values. See README.',
      demoCreatedAt: DEMO_INITIAL_TIME,
      demoUpdatedAt: DEMO_INITIAL_TIME,
    },
    {
      id: 'batch-nfr-001',
      feedItemId: 'nursery-fry-meal',
      feedItemName: 'Nursery Fry Meal',
      sku: 'NFR-104',
      pelletSizeMm: 0.8,
      quantityKg: 65,
      expiryDate: '2026-10-30',
      minimumStockKg: 50,
      assignedPondIds: [], // unassigned
      notes: '',
      demoCreatedAt: DEMO_INITIAL_TIME,
      demoUpdatedAt: DEMO_INITIAL_TIME,
    },
  ];

  return batches.map(b => {
    const expiry = b.expiryDate ? new Date(b.expiryDate) : null;
    const isExpired = expiry !== null && demoNow >= expiry;
    const msToExpiry = expiry ? expiry.getTime() - demoNow.getTime() : Number.POSITIVE_INFINITY;
    const isNearExpiry = !isExpired && msToExpiry <= nearExpiryThresholdMs;
    const isLowStock = b.quantityKg <= (b.minimumStockKg ?? 50);
    return {
      ...b,
      isExpired,
      isLowStock,
      isNearExpiry,
      isAvailable: !isExpired && b.quantityKg > 0 && !b.archived && !b.quarantined && !b.spoiled,
    };
  });
}

// ========================
// WATER STATE
// ========================

function makeWaterReading(
  id: string,
  pondId: string,
  temp: number,
  doVal: number,
  pH: number,
  minutesAgo: number = 0
): WaterReading {
  const base = new Date(DEMO_INITIAL_TIME);
  const time = new Date(base.getTime() - minutesAgo * 60000);
  return {
    id,
    pondId,
    temperature: temp,
    dissolvedOxygen: doVal,
    pH,
    demoTimestamp: time.toISOString(),
    quality: 'SIMULATED',
  };
}

function buildWaterState(
  pondId: string,
  current: WaterReading,
  history: WaterReading[],
  activity: 'HIGH' | 'NORMAL' | 'LOW' | 'LETHARGIC'
): WaterState {
  return {
    current,
    history,
    trend: {
      temperatureTrend: 'STABLE',
      doTrend: 'STABLE',
      rapidRise: false,
      rapidRiseDelta: null,
    },
    activity,
  };
}

// ========================
// MEAL SCHEDULE HELPERS
// ========================

function makeMealScheduleEntry(id: string, time: string, qty: number): MealScheduleEntry {
  return { id, scheduledTime: time, plannedQuantityKg: qty };
}

function makeCompletedMealRecord(
  id: string,
  pondId: string,
  scheduleEntryId: string,
  schedTime: string,
  plannedQty: number,
  actualQty: number,
  feedItemId: string,
  batchId: string,
  response: 'GOOD' | 'EXCELLENT' | 'FAIR' | 'POOR'
): FeedingRecord {
  const schedDate = `2026-10-08T${schedTime}:00`;
  return {
    id,
    pondId,
    mealScheduleEntryId: scheduleEntryId,
    scheduledTime: schedDate,
    status: 'COMPLETED',
    plannedQuantityKg: plannedQty,
    recommendedQuantityKg: plannedQty,
    assignedFeedItemId: feedItemId,
    assignedFeedBatchId: batchId,
    confirmed: true,
    actualQuantityKg: actualQty,
    uneatenQuantityKg: null,
    feedingResponse: response,
    consumptionTimeMinutes: 20,
    surfaceActivity: 'NORMAL',
    behaviourNotes: '',
    notes: '',
    adjustmentReason: null,
    relatedAlertIds: [],
    demoCreatedAt: schedDate,
    demoUpdatedAt: DEMO_INITIAL_TIME,
  };
}

function makeUnconfirmedMealRecord(
  id: string,
  pondId: string,
  scheduleEntryId: string,
  schedTime: string,
  plannedQty: number,
  feedItemId: string,
  batchId: string
): FeedingRecord {
  const schedDate = `2026-10-08T${schedTime}:00`;
  return {
    id,
    pondId,
    mealScheduleEntryId: scheduleEntryId,
    scheduledTime: schedDate,
    status: 'OVERDUE', // Will be evaluated dynamically
    plannedQuantityKg: plannedQty,
    recommendedQuantityKg: plannedQty,
    assignedFeedItemId: feedItemId,
    assignedFeedBatchId: batchId,
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
    demoCreatedAt: schedDate,
    demoUpdatedAt: DEMO_INITIAL_TIME,
  };
}

function makeUpcomingMealRecord(
  id: string,
  pondId: string,
  scheduleEntryId: string,
  schedTime: string,
  plannedQty: number,
  feedItemId: string,
  batchId: string
): FeedingRecord {
  const schedDate = `2026-10-08T${schedTime}:00`;
  return {
    id,
    pondId,
    mealScheduleEntryId: scheduleEntryId,
    scheduledTime: schedDate,
    status: 'UPCOMING',
    plannedQuantityKg: plannedQty,
    recommendedQuantityKg: plannedQty,
    assignedFeedItemId: feedItemId,
    assignedFeedBatchId: batchId,
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
    demoCreatedAt: schedDate,
    demoUpdatedAt: DEMO_INITIAL_TIME,
  };
}

// ========================
// GROWTH RECORDS
// ========================

function makeGrowthRecord(
  id: string,
  pondId: string,
  date: string,
  sampleSize: number,
  meanWeight: number,
  notes: string = ''
): GrowthRecord {
  return {
    id,
    pondId,
    samplingDate: date,
    sampleSize,
    meanWeightGrams: meanWeight,
    survivalEstimatePercent: null,
    mortalitySincePrevious: null,
    notes,
    demoCreatedAt: date + 'T08:00:00',
  };
}

// ========================
// POND SEED DATA
// ========================

export function createSeedPonds(demoNow: Date): Pond[] {
  // ---- A1: Nile Tilapia ----
  const a1Water = buildWaterState(
    'A1',
    makeWaterReading('w-a1-1', 'A1', 27.0, 6.1, 7.4, 5),
    [
      makeWaterReading('w-a1-2', 'A1', 26.8, 6.2, 7.3, 20),
      makeWaterReading('w-a1-3', 'A1', 26.5, 6.3, 7.3, 35),
    ],
    'NORMAL'
  );

  const a1Schedule: MealScheduleEntry[] = [
    makeMealScheduleEntry('a1-sched-1', '08:00', 6.1),
    makeMealScheduleEntry('a1-sched-2', '14:00', 6.1),
    makeMealScheduleEntry('a1-sched-3', '18:00', 6.1),
  ];

  const a1FeedingRecords: FeedingRecord[] = [
    // Morning meal completed with 5.9 kg actual
    makeCompletedMealRecord('a1-meal-1', 'A1', 'a1-sched-1', '08:00', 6.1, 5.9, 'floating-fish-pellet', 'batch-ffp-001', 'GOOD'),
    // 2 PM meal - upcoming (22 min away at 1:38 PM)
    makeUpcomingMealRecord('a1-meal-2', 'A1', 'a1-sched-2', '14:00', 6.1, 'floating-fish-pellet', 'batch-ffp-001'),
    // 6 PM meal - upcoming
    makeUpcomingMealRecord('a1-meal-3', 'A1', 'a1-sched-3', '18:00', 6.1, 'floating-fish-pellet', 'batch-ffp-001'),
  ];

  const a1GrowthRecords: GrowthRecord[] = [
    makeGrowthRecord('a1-gr-1', 'A1', '2026-09-24', 50, 32, 'Previous sample'),
    makeGrowthRecord('a1-gr-2', 'A1', '2026-10-01', 50, 40, 'Latest sample'),
  ];

  const pondA1: Pond = {
    id: 'A1',
    name: 'Pond A1',
    speciesId: 'nile-tilapia',
    speciesName: 'Nile Tilapia',
    scientificName: 'Oreochromis niloticus',
    growthStage: 'fingerling',
    stockingDate: '2026-09-01',
    originalStockCount: 15000,
    estimatedLiveStockCount: 15000,
    meanWeightGrams: 40,
    biomassKg: 600, // derived: 15000 * 40 / 1000
    assignedFeedItemId: 'floating-fish-pellet',
    assignedFeedBatchId: 'batch-ffp-001',
    mealsPerDay: 3,
    mealSchedule: a1Schedule,
    water: a1Water,
    growthRecords: a1GrowthRecords,
    mortalityRecords: [],
    feedingRecords: a1FeedingRecords,
    notes: '',
    setupComplete: true,
    areaM2: null,
    decisionState: 'GOOD_TO_GO',
    pondGateStatus: 'GOOD_TO_GO',
    demoCreatedAt: '2026-09-01T00:00:00',
    demoUpdatedAt: DEMO_INITIAL_TIME,
  };

  // ---- A2: Rohu ----
  const a2Water = buildWaterState(
    'A2',
    makeWaterReading('w-a2-1', 'A2', 29.4, 5.3, 7.5, 5),
    [
      makeWaterReading('w-a2-2', 'A2', 29.2, 5.4, 7.4, 20),
      makeWaterReading('w-a2-3', 'A2', 29.0, 5.5, 7.4, 35),
    ],
    'NORMAL'
  );

  const a2Schedule: MealScheduleEntry[] = [
    makeMealScheduleEntry('a2-sched-1', '08:00', 9.6),
    makeMealScheduleEntry('a2-sched-2', '13:00', 9.6),
    makeMealScheduleEntry('a2-sched-3', '18:00', 9.6),
  ];

  const a2FeedingRecords: FeedingRecord[] = [
    // Morning meal completed
    makeCompletedMealRecord('a2-meal-1', 'A2', 'a2-sched-1', '08:00', 9.6, 9.6, 'sinking-catfish-pellets', 'batch-scp-001', 'GOOD'),
    // 1 PM meal - OVERDUE (38 minutes at 1:38 PM). Scheduled 13:00, now 13:38 = 38 min overdue
    makeUnconfirmedMealRecord('a2-meal-2', 'A2', 'a2-sched-2', '13:00', 9.6, 'sinking-catfish-pellets', 'batch-scp-001'),
    // 6 PM meal - upcoming
    makeUpcomingMealRecord('a2-meal-3', 'A2', 'a2-sched-3', '18:00', 9.6, 'sinking-catfish-pellets', 'batch-scp-001'),
  ];

  const a2GrowthRecords: GrowthRecord[] = [
    makeGrowthRecord('a2-gr-1', 'A2', '2026-10-04', 50, 141, 'Latest sample'),
  ];

  const pondA2: Pond = {
    id: 'A2',
    name: 'Pond A2',
    speciesId: 'rohu',
    speciesName: 'Rohu',
    scientificName: 'Labeo rohita',
    growthStage: 'grow-out',
    stockingDate: '2026-07-01',
    originalStockCount: 8500,
    estimatedLiveStockCount: 8500,
    meanWeightGrams: 141.18, // 1200000 / 8500 ≈ 141.18
    biomassKg: 1200, // seed: 8500 * 141.18 / 1000 ≈ 1200
    assignedFeedItemId: 'sinking-catfish-pellets',
    assignedFeedBatchId: 'batch-scp-001',
    mealsPerDay: 3,
    mealSchedule: a2Schedule,
    water: a2Water,
    growthRecords: a2GrowthRecords,
    mortalityRecords: [],
    feedingRecords: a2FeedingRecords,
    notes: '',
    setupComplete: true,
    areaM2: null,
    decisionState: 'MEAL_OVERDUE',
    pondGateStatus: 'OVERDUE',
    demoCreatedAt: '2026-07-01T00:00:00',
    demoUpdatedAt: DEMO_INITIAL_TIME,
  };

  // ---- A3: Catla ----
  const a3Water = buildWaterState(
    'A3',
    makeWaterReading('w-a3-1', 'A3', 27.8, 6.0, 7.6, 5),
    [
      makeWaterReading('w-a3-2', 'A3', 27.6, 6.1, 7.5, 20),
      makeWaterReading('w-a3-3', 'A3', 27.4, 6.2, 7.5, 35),
    ],
    'NORMAL'
  );

  const a3Schedule: MealScheduleEntry[] = [
    makeMealScheduleEntry('a3-sched-1', '08:00', 7.5),
    makeMealScheduleEntry('a3-sched-2', '13:00', 7.5),
    makeMealScheduleEntry('a3-sched-3', '18:00', 7.5),
  ];

  const a3FeedingRecords: FeedingRecord[] = [
    // Morning meal completed
    makeCompletedMealRecord('a3-meal-1', 'A3', 'a3-sched-1', '08:00', 7.5, 7.5, 'tilapia-grower-crumbles', 'batch-tgc-001', 'GOOD'),
    // 1 PM meal completed
    makeCompletedMealRecord('a3-meal-2', 'A3', 'a3-sched-2', '13:00', 7.5, 7.5, 'tilapia-grower-crumbles', 'batch-tgc-001', 'GOOD'),
    // 6 PM meal upcoming
    makeUpcomingMealRecord('a3-meal-3', 'A3', 'a3-sched-3', '18:00', 7.5, 'tilapia-grower-crumbles', 'batch-tgc-001'),
  ];

  const a3GrowthRecords: GrowthRecord[] = [
    makeGrowthRecord('a3-gr-1', 'A3', '2026-10-06', 50, 105.88, 'Latest sample'),
  ];

  const pondA3: Pond = {
    id: 'A3',
    name: 'Pond A3',
    speciesId: 'catla',
    speciesName: 'Catla',
    scientificName: 'Catla catla',
    growthStage: 'grow-out',
    stockingDate: '2026-07-01',
    originalStockCount: 8500,
    estimatedLiveStockCount: 8500,
    meanWeightGrams: 105.88,
    biomassKg: 900, // seed: 8500 * 105.88 / 1000 ≈ 900
    assignedFeedItemId: 'tilapia-grower-crumbles',
    assignedFeedBatchId: 'batch-tgc-001',
    mealsPerDay: 3,
    mealSchedule: a3Schedule,
    water: a3Water,
    growthRecords: a3GrowthRecords,
    mortalityRecords: [],
    feedingRecords: a3FeedingRecords,
    notes: 'Feed assignment (Tilapia Grower Crumbles) is a demo configuration only. Not a validated recommendation for Catla.',
    setupComplete: true,
    areaM2: null,
    decisionState: 'UPCOMING',
    pondGateStatus: 'UPCOMING',
    demoCreatedAt: '2026-07-01T00:00:00',
    demoUpdatedAt: DEMO_INITIAL_TIME,
  };

  return [pondA1, pondA2, pondA3];
}

// ========================
// INITIAL TRANSACTIONS (from morning meals)
// ========================

export const SEED_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'txn-001',
    batchId: 'batch-ffp-001',
    pondId: 'A1',
    mealId: 'a1-meal-1',
    type: 'DEDUCTION',
    quantityKg: -5.9,
    reason: 'Morning meal - A1 (actual consumption)',
    notes: '',
    demoTimestamp: '2026-10-08T08:00:00',
  },
  {
    id: 'txn-002',
    batchId: 'batch-scp-001',
    pondId: 'A2',
    mealId: 'a2-meal-1',
    type: 'DEDUCTION',
    quantityKg: -9.6,
    reason: 'Morning meal - A2',
    notes: '',
    demoTimestamp: '2026-10-08T08:00:00',
  },
  {
    id: 'txn-003',
    batchId: 'batch-tgc-001',
    pondId: 'A3',
    mealId: 'a3-meal-1',
    type: 'DEDUCTION',
    quantityKg: -7.5,
    reason: 'Morning meal - A3',
    notes: '',
    demoTimestamp: '2026-10-08T08:00:00',
  },
  {
    id: 'txn-004',
    batchId: 'batch-tgc-001',
    pondId: 'A3',
    mealId: 'a3-meal-2',
    type: 'DEDUCTION',
    quantityKg: -7.5,
    reason: '1:00 PM meal - A3',
    notes: '',
    demoTimestamp: '2026-10-08T13:00:00',
  },
];
