// src/components/BottomNav.tsx
import React from 'react';
import {
  Calendar,
  Utensils,
  Droplets,
  Package,
  TrendingUp,
} from 'lucide-react';

export type MainTabType = 'today' | 'meals' | 'water' | 'inventory' | 'analytics';

interface BottomNavProps {
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  pendingMealsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  pendingMealsCount,
}) => {
  const tabs = [
    { id: 'today' as MainTabType, label: 'Today', icon: Calendar },
    { id: 'meals' as MainTabType, label: 'Feed Log', icon: Utensils },
    { id: 'water' as MainTabType, label: 'Water', icon: Droplets },
    { id: 'inventory' as MainTabType, label: 'Stock', icon: Package },
    { id: 'analytics' as MainTabType, label: 'Growth', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-sky-100 shadow-2xl max-w-md mx-auto">
      <div className="grid grid-cols-5 h-16">
        {tabs.map((t) => {
          const IconComp = t.icon;
          const isActive = activeTab === t.id;
          const showBadge = t.id === 'meals' && pendingMealsCount > 0;

          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition-all touch-target ${
                isActive
                  ? 'text-[#007cf0] font-black'
                  : 'text-slate-400 font-semibold hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-sky-50 text-[#007cf0] shadow-sm' : 'text-slate-400'
                  }`}
                >
                  <IconComp className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                </div>
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {pendingMealsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
