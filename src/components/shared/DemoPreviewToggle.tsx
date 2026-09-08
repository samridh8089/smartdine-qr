'use client';

import React from 'react';
import { usePreviewMode } from '@/context/PreviewModeContext';
import { Sparkles } from 'lucide-react';

export default function DemoPreviewToggle() {
  const { isPreviewMode, togglePreviewMode } = usePreviewMode();

  return (
    <div className="flex items-center space-x-2 bg-[#F5F5F4] border border-[#E7E5E4] px-2.5 py-1 rounded-full shadow-2xs select-none">
      <span className="text-[11px] font-bold text-[#171717] tracking-tight flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-[#171717]" />
        Preview Mode
      </span>
      <button
        type="button"
        onClick={togglePreviewMode}
        className={`relative inline-flex h-4.5 w-8.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isPreviewMode ? 'bg-emerald-600' : 'bg-stone-300'
        }`}
        title={`Toggle Preview Mode (Currently ${isPreviewMode ? 'ON' : 'OFF'})`}
        aria-label="Toggle Preview Mode"
      >
        <span
          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
            isPreviewMode ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span
        className={`text-[10px] font-black uppercase tracking-wider ${
          isPreviewMode ? 'text-emerald-700' : 'text-stone-500'
        }`}
      >
        {isPreviewMode ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
