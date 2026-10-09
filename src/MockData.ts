// src/MockData.ts

export type VerificationStatus = 'placeholder' | 'reviewed' | 'verified';
export type OxygenStatus = 'Safe' | 'Reduced' | 'Stop';
export type PondStatus = 'OK' | 'Watch' | 'Alert';
export type MealStatus = 'Pending' | 'Given' | 'Reduced' | 'Skipped';
export type FarmerAction = 'Pending' | 'Accepted' | 'Edited' | 'Dismissed';
export type UserRole = 'Manager' | 'FeedingStaff';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type WeatherType = 'Sunny' | 'Cloudy' | 'Rainy' | 'Cold' | 'Hot and calm';
export type AlertCategory = 'water_change' | 'low_oxygen' | 'extreme_condition';

export interface ParameterMetadata<T> {
  value: T;
  unit?: string;
  status: VerificationStatus;
  source?: string;
}

export interface SpeciesProfile {
  species: string;
  version: string;
  status: VerificationStatus;
  source?: string;
  oxygenStopLevel: ParameterMetadata<number>;
  oxygenFullFeedingLevel: ParameterMetadata<number>;
  tempMin: number;
  tempOptimumRange: ParameterMetadata<[number, number]>;
  tempMax: number;
  startingTGC: ParameterMetadata<number>;
  expectedFCR: number;
}

export interface GrowthStage {
  name: string;
  weightRangeG: [number, number];
  feedRatePercent: number;
  pelletSizeMm: number;
  mealsPerDay: number;
  mealTimes: string[];
}

export interface Pond {
  id: string;
  name: string;
  systemType: string;
  stageName: string;
  avgWeightG: number;
  count: number;
  biomassKg: number;
  latestDO: number; // mg/L
  latestTemp: number; // °C
  oxygenStatus: OxygenStatus;
  pondStatus: PondStatus;
  x: number; // map coordinate / lat
  y: number; // map coordinate / lng
  priorityScore: number; // higher = urgent
}

export interface Meal {
  id: string;
  pondId: string;
  sessionName?: string;
  time: string;
  feedType: string;
  pelletSizeMm?: number;
  plannedKg: number;
  adjustedKg: number;
  actualKg?: number;
  status: MealStatus;
  doAtMeal: number;
  leftoverKg?: number;
  leftover?: 'none' | 'a little' | 'a lot';
  reason?: string;
  feedBatchId?: string;
}

export interface FeedBatch {
  id: string;
  brand: string;
  type: string;
  pelletSizeMm: number;
  proteinPercent: number;
  batchNumber: string;
  stockOnHandKg: number;
  daysOfStockLeft: number; // < 3 triggers "Stock short" warning
  expiry: string;
  medicated: boolean;
}

export interface Advice {
  id: string;
  pondId: string;
  rule: string;
  suggestion: string;
  reason: string;
  farmerAction: FarmerAction;
}

