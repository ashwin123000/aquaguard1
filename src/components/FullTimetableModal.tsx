// src/components/FullTimetableModal.tsx
import React, { useState } from 'react';
import {
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Droplets,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { DISCLAIMER_NOTE } from '../data';

interface FullTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMealForFeeding?: (meal: any) => void;
}

export const FullTimetableModal: React.FC<FullTimetableModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [expandedWhyMealId, setExpandedWhyMealId] = useState<string | null>(null);

  if (!isOpen) return null;

  const meals = aquacultureService.getMeals();
  const farmSetup = aquacultureService.getFarmSetup();
  const totalPlannedKg = meals.reduce((acc, m) => acc + m.plannedKg, 0).toFixed(1);

  const toggleWhy = (mealId: string) => {
    setExpandedWhyMealId((prev) => (prev === mealId ? null : mealId));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-6 relative overflow-hidden flex flex-col justify-between max-h-[92vh]">
        {/* Organic Blobs */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-teal-100/60 blob-shape-1 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-sky-100/60 blob-shape-2 pointer-events-none" />

        {/* MODAL HEADER */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md ring-offset-pill">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-teal-700 block">
                Dynamic Feeding Schedule
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                Today's Full Timetable
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all touch-target"
            aria-label="Close Timetable"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* SUMMARY STATS STRIP */}
        <div className="relative z-10 my-2 bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-slate-700">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Daily Ration</span>
            <span className="text-base font-black text-teal-900 font-mono">{totalPlannedKg} kg</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Pond Target</span>
            <span className="text-xs font-black text-slate-800">{farmSetup.pondName} · {meals.length} meals</span>
          </div>
        </div>

        {/* TIMETABLE LIST */}
        <div className="relative z-10 space-y-3 my-auto py-2 overflow-y-auto max-h-[56vh] pr-1">
          {meals.map((meal, idx) => {
            const isGiven = meal.status === 'Given';
            const isSkipped = meal.status === 'Skipped';
            const isReduced = meal.status === 'Reduced';
            const isPending = meal.status === 'Pending';
            const isExpanded = expandedWhyMealId === meal.id;

            return (
              <div
                key={meal.id}
                className={`p-4 rounded-3xl border-2 transition-all ${
                  isGiven
                    ? 'bg-emerald-50/50 border-emerald-300'
                    : isSkipped
                    ? 'bg-rose-50/50 border-rose-300'
                    : isReduced
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-white border-slate-200 hover:border-teal-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Meal {idx + 1} of {meals.length}
                      </span>
                      {meal.isRescheduled && (
                        <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                          Rescheduled
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-slate-900 tracking-tight font-mono">
                        {meal.time}
                      </span>
                      <span className="text-sm font-black text-teal-800 font-mono">
                        {meal.plannedKg} kg
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-600">
                      {meal.feedCode} · {meal.pelletSizeMm} mm ({meal.feedType.split(' ')[0]})
                    </div>
                  </div>

                  {/* STATUS BADGE */}
                  <div className="flex flex-col items-end gap-2">
                    {isGiven && (
                      <span className="flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        Given
                      </span>
                    )}
                    {isSkipped && (
                      <span className="flex items-center gap-1 text-xs font-black text-rose-800 bg-rose-100 px-3 py-1 rounded-full border border-rose-300">
                        <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        Skipped
                      </span>
                    )}
                    {isReduced && (
                      <span className="flex items-center gap-1 text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        Reduced
                      </span>
                    )}
                    {isPending && (
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Pending
                      </span>
                    )}

                    {/* TAP TO REVEAL WHY THIS TIME */}
                    <button
                      onClick={() => toggleWhy(meal.id)}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 underline underline-offset-2 touch-target"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Why this time?</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE "WHY THIS TIME?" EXPLANATION */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs font-medium text-slate-700 bg-slate-50/80 p-3 rounded-2xl animate-in fade-in duration-150 space-y-1">
                    <div className="flex items-center gap-1.5 text-teal-800 font-bold">
                      <Droplets className="w-3.5 h-3.5 text-teal-600" />
                      <span>Oxygen & Temperature Factor:</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {meal.whyThisTime}
                    </p>
                    <div className="text-[11px] text-slate-500 font-semibold pt-0.5">
                      Predicted Probe DO: <strong className="text-slate-800">{meal.predictedDO.toFixed(1)} mg/L</strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CLOSE PILL BUTTON */}
        <div className="relative z-10 pt-3 space-y-2">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-full py-4 px-6 flex items-center justify-center shadow-lg active:scale-98 transition-all touch-target"
          >
            Close Timetable
          </button>
          <p className="text-[10px] text-center text-slate-400 font-medium">
            {DISCLAIMER_NOTE}
          </p>
        </div>
      </div>
    </div>
  );
};
