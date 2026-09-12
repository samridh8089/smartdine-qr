// SmartDine AI Floor Planner — Guided Photo Capture (Phone-Style Capture Experience)
// Linear/Notion aesthetic: #0B0F14 background, border-white/[0.08], 16px radius, emerald (#16A34A) accent, 0 emojis.

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { 
  Camera, Check, RefreshCw, Upload, Eye, 
  X, Smartphone
} from 'lucide-react';
import { RoomPhoto, CaptureTarget, WallTag } from '@/lib/ai/floorPlanner';
import { RoomAnalyzer } from './RoomAnalyzer';

export interface GuidedPhotoCaptureProps {
  photos: RoomPhoto[];
  onPhotosChange: (photos: RoomPhoto[]) => void;
  onContinue?: () => void;
  compact?: boolean;
}

interface TargetConfig {
  id: CaptureTarget;
  wallTag: WallTag;
  title: string;
  subtitle: string;
  isRequired: boolean;
  instruction: string;
}

export const CAPTURE_TARGETS: TargetConfig[] = [
  {
    id: 'entrance',
    wallTag: 'front',
    title: 'Front',
    subtitle: 'Main Entrance & Street',
    isRequired: false,
    instruction: 'Stand near entrance. Capture straight toward dining area.'
  },
  {
    id: 'left',
    wallTag: 'left',
    title: 'Left Wall',
    subtitle: 'Left Perimeter Wall',
    isRequired: false,
    instruction: 'Stand on right side. Capture full left wall from floor to ceiling.'
  },
  {
    id: 'right',
    wallTag: 'right',
    title: 'Right Wall',
    subtitle: 'Right Perimeter Wall',
    isRequired: false,
    instruction: 'Stand on left side. Capture full right wall with columns and windows.'
  },
  {
    id: 'back',
    wallTag: 'back',
    title: 'Back Wall',
    subtitle: 'Rear Wall & Restrooms',
    isRequired: false,
    instruction: 'Stand near center. Capture rear wall, emergency exits, and washrooms.'
  },
  {
    id: 'kitchen',
    wallTag: 'kitchen',
    title: 'Kitchen',
    subtitle: 'Service Pass / Counter',
    isRequired: false,
    instruction: 'Stand in dining hall. Capture kitchen service pass and pickup counter.'
  }
];

// Faded Architectural Vector Reference Illustrations
const FrontReferenceSvg = () => (
  <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-35">
    {/* Floor perspective lines */}
    <line x1="0" y1="120" x2="80" y2="70" stroke="#71717a" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="200" y1="120" x2="120" y2="70" stroke="#71717a" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="100" y1="120" x2="100" y2="70" stroke="#71717a" strokeWidth="1" strokeDasharray="2 2" />
    {/* Back wall horizon */}
    <rect x="70" y="35" width="60" height="35" stroke="#a1a1aa" strokeWidth="1.2" fill="#18181b" fillOpacity="0.4" />
    {/* Entrance double doors foreground */}
    <rect x="15" y="10" width="75" height="95" stroke="#d4d4d8" strokeWidth="1.4" rx="2" />
    <rect x="110" y="10" width="75" height="95" stroke="#d4d4d8" strokeWidth="1.4" rx="2" />
    {/* Glass door panels */}
    <rect x="22" y="18" width="61" height="80" stroke="#71717a" strokeWidth="0.9" strokeDasharray="2 2" />
    <rect x="117" y="18" width="61" height="80" stroke="#71717a" strokeWidth="0.9" strokeDasharray="2 2" />
    {/* Handles */}
    <line x1="82" y1="52" x2="82" y2="72" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
    <line x1="118" y1="52" x2="118" y2="72" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
    {/* Overhead pendant lights */}
    <line x1="60" y1="0" x2="60" y2="18" stroke="#71717a" strokeWidth="1" />
    <circle cx="60" cy="20" r="3" stroke="#16A34A" strokeWidth="1.2" fill="#16A34A" fillOpacity="0.3" />
    <line x1="140" y1="0" x2="140" y2="18" stroke="#71717a" strokeWidth="1" />
    <circle cx="140" cy="20" r="3" stroke="#16A34A" strokeWidth="1.2" fill="#16A34A" fillOpacity="0.3" />
  </svg>
);

