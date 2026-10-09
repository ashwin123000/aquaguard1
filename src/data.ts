// src/data.ts
import feedingTablesRaw from './data/feeding_tables.json';
import stageProfilesRaw from './data/stage_profiles.json';

export const FEEDING_TABLES = feedingTablesRaw;
export const STAGE_PROFILES = stageProfilesRaw;

export interface SpeciesConfig {
  id: string;
  name: string;
  category: 'Fish' | 'Shrimp' | 'Other';
  tableId: string | null;
  hasReferenceTable: boolean;
  scientificName: string;
  expectedFCR?: number;
}

export const SPECIES_LIST: SpeciesConfig[] = [
  { id: 'nile_tilapia', name: 'Nile Tilapia', scientificName: 'Oreochromis niloticus', category: 'Fish', tableId: 'tilapia_fao_t28', hasReferenceTable: true, expectedFCR: 1.35 },
  { id: 'common_carp', name: 'Common Carp', scientificName: 'Cyprinus carpio', category: 'Fish', tableId: 'carp_coche', hasReferenceTable: true, expectedFCR: 1.4 },
  { id: 'rainbow_trout', name: 'Rainbow Trout', scientificName: 'Oncorhynchus mykiss', category: 'Fish', tableId: 'trout_dry_nrc1981', hasReferenceTable: true, expectedFCR: 1.2 },
  { id: 'black_tiger_shrimp', name: 'Black Tiger Shrimp', scientificName: 'Penaeus monodon', category: 'Shrimp', tableId: 'shrimp_pmonodon_hanaqua1984', hasReferenceTable: true, expectedFCR: 1.6 },
  { id: 'rohu', name: 'Rohu', scientificName: 'Labeo rohita', category: 'Fish', tableId: null, hasReferenceTable: false, expectedFCR: 1.3 },
  { id: 'catla', name: 'Catla', scientificName: 'Gibelion catla', category: 'Fish', tableId: null, hasReferenceTable: false, expectedFCR: 1.3 },
  { id: 'mrigal', name: 'Mrigal', scientificName: 'Cirrhinus mrigala', category: 'Fish', tableId: null, hasReferenceTable: false, expectedFCR: 1.3 },
  { id: 'grass_carp', name: 'Grass Carp', scientificName: 'Ctenopharyngodon idella', category: 'Fish', tableId: null, hasReferenceTable: false, expectedFCR: 1.35 },
  { id: 'silver_carp', name: 'Silver Carp', scientificName: 'Hypophthalmichthys molitrix', category: 'Fish', tableId: null, hasReferenceTable: false, expectedFCR: 1.35 },
  { id: 'pangasius', name: 'Pangasius', scientificName: 'Pangasianodon hypophthalmus', category: 'Fish', tableId: null, hasReferenceTable: false, expectedFCR: 1.4 },
  { id: 'magur', name: 'Magur', scientificName: 'Clarias magur', category: 'Fish', tableId: null, hasReferenceTable: false, expectedFCR: 1.5 },
  { id: 'barramundi', name: 'Barramundi (Asian Seabass)', scientificName: 'Lates calcarifer', category: 'Fish', tableId: null, hasReferenceTable: false, expectedFCR: 1.5 },
  { id: 'vannamei_shrimp', name: 'Vannamei Shrimp', scientificName: 'Penaeus vannamei', category: 'Shrimp', tableId: null, hasReferenceTable: false, expectedFCR: 1.55 },
  { id: 'other', name: 'Other Species (Custom)', scientificName: 'Custom species', category: 'Other', tableId: null, hasReferenceTable: false, expectedFCR: 1.4 },
];

export const PLACEHOLDER_LIMITS = {
  oxygen: {
    stopLevelMgL: 3.0,
    fullFeedingLevelMgL: 5.0,
    unit: 'mg/L',
    status: 'placeholder',
    badgeText: 'Placeholder, expert review needed',
  },
  temperature: {
    feedingMinC: 20.0,
    optimumMinC: 27.0,
    optimumMaxC: 32.0,
    feedingMaxC: 35.0,
    unit: '°C',
    status: 'placeholder',
    badgeText: 'Placeholder, expert review needed',
  },
  tgc: {
    value: 1.0,
    status: 'placeholder',
    badgeText: 'Placeholder, calibrate per pond',
    note: 'TGC = 1.0 is an illustrative placeholder, not a measured species constant.',
  },
  fcr: {
    expectedValue: 1.35,
    status: 'placeholder',
    badgeText: 'Placeholder, expert review needed',
  },
};

