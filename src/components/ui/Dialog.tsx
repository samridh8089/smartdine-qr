import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '4xl';
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = ''
}: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '4xl': 'max-w-4xl'
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Dialog Content Container */}
      <div className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full ${sizeClasses[size]} ${className} overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] animate-pop z-10 border border-slate-200 dark:border-slate-800`}>
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0 text-sm text-slate-600 dark:text-slate-300 overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
