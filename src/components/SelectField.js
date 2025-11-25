// src/components/SelectField.js
import React from 'react';

function SelectField({ className = '', children, ...props }) {
  return (
    <div className="relative w-full">
      <select
        {...props}
        className={
          'w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 ' +
          className
        }
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg
          className="h-4 w-4 text-slate-400"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 8L10 13L15 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export default SelectField;
