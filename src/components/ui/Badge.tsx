import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'veg' | 'non-veg';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold';
  
  const variants = {
    success: 'bg-gray-100 text-gray-950 font-bold border border-gray-300 dark:bg-gray-800 dark:text-white dark:border-gray-700',
    warning: 'bg-gray-50 text-gray-900 font-semibold border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
    error: 'bg-transparent text-gray-950 font-bold border border-gray-400 dark:text-gray-100 dark:border-gray-500',
    info: 'bg-white text-gray-950 font-bold border border-gray-900 dark:bg-gray-950 dark:text-white dark:border-gray-200',
    purple: 'bg-transparent text-gray-800 border border-gray-300 dark:text-gray-200 dark:border-gray-700',
    neutral: 'bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800',
    veg: 'bg-gray-50 text-gray-900 border border-gray-300 flex items-center gap-1 before:content-[""] before:inline-block before:w-2 before:h-2 before:bg-gray-900 before:rounded-full dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:before:bg-gray-100',
    'non-veg': 'bg-gray-50 text-gray-900 border border-gray-300 flex items-center gap-1 before:content-[""] before:inline-block before:w-0 before:h-0 before:border-l-[4px] before:border-l-transparent before:border-r-[4px] before:border-r-transparent before:border-b-[8px] before:border-b-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:before:border-b-gray-100'
  };

  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