const LeftWallReferenceSvg = () => (
  <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-35">
    {/* Left wall elevation perspective */}
    <polygon points="15,10 185,25 185,95 15,110" stroke="#a1a1aa" strokeWidth="1.2" fill="#18181b" fillOpacity="0.4" />
    {/* Wall architectural windows */}
    <polygon points="35,22 85,28 85,90 35,98" stroke="#d4d4d8" strokeWidth="1.2" />
    <line x1="60" y1="25" x2="60" y2="94" stroke="#71717a" strokeWidth="0.8" />
    <polygon points="105,30 155,36 155,83 105,88" stroke="#d4d4d8" strokeWidth="1.2" />
    <line x1="130" y1="33" x2="130" y2="85" stroke="#71717a" strokeWidth="0.8" />
    {/* Floor skirting */}
    <line x1="15" y1="110" x2="185" y2="95" stroke="#16A34A" strokeWidth="1.5" />
    {/* Ceiling line */}
    <line x1="15" y1="10" x2="185" y2="25" stroke="#71717a" strokeWidth="1" />
  </svg>
);

const RightWallReferenceSvg = () => (
  <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-35">
    {/* Right wall elevation perspective */}
    <polygon points="15,25 185,10 185,110 15,95" stroke="#a1a1aa" strokeWidth="1.2" fill="#18181b" fillOpacity="0.4" />
    {/* Architectural pillar / column */}
    <rect x="75" y="18" width="28" height="84" stroke="#d4d4d8" strokeWidth="1.4" fill="#27272a" fillOpacity="0.5" />
    <line x1="75" y1="20" x2="103" y2="20" stroke="#16A34A" strokeWidth="1.5" />
    {/* Wall sconce lights */}
    <circle cx="45" cy="45" r="3" stroke="#16A34A" strokeWidth="1.2" fill="#16A34A" fillOpacity="0.4" />
    <circle cx="145" cy="40" r="3" stroke="#16A34A" strokeWidth="1.2" fill="#16A34A" fillOpacity="0.4" />
    {/* Slatted wood panel pattern */}
    <line x1="115" y1="30" x2="115" y2="75" stroke="#71717a" strokeWidth="0.8" />
    <line x1="125" y1="30" x2="125" y2="75" stroke="#71717a" strokeWidth="0.8" />
    <line x1="135" y1="30" x2="135" y2="75" stroke="#71717a" strokeWidth="0.8" />
  </svg>
);

const BackWallReferenceSvg = () => (
  <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-35">
    {/* Rear perimeter wall */}
    <rect x="15" y="15" width="170" height="90" stroke="#a1a1aa" strokeWidth="1.2" fill="#18181b" fillOpacity="0.4" />
    {/* Emergency exit door */}
    <rect x="35" y="35" width="40" height="70" stroke="#d4d4d8" strokeWidth="1.2" />
    <line x1="68" y1="68" x2="71" y2="68" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
    <rect x="42" y="24" width="26" height="7" stroke="#16A34A" strokeWidth="0.8" rx="1" />
    {/* Washroom corridor archway */}
    <path d="M115,105 L115,55 C115,40 155,40 155,55 L155,105" stroke="#d4d4d8" strokeWidth="1.2" fill="#09090b" fillOpacity="0.6" />
    {/* Restroom sign */}
    <rect x="127" y="32" width="16" height="6" stroke="#71717a" strokeWidth="0.8" rx="1" />
  </svg>
);

