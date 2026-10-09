/**
 * Core calculation functions - pure, testable, shared across all screens.
 * All biological rates and thresholds are illustrative demo values only.
 */

import type { WaterState, WaterPreferences, FeedingRecord, GrowthRecord } from '../types/pond';
import type { InventoryBatch } from '../types/inventory';
import type { DecisionState, FeedingResponse, FishActivity } from '../types/common';
import { CRITICAL_DO_THRESHOLD, STALE_READING_MINUTES, UNAVAILABLE_READING_MINUTES } from './config';

// ========================
// BIOMASS
// ========================

export function calculateBiomass(fishCount: number, meanWeightGrams: number): number {
  if (fishCount <= 0 || meanWeightGrams <= 0) return 0;
  return (fishCount * meanWeightGrams) / 1000;
}

export function calculateLiveStock(
  originalStock: number,
  mortalityRecords: Array<{ count: number }>
): number {
  const totalMortality = mortalityRecords.reduce((sum, r) => sum + r.count, 0);
  return Math.max(0, originalStock - totalMortality);
}

export function calculateSurvivalRate(
  originalStock: number | null,
  currentStock: number | null
): number {
  if (!originalStock || originalStock <= 0 || !currentStock) return 100;
  return Math.min(100, Math.max(0, (currentStock / originalStock) * 100));
}

