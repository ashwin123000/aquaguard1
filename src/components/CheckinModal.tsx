// src/components/CheckinModal.tsx
import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Sun,
  Droplets,
  Thermometer,
  CalendarCheck,
  X,
  Sparkles,
  Radio,
  Scale,
  Fish,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { DISCLAIMER_NOTE } from '../data';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated?: () => void;
}

export const CheckinModal: React.FC<CheckinModalProps> = ({
  isOpen,
  onClose,
  onPlanCreated,
}) => {
  const farmSetup = aquacultureService.getFarmSetup();
  const telemetry = aquacultureService.getTelemetry();
  const initialDead = aquacultureService.getDeadFishToday();

  const [deadFish, setDeadFish] = useState<number>(initialDead);

  if (!isOpen) return null;

  const effectiveCount = Math.max(0, farmSetup.stockCount - deadFish);
  const updatedBiomassKg = ((effectiveCount * farmSetup.currentWeightG) / 1000.0).toFixed(1);

  const handleIncrement = () => setDeadFish((prev) => prev + 1);
  const handleDecrement = () => setDeadFish((prev) => Math.max(0, prev - 1));

  const handleMakePlan = () => {
    aquacultureService.finishCheckin(deadFish);
    if (onPlanCreated) onPlanCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-6 relative overflow-hidden flex flex-col justify-between max-h-[92vh]">
        {/* Organic Yoga Aesthetic Blobs */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-teal-100/60 blob-shape-1 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-sky-100/60 blob-shape-2 pointer-events-none" />

        {/* MODAL HEADER */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md ring-offset-pill">
              <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-teal-700 block">
                Morning Pond Check-in
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                {farmSetup.pondName} · Today's Status
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all touch-target"
            aria-label="Close Check-in"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="relative z-10 space-y-5 my-auto py-3 overflow-y-auto">
          {/* 1. DEAD FISH TODAY STEPPER */}
          <div className="bg-slate-50 border-2 border-slate-200/90 rounded-3xl p-5 text-center space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Fish className="w-4 h-4 text-slate-500" />
                Dead fish observed today
              </span>
              <span className="text-[10px] font-extrabold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                Mortality Log
              </span>
            </div>

            <div className="flex items-center justify-center gap-6 py-1">
              {/* MINUS BUTTON */}
              <button
                onClick={handleDecrement}
                disabled={deadFish <= 0}
                className="w-14 h-14 rounded-full bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-md active:scale-95 transition-all touch-target"
                aria-label="Decrease dead fish"
              >
                <Minus className="w-6 h-6 stroke-[3]" />
              </button>

              {/* HUGE NUMBER >= 48px */}
              <div className="min-w-[110px] text-center">
                <span className="text-5xl font-black text-slate-900 tracking-tight font-mono block">
                  {deadFish}
                </span>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mt-0.5 block">
                  {deadFish === 1 ? 'fish' : 'fish count'}
                </span>
              </div>

              {/* PLUS BUTTON */}
              <button
                onClick={handleIncrement}
                className="w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-lg ring-offset-pill active:scale-95 transition-all touch-target"
                aria-label="Increase dead fish"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
              </button>
            </div>

            {/* LIVE BIOMASS UPDATE */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1 text-slate-500">
                <Scale className="w-3.5 h-3.5 text-teal-600" />
                Active Pond Biomass:
              </span>
              <span className="text-teal-900 font-black font-mono">
                {updatedBiomassKg} kg ({effectiveCount.toLocaleString()} fish)
              </span>
            </div>
          </div>

          {/* 2. AUTO WEATHER & SENSORS STRIP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                Automated Environment Readout
              </span>
              <span className="text-[10px] font-extrabold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                auto
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Weather Forecast */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Sun className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-600 uppercase block">Weather</span>
                <span className="text-xs font-black text-slate-900 block truncate">
                  {telemetry.weatherCondition.split('&')[0]}
                </span>
                <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                  auto
                </span>
              </div>

              {/* Dissolved Oxygen */}
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-sky-200 text-sky-800 flex items-center justify-center mx-auto">
                  <Droplets className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-extrabold text-sky-700 uppercase block">Probe DO</span>
                <span className="text-sm font-black text-sky-950 font-mono block">
                  {telemetry.liveDO.toFixed(1)} <span className="text-[10px] font-bold">mg/L</span>
                </span>
                <span className="text-[9px] font-bold text-sky-800 bg-white px-1.5 py-0.5 rounded border border-sky-200 inline-block">
                  auto
                </span>
              </div>

              {/* Water Temperature */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
                  <Thermometer className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-600 uppercase block">Water Temp</span>
                <span className="text-sm font-black text-slate-900 font-mono block">
                  {telemetry.liveTemp.toFixed(1)} <span className="text-[10px] font-bold">°C</span>
                </span>
                <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                  auto
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MAKE TODAY'S PLAN BUTTON */}
        <div className="relative z-10 pt-3 space-y-2">
          <button
            onClick={handleMakePlan}
            className="w-full bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-500 hover:to-sky-500 text-white font-black text-lg rounded-full py-4 px-6 flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all touch-target"
          >
            <Sparkles className="w-5 h-5 fill-white/20" />
            <span>Make today's plan</span>
          </button>

          <p className="text-[10px] text-center text-slate-400 font-medium">
            {DISCLAIMER_NOTE}
          </p>
        </div>
      </div>
    </div>
  );
};