const KitchenReferenceSvg = () => (
  <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-35">
    {/* Kitchen pass opening wall */}
    <rect x="15" y="15" width="170" height="90" stroke="#a1a1aa" strokeWidth="1.2" fill="#18181b" fillOpacity="0.4" />
    {/* Large order dispatch pass window */}
    <rect x="35" y="32" width="130" height="42" stroke="#d4d4d8" strokeWidth="1.4" fill="#09090b" fillOpacity="0.7" />
    {/* Stainless pickup pass counter shelf */}
    <rect x="28" y="74" width="144" height="12" stroke="#16A34A" strokeWidth="1.2" fill="#27272a" fillOpacity="0.6" rx="1" />
    {/* Overhead heat lamps / ticket rail */}
    <line x1="40" y1="36" x2="160" y2="36" stroke="#71717a" strokeWidth="1" />
    <circle cx="65" cy="40" r="2.5" fill="#f59e0b" fillOpacity="0.6" />
    <circle cx="100" cy="40" r="2.5" fill="#f59e0b" fillOpacity="0.6" />
    <circle cx="135" cy="40" r="2.5" fill="#f59e0b" fillOpacity="0.6" />
  </svg>
);

const REFERENCE_ILLUSTRATIONS: Record<CaptureTarget, React.FC> = {
  entrance: FrontReferenceSvg,
  left: LeftWallReferenceSvg,
  right: RightWallReferenceSvg,
  back: BackWallReferenceSvg,
  kitchen: KitchenReferenceSvg
};

