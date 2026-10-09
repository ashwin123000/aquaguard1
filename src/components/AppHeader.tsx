// src/components/AppHeader.tsx
import React, { useRef, useState } from 'react';
import { Sliders, CalendarCheck, Droplets } from 'lucide-react';
import { aquacultureService } from '../services/aquacultureService';

interface AppHeaderProps {
  onOpenDemoPanel: () => void;
  onOpenCheckin?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenDemoPanel, onOpenCheckin }) => {
  const farmSetup = aquacultureService.getFarmSetup();

  // Triple-tap detection
  const tapTimesRef = useRef<number[]>([]);
  const [hintText, setHintText] = useState<string | null>(null);

  const handleTitleClick = () => {
    const now = Date.now();
    tapTimesRef.current = [...tapTimesRef.current.filter((t) => now - t < 800), now];

    if (tapTimesRef.current.length >= 3) {
      tapTimesRef.current = [];
      setHintText('Demo sandbox unlocked!');
      setTimeout(() => setHintText(null), 2000);
      onOpenDemoPanel();
    } else if (tapTimesRef.current.length === 2) {
      setHintText('Tap once more for demo panel');
      setTimeout(() => setHintText(null), 1200);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-sm px-4 py-3.5">
      <div className="flex items-center justify-between">
        {/* LOGO & TITLE (YOGAZ STYLE WITH FLUID LOTUS / DROP ICON) */}
        <div
          onClick={handleTitleClick}
          className="flex items-center gap-3 cursor-pointer select-none group"
          title="Triple-tap title to open Demo Sandbox"
        >
          <div className="w-11 h-11 rounded-2xl bg-yogaz-primary text-white flex items-center justify-center shadow-yogaz-pill concentric-ring-blue group-active:scale-95 transition-transform">
            <Droplets className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-[#007cf0] transition-colors">
                JalDrishti
              </h1>
              <span className="text-[9px] font-black text-[#007cf0] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                PRO
              </span>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#007cf0] block mt-1">
              Precision Feeding · {farmSetup.pondName || 'Pond A1'}
            </span>
          </div>
        </div>

        {/* QUICK BUTTONS */}
        <div className="flex items-center gap-2">
          {onOpenCheckin && (
            <button
              onClick={onOpenCheckin}
              className="w-10 h-10 rounded-full bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-[#007cf0] border border-slate-200 flex items-center justify-center transition-smooth touch-target shadow-sm"
              title="Daily Check-in"
              aria-label="Daily Check-in"
            >
              <CalendarCheck className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenDemoPanel}
            className="w-10 h-10 rounded-full bg-sky-50 hover:bg-sky-100 text-[#007cf0] border border-sky-200 flex items-center justify-center shadow-sm transition-smooth touch-target"
            title="Open Demo Panel"
            aria-label="Demo Panel"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TRIPLE-TAP HINT POPUP */}
      {hintText && (
        <div className="mt-2 text-center text-[10px] font-black uppercase tracking-wider text-[#007cf0] bg-sky-50 border border-sky-200 rounded-full py-1 animate-in fade-in duration-150">
          {hintText}
        </div>
      )}
    </header>
  );
};
