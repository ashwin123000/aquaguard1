// src/views/MealLogView.tsx
import React, { useState } from 'react';
import {
  Droplets,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Sparkles,
  ChevronDown,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { DISCLAIMER_NOTE, PLACEHOLDER_LIMITS } from '../data';

interface MealLogViewProps {
  activeMealId?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const MealLogView: React.FC<MealLogViewProps> = ({ activeMealId }) => {
  const meals = aquacultureService.getMeals();
  const telemetry = aquacultureService.getTelemetry();
  const leftoverFeedback = aquacultureService.getLeftoverFeedback();

  // Pick target meal: either provided ID or first pending meal, or first meal
  const [selectedMealId, setSelectedMealId] = useState<string>(() => {
    if (activeMealId) return activeMealId;
    const pending = meals.find((m) => m.status === 'Pending');
    return pending ? pending.id : meals[0]?.id || 'session_1';
  });

  const [loggedStatusMessage, setLoggedStatusMessage] = useState<string | null>(null);

  const targetMeal = meals.find((m) => m.id === selectedMealId) || meals[0];

  const doValue = telemetry.liveDO;
  const isSafeDO = doValue >= PLACEHOLDER_LIMITS.oxygen.fullFeedingLevelMgL; // >= 5.0
  const isReducedDO = doValue >= PLACEHOLDER_LIMITS.oxygen.stopLevelMgL && doValue < PLACEHOLDER_LIMITS.oxygen.fullFeedingLevelMgL; // 3.0 to 5.0
  const isStopDO = doValue < PLACEHOLDER_LIMITS.oxygen.stopLevelMgL; // < 3.0

  const plannedKg = targetMeal ? targetMeal.plannedKg : 10.0;
  const scaledKg = isReducedDO
    ? Number((plannedKg * 0.70).toFixed(1))
    : isStopDO
    ? 0.0
    : plannedKg;

  // Handle Log Meal Given
  const handleLogGiven = (status: 'Given' | 'Reduced') => {
    if (!targetMeal) return;
    aquacultureService.logMealFed(targetMeal.id, scaledKg, status);

    setLoggedStatusMessage(`Logged ${scaledKg} kg as ${status.toLowerCase()} for ${targetMeal.time}`);
  };

  // Handle Skip Meal
  const handleSkipMeal = () => {
    if (!targetMeal) return;
    aquacultureService.skipMeal(
      targetMeal.id,
      `Safety Stop: Probe DO ${doValue.toFixed(1)} mg/L is below 3.0 mg/L threshold.`
    );

    setLoggedStatusMessage(`Meal skipped due to low oxygen (< 3.0 mg/L)`);
  };

  // Handle Retry Later (Reschedules meal to next safe oxygen window)
  const handleRetryLater = () => {
    if (!targetMeal) return;
    aquacultureService.retryLaterReschedule(targetMeal.id);

    setLoggedStatusMessage(`Rescheduled ${targetMeal.time} meal to 03:30 PM safe daylight window.`);
  };

  // Leftover Feedback Handlers
  const handleLeftoverSelect = (val: 'Fully eaten' | 'Some left' | 'Lots left') => {
    aquacultureService.setLeftoverFeedback(val);
  };

  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto">
      {/* HEADER STRIP */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 block">
            Pond Side Verification
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Meal Check & Log
          </h2>
        </div>

        {/* Meal Selector dropdown */}
        <div className="relative">
          <select
            value={selectedMealId}
            onChange={(e) => {
              setSelectedMealId(e.target.value);
              setLoggedStatusMessage(null);
            }}
            className="appearance-none bg-slate-100 border border-slate-300 text-slate-900 text-xs font-black rounded-full px-3 py-2 pr-8 focus:outline-none"
          >
            {meals.map((m) => (
              <option key={m.id} value={m.id}>
                Meal {m.sessionIndex} ({m.time}) · {m.status}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
        </div>
      </div>

      {/* THE SCREEN IS THE OXYGEN CHECK CARD (DEEP OCEAN BLUE STYLING) */}
      <div className="bg-[#0b2545] text-white rounded-[2.5rem] p-6 shadow-2xl border-4 border-sky-400 relative overflow-hidden space-y-5">
        {/* Decorative Water Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-teal-400/15 rounded-full blur-2xl pointer-events-none" />

        {/* CARD TOP BAR */}
        <div className="relative z-10 flex items-center justify-between border-b border-sky-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-sky-500/30 text-sky-200 flex items-center justify-center border border-sky-400/40">
              <Droplets className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-300 block">
                Mandatory Oxygen Gate
              </span>
              <span className="text-xs font-black text-white block">
                {targetMeal?.time} · {targetMeal?.feedCode}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-extrabold uppercase bg-sky-900/90 text-sky-200 px-3 py-1 rounded-full border border-sky-600/60 font-mono">
            Target ≥ 5.0 mg/L
          </span>
        </div>

        {/* HUGE DO VALUE >= 48px */}
        <div className="relative z-10 text-center py-2 space-y-1">
          <span className="text-xs font-black uppercase tracking-widest text-sky-300 block">
            Probe Dissolved Oxygen (DO)
          </span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-black text-white tracking-tight font-mono">
              {doValue.toFixed(1)}
            </span>
            <span className="text-2xl font-black text-sky-300 font-mono">
              mg/L
            </span>
          </div>
          <p className="text-[11px] font-semibold text-sky-200 pt-0.5">
            {telemetry.lastSyncText}
          </p>
        </div>

        {/* 3 OUTCOME BANNERS */}
        <div className="relative z-10 space-y-4">
          {/* OUTCOME 1: SAFE (DO >= 5.0) */}
          {isSafeDO && (
            <div className="space-y-4">
              <div className="bg-emerald-500 text-white p-4 rounded-3xl flex items-center gap-3 shadow-lg border border-emerald-400">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-base font-black tracking-tight leading-none uppercase">
                    Oxygen OK
                  </h4>
                  <p className="text-xs font-bold text-emerald-100 mt-1">
                    Safe for full portion. Digestive respiration supported.
                  </p>
                </div>
              </div>

              {/* ACTION PILL */}
              <button
                onClick={() => handleLogGiven('Given')}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xl rounded-full py-4 px-6 flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all touch-target"
              >
                <span>Log {plannedKg} kg as given</span>
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* OUTCOME 2: REDUCED (3.0 <= DO < 5.0) */}
          {isReducedDO && (
            <div className="space-y-4">
              <div className="bg-amber-500 text-amber-950 p-4 rounded-3xl flex items-center gap-3 shadow-lg border border-amber-400">
                <div className="w-10 h-10 rounded-full bg-amber-950/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-base font-black tracking-tight leading-none uppercase">
                    Reduced Meal (30% scale-down)
                  </h4>
                  <p className="text-xs font-bold text-amber-900 mt-1">
                    DO is between 3.0 and 5.0 mg/L. Cut portion to prevent oxygen sag.
                  </p>
                </div>
              </div>

              {/* ACTION PILL */}
              <button
                onClick={() => handleLogGiven('Reduced')}
                className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xl rounded-full py-4 px-6 flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all touch-target"
              >
                <span>Log {scaledKg} kg as given</span>
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* OUTCOME 3: STOP - DO NOT FEED (DO < 3.0) */}
          {isStopDO && (
            <div className="space-y-4">
              <div className="bg-rose-600 text-white p-4 rounded-3xl flex items-center gap-3 shadow-lg border-2 border-rose-400 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-base font-black tracking-tight leading-none uppercase">
                    STOP - Do Not Feed
                  </h4>
                  <p className="text-xs font-bold text-rose-100 mt-1">
                    DO is critical ({doValue.toFixed(1)} mg/L &lt; 3.0). Feeding will cause mortality.
                  </p>
                </div>
              </div>

              {/* BIG RED PILL: SKIP MEAL */}
              <button
                onClick={handleSkipMeal}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black text-xl rounded-full py-4 px-6 flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all touch-target"
              >
                <span>Skip meal</span>
                <XCircle className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* SECONDARY PILL: RETRY LATER */}
              <button
                onClick={handleRetryLater}
                className="w-full bg-sky-800/80 hover:bg-sky-700/80 text-white font-black text-base rounded-full py-3.5 px-6 flex items-center justify-center gap-2 border border-sky-400/50 shadow-md active:scale-98 transition-all touch-target"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry later (Reschedule to safe oxygen window)</span>
              </button>
            </div>
          )}

          {/* STATUS CONFIRMATION NOTICE */}
          {loggedStatusMessage && (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center text-xs font-bold text-sky-100">
              {loggedStatusMessage}
            </div>
          )}
        </div>
      </div>

      {/* LEFTOVER FEED FEEDBACK (After logging question) */}
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-600" />
            Tray Feed Clearance Feedback
          </span>
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            Next Day Learning
          </span>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Was yesterday's feed fully eaten by the fish?
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {(['Fully eaten', 'Some left', 'Lots left'] as const).map((opt) => {
            const isSelected = leftoverFeedback === opt;
            return (
              <button
                key={opt}
                onClick={() => handleLeftoverSelect(opt)}
                className={`py-3 px-2 rounded-2xl text-xs font-black text-center transition-all border-2 touch-target ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* TODAY'S MEAL CHECKLIST WITH STATUS STAMPS */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-5 shadow-md space-y-3">
        <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
          Today's Meal Checklist
        </span>

        <div className="space-y-2">
          {meals.map((m) => {
            const isG = m.status === 'Given';
            const isS = m.status === 'Skipped';
            const isR = m.status === 'Reduced';
            const isP = m.status === 'Pending';

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMealId(m.id)}
                role="button"
                tabIndex={0}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  m.id === selectedMealId
                    ? 'border-sky-500 bg-sky-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 font-mono">
                      {m.time}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">
                      · Meal {m.sessionIndex}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold">
                    {m.feedCode} · {m.plannedKg} kg planned
                  </div>
                </div>

                {/* STATUS STAMP */}
                <div>
                  {isG && (
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Given
                    </span>
                  )}
                  {isS && (
                    <span className="text-xs font-black text-rose-800 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Skipped
                    </span>
                  )}
                  {isR && (
                    <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Reduced
                    </span>
                  )}
                  {isP && (
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TOMORROW'S ADJUSTMENT PREVIEW CARD */}
      <div className="bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-200 rounded-[2.5rem] p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Tomorrow's Feeding Adjustment Preview
          </span>
          <span className="text-[10px] font-bold text-teal-800 bg-white px-2 py-0.5 rounded-full border border-teal-200">
            Adaptive
          </span>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">
          {leftoverFeedback === 'Lots left'
            ? 'Based on significant leftover feed reported, tomorrow\'s base ration will automatically scale down by -20% to prevent water contamination.'
            : leftoverFeedback === 'Some left'
            ? 'Minor leftovers noted. Tomorrow\'s ration will reduce by -10% until feeding trays are cleared.'
            : leftoverFeedback === 'Fully eaten'
            ? 'Feed fully eaten! Ration remains optimal at reference table baseline (+5% growth adaptation eligible if clean 3 days in a row).'
            : 'Log tray feedback above to preview automated tomorrow adjustments.'}
        </p>
      </div>

      {/* MANDATORY FOOTER */}
      <footer className="pt-4 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          {DISCLAIMER_NOTE}
        </p>
      </footer>
    </div>
  );
};
