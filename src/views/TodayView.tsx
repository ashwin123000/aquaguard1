// src/views/TodayView.tsx
import React, { useState } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  ThermometerSun,
  HelpCircle,
  Check,
  Edit2,
  X,
  Sparkles,
  ArrowRight,
  Package,
  Radio,
  ShieldAlert,
  Droplet,
  SunMedium,
  Info,
  Clock,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { DISCLAIMER_NOTE } from '../MockData';

interface TodayViewProps {
  onNavigateToMeals: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onNavigateToMeals }) => {
  const checkinData = aquacultureService.getCheckinData();
  const farmSetup = aquacultureService.getFarmSetup();
  const species = aquacultureService.getSelectedSpecies();
  const adviceList = aquacultureService.getAdvice();
  const meals = aquacultureService.getMeals();
  const activeAlerts = aquacultureService.getActiveAlerts();

  const [showWhyModal, setShowWhyModal] = useState<boolean>(false);

  // Weather icons helper
  const getWeatherIcon = (wt: string) => {
    switch (wt) {
      case 'Sunny': return Sun;
      case 'Cloudy': return Cloud;
      case 'Rainy': return CloudRain;
      case 'Cold': return Snowflake;
      case 'Hot and calm': return ThermometerSun;
      default: return Sun;
    }
  };

  const WeatherIconComp = getWeatherIcon(checkinData.selectedWeather);
  const totalFeedKg = meals.reduce((acc, m) => acc + m.plannedKg, 0);

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto">
      {/* POND IDENTIFICATION HEADER */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-lg border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
            Active Culture Pond
          </span>
          <h2 className="text-xl font-black tracking-tight text-white">
            {farmSetup.farmName} • {farmSetup.pondName}
          </h2>
          <p className="text-xs text-slate-300 font-bold mt-0.5">
            {species.name} ({farmSetup.currentStageName})
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-extrabold text-slate-400 block">Total Stock</span>
          <span className="text-lg font-black text-emerald-400">
            {farmSetup.stockCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* AUTOMATED ALERTS SECTION (WATER CHANGE, LOW OXYGEN, EXTREME CONDITION) */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3 animate-in slide-in-from-top duration-300">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>Automated Pond Safety Alerts ({activeAlerts.length})</span>
          </h3>

          <div className="space-y-2.5">
            {activeAlerts.map((alt) => {
              const isLowDo = alt.category === 'low_oxygen';
              const isWaterChange = alt.category === 'water_change';
              const isExtreme = alt.category === 'extreme_condition';

              return (
                <div
                  key={alt.id}
                  className={`p-4 rounded-3xl border-2 space-y-2 shadow-md ${
                    isLowDo
                      ? 'bg-rose-50 border-rose-500 text-rose-950'
                      : isWaterChange
                      ? 'bg-teal-50 border-teal-500 text-teal-950'
                      : 'bg-amber-50 border-amber-500 text-amber-950'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                          isLowDo
                            ? 'bg-rose-600'
                            : isWaterChange
                            ? 'bg-teal-700'
                            : 'bg-amber-600'
                        }`}
                      >
                        {isLowDo && <ShieldAlert className="w-5 h-5 stroke-[2.5]" />}
                        {isWaterChange && <Droplet className="w-5 h-5 stroke-[2.5]" />}
                        {isExtreme && <SunMedium className="w-5 h-5 stroke-[2.5]" />}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 border border-slate-200">
                          {alt.timestampText}
                        </span>
                        <h4 className="font-black text-base leading-tight mt-0.5">{alt.title}</h4>
                      </div>
                    </div>

                    <button
                      onClick={() => aquacultureService.dismissAlert(alt.id)}
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs font-semibold leading-relaxed bg-white/70 p-3 rounded-2xl border border-slate-200/60">
                    {alt.message}
                  </p>

                  <div className="flex items-center justify-between text-xs font-extrabold pt-0.5">
                    <span>Action Required:</span>
                    <span className="underline decoration-2 underline-offset-2">
                      {alt.actionRequired}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AUTOMATED LIVE SENSOR TELEMETRY CARD (NO MANUAL INPUT NEEDED) */}
      <div className="bg-white border-2 border-slate-200 p-5 rounded-3xl space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-600 animate-pulse" />
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Live IoT Telemetry
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                {checkinData.lastUpdatedText} (Auto-Fetched)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300">
            Probe Connected
          </span>
        </div>

        {/* 3 Telemetry Blocks: DO (Blue), Weather, Temp */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Weather */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center space-y-1">
            <WeatherIconComp className="w-6 h-6 text-sky-600 mx-auto" />
            <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Weather</span>
            <span className="text-xs font-black text-slate-900 block truncate">
              {checkinData.selectedWeather}
            </span>
          </div>

          {/* Dissolved Oxygen (Blue) */}
          <div className="bg-sky-50 border-2 border-sky-300 p-3 rounded-2xl text-center space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-sky-900 block">Dissolved O₂</span>
            <span className="text-xl font-black text-sky-950 font-mono block">
              {checkinData.latestDO.toFixed(1)}
            </span>
            <span className="text-[9px] font-bold text-sky-800 block">mg/L</span>
          </div>

          {/* Temp */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Water Temp</span>
            <span className="text-xl font-black text-slate-900 font-mono block">
              {checkinData.latestTemp.toFixed(1)}
            </span>
            <span className="text-[9px] font-bold text-slate-600 block">°C</span>
          </div>
        </div>
      </div>

      {/* STAGE CHANGED BANNER */}
      {checkinData.stageChangedBannerShown && (
        <div className="bg-teal-50 border-2 border-teal-600 rounded-3xl p-4 text-teal-950 space-y-2 shadow-md">
          <div className="flex items-center gap-2 text-teal-900 font-black text-base">
            <Sparkles className="w-6 h-6 text-teal-700 shrink-0" />
            <span>Growth Stage Advanced!</span>
          </div>
          <p className="text-xs font-semibold text-teal-900 leading-relaxed">
            Your fish moved into the <strong>{farmSetup.currentStageName}</strong> stage! New daily meal portions and optimal pellet size are already applied. Nothing for you to do.
          </p>
        </div>
      )}

      {/* TOTAL DAILY FEED RATION CARD WITH "WHY THIS AMOUNT?" */}
      <div className="bg-white border-2 border-slate-200 p-5 rounded-3xl space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Automated Daily Feed Ration
          </span>
          <button
            onClick={() => setShowWhyModal(true)}
            className="text-xs font-extrabold text-sky-700 hover:text-sky-800 flex items-center gap-1.5 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200"
          >
            <HelpCircle className="w-4 h-4 text-sky-600" />
            <span>Why this amount?</span>
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900 font-mono">{totalFeedKg.toFixed(1)}</span>
          <span className="text-lg font-bold text-slate-600">kg total ration</span>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Distributed across 3 timed sessions based on automated biomass and temperature models.
        </p>
      </div>

      {/* FEED TIMETABLE SCHEDULE (FEED TYPE X, Y, Z PLACEHOLDERS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-600" />
            <span>Daily Feeding Timetable Schedule</span>
          </h3>
          <span className="text-xs font-bold text-slate-500">3 Sessions</span>
        </div>

        {/* Note regarding placeholder names */}
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Feed types formatted as <strong>Feed Type X, Y, Z</strong> (brand/specific data added later).
          </span>
        </div>

        <div className="space-y-3">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-white border-2 border-slate-200 p-4.5 rounded-3xl flex items-center justify-between shadow-sm hover:border-sky-300 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                    {meal.time}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {meal.sessionName}
                  </span>
                </div>

                <h4 className="font-extrabold text-base text-slate-900 mt-1">{meal.feedType}</h4>
                <p className="text-xs text-slate-500 font-semibold">
                  Pellet Size: {meal.pelletSizeMm} mm mix
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-slate-900 font-mono block">
                  {meal.plannedKg} kg
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                  Ration Ready
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WEATHER & WATER ADVICE CARDS */}
      <div className="space-y-3">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          Automated Telemetry Advice
        </h3>

        {adviceList.map((adv) => (
          <div
            key={adv.id}
            className="bg-white border-2 border-slate-200 p-4.5 rounded-3xl space-y-3 shadow-sm"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                  {adv.rule}
                </span>
                {adv.farmerAction !== 'Pending' && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    Status: {adv.farmerAction}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-900 leading-snug">
                "{adv.suggestion}"
              </p>
              <p className="text-xs text-slate-500 font-medium">Reason: {adv.reason}</p>
            </div>

            {/* 3 SMALL BUTTONS: ACCEPT, EDIT, DISMISS */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => aquacultureService.updateAdviceAction(adv.id, 'Accepted')}
                className={`py-2.5 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all ${
                  adv.farmerAction === 'Accepted'
                    ? 'bg-teal-700 text-white shadow'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept</span>
              </button>

              <button
                onClick={() => aquacultureService.updateAdviceAction(adv.id, 'Edited')}
                className={`py-2.5 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all ${
                  adv.farmerAction === 'Edited'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                onClick={() => aquacultureService.updateAdviceAction(adv.id, 'Dismissed')}
                className={`py-2.5 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all ${
                  adv.farmerAction === 'Dismissed'
                    ? 'bg-slate-700 text-white shadow'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* STOCK SHORT WARNING CARD */}
      <div className="bg-rose-50 border-2 border-rose-400 p-5 rounded-3xl space-y-3 text-rose-950 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white text-xs font-black uppercase tracking-wider">
              Stock Short Warning
            </span>
            <h4 className="text-lg font-black text-rose-950">Feed Type X Running Low</h4>
            <p className="text-xs text-rose-900 font-medium leading-relaxed">
              Only 4.5 kg remaining in store. Suggested swap to <strong>Feed Type Y (Grower 3.0mm)</strong> for upcoming sessions.
            </p>
          </div>
        </div>

        <button
          onClick={() => aquacultureService.confirmStockSwap()}
          disabled={checkinData.stockSwapConfirmed}
          className={`w-full font-black text-base py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow transition-all ${
            checkinData.stockSwapConfirmed
              ? 'bg-rose-200 text-rose-800 cursor-default'
              : 'bg-rose-700 hover:bg-rose-600 text-white active:scale-98'
          }`}
        >
          <Check className="w-5 h-5" />
          <span>
            {checkinData.stockSwapConfirmed ? 'Stock Swap Confirmed' : 'Confirm Feed Swap'}
          </span>
        </button>
      </div>

      {/* MAIN BUTTON: PROCEED TO MEALS */}
      <button
        onClick={onNavigateToMeals}
        className="w-full bg-teal-700 hover:bg-teal-600 text-white font-black text-xl rounded-2xl py-4 px-6 flex items-center justify-center gap-2 shadow-2xl active:scale-98 transition-all"
      >
        <span>Go to Meal Checklist</span>
        <ArrowRight className="w-6 h-6 stroke-[3]" />
      </button>

      {/* WHY THIS AMOUNT? MODAL */}
      {showWhyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xl font-black text-slate-900">Why this amount?</h3>
              <button
                onClick={() => setShowWhyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700 leading-relaxed font-medium">
              <p>
                Today's total feed recommendation of <strong>{totalFeedKg.toFixed(1)} kg</strong> is calculated in plain words as:
              </p>

              <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl space-y-2 text-xs font-bold text-sky-950 font-mono">
                <div className="flex justify-between">
                  <span>Fish Mean Weight:</span>
                  <span>{farmSetup.currentEstimatedWeightG} g</span>
                </div>
                <div className="flex justify-between">
                  <span>Feeding Rate (% Body Wt):</span>
                  <span>2.8% per day</span>
                </div>
                <div className="flex justify-between">
                  <span>Water Temp Factor (29.5°C):</span>
                  <span>1.0 (Optimal)</span>
                </div>
                <div className="border-t border-sky-300 pt-2 flex justify-between text-sm text-sky-950 font-black">
                  <span>Calculated Daily Ration:</span>
                  <span>{totalFeedKg.toFixed(1)} kg</span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Adjusted continuously based on water temperature, dissolved oxygen levels, and yesterday's leftover feedback.
              </p>
            </div>

            <button
              onClick={() => setShowWhyModal(false)}
              className="w-full bg-sky-600 text-white font-black py-3 rounded-2xl text-base"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <p className="text-[11px] text-center text-slate-400 font-semibold tracking-wide">
        {DISCLAIMER_NOTE}
      </p>
    </div>
  );
};
