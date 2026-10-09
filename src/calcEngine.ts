// src/calcEngine.ts
import {
  FEEDING_TABLES,
  STAGE_PROFILES,
  SPECIES_LIST,
  FALLBACK_SAMPLE_STAGES,
  HOURLY_OXYGEN_OUTLOOK,
  PLACEHOLDER_LIMITS,
} from './data';

export interface StageInfo {
  name: string;
  weightMinG: number;
  weightMaxG: number | null;
  feedType: string;
  pelletSizeMm: number;
  feedCode: 'Feed X' | 'Feed Y' | 'Feed Z';
  mealsPerDay: number;
  mealTimes: string[];
  ratePctHigh: number;
  ratePctLow: number;
  mealsInferred?: boolean;
}

export interface RateLookupResult {
  ratePct: number;
  tableId: string;
  sourceCitation: string;
  statusLabel: string;
  isPlaceholder: boolean;
  warnings: string[];
}

export interface DynamicMealSession {
  id: string;
  sessionIndex: number;
  time: string;
  feedCode: 'Feed X' | 'Feed Y' | 'Feed Z';
  feedType: string;
  pelletSizeMm: number;
  plannedKg: number;
  approvedKg: number;
  status: 'upcoming' | 'done' | 'skipped' | 'rescheduled';
  predictedDO: number;
  oxygenStatus: 'Safe' | 'Caution' | 'Stop';
  isRescheduled: boolean;
  whyThisTime: string;
}

// 1. Stage Determination (Strictly by weight range, never asked from farmer)
export function determineStage(speciesId: string, avgWeightG: number): StageInfo {
  const speciesEntry = STAGE_PROFILES.species.find((s: any) => s.id === speciesId);
  const stages = speciesEntry ? (speciesEntry.stages as any[]) : (FALLBACK_SAMPLE_STAGES as any[]);

  for (const st of stages) {
    const minG = Number(st.weight_min_g);
    const maxG = st.weight_max_g !== null && st.weight_max_g !== undefined ? Number(st.weight_max_g) : Infinity;

    if (avgWeightG >= minG && (avgWeightG < maxG || maxG === Infinity)) {
      // Assign placeholder feed product code based on pellet size
      let code: 'Feed X' | 'Feed Y' | 'Feed Z' = 'Feed X';
      const pellet = Number(st.pellet_size_mm) || 2.0;
      if (pellet < 2.5) code = 'Feed X';
      else if (pellet < 3.5) code = 'Feed Y';
      else code = 'Feed Z';

      const mealsCount = Number(st.meals_per_day) || 3;
      const defaultTimes = ['08:00 AM', '01:00 PM', '05:30 PM'];

      return {
        name: st.stage,
        weightMinG: minG,
        weightMaxG: st.weight_max_g !== null && st.weight_max_g !== undefined ? Number(st.weight_max_g) : null,
        feedType: st.feed_type || 'floating/sinking pellet',
        pelletSizeMm: pellet,
        feedCode: code,
        mealsPerDay: mealsCount,
        mealTimes: st.meal_times || defaultTimes.slice(0, mealsCount),
        ratePctHigh: Number(st.rate_pct_high) || 4.0,
        ratePctLow: Number(st.rate_pct_low) || 2.5,
        mealsInferred: st.meals_inferred || false,
      };
    }
  }

  // Fallback to last stage
  const last = stages[stages.length - 1] as any;
  return {
    name: last.stage,
    weightMinG: Number(last.weight_min_g) || 100,
    weightMaxG: null,
    feedType: last.feed_type || 'floating pellet',
    pelletSizeMm: Number(last.pellet_size_mm) || 3.5,
    feedCode: 'Feed Z',
    mealsPerDay: Number(last.meals_per_day) || 2,
    mealTimes: ['09:00 AM', '04:00 PM'],
    ratePctHigh: Number(last.rate_pct_high) || 2.5,
    ratePctLow: Number(last.rate_pct_low) || 1.5,
  };
}

