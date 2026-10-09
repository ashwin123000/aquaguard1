// src/services/aquacultureService.ts
import {
  SPECIES_LIST,
  PLACEHOLDER_LIMITS,
  INITIAL_FEED_INVENTORY,
  type SpeciesConfig,
} from '../data';
import {
  determineStage,
  lookupFeedRate,
  calculateBiomass,
  calculateBaseRation,
  calculateFinalRation,
  generateDynamicSchedule,
  calculateDaysToNextStage,
  type StageInfo,
  type RateLookupResult,
} from '../calcEngine';

export interface FarmSetupData {
  farmName: string;
  pondName: string;
  speciesId: string;
  customSpeciesName?: string;
  stockingDate: string;
  stockCount: number;
  startingWeightG: number;
  currentWeightG: number;
  currentEstimatedWeightG: number;
  currentStageName: string;
}

export type MealStatusType = 'Pending' | 'Given' | 'Reduced' | 'Skipped';

export interface AppMealItem {
  id: string;
  sessionIndex: number;
  time: string;
  sessionName?: string;
  feedCode: 'Feed X' | 'Feed Y' | 'Feed Z';
  feedType: string;
  pelletSizeMm: number;
  plannedKg: number;
  adjustedKg: number;
  actualKg?: number;
  status: MealStatusType;
  predictedDO: number;
  doAtMeal?: number;
  isRescheduled: boolean;
  whyThisTime: string;
  skipReason?: string;
  pondId?: string;
}

export interface AppAdviceItem {
  id: string;
  category: 'weather' | 'oxygen' | 'leftover';
  title: string;
  suggestion: string;
  reason: string;
  maxMultiplier: number;
  farmerAction: 'Pending' | 'Accepted' | 'Dismissed' | 'Edited';
  rule?: string;
}

export interface AppAlertItem {
  id: string;
  category: 'low_oxygen' | 'water_change' | 'extreme_condition' | 'stock_short';
  title: string;
  message: string;
  actionRequired: string;
  severity: 'critical' | 'high' | 'medium';
  timestampText?: string;
}

class AquacultureService {
  private isOnboarded: boolean = false;
  private farmSetup: FarmSetupData = {
    farmName: 'Sangli Aqua Farm',
    pondName: 'Pond A1',
    speciesId: 'nile_tilapia',
    stockingDate: '2026-09-01',
    stockCount: 15000,
    startingWeightG: 40.0,
    currentWeightG: 40.0,
    currentEstimatedWeightG: 40.0,
    currentStageName: 'Fingerling',
  };

  // Check-in & telemetry state
  private deadFishToday: number = 0;
  private isCheckedInToday: boolean = false;

  private telemetry = {
    liveDO: 5.4, // mg/L
    liveTemp: 29.5, // °C
    timeOfDay: '08:15 AM',
    weatherCondition: 'Sunny & Warm',
    lastSyncText: 'Live sensor sync · 2 min ago',
    turbidityNtu: 22,
  };

  private leftoverFeedback: 'Fully eaten' | 'Some left' | 'Lots left' | null = null;
  private skippedMealIds: string[] = [];

  private meals: AppMealItem[] = [];
  private adviceList: AppAdviceItem[] = [
    {
      id: 'adv-1',
      category: 'weather',
      title: 'Afternoon Heat Forecast',
      suggestion: 'Trim midday feed portion by 10%',
      reason: 'Ambient forecast peaks at 34°C, reducing fish feed conversion efficiency.',
      maxMultiplier: 0.90,
      farmerAction: 'Pending',
      rule: 'Afternoon heat',
    },
    {
      id: 'adv-2',
      category: 'oxygen',
      title: 'Diurnal Oxygen Curve Safe',
      suggestion: 'Feed as planned in morning window',
      reason: 'Photosynthesis ramping active. Predicted DO remains ≥ 5.2 mg/L until dusk.',
      maxMultiplier: 1.0,
      farmerAction: 'Accepted',
      rule: 'Oxygen window',
    },
    {
      id: 'adv-3',
      category: 'leftover',
      title: 'Feed Clearance Feedback',
      suggestion: 'Maintain recommended ration baseline',
      reason: 'No uneaten pellets noted on pond feeding trays yesterday.',
      maxMultiplier: 1.0,
      farmerAction: 'Accepted',
      rule: 'Leftover check',
    },
  ];

