'use client';

import React, { useState, useEffect } from 'react';
import { 
  Copy, Trash2, QrCode, Split, 
  Plus, Minus, X, AlertCircle,
  Lock, Unlock, ArrowUp, ArrowDown, Download, SlidersHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';
import { FloorPlanItem, TableShape, RestaurantZone } from './types';
import { FloorElementIcon } from './FloorElementIcons';

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

const MATERIALS_LIST: Array<{ id: string; label: string; color: string; border: string }> = [
  { id: 'walnut', label: 'Walnut Wood', color: '#3d2516', border: '#78350f' },
  { id: 'marble', label: 'Carrara Marble', color: '#f8fafc', border: '#94a3b8' },
  { id: 'black_steel', label: 'Matte Black', color: '#18181b', border: '#52525b' },
  { id: 'olive_leather', label: 'Olive Leather', color: '#2e4521', border: '#65a30d' },
  { id: 'concrete', label: 'Dark Concrete', color: '#3f3f46', border: '#71717a' },
  { id: 'warm_fabric', label: 'Warm Fabric', color: '#9a3412', border: '#ea580c' },
  { id: 'brass', label: 'Brushed Brass', color: '#d4af37', border: '#eab308' }
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
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

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
      <div className="hidden md:flex w-72 lg:w-80 bg-[#0B0F14] border-l border-white/[0.08] p-5 flex-col items-center justify-center text-center select-none shrink-0 font-sans">
        <div className="w-10 h-10 rounded-[16px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
          <SlidersHorizontal className="w-5 h-5 text-zinc-400" />
        </div>
        <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-1">
          Inspector
        </h3>
        <p className="text-xs font-normal text-zinc-400 max-w-xs">
          Select any table or fixture on the canvas to customize dimensions, materials, and QR codes.
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

  const handleDownloadQR = () => {
    if (!item.qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = item.qrCodeUrl;
    link.download = `table-${item.display_number || item.tableNumber || 'qr'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[82vh] rounded-t-2xl shadow-2xl border-t border-white/[0.08] md:static md:inset-auto md:max-h-none md:w-72 md:rounded-none md:border-t-0 md:border-l bg-[#0B0F14] text-zinc-100 flex flex-col h-auto md:h-full select-none overflow-y-auto shrink-0 transition-all font-sans">
      {/* Mobile Drawer Pull Handle */}
      <div className="pt-2 pb-1 flex items-center justify-center md:hidden">
        <div className="w-10 h-1 bg-zinc-700 rounded-full" />
      </div>

      {/* Header */}
      <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#0B0F14]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
              {isTable ? `Table ${item.display_number || item.tableNumber || item.name}` : item.name}
            </h2>
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="w-2.5 h-2.5" />
                Locked
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
            {isTable ? `${item.shape || 'rectangle'} table` : (item.furnitureType || 'fixture')}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body with 16px Rounded Cards */}
      <div className="p-3.5 space-y-3 text-xs overflow-y-auto">
        {/* Card 1: Live Element Preview */}
        <div className="bg-white/[0.03] p-3 rounded-[16px] border border-white/[0.08] flex items-center gap-3">
          <div className="w-14 h-14 rounded-[12px] bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
            <FloorElementIcon 
              type={item.shape || item.furnitureType || 'rectangle'} 
              className="w-10 h-10 object-contain text-zinc-300"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white truncate">
                {isTable ? `Table ${item.display_number || item.tableNumber || '1'}` : (item.name || 'Fixture')}
              </span>
              <span className="text-[10px] text-[#16A34A] font-medium">
                {isTable ? `${item.seats || 4} seats` : 'Fixed'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {Math.round(item.width || 80)} x {Math.round(item.height || 80)} px • {Math.round(item.rotation || 0)}°
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => onUpdate({ isLocked: !isLocked })}
                className={`px-2 py-1 rounded-[8px] text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                  isLocked
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
                }`}
              >
                {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{isLocked ? 'Locked' : 'Lock'}</span>
              </button>
              <button
                type="button"
                onClick={() => onDuplicate(item)}
                className="p-1 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] rounded-[8px] transition-colors cursor-pointer"
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onDelete(item.id)}
                className="p-1 bg-white/[0.04] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/[0.08] rounded-[8px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Seating & Shape Selector */}
        {isTable && (
          <div className="bg-white/[0.03] p-3 rounded-[16px] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
                Capacity
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => onUpdate({ seats: Math.max(1, (item.seats || 4) - 1) })}
                  className="p-1 border border-white/[0.08] rounded-[6px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 transition-colors cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-medium text-xs text-white px-2">
                  {item.seats || 4} Seats
                </span>
                <button
                  type="button"
                  onClick={() => onUpdate({ seats: (item.seats || 4) + 1 })}
                  className="p-1 border border-white/[0.08] rounded-[6px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 uppercase tracking-wider mb-1.5">
                Table Shape
              </label>
              <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto p-1 bg-white/[0.02] border border-white/[0.08] rounded-[10px]">
                {AVAILABLE_SHAPES.map((shp) => (
                  <button
                    key={shp.shape}
                    type="button"
                    onClick={() => onUpdate({ shape: shp.shape })}
                    className={`px-1.5 py-1.5 rounded-[8px] text-[10px] font-medium transition-all cursor-pointer truncate ${
                      item.shape === shp.shape
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                    title={shp.label}
                  >
                    {shp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Dimensions & Rotation */}
        <div className="bg-white/[0.03] p-3 rounded-[16px] border border-white/[0.08] space-y-3">
          <label className="block text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
            Dimensions &amp; Orientation
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-zinc-400 font-normal block mb-1">Width (px)</span>
              <input
                type="text"
                value={localWidth}
                onChange={(e) => handleWidthChange(e.target.value)}
                onBlur={handleWidthBlur}
                disabled={isLocked}
                className="w-full px-2.5 py-1.5 border border-white/[0.08] rounded-[10px] bg-white/[0.04] text-zinc-100 font-normal focus:bg-white/[0.06] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] disabled:opacity-50"
              />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-normal block mb-1">Length / Height (px)</span>
              <input
                type="text"
                value={localHeight}
                onChange={(e) => handleHeightChange(e.target.value)}
                onBlur={handleHeightBlur}
                disabled={isLocked}
                className="w-full px-2.5 py-1.5 border border-white/[0.08] rounded-[10px] bg-white/[0.04] text-zinc-100 font-normal focus:bg-white/[0.06] focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-400 font-normal">Rotation</span>
              <span className="text-[11px] font-medium text-white">
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
                className="flex-1 accent-[#16A34A] disabled:opacity-50"
              />
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onUpdate({ rotation: ((item.rotation || 0) + 45) % 360 })}
                className="px-2 py-1 border border-white/[0.08] rounded-[8px] bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-medium text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                +45°
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Material Finish */}
        <div className="bg-white/[0.03] p-3 rounded-[16px] border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
              Material Finish
            </label>
            <span className="text-[10px] text-zinc-400 capitalize">
              {item.material || (item.shape === 'circle' ? 'Carrara Marble' : 'American Walnut')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {MATERIALS_LIST.map((mat) => {
              const isSelected = item.material === mat.id;
              return (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => onUpdate({ material: mat.id })}
                  className={`flex items-center gap-2 p-1.5 rounded-[10px] border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#16A34A] bg-[#16A34A]/10 text-white font-medium ring-1 ring-[#16A34A]'
                      : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-white/[0.16]'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: mat.color }}
                  />
                  <span className="text-[10px] truncate">{mat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 5: Compact QR Section */}
        {isTable && (
          <div className="bg-white/[0.03] p-3 rounded-[16px] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
                Table QR Code
              </label>
              <span className="text-[10px] text-[#16A34A] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                Live Ordering
              </span>
            </div>

            <div className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-[12px] border border-white/[0.08]">
              <div className="w-13 h-13 bg-white p-1 rounded-[8px] border border-white/10 shrink-0 flex items-center justify-center">
                {item.qrCodeUrl ? (
                  <img src={item.qrCodeUrl} alt="Table QR" className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="w-7 h-7 text-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  Table {item.display_number || item.tableNumber || '1'}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">Scan to order &amp; pay</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {onViewQR && (
                    <button
                      type="button"
                      onClick={() => onViewQR(item)}
                      className="px-2 py-0.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-[6px] text-[10px] font-medium text-zinc-200 cursor-pointer"
                    >
                      View QR
                    </button>
                  )}
                  {item.qrCodeUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      className="px-2 py-0.5 bg-[#16A34A] hover:bg-emerald-500 text-white rounded-[6px] text-[10px] font-medium cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-2.5 h-2.5" />
                      <span>Download</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card 6: Advanced Settings (Collapsible) */}
        <div className="bg-white/[0.03] rounded-[16px] border border-white/[0.08] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/[0.02] cursor-pointer"
          >
            <span className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
              Advanced Settings
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-3 pt-0 border-t border-white/[0.08] space-y-3">
              {/* Fixture Name / Label (Required by smoke tests) */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                  {isTable ? 'Table Identifier' : 'Fixture Name / Label'}
                </label>
                <input
                  type="text"
                  value={isTable ? localTableNumber : localName}
                  onChange={(e) => isTable ? handleTableNumberChange(e.target.value) : handleNameChange(e.target.value)}
                  onBlur={isTable ? handleTableNumberBlur : handleNameBlur}
                  className={`w-full px-2.5 py-1.5 border rounded-[10px] bg-white/[0.04] text-zinc-100 font-normal focus:bg-white/[0.06] focus:outline-none transition-colors ${
                    (numberError || nameError) ? 'border-red-500 focus:border-red-600' : 'border-white/[0.08] focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]'
                  }`}
                />
                {numberError && (
                  <p className="mt-1 text-[10px] text-red-400 font-normal flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {numberError}
                  </p>
                )}
                {nameError && (
                  <p className="mt-1 text-[10px] text-red-400 font-normal flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {nameError}
                  </p>
                )}
              </div>

              {/* Zone Assignment */}
              {isTable && zones.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    Assigned Zone
                  </label>
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
                    className="w-full px-2.5 py-1.5 border border-white/[0.08] rounded-[10px] bg-[#0B0F14] text-zinc-200 font-normal focus:outline-none focus:border-[#16A34A]"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id} className="bg-[#0B0F14] text-white">
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Operating Status */}
              {isTable && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    Live Status
                  </label>
                  <select
                    value={item.status || 'available'}
                    onChange={(e) => onUpdate({ status: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-white/[0.08] rounded-[10px] bg-[#0B0F14] text-zinc-200 font-normal focus:outline-none focus:border-[#16A34A]"
                  >
                    <option value="available" className="bg-[#0B0F14] text-white">Available</option>
                    <option value="occupied" className="bg-[#0B0F14] text-white">Occupied</option>
                    <option value="reserved" className="bg-[#0B0F14] text-white">Reserved</option>
                    <option value="cleaning" className="bg-[#0B0F14] text-white">Cleaning</option>
                    <option value="merged" className="bg-[#0B0F14] text-white">Merged</option>
                  </select>
                </div>
              )}

              {/* Layer Ordering */}
              <div className="flex items-center gap-2 pt-1">
                {onBringForward && (
                  <button
                    type="button"
                    onClick={() => onBringForward(item.id)}
                    className="flex-1 py-1.5 px-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 rounded-[8px] text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Bring Forward</span>
                  </button>
                )}
                {onSendBackward && (
                  <button
                    type="button"
                    onClick={() => onSendBackward(item.id)}
                    className="flex-1 py-1.5 px-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 rounded-[8px] text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Send Backward</span>
                  </button>
                )}
              </div>

              {/* Split Tables */}
              {item.isMerged && (
                <button
                  type="button"
                  onClick={() => onSplit && onSplit(item)}
                  className="w-full py-2 px-3 rounded-[10px] border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Split Merged Tables</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