export interface Alert {
  id: string;
  pondId: string;
  type: string;
  severity: AlertSeverity;
  time: string;
  acknowledged: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface WeeklySample {
  pondId: string;
  date: string;
  sampleSize: number;
  meanWeightG: number;
  predictedWeightG: number;
}

export interface AutomatedAlert {
  id: string;
  category: AlertCategory;
  title: string;
  message: string;
  actionRequired: string;
  severity: 'high' | 'critical' | 'medium';
  timestampText: string;
}

export interface SpeciesOption {
  id: string;
  name: string;
  category: 'Fish' | 'Shrimp' | 'Other';
  oxygenStopLevel: number;
  oxygenFullFeedingLevel: number;
  tempOptimumRange: [number, number];
  expectedFCR: number;
  status: VerificationStatus;
}

export interface FarmSetup {
  farmName: string;
  pondName: string;
  speciesId: string;
  customSpeciesName?: string;
  stockingDate: string;
  stockCount: number;
  startingWeightG: number;
  currentEstimatedWeightG: number;
  currentStageName: string;
}

// Aliases for component imports
export type MealItem = Meal;
export type AdviceItem = Advice;
export type SampleWeighRecord = { id: string; date: string; predictedWeightG: number; realWeightG: number };

// --- 1. MOCK SPECIES PROFILE ---
export const mockSpeciesProfile: SpeciesProfile = {
  species: 'Nile tilapia (Oreochromis niloticus)',
  version: '1.0.4-pilot',
  status: 'reviewed',
  source: 'Nile tilapia yield-gap review',
  oxygenStopLevel: {
    value: 3.0,
    unit: 'mg/L',
    status: 'placeholder',
    // No source provided for placeholder stop level
  },
  oxygenFullFeedingLevel: {
    value: 5.0,
    unit: 'mg/L',
    status: 'reviewed',
    source: 'Nile tilapia yield-gap review',
  },
  tempMin: 20.0,
  tempOptimumRange: {
    value: [27.0, 32.0],
    unit: '°C',
    status: 'reviewed',
    source: 'Nile tilapia yield-gap review',
  },
  tempMax: 36.0,
  startingTGC: {
    value: 0.015,
    status: 'placeholder',
    // No source provided for placeholder starting TGC
  },
  expectedFCR: 1.35,
};

// --- 2. MOCK STAGES ---
export const mockStages: GrowthStage[] = [
  {
    name: 'Fry / Nursery',
    weightRangeG: [0.5, 15.0],
    feedRatePercent: 8.0,
    pelletSizeMm: 1.2,
    mealsPerDay: 4,
    mealTimes: ['07:00 AM', '11:00 AM', '02:30 PM', '06:00 PM'],
  },
  {
    name: 'Fingerling',
    weightRangeG: [15.0, 50.0],
    feedRatePercent: 3.5,
    pelletSizeMm: 2.0,
    mealsPerDay: 3,
    mealTimes: ['08:00 AM', '01:00 PM', '05:30 PM'],
  },
  {
    name: 'Growout / Market',
    weightRangeG: [50.0, 500.0],
    feedRatePercent: 2.2,
    pelletSizeMm: 3.5,
    mealsPerDay: 2,
    mealTimes: ['09:00 AM', '04:00 PM'],
  },
];

// --- 3. MOCK PONDS (5 ponds with Sangli coordinates 16.8524, 74.5815) ---
export const mockPonds: Pond[] = [
  {
    id: 'p1',
    name: 'Sangli Pond A1',
    systemType: 'Earthen Pond (Semi-Intensive)',
    stageName: 'Fingerling',
    avgWeightG: 42.0,
    count: 15000,
    biomassKg: 630,
    latestDO: 5.4,
    latestTemp: 29.5,
    oxygenStatus: 'Safe',
    pondStatus: 'OK',
    x: 16.8524,
    y: 74.5815,
    priorityScore: 12,
  },
  {
    id: 'p2',
    name: 'Sangli Pond A2',
    systemType: 'Earthen Pond (High-Density)',
    stageName: 'Growout / Market',
    avgWeightG: 180.0,
    count: 12000,
    biomassKg: 2160,
    latestDO: 2.7, // Critical Low DO!
    latestTemp: 31.2,
    oxygenStatus: 'Stop',
    pondStatus: 'Alert',
    x: 16.8535,
    y: 74.5828,
    priorityScore: 98,
  },
  {
    id: 'p3',
    name: 'Sangli Pond B1',
    systemType: 'HDPE Lined Pond',
    stageName: 'Fingerling',
    avgWeightG: 38.5,
    count: 18000,
    biomassKg: 693,
    latestDO: 4.1, // Sub-optimal DO
    latestTemp: 28.5,
    oxygenStatus: 'Reduced',
    pondStatus: 'Watch',
    x: 16.8512,
    y: 74.5802,
    priorityScore: 65,
  },
  {
    id: 'p4',
    name: 'Sangli Pond B2',
    systemType: 'Earthen Pond',
    stageName: 'Fry / Nursery',
    avgWeightG: 8.5,
    count: 35000,
    biomassKg: 297.5,
    latestDO: 5.8,
    latestTemp: 29.0,
    oxygenStatus: 'Safe',
    pondStatus: 'OK',
    x: 16.8541,
    y: 74.5835,
    priorityScore: 18,
  },
  {
    id: 'p5',
    name: 'Sangli Pond C1',
    systemType: 'Concrete Tank Biofloc',
    stageName: 'Growout / Market',
    avgWeightG: 240.0,
    count: 8000,
    biomassKg: 1920,
    latestDO: 6.2,
    latestTemp: 27.8,
    oxygenStatus: 'Safe',
    pondStatus: 'OK',
    x: 16.8505,
    y: 74.5790,
    priorityScore: 8,
  },
];

// --- 4. MOCK MEALS (8 meals across today) ---
export const mockMeals: Meal[] = [
  {
    id: 'm1',
    pondId: 'p1',
    sessionName: 'Morning Session',
    time: '08:00 AM',
    feedType: 'Feed Type X (Starter 2.0mm)',
    pelletSizeMm: 2.0,
    plannedKg: 7.3,
    adjustedKg: 7.3,
    actualKg: 7.3,
    status: 'Given',
    doAtMeal: 5.4,
    leftoverKg: 0,
    leftover: 'none',
  },
  {
    id: 'm2',
    pondId: 'p1',
    sessionName: 'Midday Session',
    time: '01:00 PM',
    feedType: 'Feed Type Y (Grower 3.0mm)',
    pelletSizeMm: 3.0,
    plannedKg: 7.3,
    adjustedKg: 7.3,
    status: 'Pending',
    doAtMeal: 5.2,
  },
  {
    id: 'm3',
    pondId: 'p1',
    sessionName: 'Evening Session',
    time: '05:30 PM',
    feedType: 'Feed Type Z (Finisher 4.0mm)',
    pelletSizeMm: 4.0,
    plannedKg: 7.3,
    adjustedKg: 7.3,
    status: 'Pending',
    doAtMeal: 5.1,
  },
  {
    id: 'm4',
    pondId: 'p2',
    sessionName: 'Morning Session',
    time: '09:00 AM',
    feedType: 'Feed Type Y (Grower 3.0mm)',
    pelletSizeMm: 3.0,
    plannedKg: 23.7,
    adjustedKg: 0.0,
    status: 'Skipped',
    doAtMeal: 2.7,
    reason: 'Safety Stop: DO 2.7 mg/L below 3.0 mg/L threshold',
  },
  {
    id: 'm5',
    pondId: 'p2',
    sessionName: 'Afternoon Session',
    time: '04:00 PM',
    feedType: 'Feed Type Y (Grower 3.0mm)',
    pelletSizeMm: 3.0,
    plannedKg: 23.7,
    adjustedKg: 23.7,
    status: 'Pending',
    doAtMeal: 3.2,
  },
  {
    id: 'm6',
    pondId: 'p3',
    sessionName: 'Morning Session',
    time: '08:00 AM',
    feedType: 'Feed Type X (Starter 2.0mm)',
    pelletSizeMm: 2.0,
    plannedKg: 8.0,
    adjustedKg: 5.6,
    actualKg: 5.6,
    status: 'Reduced',
    doAtMeal: 4.1,
    leftoverKg: 0.2,
    leftover: 'a little',
    reason: 'Caution: DO 4.1 mg/L scaled ration by 70%',
  },
  {
    id: 'm7',
    pondId: 'p3',
    sessionName: 'Midday Session',
    time: '01:00 PM',
    feedType: 'Feed Type Y (Grower 3.0mm)',
    pelletSizeMm: 3.0,
    plannedKg: 8.0,
    adjustedKg: 8.0,
    status: 'Pending',
    doAtMeal: 4.5,
  },
  {
    id: 'm8',
    pondId: 'p4',
    sessionName: 'Morning Session',
    time: '07:00 AM',
    feedType: 'Micro Pellets 1.2mm',
    pelletSizeMm: 1.2,
    plannedKg: 5.9,
    adjustedKg: 5.9,
    actualKg: 5.9,
    status: 'Given',
    doAtMeal: 5.8,
    leftoverKg: 0,
    leftover: 'none',
  },
];

// --- 5. MOCK FEED BATCHES (3 batches, 1 low stock warning) ---
export const mockFeedBatches: FeedBatch[] = [
  {
    id: 'b1',
    brand: 'AquaFeed Prime',
    type: 'Feed Type X (Starter 2.0mm)',
    pelletSizeMm: 2.0,
    proteinPercent: 32.0,
    batchNumber: 'LOT-2026-0811',
    stockOnHandKg: 140.0,
    daysOfStockLeft: 14,
    expiry: '2027-03-31',
    medicated: false,
  },
  {
    id: 'b2',
    brand: 'NutriShrimp Supreme',
    type: 'Feed Type Y (Grower 3.0mm)',
    pelletSizeMm: 3.0,
    proteinPercent: 28.0,
    batchNumber: 'LOT-2026-0419',
    stockOnHandKg: 14.5, // Low stock on hand!
    daysOfStockLeft: 2, // < 3 days left -> triggers "Stock short" warning
    expiry: '2026-12-15',
    medicated: false,
  },
  {
    id: 'b3',
    brand: 'AquaFeed Max',
    type: 'Feed Type Z (Finisher 4.0mm)',
    pelletSizeMm: 4.0,
    proteinPercent: 26.0,
    batchNumber: 'LOT-2026-0902',
    stockOnHandKg: 320.0,
    daysOfStockLeft: 35,
    expiry: '2027-06-30',
    medicated: false,
  },
];

// --- 6. MOCK ADVICE (4 items) ---
export const mockAdvice: Advice[] = [
  {
    id: 'adv1',
    pondId: 'p2',
    rule: 'Cloudy Weather Oxygen Drop',
    suggestion: 'Cloudy forecast for 3 days: reduce afternoon ration by 20% and shift feeding 45 mins earlier.',
    reason: 'Reduced sunlight limits algae photosynthesis, lowering afternoon DO generation.',
    farmerAction: 'Pending',
  },
  {
    id: 'adv2',
    pondId: 'p3',
    rule: 'Sub-Optimal Water Temp Adjustment',
    suggestion: 'Water temp 28.5°C: baseline ration approved with 30% oxygen scaling.',
    reason: 'High metabolic efficiency but oxygen level requires scaled portion.',
    farmerAction: 'Accepted',
  },
  {
    id: 'adv3',
    pondId: 'p1',
    rule: 'Leftover Accumulation Prevention',
    suggestion: 'No leftover detected yesterday: maintain full 7.3 kg ration for Morning Session.',
    reason: 'Optimal digestion and feed conversion efficiency.',
    farmerAction: 'Accepted',
  },
  {
    id: 'adv4',
    pondId: 'p5',
    rule: 'Biofloc Solids Management',
    suggestion: 'Biofloc density optimal: maintain standard feeding schedule.',
    reason: 'Stable microbial protein consumption.',
    farmerAction: 'Dismissed',
  },
];

// --- 7. MOCK ALERTS (4 items) ---
export const mockAlerts: Alert[] = [
  {
    id: 'alt1',
    pondId: 'p2',
    type: 'Critical Low DO Safety Stop',
    severity: 'critical',
    time: '08:45 AM',
    acknowledged: false,
  },
  {
    id: 'alt2',
    pondId: 'p3',
    type: 'Amber Oxygen Caution',
    severity: 'high',
    time: '08:00 AM',
    acknowledged: true,
  },
  {
    id: 'alt3',
    pondId: 'p2',
    type: 'Stock Short Warning: Feed Type Y',
    severity: 'medium',
    time: '07:30 AM',
    acknowledged: false,
  },
  {
    id: 'alt4',
    pondId: 'p1',
    type: 'Weekly Weighing Due',
    severity: 'low',
    time: 'Yesterday',
    acknowledged: true,
  },
];

// --- 8. MOCK USERS (2 users: Manager & FeedingStaff) ---
export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Rajesh Patil',
    role: 'Manager',
  },
  {
    id: 'u2',
    name: 'Sunil Kumar',
    role: 'FeedingStaff',
  },
];

