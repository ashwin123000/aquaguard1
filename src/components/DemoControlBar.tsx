// src/components/DemoControlBar.tsx
import React from 'react';
import { ShieldAlert, Droplet, SunMedium, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';

export const DemoControlBar: React.FC = () => {
  return (
    <div className="bg-slate-900 text-slate-100 p-3.5 rounded-3xl border border-slate-800 shadow-2xl space-y-2.5 mb-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">
            Automated Alert Presentation Triggers
          </span>
        </div>
        <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-0.5 rounded font-mono font-bold border border-sky-800">
          DEMO MODE
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Trigger Low Oxygen Alert */}
        <button
          onClick={() => aquacultureService.triggerAlertCategory('low_oxygen')}
          className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs py-2.5 px-2 rounded-2xl flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all text-center"
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Low DO Alert</span>
        </button>

        {/* Trigger Water Change Alert */}
        <button
          onClick={() => aquacultureService.triggerAlertCategory('water_change')}
          className="bg-teal-700 hover:bg-teal-600 text-white font-extrabold text-xs py-2.5 px-2 rounded-2xl flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all text-center"
        >
          <Droplet className="w-4 h-4 shrink-0" />
          <span>Water Change</span>
        </button>

        {/* Trigger Extreme Condition Alert */}
        <button
          onClick={() => aquacultureService.triggerAlertCategory('extreme_condition')}
          className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs py-2.5 px-2 rounded-2xl flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all text-center"
        >
          <SunMedium className="w-4 h-4 shrink-0" />
          <span>Extreme Condition</span>
        </button>

        {/* Restore / Reset Telemetry */}
        <button
          onClick={() => aquacultureService.restoreNormalTelemetry()}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs py-2.5 px-2 rounded-2xl flex items-center justify-center gap-1.5 border border-slate-700 shadow active:scale-95 transition-all text-center"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>Restore Normal</span>
        </button>
      </div>
    </div>
  );
};
