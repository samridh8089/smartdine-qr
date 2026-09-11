'use client';

import React, { useState, useEffect } from 'react';
import { 
  Copy, Trash2, RotateCw, QrCode, Split, 
  Plus, Minus, X, Check, ArrowRight, MapPin, AlertCircle,
  Lock, Unlock, ArrowUp, ArrowDown
} from 'lucide-react';
import { FloorPlanItem, TableShape, RestaurantZone } from './types';

interface PropertyPanelProps {
  item: FloorPlanItem | null;
  existingItems?: FloorPlanItem[];
  zones?: RestaurantZone[];
  onUpdate: (newAttrs: Partial<FloorPlanItem>) => void;
  onDuplicate: (item: FloorPlanItem) => void;
  onDelete: (id: string) => void;
  onSplit?: (mergedItem: FloorPlanItem) => void;
  onBringForward?: (id: string) => void;
  onSendBackward?: (id: string) => void;
  onClose: () => void;
  onViewQR?: (item: FloorPlanItem) => void;
}

const AVAILABLE_SHAPES: Array<{ shape: TableShape; label: string }> = [
  { shape: 'two_seater', label: '2-Seater' },
  { shape: 'square', label: 'Square' },
  { shape: 'circle', label: 'Round' },
  { shape: 'rectangle', label: 'Rectangle' },
  { shape: 'oval', label: 'Oval' },
  { shape: 'booth', label: 'Booth' },
  { shape: 'l_booth', label: 'L-Booth' },
  { shape: 'u_booth', label: 'U-Booth' },
  { shape: 'sofa_lounge', label: 'Sofa' },
  { shape: 'window_bench', label: 'Bench' },
  { shape: 'vip_lounge', label: 'VIP' },
  { shape: 'bar_table', label: 'Bar High' }
];

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  item,
  existingItems = [],
  zones = [],
  onUpdate,
  onDuplicate,
  onDelete,
  onSplit,
  onBringForward,
  onSendBackward,
  onClose,
  onViewQR
}) => {
  // 1. useState declarations (Strict React Hooks Safety Guardrail)
  const [localWidth, setLocalWidth] = useState<string>('');
  const [localHeight, setLocalHeight] = useState<string>('');
  const [localName, setLocalName] = useState<string>('');
  const [localTableNumber, setLocalTableNumber] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [numberError, setNumberError] = useState<string>('');

  // 2. useEffect declarations (Synchronize controlled inputs on item change)
  useEffect(() => {
    if (item) {
      setLocalWidth(String(Math.round(item.width || 80)));
      setLocalHeight(String(Math.round(item.height || 80)));
      setLocalName(item.name || '');
      setLocalTableNumber(item.display_number || item.tableNumber || '');
      setNameError('');
      setNumberError('');
    }
  }, [item?.id, item?.width, item?.height, item?.name, item?.tableNumber, item?.display_number]);

  // ALL HOOKS STRICTLY ABOVE CONDITIONAL RETURNS
  if (!item) {
    return (
      <div className="hidden md:flex w-72 bg-white border-l border-[#E7E5E4] p-5 flex-col items-center justify-center text-center select-none shrink-0 shadow-xs">
        <p className="text-xs font-medium text-[#737373]">
          Select any table or fixture on the canvas to inspect and edit its properties.
        </p>
      </div>
    );
  }

  const isTable = item.kind === 'table';
  const isLocked = Boolean(item.isLocked);

  const handleWidthChange = (val: string) => {
    setLocalWidth(val);
    const num = Number(val);
    if (!isNaN(num) && num >= 30 && num <= 600) {
      onUpdate({ width: Math.round(num) });
    }
  };

  const handleWidthBlur = () => {
    const num = Number(localWidth);
    const clamped = Math.max(30, Math.min(600, isNaN(num) || num < 30 ? 30 : Math.round(num)));
    setLocalWidth(String(clamped));
    onUpdate({ width: clamped });
  };

  const handleHeightChange = (val: string) => {
    setLocalHeight(val);
    const num = Number(val);
    if (!isNaN(num) && num >= 30 && num <= 600) {
      onUpdate({ height: Math.round(num) });
    }
  };

  const handleHeightBlur = () => {
    const num = Number(localHeight);
    const clamped = Math.max(30, Math.min(600, isNaN(num) || num < 30 ? 30 : Math.round(num)));
    setLocalHeight(String(clamped));
    onUpdate({ height: clamped });
  };

  const handleNameChange = (val: string) => {
    setLocalName(val);
    setNameError('');
    onUpdate({ name: val });
  };

  const handleNameBlur = () => {
    if (!localName.trim()) {
      setNameError('Fixture name cannot be empty');
      const fallback = item.furnitureType ? item.furnitureType.toUpperCase() : 'FIXTURE';
      setLocalName(fallback);
      onUpdate({ name: fallback });
    }
  };

  const handleTableNumberChange = (val: string) => {
    setLocalTableNumber(val);
    const clean = val.trim();
    if (!clean) {
      setNumberError('Table number cannot be empty');
      return;
    }
    // Check duplicate table identifier
    const isDup = existingItems.some(
      (it) => it.id !== item.id && it.kind === 'table' && (it.display_number === clean || it.tableNumber === clean)
    );
    if (isDup) {
      setNumberError(`Table ${clean} already exists`);
    } else {
      setNumberError('');
    }
    onUpdate({
      tableNumber: val,
      display_number: val,
      name: `Table ${val}`
    });
  };

  const handleTableNumberBlur = () => {
    if (!localTableNumber.trim()) {
      const fallback = item.display_number || item.tableNumber || '1';
      setLocalTableNumber(fallback);
      setNumberError('');
      onUpdate({
        tableNumber: fallback,
        display_number: fallback,
        name: `Table ${fallback}`
      });
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[82vh] rounded-t-2xl shadow-2xl border-t border-[#E7E5E4] md:static md:inset-auto md:max-h-none md:w-72 md:rounded-none md:shadow-xs md:border-t-0 md:border-l bg-white flex flex-col h-auto md:h-full select-none overflow-y-auto shrink-0 transition-all">
      {/* Mobile Drawer Pull Handle */}
      <div className="pt-2 pb-1 flex items-center justify-center md:hidden">
        <div className="w-10 h-1 bg-stone-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="p-3.5 border-b border-[#EFEDE8] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
              {isTable ? `Table ${item.display_number || item.tableNumber || item.name}` : item.name}
            </h2>
            {isLocked && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                <Lock className="w-2.5 h-2.5" />
                Locked
              </span>
            )}
          </div>
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
        {/* Layering & Lock Quick Bar */}
        <div className="flex items-center gap-1.5 bg-[#FAFAF9] p-1.5 rounded-lg border border-[#E7E5E4]">
          <button
            type="button"
            onClick={() => onUpdate({ isLocked: !isLocked })}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              isLocked
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-white text-stone-700 hover:text-stone-900 border border-stone-200 shadow-2xs'
            }`}
            title={isLocked ? 'Unlock object (Enable drag and resize)' : 'Lock object in place (Prevent accidental movement)'}
          >
            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{isLocked ? 'Locked' : 'Lock'}</span>
          </button>

          {onBringForward && (
            <button
              type="button"
              onClick={() => onBringForward(item.id)}
              className="p-1.5 bg-white text-stone-700 hover:text-stone-900 border border-stone-200 rounded-md hover:bg-stone-50 transition-colors cursor-pointer"
              title="Bring Forward (Higher Layer)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          )}

          {onSendBackward && (
            <button
              type="button"
              onClick={() => onSendBackward(item.id)}
              className="p-1.5 bg-white text-stone-700 hover:text-stone-900 border border-stone-200 rounded-md hover:bg-stone-50 transition-colors cursor-pointer"
              title="Send Backward (Lower Layer)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Identifier / Name */}
        <div>
          <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
            {isTable ? 'Table Identifier' : 'Fixture Name / Label'}
          </label>
          <input
            type="text"
            value={isTable ? localTableNumber : localName}
            onChange={(e) => isTable ? handleTableNumberChange(e.target.value) : handleNameChange(e.target.value)}
            onBlur={isTable ? handleTableNumberBlur : handleNameBlur}
            className={`w-full px-2.5 py-1.5 border rounded-md bg-[#FAFAF9] text-[#171717] font-medium focus:bg-white focus:outline-none transition-colors ${
              (numberError || nameError) ? 'border-red-500 focus:border-red-600' : 'border-[#E7E5E4] focus:border-[#171717]'
            }`}
          />
          {numberError && (
            <p className="mt-1 text-[10px] text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {numberError}
            </p>
          )}
          {nameError && (
            <p className="mt-1 text-[10px] text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {nameError}
            </p>
          )}
        </div>

        {/* Zone Assignment (For tables) */}
        {isTable && zones.length > 0 && (
          <div>
            <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Assigned Zone / Area
            </label>
            <div className="relative">
              <select
                value={item.zone_id || zones[0]?.id || 'zone_indoor'}
                onChange={(e) => {
                  const targetZoneId = e.target.value;
                  const matchedZone = zones.find((z) => z.id === targetZoneId);
                  onUpdate({
                    zone_id: targetZoneId,
                    zone_name: matchedZone ? matchedZone.name : 'Indoor AC'
                  });
                }}
                className="w-full px-2.5 py-1.5 border border-[#E7E5E4] rounded-md bg-[#FAFAF9] text-[#171717] font-medium focus:bg-white focus:outline-none focus:border-[#171717] appearance-none cursor-pointer"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                <MapPin className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}

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
              Table Shape &amp; Style
            </label>
            <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg">
              {AVAILABLE_SHAPES.map((shp) => (
                <button
                  key={shp.shape}
                  type="button"
                  onClick={() => onUpdate({ shape: shp.shape })}
                  className={`px-1.5 py-1.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer truncate ${
                    item.shape === shp.shape
                      ? 'border border-[#171717] bg-[#171717] text-white shadow-2xs'
                      : 'border border-transparent bg-white text-stone-700 hover:border-stone-300'
                  }`}
                  title={shp.label}
                >
                  {shp.label}
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
                type="text"
                value={localWidth}
                onChange={(e) => handleWidthChange(e.target.value)}
                onBlur={handleWidthBlur}
                disabled={isLocked}
                className="w-full px-2.5 py-1.5 border border-[#E7E5E4] rounded-md bg-[#FAFAF9] text-[#171717] font-medium focus:bg-white focus:outline-none focus:border-[#171717] disabled:opacity-50"
              />
            </div>
            <div>
              <span className="text-[10px] text-[#737373] block mb-1">Height</span>
              <input
                type="text"
                value={localHeight}
                onChange={(e) => handleHeightChange(e.target.value)}
                onBlur={handleHeightBlur}
                disabled={isLocked}
                className="w-full px-2.5 py-1.5 border border-[#E7E5E4] rounded-md bg-[#FAFAF9] text-[#171717] font-medium focus:bg-white focus:outline-none focus:border-[#171717] disabled:opacity-50"
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
              disabled={isLocked}
              onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
              className="flex-1 accent-[#171717] disabled:opacity-50"
            />
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onUpdate({ rotation: ((item.rotation || 0) + 45) % 360 })}
              className="px-2 py-1 border border-[#E7E5E4] rounded-md hover:border-[#171717] bg-[#FAFAF9] text-[10px] font-semibold hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
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
              <option value="available">Available (Mint)</option>
              <option value="occupied">Occupied / Running (Soft Red)</option>
              <option value="reserved">Reserved (Slate)</option>
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
            disabled={isLocked}
            onClick={() => onDelete(item.id)}
            className="flex items-center justify-center p-2 rounded-md border border-[#E7E5E4] text-[#737373] hover:text-[#171717] hover:border-[#171717] hover:bg-[#F5F5F4] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={isLocked ? 'Cannot delete locked object. Unlock it first.' : 'Delete Object'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
