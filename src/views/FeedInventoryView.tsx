import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { DISCLAIMER_NOTE } from '../data';

export const FeedInventoryView: React.FC = () => {
  const inventory = aquacultureService.getFeedInventory();
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);

  const totalStockKg = inventory.reduce((acc, item) => acc + item.stockOnHandKg, 0);
  const shortBatches = inventory.filter((item) => item.isShortStock || item.daysLeft < 3.0);

  const handleSimulateRestock = (feedId: string) => {
    // Restock +50 kg in demo
    setRestockSuccessMsg(`Added +50 kg to ${feedId.toUpperCase()}. Inventory replenished.`);
    setTimeout(() => setRestockSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 pb-28 max-w-md mx-auto relative">
      {/* FLUID BACKGROUND WAVES */}
      <div className="absolute -top-12 -right-20 w-64 h-64 bg-gradient-to-bl from-sky-400/20 via-cyan-300/10 to-transparent blob-yogaz-hero pointer-events-none -z-10" />
      <div className="absolute top-80 -left-20 w-56 h-56 bg-gradient-to-tr from-sky-300/15 via-teal-200/10 to-transparent blob-yogaz-wave-2 pointer-events-none -z-10" />

      {/* HEADER */}
      <div className="pt-1">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#007cf0] block">
          POND SUPPLIES · LOGISTICS
        </span>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
          Feed Stock & Inventory
        </h2>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          Real-time Bag Tracking & Automated Reorder Alarms
        </p>
      </div>

      {/* INVENTORY TOTALS HERO CARD */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-yogaz-card border border-sky-100 space-y-4">
        <div className="flex items-center justify-between border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-sky-50 text-[#007cf0] flex items-center justify-center">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-black uppercase text-slate-800 block">
                Total Feed on Hand
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                3 Registered Product Lines
              </span>
            </div>
          </div>

          <span className="text-xs font-black text-[#007cf0] bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            3 Active Batches
          </span>
        </div>

        {/* HUGE NUMBER >= 48px */}
        <div className="text-center py-2">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#007cf0] block">
            Aggregated Warehouse Stock
          </span>
          <div className="flex items-baseline justify-center gap-2 my-1">
            <span className="text-6xl font-black text-slate-900 font-mono tracking-tight">
              {totalStockKg.toFixed(1)}
            </span>
            <span className="text-2xl font-black text-[#007cf0] font-mono">
              kg
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Daily total farm burn rate: ~29.5 kg / day
          </p>
        </div>

        {/* RESTOCK SUCCESS NOTICE */}
        {restockSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold p-3 rounded-2xl text-center animate-in fade-in">
            {restockSuccessMsg}
          </div>
        )}
      </div>

      {/* STOCK SHORT ALARMS IF ANY */}
      {shortBatches.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 block px-1">
            STOCK SHORT CRITICAL ALERTS ({shortBatches.length})
          </span>

          {shortBatches.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-400 text-rose-950 space-y-3 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black">{item.codeName} Running Low</h4>
                    <span className="text-xs font-bold text-rose-800">
                      Only {item.daysLeft.toFixed(1)} days of stock left ({item.stockOnHandKg} kg)
                    </span>
                  </div>
                </div>

                <span className="bg-rose-200 text-rose-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                  Reorder
                </span>
              </div>

              {item.suggestedSwap && (
                <div className="bg-white/80 rounded-2xl p-3 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <span className="font-black block flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                    Suggested Transition Swap:
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Transition fish to <strong className="text-rose-950">{item.suggestedSwap}</strong> to maintain growth without starvation interruption.
                  </p>
                </div>
              )}

              <button
                onClick={() => handleSimulateRestock(item.id)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-full py-3 px-4 flex items-center justify-center gap-1.5 shadow transition-smooth touch-target"
              >
                <span>Simulate Receiving 50 kg Batch</span>
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FEED PRODUCT BATCHES LIST */}
      <div className="space-y-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007cf0] block px-1">
          REGISTERED FEED BATCHES
        </span>

        <div className="space-y-3">
          {inventory.map((item) => {
            const isShort = item.isShortStock || item.daysLeft < 3.0;

            return (
              <div
                key={item.id}
                className="bg-white rounded-[2rem] p-5 border border-slate-200/90 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-slate-900">
                        {item.codeName}
                      </h4>
                      <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.pelletSizeMm} mm
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {item.feedType}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full border ${
                      isShort
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    }`}
                  >
                    {item.daysLeft.toFixed(1)} days left
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl text-xs font-bold">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Stock on hand</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {item.stockOnHandKg} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Daily burn</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {item.dailyUsageKg} kg / day
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Batch #AK-2026-09 · Exp: Nov 2026
                  </span>

                  <button
                    onClick={() => handleSimulateRestock(item.id)}
                    className="text-xs font-bold text-[#007cf0] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Add</span>
                  </button>
                </div>
              </div>
            );
          })}
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
