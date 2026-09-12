// SmartDine AI Floor Planner — AI Editing Assistant
// Floating assistant with 5 contextual layout enhancement actions.

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Wand2, X, Sparkles, Check, ChevronRight, Users, 
  Crown, Move, DollarSign, Armchair, ArrowUpRight 
} from 'lucide-react';
import { FloorPlanItem } from '@/components/floorplan/types';
import { AIImprovementSuggestion, getFloorPlannerProvider } from '@/lib/ai/floorPlanner';
import './LayoutGenerator';

interface AIImprovementAssistantProps {
  items: FloorPlanItem[];
  canvasDimensions: { width: number; height: number };
  onApplyChanges: (newItems: FloorPlanItem[], actionTitle: string) => void;
}

export const AIImprovementAssistant: React.FC<AIImprovementAssistantProps> = ({
  items,
  canvasDimensions,
  onApplyChanges
}) => {
  // 1. useState declarations (Strict React Hook Order)
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<AIImprovementSuggestion[]>([]);
  const [appliedActionId, setAppliedActionId] = useState<string | null>(null);

  // 2. useMemo declarations
  const hasTables = useMemo(() => {
    return items.some(it => it.kind === 'table');
  }, [items]);

  // 3. useCallback declarations
  const handleApply = useCallback((suggestion: AIImprovementSuggestion) => {
    const updated = suggestion.apply(items, canvasDimensions);
    onApplyChanges(updated, suggestion.title);
    setAppliedActionId(suggestion.id);
    setTimeout(() => {
      setAppliedActionId(null);
    }, 2500);
  }, [items, canvasDimensions, onApplyChanges]);

  // 4. useEffect declarations
  useEffect(() => {
    try {
      const provider = getFloorPlannerProvider();
      if (provider.getImprovementSuggestions) {
        provider.getImprovementSuggestions(items).then(res => {
          setSuggestions(res);
        });
      }
    } catch (e) {
      console.error('Failed to load AI improvement suggestions:', e);
    }
  }, [items]);

  // Icon mapping for suggestions
  const getSuggestionIcon = (id: string) => {
    switch (id) {
      case 'add_one_more_two_seater':
      case 'increase_seats_6':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'create_vip_corner':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'move_table_wider_aisle':
      case 'improve_walking_flow':
        return <Move className="w-4 h-4 text-sky-400" />;
      case 'shift_waiting_area_entrance':
      case 'expand_waiting_area':
        return <Armchair className="w-4 h-4 text-teal-400" />;
      case 'move_counter_entrance':
        return <DollarSign className="w-4 h-4 text-violet-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-300" />;
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-full font-semibold text-xs shadow-xl transition-all cursor-pointer border ${
            isOpen
              ? 'bg-[#0B0F14] text-white border-white/[0.12] shadow-black/80'
              : 'bg-[#16A34A] hover:bg-[#15803D] text-white border-emerald-500/40 shadow-emerald-950/40 hover:scale-102 active:scale-98'
          }`}
          title="Open AI Layout Assistant"
        >
          <Wand2 className="w-3.5 h-3.5 text-white" />
          <span>Improve Layout</span>
          <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[10px] flex items-center justify-center font-bold">
            {suggestions.length || 4}
          </span>
        </button>
      </div>

      {/* Floating Assistant Popover Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] bg-[#0B0F14] border border-white/[0.08] text-stone-100 rounded-[16px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center">
                <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">
                  AI Layout Assistant
                </h4>
                <p className="text-[10px] text-stone-400">Contextual optimizations for your active layout</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-white/[0.05] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Suggestions List */}
          <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
            {suggestions.map((suggestion) => {
              const isApplied = appliedActionId === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] p-3 rounded-xl transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                        {getSuggestionIcon(suggestion.id)}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-white">{suggestion.title}</div>
                        <div className="text-[10px] text-stone-400">{suggestion.impactTag}</div>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-stone-300 border border-white/[0.08]">
                      {suggestion.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    {suggestion.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-stone-500">Instant Action</span>
                    <button
                      type="button"
                      onClick={() => handleApply(suggestion)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isApplied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <span>Apply</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2.5 bg-white/[0.01] border-t border-white/[0.08] text-[10px] text-stone-500 flex items-center justify-between">
            <span>Preserves table UUIDs and QR codes</span>
            <span className="text-stone-400">Ctrl+Z to Undo</span>
          </div>
        </div>
      )}
    </>
  );
};