  private activeAlerts: AppAlertItem[] = [];
  private feedInventory = [...INITIAL_FEED_INVENTORY];
  private demoState = {
    activeDemoAlertBanner: '',
  };
  private sampleWeighRecords: Array<{ id: string; date: string; predictedWeightG: number; realWeightG: number }> = [];
  private stockSwapConfirmed = false;

  private listeners: Array<() => void> = [];

  constructor() {
    this.refreshCalculations();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- RECALCULATE DYNAMIC TIMETABLE & RATIONS ---
  public refreshCalculations() {
    const stage = determineStage(this.farmSetup.speciesId, this.farmSetup.currentWeightG);
    const rateResult = lookupFeedRate(this.farmSetup.speciesId, this.farmSetup.currentWeightG, this.telemetry.liveTemp);
    const effectiveCount = Math.max(0, this.farmSetup.stockCount - this.deadFishToday);
    const biomassKg = calculateBiomass(effectiveCount, this.farmSetup.currentWeightG);
    const baseRationKg = calculateBaseRation(biomassKg, rateResult.ratePct);

    const adviceInputs = this.adviceList.map((a) => ({
      id: a.id,
      farmerAction: a.farmerAction,
      maxMultiplier: a.maxMultiplier,
    }));

    const leftoverParam =
      this.leftoverFeedback === 'Lots left'
        ? 'a lot'
        : this.leftoverFeedback === 'Some left'
        ? 'a little'
        : this.leftoverFeedback === 'Fully eaten'
        ? 'none'
        : null;

    const finalRationRes = calculateFinalRation(
      baseRationKg,
      this.telemetry.liveTemp,
      this.telemetry.liveDO,
      adviceInputs,
      0.1, // fresh telemetry
      leftoverParam,
      rateResult.tableId === 'carp_coche' || rateResult.tableId === 'trout_dry_nrc1981'
    );

    // Dynamic Timetable
    const scheduleRes = generateDynamicSchedule(
      stage,
      finalRationRes.finalKg,
      this.telemetry.liveDO,
      this.telemetry.liveTemp,
      this.skippedMealIds
    );

    // Merge with current meal statuses if previously logged
    const prevMap = new Map<number, AppMealItem>();
    this.meals.forEach((m) => prevMap.set(m.sessionIndex, m));

    this.meals = scheduleRes.sessions.map((s) => {
      const existing = prevMap.get(s.sessionIndex);
      let status: MealStatusType = existing?.status || 'Pending';
      let actualKg = existing?.actualKg;

      if (this.skippedMealIds.includes(s.id)) {
        status = 'Skipped';
      }

      return {
        id: s.id,
        sessionIndex: s.sessionIndex,
        time: s.time,
        feedCode: s.feedCode,
        feedType: s.feedType,
        pelletSizeMm: s.pelletSizeMm,
        plannedKg: s.plannedKg,
        adjustedKg: s.approvedKg,
        actualKg,
        status,
        predictedDO: s.predictedDO,
        isRescheduled: s.isRescheduled,
        whyThisTime: s.whyThisTime,
        skipReason: existing?.skipReason,
      };
    });

    // Check automated alerts
    this.syncAlerts();
  }

  private syncAlerts() {
    const alerts: AppAlertItem[] = [];

    // 1. Oxygen Stop alert
    if (this.telemetry.liveDO < PLACEHOLDER_LIMITS.oxygen.stopLevelMgL) {
      alerts.push({
        id: 'alt-low-do',
        category: 'low_oxygen',
        title: 'CRITICAL LOW OXYGEN (DO < 3.0 mg/L)',
        message: `Current DO is ${this.telemetry.liveDO.toFixed(1)} mg/L. Feeding is blocked to protect fish. Turn on aerators immediately.`,
        actionRequired: 'Skip feeding & turn on paddlewheels',
        severity: 'critical',
        timestampText: 'Now',
      });
    }

    // 2. High Temperature / Extreme condition
    if (this.telemetry.liveTemp > PLACEHOLDER_LIMITS.temperature.optimumMaxC) {
      alerts.push({
        id: 'alt-high-temp',
        category: 'extreme_condition',
        title: 'EXTREME WATER TEMPERATURE',
        message: `Pond temperature is ${this.telemetry.liveTemp.toFixed(1)}°C (> 32°C). High thermal stress. Afternoon feeding scaled down.`,
        actionRequired: 'Shift feeding to early morning/evening',
        severity: 'high',
        timestampText: 'Now',
      });
    } else if (this.telemetry.liveTemp < PLACEHOLDER_LIMITS.temperature.feedingMinC) {
      alerts.push({
        id: 'alt-cold-temp',
        category: 'extreme_condition',
        title: 'COLD WATER SLOWDOWN',
        message: `Pond temperature is ${this.telemetry.liveTemp.toFixed(1)}°C (< 20°C). Fish metabolic rate severely depressed.`,
        actionRequired: 'Feed only at peak sunshine midday',
        severity: 'medium',
        timestampText: 'Now',
      });
    }

    // 3. Stock short warning (< 3 days left on any feed)
    const shortBatches = this.feedInventory.filter((b) => b.daysLeft < 3.0 || b.isShortStock);
    if (shortBatches.length > 0) {
      const firstShort = shortBatches[0];
      alerts.push({
        id: 'alt-stock-short',
        category: 'stock_short',
        title: `STOCK SHORT: ${firstShort.codeName} (${firstShort.daysLeft.toFixed(1)} days left)`,
        message: `Only ${firstShort.stockOnHandKg} kg remaining. Order replacement bags or enable suggested transition to Finisher pellets.`,
        actionRequired: 'Order feed or swap to compatible pellet',
        severity: 'high',
        timestampText: 'Now',
      });
    }

    this.activeAlerts = alerts;
  }

  // --- PUBLIC GETTERS ---
  public getIsOnboarded(): boolean {
    return this.isOnboarded;
  }

  public getFarmSetup(): FarmSetupData {
    return { ...this.farmSetup };
  }

  public getDemoState() {
    return {
      ...this.demoState,
    };
  }

  public dismissDemoBanner() {
    this.demoState.activeDemoAlertBanner = '';
    this.notify();
  }

  public restoreNormalTelemetry() {
    this.telemetry = {
      liveDO: 5.4,
      liveTemp: 29.5,
      timeOfDay: '08:15 AM',
      weatherCondition: 'Sunny & Warm',
      lastSyncText: 'Live sensor sync · 2 min ago',
      turbidityNtu: 22,
    };
    this.demoState.activeDemoAlertBanner = 'Telemetry restored to normal conditions.';
    this.activeAlerts = [];
    this.notify();
  }

  public getSelectedSpecies(): SpeciesConfig {
    return SPECIES_LIST.find((s) => s.id === this.farmSetup.speciesId) || SPECIES_LIST[0];
  }

  public getCalculatedStage(): StageInfo {
    return determineStage(this.farmSetup.speciesId, this.farmSetup.currentWeightG);
  }

  public getRateLookup(): RateLookupResult {
    return lookupFeedRate(this.farmSetup.speciesId, this.farmSetup.currentWeightG, this.telemetry.liveTemp);
  }

  public getTelemetry() {
    return { ...this.telemetry };
  }

  public getDeadFishToday(): number {
    return this.deadFishToday;
  }

  public getIsCheckedInToday(): boolean {
    return this.isCheckedInToday;
  }

  public getMeals(): AppMealItem[] {
    return [...this.meals];
  }

  public getNextMeal(): AppMealItem | undefined {
    return this.meals.find((m) => m.status === 'Pending') || this.meals[0];
  }

  public getAdviceList(): AppAdviceItem[] {
    return [...this.adviceList];
  }

  public getAdvice(): AppAdviceItem[] {
    return [...this.adviceList];
  }

  public calculateStageFromWeight(weightG: number): string {
    return determineStage(this.farmSetup.speciesId, weightG).name;
  }

  public getActiveAlerts(): AppAlertItem[] {
    return [...this.activeAlerts];
  }

  public getCheckinData() {
    const stage = determineStage(this.farmSetup.speciesId, this.farmSetup.currentEstimatedWeightG || this.farmSetup.startingWeightG);
    return {
      latestDO: this.telemetry.liveDO,
      latestTemp: this.telemetry.liveTemp,
      selectedWeather: this.telemetry.weatherCondition,
      lastUpdatedText: this.telemetry.lastSyncText,
      currentEstimatedWeightG: this.farmSetup.currentEstimatedWeightG || this.farmSetup.startingWeightG,
      currentStageName: this.farmSetup.currentStageName || stage.name,
      stageChangedBannerShown: false,
      stockSwapConfirmed: this.stockSwapConfirmed,
    };
  }

  public getLeftoverFeedback() {
    return this.leftoverFeedback;
  }

  public getFeedInventory() {
    return [...this.feedInventory];
  }

  public getBiomassKg(): number {
    const count = Math.max(0, this.farmSetup.stockCount - this.deadFishToday);
    return calculateBiomass(count, this.farmSetup.currentWeightG);
  }

  public getDaysToNextStage() {
    const stage = this.getCalculatedStage();
    return calculateDaysToNextStage(
      this.farmSetup.currentWeightG,
      stage.weightMaxG,
      PLACEHOLDER_LIMITS.tgc.value,
      this.telemetry.liveTemp
    );
  }

  // --- ACTIONS ---
  public completeSetup(data: {
    farmName: string;
    pondName: string;
    speciesId: string;
    customSpeciesName?: string;
    stockingDate: string;
    stockCount: number;
    startingWeightG: number;
  }) {
    const stage = determineStage(data.speciesId, data.startingWeightG);
    this.farmSetup = {
      ...data,
      currentWeightG: data.startingWeightG,
      currentEstimatedWeightG: data.startingWeightG,
      currentStageName: stage.name,
    };
    this.isOnboarded = true;
    this.isCheckedInToday = true;
    this.deadFishToday = 0;
    this.refreshCalculations();
    this.notify();
  }

  public completeOnboarding(data: {
    farmName: string;
    pondName: string;
    speciesId: string;
    customSpeciesName?: string;
    stockingDate: string;
    stockCount: number;
    startingWeightG: number;
    currentEstimatedWeightG: number;
    currentStageName: string;
  }) {
    this.completeSetup(data);
  }

  public setDeadFishToday(count: number) {
    this.deadFishToday = Math.max(0, count);
    this.refreshCalculations();
    this.notify();
  }

  public finishCheckin(deadFishCount: number) {
    this.deadFishToday = Math.max(0, deadFishCount);
    this.isCheckedInToday = true;
    this.refreshCalculations();
    this.notify();
  }

  public logMealFed(mealId: string, actualKg: number, status: 'Given' | 'Reduced' = 'Given') {
    this.meals = this.meals.map((m) => {
      if (m.id === mealId) {
        return {
          ...m,
          status,
          actualKg,
          doAtMeal: this.telemetry.liveDO,
        };
      }
      return m;
    });
    this.notify();
  }

  public skipMeal(mealId: string, reason: string) {
    if (!this.skippedMealIds.includes(mealId)) {
      this.skippedMealIds.push(mealId);
    }
    this.meals = this.meals.map((m) => {
      if (m.id === mealId) {
        return {
          ...m,
          status: 'Skipped',
          actualKg: 0,
          skipReason: reason,
        };
      }
      return m;
    });
    this.notify();
  }

  public retryLaterReschedule(mealId: string) {
    // Reschedules the meal to the next safe oxygen window (e.g., 03:30 PM)
    this.meals = this.meals.map((m) => {
      if (m.id === mealId) {
        return {
          ...m,
          status: 'Pending',
          time: '03:30 PM',
          isRescheduled: true,
          whyThisTime: 'Rescheduled to 03:30 PM: waiting for sunlight oxygen recovery (predicted DO ≥ 5.5 mg/L).',
        };
      }
      return m;
    });
    this.notify();
  }

  public setLeftoverFeedback(feedback: 'Fully eaten' | 'Some left' | 'Lots left') {
    this.leftoverFeedback = feedback;
    this.refreshCalculations();
    this.notify();
  }

  public evaluateOxygen(doValue: number) {
    if (doValue >= 5.0) {
      return {
        status: 'Safe',
        description: 'Oxygen is within the preferred feeding range. Feed can proceed normally.',
      };
    }
    if (doValue >= 3.0) {
      return {
        status: 'Reduced',
        description: 'Oxygen is below the full-feeding target. Use a reduced ration and watch closely.',
      };
    }
    return {
      status: 'Stop',
      description: 'Dissolved oxygen is below the safe feeding threshold. Feeding is blocked to protect fish.',
    };
  }

  public recordMealFed(mealId: string, actualKg: number, _leftover: 'none' | 'a little' | 'a lot' = 'none', details?: Record<string, unknown>) {
    this.meals = this.meals.map((meal) =>
      meal.id === mealId
        ? {
            ...meal,
            status: 'Given',
            actualKg,
            leftoverKg: typeof details?.leftoverKg === 'number' ? details.leftoverKg : 0,
            reason: typeof details?.reason === 'string' ? details.reason : undefined,
            doAtMeal: typeof details?.doAtMeal === 'number' ? details.doAtMeal : this.telemetry.liveDO,
          }
        : meal
    );
    this.notify();
  }

  public recordMealSkipped(mealId: string, reason: string) {
    this.meals = this.meals.map((meal) =>
      meal.id === mealId
        ? {
            ...meal,
            status: 'Skipped',
            skipReason: reason,
            actualKg: 0,
          }
        : meal
    );
    this.notify();
  }

  public confirmStockSwap() {
    this.stockSwapConfirmed = true;
    this.demoState.activeDemoAlertBanner = 'Feed swap confirmed and inventory updated.';
    this.notify();
  }

  public getSampleWeighRecords() {
    return [...this.sampleWeighRecords];
  }

  public addSampleWeigh(realWeightG: number) {
    const predictedWeightG = this.farmSetup.currentEstimatedWeightG || this.farmSetup.startingWeightG;
    this.sampleWeighRecords.unshift({
      id: `sample-${Date.now()}`,
      date: new Date().toLocaleDateString('en-CA'),
      predictedWeightG,
      realWeightG,
    });
    this.farmSetup.currentEstimatedWeightG = realWeightG;
    const stage = determineStage(this.farmSetup.speciesId, realWeightG);
    this.farmSetup.currentStageName = stage.name;
    this.notify();
  }

  public updateAdviceAction(adviceId: string, action: 'Accepted' | 'Dismissed' | 'Edited') {
    this.adviceList = this.adviceList.map((a) =>
      a.id === adviceId ? { ...a, farmerAction: action } : a
    );
    this.refreshCalculations();
    this.notify();
  }

  public dismissAlert(alertId: string) {
    this.activeAlerts = this.activeAlerts.filter((a) => a.id !== alertId);
    this.notify();
  }

  // --- DEMO PANEL CONTROLS ---
  public setLiveDO(doVal: number) {
    this.telemetry.liveDO = Number(doVal.toFixed(1));
    this.telemetry.lastSyncText = 'Manual demo override active';
    this.refreshCalculations();
    this.notify();
  }

  public setLiveTemp(tempVal: number) {
    this.telemetry.liveTemp = Number(tempVal.toFixed(1));
    this.telemetry.lastSyncText = 'Manual demo override active';
    this.refreshCalculations();
    this.notify();
  }

  public setTimeOfDay(timeStr: string) {
    this.telemetry.timeOfDay = timeStr;
    this.refreshCalculations();
    this.notify();
  }

  public applyScenarioPreset(scenario: 'hot_afternoon' | 'oxygen_dropping' | 'cold_morning' | 'stock_low') {
    if (scenario === 'hot_afternoon') {
      this.telemetry.liveTemp = 35.0;
      this.telemetry.liveDO = 6.5;
      this.telemetry.weatherCondition = 'Hot and calm';
      this.telemetry.timeOfDay = '02:30 PM';
    } else if (scenario === 'oxygen_dropping') {
      this.telemetry.liveDO = 2.4;
      this.telemetry.liveTemp = 28.0;
      this.telemetry.weatherCondition = 'Cloudy with Light Rain';
      this.telemetry.timeOfDay = '06:00 AM';
    } else if (scenario === 'cold_morning') {
      this.telemetry.liveTemp = 18.0;
      this.telemetry.liveDO = 7.0;
      this.telemetry.weatherCondition = 'Cold & Clear';
      this.telemetry.timeOfDay = '07:30 AM';
    } else if (scenario === 'stock_low') {
      // Force Feed Y stock very low
      this.feedInventory = this.feedInventory.map((item) =>
        item.id === 'feed_y'
          ? { ...item, stockOnHandKg: 8.0, daysLeft: 1.0, isShortStock: true }
          : item
      );
    }
    this.telemetry.lastSyncText = `Preset applied: ${scenario.replace('_', ' ').toUpperCase()}`;
    this.refreshCalculations();
    this.notify();
  }

  public triggerAlertCategory(cat: 'low_oxygen' | 'water_change' | 'extreme_condition') {
    if (cat === 'low_oxygen') {
      this.telemetry.liveDO = 2.2;
    } else if (cat === 'extreme_condition') {
      this.telemetry.liveTemp = 36.5;
    } else if (cat === 'water_change') {
      this.telemetry.turbidityNtu = 95;
      this.activeAlerts = [
        {
          id: 'alt-turbidity',
          category: 'water_change',
          title: 'WATER CHANGE RECOMMENDED: High Turbidity (95 NTU)',
          message: 'Pond turbidity exceeds safe limits. Execute 20% water flush before midday.',
          actionRequired: 'Flush 20% water exchange',
          severity: 'high',
        },
        ...this.activeAlerts.filter((a) => a.category !== 'water_change'),
      ];
    }
    this.refreshCalculations();
    this.notify();
  }

  public resetDemo() {
    this.telemetry = {
      liveDO: 5.4,
      liveTemp: 29.5,
      timeOfDay: '08:15 AM',
      weatherCondition: 'Sunny & Warm',
      lastSyncText: 'Live sensor sync · Just now',
      turbidityNtu: 22,
    };
    this.deadFishToday = 0;
    this.skippedMealIds = [];
    this.leftoverFeedback = null;
    this.feedInventory = [...INITIAL_FEED_INVENTORY];
    this.refreshCalculations();
    this.notify();
  }

  public resetToOnboarding() {
    this.isOnboarded = false;
    this.isCheckedInToday = false;
    this.resetDemo();
  }
}

export const aquacultureService = new AquacultureService();
