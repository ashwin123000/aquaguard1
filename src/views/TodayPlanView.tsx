// src/views/TodayPlanView.tsx
import React, { useState } from 'react';
import {
  ArrowRight,
  Clock,
  Radio,
  AlertTriangle,
  HelpCircle,
  CalendarCheck,
  ChevronRight,
  Scale,
  Thermometer,
  Droplets,
  Sparkles,
} from 'lucide-react';
import { aquacultureService, type AppMealItem } from '../services/aquacultureService';
import { FullTimetableModal } from '../components/FullTimetableModal';
import { WhyAmountModal } from '../components/WhyAmountModal';
import { CheckinModal } from '../components/CheckinModal';
import { DISCLAIMER_NOTE } from '../data';

interface TodayPlanViewProps {
  onStartFeeding: (meal?: AppMealItem) => void;
}

export const TodayPlanView: React.FC<TodayPlanViewProps> = ({ onStartFeeding }) => {
  const farmSetup = aquacultureService.getFarmSetup();
  const nextMeal = aquacultureService.getNextMeal();
  const meals = aquacultureService.getMeals();
  const alerts = aquacultureService.getActiveAlerts().slice(0, 2);
  const adviceList = aquacultureService.getAdviceList();
  const isCheckedIn = aquacultureService.getIsCheckedInToday();
  const telemetry = aquacultureService.getTelemetry();
  const biomassKg = aquacultureService.getBiomassKg();
  const stage = aquacultureService.getCalculatedStage();

  const [showTimetable, setShowTimetable] = useState(false);
  const [showWhyAmount, setShowWhyAmount] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  const mealIndex = nextMeal ? nextMeal.sessionIndex : 1;
  const totalMeals = meals.length;

  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto relative">
      {/* FLUID ORGANIC BACKGROUND WAVES (YOGAZ DRIBBBLE STYLE) */}
      <div className="absolute -top-12 -right-20 w-64 h-64 bg-gradient-to-bl from-sky-400/25 via-cyan-300/15 to-transparent blob-yogaz-hero pointer-events-none -z-10" />
      <div className="absolute -top-8 -right-16 w-64 h-64 border border-sky-400/25 blob-yogaz-hero pointer-events-none -z-10" />
      <div className="absolute top-80 -left-20 w-56 h-56 bg-gradient-to-tr from-sky-300/15 via-teal-200/15 to-transparent blob-yogaz-wave-2 pointer-events-none -z-10" />

      {/* EYEBROW & POND HEADER */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#007cf0] block">
            AQUACULTURE · DECISION SUPPORT
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {farmSetup.pondName || 'Pond A1'}
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {farmSetup.farmName} · {stage.name}
          </p>
        </div>

        {/* CHECK-IN QUICK PILL */}
        <button
          onClick={() => setShowCheckin(true)}
          className="flex items-center gap-1.5 bg-white hover:bg-sky-50 text-[#007cf0] text-xs font-extrabold px-3.5 py-2 rounded-full border border-sky-200 shadow-sm transition-smooth touch-target"
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>{isCheckedIn ? 'Checked in' : 'Check in'}</span>
        </button>
      </div>

      {/* URGENT ALERTS (MAX 2) */}
      {alerts.length > 0 && (
        <div className="space-y-2.5 animate-in slide-in-from-top duration-200">
          {alerts.map((alt) => {
            const isCritical = alt.severity === 'critical';
            return (
              <div
                key={alt.id}
                className={`p-4 rounded-[2rem] border-2 flex items-start gap-3 shadow-md ${
                  isCritical
                    ? 'bg-rose-50/90 border-rose-400 text-rose-950'
                    : 'bg-amber-50/90 border-amber-400 text-amber-950'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isCritical ? 'bg-rose-600 text-white shadow' : 'bg-amber-500 text-white shadow'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80">
                      Safety Alert
                    </span>
                    <button
                      onClick={() => aquacultureService.dismissAlert(alt.id)}
                      className="text-[10px] font-bold opacity-75 hover:opacity-100"
                    >
                      Dismiss
                    </button>
                  </div>
                  <h4 className="text-xs font-black leading-snug">{alt.title}</h4>
                  <p className="text-[11px] font-medium leading-relaxed opacity-90">{alt.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEXT FEEDING HERO CARD (YOGAZ AESTHETIC WITH FLUID CUTOUTS) */}
      {nextMeal ? (
        <div className="relative bg-white rounded-[2.5rem] p-6 shadow-yogaz-card border border-sky-100 overflow-hidden space-y-5">
          {/* Card Decorative Fluid Curve */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-gradient-to-br from-sky-100 via-cyan-50 to-transparent blob-yogaz-wave-1 pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-44 h-44 border border-sky-200/50 blob-yogaz-wave-1 pointer-events-none" />

          {/* CARD TOP ROW */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#007cf0] animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Next Feeding · Meal {mealIndex} of {totalMeals}
              </span>
            </div>

            <span className="bg-sky-50 text-[#007cf0] text-xs font-black px-3.5 py-1 rounded-full border border-sky-200 font-mono">
              {nextMeal.time}
            </span>
          </div>

          {/* HUGE NUMBER >= 48px: PRESCRIBED PORTION */}
          <div
            onClick={() => setShowTimetable(true)}
            role="button"
            tabIndex={0}
            className="relative z-10 py-5 px-4 bg-gradient-to-b from-sky-50/70 to-white rounded-3xl border border-sky-100 text-center cursor-pointer hover:border-sky-300 transition-smooth group"
          >
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#007cf0] block">
              Today's Prescribed Portion
            </span>
            <div className="flex items-baseline justify-center gap-2 my-1">
              <span className="text-6xl font-black text-slate-900 tracking-tight font-mono">
                {nextMeal.plannedKg}
              </span>
              <span className="text-2xl font-black text-[#007cf0] font-mono">
                kg
              </span>
            </div>
            <div className="text-xs font-extrabold text-slate-600">
              {nextMeal.feedCode} · {nextMeal.pelletSizeMm} mm pellets
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#007cf0] group-hover:translate-x-0.5 transition-transform">
              <Clock className="w-3.5 h-3.5" />
              <span>Tap to view full day timetable</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* YOGAZ VIBRANT PILL BUTTON (PRIMARY CALL TO ACTION) */}
          <div className="relative z-10 pt-1">
            <button
              onClick={() => onStartFeeding(nextMeal)}
              className="w-full bg-yogaz-primary hover:opacity-95 text-white font-black text-lg rounded-full py-4 px-6 flex items-center justify-center gap-3 shadow-yogaz-pill active:scale-[0.98] transition-smooth touch-target"
            >
              <span>Start feeding</span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-[2.5rem] p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-emerald-950">
            All meals completed today!
          </h3>
          <p className="text-xs text-emerald-800 font-medium">
            Daily feeding plan finished for {farmSetup.pondName}.
          </p>
        </div>
      )}

      {/* 3 CONCENTRIC RING CIRCLES (EXACTLY LIKE YOGAZ DRIBBBLE SHOT) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007cf0]">
            POND KEY METRICS
          </span>
          <button
            onClick={() => setShowWhyAmount(true)}
            className="text-xs font-bold text-[#007cf0] hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Why this amount?</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Card 1: Biomass */}
          <div className="bg-white rounded-3xl p-3.5 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-between space-y-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#007cf0] to-[#00b4d8] text-white flex items-center justify-center concentric-ring-blue shadow-md mt-1">
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                Biomass
              </span>
              <span className="text-base font-black text-slate-900 font-mono block">
                {biomassKg} kg
              </span>
            </div>
          </div>

          {/* Card 2: Probe DO */}
          <div className="bg-white rounded-3xl p-3.5 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-between space-y-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] text-white flex items-center justify-center concentric-ring-blue shadow-md mt-1">
              <Droplets className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                Probe DO
              </span>
              <span className="text-base font-black text-sky-950 font-mono block">
                {telemetry.liveDO.toFixed(1)} mg/L
              </span>
            </div>
          </div>

          {/* Card 3: Water Temp */}
          <div className="bg-white rounded-3xl p-3.5 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-between space-y-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0d9488] to-[#2dd4bf] text-white flex items-center justify-center concentric-ring-cyan shadow-md mt-1">
              <Thermometer className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                Water Temp
              </span>
              <span className="text-base font-black text-slate-900 font-mono block">
                {telemetry.liveTemp.toFixed(1)}°C
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DECISION SUPPORT ADVICE CARDS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#007cf0] animate-pulse" />
            Decision Support Recommendations
          </span>
          <span className="text-[9px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Safety Ceiling: Max 100%
          </span>
        </div>

        <div className="space-y-2.5">
          {adviceList.map((adv) => {
            const isAccepted = adv.farmerAction === 'Accepted';
            const isDismissed = adv.farmerAction === 'Dismissed';

            return (
              <div
                key={adv.id}
                className={`p-4 rounded-3xl border transition-smooth ${
                  isDismissed
                    ? 'opacity-40 bg-slate-50 border-slate-200'
                    : isAccepted
                    ? 'bg-sky-50/60 border-sky-200 shadow-sm'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#007cf0] block">
                    {adv.category} adjustment
                  </span>
                  <h5 className="text-sm font-black text-slate-900 leading-snug">
                    {adv.title}
                  </h5>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {adv.suggestion}. <span className="text-slate-400">({adv.reason})</span>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                  {adv.farmerAction === 'Pending' ? (
                    <>
                      <button
                        onClick={() => aquacultureService.updateAdviceAction(adv.id, 'Dismissed')}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-smooth touch-target"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => aquacultureService.updateAdviceAction(adv.id, 'Accepted')}
                        className="px-4 py-1.5 rounded-full text-xs font-black text-white bg-yogaz-primary hover:opacity-95 shadow-sm transition-smooth touch-target"
                      >
                        Accept (-{Math.round((1 - adv.maxMultiplier) * 100)}%)
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] font-bold text-sky-800 bg-white px-3 py-1 rounded-full border border-sky-200">
                      Status: {adv.farmerAction}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MANDATORY FOOTER */}
      <footer className="pt-6 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          {DISCLAIMER_NOTE}
        </p>
      </footer>

      {/* MODALS */}
      <FullTimetableModal
        isOpen={showTimetable}
        onClose={() => setShowTimetable(false)}
        onSelectMealForFeeding={(meal) => {
          setShowTimetable(false);
          onStartFeeding(meal);
        }}
      />

      <WhyAmountModal
        isOpen={showWhyAmount}
        onClose={() => setShowWhyAmount(false)}
      />

      <CheckinModal
        isOpen={showCheckin}
        onClose={() => setShowCheckin(false)}
      />
    </div>
  );
};