export function calculateDaysInPond(
  stockingDate: string | null,
  demoNow: Date
): number {
  if (!stockingDate) return 0;
  const stocked = new Date(stockingDate);
  const diffTime = demoNow.getTime() - stocked.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function calculateFCR(
  totalFeedFedKg: number,
  biomassGainKg: number
): number {
  if (biomassGainKg <= 0 || totalFeedFedKg <= 0) return 1.35;
  return totalFeedFedKg / biomassGainKg;
}

export function calculateUnIonizedAmmonia(
  tan: number,
  pH: number,
  tempC: number
): number {
  if (tan <= 0) return 0;
  // Emerson et al. formula for fraction of un-ionized ammonia
  const pKa = 0.09018 + (2729.92 / (tempC + 273.15));
  const fraction = 1 / (Math.pow(10, pKa - pH) + 1);
  return tan * fraction;
}

export function evaluateWaterParameterStatus(
  param: 'dissolvedOxygen' | 'temperature' | 'ph' | 'unIonizedAmmonia',
  value: number
): 'OPTIMAL' | 'CAUTION' | 'CRITICAL' {
  switch (param) {
    case 'dissolvedOxygen':
      if (value < CRITICAL_DO_THRESHOLD) return 'CRITICAL';
      if (value < 5.0) return 'CAUTION';
      return 'OPTIMAL';
    case 'temperature':
      if (value < 22 || value > 33) return 'CRITICAL';
      if (value < 26 || value > 31) return 'CAUTION';
      return 'OPTIMAL';
    case 'ph':
      if (value < 6.5 || value > 9.0) return 'CRITICAL';
      if (value < 7.0 || value > 8.5) return 'CAUTION';
      return 'OPTIMAL';
    case 'unIonizedAmmonia':
      if (value >= 0.05) return 'CRITICAL';
      if (value >= 0.02) return 'CAUTION';
      return 'OPTIMAL';
    default:
      return 'OPTIMAL';
  }
}

export function calculateWaterAdjustment(reading: {
  temperature: number;
  dissolvedOxygen: number;
  ph?: number;
  totalAmmoniaNitrogen?: number;
  [key: string]: any;
}): { fraction: number; reason: string } {
  const { temperature: temp, dissolvedOxygen: doVal } = reading;

  if (doVal < CRITICAL_DO_THRESHOLD) {
    return { fraction: 0.0, reason: 'Critically low dissolved oxygen (<3.5 mg/L). Cease feeding.' };
  }
  if (doVal < 5.0) {
    return { fraction: 0.65, reason: 'Reduced dissolved oxygen (<5.0 mg/L). 35% reduction applied.' };
  }
  if (temp > 33) {
    return { fraction: 0.50, reason: 'Thermal stress (>33°C). 50% precautionary reduction.' };
  }
  if (temp > 31) {
    return { fraction: 0.85, reason: 'Elevated water temperature (>31°C). 15% reduction.' };
  }
  if (temp < 24) {
    return { fraction: 0.80, reason: 'Cool water temperature (<24°C). Reduced metabolic intake.' };
  }

  return { fraction: 1.0, reason: 'Water conditions within optimal parameters.' };
}

// ========================
// FEEDING RATES
// ========================

/**
 * Base ration in kg/day from biomass and feeding rate percentage.
 * Rate is expressed as a decimal (e.g. 0.0325 = 3.25%).
 */
export function calculateBaseRation(biomassKg: number, feedingRateDecimal: number): number {
  if (biomassKg <= 0 || feedingRateDecimal <= 0) return 0;
  return biomassKg * feedingRateDecimal;
}

/**
 * Apply water condition adjustment.
 * adjustmentFraction: e.g. -0.06 = -6%
 * Returns unrounded adjusted ration.
 */
export function calculateFinalRationUnrounded(
  baseRationKg: number,
  adjustmentFraction: number
): number {
  return baseRationKg * (1 + adjustmentFraction);
}

/**
 * Round final ration to 0.1 kg as per rounding rules.
 */
export function roundRation(rationKg: number): number {
  return Math.round(rationKg * 10) / 10;
}

/**
 * Calculate final daily ration (rounded) from biomass, rate, and adjustment.
 */
export function calculateFinalRation(
  biomassKg: number,
  feedingRateDecimal: number,
  waterAdjustmentFraction: number
): { unrounded: number; rounded: number } {
  const base = calculateBaseRation(biomassKg, feedingRateDecimal);
  const unrounded = calculateFinalRationUnrounded(base, waterAdjustmentFraction);
  return { unrounded, rounded: roundRation(unrounded) };
}

/**
 * Split daily ration equally across meals.
 * Uses rounded daily ration for all splits.
 */
export function calculateMealQuantities(
  roundedDailyRationKg: number,
  mealsPerDay: number
): number[] {
  if (mealsPerDay <= 0) return [];
  const perMeal = Math.round((roundedDailyRationKg / mealsPerDay) * 10) / 10;
  return Array(mealsPerDay).fill(perMeal);
}

// ========================
// WATER CONDITION EVALUATION
// ========================

export interface WaterAssessment {
  adjustmentFraction: number;
  adjustmentReason: string;
  decisionState: DecisionState;
  decisionReason: string;
  isValid: boolean;
}

export function evaluateWaterConditions(
  water: WaterState | null,
  prefs: WaterPreferences,
  demoNow: Date
): WaterAssessment {
  if (!water || !water.current) {
    return {
      adjustmentFraction: 0,
      adjustmentReason: 'No water readings available',
      decisionState: 'SENSOR_UNAVAILABLE',
      decisionReason: 'Water readings are unavailable. Cannot calculate a reliable feeding recommendation.',
      isValid: false,
    };
  }

  const reading = water.current;
  const readingTime = new Date(reading.demoTimestamp);
  const staleCutoffMs = STALE_READING_MINUTES * 60 * 1000;
  const unavailableCutoffMs = UNAVAILABLE_READING_MINUTES * 60 * 1000;
  const ageMs = demoNow.getTime() - readingTime.getTime();

  if (ageMs > unavailableCutoffMs) {
    return {
      adjustmentFraction: 0,
      adjustmentReason: 'Water data unavailable (>2 hours old)',
      decisionState: 'SENSOR_UNAVAILABLE',
      decisionReason: `Water data is ${Math.round(ageMs / 60000)} minutes old and unavailable.`,
      isValid: false,
    };
  }

  if (ageMs > staleCutoffMs) {
    return {
      adjustmentFraction: 0,
      adjustmentReason: 'Water data stale (>30 minutes old)',
      decisionState: 'DATA_STALE',
      decisionReason: `Water data is ${Math.round(ageMs / 60000)} minutes old. Readings may not reflect current conditions.`,
      isValid: false,
    };
  }

  const temp = reading.temperature;
  const doVal = reading.dissolvedOxygen;
  const activity = water.activity;

  // Check for implausible readings
  if (doVal !== null && (doVal < prefs.implausibleDOMin || doVal > prefs.implausibleDOMax)) {
    return {
      adjustmentFraction: 0,
      adjustmentReason: `Implausible DO reading: ${doVal} mg/L`,
      decisionState: 'DATA_STALE',
      decisionReason: `Dissolved oxygen reading of ${doVal} mg/L is outside plausible range. Verify sensor.`,
      isValid: false,
    };
  }

  // Combined critical condition: very high temp + very low DO + low activity
  if (
    temp !== null &&
    doVal !== null &&
    temp > prefs.criticalTempMax &&
    doVal < prefs.criticalDOMin &&
    activity === 'LETHARGIC'
  ) {
    return {
      adjustmentFraction: 0,
      adjustmentReason: `Critical: High temp ${temp}°C + Low DO ${doVal} mg/L + Lethargic`,
      decisionState: 'FEEDING_ON_HOLD',
      decisionReason: `Critical combined condition: Temperature ${temp}°C exceeds maximum ${prefs.criticalTempMax}°C and dissolved oxygen ${doVal} mg/L is critically low. Fish activity is lethargic. Feeding is on hold. Check aeration immediately.`,
      isValid: true,
    };
  }

  // Low DO critical
  const criticalDoThreshold = Math.max(prefs.criticalDOMin, CRITICAL_DO_THRESHOLD);
  if (doVal !== null && doVal < criticalDoThreshold) {
    return {
      adjustmentFraction: -0.5,
      adjustmentReason: `Critical low DO: ${doVal} mg/L (threshold: ${criticalDoThreshold} mg/L)`,
      decisionState: 'STOP_FEEDING',
      decisionReason: `Dissolved oxygen is critically low at ${doVal} mg/L. Check aeration before feeding. Feeding may worsen oxygen depletion.`,
      isValid: true,
    };
  }

  // Rapid temperature rise
  if (water.trend.rapidRise && water.trend.rapidRiseDelta !== null) {
    const delta = water.trend.rapidRiseDelta;
    return {
      adjustmentFraction: -0.1,
      adjustmentReason: `Rapid temperature rise: +${delta.toFixed(1)}°C`,
      decisionState: 'TEMPERATURE_RISING',
      decisionReason: `Temperature has risen rapidly by ${delta.toFixed(1)}°C. Monitor conditions. Feeding reduced by 10% as a precaution.`,
      isValid: true,
    };
  }

  // Low DO (reduced feeding, not critical)
  if (doVal !== null && doVal < prefs.fullFeedingDOMin) {
    const reduction = doVal < prefs.reducedFeedingDOMin ? -0.25 : -0.1;
    return {
      adjustmentFraction: reduction,
      adjustmentReason: `Low DO: ${doVal} mg/L (full-feed threshold: ${prefs.fullFeedingDOMin} mg/L)`,
      decisionState: 'WAIT_BEFORE_FEEDING',
      decisionReason: `Dissolved oxygen ${doVal} mg/L is below the full-feeding threshold of ${prefs.fullFeedingDOMin} mg/L. Reduce feeding and investigate water quality.`,
      isValid: true,
    };
  }

  // High temperature (outside preferred range but not critical)
  if (temp !== null && temp > prefs.preferredTempMax) {
    return {
      adjustmentFraction: -0.06,
      adjustmentReason: `Temperature ${temp}°C above preferred maximum ${prefs.preferredTempMax}°C`,
      decisionState: 'MONITOR_CONDITIONS',
      decisionReason: `Water temperature ${temp}°C is above the preferred range (${prefs.preferredTempMin}–${prefs.preferredTempMax}°C). Ration reduced by 6%. Monitor closely.`,
      isValid: true,
    };
  }

  // Low temperature
  if (temp !== null && temp < prefs.preferredTempMin) {
    return {
      adjustmentFraction: -0.1,
      adjustmentReason: `Temperature ${temp}°C below preferred minimum ${prefs.preferredTempMin}°C`,
      decisionState: 'MONITOR_CONDITIONS',
      decisionReason: `Water temperature ${temp}°C is below the preferred range (${prefs.preferredTempMin}–${prefs.preferredTempMax}°C). Reduced ration recommended.`,
      isValid: true,
    };
  }

  // Good conditions
  return {
    adjustmentFraction: 0,
    adjustmentReason: 'Conditions within configured preferred range',
    decisionState: 'GOOD_TO_GO',
    decisionReason: 'Current demo readings are within the configured feeding conditions.',
    isValid: true,
  };
}

// ========================
// MEAL STATUS
// ========================

export interface MealStatusResult {
  status: 'UPCOMING' | 'READY' | 'OVERDUE' | 'COMPLETED' | 'SKIPPED' | 'ON_HOLD' | 'IN_PROGRESS' | 'ADJUSTED';
  overdueDurationMinutes: number | null;
  countdownMinutes: number | null;
}

export function evaluateMealStatus(
  scheduledDemoTime: Date,
  demoNow: Date,
  confirmed: boolean,
  currentStatus: string,
  windowConfig: {
    upcomingStartMinutes: number;
    readyStartMinutes: number;
    readyEndMinutes: number;
    overdueAfterMinutes: number;
  }
): MealStatusResult {
  if (['COMPLETED', 'SKIPPED', 'ADJUSTED'].includes(currentStatus)) {
    return { status: currentStatus as any, overdueDurationMinutes: null, countdownMinutes: null };
  }

  const diffMinutes = (scheduledDemoTime.getTime() - demoNow.getTime()) / 60000;

  if (diffMinutes > windowConfig.upcomingStartMinutes) {
    return { status: 'UPCOMING', overdueDurationMinutes: null, countdownMinutes: Math.round(diffMinutes) };
  }

  if (diffMinutes > windowConfig.readyStartMinutes) {
    return { status: 'UPCOMING', overdueDurationMinutes: null, countdownMinutes: Math.round(diffMinutes) };
  }

  if (diffMinutes >= -windowConfig.readyEndMinutes) {
    return { status: 'READY', overdueDurationMinutes: null, countdownMinutes: Math.round(diffMinutes) };
  }

  if (!confirmed) {
    const overdueMins = Math.round(-diffMinutes - windowConfig.readyEndMinutes);
    return { status: 'OVERDUE', overdueDurationMinutes: overdueMins, countdownMinutes: null };
  }

  return { status: 'COMPLETED', overdueDurationMinutes: null, countdownMinutes: null };
}

// ========================
// FEED RUNWAY AND FORECAST
// ========================

export function calculateFeedRunway(
  availableStockKg: number,
  dailyDemandKg: number
): number {
  if (dailyDemandKg <= 0) return Infinity;
  return availableStockKg / dailyDemandKg;
}

export function calculateFeedForecast(
  roundedDailyRationKg: number,
  days: number
): number {
  return Math.round(roundedDailyRationKg * days * 10) / 10;
}

export function calculateStockShortfall(
  forecastDemandKg: number,
  availableStockKg: number
): number {
  return Math.max(0, forecastDemandKg - availableStockKg);
}

// ========================
// GROWTH STAGE
// ========================

export interface StageThreshold {
  stage: string;
  label: string;
  minWeightGrams: number;
  maxWeightGrams: number | null;
}

export function evaluateGrowthStage(
  meanWeightGrams: number,
  thresholds: StageThreshold[]
): string | null {
  for (const t of thresholds) {
    if (
      meanWeightGrams >= t.minWeightGrams &&
      (t.maxWeightGrams === null || meanWeightGrams < t.maxWeightGrams)
    ) {
      return t.stage;
    }
  }
  return null;
}

// ========================
// DATA QUALITY
// ========================

export function evaluateDataQuality(
  reading: { temperature: number | null; dissolvedOxygen: number | null; demoTimestamp: string } | null,
  demoNow: Date,
  prefs: WaterPreferences
): { quality: 'VALID' | 'STALE' | 'MISSING' | 'IMPLAUSIBLE'; reason: string } {
  if (!reading) return { quality: 'MISSING', reason: 'No reading available' };
  
  const ageMs = demoNow.getTime() - new Date(reading.demoTimestamp).getTime();
  const staleMs = STALE_READING_MINUTES * 60 * 1000;
  const unavailableMs = UNAVAILABLE_READING_MINUTES * 60 * 1000;
  
  if (ageMs > unavailableMs) return { quality: 'MISSING', reason: 'Reading too old (>2 hours)' };
  
  const { temperature: temp, dissolvedOxygen: doVal } = reading;
  
  if (doVal !== null && (doVal < prefs.implausibleDOMin || doVal > prefs.implausibleDOMax)) {
    return { quality: 'IMPLAUSIBLE', reason: `DO reading ${doVal} mg/L is outside plausible range` };
  }
  
  if (ageMs > staleMs) return { quality: 'STALE', reason: `Reading is ${Math.round(ageMs / 60000)} minutes old` };
  
  return { quality: 'VALID', reason: 'Recent valid reading' };
}

// ========================
// SAMPLING REMINDER
// ========================

export function calculateSamplingReminder(
  latestSamplingDate: string | null,
  intervalDays: number = 7
): { nextDueDate: string; isDue: boolean; daysOverdue: number } {
  if (!latestSamplingDate) {
    const now = new Date('2026-10-08T13:38:00');
    return {
      nextDueDate: now.toISOString().split('T')[0],
      isDue: true,
      daysOverdue: 0,
    };
  }
  
  const lastDate = new Date(latestSamplingDate);
  const demoNow = new Date('2026-10-08T13:38:00');
  const nextDue = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const isDue = demoNow >= nextDue;
  const daysOverdue = isDue ? Math.floor((demoNow.getTime() - nextDue.getTime()) / (24 * 60 * 60 * 1000)) : 0;
  
  return {
    nextDueDate: nextDue.toISOString().split('T')[0],
    isDue,
    daysOverdue,
  };
}

// ========================
// FEEDING RESPONSE ADJUSTMENT
// ========================

export function calculateFeedingResponseAdjustment(
  lastFeedingResponse: FeedingResponse | null,
  currentDecisionAdjustment: number
): number {
  if (lastFeedingResponse === 'POOR' || lastFeedingResponse === 'REFUSED') {
    return Math.min(currentDecisionAdjustment, -0.1);
  }
  if (lastFeedingResponse === 'FAIR') {
    return currentDecisionAdjustment;
  }
  return currentDecisionAdjustment;
}

// ========================
// POND STATUS EVALUATION
// ========================

export type PondStatusPriority =
  | 'CRITICAL_HOLD'
  | 'WATER_WARNING'
  | 'STALE_DATA'
  | 'MEAL_OVERDUE'
  | 'POOR_RESPONSE'
  | 'INVENTORY_SHORT'
  | 'MEAL_READY'
  | 'MEAL_UPCOMING'
  | 'GROWTH_REMINDER'
  | 'HEALTHY';

export function evaluatePondStatus(params: {
  decisionState: DecisionState;
  hasOverdueMeal: boolean;
  hasPoorResponse: boolean;
  hasInventoryShortage: boolean;
  hasMealReady: boolean;
  hasMealUpcoming: boolean;
  hasGrowthReminder: boolean;
}): PondStatusPriority {
  const { decisionState } = params;
  
  if (decisionState === 'FEEDING_ON_HOLD' || decisionState === 'STOP_FEEDING') return 'CRITICAL_HOLD';
  if (decisionState === 'LOW_OXYGEN' || decisionState === 'TEMPERATURE_RISING' || decisionState === 'MONITOR_CONDITIONS') return 'WATER_WARNING';
  if (decisionState === 'DATA_STALE' || decisionState === 'SENSOR_UNAVAILABLE') return 'STALE_DATA';
  if (params.hasOverdueMeal) return 'MEAL_OVERDUE';
  if (params.hasPoorResponse) return 'POOR_RESPONSE';
  if (params.hasInventoryShortage) return 'INVENTORY_SHORT';
  if (params.hasMealReady) return 'MEAL_READY';
  if (params.hasMealUpcoming) return 'MEAL_UPCOMING';
  if (params.hasGrowthReminder) return 'GROWTH_REMINDER';
  return 'HEALTHY';
}
