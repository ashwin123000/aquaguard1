// src/views/ProgressView.tsx
import React, { useState } from 'react';
import {
  Scale,
  Calendar,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { DISCLAIMER_NOTE } from '../MockData';

export const ProgressView: React.FC = () => {
  const farmSetup = aquacultureService.getFarmSetup();
  const species = aquacultureService.getSelectedSpecies();
  const weighRecords = aquacultureService.getSampleWeighRecords();

  const [realWeightInput, setRealWeightInput] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);

  const handleAddWeigh = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(realWeightInput);
    if (!isNaN(val) && val > 0) {
      aquacultureService.addSampleWeigh(val);
      setRealWeightInput('');
      setShowForm(false);
    }
  };

  // FCR & Feed demand calculations (fake / hardcoded baseline for realistic numbers)
  const currentWeightG = farmSetup.currentEstimatedWeightG;
  const stock = farmSetup.stockCount;
  const totalBiomassKg = (currentWeightG * stock) / 1000;
  const dailyFeedKg = totalBiomassKg * 0.028;

  const feed7Days = Math.round(dailyFeedKg * 7);
  const feed14Days = Math.round(dailyFeedKg * 14);
  const feed30Days = Math.round(dailyFeedKg * 30);

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto">
      {/* HEADER */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Growth & Feed Forecast
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Track real sample weight vs model growth predictions.
        </p>
      </div>

      {/* ESTIMATED WEIGHT & STAGE CARD */}
      <div className="bg-white border-2 border-slate-200 p-5 rounded-3xl space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Current Estimated Biomass
          </span>
          <span className="bg-sky-100 text-sky-900 text-xs font-black px-2.5 py-1 rounded-xl border border-sky-300">
            {farmSetup.currentStageName}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
              Mean Fish Weight
            </span>
            <span className="text-3xl font-black text-slate-900 font-mono">
              {currentWeightG.toFixed(1)}{' '}
              <span className="text-sm font-bold text-slate-600">g</span>
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
              Total Biomass
            </span>
            <span className="text-3xl font-black text-slate-900 font-mono">
              {Math.round(totalBiomassKg)}{' '}
              <span className="text-sm font-bold text-slate-600">kg</span>
            </span>
          </div>
        </div>

        {/* Amber Placeholder Badge */}
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs font-extrabold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Placeholder, expert review needed: Species {species.name} (FCR {species.expectedFCR}).
          </span>
        </div>
      </div>

      {/* FEED NEEDED OVER 7, 14, AND 30 DAYS (3 CARDS) */}
      <div className="space-y-3">
        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Package className="w-5 h-5 text-teal-700" />
          <span>Feed Demand Forecast</span>
        </h3>

        <div className="grid grid-cols-3 gap-2.5">
          {/* 7 Days */}
          <div className="bg-white border-2 border-slate-200 p-3.5 rounded-2xl text-center space-y-1 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
              7 Days
            </span>
            <span className="text-xl font-black text-slate-900 font-mono block">
              {feed7Days} kg
            </span>
            <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 inline-block">
              ~{(feed7Days / 40).toFixed(1)} bags
            </span>
          </div>

          {/* 14 Days */}
          <div className="bg-white border-2 border-slate-200 p-3.5 rounded-2xl text-center space-y-1 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
              14 Days
            </span>
            <span className="text-xl font-black text-slate-900 font-mono block">
              {feed14Days} kg
            </span>
            <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 inline-block">
              ~{(feed14Days / 40).toFixed(1)} bags
            </span>
          </div>

          {/* 30 Days */}
          <div className="bg-white border-2 border-slate-200 p-3.5 rounded-2xl text-center space-y-1 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
              30 Days
            </span>
            <span className="text-xl font-black text-slate-900 font-mono block">
              {feed30Days} kg
            </span>
            <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 inline-block">
              ~{(feed30Days / 40).toFixed(1)} bags
            </span>
          </div>
        </div>
      </div>

      {/* WEEKLY SAMPLE WEIGH FORM & HISTORY */}
      <div className="bg-white border-2 border-slate-200 p-5 rounded-3xl space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-sky-600" />
            <h3 className="text-lg font-black text-slate-900">Weekly Sample Weigh</h3>
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow"
            >
              + Record Weigh
            </button>
          )}
        </div>

        {/* RECORD FORM */}
        {showForm && (
          <form onSubmit={handleAddWeigh} className="bg-slate-50 border border-slate-300 p-4 rounded-2xl space-y-3 animate-in fade-in">
            <label className="text-xs font-extrabold text-slate-700 uppercase block">
              Enter Actual Sample Mean Weight (g):
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 44.5"
                value={realWeightInput}
                onChange={(e) => setRealWeightInput(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-lg font-mono font-bold text-slate-900 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* COMPARISON HISTORY TABLE */}
        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider block">
            Predicted vs Real Weight History
          </span>

          <div className="space-y-2">
            {weighRecords.map((rec) => {
              const diffG = Math.round((rec.realWeightG - rec.predictedWeightG) * 10) / 10;
              const isAhead = diffG >= 0;

              return (
                <div
                  key={rec.id}
                  className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between text-xs font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{rec.date}</span>
                  </div>

                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-slate-500">
                      Pred: <strong>{rec.predictedWeightG}g</strong>
                    </span>
                    <span className="text-slate-900 font-extrabold">
                      Real: <strong>{rec.realWeightG}g</strong>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        isAhead ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {isAhead ? `+${diffG}g` : `${diffG}g`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <p className="text-[11px] text-center text-slate-400 font-semibold tracking-wide">
        {DISCLAIMER_NOTE}
      </p>
    </div>
  );
};
