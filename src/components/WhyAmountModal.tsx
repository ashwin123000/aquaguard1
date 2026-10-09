// src/components/WhyAmountModal.tsx
import React from 'react';
import {
  X,
  Scale,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Table,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { DISCLAIMER_NOTE } from '../data';

interface WhyAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhyAmountModal: React.FC<WhyAmountModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const farmSetup = aquacultureService.getFarmSetup();
  const deadFish = aquacultureService.getDeadFishToday();
  const effectiveCount = Math.max(0, farmSetup.stockCount - deadFish);
  const stage = aquacultureService.getCalculatedStage();
  const rateLookup = aquacultureService.getRateLookup();
  const biomassKg = aquacultureService.getBiomassKg();
  const baseRationKg = Number(((biomassKg * rateLookup.ratePct) / 100.0).toFixed(1));
  const telemetry = aquacultureService.getTelemetry();

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
              <Calculator className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-teal-700 block">
                Feed Calculation Breakdown
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                Why this amount?
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="relative z-10 space-y-4 my-auto py-3 overflow-y-auto">
          {/* STEP 1: COUNT & WEIGHT */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-teal-600" />
                1. Fish Count & Average Weight
              </span>
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                Pond Population
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Stock count is <strong className="text-slate-900">{farmSetup.stockCount.toLocaleString()}</strong> minus{' '}
              <strong className="text-rose-600">{deadFish}</strong> dead today ={' '}
              <strong className="text-slate-900 font-mono">{effectiveCount.toLocaleString()} live fish</strong>.
              Estimated weight is <strong className="text-teal-900 font-mono">{farmSetup.currentWeightG} g</strong> per fish (stage:{' '}
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-800">
                {stage.name}
              </span>
              ).
            </p>
          </div>

          {/* STEP 2: BIOMASS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-teal-600" />
                2. Live Biomass
              </span>
              <span className="text-sm font-black text-slate-900 font-mono">{biomassKg} kg</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-800 text-center font-bold">
              Biomass = {effectiveCount.toLocaleString()} × {farmSetup.currentWeightG} g ÷ 1000 = {biomassKg} kg
            </div>
          </div>

          {/* STEP 3: REFERENCE FEEDING TABLE */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Table className="w-4 h-4 text-teal-600" />
                3. Reference Table Feed Rate
              </span>
              <span className="text-sm font-black text-teal-900 font-mono">{rateLookup.ratePct}% / day</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              At {farmSetup.currentWeightG}g in water temp {telemetry.liveTemp.toFixed(1)}°C, the feeding table prescribes{' '}
              <strong className="text-slate-900">{rateLookup.ratePct}% of body weight</strong> per day.
            </p>

            {/* TABLE STATUS TAG */}
            <div
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                rateLookup.isPlaceholder
                  ? 'bg-amber-50 text-amber-950 border-amber-300'
                  : 'bg-emerald-50 text-emerald-950 border-emerald-300'
              }`}
            >
              {rateLookup.isPlaceholder ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <div>
                <span className="block font-black">
                  Table: {rateLookup.tableId} · {rateLookup.statusLabel}
                </span>
                <span className="text-[11px] font-normal text-slate-600 block mt-0.5">
                  Source: {rateLookup.sourceCitation}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 4: BASE TO FINAL RATION (SAFETY CEILING) */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-teal-900 block">
              4. Safety Clamp & Adjustments
            </span>
            <div className="space-y-1.5 text-xs text-slate-700 font-medium">
              <div className="flex justify-between">
                <span>Base Table Ration ({biomassKg} kg × {rateLookup.ratePct}%):</span>
                <strong className="font-mono text-slate-900">{baseRationKg} kg</strong>
              </div>
              <div className="flex justify-between">
                <span>Hard Rule Safety Ceiling:</span>
                <strong className="text-teal-900">Max {baseRationKg} kg</strong>
              </div>
              <p className="text-[11px] text-teal-800 pt-1 font-semibold leading-normal">
                *Advice and feedback can ONLY scale down or maintain the portion; app hard rules prohibit exceeding the scientific table baseline.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM CLOSE PILL */}
        <div className="relative z-10 pt-3 space-y-2">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-full py-4 px-6 flex items-center justify-center shadow-lg active:scale-98 transition-all touch-target"
          >
            Close Breakdown
          </button>
          <p className="text-[10px] text-center text-slate-400 font-medium">
            {DISCLAIMER_NOTE}
          </p>
        </div>
      </div>
    </div>
  );
};