// --- 9. MOCK WEEKLY SAMPLES (3 past entries) ---
export const mockWeeklySamples: WeeklySample[] = [
  {
    pondId: 'p1',
    date: '2026-09-15',
    sampleSize: 50,
    meanWeightG: 18.5,
    predictedWeightG: 18.0,
  },
  {
    pondId: 'p1',
    date: '2026-09-29',
    sampleSize: 50,
    meanWeightG: 31.0,
    predictedWeightG: 32.0,
  },
  {
    pondId: 'p1',
    date: '2026-10-06',
    sampleSize: 60,
    meanWeightG: 42.0,
    predictedWeightG: 40.0,
  },
];

// --- COMPATIBILITY EXPORTS FOR EXISTING SERVICES & COMPONENTS ---
export const SPECIES_LIST: SpeciesOption[] = [
  { id: 'nile_tilapia', name: mockSpeciesProfile.species, category: 'Fish', oxygenStopLevel: 3.0, oxygenFullFeedingLevel: 5.0, tempOptimumRange: [27, 32], expectedFCR: 1.35, status: 'reviewed' },
  { id: 'rohu', name: 'Rohu (Labeo rohita)', category: 'Fish', oxygenStopLevel: 3.0, oxygenFullFeedingLevel: 5.0, tempOptimumRange: [26, 31], expectedFCR: 1.5, status: 'placeholder' },
  { id: 'catla', name: 'Catla (Gibelion catla)', category: 'Fish', oxygenStopLevel: 3.0, oxygenFullFeedingLevel: 5.0, tempOptimumRange: [27, 32], expectedFCR: 1.5, status: 'placeholder' },
  { id: 'mrigal', name: 'Mrigal (Cirrhinus mrigala)', category: 'Fish', oxygenStopLevel: 3.0, oxygenFullFeedingLevel: 5.0, tempOptimumRange: [25, 30], expectedFCR: 1.6, status: 'placeholder' },
  { id: 'common_carp', name: 'Common Carp (Cyprinus carpio)', category: 'Fish', oxygenStopLevel: 2.5, oxygenFullFeedingLevel: 4.5, tempOptimumRange: [22, 28], expectedFCR: 1.4, status: 'placeholder' },
  { id: 'grass_carp', name: 'Grass Carp (Ctenopharyngodon idella)', category: 'Fish', oxygenStopLevel: 3.0, oxygenFullFeedingLevel: 5.0, tempOptimumRange: [24, 30], expectedFCR: 1.6, status: 'placeholder' },
  { id: 'silver_carp', name: 'Silver Carp (Hypophthalmichthys molitrix)', category: 'Fish', oxygenStopLevel: 3.0, oxygenFullFeedingLevel: 5.0, tempOptimumRange: [23, 29], expectedFCR: 1.4, status: 'placeholder' },
  { id: 'pangasius', name: 'Pangasius (Pangasianodon hypophthalmus)', category: 'Fish', oxygenStopLevel: 2.5, oxygenFullFeedingLevel: 4.5, tempOptimumRange: [28, 33], expectedFCR: 1.55, status: 'placeholder' },
  { id: 'magur', name: 'Magur (Clarias magur)', category: 'Fish', oxygenStopLevel: 2.0, oxygenFullFeedingLevel: 4.0, tempOptimumRange: [26, 32], expectedFCR: 1.3, status: 'placeholder' },
  { id: 'rainbow_trout', name: 'Rainbow Trout (Oncorhynchus mykiss)', category: 'Fish', oxygenStopLevel: 5.0, oxygenFullFeedingLevel: 7.0, tempOptimumRange: [12, 18], expectedFCR: 1.1, status: 'placeholder' },
  { id: 'barramundi', name: 'Barramundi / Asian Seabass (Lates calcarifer)', category: 'Fish', oxygenStopLevel: 3.5, oxygenFullFeedingLevel: 5.5, tempOptimumRange: [26, 32], expectedFCR: 1.3, status: 'placeholder' },
  { id: 'vannamei_shrimp', name: 'Vannamei Shrimp (Penaeus vannamei)', category: 'Shrimp', oxygenStopLevel: 3.5, oxygenFullFeedingLevel: 5.5, tempOptimumRange: [28, 32], expectedFCR: 1.25, status: 'placeholder' },
  { id: 'black_tiger_shrimp', name: 'Black Tiger Shrimp (Penaeus monodon)', category: 'Shrimp', oxygenStopLevel: 3.5, oxygenFullFeedingLevel: 5.5, tempOptimumRange: [27, 31], expectedFCR: 1.4, status: 'placeholder' },
  { id: 'other', name: 'Other Species (Custom Name)', category: 'Other', oxygenStopLevel: 3.0, oxygenFullFeedingLevel: 5.0, tempOptimumRange: [26, 32], expectedFCR: 1.4, status: 'placeholder' },
];

