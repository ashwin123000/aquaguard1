/**
 * Alert engine - generates and manages alerts from application state.
 * One central alert engine, one authoritative alert collection.
 */

import type { Alert } from '../types/alert';
import type { Pond, FeedingRecord } from '../types/pond';
import type { InventoryBatch } from '../types/inventory';
import { NEAR_EXPIRY_DAYS, LOW_STOCK_THRESHOLD_DAYS, SPECIES_CONFIGS, STALE_READING_MINUTES, CRITICAL_DO_THRESHOLD } from './config';
import { 
  calculateFeedRunway, 
  calculateFeedForecast, 
  calculateStockShortfall 
} from './calculations';
import { generateId } from '../utils/ids';

export interface AlertEngineInput {
  ponds: Pond[];
  batches: InventoryBatch[];
  demoNow: Date;
  existingAlerts: Alert[];
}

export interface AlertEngineOutput {
  alerts: Alert[];
}

function makeAlert(params: Omit<Alert, 'id'> & { id?: string }): Alert {
  return {
    id: params.id || generateId('alert'),
    ...params,
  };
}

function findExistingByKey(existing: Alert[], key: string): Alert | undefined {
  return existing.find(a => a.stableKey === key && a.status === 'ACTIVE');
}

export function generateAlerts(input: AlertEngineInput): Alert[] {
  const { ponds, batches, demoNow, existingAlerts } = input;
  const demoTs = demoNow.toISOString();
  const alerts: Alert[] = [...existingAlerts.filter(a => a.status !== 'ACTIVE')]; // preserve history
  const newOrUpdatedAlerts: Alert[] = [];

  // Helper to upsert alert (update existing or create new)
  function upsertAlert(params: Omit<Alert, 'id' | 'demoCreatedAt' | 'demoUpdatedAt'> & { stableKey: string }) {
    const existing = findExistingByKey(existingAlerts, params.stableKey);
    if (existing) {
      // Update existing alert (same condition continuing)
      newOrUpdatedAlerts.push({
        ...existing,
        ...params,
        id: existing.id,
        demoCreatedAt: existing.demoCreatedAt,
        demoUpdatedAt: demoTs,
      });
    } else {
      // Create new alert for this condition
      newOrUpdatedAlerts.push({
        ...params,
        id: generateId('alert'),
        demoCreatedAt: demoTs,
        demoUpdatedAt: demoTs,
      });
    }
  }

  // Track which stable keys are still active
  const activeKeys = new Set<string>();

  // ========================
  // POND-LEVEL ALERTS
  // ========================
  for (const pond of ponds) {
    if (!pond.setupComplete) {
      const key = `setup-incomplete-${pond.id}`;
      activeKeys.add(key);
      upsertAlert({
        stableKey: key,
        pondId: pond.id,
        category: 'SYSTEM',
        severity: 'WARNING',
        title: `${pond.name} Setup Incomplete`,
        description: `Pond ${pond.id} is missing configuration required for feeding recommendations.`,
        observation: 'Pond configuration is incomplete',
        status: 'ACTIVE',
        readState: 'UNREAD',
        recommendedAction: 'Complete pond setup to enable feeding recommendations.',
        relatedMealId: null,
        relatedWaterReadingId: null,
        relatedBatchId: null,
        relatedPondId: pond.id,
        resolutionCondition: 'Pond setup is complete',
        resolvedAt: null,
        resolvedBy: null,
        dismissedAt: null,
        dismissedReason: null,
      });
    }

    // Water alerts
    if (pond.water?.current) {
      const reading = pond.water.current;
      const doVal = reading.dissolvedOxygen;
      const temp = reading.temperature;
      const species = pond.speciesId ? SPECIES_CONFIGS[pond.speciesId] : null;
      const prefs = species?.waterPreferences;

      if (prefs && doVal !== null) {
        if (
          temp !== null &&
          temp > prefs.criticalTempMax &&
          doVal < prefs.criticalDOMin &&
          pond.water.activity === 'LETHARGIC'
        ) {
          const key = `combined-water-stress-${pond.id}`;
          activeKeys.add(key);
          upsertAlert({
            stableKey: key,
            pondId: pond.id,
            category: 'WATER',
            severity: 'CRITICAL',
            title: `Combined Environmental Stress — ${pond.name}`,
            description: `High temperature, critical dissolved oxygen, and lethargic fish activity are present together.`,
            observation: `Temperature: ${temp}°C; DO: ${doVal} mg/L; activity: ${pond.water.activity}`,
            status: 'ACTIVE',
            readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
            recommendedAction: 'Initiate aeration immediately, stop feeding, and remeasure water before reassessment.',
            relatedMealId: null,
            relatedWaterReadingId: reading.id,
            relatedBatchId: null,
            relatedPondId: pond.id,
            resolutionCondition: 'Temperature, dissolved oxygen, and fish activity return to safe ranges',
            resolvedAt: null,
            resolvedBy: null,
            dismissedAt: null,
            dismissedReason: null,
          });
        }

        if (doVal < Math.max(prefs.criticalDOMin, CRITICAL_DO_THRESHOLD)) {
          const key = `low-do-critical-${pond.id}`;
          activeKeys.add(key);
          upsertAlert({
            stableKey: key,
            pondId: pond.id,
            category: 'WATER',
            severity: 'CRITICAL',
            title: `Critical Low DO — ${pond.name}`,
            description: `Dissolved oxygen is critically low at ${doVal} mg/L.`,
            observation: `DO: ${doVal} mg/L (critical threshold: ${Math.max(prefs.criticalDOMin, CRITICAL_DO_THRESHOLD)} mg/L)`,
            status: 'ACTIVE',
            readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
            recommendedAction: 'Check aeration immediately. Do not feed until DO recovers.',
            relatedMealId: null,
            relatedWaterReadingId: reading.id,
            relatedBatchId: null,
            relatedPondId: pond.id,
            resolutionCondition: `DO rises above ${Math.max(prefs.criticalDOMin, CRITICAL_DO_THRESHOLD)} mg/L`,
            resolvedAt: null,
            resolvedBy: null,
            dismissedAt: null,
            dismissedReason: null,
          });
        } else if (doVal < prefs.fullFeedingDOMin) {
          const key = `low-do-${pond.id}`;
          activeKeys.add(key);
          upsertAlert({
            stableKey: key,
            pondId: pond.id,
            category: 'WATER',
            severity: 'WARNING',
            title: `Low Dissolved Oxygen — ${pond.name}`,
            description: `DO is ${doVal} mg/L, below full-feeding threshold of ${prefs.fullFeedingDOMin} mg/L.`,
            observation: `DO: ${doVal} mg/L (full-feed threshold: ${prefs.fullFeedingDOMin} mg/L)`,
            status: 'ACTIVE',
            readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
            recommendedAction: 'Investigate water quality. Consider reducing feeding.',
            relatedMealId: null,
            relatedWaterReadingId: reading.id,
            relatedBatchId: null,
            relatedPondId: pond.id,
            resolutionCondition: `DO rises above ${prefs.fullFeedingDOMin} mg/L`,
            resolvedAt: null,
            resolvedBy: null,
            dismissedAt: null,
            dismissedReason: null,
          });
        }
      }

      if (prefs && pond.water.trend.rapidRise) {
        const key = `rapid-temp-rise-${pond.id}`;
        activeKeys.add(key);
        upsertAlert({
          stableKey: key,
          pondId: pond.id,
          category: 'WATER',
          severity: 'WARNING',
          title: `Rapid Temperature Rise — ${pond.name}`,
          description: `Temperature rising rapidly. Monitor conditions closely.`,
          observation: `Temp: ${temp}°C, rising ${pond.water.trend.rapidRiseDelta?.toFixed(1)}°C`,
          status: 'ACTIVE',
          readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
          recommendedAction: 'Monitor temperature trend. Check aeration.',
          relatedMealId: null,
          relatedWaterReadingId: reading.id,
          relatedBatchId: null,
          relatedPondId: pond.id,
          resolutionCondition: 'Temperature stabilizes',
          resolvedAt: null,
          resolvedBy: null,
          dismissedAt: null,
          dismissedReason: null,
        });
      }

      const readingAgeMinutes = (demoNow.getTime() - new Date(reading.demoTimestamp).getTime()) / 60000;
      if (reading.quality === 'STALE' || readingAgeMinutes > STALE_READING_MINUTES) {
        const key = `stale-water-reading-${pond.id}`;
        activeKeys.add(key);
        upsertAlert({
          stableKey: key,
          pondId: pond.id,
          category: 'WATER',
          severity: 'WARNING',
          title: `Stale Water Data — ${pond.name}`,
          description: `The latest water measurement is ${Math.max(0, Math.floor(readingAgeMinutes))} minutes old.`,
          observation: `Last measurement: ${new Date(reading.demoTimestamp).toLocaleString('en-IN')}`,
          status: 'ACTIVE',
          readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
          recommendedAction: 'Remeasure water quality before feeding or changing the feeding plan.',
          relatedMealId: null,
          relatedWaterReadingId: reading.id,
          relatedBatchId: null,
          relatedPondId: pond.id,
          resolutionCondition: 'A fresh water reading is recorded',
          resolvedAt: null,
          resolvedBy: null,
          dismissedAt: null,
          dismissedReason: null,
        });
      }
    }

    const latestResponseMeal = pond.feedingRecords
      .filter(meal => meal.confirmed && meal.feedingResponse !== null)
      .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime())[0];

    // Feeding alerts
    for (const meal of pond.feedingRecords) {
      if (meal.id === latestResponseMeal?.id && (meal.feedingResponse === 'POOR' || meal.feedingResponse === 'REFUSED')) {
        const key = `poor-feeding-response-${meal.id}`;
        activeKeys.add(key);
        upsertAlert({
          stableKey: key,
          pondId: pond.id,
          category: 'FEEDING',
          severity: 'WARNING',
          title: `Poor Feeding Response — ${pond.name}`,
          description: `${meal.feedingResponse === 'REFUSED' ? 'Feed was refused' : 'Fish fed poorly'} during the recorded meal${meal.uneatenQuantityKg ? `; ${meal.uneatenQuantityKg} kg was uneaten` : ''}.`,
          observation: `Meal ${new Date(meal.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}; response: ${meal.feedingResponse}; uneaten: ${meal.uneatenQuantityKg ?? 0} kg`,
          status: 'ACTIVE',
          readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
          recommendedAction: 'Check dissolved oxygen and other water conditions; review the reduced next-meal recommendation.',
          relatedMealId: meal.id,
          relatedWaterReadingId: pond.water?.current?.id ?? null,
          relatedBatchId: meal.assignedFeedBatchId,
          relatedPondId: pond.id,
          resolutionCondition: 'A subsequent feeding response is recorded and water conditions are reviewed',
          resolvedAt: null,
          resolvedBy: null,
          dismissedAt: null,
          dismissedReason: null,
        });
      }
      if (meal.id === latestResponseMeal?.id && (meal.uneatenQuantityKg ?? 0) > 0) {
        const key = `uneaten-feed-water-check-${meal.id}`;
        activeKeys.add(key);
        upsertAlert({
          stableKey: key,
          pondId: pond.id,
          category: 'WATER',
          severity: 'WARNING',
          title: `Uneaten Feed — Check Water Quality (${pond.name})`,
          description: `${meal.uneatenQuantityKg} kg of feed remained uneaten after the latest recorded meal.`,
          observation: `Meal response: ${meal.feedingResponse ?? 'not recorded'}; uneaten feed: ${meal.uneatenQuantityKg} kg`,
          status: 'ACTIVE',
          readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
          recommendedAction: 'Remove uneaten feed and recheck dissolved oxygen and water quality before the next meal.',
          relatedMealId: meal.id,
          relatedWaterReadingId: pond.water?.current?.id ?? null,
          relatedBatchId: meal.assignedFeedBatchId,
          relatedPondId: pond.id,
          resolutionCondition: 'Uneaten feed is addressed and the next water and feeding observations are reviewed',
          resolvedAt: null,
          resolvedBy: null,
          dismissedAt: null,
          dismissedReason: null,
        });
      }
      if (meal.status === 'OVERDUE' && !meal.confirmed) {
        const scheduledTime = new Date(meal.scheduledTime);
        const overdueMins = Math.round((demoNow.getTime() - scheduledTime.getTime()) / 60000);
        const key = `meal-overdue-${meal.id}`;
        activeKeys.add(key);
        upsertAlert({
          stableKey: key,
          pondId: pond.id,
          category: 'FEEDING',
          severity: 'WARNING',
          title: `Meal Overdue — ${pond.name}`,
          description: `${scheduledTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} meal has not been logged. ${overdueMins} minutes overdue.`,
          observation: `Scheduled: ${scheduledTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}, overdue by ${overdueMins} minutes`,
          status: 'ACTIVE',
          readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
          recommendedAction: 'Log the meal outcome now.',
          relatedMealId: meal.id,
          relatedWaterReadingId: null,
          relatedBatchId: null,
          relatedPondId: pond.id,
          resolutionCondition: 'Meal is logged',
          resolvedAt: null,
          resolvedBy: null,
          dismissedAt: null,
          dismissedReason: null,
        });
      }

      if (meal.status === 'READY' && !meal.confirmed) {
        const scheduledTime = new Date(meal.scheduledTime);
        const key = `meal-ready-${meal.id}`;
        activeKeys.add(key);
        upsertAlert({
          stableKey: key,
          pondId: pond.id,
          category: 'FEEDING',
          severity: 'INFO',
          title: `Meal Ready — ${pond.name}`,
          description: `${scheduledTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} meal is ready to feed.`,
          observation: `Ready to feed ${meal.recommendedQuantityKg} kg`,
          status: 'ACTIVE',
          readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
          recommendedAction: `Feed ${meal.recommendedQuantityKg} kg now.`,
          relatedMealId: meal.id,
          relatedWaterReadingId: null,
          relatedBatchId: null,
          relatedPondId: pond.id,
          resolutionCondition: 'Meal is logged',
          resolvedAt: null,
          resolvedBy: null,
          dismissedAt: null,
          dismissedReason: null,
        });
      }
    }

    // Growth sample due
    if (pond.growthRecords.length > 0) {
      const latest = pond.growthRecords[pond.growthRecords.length - 1];
      const lastDate = new Date(latest.samplingDate);
      const nextDue = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (demoNow >= nextDue) {
        const key = `growth-sample-due-${pond.id}`;
        activeKeys.add(key);
        upsertAlert({
          stableKey: key,
          pondId: pond.id,
          category: 'GROWTH',
          severity: 'INFO',
          title: `Growth Sample Due — ${pond.name}`,
          description: `Weekly growth sample is due for ${pond.name}.`,
          observation: `Last sampled: ${latest.samplingDate}`,
          status: 'ACTIVE',
          readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
          recommendedAction: 'Record a new growth sample to update biomass and feeding plan.',
          relatedMealId: null,
          relatedWaterReadingId: null,
          relatedBatchId: null,
          relatedPondId: pond.id,
          resolutionCondition: 'New growth sample is recorded',
          resolvedAt: null,
          resolvedBy: null,
          dismissedAt: null,
          dismissedReason: null,
        });
      }
    }
  }

  // ========================
  // INVENTORY ALERTS
  // ========================
  for (const batch of batches) {
    if (batch.isLowStock && !batch.archived) {
      const key = `low-stock-${batch.id}`;
      activeKeys.add(key);
      upsertAlert({
        stableKey: key,
        pondId: null,
        category: 'INVENTORY',
        severity: batch.quantityKg <= 0 ? 'CRITICAL' : 'WARNING',
        title: `${batch.quantityKg <= 0 ? 'Depleted' : 'Low Stock'} — ${batch.feedItemName}`,
        description: `${batch.sku} has ${batch.quantityKg.toFixed(1)} kg remaining against a minimum stock level of ${(batch.minimumStockKg ?? 50).toFixed(1)} kg.`,
        observation: `${batch.quantityKg.toFixed(1)} kg available`,
        status: 'ACTIVE',
        readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
        recommendedAction: 'Review compatible feed cover and record a stock receipt when replenishment arrives.',
        relatedMealId: null,
        relatedWaterReadingId: null,
        relatedBatchId: batch.id,
        relatedPondId: null,
        resolutionCondition: 'Usable stock is replenished above its minimum level',
        resolvedAt: null,
        resolvedBy: null,
        dismissedAt: null,
        dismissedReason: null,
      });
    }

    // Near expiry
    if (batch.isNearExpiry && !batch.isExpired) {
      const expiryDate = new Date(batch.expiryDate);
      const daysLeft = Math.round((expiryDate.getTime() - demoNow.getTime()) / (24 * 60 * 60 * 1000));
      const key = `near-expiry-${batch.id}`;
      activeKeys.add(key);
      upsertAlert({
        stableKey: key,
        pondId: null,
        category: 'INVENTORY',
        severity: 'WARNING',
        title: `Feed Expiring Soon — ${batch.feedItemName}`,
        description: `${batch.feedItemName} (SKU: ${batch.sku}) expires in ${daysLeft} days on ${batch.expiryDate}.`,
        observation: `${batch.quantityKg} kg remaining, expires ${batch.expiryDate}`,
        status: 'ACTIVE',
        readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
        recommendedAction: 'Use before expiry date or plan replacement order.',
        relatedMealId: null,
        relatedWaterReadingId: null,
        relatedBatchId: batch.id,
        relatedPondId: null,
        resolutionCondition: 'Stock is used or replaced',
        resolvedAt: null,
        resolvedBy: null,
        dismissedAt: null,
        dismissedReason: null,
      });
    }

    // Expired
    if (batch.isExpired) {
      const key = `expired-${batch.id}`;
      activeKeys.add(key);
      upsertAlert({
        stableKey: key,
        pondId: null,
        category: 'INVENTORY',
        severity: 'CRITICAL',
        title: `Feed Expired — ${batch.feedItemName}`,
        description: `${batch.feedItemName} (SKU: ${batch.sku}) expired on ${batch.expiryDate}. Do not use.`,
        observation: `Expired ${batch.expiryDate}`,
        status: 'ACTIVE',
        readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
        recommendedAction: 'Remove expired stock and arrange replacement.',
        relatedMealId: null,
        relatedWaterReadingId: null,
        relatedBatchId: batch.id,
        relatedPondId: null,
        resolutionCondition: 'Expired stock is removed',
        resolvedAt: null,
        resolvedBy: null,
        dismissedAt: null,
        dismissedReason: null,
      });
    }

    // Stock shortage per assigned pond
    if (batch.assignedPondIds.length > 0 && !batch.isExpired) {
      const assignedPonds = ponds.filter(p => batch.assignedPondIds.includes(p.id));
      for (const pond of assignedPonds) {
        const species = pond.speciesId ? SPECIES_CONFIGS[pond.speciesId] : null;
        const feedingRate = species && pond.growthStage ? 
          (species.stageFeedingRates[pond.growthStage] || 0) : 0;
        const biomass = pond.biomassKg || 0;
        const dailyDemand = biomass * feedingRate;
        
        if (dailyDemand > 0) {
          const runway = calculateFeedRunway(batch.quantityKg, dailyDemand);
          const forecast7 = calculateFeedForecast(
            Math.round(dailyDemand * 10) / 10, 7
          );
          const shortfall = calculateStockShortfall(forecast7, batch.quantityKg);
          
          if (runway < LOW_STOCK_THRESHOLD_DAYS) {
            const key = `stock-short-${batch.id}-${pond.id}`;
            activeKeys.add(key);
            upsertAlert({
              stableKey: key,
              pondId: pond.id,
              category: 'INVENTORY',
              severity: runway < 3 ? 'CRITICAL' : 'WARNING',
              title: `Low Stock — ${batch.feedItemName} for ${pond.name}`,
              description: `Only ${runway.toFixed(1)} days of stock remaining for ${pond.name}. 7-day shortfall: ${shortfall.toFixed(1)} kg.`,
              observation: `${batch.quantityKg} kg available, daily demand ${dailyDemand.toFixed(1)} kg/day`,
              status: 'ACTIVE',
              readState: findExistingByKey(existingAlerts, key)?.readState ?? 'UNREAD',
              recommendedAction: `Order at least ${Math.ceil(shortfall / 40) * 40} kg to cover 7-day demand.`,
              relatedMealId: null,
              relatedWaterReadingId: null,
              relatedBatchId: batch.id,
              relatedPondId: pond.id,
              resolutionCondition: 'Stock is replenished to cover planned demand',
              resolvedAt: null,
              resolvedBy: null,
              dismissedAt: null,
              dismissedReason: null,
            });
          }
        }
      }
    }
  }

  // Resolve alerts whose conditions are no longer active
  for (const existing of existingAlerts.filter(a => a.status === 'ACTIVE')) {
    if (!activeKeys.has(existing.stableKey)) {
      // Condition no longer active - auto-resolve
      alerts.push({
        ...existing,
        status: 'RESOLVED',
        resolvedAt: demoTs,
        resolvedBy: 'system',
        demoUpdatedAt: demoTs,
      });
    }
  }

  return [...alerts, ...newOrUpdatedAlerts];
}
