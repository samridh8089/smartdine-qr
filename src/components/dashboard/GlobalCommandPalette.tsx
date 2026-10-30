'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, Sparkles, FileText, Wallet, Boxes, UserPlus,
  Banknote, QrCode, Tag, BarChart3, UtensilsCrossed, Camera,
  ChefHat, UserCheck, Printer, Percent, AlertTriangle, Store,
  ChevronRight, ArrowRight, CornerDownLeft, HelpCircle,
  CheckCircle2, Compass, Info
} from 'lucide-react';
import { SearchKnowledgeItem, searchKnowledgeCatalog } from '@/lib/searchKnowledge';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

// Dynamic Lucide Icon Mapper
function renderItemIcon(iconName: string, className: string = 'h-4 w-4') {
  switch (iconName) {
    case 'Sparkles': return <Sparkles className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'Wallet': return <Wallet className={className} />;
    case 'Boxes': return <Boxes className={className} />;
    case 'UserPlus': return <UserPlus className={className} />;
    case 'Banknote': return <Banknote className={className} />;
    case 'QrCode': return <QrCode className={className} />;
    case 'Tag': return <Tag className={className} />;
    case 'BarChart3': return <BarChart3 className={className} />;
    case 'UtensilsCrossed': return <UtensilsCrossed className={className} />;
    case 'Camera': return <Camera className={className} />;
    case 'ChefHat': return <ChefHat className={className} />;
    case 'UserCheck': return <UserCheck className={className} />;
    case 'Printer': return <Printer className={className} />;
    case 'Percent': return <Percent className={className} />;
    case 'AlertTriangle': return <AlertTriangle className={className} />;
    case 'Store': return <Store className={className} />;
    default: return <Compass className={className} />;
  }
}

const QUICK_PROMPTS = [
  { label: 'AI Recipe', query: 'ai recipe' },
  { label: 'Salary Slip', query: 'salary slip' },
  { label: '+ Add Raw Material', query: 'add item' },
  { label: 'New Staff', query: 'new account staff' },
  { label: 'Cash Closing', query: 'cash closing' },
  { label: 'Table QR', query: 'table qr' }
];

export default function GlobalCommandPalette({
  isOpen,
  onClose,
  userRole = 'owner'
}: GlobalCommandPaletteProps) {
  const router = useRouter();

  // 1. useState hooks (Structured strictly first per safety rules)
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 2. useRef hooks
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // 3. useMemo hooks
  const searchResults = useMemo(() => {
    const { items } = searchKnowledgeCatalog(query, userRole, 20);
    return items;
  }, [query, userRole]);

  const activeItem: SearchKnowledgeItem | null = useMemo(() => {
    if (searchResults.length === 0) return null;
    const safeIdx = Math.min(Math.max(0, selectedIndex), searchResults.length - 1);
    return searchResults[safeIdx] || null;
  }, [searchResults, selectedIndex]);

  // 4. useCallback hooks
  const handleExecuteAction = useCallback((item: SearchKnowledgeItem) => {
    if (!item?.route) return;
    onClose();
    router.push(item.route);
  }, [onClose, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeItem) {
        handleExecuteAction(activeItem);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [searchResults.length, activeItem, handleExecuteAction, onClose]);

  // 5. useEffect hooks
  // Auto-focus input on open & reset state
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view on keyboard navigation
  useEffect(() => {
    if (!listContainerRef.current) return;
    const selectedElem = listContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedElem) {
      selectedElem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Early conditional return strictly after ALL hooks
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="w-full h-full sm:h-auto sm:max-h-[80vh] sm:max-w-3xl bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Search Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Search className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            id="command-palette-title"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Search features: "AI recipe", "salary slip", "add item", "new staff"...'
            className="w-full bg-transparent text-sm sm:text-base font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden pr-8 text-slate-900 dark:text-white"
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              aria-label="Close dialog"
            >
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded">ESC</kbd>
              <X className="sm:hidden h-4 w-4" />
            </button>
          )}
        </div>

        {/* Clean Quick Suggestion Pills (When query is empty) */}
        {!query && (
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[11px] font-medium text-slate-400 shrink-0 mr-1">Suggestions:</span>
            {QUICK_PROMPTS.map(p => (
              <button
                key={p.query}
                type="button"
                onClick={() => {
                  setQuery(p.query);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shrink-0 cursor-pointer text-xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Body: Simple Left List + Clean Right Steps */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Column: Clean List of Items */}
          <div
            ref={listContainerRef}
            className="w-full md:w-80 border-r border-slate-100 dark:border-slate-800 overflow-y-auto p-2 divide-y divide-slate-100/60 dark:divide-slate-800/40"
          >
            {searchResults.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2 text-slate-400">
                <p className="text-xs">Koi match nahi mila &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              searchResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;

                return (
                  <div
                    key={item.id}
                    data-index={idx}
                    onClick={() => {
                      setSelectedIndex(idx);
                      // On mobile, tap directly executes
                      if (window.innerWidth < 768) {
                        handleExecuteAction(item);
                      }
                    }}
                    onDoubleClick={() => handleExecuteAction(item)}
                    className={`flex items-center justify-between p-2.5 my-0.5 rounded-xl transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium shadow-xs'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className={`shrink-0 ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-400'}`}>
                        {renderItemIcon(item.icon, 'h-4 w-4')}
                      </span>
                      <span className="text-xs sm:text-sm truncate">
                        {item.title}
                      </span>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-30'}`} />
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Clean Steps & Big Action Button */}
          <div className="hidden md:flex flex-1 flex-col justify-between bg-slate-50/40 dark:bg-slate-950/20 p-5 overflow-y-auto">
            {activeItem ? (
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {activeItem.title}
                  </h3>
                </div>

                {/* Steps Section */}
                {activeItem.steps && activeItem.steps.length > 0 && (
                  <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Process (Kaise Karein):</span>
                    </div>
                    <div className="space-y-2">
                      {activeItem.steps.map((step, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <span className="h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 text-slate-700 dark:text-slate-300">
                            {sIdx + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional Tip */}
                {activeItem.tip && (
                  <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Tip:</strong> {activeItem.tip}</span>
                  </div>
                )}

                {/* Direct Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleExecuteAction(activeItem)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <span>🚀 {activeItem.actionText}</span>
                    <CornerDownLeft className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs">
                Select an item on the left
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