// Placeholder sample stages for species without an imported reference table
export const FALLBACK_SAMPLE_STAGES = [
  { stage: 'Fry / Nursery', weight_min_g: 0, weight_max_g: 15, feed_type: 'Feed X (Starter)', pellet_size_mm: 1.2, rate_pct_high: 8.0, rate_pct_low: 5.0, meals_per_day: 4, meal_times: ['07:00 AM', '11:00 AM', '02:30 PM', '06:00 PM'] },
  { stage: 'Fingerling', weight_min_g: 15, weight_max_g: 50, feed_type: 'Feed Y (Grower)', pellet_size_mm: 2.0, rate_pct_high: 4.5, rate_pct_low: 3.2, meals_per_day: 3, meal_times: ['08:00 AM', '01:00 PM', '05:30 PM'] },
  { stage: 'Juvenile', weight_min_g: 50, weight_max_g: 150, feed_type: 'Feed Y (Grower)', pellet_size_mm: 2.5, rate_pct_high: 3.5, rate_pct_low: 2.5, meals_per_day: 2, meal_times: ['09:00 AM', '04:30 PM'] },
  { stage: 'Grower / Market', weight_min_g: 150, weight_max_g: null, feed_type: 'Feed Z (Finisher)', pellet_size_mm: 3.5, rate_pct_high: 2.5, rate_pct_low: 1.5, meals_per_day: 2, meal_times: ['09:00 AM', '04:30 PM'] },
];

// Feed Products Inventory Placeholders
export const INITIAL_FEED_INVENTORY = [
  {
    id: 'feed_x',
    codeName: 'Feed X',
    feedType: 'Starter Crumble / Pellets',
    pelletSizeMm: 2.0,
    stockOnHandKg: 140.0,
    dailyUsageKg: 10.0,
    daysLeft: 14.0,
    status: 'OK',
    isShortStock: false,
    suggestedSwap: null,
  },
  {
    id: 'feed_y',
    codeName: 'Feed Y',
    feedType: 'Grower Pellets',
    pelletSizeMm: 3.0,
    stockOnHandKg: 12.5, // Low stock: < 3 days left
    dailyUsageKg: 7.5,
    daysLeft: 1.6,
    status: 'Stock short',
    isShortStock: true,
    suggestedSwap: 'Feed Z (Finisher 3.5mm Mix)',
  },
  {
    id: 'feed_z',
    codeName: 'Feed Z',
    feedType: 'Finisher Pellets',
    pelletSizeMm: 4.0,
    stockOnHandKg: 310.0,
    dailyUsageKg: 12.0,
    daysLeft: 25.8,
    status: 'OK',
    isShortStock: false,
    suggestedSwap: null,
  },
];

// Diurnal Oxygen Outlook Curve (Lowest before dawn, peak mid-afternoon, falling evening)
export const HOURLY_OXYGEN_OUTLOOK = [
  { hour: '04:00', predictedDO: 3.2, safety: 'Avoid', reason: 'Pre-dawn respiration trough' },
  { hour: '06:00', predictedDO: 3.8, safety: 'Avoid', reason: 'Early morning sunlight ramping' },
  { hour: '08:00', predictedDO: 5.4, safety: 'Safe', reason: 'Photosynthesis active, DO ≥ 5.0' },
  { hour: '10:00', predictedDO: 6.2, safety: 'Safe', reason: 'Optimal feeding window' },
  { hour: '12:00', predictedDO: 6.9, safety: 'Safe', reason: 'High daytime oxygen saturation' },
  { hour: '14:00', predictedDO: 7.2, safety: 'Safe', reason: 'Peak afternoon oxygen' },
  { hour: '16:00', predictedDO: 5.8, safety: 'Safe', reason: 'Evening safe feeding window' },
  { hour: '18:00', predictedDO: 4.3, safety: 'Caution', reason: 'Declining sunlight, DO dropping' },
  { hour: '20:00', predictedDO: 3.6, safety: 'Avoid', reason: 'Night-time respiration drop' },
];

// Weather Forecast Data (Now + next 3 days)
export const WEATHER_FORECAST = [
  { day: 'Today', condition: 'Sunny & Warm', tempC: 29.5, icon: 'sun', alert: null },
  { day: 'Tomorrow', condition: 'Cloudy with Light Rain', tempC: 27.0, icon: 'cloud-rain', alert: 'Cloudy: DO may drop' },
  { day: 'Day 3', condition: 'Overcast & Humid', tempC: 26.5, icon: 'cloud', alert: 'Low sunlight' },
  { day: 'Day 4', condition: 'Hot & Calm', tempC: 33.0, icon: 'sun-medium', alert: 'Thermal stress risk' },
];

export const DISCLAIMER_NOTE = "Decision support only. Not a guarantee.";
