// src/components/AppFooter.tsx
import React from 'react';
import { DISCLAIMER_NOTE } from '../MockData';

export const AppFooter: React.FC = () => {
  return (
    <footer className="py-3 px-4 bg-white border-t border-slate-100 text-center">
      <p className="text-[11px] text-slate-400 font-semibold tracking-wide">
        {DISCLAIMER_NOTE}
      </p>
    </footer>
  );
};
