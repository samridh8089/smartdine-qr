'use client';

import React from 'react';
import { 
  Copy, Trash2, RotateCw, QrCode, Split, 
  Plus, Minus, X, Check, ArrowRight
} from 'lucide-react';
import { FloorPlanItem, TableShape } from './types';

interface PropertyPanelProps {
  item: FloorPlanItem | null;
  onUpdate: (newAttrs: Partial<FloorPlanItem>) => void;
  onDuplicate: (item: FloorPlanItem) => void;
  onDelete: (id: string) => void;
  onSplit?: (mergedItem: FloorPlanItem) => void;
  onClose: () => void;
  onViewQR?: (item: FloorPlanItem) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  item,
  onUpdate,
  onDuplicate,
  onDelete,
  onSplit,
  onClose,
  onViewQR
}) => {
  if (!item) {
    return (
      <div className="w-72 bg-white border-l border-[#E7E5E4] p-5 flex flex-col items-center justify-center text-center select-none shrink-0 shadow-sm">
        <p className="text-xs font-medium text-[#737373]">
          Select any table or object on the canvas to inspect and edit its properties.
        </p>
      </div>
    );
  }

  const isTable = item.kind === 'table';

  return (
    <div className="w-72 bg-white border-l border-[#E7E5E4] flex flex-col h-full select-none overflow-y-auto shrink-0 shadow-sm">
      {/* Header */}
      <div className="p-3.5 border-b border-[#EFEDE8] flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
            {isTable ? `Table ${item.tableNumber}` : item.name}
          </h2>
          <span className="text-[10px] text-[#737373] uppercase tracking-wider">
            {isTable ? `${item.shape || 'rectangle'} table` : 'fixture'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Identifier / Name */}
        <div>
          <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
            {isTable ? 'Table Identifier' : 'Element Name'}
          </label>
          <input
            type="text"
            value={isTable ? item.tableNumber : item.name}
            onChange={(e) =>
              onUpdate(isTable ? { tableNumber: e.target.value } : { name: e.target.value })
            }
            className="w-full px-2.5 py-1.5 border border-[#E7E5E4] rounded-md bg-[#FAFAF9] text-[#171717] font-medium focus:bg-white focus:outline-none focus:border-[#171717]"
          />
        </div>

        {/* Seats (For tables) */}
        {isTable && (
          <div>
            <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Seating Capacity
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onUpdate({ seats: Math.max(1, (item.seats || 4) - 1) })}
                className="p-1.5 border border-[#E7E5E4] rounded-md hover:border-[#171717] bg-[#FAFAF9] hover:bg-white transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5 text-[#171717]" />
              </button>
              <span className="flex-1 text-center font-bold text-sm text-[#171717]">
                {item.seats || 4} Seats
              </span>
              <button
                type="button"
                onClick={() => onUpdate({ seats: (item.seats || 4) + 1 })}
                className="p-1.5 border border-[#E7E5E4] rounded-md hover:border-[#171717] bg-[#FAFAF9] hover:bg-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#171717]" />
              </button>
            </div>
          </div>
        )}

        {/* Shape Picker (For tables) */}
        {isTable && (
          <div>
            <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Table Shape
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['square', 'rectangle', 'circle', 'oval', 'booth'] as TableShape[]).map((shp) => (
                <button
                  key={shp}
                  type="button"
                  onClick={() => onUpdate({ shape: shp })}
                  className={`px-2 py-1.5 rounded-md border text-[11px] capitalize font-medium transition-colors cursor-pointer ${
                    item.shape === shp
                      ? 'border-[#171717] bg-[#171717] text-white'
                      : 'border-[#E7E5E4] bg-[#FAFAF9] text-[#525252] hover:bg-white hover:text-[#171717]'
                  }`}
                >
                  {shp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dimensions */}
        <div>
          <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
            Dimensions (px)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-[#737373] block mb-1">Width</span>
              <input
                type="number"
                value={Math.round(item.width)}
                onChange={(e) => onUpdate({ width: Math.max(30, Number(e.target.value)) })}
                className="w-full px-2 py-1.5 border border-[#E7E5E4] rounded-md bg-[#FAFAF9] text-[#171717] font-medium focus:bg-white focus:outline-none focus:border-[#171717]"
              />
            </div>
            <div>
              <span className="text-[10px] text-[#737373] block mb-1">Height</span>
              <input
                type="number"
                value={Math.round(item.height)}
                onChange={(e) => onUpdate({ height: Math.max(30, Number(e.target.value)) })}
                className="w-full px-2 py-1.5 border border-[#E7E5E4] rounded-md bg-[#FAFAF9] text-[#171717] font-medium focus:bg-white focus:outline-none focus:border-[#171717]"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-[#525252] uppercase tracking-wider">
              Rotation
            </label>
            <span className="text-[11px] font-bold text-[#171717]">
              {Math.round(item.rotation || 0)}°
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={item.rotation || 0}
              onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
              className="flex-1 accent-[#171717]"
            />
            <button
              type="button"
              onClick={() => onUpdate({ rotation: ((item.rotation || 0) + 45) % 360 })}
              className="px-2 py-1 border border-[#E7E5E4] rounded-md hover:border-[#171717] bg-[#FAFAF9] text-[10px] font-semibold hover:bg-white transition-colors cursor-pointer"
            >
              +45°
            </button>
          </div>
        </div>

        {/* Status Setting (Live preview) */}
        {isTable && (
          <div>
            <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Operating Status
            </label>
            <select
              value={item.status || 'available'}
              onChange={(e) => onUpdate({ status: e.target.value as any })}
              className="w-full px-2.5 py-1.5 border border-[#E7E5E4] rounded-md bg-[#FAFAF9] text-[#171717] font-medium focus:bg-white focus:outline-none focus:border-[#171717]"
            >
              <option value="available">Available (White)</option>
              <option value="occupied">Occupied / Running (Charcoal)</option>
              <option value="reserved">Reserved (Warm Sand)</option>
              <option value="cleaning">Cleaning (Light Gray)</option>
              <option value="merged">Merged (Dashed Border)</option>
            </select>
          </div>
        )}

        {/* Split Tables Button (If merged) */}
        {item.isMerged && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onSplit && onSplit(item)}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-md border border-[#171717] bg-white hover:bg-[#F5F5F4] text-[#171717] font-bold text-xs transition-colors cursor-pointer"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split Tables</span>
            </button>
          </div>
        )}

        {/* QR Code Action (For tables) */}
        {isTable && onViewQR && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onViewQR(item)}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] hover:bg-white hover:border-[#171717] text-[#171717] font-semibold text-xs transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-[#525252]" />
              <span>View Table QR Code</span>
            </button>
          </div>
        )}

        {/* Duplicate & Delete Actions */}
        <div className="pt-3 border-t border-[#EFEDE8] flex space-x-2">
          <button
            type="button"
            onClick={() => onDuplicate(item)}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] hover:bg-white hover:border-[#171717] text-[#171717] font-semibold text-xs transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#525252]" />
            <span>Duplicate</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="flex items-center justify-center p-2 rounded-md border border-[#E7E5E4] text-[#737373] hover:text-[#171717] hover:border-[#171717] hover:bg-[#F5F5F4] transition-colors cursor-pointer"
            title="Delete Object"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
