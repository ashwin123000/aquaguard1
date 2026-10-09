import type { DataQuality, FishActivity, FeedingResponse, MealStatus, DecisionState, PondGateStatus } from './common';

export interface WaterReading {
  id: string;
  pondId: string;
  temperature: number | null;
  dissolvedOxygen: number | null;
  pH: number | null;
  demoTimestamp: string;
  quality: DataQuality;
}

export interface WaterTrend {
  temperatureTrend: 'RISING' | 'STABLE' | 'FALLING' | 'UNKNOWN';
  doTrend: 'RISING' | 'STABLE' | 'FALLING' | 'UNKNOWN';
  rapidRise: boolean;
  rapidRiseDelta: number | null;
}

export interface WaterState {
  current: WaterReading | null;
  history: WaterReading[];
  trend: WaterTrend;
  activity: FishActivity;
}

export interface MealScheduleEntry {
  id: string;
  scheduledTime: string; // HH:mm format
  plannedQuantityKg: number;
}

export interface FeedingRecord {
  id: string;
  pondId: string;
  mealScheduleEntryId: string;
  scheduledTime: string; // ISO demo datetime
  status: MealStatus;
  plannedQuantityKg: number;
  recommendedQuantityKg: number;
  assignedFeedItemId: string | null;
  assignedFeedBatchId: string | null;
  confirmed: boolean;
  actualQuantityKg: number | null;
  uneatenQuantityKg: number | null;
  feedingResponse: FeedingResponse | null;
  consumptionTimeMinutes: number | null;
  surfaceActivity: FishActivity | null;
  behaviourNotes: string;
  notes: string;
  adjustmentReason: string | null;
  relatedAlertIds: string[];
  demoCreatedAt: string;
  demoUpdatedAt: string;
}

export interface GrowthRecord {
  id: string;
  pondId: string;
  samplingDate: string; // ISO demo date
  sampleSize: number;
  meanWeightGrams: number;
  survivalEstimatePercent: number | null;
  mortalitySincePrevious: number | null;
  notes: string;
  demoCreatedAt: string;
}

export interface MortalityRecord {
  id: string;
  pondId: string;
  recordedDate: string;
  count: number;
  reason: string;
  notes: string;
  demoCreatedAt: string;
}

export interface Pond {
  id: string;
  name: string;
  speciesId: string | null;
  speciesName: string | null;
  scientificName: string | null;
  growthStage: string | null;
  stockingDate: string | null;
  originalStockCount: number | null;
  estimatedLiveStockCount: number | null;
  meanWeightGrams: number | null;
  biomassKg: number | null; // derived, do not use as authoritative
  assignedFeedItemId: string | null;
  assignedFeedBatchId: string | null;
  mealsPerDay: number;
  mealSchedule: MealScheduleEntry[];
  water: WaterState | null;
  growthRecords: GrowthRecord[];
  mortalityRecords: MortalityRecord[];
  feedingRecords: FeedingRecord[];
  notes: string;
  setupComplete: boolean;
  areaM2: number | null;
  decisionState: DecisionState;
  pondGateStatus: PondGateStatus;
  demoCreatedAt: string;
  demoUpdatedAt: string;
}

export interface SpeciesConfig {
  id: string;
  name: string;
  scientificName: string;
  // Feeding rates by stage (% of biomass per day)
  stageFeedingRates: Record<string, number>;
  // Stage thresholds by mean weight (grams)
  stageThresholds: StageThreshold[];
  // Water condition preferences
  waterPreferences: WaterPreferences;
  // Compatible feed item IDs
  compatibleFeedItems: string[];
}

export interface StageThreshold {
  stage: string;
  label: string;
  minWeightGrams: number;
  maxWeightGrams: number | null; // null = no upper limit
}

export interface WaterPreferences {
  preferredTempMin: number;
  preferredTempMax: number;
  criticalTempMax: number;
  fullFeedingDOMin: number; // mg/L
  reducedFeedingDOMin: number; // mg/L
  criticalDOMin: number; // mg/L
  preferredPHMin: number;
  preferredPHMax: number;
  rapidRiseTempDelta: number; // °C per 15 min tick
  implausibleTempDelta: number; // °C per tick
  implausibleDOMax: number;
  implausibleDOMin: number;
}

// Feeding window in minutes
export interface FeedingWindowConfig {
  upcomingStartMinutes: number; // minutes before scheduled time
  readyStartMinutes: number; // minutes before scheduled time
  readyEndMinutes: number; // minutes after scheduled time
  overdueAfterMinutes: number; // minutes after scheduled time
}
