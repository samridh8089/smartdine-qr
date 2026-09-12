'use client';

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import {
  X,
  RotateCcw,
  Box,
  Layers,
  Users,
  Grid,
  Lock,
  Unlock,
  Copy,
  Trash2,
  RotateCw
} from 'lucide-react';
import { FloorPlanItem, RestaurantZone } from '../floorplan/types';
import { FloorScene } from './FloorScene';
import { FloorTextureType } from './Ground';
import { CameraPresetType } from './CameraController';

interface FloorPreview3DProps {
  items: FloorPlanItem[];
  zones?: RestaurantZone[];
  restaurantName?: string;
  onClose: () => void;
  onUpdateItem?: (attrs: Partial<FloorPlanItem>) => void;
  onDuplicateItem?: (item: FloorPlanItem) => void;
  onDeleteItem?: (id: string) => void;
}

export const FloorPreview3D: React.FC<FloorPreview3DProps> = ({
  items,
  zones = [],
  restaurantName = 'SmartDine Restaurant',
  onClose,
  onUpdateItem,
  onDuplicateItem,
  onDeleteItem
}) => {
  // 1. useState declarations (Strict React Hooks Safety Guardrail)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetType>('isometric');
  const [floorType, setFloorType] = useState<FloorTextureType>('porcelain');
  const [lightingMode, setLightingMode] = useState<'day' | 'night'>('night');
  const [resetKey, setResetKey] = useState<number>(0);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [sidebarOffset, setSidebarOffset] = useState<number>(0);

  // 2. useMemo declarations
  const stats = useMemo(() => {
    const tables = items.filter((it) => it.kind === 'table' && !it.is_archived);
    const fixtures = items.filter((it) => it.kind === 'furniture');
    const totalSeats = tables.reduce((acc, t) => acc + (t.seats || 4), 0);
    const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
    return {
      tableCount: tables.length,
      fixtureCount: fixtures.length,
      totalSeats,
      occupiedTables
    };
  }, [items]);

  const selectedItem = useMemo(() => {
    return items.find((it) => it.id === selectedId) || null;
  }, [items, selectedId]);

  // 3. useCallback declarations
  const handleResetCamera = useCallback(() => {
    setResetKey((prev) => prev + 1);
    setCameraPreset('isometric');
  }, []);

  // 4. useEffect declarations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const updateSidebarOffset = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth >= 1024) {
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
  return (
    <div 
      className="fixed top-16 bottom-0 right-0 left-0 lg:left-64 z-[50] flex flex-col bg-black/80 backdrop-blur-md p-3 md:p-5 font-sans select-none animate-in fade-in duration-200"
      style={{
        left: sidebarOffset > 0 ? `${sidebarOffset}px` : undefined
      }}
    >
      <div className="relative w-full h-full bg-[#0B0F14] border border-white/[0.08] text-zinc-100 rounded-[16px] shadow-2xl overflow-hidden flex flex-col">
      {/* Top Glassmorphic Navigation Bar */}
      <div className="h-14 bg-[#0B0F14]/95 backdrop-blur-md border-b border-white/[0.08] px-4 flex items-center justify-between z-20 shrink-0">
        {/* Left: Branding & Status */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[10px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <Box className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-semibold uppercase tracking-wider text-white">3D Floor Planner</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[9px] font-medium bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30">
                PBR Realistic
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-normal truncate max-w-xs md:max-w-md">
              {restaurantName} • Real-Time Spatial Visualization
            </p>
          </div>
        </div>

        {/* Center: Live Stats Badges */}
        <div className="hidden lg:flex items-center space-x-2 bg-white/[0.02] px-3 py-1.5 rounded-[10px] border border-white/[0.08] text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Layers className="w-3.5 h-3.5 text-[#16A34A]" />
            <span className="font-semibold text-white">{stats.tableCount}</span> Tables
          </div>
          <div className="h-3 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Users className="w-3.5 h-3.5 text-[#16A34A]" />
            <span className="font-semibold text-white">{stats.totalSeats}</span> Seats
          </div>
          <div className="h-3 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Box className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-semibold text-white">{stats.fixtureCount}</span> Fixtures
          </div>
        </div>

        {/* Right: Camera Presets, Day/Night Mood, Floor Texture Selector & Actions */}
        <div className="flex items-center space-x-2">
          {/* Day / Night Mood Switcher */}
          <div className="flex items-center bg-white/[0.02] p-0.5 rounded-[8px] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setLightingMode('day')}
              className={`px-2 py-1 rounded-[6px] text-[10px] font-medium transition-all cursor-pointer ${
                lightingMode === 'day'
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setLightingMode('night')}
              className={`px-2 py-1 rounded-[6px] text-[10px] font-medium transition-all cursor-pointer ${
                lightingMode === 'night'
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Night
            </button>
          </div>

          {/* Floor Texture Switcher */}
          <div className="flex items-center bg-white/[0.02] p-0.5 rounded-[8px] border border-white/[0.08]">
            <span className="text-[10px] font-medium text-zinc-500 px-2 hidden md:inline">Floor:</span>
            {[
              { id: 'porcelain' as FloorTextureType, label: 'Porcelain' },
              { id: 'walnut' as FloorTextureType, label: 'Walnut' },
              { id: 'marble' as FloorTextureType, label: 'Marble' },
              { id: 'concrete' as FloorTextureType, label: 'Concrete' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFloorType(f.id)}
                className={`px-2 py-1 rounded-[6px] text-[10px] font-medium transition-all cursor-pointer ${
                  floorType === f.id
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Camera Preset Selector: Isometric, Eye Level, Walkthrough (Live Tour), Top View */}
          <div className="flex items-center bg-white/[0.02] p-0.5 rounded-[8px] border border-white/[0.08]">
            {[
              { id: 'isometric' as const, label: 'Isometric' },
              { id: 'eyelevel' as const, label: 'Eye Level' },
              { id: 'walkthrough' as const, label: 'Live Tour' },
              { id: 'topdown' as const, label: 'Top View' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setCameraPreset(p.id)}
                className={`px-2.5 py-1 rounded-[6px] text-[10px] font-medium transition-all cursor-pointer ${
                  cameraPreset === p.id
                    ? 'bg-white/[0.1] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Grid Toggle Button */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-[8px] transition-colors cursor-pointer border border-white/[0.08] ${
              showGrid
                ? 'bg-[#16A34A]/20 text-[#16A34A] border-[#16A34A]/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title={showGrid ? 'Hide Blueprint Grid' : 'Show Blueprint Grid'}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Reset Camera Button */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-[8px] transition-colors cursor-pointer border border-white/[0.08]"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-[8px] transition-colors cursor-pointer border border-white/[0.08]"
            title="Close 3D Preview (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3D WebGL Canvas Viewport */}
      <div className="relative flex-1 w-full h-full bg-[#0B0F14] overflow-hidden">
        <Canvas
          shadows
          camera={{ position: [8.5, 7.2, 8.5], fov: 38, near: 0.1, far: 120 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.25
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          <color attach="background" args={['#0B0F14']} />
          <Suspense fallback={null}>
            <FloorScene
              items={items}
              selectedId={selectedId}
              cameraPreset={cameraPreset}
              resetCameraKey={resetKey}
              showGrid={showGrid}
              floorType={floorType}
              lightingMode={lightingMode}
              onSelectItem={(id) => setSelectedId(id)}
            />
          </Suspense>
        </Canvas>

        {/* Floating Navigation Controls Guide (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-[#0B0F14]/90 backdrop-blur-md px-3.5 py-2 rounded-[12px] border border-white/[0.08] shadow-lg text-xs text-zinc-300 flex items-center gap-3 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            <span className="font-medium text-white text-[11px]">Controls:</span>
          </div>
          <span className="text-[10px] text-zinc-400">
            Rotate: <strong className="text-zinc-200">Left Drag</strong> • Pan: <strong className="text-zinc-200">Right Drag</strong> • Zoom: <strong className="text-zinc-200">Scroll</strong>
          </span>
        </div>

        {/* Selected Object Clean Inspector HUD (Part 9) */}
        {selectedItem && (
          <div className="absolute bottom-4 right-4 z-10 w-72 bg-[#0B0F14]/95 backdrop-blur-md rounded-[16px] border border-white/[0.08] shadow-2xl p-4 animate-in slide-in-from-bottom-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                <h2 className="text-xs font-semibold text-white tracking-wide uppercase">
                  {selectedItem.kind === 'table'
                    ? `Table ${selectedItem.display_number || selectedItem.tableNumber || selectedItem.name}`
                    : (selectedItem.name || 'Fixture')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-[6px] hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Inspector Properties: Name, Material, Rotation, Size, Color */}
            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Material:</span>
                <span className="font-medium text-white capitalize">
                  {selectedItem.material || (selectedItem.shape === 'circle' ? 'Carrara Marble' : 'American Walnut')}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Rotation:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-white">{Math.round(selectedItem.rotation || 0)}°</span>
                  {onUpdateItem && (
                    <button
                      type="button"
                      onClick={() => onUpdateItem({ rotation: ((selectedItem.rotation || 0) + 45) % 360 })}
                      className="p-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-[6px] text-zinc-300 cursor-pointer"
                      title="Rotate +45°"
                    >
                      <RotateCw className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Size:</span>
                <span className="font-medium text-white">
                  {(selectedItem.width * 0.02).toFixed(1)}m × {(selectedItem.height * 0.02).toFixed(1)}m
                  <span className="text-zinc-500 ml-1">({Math.round(selectedItem.width)}×{Math.round(selectedItem.height)}px)</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Finish / Color:</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{
                      backgroundColor:
                        selectedItem.material === 'marble'
                          ? '#f8fafc'
                          : selectedItem.material === 'black_steel'
                          ? '#18181b'
                          : selectedItem.material === 'olive_leather'
                          ? '#2e4521'
                          : '#3d2516'
                    }}
                  />
                  <span className="font-medium text-white capitalize">
                    {selectedItem.material || 'Natural'}
                  </span>
                </div>
              </div>
              {selectedItem.kind === 'table' && (
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Capacity:</span>
                  <span className="font-semibold text-[#16A34A]">{selectedItem.seats || 4} Guests</span>
                </div>
              )}
            </div>

            {/* Bottom Actions: Duplicate, Lock, Delete (Clean Linear Style, No oversized buttons) */}
            <div className="mt-3.5 pt-2.5 border-t border-white/[0.08] flex items-center gap-1.5">
              {onUpdateItem && (
                <button
                  type="button"
                  onClick={() => onUpdateItem({ isLocked: !selectedItem.isLocked })}
                  className={`flex-1 py-1.5 px-2 rounded-[8px] text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                    selectedItem.isLocked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]'
                  }`}
                >
                  {selectedItem.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{selectedItem.isLocked ? 'Locked' : 'Lock'}</span>
                </button>
              )}

              {onDuplicateItem && (
                <button
                  type="button"
                  onClick={() => onDuplicateItem(selectedItem)}
                  className="flex-1 py-1.5 px-2 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-[8px] text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/[0.08]"
                >
                  <Copy className="w-3 h-3" />
                  <span>Duplicate</span>
                </button>
              )}

              {onDeleteItem && (
                <button
                  type="button"
                  disabled={selectedItem.isLocked}
                  onClick={() => {
                    onDeleteItem(selectedItem.id);
                    setSelectedId(null);
                  }}
                  className="py-1.5 px-2.5 bg-white/[0.04] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-[8px] text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Delete Object"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
