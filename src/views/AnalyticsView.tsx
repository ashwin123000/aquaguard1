import React, { useState } from 'react';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { DISCLAIMER_NOTE } from '../data';

export const AnalyticsView: React.FC = () => {
  const farmSetup = aquacultureService.getFarmSetup();
  const stage = aquacultureService.getCalculatedStage();
  const daysProjection = aquacultureService.getDaysToNextStage();

  const [weighInput, setWeighInput] = useState<string>('44.5');
  const [successNote, setSuccessNote] = useState<string | null>(null);

  // Sample history
  const [history, setHistory] = useState([
    { date: '2026-09-24', weightG: 34.0, fcr: 1.28, stage: 'Fingerling' },
    { date: '2026-10-01', weightG: 37.5, fcr: 1.31, stage: 'Fingerling' },
    { date: '2026-10-08', weightG: 40.0, fcr: 1.34, stage: 'Fingerling' },
  ]);

  const handleLogWeigh = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weighInput);
    if (isNaN(val) || val <= 0) return;

    // Add to history
    const today = new Date().toISOString().split('T')[0];
    setHistory((prev) => [
      { date: today, weightG: val, fcr: 1.32, stage: stage.name },
      ...prev,
    ]);

    setSuccessNote(`Sample logged: ${val}g recorded. Stage & FCR baseline recalibrated.`);
    setTimeout(() => setSuccessNote(null), 3500);
  };

  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto relative">
      {/* FLUID BACKGROUND WAVES */}
      <div className="absolute -top-12 -right-20 w-64 h-64 bg-gradient-to-bl from-sky-400/20 via-cyan-300/10 to-transparent blob-yogaz-hero pointer-events-none -z-10" />
      <div className="absolute top-80 -left-20 w-56 h-56 bg-gradient-to-tr from-sky-300/15 via-teal-200/10 to-transparent blob-yogaz-wave-2 pointer-events-none -z-10" />

      {/* HEADER */}
      <div className="pt-1">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#007cf0] block">
          GROWTH MODEL · PERFORMANCE
        </span>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
          Growth & FCR Analytics
        </h2>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          {farmSetup.pondName} · Thermal Growth Coefficient (TGC) Model
        </p>
      </div>

      {/* CURRENT FISH WEIGHT HERO CARD */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-yogaz-card border border-sky-100 space-y-4">
        <div className="flex items-center justify-between border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-sky-50 text-[#007cf0] flex items-center justify-center">
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-black uppercase text-slate-800 block">
                Mean Body Weight
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                Current Stage: {stage.name}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Placeholder TGC
          </span>
        </div>

        {/* HUGE NUMBER >= 48px */}
        <div className="text-center py-2">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#007cf0] block">
            Average Fish Weight
          </span>
          <div className="flex items-baseline justify-center gap-2 my-1">
            <span className="text-6xl font-black text-slate-900 font-mono tracking-tight">
              {farmSetup.currentWeightG}
            </span>
            <span className="text-2xl font-black text-[#007cf0] font-mono">
              g
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Next stage threshold: {stage.weightMaxG ? `${stage.weightMaxG}g` : 'Market harvest size'}
          </p>
        </div>

        {/* STATS STRIP */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Next Stage In</span>
            <span className="text-sm font-black text-slate-900 font-mono block">
              {daysProjection.daysRangeText}
            </span>
            <span className="text-[9px] font-bold text-[#007cf0]">TGC Model</span>
          </div>

          <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Measured FCR</span>
            <span className="text-sm font-black text-slate-900 font-mono block">
              1.32
            </span>
            <span className="text-[9px] font-bold text-emerald-600">Expected: 1.35</span>
          </div>
        </div>
      </div>

      {/* SAMPLE WEIGHING LOG FORM */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200/90 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007cf0] block">
              WEEKLY CALIBRATION
            </span>
            <h3 className="text-base font-black text-slate-900">
              Log Sample Weighing
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Reset Baseline
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Sample weighing resets mean fish weight, growth stage, and recalibrates the thermal growth coefficient model.
        </p>

        {successNote && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold text-center">
            {successNote}
          </div>
        )}

        <form onSubmit={handleLogWeigh} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-600">
              Sample Average Weight (grams)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1"
                value={weighInput}
                onChange={(e) => setWeighInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-[#007cf0] rounded-2xl px-4 py-3 text-2xl font-black font-mono text-slate-900 focus:outline-none touch-target"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                grams
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-yogaz-primary hover:opacity-95 text-white font-black text-sm rounded-full py-4 px-6 flex items-center justify-center gap-2 shadow-yogaz-pill active:scale-[0.98] transition-smooth touch-target"
          >
            <span>Record Weighing & Recalibrate</span>
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>

      {/* SAMPLE WEIGHING HISTORY TABLE */}
      <div className="space-y-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007cf0] block px-1">
          SAMPLE WEIGHING HISTORY
        </span>

        <div className="space-y-2">
          {history.map((rec, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-mono text-slate-500 font-bold block">{rec.date}</span>
                <span className="font-black text-slate-900 text-sm font-mono">{rec.weightG} g</span>
              </div>

              <div className="text-right">
                <span className="font-bold text-slate-700 block">{rec.stage}</span>
                <span className="text-[11px] font-black text-emerald-700 font-mono">
                  FCR: {rec.fcr}
                </span>
              </div>
            </div>
          ))}
        </div>
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
