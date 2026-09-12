// SmartDine AI Floor Planner — Generator Modal (Phase 2 Vision+)
// Refactored to Linear/Notion SaaS interface:
// - Background #0B0F14, border rgba(255,255,255,0.08), 16px radius, Inter font
// - Stepper: Room → Photos → Furniture → Layouts
// - Step 1: Merged Room dimensions + Photo upload + Camera guide with 5 cards (Front, Left, Right, Back, Kitchen (optional))
// - Layout cards: Large 16:9 preview, white title, one-row metrics, single green "Use Layout" button, no purple outline
// - Exactly ONE accent color: Emerald (#16A34A), ZERO emojis anywhere.

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Check, Camera, RefreshCw,
  Compass, Eye, Split, Upload, AlertCircle
} from 'lucide-react';
import { 
  RoomDimensions, 
  MeasurementUnit, 
  FurnitureRequirement, 
  RoomPhoto, 
  LayoutSuggestion,
  GeminiRoomAnalysis,
  getFloorPlannerProvider 
} from '@/lib/ai/floorPlanner';
import { RoomAnalyzer } from './RoomAnalyzer';
import { LayoutPreviewThumbnail } from './LayoutPreviewThumbnail';
import { GuidedPhotoCapture, CAPTURE_TARGETS } from './GuidedPhotoCapture';
import { BusinessImpactCard } from './BusinessImpactCard';
import { CameraOverlayComparison } from './CameraOverlayComparison';
import { FloorPlanItem } from '@/components/floorplan/types';

// Ensure provider registration
import './LayoutGenerator';

interface AILayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLayout: (items: FloorPlanItem[], dimensions: { width: number; height: number }) => void;
  restaurantName?: string;
  currentSeats?: number;
}

const FURNITURE_CATALOG: FurnitureRequirement[] = [
  // Tables
  { id: 'cat-rnd-4', name: 'Round Table (4 Seats)', category: 'tables', kind: 'table', shape: 'circle', defaultSeats: 4, quantity: 4, width: 75, height: 75 },
  { id: 'cat-sq-4', name: 'Square Table (4 Seats)', category: 'tables', kind: 'table', shape: 'square', defaultSeats: 4, quantity: 6, width: 75, height: 75 },
  { id: 'cat-rec-6', name: 'Rectangle Table (6 Seats)', category: 'tables', kind: 'table', shape: 'rectangle', defaultSeats: 6, quantity: 2, width: 130, height: 80 },
  { id: 'cat-hi-2', name: 'High Top Table (2 Seats)', category: 'tables', kind: 'table', shape: 'two_seater', defaultSeats: 2, quantity: 2, width: 65, height: 65 },

  // Seating
  { id: 'cat-booth', name: 'Dining Booth (4 Seats)', category: 'tables', kind: 'table', shape: 'booth', defaultSeats: 4, quantity: 4, width: 90, height: 80 },
  { id: 'cat-l-booth', name: 'L-Booth (5 Seats)', category: 'tables', kind: 'table', shape: 'l_booth', defaultSeats: 5, quantity: 2, width: 110, height: 110 },
  { id: 'cat-sofa-3', name: 'Sofa Lounge (3 Seats)', category: 'sofas', kind: 'furniture', furnitureType: 'sofa', defaultSeats: 3, quantity: 2, width: 130, height: 55 },
  { id: 'cat-bar-stool', name: 'Bar Stool (1 Seat)', category: 'chairs', kind: 'furniture', furnitureType: 'bar_seats', defaultSeats: 1, quantity: 4, width: 40, height: 40 },

  // Kitchen
  { id: 'cat-kitchen-pass', name: 'Kitchen Pass', category: 'kitchen', kind: 'furniture', furnitureType: 'kitchen_pass', defaultSeats: 0, quantity: 1, width: 200, height: 60 },
  { id: 'cat-pizza-oven', name: 'Pizza Oven', category: 'kitchen', kind: 'furniture', furnitureType: 'pizza_oven', defaultSeats: 0, quantity: 1, width: 85, height: 75 },
  { id: 'cat-fryer', name: 'Fryer Station', category: 'kitchen', kind: 'furniture', furnitureType: 'fryer', defaultSeats: 0, quantity: 1, width: 55, height: 55 },
  { id: 'cat-prep-counter', name: 'Prep Counter', category: 'kitchen', kind: 'furniture', furnitureType: 'prep_counter', defaultSeats: 0, quantity: 1, width: 120, height: 55 },

  // Structure
  { id: 'cat-cash-counter', name: 'Cash Counter / POS', category: 'structure', kind: 'furniture', furnitureType: 'cash_counter', defaultSeats: 0, quantity: 1, width: 130, height: 65 },
  { id: 'cat-double-door', name: 'Entrance Double Door', category: 'structure', kind: 'furniture', furnitureType: 'double_door', defaultSeats: 0, quantity: 1, width: 140, height: 50 },
  { id: 'cat-washroom', name: 'Restroom Facility', category: 'structure', kind: 'furniture', furnitureType: 'accessible_washroom', defaultSeats: 0, quantity: 1, width: 110, height: 80 },
  { id: 'cat-waiting-area', name: 'Guest Waiting Lounge', category: 'structure', kind: 'furniture', furnitureType: 'waiting_area', defaultSeats: 3, quantity: 1, width: 120, height: 55 },

  // Decor
  { id: 'cat-ficus', name: 'Large Interior Plant', category: 'decor', kind: 'furniture', furnitureType: 'plant_large', defaultSeats: 0, quantity: 2, width: 45, height: 45 },
  { id: 'cat-planter', name: 'Planter Box', category: 'decor', kind: 'furniture', furnitureType: 'plant_small', defaultSeats: 0, quantity: 2, width: 60, height: 25 },
  { id: 'cat-partition', name: 'Architectural Divider', category: 'decor', kind: 'furniture', furnitureType: 'decorative_partition', defaultSeats: 0, quantity: 2, width: 20, height: 80 }
];

