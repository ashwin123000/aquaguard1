/**
 * Decision engine - derives the current feeding decision state for a pond.
 * Uses shared calculations only. Never hardcodes states.
 */

import type { Pond } from '../types/pond';
import type { InventoryBatch } from '../types/inventory';
import type { DecisionState, FeedingResponse } from '../types/common';
import { SPECIES_CONFIGS, FEEDING_WINDOW_CONFIG } from './config';
import {
  evaluateWaterConditions,
  evaluateMealStatus,
  calculateBaseRation,
  calculateFinalRationUnrounded,
  roundRation,
  calculateFeedRunway,
  calculateFeedingResponseAdjustment,
} from './calculations';

export interface FeedingDecision {
  decisionState: DecisionState;
  headline: string;
  reason: string;
  recommendedQuantityKg: number;
  adjustedQuantityKg: number;
  waterAdjustmentFraction: number;
  waterAdjustmentReason: string;
  feedingResponseAdjustment: number;
  baseRationKg: number;
  unroundedRationKg: number;
  roundedDailyRationKg: number;
  currentMealId: string | null;
  currentMealTime: string | null;
  countdownMinutes: number | null;
  overdueDurationMinutes: number | null;
  feedType: string | null;
  batchId: string | null;
  primaryAction: string;
  secondaryAction: string | null;
  isReassessing: boolean;
  calculationSteps: CalculationStep[];
}

export interface CalculationStep {
  label: string;
  value: string;
  formula?: string;
  note?: string;
}

