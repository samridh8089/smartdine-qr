'use client';

/**
 * Phase-19: Founder Control Center — Global Search Panel
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Search, X, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SystemEvent } from './types';

interface SearchResult {
  correlationId: string;
  orderId?: string;
  lastEventType: string;
  lastEventAt: string;
  eventCount: number;
}

interface SearchPanelProps {
  restaurantId: string;
  onSelectCorrelation: (corrId: string) => void;
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

export default function SearchPanel({ restaurantId, onSelectCorrelation }: SearchPanelProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim() || !restaurantId) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const trimmed = q.trim();

      // Search by correlation_id prefix, order_id prefix, or event_type
      const [byCorr, byOrder, byType] = await Promise.all([
        supabase
          .from('system_events')
          .select('correlation_id, order_id, event_type, created_at')
          .eq('restaurant_id', restaurantId)
          .ilike('correlation_id', `%${trimmed}%`)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('system_events')
          .select('correlation_id, order_id, event_type, created_at')
          .eq('restaurant_id', restaurantId)
          .ilike('order_id', `%${trimmed}%`)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('system_events')
          .select('correlation_id, order_id, event_type, created_at')
          .eq('restaurant_id', restaurantId)
          .ilike('event_type', `%${trimmed}%`)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const allRows: SystemEvent[] = [
        ...(byCorr.data || []),
        ...(byOrder.data || []),
        ...(byType.data || []),
      ] as SystemEvent[];

      // Group by correlation_id
      const grouped = new Map<string, { rows: SystemEvent[]; orderId?: string }>();
      for (const row of allRows) {
        if (!grouped.has(row.correlation_id)) {
          grouped.set(row.correlation_id, { rows: [], orderId: row.order_id });
        }
        grouped.get(row.correlation_id)!.rows.push(row);
      }

      const searchResults: SearchResult[] = Array.from(grouped.entries()).map(([corrId, { rows, orderId }]) => {
        const sorted = rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return {
          correlationId: corrId,
          orderId,
          lastEventType: sorted[0].event_type,
          lastEventAt: sorted[0].created_at,
          eventCount: rows.length,
        };
      });

      setResults(searchResults.slice(0, 20));
    } catch (e) {
      console.warn('[SearchPanel] error:', e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(val), 300);
  }, [handleSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700">
      <div className="px-4 py-3 border-b border-slate-700 shrink-0">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-blue-400" />
          Global Search
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Correlation ID, Order ID, event type…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading && (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs">
            No results found for &quot;{query}&quot;
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="text-center py-8 text-slate-600 text-xs">
            Search by correlation ID, order ID, or event type
          </div>
        )}

        {results.map(result => (
          <button
            key={result.correlationId}
            onClick={() => onSelectCorrelation(result.correlationId)}
            className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-slate-200 truncate">{result.correlationId}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-slate-500">{result.eventCount} events</span>
                <span className="text-slate-600">·</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                  {result.lastEventType}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {relativeTime(result.lastEventAt)}
                </span>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
