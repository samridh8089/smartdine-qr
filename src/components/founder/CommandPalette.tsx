'use client';

/**
 * Phase-28: Linear/Raycast style Command Palette for Founder Control Center.
 * Activated via Ctrl+K, Cmd+K, or clicking header search.
 * Searches across Orders, Tables, Modes, Waiters, Reports, and Actions.
 * Strictly adheres to CleverOps React Hook Safety Guardrail.
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  Activity,
  RotateCcw,
  PauseCircle,
  Network,
  Bug,
  Sun,
  Moon,
  Zap,
  PhoneCall,
  FileText,
  Boxes,
  X,
  ArrowRight,
  Sparkles,
  Command,
} from 'lucide-react';
import type { FounderMode } from './types';
import { SEED_INVESTIGATION_ORDERS, InvestigatedOrder } from './OrderInvestigationBar';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: FounderMode) => void;
  onSelectOrder: (order: InvestigatedOrder) => void;
  onSelectTable: (tableName: string) => void;
  onToggleTheme: () => void;
  theme?: 'dark' | 'light';
}

interface CommandItem {
  id: string;
  category: 'Modes' | 'Orders' | 'Tables' | 'Subsystems' | 'Actions';
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: typeof Activity;
  iconColor: string;
  action: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onSelectMode,
  onSelectOrder,
  onSelectTable,
  onToggleTheme,
  theme = 'dark',
}: CommandPaletteProps) {
  // ── 1. useState ──
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // ── 2. useRef ──
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // ── 3. useMemo: Build command items ──
  const allCommands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Modes
      {
        id: 'mode-live',
        category: 'Modes',
        title: 'Live Workflow Pipeline',
        subtitle: 'Real-time n8n-style execution graph with active order pulses',
        shortcut: 'L',
        icon: Activity,
        iconColor: 'text-sky-400',
        action: () => {
          onSelectMode('live');
          onClose();
        },
      },
      {
        id: 'mode-replay',
        category: 'Modes',
        title: 'CCTV Replay Mode',
        subtitle: 'Scrub historical events with instant playback and stage banners',
        shortcut: 'R',
        icon: RotateCcw,
        iconColor: 'text-indigo-400',
        action: () => {
          onSelectMode('replay');
          onClose();
        },
      },
      {
        id: 'mode-freeze',
        category: 'Modes',
        title: 'Freeze Frame & Ghost Mode',
        subtitle: 'Pause telemetry and inspect historical table state and deltas',
        shortcut: 'F',
        icon: PauseCircle,
        iconColor: 'text-cyan-400',
        action: () => {
          onSelectMode('freeze');
          onClose();
        },
      },
      {
        id: 'mode-system',
        category: 'Modes',
        title: 'System Architecture Map',
        subtitle: 'Permanent blueprint of backend services and database pipelines',
        shortcut: 'S',
        icon: Network,
        iconColor: 'text-emerald-400',
        action: () => {
          onSelectMode('system');
          onClose();
        },
      },
      {
        id: 'mode-debug',
        category: 'Modes',
        title: 'Debug & Anomaly Finder',
        subtitle: 'Scan error rates, latency thresholds, and system health',
        shortcut: 'D',
        icon: Bug,
        iconColor: 'text-amber-400',
        action: () => {
          onSelectMode('debug');
          onClose();
        },
      },

      // Orders (Seed & Real)
      ...SEED_INVESTIGATION_ORDERS.map((ord) => ({
        id: `order-${ord.id}`,
        category: 'Orders' as const,
        title: `Order #${ord.id}`,
        subtitle: `${ord.tableName} · ${ord.customerName} · ₹${ord.totalAmount} · Waiter: ${ord.waiterName}`,
        shortcut: ord.id.slice(-4),
        icon: Zap,
        iconColor: 'text-amber-400',
        action: () => {
          onSelectOrder(ord);
          onClose();
        },
      })),

      // Tables
      {
        id: 'table-12',
        category: 'Tables',
        title: 'Table 12',
        subtitle: 'PREPARING · Waiter: Neha Patel · 2 items · ₹689 · ETA 6m',
        shortcut: 'T12',
        icon: Sparkles,
        iconColor: 'text-emerald-400',
        action: () => {
          onSelectTable('Table 12');
          onClose();
        },
      },
      {
        id: 'table-14',
        category: 'Tables',
        title: 'Table 14',
        subtitle: 'OCCUPIED · Waiter: Ravi Sharma · 2 items · ₹458 · ETA 6m',
        shortcut: 'T14',
        icon: Sparkles,
        iconColor: 'text-emerald-400',
        action: () => {
          onSelectTable('Table 14');
          onClose();
        },
      },
      {
        id: 'table-1',
        category: 'Tables',
        title: 'Table 1',
        subtitle: 'AVAILABLE · 4 Seats · Ready for guests',
        shortcut: 'T1',
        icon: Sparkles,
        iconColor: 'text-slate-400',
        action: () => {
          onSelectTable('Table 1');
          onClose();
        },
      },
      {
        id: 'table-16',
        category: 'Tables',
        title: 'Table 16',
        subtitle: 'READY · Waiter: Ravi Sharma · 1 item · ₹280',
        shortcut: 'T16',
        icon: Sparkles,
        iconColor: 'text-emerald-400',
        action: () => {
          onSelectTable('Table 16');
          onClose();
        },
      },

      // Subsystems
      {
        id: 'subsystem-reports',
        category: 'Subsystems',
        title: 'Executive Operations Report',
        subtitle: 'Revenue KPIs, Order Volume, Kitchen Prep Times & Staff Leaderboard',
        icon: FileText,
        iconColor: 'text-purple-400',
        action: () => {
          onSelectMode('live');
          onSelectTable('');
          onClose();
        },
      },
      {
        id: 'subsystem-calls',
        category: 'Subsystems',
        title: 'Customer Service Calls Dispatcher',
        subtitle: 'Live waiter summons, assistance requests & instant resolution',
        icon: PhoneCall,
        iconColor: 'text-rose-400',
        action: () => {
          onSelectMode('live');
          onClose();
        },
      },
      {
        id: 'subsystem-inventory',
        category: 'Subsystems',
        title: 'Frozen Inventory Engine Audit',
        subtitle: 'Idempotent stock reservations, recipe scaling and audit telemetry',
        icon: Boxes,
        iconColor: 'text-teal-400',
        action: () => {
          onSelectMode('live');
          onClose();
        },
      },

      // Actions
      {
        id: 'action-theme',
        category: 'Actions',
        title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        subtitle: 'Toggle theme palette (Shortcut: T)',
        shortcut: 'T',
        icon: theme === 'dark' ? Sun : Moon,
        iconColor: 'text-amber-300',
        action: () => {
          onToggleTheme();
          onClose();
        },
      },
    ];

    return items;
  }, [onSelectMode, onSelectOrder, onSelectTable, onToggleTheme, onClose, theme]);

  // Filtered command items
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q) ||
        (c.shortcut && c.shortcut.toLowerCase().includes(q))
    );
  }, [allCommands, query]);

  // ── 4. useCallback ──
  const handleSelect = useCallback(
    (index: number) => {
      const item = filteredCommands[index];
      if (item) {
        item.action();
      }
    },
    [filteredCommands]
  );

  // ── 5. useEffect ──
  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Key navigation (Up, Down, Enter, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(selectedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands.length, selectedIndex, handleSelect, onClose]);

  // Reset selected index if list shrinks
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(0);
    }
  }, [filteredCommands.length, selectedIndex]);

  // ── Render ──
  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div
      data-testid="command-palette-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
    >
      <div
        data-testid="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150 ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900 shadow-slate-400/50'
            : 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/80'
        }`}
      >
        {/* Search Header */}
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-850'}`}>
          <Search className={`h-5 w-5 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search orders, tables, reports, or press Esc..."
            className="flex-1 bg-transparent text-sm font-mono focus:outline-none placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
              ESC
            </kbd>
          </div>
        </div>

        {/* Command List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No matching commands or orders found for &ldquo;{query}&rdquo;</p>
              <p className="text-[10px] text-slate-600 mt-1">Try searching &ldquo;Table 12&rdquo;, &ldquo;Replay&rdquo;, or &ldquo;A7K&rdquo;</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = selectedIndex === idx;
              const Icon = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  data-testid={`command-item-${cmd.id}`}
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-100 ${
                    isSelected
                      ? isLight
                        ? 'bg-sky-100 border border-sky-300 shadow-sm'
                        : 'bg-sky-950/80 border border-sky-600/70 shadow-md shadow-sky-950/50'
                      : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg border shrink-0 ${
                        isLight
                          ? 'bg-slate-100 border-slate-200'
                          : 'bg-slate-800 border-slate-700/80'
                      } ${cmd.iconColor}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{cmd.title}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                            isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cmd.category}
                        </span>
                      </div>
                      {cmd.subtitle && (
                        <p className={`text-[11px] truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {cmd.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {cmd.shortcut && (
                      <kbd
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isLight
                            ? 'bg-slate-100 border-slate-300 text-slate-600'
                            : 'bg-slate-800 border-slate-700 text-amber-300'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="h-3.5 w-3.5 text-sky-400 animate-pulse" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-2 border-t flex items-center justify-between text-[10px] font-mono ${isLight ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-800 bg-slate-900 text-slate-500'}`}>
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-400">↑</kbd> <kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-400">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-400">↵</kbd> to select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3 text-sky-400" />
            <span>CleverOps Command Deck</span>
          </div>
        </div>
      </div>
    </div>
  );
}