export const INITIAL_SETUP: FarmSetup = {
  farmName: 'Sangli Aqua Farm',
  pondName: mockPonds[0].name,
  speciesId: 'nile_tilapia',
  stockingDate: '2026-09-01',
  stockCount: mockPonds[0].count,
  startingWeightG: 5.0,
  currentEstimatedWeightG: mockPonds[0].avgWeightG,
  currentStageName: mockPonds[0].stageName,
};

export const INITIAL_MEALS: Meal[] = mockMeals;
export const INITIAL_ADVICE: Advice[] = mockAdvice;
export const INITIAL_WEIGH_RECORDS: SampleWeighRecord[] = mockWeeklySamples.map((s, i) => ({
  id: `w-${i + 1}`,
  date: s.date,
  predictedWeightG: s.predictedWeightG,
  realWeightG: s.meanWeightG,
}));

export const DEMO_ALERTS: AutomatedAlert[] = [
  {
    id: 'alt-water-change',
    category: 'water_change',
    title: 'Water Change Alert Required',
    message: 'Organic load and ammonia concentration elevated beyond 0.8 ppm threshold.',
    actionRequired: 'Initiate 20% water exchange immediately and increase aeration.',
    severity: 'high',
    timestampText: 'Auto-detected 2 min ago',
  },
  {
    id: 'alt-low-oxygen',
    category: 'low_oxygen',
    title: 'Critical Low Oxygen Alert',
    message: 'Dissolved Oxygen dropped to 2.7 mg/L (Below 3.0 mg/L safety stop limit).',
    actionRequired: 'Turn on emergency aerators. Feeding is automatically blocked.',
    severity: 'critical',
    timestampText: 'Auto-detected 1 min ago',
  },
  {
    id: 'alt-extreme-cond',
    category: 'extreme_condition',
    title: 'Extreme Weather & Temperature Warning',
    message: 'Water temp peaked at 34.8°C with hot calm weather (thermal stress zone).',
    actionRequired: 'Reduce feeding by 50% & deploy shade netting/paddle wheels.',
    severity: 'high',
    timestampText: 'Auto-detected just now',
  },
];

export const DISCLAIMER_NOTE = 'Decision support only. Not a guarantee.';