// 2. Feed Rate Lookup (Linear in weight for 1D, Bilinear in weight+temp for 2D, No Extrapolation)
export function lookupFeedRate(speciesId: string, avgWeightG: number, tempC: number): RateLookupResult {
  const warnings: string[] = [];
  const speciesCfg = SPECIES_LIST.find((s) => s.id === speciesId);

  // If no reference table exists for this species
  if (!speciesCfg || !speciesCfg.hasReferenceTable || !speciesCfg.tableId) {
    const stage = determineStage(speciesId, avgWeightG);
    const minG = stage.weightMinG;
    const maxG = stage.weightMaxG || minG * 2.0;
    const fraction = Math.min(1.0, Math.max(0.0, (avgWeightG - minG) / (maxG - minG || 1)));
    const rate = stage.ratePctHigh - fraction * (stage.ratePctHigh - stage.ratePctLow);

    return {
      ratePct: Number(rate.toFixed(2)),
      tableId: 'placeholder_sample',
      sourceCitation: 'No reference table loaded, placeholder sample table',
      statusLabel: 'Placeholder, expert review needed',
      isPlaceholder: true,
      warnings: ['No reference table loaded for this species. Using placeholder rates.'],
    };
  }

  const tableId = speciesCfg.tableId;
  const tableData = FEEDING_TABLES.tables.find((t: any) => t.id === tableId);

  if (!tableData) {
    return {
      ratePct: 3.0,
      tableId: 'fallback',
      sourceCitation: 'Fallback baseline',
      statusLabel: 'Placeholder, expert review needed',
      isPlaceholder: true,
      warnings: ['Table data not found in pack'],
    };
  }

  // Case A: Size-only table (tilapia_fao_t28, shrimp_pmonodon_hanaqua1984)
  if (tableId === 'tilapia_fao_t28' || tableId === 'shrimp_pmonodon_hanaqua1984') {
    const stage = determineStage(speciesId, avgWeightG);
    const minG = stage.weightMinG;
    const maxG = stage.weightMaxG || minG * 2.0;
    const span = Math.max(0.001, maxG - minG);
    const fraction = Math.min(1.0, Math.max(0.0, (avgWeightG - minG) / span));
    const rate = stage.ratePctHigh - fraction * (stage.ratePctHigh - stage.ratePctLow);

    warnings.push('Table has no temperature dimension; thermal factor applied from species profile.');

    return {
      ratePct: Number(rate.toFixed(2)),
      tableId,
      sourceCitation: tableData.original_source || tableData.title,
      statusLabel: 'Published reference, unreviewed',
      isPlaceholder: false,
      warnings,
    };
  }

  // Case B: Size-by-temperature table (carp_coche, trout_dry_nrc1981)
  const rows = tableData.rows || [];
  
  // Find matching row or bracket
  for (const r of rows) {
    const wMin = Number(r.weight_min_g) || 0;
    const wMax = r.weight_max_g !== null && r.weight_max_g !== undefined ? Number(r.weight_max_g) : Infinity;
    const tMin = r.temp_min_c !== null && r.temp_min_c !== undefined ? Number(r.temp_min_c) : 0;
    const tMax = r.temp_max_c !== null && r.temp_max_c !== undefined ? Number(r.temp_max_c) : Infinity;

    if (avgWeightG >= wMin && avgWeightG < wMax && tempC >= tMin && tempC < tMax) {
      const rate = Number(r.rate_min_pct) || 3.0;
      return {
        ratePct: rate,
        tableId,
        sourceCitation: tableData.original_source || tableData.title,
        statusLabel: 'Published reference, unreviewed',
        isPlaceholder: false,
        warnings,
      };
    }
  }

  // If outside table bounds: Strict No Extrapolation rule
  warnings.push(`Current water temperature ${tempC.toFixed(1)}°C or fish weight ${avgWeightG}g is out of reference table range. Baseline clamped without extrapolation.`);

  return {
    ratePct: 2.0,
    tableId,
    sourceCitation: tableData.original_source || tableData.title,
    statusLabel: 'Published reference, unreviewed',
    isPlaceholder: false,
    warnings,
  };
}