export const GuidedPhotoCapture: React.FC<GuidedPhotoCaptureProps> = ({
  photos,
  onPhotosChange,
  onContinue,
  compact = false
}) => {
  // 1. useState declarations (Strict React Hooks Safety Guardrail)
  const [activeTarget, setActiveTarget] = useState<CaptureTarget>('entrance');
  const [previewPhoto, setPreviewPhoto] = useState<RoomPhoto | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 2. useRef declarations
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetUploadRef = useRef<CaptureTarget>('entrance');

  // 3. useMemo declarations
  const capturedCount = useMemo(() => {
    return CAPTURE_TARGETS.filter(t => photos.some(p => p.captureTarget === t.id || p.wallTag === t.wallTag)).length;
  }, [photos]);

  // 4. useCallback declarations
  const getPhotoForTarget = useCallback((targetId: CaptureTarget): RoomPhoto | undefined => {
    const config = CAPTURE_TARGETS.find(t => t.id === targetId);
    return photos.find(p => p.captureTarget === targetId || p.wallTag === config?.wallTag);
  }, [photos]);

  const handleTriggerUpload = useCallback((targetId: CaptureTarget) => {
    targetUploadRef.current = targetId;
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const targetId = targetUploadRef.current;
    const targetConfig = CAPTURE_TARGETS.find(t => t.id === targetId);
    const wallTag = targetConfig?.wallTag || 'front';

    setIsProcessing(true);
    try {
      const processed = await RoomAnalyzer.processPhotoUpload(file, wallTag);
      processed.captureTarget = targetId;

      const remaining = photos.filter(p => p.captureTarget !== targetId && p.wallTag !== targetId && p.wallTag !== wallTag);
      onPhotosChange([...remaining, processed]);

      const currentIndex = CAPTURE_TARGETS.findIndex(t => t.id === targetId);
      const nextTarget = CAPTURE_TARGETS.slice(currentIndex + 1).find(t => !getPhotoForTarget(t.id));
      if (nextTarget) {
        setActiveTarget(nextTarget.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process image upload.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [photos, onPhotosChange, getPhotoForTarget]);

  const handleRemovePhoto = useCallback((targetId: CaptureTarget) => {
    const config = CAPTURE_TARGETS.find(t => t.id === targetId);
    onPhotosChange(photos.filter(p => p.captureTarget !== targetId && p.wallTag !== config?.wallTag && p.wallTag !== targetId));
  }, [photos, onPhotosChange]);

  // ALL HOOKS STRICTLY DECLARED BEFORE ANY RETURN
  return (
    <div className="space-y-4 w-full font-sans">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Guide Header Banner */}
      {!compact && (
        <div className="p-4 rounded-[16px] bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#16A34A]" />
              Camera-Guided Architectural Perspectives (Optional)
            </h4>
            <p className="text-xs text-zinc-400 max-w-xl">
              Photographs help Gemini Vision reconstruct existing windows, entrance doors, structural pillars, and AC units. If you prefer, skip photos and generate layouts with dimensions only.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] text-zinc-400 block">Captured</span>
            <span className="text-sm font-semibold text-[#16A34A]">
              {capturedCount} of 5 Angles
            </span>
          </div>
        </div>
      )}

      {/* Five Phone-Style Capture Cards Grid with Faded Architectural Reference Images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {CAPTURE_TARGETS.map((target) => {
          const photo = getPhotoForTarget(target.id);
          const isSelected = activeTarget === target.id;
          const ReferenceSvg = REFERENCE_ILLUSTRATIONS[target.id];

          return (
            <div
              key={target.id}
              onClick={() => setActiveTarget(target.id)}
              className={`p-3.5 rounded-[16px] border transition-all flex flex-col justify-between space-y-3 cursor-pointer ${
                photo
                  ? 'bg-white/[0.03] border-[#16A34A]/40'
                  : isSelected
                  ? 'bg-white/[0.04] border-[#16A34A] ring-1 ring-[#16A34A]'
                  : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              {/* Card Header: Title + Optional Badge + Completed State */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-white">{target.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-[4px] font-medium border bg-white/[0.02] text-zinc-400 border-white/[0.06] shrink-0">
                      Optional
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 truncate" title={target.subtitle}>{target.subtitle}</div>
                </div>

                {photo ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[#16A34A]/15 border border-[#16A34A]/30 text-[#16A34A] text-[10px] font-semibold shrink-0">
                    <Check className="w-3 h-3" />
                    <span>Completed</span>
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-700 shrink-0 mt-1" />
                )}
              </div>

              {/* Viewfinder Capture Area with Faded Reference Illustration */}
              <div className="relative aspect-video bg-black/60 rounded-[12px] overflow-hidden border border-white/[0.08] flex items-center justify-center group">
                {photo ? (
                  <>
                    <img
                      src={photo.dataUrl}
                      alt={target.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPhoto(photo);
                        }}
                        className="px-2 py-1 bg-[#0B0F14]/90 hover:bg-[#0B0F14] text-zinc-200 hover:text-white rounded-[6px] text-xs font-medium flex items-center gap-1 border border-white/[0.08]"
                        title="Enlarge preview"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerUpload(target.id);
                        }}
                        className="px-2 py-1 bg-[#0B0F14]/90 hover:bg-[#0B0F14] text-zinc-200 hover:text-white rounded-[6px] text-xs font-medium flex items-center gap-1 border border-white/[0.08]"
                        title="Retake photo"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(target.id);
                        }}
                        className="p-1 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-[6px] text-xs border border-red-500/20"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-2.5">
                    {/* Faded Architectural Reference Illustration Background */}
                    <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                      {ReferenceSvg && <ReferenceSvg />}
                    </div>

                    {/* Instruction Caption Overlay */}
                    <div className="relative z-10 text-center space-y-1 bg-[#0B0F14]/85 backdrop-blur-xs p-2 rounded-[8px] border border-white/[0.06] max-w-[180px]">
                      <Camera className="w-3.5 h-3.5 text-[#16A34A] mx-auto shrink-0" />
                      <p className="text-[9px] text-zinc-300 leading-tight font-medium">
                        {target.instruction}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Upload Button, Retake Button, or Completed Actions */}
              <div className="pt-0.5 flex items-center gap-1.5">
                {photo ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewPhoto(photo);
                      }}
                      className="flex-1 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium rounded-[8px] border border-white/[0.08] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerUpload(target.id);
                      }}
                      className="flex-1 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium rounded-[8px] border border-white/[0.08] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retake</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTriggerUpload(target.id);
                    }}
                    className="w-full py-1.5 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#16A34A]/50 text-zinc-200 hover:text-white text-xs font-medium rounded-[8px] border border-white/[0.08] transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3 h-3 text-[#16A34A] shrink-0" />
                    <span>Upload Photo</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enlarged Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative max-w-2xl w-full bg-[#0B0F14] border border-white/[0.08] rounded-[16px] overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Photo Preview: {previewPhoto.captureTarget || previewPhoto.wallTag}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-[6px] hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-[10px] overflow-hidden bg-black flex items-center justify-center border border-white/[0.08]">
              <img
                src={previewPhoto.dataUrl}
                alt="Room angle enlarged"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
