// src/components/DemoPanel.tsx
import React from 'react';
import {
  Sliders,
  X,
  RotateCcw,
  Flame,
  Snowflake,
  PackageX,
  Droplets,
  Thermometer,
  Clock,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';

interface DemoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const telemetry = aquacultureService.getTelemetry();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border-2 border-teal-500 p-6 relative overflow-hidden flex flex-col justify-between max-h-[92vh]">
        {/* PANEL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md">
              <Sliders className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-extrabold text-teal-700 block">
                Hidden Presentation Sandbox
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                Demo Control Suite
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all touch-target"
            aria-label="Close Demo Panel"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* CONTROLS BODY */}
        <div className="space-y-5 my-auto py-3 overflow-y-auto max-h-[64vh] pr-1">
          {/* 1. SLIDERS */}
          <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-3xl p-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              1. Live Telemetry Sliders
            </span>

            {/* DO Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-sky-800">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  Dissolved Oxygen (DO):
                </span>
                <span className="font-mono font-black text-sky-950 text-sm">
                  {telemetry.liveDO.toFixed(1)} mg/L
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="9.0"
                step="0.1"
                value={telemetry.liveDO}
                onChange={(e) => aquacultureService.setLiveDO(parseFloat(e.target.value))}
                className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span className="text-rose-600">1.0 (Stop &lt; 3.0)</span>
                <span className="text-amber-600">3.0 - 5.0 (Reduced)</span>
                <span className="text-emerald-600">5.0+ (Safe)</span>
              </div>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-teal-800">
                  <Thermometer className="w-3.5 h-3.5 text-teal-600" />
                  Water Temperature:
                </span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {telemetry.liveTemp.toFixed(1)} °C
                </span>
              </div>
              <input
                type="range"
                min="15.0"
                max="38.0"
                step="0.5"
                value={telemetry.liveTemp}
                onChange={(e) => aquacultureService.setLiveTemp(parseFloat(e.target.value))}
                className="w-full accent-teal-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>15°C (Cold)</span>
                <span className="text-teal-700">27°C - 32°C (Optimum)</span>
                <span className="text-rose-600">38°C (Extreme)</span>
              </div>
            </div>

            {/* Time of Day */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Time of Day:
                </span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {telemetry.timeOfDay}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {['06:00 AM', '08:30 AM', '01:00 PM', '06:00 PM'].map((t) => (
                  <button
                    key={t}
                    onClick={() => aquacultureService.setTimeOfDay(t)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                      telemetry.timeOfDay === t
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. SCENARIO ONE-TAPS */}
          <div className="space-y-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              2. Scenario One-Taps
            </span>
            <div className="grid grid-cols-2 gap-2">
              {/* Hot Afternoon */}
              <button
                onClick={() => aquacultureService.applyScenarioPreset('hot_afternoon')}
                className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl text-left space-y-1 hover:bg-amber-100 transition-all touch-target"
              >
                <div className="flex items-center gap-1.5 text-amber-800 font-black text-xs">
                  <Flame className="w-4 h-4 text-amber-600" />
                  Hot Afternoon
                </div>
                <div className="text-[10px] text-amber-900 font-bold">
                  35°C · DO 6.5 mg/L
                </div>
              </button>

              {/* Oxygen Dropping */}
              <button
                onClick={() => aquacultureService.applyScenarioPreset('oxygen_dropping')}
                className="p-3 bg-rose-50 border-2 border-rose-400 rounded-2xl text-left space-y-1 hover:bg-rose-100 transition-all touch-target"
              >
                <div className="flex items-center gap-1.5 text-rose-800 font-black text-xs">
                  <Droplets className="w-4 h-4 text-rose-600" />
                  Oxygen Dropping
                </div>
                <div className="text-[10px] text-rose-900 font-bold">
                  DO 2.4 mg/L · STOP Alert
                </div>
              </button>

              {/* Cold Morning */}
              <button
                onClick={() => aquacultureService.applyScenarioPreset('cold_morning')}
                className="p-3 bg-sky-50 border-2 border-sky-300 rounded-2xl text-left space-y-1 hover:bg-sky-100 transition-all touch-target"
              >
                <div className="flex items-center gap-1.5 text-sky-800 font-black text-xs">
                  <Snowflake className="w-4 h-4 text-sky-600" />
                  Cold Morning
                </div>
                <div className="text-[10px] text-sky-900 font-bold">
                  18°C · DO 7.0 mg/L
                </div>
              </button>

              {/* Stock Running Low */}
              <button
                onClick={() => aquacultureService.applyScenarioPreset('stock_low')}
                className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl text-left space-y-1 hover:bg-amber-100 transition-all touch-target"
              >
                <div className="flex items-center gap-1.5 text-amber-800 font-black text-xs">
                  <PackageX className="w-4 h-4 text-amber-600" />
                  Stock Running Low
                </div>
                <div className="text-[10px] text-amber-900 font-bold">
                  Feed Y &lt; 2 days left
                </div>
              </button>
            </div>
          </div>

          {/* 3. TRIGGER ALERTS */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              3. Trigger Alerts
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => aquacultureService.triggerAlertCategory('low_oxygen')}
                className="p-2.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-xl font-black text-[11px] text-center hover:bg-rose-200 transition-all"
              >
                Force Low DO
              </button>
              <button
                onClick={() => aquacultureService.triggerAlertCategory('water_change')}
                className="p-2.5 bg-teal-100 text-teal-900 border border-teal-300 rounded-xl font-black text-[11px] text-center hover:bg-teal-200 transition-all"
              >
                Force Water Change
              </button>
              <button
                onClick={() => aquacultureService.triggerAlertCategory('extreme_condition')}
                className="p-2.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-black text-[11px] text-center hover:bg-amber-200 transition-all"
              >
                Force Extreme Temp
              </button>
            </div>
          </div>
        </div>

        {/* RESET & CLOSE BUTTONS */}
        <div className="pt-3 space-y-2 border-t border-slate-200">
          <div className="flex gap-2">
            <button
              onClick={() => aquacultureService.resetDemo()}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm rounded-full py-3.5 px-4 flex items-center justify-center gap-2 transition-all touch-target"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Demo Values</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-teal-700 hover:bg-teal-600 text-white font-black text-sm rounded-full py-3.5 px-4 flex items-center justify-center transition-all touch-target"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
