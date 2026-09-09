import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'veg' | 'non-veg' | 'available' | 'occupied' | 'reserved' | 'running';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold';
  
  const variants = {
    success: 'bg-[#ECFDF5] text-emerald-800 border border-[#BBF7D0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-[#FFFBEB] text-amber-800 border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    error: 'bg-[#FEF2F2] text-rose-800 border border-[#FCA5A5] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    info: 'bg-[#EFF6FF] text-blue-800 border border-[#BFDBFE] dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    purple: 'bg-[#F5F3FF] text-purple-800 border border-[#DDD6FE] dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    neutral: 'bg-[#F5F5F4] text-[#111827] border border-[#D6D3D1] dark:bg-stone-900 dark:text-stone-200 dark:border-stone-800',
    available: 'bg-[#ECFDF5] text-emerald-800 border border-[#BBF7D0]',
    occupied: 'bg-[#FEF2F2] text-rose-800 border border-[#FCA5A5]',
    reserved: 'bg-[#F5F5F4] text-[#78716C] border border-[#D6D3D1]',
    running: 'bg-[#EFF6FF] text-blue-800 border border-[#BFDBFE]',
    veg: 'bg-[#ECFDF5] text-emerald-800 border border-[#BBF7D0] flex items-center gap-1 before:content-[""] before:inline-block before:w-2 before:h-2 before:bg-emerald-600 before:rounded-full dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    'non-veg': 'bg-[#FEF2F2] text-rose-800 border border-[#FCA5A5] flex items-center gap-1 before:content-[""] before:inline-block before:w-0 before:h-0 before:border-l-[4px] before:border-l-transparent before:border-r-[4px] before:border-r-transparent before:border-b-[8px] before:border-b-rose-600 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
  };

  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
