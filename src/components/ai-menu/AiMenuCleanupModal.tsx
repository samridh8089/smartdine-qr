'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Sparkles, Check, ArrowRight, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/db';

interface CleanupSuggestion {
  id: string;
  menu_item_id: string;
  originalName: string;
  suggestedName: string;
  originalDescription: string;
  suggestedDescription: string;
  originalPrice: number;
  suggestedPrice: number;
  issuesFound: string[];
  approved: boolean;
}

interface AiMenuCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  onSuccess: () => void;
}

export default function AiMenuCleanupModal({
  isOpen,
  onClose,
  restaurantId,
  onSuccess
}: AiMenuCleanupModalProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<CleanupSuggestion[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleRunCleanup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-menu/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId })
      });
      const data = await res.json();
      if (data.suggestions) {
        setInsights(data.insights || []);
        setSuggestions(data.suggestions.map((s: any) => ({ ...s, approved: true })));
        setAnalyzed(true);
      }
    } catch (e: any) {
      alert(`Cleanup analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApprove = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, approved: !s.approved } : s));
  };

  const handleApplySelected = async () => {
    const approvedList = suggestions.filter(s => s.approved);
    if (approvedList.length === 0) return;
    setApplying(true);
    try {
      for (const item of approvedList) {
        await db.updateMenuItem(item.menu_item_id, {
          name: item.suggestedName,
          description: item.suggestedDescription,
          price: item.suggestedPrice
        });
      }
      alert(`Successfully updated ${approvedList.length} menu items with AI improvements!`);
      onSuccess();
      onClose();
    } catch (e: any) {
      alert(`Failed to update menu items: ${e.message}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Smart Menu Audit & Optimization">
      <div className="space-y-6 p-1">
        {!analyzed ? (
          <div className="text-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Audit & Improve Live Menu</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Smart Menu AI will analyze your live menu for typos, duplicate names, missing descriptions, and irregular pricing formats.
              </p>
            </div>
            <Button
              onClick={handleRunCleanup}
              isLoading={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-xl text-sm gap-2"
            >
              <Sparkles className="h-4 w-4" /> Run Smart Menu Audit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.length > 0 && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-1 text-emerald-900 dark:text-emerald-300">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Smart Menu Insights
                </h4>
                <ul className="text-xs space-y-1 font-semibold list-disc pl-5">
                  {insights.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* BEFORE -> AFTER Diff Cards */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {suggestions.length === 0 ? (
                <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center gap-2">
                  <Check className="h-5 w-5" /> Perfect! No spelling errors or missing descriptions found in your menu.
                </p>
              ) : (
                suggestions.map(s => (
                  <div key={s.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {s.issuesFound.map((issue, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40">
                            {issue}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleApprove(s.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                          s.approved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" /> {s.approved ? 'Approved' : 'Approve'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* BEFORE */}
                      <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 space-y-1">
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">BEFORE (CURRENT)</span>
                        <p className="font-extrabold text-slate-900 dark:text-white">{s.originalName} — ₹{s.originalPrice}</p>
                        <p className="text-slate-500 leading-relaxed">{s.originalDescription || '(No description)'}</p>
                      </div>

                      {/* AI SUGGESTION */}
                      <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> AI SUGGESTION
                        </span>
                        <p className="font-extrabold text-slate-900 dark:text-white">{s.suggestedName} — ₹{s.suggestedPrice}</p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{s.suggestedDescription}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleApplySelected}
                isLoading={applying}
                disabled={applying || suggestions.filter(s => s.approved).length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6"
              >
                Apply Selected ({suggestions.filter(s => s.approved).length}) Improvements
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
