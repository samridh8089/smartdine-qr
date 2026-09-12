// SmartDine AI Floor Planner — Camera Overlay & Side-by-Side Comparison
// Clean Linear/Notion aesthetic: #0B0F14, border-white/[0.08], 16px radius, emerald (#16A34A) accent, 0 emojis.

import React, { useState } from 'react';
import { Camera, RefreshCw, Check, Split, Image as ImageIcon } from 'lucide-react';
import { RoomPhoto, LayoutSuggestion } from '@/lib/ai/floorPlanner';
import { LayoutPreviewThumbnail } from './LayoutPreviewThumbnail';

interface CameraOverlayComparisonProps {
  photos: RoomPhoto[];
  layout: LayoutSuggestion;
  onApply: () => void;
  onRegenerate: () => void;
  onClose?: () => void;
}

export const CameraOverlayComparison: React.FC<CameraOverlayComparisonProps> = ({
  photos,
  layout,
  onApply,
  onRegenerate,
  onClose
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const activePhoto = photos[selectedPhotoIndex] || photos[0];

  return (
    <div className="bg-[#0B0F14] rounded-[16px] border border-white/[0.08] p-5 space-y-4 font-sans text-zinc-100">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <Split className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              Camera-Guided Space Comparison
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-[6px] bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                {layout.badge}
              </span>
            </h4>
            <p className="text-[11px] text-zinc-400">Validate real room geometry against layout blueprint</p>
          </div>
        </div>

        {/* Photo Perspective Selector Tabs */}
        {photos.length > 1 && (
          <div className="flex items-center bg-white/[0.02] p-1 rounded-[10px] border border-white/[0.08] gap-1 text-xs">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`px-2.5 py-1 rounded-[8px] font-medium transition-all cursor-pointer capitalize text-[11px] ${
                  selectedPhotoIndex === idx
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {photo.captureTarget || photo.wallTag || `Photo ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Side-by-Side Dual Viewport */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT: Actual Room Photo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#16A34A]" />
              Actual Restaurant Space
            </span>
            <span className="text-[11px] text-zinc-400 capitalize">
              Angle: {activePhoto?.captureTarget || activePhoto?.wallTag || 'Front'}
            </span>
          </div>

          <div className="relative w-full aspect-16/10 bg-white/[0.02] rounded-[12px] overflow-hidden border border-white/[0.08] flex items-center justify-center">
            {activePhoto?.dataUrl ? (
              <img
                src={activePhoto.dataUrl}
                alt="Actual Room"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4 text-zinc-500 space-y-1">
                <ImageIcon className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-xs">No camera photo captured for this perspective</p>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#0B0F14]/90 rounded-[6px] text-[10px] font-medium text-zinc-200 border border-white/[0.08]">
              Captured Photo
            </div>
          </div>
        </div>

        {/* RIGHT: AI Furniture Placement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#16A34A]" />
              AI Reconstructed Placement
            </span>
            <span className="text-[11px] text-[#16A34A] font-medium">
              {layout.metrics.seats} Seats &bull; {layout.metrics.walkingSpace} Walkways
            </span>
          </div>

          <div className="relative w-full aspect-16/10 rounded-[12px] overflow-hidden border border-white/[0.08]">
            <LayoutPreviewThumbnail
              items={layout.items}
              canvasWidth={layout.canvasWidth}
              canvasHeight={layout.canvasHeight}
            />
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-[#0B0F14]/90 rounded-[6px] text-[10px] font-medium text-white border border-white/[0.08]">
              {layout.name}
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-[10px] text-xs font-medium transition-colors cursor-pointer border border-white/[0.08]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Regenerate Placement</span>
        </button>

        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-zinc-400 hover:text-white text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onApply}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#16A34A] hover:bg-emerald-500 text-white rounded-[10px] text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Layout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
