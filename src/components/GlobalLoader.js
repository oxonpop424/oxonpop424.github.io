// src/components/GlobalLoader.js
import React from 'react';

function GlobalLoader({ show }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xl border border-slate-200/80 dark:border-slate-700/80">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default GlobalLoader;