// 3. Biomass & Base Ration
export function calculateBiomass(count: number, avgWeightG: number): number {
  return Number(((count * avgWeightG) / 1000.0).toFixed(1));
}

export function calculateBaseRation(biomassKg: number, ratePct: number): number {
  return Number(((biomassKg * ratePct) / 100.0).toFixed(1));
}

// 4. Final Ration with Safety Ceiling Constraint
export function calculateFinalRation(
  baseRationKg: number,
  tempC: number,
  doMgL: number,
  adviceList: Array<{ id: string; farmerAction: string; maxMultiplier: number }>,
  sensorAgeHours: number,
  leftoverFeedback: 'none' | 'a little' | 'a lot' | null,
  tableHasTemp: boolean
): { finalKg: number; tempFactor: number; oxygenFactor: number; reductions: string[] } {
  const reductions: string[] = [];
  let factor = 1.0;

  // Temperature Factor (applied if table has no temperature dimension)
  let tempFactor = 1.0;
  if (!tableHasTemp) {
    if (tempC < PLACEHOLDER_LIMITS.temperature.feedingMinC) {
      tempFactor = 0.50;
      reductions.push(`Cold water (${tempC}°C < 20°C): -50% metabolic reduction`);
    } else if (tempC > PLACEHOLDER_LIMITS.temperature.optimumMaxC) {
      tempFactor = 0.80;
      reductions.push(`High water temp (${tempC}°C > 32°C): -20% thermal stress reduction`);
    } else if (tempC < PLACEHOLDER_LIMITS.temperature.optimumMinC) {
      tempFactor = 0.85;
      reductions.push(`Sub-optimum water temp (${tempC}°C < 27°C): -15% ration reduction`);
    }
  }

  // Oxygen Factor
  let oxygenFactor = 1.0;
  if (doMgL < PLACEHOLDER_LIMITS.oxygen.stopLevelMgL) {
    oxygenFactor = 0.0;
    reductions.push(`Critical Low DO (${doMgL} mg/L < 3.0 mg/L): Mandatory Safety Stop (0 kg)`);
  } else if (doMgL < PLACEHOLDER_LIMITS.oxygen.fullFeedingLevelMgL) {
    oxygenFactor = 0.70;
    reductions.push(`Caution DO (${doMgL} mg/L < 5.0 mg/L): -30% oxygen scaling`);
  }

  // Stale Sensor Precaution
  if (sensorAgeHours >= 2.0) {
    factor *= 0.90;
    reductions.push('Sensor offline/stale telemetry: precautionary -10% reduction');
  }

  // Leftover Feedback
  if (leftoverFeedback === 'a lot') {
    factor *= 0.80;
    reductions.push('Significant leftover feed observed: -20% ration cut');
  } else if (leftoverFeedback === 'a little') {
    factor *= 0.90;
    reductions.push('Minor leftover feed observed: -10% ration cut');
  }

  // Accepted Advice Reductions
  for (const adv of adviceList) {
    if (adv.farmerAction === 'Accepted' && adv.maxMultiplier < 1.0) {
      factor *= adv.maxMultiplier;
      reductions.push(`Advice applied: ration scaled by ${Math.round(adv.maxMultiplier * 100)}%`);
    }
  }

  // Calculate and clamp at baseRationKg ceiling (Advice/Feedback never raises above table)
  let calculatedKg = baseRationKg * tempFactor * oxygenFactor * factor;
  calculatedKg = Math.min(calculatedKg, baseRationKg);
  calculatedKg = Number(Math.max(0.0, calculatedKg).toFixed(1));

  return {
    finalKg: calculatedKg,
    tempFactor,
    oxygenFactor,
    reductions,
  };
}

// 5. Estimated Days to Next Stage
export function calculateDaysToNextStage(
  currentWeightG: number,
  targetWeightG: number | null,
  tgc: number,
  tempC: number
): { daysRangeText: string; isPlaceholder: boolean } {
  if (!targetWeightG || targetWeightG <= currentWeightG || tempC <= 0 || tgc <= 0) {
    return { daysRangeText: 'Stage complete / Market size', isPlaceholder: true };
  }

  const numerator = 1000.0 * (Math.cbrt(targetWeightG) - Math.cbrt(currentWeightG));
  const denominator = tgc * tempC;
  const centralDays = Math.round(numerator / denominator);
  const minDays = Math.max(1, Math.round(centralDays * 0.9));
  const maxDays = Math.round(centralDays * 1.15);

  return {
    daysRangeText: `${minDays} – ${maxDays} days`,
    isPlaceholder: true,
  };
}

