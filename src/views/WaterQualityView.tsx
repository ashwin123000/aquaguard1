import React, { useState } from 'react';
import {
  Droplets,
  Wind,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { HOURLY_OXYGEN_OUTLOOK, DISCLAIMER_NOTE, PLACEHOLDER_LIMITS } from '../data';

export const WaterQualityView: React.FC = () => {
  const telemetry = aquacultureService.getTelemetry();
  const farmSetup = aquacultureService.getFarmSetup();
  const [selectedHour, setSelectedHour] = useState<string>('08:00');

  const selectedPoint =
    HOURLY_OXYGEN_OUTLOOK.find((p) => p.hour === selectedHour) || HOURLY_OXYGEN_OUTLOOK[2];

  const isLowDO = telemetry.liveDO < PLACEHOLDER_LIMITS.oxygen.stopLevelMgL;
  const isCautionDO =
    telemetry.liveDO >= PLACEHOLDER_LIMITS.oxygen.stopLevelMgL &&
    telemetry.liveDO < PLACEHOLDER_LIMITS.oxygen.fullFeedingLevelMgL;

  // Aerator timeline
  const aeratorSchedule = [
    { time: '10:00 PM – 06:00 AM', status: 'Active', reason: 'Pre-dawn respiration prevention' },
    { time: '12:00 PM – 02:00 PM', status: 'Standby', reason: 'Destratification & surface mix' },
    { time: '02:00 PM – 06:00 PM', status: 'Off', reason: 'Natural photosynthetic saturation' },
  ];

  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto relative">
      {/* FLUID ORGANIC BACKGROUND WAVES */}
      <div className="absolute -top-12 -right-20 w-64 h-64 bg-gradient-to-bl from-sky-400/20 via-cyan-300/10 to-transparent blob-yogaz-hero pointer-events-none -z-10" />
      <div className="absolute top-80 -left-20 w-56 h-56 bg-gradient-to-tr from-sky-300/15 via-teal-200/10 to-transparent blob-yogaz-wave-2 pointer-events-none -z-10" />

      {/* HEADER */}
      <div className="pt-1">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#007cf0] block">
          POND TELEMETRY · SENSOR SUITE
        </span>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
          Water Quality & Aeration
        </h2>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          {farmSetup.pondName} · Continuous Multi-Probe Analysis
        </p>
      </div>

      {/* LIVE PROBE READOUT CARD (HERO CARD WITH HUGE NUMBER) */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-yogaz-card border border-sky-100 space-y-5 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-sky-50 text-[#007cf0] flex items-center justify-center">
              <Droplets className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-black uppercase text-slate-800 block">
                Optical Probe DO
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {telemetry.lastSyncText}
              </span>
            </div>
          </div>

          <span
            className={`text-xs font-black px-3 py-1 rounded-full border ${
              isLowDO
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : isCautionDO
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
            }`}
          >
            {isLowDO ? 'Stop Alert' : isCautionDO ? 'Caution Range' : 'Oxygen Safe'}
          </span>
        </div>

        {/* HUGE NUMBER >= 48px */}
        <div className="text-center py-2">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#007cf0] block">
            Current Dissolved Oxygen
          </span>
          <div className="flex items-baseline justify-center gap-2 my-1">
            <span className="text-6xl font-black text-slate-900 font-mono tracking-tight">
              {telemetry.liveDO.toFixed(1)}
            </span>
            <span className="text-2xl font-black text-[#007cf0] font-mono">
              mg/L
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Target feeding threshold: ≥ 5.0 mg/L · Emergency stop: &lt; 3.0 mg/L
          </div>
        </div>

        {/* 3 PARAMETER METRIC CHIPS */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Temp</span>
            <span className="text-sm font-black text-slate-900 font-mono block">
              {telemetry.liveTemp.toFixed(1)}°C
            </span>
            <span className="text-[9px] font-bold text-[#007cf0]">Optimum</span>
          </div>

          <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">pH Probe</span>
            <span className="text-sm font-black text-slate-900 font-mono block">
              7.6
            </span>
            <span className="text-[9px] font-bold text-emerald-600">Stable</span>
          </div>

          <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Turbidity</span>
            <span className="text-sm font-black text-slate-900 font-mono block">
              {telemetry.turbidityNtu} NTU
            </span>
            <span className="text-[9px] font-bold text-slate-600">Normal</span>
          </div>
        </div>
      </div>

      {/* 24-HOUR DIURNAL OXYGEN CURVE */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200/90 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007cf0] block">
              DIURNAL CYCLE
            </span>
            <h3 className="text-base font-black text-slate-900">
              24-Hour Oxygen Forecasting Curve
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            Photosynthesis Model
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Oxygen peaks in mid-afternoon from algae photosynthesis and drops to its lowest trough right before dawn due to night respiration.
        </p>

        {/* INTERACTIVE CHART BARS */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-3">
          <div className="flex items-end justify-between gap-1.5 h-36 pt-4 px-1">
            {HOURLY_OXYGEN_OUTLOOK.map((pt) => {
              const isSelected = selectedHour === pt.hour;
              const heightPct = Math.min(100, Math.max(15, (pt.predictedDO / 8.5) * 100));
              const isSafe = pt.predictedDO >= 5.0;
              const isDanger = pt.predictedDO < 3.5;

              return (
                <div
                  key={pt.hour}
                  onClick={() => setSelectedHour(pt.hour)}
                  className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <span className={`text-[9px] font-bold font-mono transition-opacity ${
                    isSelected ? 'opacity-100 text-[#007cf0]' : 'opacity-0 group-hover:opacity-100 text-slate-500'
                  }`}>
                    {pt.predictedDO}
                  </span>

                  <div className="w-full max-w-[28px] h-28 bg-slate-200 rounded-t-xl flex items-end overflow-hidden p-0.5">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all ${
                        isSelected
                          ? 'bg-[#007cf0] shadow-md'
                          : isDanger
                          ? 'bg-rose-400 group-hover:bg-rose-500'
                          : isSafe
                          ? 'bg-emerald-400 group-hover:bg-emerald-500'
                          : 'bg-amber-400 group-hover:bg-amber-500'
                      }`}
                    />
                  </div>

                  <span className={`text-[10px] font-black transition-colors ${
                    isSelected ? 'text-[#007cf0]' : 'text-slate-500'
                  }`}>
                    {pt.hour.split(':')[0]}h
                  </span>
                </div>
              );
            })}
          </div>

          {/* DETAIL STRIP FOR SELECTED HOUR */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-extrabold text-slate-900 block font-mono">
                {selectedPoint.hour} Window · {selectedPoint.predictedDO} mg/L
              </span>
              <span className="text-[11px] text-slate-500">{selectedPoint.reason}</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${
              selectedPoint.safety === 'Safe'
                ? 'bg-emerald-100 text-emerald-800'
                : selectedPoint.safety === 'Caution'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {selectedPoint.safety}
            </span>
          </div>
        </div>
      </div>

      {/* AERATOR AUTOMATION SCHEDULE */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200/90 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
              <Wind className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007cf0] block">
                AERATION TIMELINE
              </span>
              <h3 className="text-base font-black text-slate-900">
                Paddlewheel Aerator Plan
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            2 Units Sync
          </span>
        </div>

        <div className="space-y-2.5">
          {aeratorSchedule.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-black text-slate-900 font-mono block">
                  {item.time}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {item.reason}
                </span>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                item.status === 'Active'
                  ? 'bg-teal-100 text-teal-900 border border-teal-300'
                  : item.status === 'Standby'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {item.status}
              </span>
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