export const AILayoutModal: React.FC<AILayoutModalProps> = ({
  isOpen,
  onClose,
  onApplyLayout,
  restaurantName = 'Your Restaurant',
  currentSeats = 26
}) => {
  // 1. useState declarations (Strict React Hooks Safety Guardrail)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [width, setWidth] = useState<number>(45);
  const [length, setLength] = useState<number>(28);
  const [unit, setUnit] = useState<MeasurementUnit>('ft');
  const [furnitureReqs, setFurnitureReqs] = useState<FurnitureRequirement[]>(FURNITURE_CATALOG);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState<boolean>(false);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<LayoutSuggestion[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [inspectLayout, setInspectLayout] = useState<LayoutSuggestion | null>(null);
  const [ownerPreviewMode, setOwnerPreviewMode] = useState<'after' | 'before'>('after');
  const [comparingLayout, setComparingLayout] = useState<LayoutSuggestion | null>(null);
  const [roomAnalysis, setRoomAnalysis] = useState<GeminiRoomAnalysis | null>(null);
  const [sidebarOffset, setSidebarOffset] = useState<number>(0);
  const [layoutStyle, setLayoutStyle] = useState<'cozy_cafe' | 'bistro' | 'spacious_hall' | 'default'>('default');

  // 2. useRef declarations
  const abortControllerRef = useRef<AbortController | null>(null);

  // 3. useMemo declarations
  const areaCalculation = useMemo(() => {
    return RoomAnalyzer.formatArea(width, length, unit);
  }, [width, length, unit]);

  const totalSelectedSeats = useMemo(() => {
    return furnitureReqs.reduce((sum, req) => {
      if (req.defaultSeats && req.quantity > 0) {
        return sum + (req.quantity * req.defaultSeats);
      }
      return sum;
    }, 0);
  }, [furnitureReqs]);

  const filteredFurniture = useMemo(() => {
    if (selectedCategory === 'all') return furnitureReqs;
    if (selectedCategory === 'tables') {
      return furnitureReqs.filter(item => item.category === 'tables' && item.shape !== 'booth' && item.shape !== 'l_booth');
    }
    if (selectedCategory === 'seating') {
      return furnitureReqs.filter(item => item.category === 'chairs' || item.category === 'sofas' || item.shape === 'booth' || item.shape === 'l_booth');
    }
    if (selectedCategory === 'kitchen') {
      return furnitureReqs.filter(item => item.category === 'kitchen');
    }
    if (selectedCategory === 'structure') {
      return furnitureReqs.filter(item => item.category === 'structure' || item.category === 'counters');
    }
    if (selectedCategory === 'decor') {
      return furnitureReqs.filter(item => item.category === 'decor' || item.category === 'plants');
    }
    return furnitureReqs.filter(item => item.category === selectedCategory);
  }, [furnitureReqs, selectedCategory]);

  const activeSuggestion = useMemo(() => {
    return generatedSuggestions.find(s => s.id === selectedLayoutId) || generatedSuggestions[0] || null;
  }, [generatedSuggestions, selectedLayoutId]);

  // 4. useCallback declarations
  const handleQuantityChange = useCallback((id: string, delta: number) => {
    setFurnitureReqs(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setStep(4);

    let detectedAnalysis = roomAnalysis;

    // Call server-side Gemini 2.5 Flash Vision if photos exist
    if (photos.length > 0 && !detectedAnalysis) {
      setIsAnalyzingVision(true);
      try {
        const res = await fetch('/api/ai/floor-planner/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photos,
            dimensions: {
              width,
              length,
              unit,
              areaSqFt: areaCalculation.sqFt,
              areaSqM: areaCalculation.sqM
            },
            restaurantName
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.analysis) {
            detectedAnalysis = json.analysis;
            setRoomAnalysis(json.analysis);
          }
        }
      } catch (err) {
        console.warn('Vision analysis request failed, falling back to local solver:', err);
      } finally {
        setIsAnalyzingVision(false);
      }
    }

    try {
      const provider = getFloorPlannerProvider();
      const input = {
        dimensions: {
          width,
          length,
          unit,
          areaSqFt: areaCalculation.sqFt,
          areaSqM: areaCalculation.sqM
        },
        requirements: furnitureReqs.filter(r => r.quantity > 0),
        photos,
        roomAnalysis: detectedAnalysis || undefined,
        restaurantName,
        currentSeats,
        layoutStyle: layoutStyle !== 'default' ? layoutStyle : undefined
      };

      const suggestions = await provider.generateLayouts(input);
      setGeneratedSuggestions(suggestions);
      if (suggestions.length > 0) {
        setSelectedLayoutId(suggestions[0].id);
      }
    } catch (err: any) {
      console.error('Error generating layouts:', err);
      alert('Failed to generate layouts: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  }, [width, length, unit, areaCalculation, furnitureReqs, photos, roomAnalysis, restaurantName, currentSeats, layoutStyle]);

  const handleApplySelected = useCallback((layout: LayoutSuggestion) => {
    onApplyLayout(layout.items, { width: layout.canvasWidth, height: layout.canvasHeight });
    onClose();
  }, [onApplyLayout, onClose]);

  // 5. useEffect declarations
  useEffect(() => {
    if (isOpen && generatedSuggestions.length === 0) {
      setStep(1);
    }
  }, [isOpen, generatedSuggestions.length]);

  useEffect(() => {
    const updateSidebarOffset = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth >= 1024) {
        // Desktop breakpoint in Tailwind (lg)
        const sidebarEl = document.querySelector('aside');
        if (sidebarEl) {
          const rect = sidebarEl.getBoundingClientRect();
          if (rect.width > 0 && rect.left >= 0 && rect.right > 0) {
            setSidebarOffset(rect.width);
            return;
          }
        }
        setSidebarOffset(256);
      } else {
        setSidebarOffset(0);
      }
    };

    updateSidebarOffset();
    window.addEventListener('resize', updateSidebarOffset);
    return () => window.removeEventListener('resize', updateSidebarOffset);
  }, []);

  // ALL HOOKS STRICTLY DECLARED BEFORE ANY RETURN
  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-16 bottom-0 right-0 left-0 lg:left-64 z-[50] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-5 font-sans select-none animate-in fade-in duration-200"
      style={{
        left: sidebarOffset > 0 ? `${sidebarOffset}px` : undefined
      }}
    >
      <div 
        className="relative w-full max-w-[1400px] bg-[#0B0F14] border border-white/[0.08] text-zinc-100 rounded-[16px] shadow-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: 'calc(100% - 8px)',
          height: 'auto'
        }}
      >
        
        {/* Header with Linear Stepper: Room → Photos → Furniture → Layouts */}
        <div className="px-6 sm:px-8 py-4 border-b border-white/[0.08] bg-[#0B0F14] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white tracking-tight">
              SmartDine Floor Planner
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              AI-powered layout optimization and spatial floor blueprint generation
            </p>
          </div>

          {/* Stepper Navigation: Room → Photos → Furniture → Layouts */}
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs">
            {[
              { num: 1, label: 'Room' },
              { num: 2, label: 'Photos' },
              { num: 3, label: 'Furniture' },
              { num: 4, label: 'Layouts' }
            ].map((s, idx) => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <div key={s.num} className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 4 && s.num < 4) setStep(s.num as any);
                      else if (isPast) setStep(s.num as any);
                    }}
                    disabled={!isPast && step !== s.num && step !== 4}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-[8px] text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : isPast
                        ? 'text-zinc-300 hover:bg-white/[0.06] cursor-pointer'
                        : 'text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isPast ? 'bg-[#16A34A]/20 text-[#16A34A] font-semibold' : isActive ? 'bg-white text-[#16A34A] font-semibold' : 'bg-white/[0.04] text-zinc-500'
                    }`}>
                      {isPast ? <Check className="w-2.5 h-2.5" /> : s.num}
                    </span>
                    <span>{s.label}</span>
                  </button>
                  {idx < 3 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-[8px] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          
          {/* STEP 1: MERGED ROOM DIMENSIONS + PHOTO UPLOAD + CAMERA GUIDE */}
          {step === 1 && (
            <div className="space-y-6 w-full py-1">
              {/* Room Dimensions Card */}
              <div className="bg-white/[0.02] p-5 sm:p-6 rounded-[16px] border border-white/[0.08] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Room Dimensions</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Specify room footprint to calibrate table spacing and aisle widths.</p>
                  </div>
                  <div className="text-xs text-zinc-400 bg-white/[0.04] px-3 py-1 rounded-[8px] border border-white/[0.08]">
                    Estimated: <span className="text-white font-medium">{Math.round((areaCalculation.sqFt / 14))} seats</span>
                  </div>
                </div>

                {/* Desktop: [Width] [Length] [Unit] */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Width Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">Room Width</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="15"
                        max="200"
                        value={width}
                        onChange={(e) => setWidth(Math.max(10, parseInt(e.target.value) || 10))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-3.5 py-2.5 text-white font-semibold text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                      />
                      <span className="absolute right-3 top-3 text-xs font-semibold text-zinc-500 uppercase">
                        {unit}
                      </span>
                    </div>
                  </div>

                  {/* Length Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">Room Length</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="15"
                        max="200"
                        value={length}
                        onChange={(e) => setLength(Math.max(10, parseInt(e.target.value) || 10))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-3.5 py-2.5 text-white font-semibold text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                      />
                      <span className="absolute right-3 top-3 text-xs font-semibold text-zinc-500 uppercase">
                        {unit}
                      </span>
                    </div>
                  </div>

                  {/* Unit Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">Unit of Measure</label>
                    <div className="flex bg-white/[0.03] p-1 rounded-[10px] border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setUnit('ft')}
                        className={`flex-1 py-2 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
                          unit === 'ft' ? 'bg-[#16A34A] text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Feet (ft)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnit('m')}
                        className={`flex-1 py-2 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
                          unit === 'm' ? 'bg-[#16A34A] text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Meters (m)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Below: Footprint card on left, Presets on right */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Footprint card */}
                  <div className="bg-white/[0.02] border border-white/[0.08] rounded-[12px] p-3.5 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-[10px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Compass className="w-5 h-5 text-[#16A34A]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">Total Floor Footprint</div>
                      <div className="text-sm font-semibold text-white truncate mt-0.5">
                        {width} x {length} {unit} &bull; <span className="text-[#16A34A]">{areaCalculation.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Presets card */}
                  <div className="bg-white/[0.02] border border-white/[0.08] rounded-[12px] p-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
                      Quick Presets:
                    </div>
                    <div className="flex items-center gap-2">
                      {[
                        { id: 'cozy_cafe' as const, label: 'Cozy Cafe' },
                        { id: 'bistro' as const, label: 'Mid Bistro' },
                        { id: 'spacious_hall' as const, label: 'Spacious Hall' }
                      ].map((preset) => {
                        const isSelected = layoutStyle === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              // Presets only influence layout style, NEVER change room dimensions (dimensions remain untouched)
                              setLayoutStyle(prev => prev === preset.id ? 'default' : preset.id);
                            }}
                            className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-xs'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Guidance Banner: Option A (Dimensions only) vs Option B (Dimensions + Photos) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white/[0.02] border border-white/[0.08] rounded-[14px]">
                <div className="p-3 rounded-[10px] bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-[6px] bg-[#16A34A]/15 border border-[#16A34A]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-bold text-[#16A34A]">A</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Option A — Room Size Only</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Skip photos completely. Generates instant restaurant layouts based on your {width} x {length} {unit} footprint.
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-[10px] bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-[6px] bg-white/[0.06] border border-white/[0.12] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-bold text-zinc-300">B</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Option B — Room Size + Photos</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Optional. Upload room angles for Gemini Vision to detect existing doors, windows, pillars, and AC units.
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo Upload & Camera Guide (The 5 Upload Cards) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Room Photos &amp; Camera Guide</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Upload photos from 5 angles for architectural AI recognition or proceed with dimensions.</p>
                  </div>
                  <span className="text-xs text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-[6px] border border-white/[0.08]">
                    {photos.length} of 5 Captured
                  </span>
                </div>

                <GuidedPhotoCapture
                  photos={photos}
                  onPhotosChange={setPhotos}
                  compact={true}
                />
              </div>
            </div>
          )}

          {/* STEP 2: STANDALONE CAMERA PERSPECTIVES FOCUS */}
          {step === 2 && (
            <div className="space-y-4 w-full py-1">
              <GuidedPhotoCapture
                photos={photos}
                onPhotosChange={setPhotos}
                compact={false}
              />
            </div>
          )}

          {/* STEP 3: FURNITURE REQUIREMENTS */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Select Furniture Requirements</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Specify tables, seating types, and stations to place on the floor plan.</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-[10px] text-xs font-medium text-zinc-300">
                    Target Seating: <span className="text-[#16A34A] font-semibold">{totalSelectedSeats} Seats</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFurnitureReqs(FURNITURE_CATALOG)}
                    className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>

              {/* 5 Categories Filter Strip */}
              <div className="flex flex-wrap gap-1 bg-white/[0.02] p-1.5 rounded-[12px] border border-white/[0.08]">
                {[
                  { id: 'all', label: 'All Items' },
                  { id: 'tables', label: 'Tables' },
                  { id: 'seating', label: 'Seating' },
                  { id: 'kitchen', label: 'Kitchen' },
                  { id: 'structure', label: 'Structure' },
                  { id: 'decor', label: 'Decor' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Furniture Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[52vh] overflow-y-auto pr-1">
                {filteredFurniture.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-[16px] border transition-all flex items-center justify-between gap-3 ${
                        item.quantity > 0
                          ? 'bg-white/[0.03] border-[#16A34A]/40'
                          : 'bg-white/[0.02] border-white/[0.08] text-zinc-400'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-medium text-xs text-white truncate">{item.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                          <span className="capitalize">{item.category}</span>
                          {item.defaultSeats && item.defaultSeats > 0 ? (
                            <>
                              <span>&bull;</span>
                              <span className="text-[#16A34A] font-medium">{item.defaultSeats} Seats</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {/* Stepper [-] qty [+] */}
                      <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/[0.08] rounded-[8px] p-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={item.quantity <= 0}
                          className="w-6 h-6 flex items-center justify-center rounded-[6px] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          -
                        </button>
                        <span className="w-7 text-center font-medium text-xs text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-[6px] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white font-medium cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: GENERATED AI LAYOUTS */}
          {step === 4 && (
            <div className="space-y-6">
              {isGenerating ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-2 border-[#16A34A] border-t-transparent animate-spin" />
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-semibold text-white">
                      {isAnalyzingVision ? 'Gemini 2.5 Flash Vision Analyzing Room Photos...' : 'Generating Layout Blueprints...'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Optimizing table orientations, aisle clearances, and service pathways.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        Layout Suggestions
                        {roomAnalysis && !roomAnalysis.isFallback && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-[6px] bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30">
                            Vision Calibrated
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {roomAnalysis?.spatialNotes || 'Select any blueprint to apply to your floor plan.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeSuggestion && (
                        <button
                          type="button"
                          onClick={() => setInspectLayout(activeSuggestion)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-[8px] border border-white/[0.08] text-xs font-medium cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span>Owner Preview (Before vs After)</span>
                        </button>
                      )}
                      {photos.length > 0 && activeSuggestion && (
                        <button
                          type="button"
                          onClick={() => setComparingLayout(activeSuggestion)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-[8px] border border-white/[0.08] text-xs font-medium cursor-pointer transition-colors"
                        >
                          <Split className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span>Split View</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleGenerate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-[8px] border border-white/[0.08] text-xs font-medium cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regenerate Layouts</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Layout Business Impact Card */}
                  {activeSuggestion && (
                    <BusinessImpactCard
                      impact={activeSuggestion.businessImpact}
                      layoutName={activeSuggestion.name}
                    />
                  )}

                  {/* 4 Layout Suggestion Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedSuggestions.map((suggestion) => {
                      const isSelected = selectedLayoutId === suggestion.id;
                      const { metrics, businessImpact } = suggestion;

                      return (
                        <div
                          key={suggestion.id}
                          onClick={() => setSelectedLayoutId(suggestion.id)}
                          className={`relative rounded-[16px] border p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? 'bg-white/[0.04] border-[#16A34A] ring-1 ring-[#16A34A] shadow-lg'
                              : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.16]'
                          }`}
                        >
                          {/* Top Header: White Title */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-semibold text-white tracking-tight">
                                  {suggestion.name}
                                </h4>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-[6px] bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                                  {suggestion.badge}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{suggestion.description}</p>
                            </div>

                            <span className="text-xs font-medium px-2 py-0.5 rounded-[6px] bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30">
                              {businessImpact.revenueScoreBadge}
                            </span>
                          </div>

                          {/* Large 16:9 Preview Thumbnail */}
                          <div className="relative group aspect-video rounded-[12px] overflow-hidden border border-white/[0.08]">
                            <LayoutPreviewThumbnail
                              items={suggestion.items}
                              canvasWidth={suggestion.canvasWidth}
                              canvasHeight={suggestion.canvasHeight}
                              className="w-full h-full"
                            />
                            <div className="absolute top-2 right-2 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {photos.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setComparingLayout(suggestion);
                                  }}
                                  className="px-2 py-1 bg-[#0B0F14]/90 hover:bg-[#0B0F14] text-zinc-200 text-[11px] font-medium rounded-[6px] flex items-center gap-1 cursor-pointer border border-white/[0.08]"
                                  title="Compare with captured photo"
                                >
                                  <Split className="w-3 h-3 text-[#16A34A]" />
                                  <span>Compare</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectLayout(suggestion);
                                }}
                                className="px-2 py-1 bg-[#0B0F14]/90 hover:bg-[#0B0F14] text-zinc-200 text-[11px] font-medium rounded-[6px] flex items-center gap-1 cursor-pointer border border-white/[0.08]"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Enlarge</span>
                              </button>
                            </div>
                          </div>

                          {/* One-Row Metrics */}
                          <div className="flex items-center justify-between py-2 px-3 rounded-[10px] bg-white/[0.02] border border-white/[0.08] text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500">Seats</span>
                              <span className="font-semibold text-white">{metrics.seats}</span>
                            </div>
                            <div className="h-3 w-px bg-white/[0.08]" />
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500">Aisles</span>
                              <span className="font-medium text-[#16A34A]">{metrics.walkingSpace}</span>
                            </div>
                            <div className="h-3 w-px bg-white/[0.08]" />
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500">Kitchen</span>
                              <span className="font-medium text-zinc-300">{metrics.kitchenDistance}</span>
                            </div>
                            <div className="h-3 w-px bg-white/[0.08]" />
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500">Efficiency</span>
                              <span className="font-medium text-[#16A34A]">{businessImpact.waiterEfficiencyBadge}</span>
                            </div>
                          </div>

                          {/* Single Green "Use Layout" Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySelected(suggestion);
                            }}
                            className="w-full py-2.5 rounded-[12px] bg-[#16A34A] hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            <span>Use Layout</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 sm:px-8 py-4 border-t border-white/[0.08] bg-[#0B0F14] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-[10px] border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {step === 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-[10px] text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
                >
                  <span>Skip Photos & Set Furniture</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-[#16A34A] hover:bg-emerald-500 text-white rounded-[10px] text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-[10px] text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
                >
                  <span>Skip Photos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-[#16A34A] hover:bg-emerald-500 text-white rounded-[10px] text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continue to Furniture</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-[#16A34A] hover:bg-emerald-500 text-white rounded-[10px] text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <span>{photos.length > 0 ? 'Generate Vision Layouts' : 'Generate Layouts'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Owner Preview: Before vs After Overlay */}
        {inspectLayout && (
          <div className="absolute inset-0 z-50 bg-[#0B0F14]/98 p-6 flex flex-col justify-between backdrop-blur-md">
            {/* Top Bar: Title & Before / After Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    {inspectLayout.name} — Owner Spatial Preview
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-[6px] bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30 font-medium">
                    {inspectLayout.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{inspectLayout.description}</p>
              </div>

              {/* Before vs After Switcher */}
              <div className="flex items-center bg-white/[0.04] p-1 rounded-[10px] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setOwnerPreviewMode('before')}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                    ownerPreviewMode === 'before'
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Before: Empty Room
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerPreviewMode('after')}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                    ownerPreviewMode === 'after'
                      ? 'bg-[#16A34A] text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  After: Full Restaurant
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInspectLayout(null)}
                className="p-1.5 text-zinc-400 hover:text-white bg-white/[0.04] rounded-[8px] cursor-pointer"
                title="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Central 16:9 Canvas Rendering Before or After */}
            <div className="flex-1 my-4 flex flex-col items-center justify-center overflow-hidden relative">
              <div className="relative w-full max-w-4xl aspect-video rounded-[14px] overflow-hidden border border-white/[0.08] shadow-2xl bg-black">
                <LayoutPreviewThumbnail
                  items={
                    ownerPreviewMode === 'before'
                      ? inspectLayout.items.filter(
                          (it) =>
                            it.furnitureType === 'entrance_door' ||
                            it.furnitureType === 'double_door' ||
                            it.furnitureType === 'door' ||
                            it.furnitureType === 'window' ||
                            it.furnitureType === 'pillar'
                        )
                      : inspectLayout.items
                  }
                  canvasWidth={inspectLayout.canvasWidth}
                  canvasHeight={inspectLayout.canvasHeight}
                  className="w-full h-full"
                />

                {/* Status Overlay Badge */}
                <div className="absolute top-3 left-3 bg-[#0B0F14]/90 backdrop-blur-md px-3 py-1.5 rounded-[8px] border border-white/[0.08] text-xs font-semibold text-white">
                  {ownerPreviewMode === 'before' ? (
                    <span className="text-zinc-400">Current Bare Space (0 Seating • Unfurnished Shell)</span>
                  ) : (
                    <span className="text-[#16A34A]">Opening-Day Ready ({inspectLayout.metrics.seats} Seats • Fully Outfitted)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Metrics Bar with the 4 Owner Deliverables: Seating Count, Waiter Flow, Revenue Estimate, Aisle Width */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 bg-white/[0.03] px-3 py-1.5 rounded-[8px] border border-white/[0.08]">
                  <span className="text-zinc-400">Seating Count:</span>
                  <span className="font-semibold text-white">
                    {ownerPreviewMode === 'before' ? '0 Seats' : `${inspectLayout.metrics.seats} Seats`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/[0.03] px-3 py-1.5 rounded-[8px] border border-white/[0.08]">
                  <span className="text-zinc-400">Aisle Width:</span>
                  <span className="font-semibold text-[#16A34A]">{inspectLayout.metrics.walkingSpace}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/[0.03] px-3 py-1.5 rounded-[8px] border border-white/[0.08]">
                  <span className="text-zinc-400">Waiter Flow:</span>
                  <span className="font-semibold text-[#16A34A]">{inspectLayout.businessImpact.waiterEfficiencyBadge}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/[0.03] px-3 py-1.5 rounded-[8px] border border-white/[0.08]">
                  <span className="text-zinc-400">Revenue Estimate:</span>
                  <span className="font-semibold text-white">{inspectLayout.businessImpact.revenueScoreBadge}</span>
                </div>
              </div>

              {/* Action Buttons: Close & Apply Layout */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setInspectLayout(null)}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-[10px] text-xs font-medium cursor-pointer border border-white/[0.08] transition-colors"
                >
                  Back to Suggestions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApplySelected(inspectLayout);
                    setInspectLayout(null);
                  }}
                  className="px-6 py-2.5 bg-[#16A34A] hover:bg-emerald-500 text-white rounded-[10px] text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Layout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera Overlay Comparison Modal Overlay */}
        {comparingLayout && photos.length > 0 && (
          <div className="absolute inset-0 z-50 bg-black/95 p-6 flex flex-col justify-between overflow-y-auto">
            <CameraOverlayComparison
              photos={photos}
              layout={comparingLayout}
              onApply={() => {
                handleApplySelected(comparingLayout);
                setComparingLayout(null);
              }}
              onRegenerate={handleGenerate}
              onClose={() => setComparingLayout(null)}
            />
          </div>
        )}

      </div>
    </div>
  );
};
