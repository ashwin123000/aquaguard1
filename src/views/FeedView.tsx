import React, { useState } from 'react';
import { Activity, Check, ChevronDown, ClipboardCheck, Droplets, RotateCcw, Save, SkipForward } from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';
import { DISCLAIMER_NOTE, mockFeedBatches, mockPonds, type MealItem } from '../MockData';
import { OxygenGateModal } from '../components/OxygenGateModal';

type Result = 'Given' | 'Reduced' | 'Skipped';

export const FeedView: React.FC = () => {
  const meals = aquacultureService.getMeals();
  const checkinData = aquacultureService.getCheckinData();
  const pending = meals.filter((meal) => meal.status === 'Pending' || meal.status === 'Reduced');
  const [mealId, setMealId] = useState(pending[0]?.id ?? meals[0]?.id ?? '');
  const meal = meals.find((item) => item.id === mealId) as any;
  const [oxygenMeal, setOxygenMeal] = useState<MealItem | null>(null);
  const [oxygenPassed, setOxygenPassed] = useState<Record<string, number>>({});
  const [actualKg, setActualKg] = useState('');
  const [batchId, setBatchId] = useState(mockFeedBatches[0]?.id ?? '');
  const [leftoverKg, setLeftoverKg] = useState('0');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<Result>('Given');
  const [message, setMessage] = useState('');

  const selectedBatch = mockFeedBatches.find((batch) => batch.id === batchId);
  const pond = mockPonds.find((item) => item.id === (meal as any)?.pondId) ?? mockPonds[0];

  const startOxygenCheck = () => {
    if (meal) setOxygenMeal(meal as any);
  };
  const onOxygenPass = (approvedKg: number) => {
    if (!oxygenMeal) return;
    setOxygenPassed((previous) => ({ ...previous, [oxygenMeal.id]: approvedKg }));
    setActualKg(String(approvedKg));
    setOxygenMeal(null);
  };
  const saveMeal = (resultOverride?: Result) => {
    if (!meal) return;
    const savedResult = resultOverride ?? result;
    const quantity = Number(actualKg);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setMessage('Enter a valid actual quantity in kg.');
      return;
    }
    const oxygen = oxygenPassed[meal.id];
    if (savedResult !== 'Skipped' && (oxygen === undefined || aquacultureService.evaluateOxygen(oxygen).status !== 'Safe')) {
      setMessage('Check oxygen before recording feed.');
      return;
    }
    if (savedResult === 'Skipped') {
      aquacultureService.recordMealSkipped(meal.id, reason || 'Skipped by feeding staff');
    } else {
      aquacultureService.recordMealFed(meal.id, quantity, Number(leftoverKg) > 0 ? 'a little' : 'none', {
        doAtMeal: oxygen,
        leftoverKg: Number(leftoverKg),
        reason: reason || undefined,
        feedBatchId: batchId,
        status: savedResult,
      });
    }
    setMessage(`${savedResult === 'Skipped' ? 'Meal skipped' : 'Meal saved'} for ${meal.time}.`);
  };
  const retryLater = () => {
    if (!meal) return;
    setOxygenPassed((previous) => {
      const next = { ...previous };
      delete next[meal.id];
      return next;
    });
    setMessage(`Oxygen check for ${meal.time} cleared. Retry when conditions improve.`);
  };

  if (!meal) {
    return <section className="space-y-4 pb-20 max-w-md mx-auto"><h2 className="text-2xl font-black">Meal Check / Feed Log</h2><div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 font-semibold">All meals are recorded for today.</div></section>;
  }

  const doValue = oxygenPassed[meal.id];
  const oxygenSafe = doValue !== undefined && aquacultureService.evaluateOxygen(doValue).status === 'Safe';
  const done = meal.status === 'Given' || meal.status === 'Skipped';

  return (
    <section className="max-w-md mx-auto space-y-5 pb-20">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Feeding staff · Meal record</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Meal Check / Feed Log</h2>
        <p className="mt-1 text-sm text-slate-500">Check pond oxygen before feeding, then record what actually happened.</p>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">Meal
          <span className="relative mt-1.5 block">
            <select value={mealId} onChange={(event) => { setMealId(event.target.value); setActualKg(''); setLeftoverKg('0'); setReason(''); setResult('Given'); setMessage(''); }} className="w-full appearance-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 pr-10 text-sm font-bold text-slate-900">
              {meals.map((item, index) => <option key={item.id} value={item.id}>Meal {index + 1} · {item.time} · {item.status}</option>)}
            </select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-slate-500" />
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3"><span className="block text-[11px] font-bold uppercase text-slate-500">Pond</span><span className="mt-1 block text-sm font-black text-slate-900">{pond.name}</span></div>
          <div className="rounded-xl bg-slate-50 p-3"><span className="block text-[11px] font-bold uppercase text-slate-500">Planned quantity</span><span className="mt-1 block text-sm font-black text-slate-900">{meal.plannedKg} kg</span></div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3"><span className="block text-[11px] font-bold uppercase text-slate-500">Feed product</span><span className="mt-1 block text-sm font-black text-slate-900">{meal.feedType}</span></div>
        <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">Feed batch
          <select value={batchId} onChange={(event) => setBatchId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900">
            {mockFeedBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber} · {batch.brand}</option>)}
          </select>
        </label>
        {selectedBatch && <p className="-mt-3 break-words text-xs text-slate-500">{selectedBatch.stockOnHandKg} kg on hand · expires {selectedBatch.expiry} · {selectedBatch.daysOfStockLeft} days of stock</p>}
      </div>

      <div className={`rounded-2xl border-2 p-4 ${doValue === undefined ? 'border-sky-200 bg-sky-50' : oxygenSafe ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
        <div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${oxygenSafe ? 'bg-emerald-600' : doValue === undefined ? 'bg-sky-600' : 'bg-rose-600'} text-white`}><Droplets className="h-5 w-5" /></div>
          <div className="flex-1"><p className="text-xs font-black uppercase tracking-wide text-slate-600">Dissolved oxygen at meal</p><p className="mt-0.5 text-lg font-black text-slate-950">{doValue === undefined ? `${checkinData.latestDO.toFixed(1)} mg/L · not checked` : `${doValue.toFixed(1)} mg/L`}</p><p className={`text-xs font-bold ${doValue === undefined ? 'text-slate-600' : oxygenSafe ? 'text-emerald-800' : 'text-rose-800'}`}>{oxygenSafe ? '✓ Safe to feed' : doValue === undefined ? 'Check oxygen to unlock feeding' : '⚠ Feeding blocked'}</p></div>
        </div>
        <button onClick={startOxygenCheck} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white"><Activity className="h-4 w-4" />{doValue === undefined ? 'Check Oxygen' : 'Check Oxygen Again'}</button>
        {doValue !== undefined && !oxygenSafe && <div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => { aquacultureService.recordMealSkipped(meal.id, reason || 'Low dissolved oxygen'); setMessage('Meal skipped because oxygen is below the feeding threshold.'); }} className="min-h-11 rounded-xl bg-rose-700 px-3 py-2 text-sm font-black text-white">Skip Meal</button><button onClick={retryLater} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700">Retry Later</button></div>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">Actual quantity (kg)<input type="number" min="0" step="0.1" value={actualKg} onChange={(event) => setActualKg(event.target.value)} placeholder="0.0" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-lg font-black text-slate-900" /></label>
          <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">Leftover (kg)<input type="number" min="0" step="0.1" value={leftoverKg} onChange={(event) => setLeftoverKg(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-lg font-black text-slate-900" /></label>
        </div>
        <fieldset><legend className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Result</legend><div className="mt-2 grid grid-cols-3 gap-2">
          {(['Given', 'Reduced', 'Skipped'] as Result[]).map((option) => <label key={option} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-2 text-sm font-black ${result === option ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-slate-200 text-slate-600'}`}><input className="accent-teal-700" type="radio" name="meal-result" value={option} checked={result === option} onChange={() => setResult(option)} />{option}</label>)}
        </div></fieldset>
        <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">Reason (optional)<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Add a note for a reduced or skipped meal" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium normal-case text-slate-900" /></label>
        <div className="grid grid-cols-2 gap-2">
          <button disabled={done} onClick={() => { setResult('Given'); saveMeal('Given'); }} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-black text-white disabled:opacity-50"><Check className="h-4 w-4" />Feed</button>
          <button disabled={done} onClick={() => { setResult('Reduced'); saveMeal('Reduced'); }} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 text-sm font-black text-amber-950 disabled:opacity-50"><ClipboardCheck className="h-4 w-4" />Reduce</button>
          <button disabled={done} onClick={() => { setResult('Skipped'); saveMeal('Skipped'); }} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-800 disabled:opacity-50"><SkipForward className="h-4 w-4" />Skip Meal</button>
          <button disabled={done} onClick={() => saveMeal()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />Save Meal</button>
        </div>
        {done && <p className="text-center text-xs font-bold text-slate-500">This meal has already been recorded.</p>}
        {message && <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">{message}</p>}
      </div>
      <button onClick={retryLater} className="flex w-full items-center justify-center gap-2 py-2 text-xs font-bold text-slate-500"><RotateCcw className="h-3.5 w-3.5" />Clear oxygen check and retry later</button>
      <p className="text-center text-[11px] font-semibold text-slate-400">{DISCLAIMER_NOTE}</p>
      {oxygenMeal && <OxygenGateModal meal={oxygenMeal} onClose={() => setOxygenMeal(null)} onUnlockMeal={onOxygenPass} onSkipMeal={(skipReason) => { aquacultureService.recordMealSkipped(oxygenMeal.id, skipReason); setOxygenMeal(null); setMessage('Meal skipped due to low oxygen.'); }} />}
    </section>
  );
};