// 6. Dynamic Timetable Schedule Generation (Oxygen decides WHEN, Temp decides HOW MUCH & HOW MANY)
export function generateDynamicSchedule(
  stage: StageInfo,
  finalDailyKg: number,
  liveDO: number,
  liveTemp: number,
  skippedMealIds: string[] = []
): { sessions: DynamicMealSession[]; alertNotice: string | null } {
  let alertNotice: string | null = null;
  const sessions: DynamicMealSession[] = [];
  
  // Decide how many sessions based on temperature
  let activeMealCount = stage.mealsPerDay;
  if (liveTemp > 33.0) {
    activeMealCount = Math.max(1, stage.mealsPerDay - 1);
    alertNotice = `Extreme heat (${liveTemp.toFixed(1)}°C): evening feeding reduced and rescheduled to cooler hours.`;
  } else if (liveTemp < 20.0) {
    activeMealCount = Math.max(1, stage.mealsPerDay - 1);
    alertNotice = `Cold morning (${liveTemp.toFixed(1)}°C): feeding concentrated during warmest midday window.`;
  }

  // Base portion per meal
  const portionKg = Number((finalDailyKg / Math.max(1, activeMealCount)).toFixed(1));

  // Determine meal times based on diurnal oxygen outlook
  // Windows: Morning (08:00 or 10:00), Midday (12:00 or 14:00), Evening (16:00 or 17:00)
  const candidateTimes = [
    { time: '08:30 AM', targetHour: '08:00', why: 'Photosynthesis active; predicted DO is optimal.' },
    { time: '01:00 PM', targetHour: '12:00', why: 'Peak daylight respiration; water temp supports rapid digestion.' },
    { time: '04:45 PM', targetHour: '16:00', why: 'Scheduled before sunset oxygen decline.' },
    { time: '07:30 AM', targetHour: '08:00', why: 'Early morning daylight window.' },
  ];

  for (let i = 0; i < activeMealCount; i++) {
    const slot = candidateTimes[i] || { time: `${8 + i * 4}:00 AM`, targetHour: '12:00', why: 'Safe daytime oxygen window.' };
    const id = `session_${i + 1}`;
    const isSkipped = skippedMealIds.includes(id);

    // Look up predicted DO from outlook
    const outlookEntry = HOURLY_OXYGEN_OUTLOOK.find((o) => o.hour === slot.targetHour) || HOURLY_OXYGEN_OUTLOOK[2];
    const predictedDO = liveDO < 3.0 ? liveDO : outlookEntry.predictedDO;

    let oxStatus: 'Safe' | 'Caution' | 'Stop' = 'Safe';
    if (predictedDO < 3.0) oxStatus = 'Stop';
    else if (predictedDO < 5.0) oxStatus = 'Caution';

    let approvedKg = portionKg;
    if (oxStatus === 'Stop') approvedKg = 0.0;
    else if (oxStatus === 'Caution') approvedKg = Number((portionKg * 0.70).toFixed(1));

    sessions.push({
      id,
      sessionIndex: i + 1,
      time: isSkipped ? '03:30 PM' : slot.time,
      feedCode: stage.feedCode,
      feedType: stage.feedType,
      pelletSizeMm: stage.pelletSizeMm,
      plannedKg: portionKg,
      approvedKg,
      status: isSkipped ? 'rescheduled' : 'upcoming',
      predictedDO,
      oxygenStatus: oxStatus,
      isRescheduled: isSkipped,
      whyThisTime: isSkipped
        ? 'Rescheduled to 15:30: oxygen dropped earlier, waiting for safe sunlight recovery window.'
        : slot.why,
    });
  }

  return { sessions, alertNotice };
}
