/**
 * Species configurations - illustrative demo values only.
 * Not validated aquaculture recommendations.
 */

import type { SpeciesConfig } from '../types/pond';

export const SPECIES_CONFIGS: Record<string, SpeciesConfig> = {
  'nile-tilapia': {
    id: 'nile-tilapia',
    name: 'Nile Tilapia',
    scientificName: 'Oreochromis niloticus',
    stageFeedingRates: {
      fry: 0.05,       // 5% of biomass
      fingerling: 0.0325, // 3.25% of biomass
      'grow-out': 0.02,   // 2%
    },
    stageThresholds: [
      { stage: 'fry', label: 'Fry', minWeightGrams: 0, maxWeightGrams: 5 },
      { stage: 'fingerling', label: 'Fingerling', minWeightGrams: 5, maxWeightGrams: 50 },
      { stage: 'grow-out', label: 'Grow-out', minWeightGrams: 50, maxWeightGrams: null },
    ],
    waterPreferences: {
      preferredTempMin: 26,
      preferredTempMax: 30,
      criticalTempMax: 35,
      fullFeedingDOMin: 5.0,
      reducedFeedingDOMin: 3.0,
      criticalDOMin: 2.0,
      preferredPHMin: 6.5,
      preferredPHMax: 8.5,
      rapidRiseTempDelta: 1.0,
      implausibleTempDelta: 5.0,
      implausibleDOMax: 20,
      implausibleDOMin: 0,
    },
    compatibleFeedItems: ['floating-fish-pellet', 'tilapia-grower-crumbles', 'nursery-fry-meal'],
  },
  'rohu': {
    id: 'rohu',
    name: 'Rohu',
    scientificName: 'Labeo rohita',
    stageFeedingRates: {
      fingerling: 0.03,
      'grow-out': 0.025,
    },
    stageThresholds: [
      { stage: 'fingerling', label: 'Fingerling', minWeightGrams: 0, maxWeightGrams: 50 },
      { stage: 'grow-out', label: 'Grow-out', minWeightGrams: 50, maxWeightGrams: null },
    ],
    waterPreferences: {
      preferredTempMin: 25,
      preferredTempMax: 32,
      criticalTempMax: 36,
      fullFeedingDOMin: 4.5,
      reducedFeedingDOMin: 3.0,
      criticalDOMin: 1.5,
      preferredPHMin: 6.5,
      preferredPHMax: 8.5,
      rapidRiseTempDelta: 1.0,
      implausibleTempDelta: 5.0,
      implausibleDOMax: 20,
      implausibleDOMin: 0,
    },
    compatibleFeedItems: ['sinking-catfish-pellets'],
  },
  'catla': {
    id: 'catla',
    name: 'Catla',
    scientificName: 'Catla catla',
    stageFeedingRates: {
      fingerling: 0.03,
      'grow-out': 0.025,
    },
    stageThresholds: [
      { stage: 'fingerling', label: 'Fingerling', minWeightGrams: 0, maxWeightGrams: 50 },
      { stage: 'grow-out', label: 'Grow-out', minWeightGrams: 50, maxWeightGrams: null },
    ],
    waterPreferences: {
      preferredTempMin: 25,
      preferredTempMax: 32,
      criticalTempMax: 36,
      fullFeedingDOMin: 4.5,
      reducedFeedingDOMin: 3.0,
      criticalDOMin: 1.5,
      preferredPHMin: 6.5,
      preferredPHMax: 8.5,
      rapidRiseTempDelta: 1.0,
      implausibleTempDelta: 5.0,
      implausibleDOMax: 20,
      implausibleDOMin: 0,
    },
    // NOTE: Tilapia Grower Crumbles assigned as demo config - not a validated recommendation
    compatibleFeedItems: ['tilapia-grower-crumbles'],
  },
  'common-carp': {
    id: 'common-carp',
    name: 'Common Carp',
    scientificName: 'Cyprinus carpio',
    stageFeedingRates: {
      fingerling: 0.03,
      'grow-out': 0.02,
    },
    stageThresholds: [
      { stage: 'fingerling', label: 'Fingerling', minWeightGrams: 0, maxWeightGrams: 50 },
      { stage: 'grow-out', label: 'Grow-out', minWeightGrams: 50, maxWeightGrams: null },
    ],
    waterPreferences: {
      preferredTempMin: 20,
      preferredTempMax: 30,
      criticalTempMax: 35,
      fullFeedingDOMin: 4.0,
      reducedFeedingDOMin: 2.5,
      criticalDOMin: 1.5,
      preferredPHMin: 6.5,
      preferredPHMax: 8.5,
      rapidRiseTempDelta: 1.0,
      implausibleTempDelta: 5.0,
      implausibleDOMax: 20,
      implausibleDOMin: 0,
    },
    compatibleFeedItems: ['sinking-catfish-pellets', 'tilapia-grower-crumbles'],
  },
};

export const FEEDING_WINDOW_CONFIG = {
  upcomingStartMinutes: 60,
  readyStartMinutes: 30,
  readyEndMinutes: 15,
  overdueAfterMinutes: 15,
};

export const STALE_READING_MINUTES = 30;
export const UNAVAILABLE_READING_MINUTES = 120;
export const CRITICAL_DO_THRESHOLD = 3.5;
export const MORTALITY_SPIKE_THRESHOLD_PERCENT = 0.5; // per day
export const LOW_STOCK_THRESHOLD_DAYS = 7; // days of runway
export const NEAR_EXPIRY_DAYS = 30;
export const DEFAULT_BAG_SIZE_KG = 40;
export const SAMPLING_INTERVAL_DAYS = 7;

export const DEMO_FARM_NAME = 'Sangli Aqua Farm';
export const DEMO_INITIAL_TIME = '2026-10-08T13:38:00';
export const STATE_VERSION = '1.0.0';