export function deriveFeedingDecision(
  pond: Pond,
  batches: InventoryBatch[],
  demoNow: Date
): FeedingDecision {
  const species = pond.speciesId ? SPECIES_CONFIGS[pond.speciesId] : null;

  // ---- Setup incomplete ----
  if (!pond.setupComplete || !species || !pond.biomassKg || !pond.growthStage) {
    return {
      decisionState: 'SETUP_INCOMPLETE',
      headline: 'Setup Incomplete',
      reason: 'This pond needs configuration before feeding recommendations can be calculated.',
      recommendedQuantityKg: 0,
      adjustedQuantityKg: 0,
      waterAdjustmentFraction: 0,
      waterAdjustmentReason: 'N/A',
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
      primaryAction: 'Complete Setup',
      secondaryAction: null,
      isReassessing: false,
      calculationSteps: [],
    };
  }

  // ---- Water evaluation ----
  const waterAssessment = evaluateWaterConditions(pond.water, species.waterPreferences, demoNow);

  // ---- Last feeding response ----
  const completedMeals = pond.feedingRecords.filter(m => m.status === 'COMPLETED' && m.feedingResponse !== null);
  const lastMeal = completedMeals.sort((a, b) => 
    new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
  )[0];
  const lastResponse: FeedingResponse | null = lastMeal?.feedingResponse ?? null;

  // ---- Combined adjustment ----
  const responseAdj = calculateFeedingResponseAdjustment(lastResponse, waterAssessment.adjustmentFraction);
  // ---- Biomass-based ration ----
  const feedingRate = species.stageFeedingRates[pond.growthStage] ?? 0;
  const baseRation = calculateBaseRation(pond.biomassKg, feedingRate);
  const unroundedRation = calculateFinalRationUnrounded(baseRation, responseAdj);
  const roundedDailyRation = roundRation(unroundedRation);

  // Per meal quantity
  const mealQty = pond.mealsPerDay > 0 
    ? Math.round((roundedDailyRation / pond.mealsPerDay) * 10) / 10 
    : 0;

  // ---- Find current relevant meal ----
  const todaysMeals = pond.feedingRecords.filter(m => {
    const mDate = new Date(m.scheduledTime);
    const sameDay = mDate.toDateString() === demoNow.toDateString();
    return sameDay;
  }).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  let currentMeal = null;
  let currentMealStatusResult = null;

  for (const meal of todaysMeals) {
    if (meal.status === 'COMPLETED' || meal.status === 'SKIPPED') continue;
    const scheduledTime = new Date(meal.scheduledTime);
    const statusResult = evaluateMealStatus(scheduledTime, demoNow, meal.confirmed, meal.status, FEEDING_WINDOW_CONFIG);
    if (!currentMeal || statusResult.status === 'OVERDUE' || statusResult.status === 'READY') {
      currentMeal = meal;
      currentMealStatusResult = statusResult;
      if (statusResult.status === 'OVERDUE' || statusResult.status === 'READY') break;
    }
  }

  // If no unconfirmed meal for today, find next upcoming
  if (!currentMeal) {
    currentMeal = todaysMeals.find(m => m.status !== 'COMPLETED' && m.status !== 'SKIPPED') || null;
    if (currentMeal) {
      const scheduledTime = new Date(currentMeal.scheduledTime);
      currentMealStatusResult = evaluateMealStatus(scheduledTime, demoNow, currentMeal.confirmed, currentMeal.status, FEEDING_WINDOW_CONFIG);
    }
  }

  // ---- Overdue check ----
  const overdueMeal = todaysMeals.find(m => {
    if (m.status === 'COMPLETED' || m.status === 'SKIPPED' || m.confirmed) return false;
    const scheduledTime = new Date(m.scheduledTime);
    const minutesPast = (demoNow.getTime() - scheduledTime.getTime()) / 60000;
    return minutesPast > FEEDING_WINDOW_CONFIG.readyEndMinutes;
  });

  // ---- Check assigned batch ----
  const assignedBatch = batches.find(b => b.id === pond.assignedFeedBatchId);
  const feedType = assignedBatch?.feedItemName ?? null;
  const batchId = assignedBatch?.id ?? null;

  // ---- Check inventory availability ----
  const hasStockAvailable = assignedBatch && !assignedBatch.isExpired && assignedBatch.quantityKg >= mealQty;

  // ---- Build calculation steps ----
  const calculationSteps: CalculationStep[] = [
    {
      label: 'Estimated biomass',
      value: `${pond.biomassKg.toFixed(1)} kg`,
      formula: `${pond.estimatedLiveStockCount?.toLocaleString()} fish × ${pond.meanWeightGrams} g ÷ 1,000`,
    },
    {
      label: 'Feeding rate (illustrative)',
      value: `${(feedingRate * 100).toFixed(2)}% of biomass/day`,
      note: `${species.name} — ${pond.growthStage} stage`,
    },
    {
      label: 'Base daily ration',
      value: `${baseRation.toFixed(1)} kg/day`,
      formula: `${pond.biomassKg.toFixed(1)} kg × ${(feedingRate * 100).toFixed(2)}%`,
    },
    {
      label: 'Water adjustment',
      value: `${waterAssessment.adjustmentFraction >= 0 ? '+' : ''}${(waterAssessment.adjustmentFraction * 100).toFixed(0)}%`,
      note: waterAssessment.adjustmentReason,
    },
    {
      label: 'Before rounding (adjusted ration)',
      value: `${unroundedRation.toFixed(2)} kg/day`,
      formula: `${baseRation.toFixed(1)} × (1 + ${(waterAssessment.adjustmentFraction * 100).toFixed(0)}%)`,
    },
    {
      label: 'Final daily ration (rounded to 0.1 kg)',
      value: `${roundedDailyRation.toFixed(1)} kg/day`,
    },
    {
      label: `Per meal (÷ ${pond.mealsPerDay} meals)`,
      value: `${mealQty.toFixed(1)} kg`,
    },
  ];

  if (lastResponse) {
    calculationSteps.push({
      label: 'Last feeding response',
      value: lastResponse,
      note: responseAdj !== 0 ? `Adjustment: ${(responseAdj * 100).toFixed(0)}%` : 'No adjustment needed',
    });
  }

  // ---- Overdue meal takes priority ----
  if (
    overdueMeal &&
    waterAssessment.isValid &&
    waterAssessment.decisionState !== 'FEEDING_ON_HOLD' &&
    waterAssessment.decisionState !== 'STOP_FEEDING' &&
    waterAssessment.decisionState !== 'LOW_OXYGEN'
  ) {
    const scheduledTime = new Date(overdueMeal.scheduledTime);
    const overdueMins = Math.round((demoNow.getTime() - scheduledTime.getTime()) / 60000);
    return {
      decisionState: 'MEAL_OVERDUE',
      headline: `Meal Check Overdue`,
      reason: `The ${scheduledTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} meal has not been logged. It is ${overdueMins} minutes overdue.`,
      recommendedQuantityKg: mealQty,
      adjustedQuantityKg: mealQty,
      waterAdjustmentFraction: waterAssessment.adjustmentFraction,
      waterAdjustmentReason: waterAssessment.adjustmentReason,
      feedingResponseAdjustment: responseAdj,
      baseRationKg: baseRation,
      unroundedRationKg: unroundedRation,
      roundedDailyRationKg: roundedDailyRation,
      currentMealId: overdueMeal.id,
      currentMealTime: scheduledTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      countdownMinutes: null,
      overdueDurationMinutes: overdueMins,
      feedType,
      batchId,
      primaryAction: 'Log Meal Now',
      secondaryAction: 'View History',
      isReassessing: false,
      calculationSteps,
    };
  }

  // ---- Apply water state decision ----
  if (!waterAssessment.isValid) {
    return {
      decisionState: waterAssessment.decisionState,
      headline: waterAssessment.decisionState === 'DATA_STALE' ? 'Water Data Stale' : 'Sensor Data Unavailable',
      reason: waterAssessment.decisionReason,
      recommendedQuantityKg: mealQty,
      adjustedQuantityKg: mealQty,
      waterAdjustmentFraction: 0,
      waterAdjustmentReason: waterAssessment.adjustmentReason,
      feedingResponseAdjustment: responseAdj,
      baseRationKg: baseRation,
      unroundedRationKg: unroundedRation,
      roundedDailyRationKg: roundedDailyRation,
      currentMealId: currentMeal?.id ?? null,
      currentMealTime: currentMeal ? new Date(currentMeal.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
      countdownMinutes: currentMealStatusResult?.countdownMinutes ?? null,
      overdueDurationMinutes: null,
      feedType,
      batchId,
      primaryAction: 'Update Reading',
      secondaryAction: 'View History',
      isReassessing: false,
      calculationSteps,
    };
  }

  if (waterAssessment.decisionState === 'FEEDING_ON_HOLD' || waterAssessment.decisionState === 'STOP_FEEDING' || waterAssessment.decisionState === 'LOW_OXYGEN') {
    return {
      decisionState: waterAssessment.decisionState,
      headline: 'Feeding On Hold',
      reason: waterAssessment.decisionReason,
      recommendedQuantityKg: 0,
      adjustedQuantityKg: 0,
      waterAdjustmentFraction: waterAssessment.adjustmentFraction,
      waterAdjustmentReason: waterAssessment.adjustmentReason,
      feedingResponseAdjustment: responseAdj,
      baseRationKg: baseRation,
      unroundedRationKg: unroundedRation,
      roundedDailyRationKg: roundedDailyRation,
      currentMealId: currentMeal?.id ?? null,
      currentMealTime: currentMeal ? new Date(currentMeal.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
      countdownMinutes: currentMealStatusResult?.countdownMinutes ?? null,
      overdueDurationMinutes: null,
      feedType,
      batchId,
      primaryAction: 'Check Aeration',
      secondaryAction: 'View Reason',
      isReassessing: false,
      calculationSteps,
    };
  }

  // ---- Current meal state ----
  if (currentMeal && currentMealStatusResult) {
    const scheduledTime = new Date(currentMeal.scheduledTime);
    const timeStr = scheduledTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    if (currentMealStatusResult.status === 'READY') {
      const finalQty = roundRation(mealQty);

      let headline = 'Good to Go';
      let reason = waterAssessment.decisionReason;
      let primaryAction = `Feed ${finalQty} kg Now`;
      let decisionState: DecisionState = waterAssessment.decisionState;

      if (waterAssessment.decisionState !== 'GOOD_TO_GO') {
        headline = waterAssessment.decisionState === 'TEMPERATURE_RISING' ? 'Temperature Rising' :
                   waterAssessment.decisionState === 'MONITOR_CONDITIONS' ? 'Monitor Conditions' :
                   waterAssessment.decisionState === 'WAIT_BEFORE_FEEDING' ? 'Wait Before Feeding' : 'Check Conditions';
        primaryAction = 'Log Feeding';
      }

      return {
        decisionState,
        headline,
        reason,
        recommendedQuantityKg: mealQty,
        adjustedQuantityKg: finalQty,
        waterAdjustmentFraction: waterAssessment.adjustmentFraction,
        waterAdjustmentReason: waterAssessment.adjustmentReason,
        feedingResponseAdjustment: responseAdj,
        baseRationKg: baseRation,
        unroundedRationKg: unroundedRation,
        roundedDailyRationKg: roundedDailyRation,
        currentMealId: currentMeal.id,
        currentMealTime: timeStr,
        countdownMinutes: currentMealStatusResult.countdownMinutes,
        overdueDurationMinutes: null,
        feedType,
        batchId,
        primaryAction,
        secondaryAction: 'View Reason',
        isReassessing: false,
        calculationSteps,
      };
    }

    if (currentMealStatusResult.status === 'UPCOMING') {
      const countdown = currentMealStatusResult.countdownMinutes ?? 0;
      return {
        decisionState: 'UPCOMING',
        headline: `Next Feeding at ${timeStr}`,
        reason: `Next meal scheduled in ${countdown} minutes.`,
        recommendedQuantityKg: mealQty,
        adjustedQuantityKg: mealQty,
        waterAdjustmentFraction: waterAssessment.adjustmentFraction,
        waterAdjustmentReason: waterAssessment.adjustmentReason,
        feedingResponseAdjustment: responseAdj,
        baseRationKg: baseRation,
        unroundedRationKg: unroundedRation,
        roundedDailyRationKg: roundedDailyRation,
        currentMealId: currentMeal.id,
        currentMealTime: timeStr,
        countdownMinutes: countdown,
        overdueDurationMinutes: null,
        feedType,
        batchId,
        primaryAction: 'View Plan',
        secondaryAction: 'Log Meal Early',
        isReassessing: false,
        calculationSteps,
      };
    }
  }

  // All meals done for the day
  return {
    decisionState: 'GOOD_TO_GO',
    headline: 'All Meals Logged',
    reason: 'All scheduled meals for today have been recorded.',
    recommendedQuantityKg: mealQty,
    adjustedQuantityKg: mealQty,
    waterAdjustmentFraction: waterAssessment.adjustmentFraction,
    waterAdjustmentReason: waterAssessment.adjustmentReason,
    feedingResponseAdjustment: responseAdj,
    baseRationKg: baseRation,
    unroundedRationKg: unroundedRation,
    roundedDailyRationKg: roundedDailyRation,
    currentMealId: null,
    currentMealTime: null,
    countdownMinutes: null,
    overdueDurationMinutes: null,
    feedType,
    batchId,
    primaryAction: 'View History',
    secondaryAction: null,
    isReassessing: false,
    calculationSteps,
  };
}
