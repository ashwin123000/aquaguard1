// src/components/SetupModal.tsx
import React, { useState } from 'react';
import {
  Fish,
  Calendar,
  Scale,
  Building,
  Check,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { SPECIES_LIST, DISCLAIMER_NOTE } from '../data';
import { determineStage } from '../calcEngine';

interface SetupModalProps {
  onComplete: (data: {
    farmName: string;
    pondName: string;
    speciesId: string;
    customSpeciesName?: string;
    stockingDate: string;
    stockCount: number;
    startingWeightG: number;
  }) => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [farmName, setFarmName] = useState<string>('Sangli Aqua Farm');
  const [pondName, setPondName] = useState<string>('Pond A1');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('nile_tilapia');
  const [customSpeciesName, setCustomSpeciesName] = useState<string>('');
  const [stockingDate, setStockingDate] = useState<string>('2026-09-01');
  const [stockCount, setStockCount] = useState<number>(15000);
  const [startingWeightG, setStartingWeightG] = useState<number>(12.0);

  const selectedSpecies = SPECIES_LIST.find((s) => s.id === selectedSpeciesId) || SPECIES_LIST[0];
  const calculatedStage = determineStage(selectedSpeciesId, startingWeightG);

  const handleFinish = () => {
    onComplete({
      farmName: farmName || 'My Farm',
      pondName: pondName || 'Pond 1',
      speciesId: selectedSpeciesId,
      customSpeciesName: selectedSpeciesId === 'other' ? customSpeciesName : undefined,
      stockingDate,
      stockCount: Number(stockCount) || 1000,
      startingWeightG: Number(startingWeightG) || 12.0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col min-h-[580px] justify-between p-6 relative overflow-hidden">
        {/* Organic Yoga Aesthetic Decorative Blobs */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-teal-100/60 blob-shape-1 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-44 h-44 border border-teal-300/40 blob-shape-1 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-sky-100/60 blob-shape-2 pointer-events-none" />

        {/* STEP HEADER */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="tracking-widest uppercase text-[10px] text-teal-700 font-extrabold">
              Pond Setup Assistant
            </span>
            <span className="bg-teal-50 text-teal-800 px-3 py-1 rounded-full font-mono text-[11px] font-bold border border-teal-200">
              Step {step} of 4
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-sky-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* SCREEN 1: FARM & POND NAME */}
        {step === 1 && (
          <div className="relative z-10 my-auto space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2">
              <div className="w-14 h-14 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md ring-offset-pill">
                <Building className="w-7 h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-teal-700 block">
                Identification
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Name your farm & pond
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Personalizes all automated feeding recommendations to this specific pond water.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Farm Name
                </label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Sangli Aqua Farm"
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-teal-500 focus:bg-white rounded-2xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none transition-all shadow-inner touch-target"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Pond Identifier
                </label>
                <input
                  type="text"
                  value={pondName}
                  onChange={(e) => setPondName(e.target.value)}
                  placeholder="e.g. Pond A1"
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-teal-500 focus:bg-white rounded-2xl px-4 py-3.5 text-base font-bold text-slate-900 focus:outline-none transition-all shadow-inner touch-target"
                />
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: SPECIES CHECKLIST */}
        {step === 2 && (
          <div className="relative z-10 my-auto space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md ring-offset-pill">
                <Fish className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-teal-700 block">
                Species Selection
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Which species are you farming?
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Tap to pick your farmed fish or shrimp from the checklist.
              </p>
            </div>

            {/* Checklist */}
            <div className="max-h-[46vh] overflow-y-auto space-y-2 pr-1">
              {SPECIES_LIST.map((sp) => {
                const isSelected = selectedSpeciesId === sp.id;
                return (
                  <button
                    key={sp.id}
                    onClick={() => setSelectedSpeciesId(sp.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 font-bold text-sm flex items-center justify-between transition-all touch-target ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50 text-teal-950 shadow-md ring-2 ring-teal-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {sp.category}
                        </span>
                        <span className="text-sm font-black">{sp.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {sp.hasReferenceTable ? (
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Reference table loaded
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            No table loaded, placeholder values
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedSpeciesId === 'other' && (
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Custom Species Name
                </label>
                <input
                  type="text"
                  value={customSpeciesName}
                  onChange={(e) => setCustomSpeciesName(e.target.value)}
                  placeholder="e.g. Chanos chanos / Milkfish"
                  className="w-full bg-slate-50 border-2 border-teal-500 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* SCREEN 3: STOCKING DATE, COUNT & WEIGHT */}
        {step === 3 && (
          <div className="relative z-10 my-auto space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md ring-offset-pill">
                <Scale className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-teal-700 block">
                Stocking Parameters
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Pond Stocking Details
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Growth stage is figured out automatically from date and initial weight.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  Stocking Date
                </label>
                <input
                  type="date"
                  value={stockingDate}
                  onChange={(e) => setStockingDate(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-teal-500 rounded-2xl px-4 py-3 text-base font-bold text-slate-900 focus:outline-none shadow-inner touch-target"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Number Stocked
                </label>
                <input
                  type="number"
                  value={stockCount}
                  onChange={(e) => setStockCount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-teal-500 rounded-2xl px-4 py-3 text-2xl font-black font-mono text-slate-900 focus:outline-none shadow-inner touch-target"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-teal-600" />
                  Starting Mean Weight (grams)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={startingWeightG}
                  onChange={(e) => setStartingWeightG(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-teal-500 rounded-2xl px-4 py-3 text-3xl font-black font-mono text-slate-900 focus:outline-none shadow-inner touch-target"
                />
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: FRIENDLY SUMMARY (Auto-computed stage) */}
        {step === 4 && (
          <div className="relative z-10 my-auto space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-teal-500 text-white flex items-center justify-center mx-auto shadow-lg ring-offset-pill">
                <Sparkles className="w-8 h-8 stroke-[2.2]" />
              </div>
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-teal-700 block">
                Calculated Baseline
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Setup Complete!
              </h1>
            </div>

            <div className="bg-slate-50 border-2 border-teal-200/80 p-5 rounded-3xl space-y-4 shadow-sm">
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Automated Stage Assessment
                </p>
                <p className="text-lg font-black text-slate-900 leading-snug">
                  Your fish are about{' '}
                  <span className="text-teal-700 font-black underline decoration-teal-400">
                    {startingWeightG} g
                  </span>{' '}
                  and in the{' '}
                  <span className="bg-teal-100 text-teal-900 px-3 py-1 rounded-full font-black border border-teal-300 inline-block">
                    {calculatedStage.name}
                  </span>{' '}
                  stage.
                </p>
              </div>

              <div className="border-t border-slate-200/80 pt-3 space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Assigned Feed:</span>
                  <span className="font-extrabold text-slate-900">
                    {calculatedStage.feedCode} ({calculatedStage.pelletSizeMm} mm pellet)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Meal Frequency:</span>
                  <span className="font-extrabold text-slate-900">{calculatedStage.mealsPerDay} meals / day</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Biomass:</span>
                  <span className="font-extrabold text-slate-900">
                    {((stockCount * startingWeightG) / 1000).toFixed(1)} kg
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {selectedSpecies.hasReferenceTable
                    ? 'Published reference, unreviewed: Table loaded from FAO AFFRIS.'
                    : 'Placeholder, expert review needed: No reference table loaded.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM PILL BUTTON (One main button per screen) */}
        <div className="relative z-10 pt-4 space-y-2">
          {step < 4 ? (
            <button
              onClick={() => setStep((prev) => prev + 1)}
              className="w-full bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-500 hover:to-sky-500 text-white font-black text-lg rounded-full py-4 px-6 flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all touch-target"
            >
              <span>
                {step === 1 && 'Next: Choose Species'}
                {step === 2 && 'Next: Stock Details'}
                {step === 3 && 'Calculate Growth Stage'}
              </span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full bg-teal-700 hover:bg-teal-600 text-white font-black text-xl rounded-full py-4 px-6 flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all touch-target"
            >
              <span>Start feeding {pondName || 'Pond A1'}</span>
              <Sparkles className="w-5 h-5 fill-white/20" />
            </button>
          )}

          <p className="text-[10px] text-center text-slate-400 font-medium">
            {DISCLAIMER_NOTE}
          </p>
        </div>
      </div>
    </div>
  );
};
