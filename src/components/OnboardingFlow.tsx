// src/components/OnboardingFlow.tsx
import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  Sparkles,
  Fish,
  Calendar,
  Layers,
  Scale,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { SPECIES_LIST, DISCLAIMER_NOTE, type FarmSetup } from '../MockData';
import { aquacultureService } from '../services/aquacultureService';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);

  // Form State
  const [farmName, setFarmName] = useState<string>('Sangli Aqua Farm');
  const [pondName, setPondName] = useState<string>('Pond A1');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('nile_tilapia');
  const [customSpeciesName, setCustomSpeciesName] = useState<string>('');
  const [stockingDate, setStockingDate] = useState<string>('2026-09-01');
  const [stockCount, setStockCount] = useState<number>(15000);
  const [startingWeightG, setStartingWeightG] = useState<number>(40.0);

  const selectedSpecies =
    SPECIES_LIST.find((s) => s.id === selectedSpeciesId) || SPECIES_LIST[6];

  const calculatedStage = aquacultureService.calculateStageFromWeight(startingWeightG);

  const handleFinish = () => {
    const setupData: FarmSetup = {
      farmName: farmName || 'My Farm',
      pondName: pondName || 'Pond 1',
      speciesId: selectedSpeciesId,
      customSpeciesName: selectedSpeciesId === 'other' ? customSpeciesName : undefined,
      stockingDate,
      stockCount: Number(stockCount) || 1000,
      startingWeightG: Number(startingWeightG) || 40,
      currentEstimatedWeightG: Number(startingWeightG) || 40,
      currentStageName: calculatedStage,
    };
    aquacultureService.completeOnboarding(setupData);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 max-w-md mx-auto shadow-2xl rounded-3xl border border-slate-200">
      {/* STEP HEADER */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>Precision Feeding Setup</span>
          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
            Step {step} of 4
          </span>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-sky-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* SCREEN 1: FARM AND POND NAME */}
      {step === 1 && (
        <div className="my-auto space-y-6 animate-in fade-in duration-200">
          <div className="space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-sm">
              <Building2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Farm & Pond Identification
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              Enter your farm and pond names to personalize your daily feed recommendations.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Farm Name
              </label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Sangli Aqua Farm"
                className="w-full bg-white border-2 border-slate-300 focus:border-sky-600 focus:ring-4 focus:ring-sky-100 rounded-2xl px-4 py-4 text-xl font-bold text-slate-900 focus:outline-none transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Pond Name / Number
              </label>
              <input
                type="text"
                value={pondName}
                onChange={(e) => setPondName(e.target.value)}
                placeholder="e.g. Pond A1"
                className="w-full bg-white border-2 border-slate-300 focus:border-sky-600 focus:ring-4 focus:ring-sky-100 rounded-2xl px-4 py-4 text-xl font-bold text-slate-900 focus:outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 2: SPECIES CHECKLIST */}
      {step === 2 && (
        <div className="my-auto space-y-4 animate-in fade-in duration-200">
          <div className="space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-sm">
              <Fish className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Pick Farmed Species
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Tap the fish or shrimp species stocked in your pond.
            </p>
          </div>

          {/* Checklist */}
          <div className="max-h-[48vh] overflow-y-auto space-y-2 pr-1">
            {SPECIES_LIST.map((sp) => {
              const isSelected = selectedSpeciesId === sp.id;
              return (
                <button
                  key={sp.id}
                  onClick={() => setSelectedSpeciesId(sp.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 font-bold text-base flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50 text-sky-950 shadow-md ring-2 ring-sky-300'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                      {sp.category}
                    </span>
                    <span>{sp.name}</span>
                  </div>
                  {isSelected && (
                    <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedSpeciesId === 'other' && (
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Specify Custom Species Name
              </label>
              <input
                type="text"
                value={customSpeciesName}
                onChange={(e) => setCustomSpeciesName(e.target.value)}
                placeholder="e.g. Chanos chanos / Milkfish"
                className="w-full bg-white border-2 border-sky-600 rounded-2xl px-4 py-3.5 text-lg font-bold text-slate-900 focus:outline-none shadow-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* SCREEN 3: STOCKING DATE, COUNT & WEIGHT */}
      {step === 3 && (
        <div className="my-auto space-y-5 animate-in fade-in duration-200">
          <div className="space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-sm">
              <Layers className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Stocking Details
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              We calculate growth stage automatically from date and initial weight.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600" />
                Stocking Date
              </label>
              <input
                type="date"
                value={stockingDate}
                onChange={(e) => setStockingDate(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 focus:border-sky-600 rounded-2xl px-4 py-3.5 text-lg font-bold text-slate-900 focus:outline-none shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Number of Fish / Shrimp Stocked
              </label>
              <input
                type="number"
                value={stockCount}
                onChange={(e) => setStockCount(parseInt(e.target.value) || 0)}
                className="w-full bg-white border-2 border-slate-300 focus:border-sky-600 rounded-2xl px-4 py-3.5 text-2xl font-black text-slate-900 focus:outline-none shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-teal-700" />
                Starting Mean Weight (grams)
              </label>
              <input
                type="number"
                step="0.5"
                value={startingWeightG}
                onChange={(e) => setStartingWeightG(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border-2 border-slate-300 focus:border-sky-600 rounded-2xl px-4 py-3.5 text-2xl font-black text-slate-900 focus:outline-none shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 4: FRIENDLY SUMMARY */}
      {step === 4 && (
        <div className="my-auto space-y-6 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Ready to Start!
            </h1>
          </div>

          <div className="bg-sky-50 border-2 border-sky-300 p-5 rounded-3xl space-y-4 text-slate-900 shadow-md">
            <div className="text-center space-y-2">
              <p className="text-xs font-extrabold text-sky-800 uppercase tracking-wider">
                Automated Growth Assessment
              </p>
              <p className="text-xl font-black text-slate-900 leading-snug">
                Your fish are about{' '}
                <span className="text-sky-700 underline underline-offset-4 font-black">
                  {startingWeightG} g
                </span>{' '}
                and in the{' '}
                <span className="bg-sky-200 text-sky-900 px-2.5 py-1 rounded-xl font-extrabold border border-sky-300 inline-block">
                  {calculatedStage}
                </span>{' '}
                stage.
              </p>
            </div>

            <div className="border-t border-sky-200 pt-3 space-y-2 text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-extrabold text-slate-900">
                  {farmName} • {pondName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Species:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedSpeciesId === 'other'
                    ? customSpeciesName || 'Custom Species'
                    : selectedSpecies.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Stocked:</span>
                <span className="font-extrabold text-slate-900">
                  {stockCount.toLocaleString()} fish
                </span>
              </div>
            </div>

            {/* Amber Placeholder Badge */}
            <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs flex items-center gap-2.5 font-bold shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                <strong>Placeholder, expert review needed:</strong> Standard growth curves and feeding rates applied.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE MAIN ACTION BUTTON AT BOTTOM */}
      <div className="pb-2 pt-4 space-y-3">
        {step < 4 ? (
          <button
            onClick={() => setStep((prev) => prev + 1)}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black text-xl rounded-2xl py-4 px-6 flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all"
          >
            <span>
              {step === 1 && 'Next: Select Species'}
              {step === 2 && 'Next: Stocking Details'}
              {step === 3 && 'Calculate Growth Stage'}
            </span>
            <ChevronRight className="w-6 h-6 stroke-[3]" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="w-full bg-teal-700 hover:bg-teal-600 text-white font-black text-2xl rounded-2xl py-4 px-6 flex items-center justify-center gap-2 shadow-2xl active:scale-98 transition-all"
          >
            <span>Start</span>
            <Sparkles className="w-6 h-6 fill-white/20" />
          </button>
        )}

        {/* Mandatory Bottom Disclaimer */}
        <p className="text-[11px] text-center text-slate-400 font-semibold tracking-wide">
          {DISCLAIMER_NOTE}
        </p>
      </div>
    </div>
  );
};
