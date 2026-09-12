'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Undo2, Redo2, Grid, Ruler, ShieldAlert, Lock, Unlock, 
  Copy, Layers, ArrowUp, ArrowDown, Eye, Move, Check 
} from 'lucide-react';
import { QRDesignConfig, QRCanvasElement } from './types';
import { QRCardRenderer } from './QRCardRenderer';

interface AdvancedQREditorProps {
  config: QRDesignConfig;
  onChange: (newConfig: QRDesignConfig) => void;
  tableName?: string;
  directUrl?: string;
}

export const AdvancedQREditor: React.FC<AdvancedQREditorProps> = ({
  config,
  onChange,
  tableName = '12',
  directUrl
}) => {
  // History Stack for Undo/Redo
  const [history, setHistory] = useState<QRDesignConfig[]>([config]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selected element ID
  const [selectedElementId, setSelectedElementId] = useState<string | null>('el-qr');

  // Canvas Viewport options
  const [showGrid, setShowGrid] = useState(config.advanced.showGrid ?? true);
  const [showRuler, setShowRuler] = useState(config.advanced.showRuler ?? true);
  const [showSafeZone, setShowSafeZone] = useState(config.advanced.showSafeZone ?? true);
  const [snapToGuides, setSnapToGuides] = useState(config.advanced.snapToGuides ?? true);

  // Push new state to history
  const pushHistory = useCallback((newConfig: QRDesignConfig) => {
    setHistory(prev => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, newConfig];
    });
    setHistoryIndex(prev => prev + 1);
    onChange(newConfig);
  }, [historyIndex, onChange]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      onChange(history[nextIndex]);
    }
  }, [historyIndex, history, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onChange(history[nextIndex]);
    }
  }, [historyIndex, history, onChange]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const elements = config.advanced.customElements || [];
  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Toggle Lock for selected element
  const handleToggleLock = () => {
    if (!selectedElementId) return;
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, locked: !el.locked };
      }
      return el;
    });
    pushHistory({
      ...config,
      advanced: {
        ...config.advanced,
        customElements: nextElements
      }
    });
  };

  // Bring Forward / Send Backward
  const handleLayerOrder = (direction: 'forward' | 'backward') => {
    if (!selectedElementId) return;
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sorted.findIndex(el => el.id === selectedElementId);
    if (currentIndex === -1) return;

    if (direction === 'forward' && currentIndex < sorted.length - 1) {
      const target = sorted[currentIndex + 1];
      const tempZ = sorted[currentIndex].zIndex;
      sorted[currentIndex].zIndex = target.zIndex;
      target.zIndex = tempZ;
    } else if (direction === 'backward' && currentIndex > 0) {
      const target = sorted[currentIndex - 1];
      const tempZ = sorted[currentIndex].zIndex;
      sorted[currentIndex].zIndex = target.zIndex;
      target.zIndex = tempZ;
    }

    pushHistory({
      ...config,
      advanced: {
        ...config.advanced,
        customElements: sorted
      }
    });
  };

  // Duplicate Element
  const handleDuplicate = () => {
    if (!selectedElement) return;
    const newEl: QRCanvasElement = {
      ...selectedElement,
      id: `el-${Date.now().toString(36)}`,
      x: Math.min(80, selectedElement.x + 5),
      y: Math.min(80, selectedElement.y + 5),
      zIndex: elements.length + 1,
      locked: false
    };
    pushHistory({
      ...config,
      advanced: {
        ...config.advanced,
        customElements: [...elements, newEl]
      }
    });
    setSelectedElementId(newEl.id);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-slate-100">
      {/* 1. TOP CANVA TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 gap-2 shrink-0">
        {/* Left: History & Alignment controls */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* View Toggles */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              showGrid ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Alignment Grid"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRuler(!showRuler)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              showRuler ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Rulers"
          >
            <Ruler className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">Ruler</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSafeZone(!showSafeZone)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              showSafeZone ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Safe Scan Quiet Zone Indicator"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">Safe Zone</span>
          </button>
        </div>

        {/* Right: Layer & Object actions */}
        <div className="flex items-center space-x-1.5">
          {selectedElement && (
            <>
              <button
                type="button"
                onClick={handleToggleLock}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={selectedElement.locked ? 'Unlock Element' : 'Lock Element'}
              >
                {selectedElement.locked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleLayerOrder('forward')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Bring Forward"
              >
                <ArrowUp className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleLayerOrder('backward')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Send Backward"
              >
                <ArrowDown className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleDuplicate}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Duplicate Element (Ctrl+D)"
              >
                <Copy className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. MAIN EDITOR WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Layer Manager Panel */}
        <div className="w-48 bg-slate-950/80 border-r border-slate-800 p-3 flex flex-col shrink-0 hidden md:flex">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Layers
            </span>
            <span className="text-[10px] text-slate-500">{elements.length} items</span>
          </div>

          <div className="space-y-1 overflow-y-auto flex-1">
            {elements
              .slice()
              .sort((a, b) => b.zIndex - a.zIndex)
              .map((el) => {
                const isSel = el.id === selectedElementId;
                return (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setSelectedElementId(el.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                      isSel ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span className="truncate capitalize font-medium text-[11px]">
                      {el.type.replace(/_/g, ' ')}
                    </span>
                    {el.locked && <Lock className="w-3 h-3 text-amber-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Center: Canvas Workspace with optional Rulers & Grid */}
        <div className="flex-1 bg-slate-900 flex items-center justify-center p-8 overflow-auto relative select-none">
          {/* Top Ruler */}
          {showRuler && (
            <div className="absolute top-0 left-0 right-0 h-4 bg-slate-950 border-b border-slate-800 flex items-end text-[8px] font-mono text-slate-600 px-4 select-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="flex-1 border-l border-slate-800 pl-1 pb-0.5">
                  {i * 20}
                </div>
              ))}
            </div>
          )}

          {/* Left Ruler */}
          {showRuler && (
            <div className="absolute top-4 left-0 bottom-0 w-4 bg-slate-950 border-r border-slate-800 flex flex-col text-[8px] font-mono text-slate-600 pt-2 select-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="flex-1 border-t border-slate-800 pt-0.5 pl-0.5">
                  {i * 20}
                </div>
              ))}
            </div>
          )}

          {/* Alignment Grid Overlay */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none opacity-15"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #64748b 1px, transparent 1px), linear-gradient(to bottom, #64748b 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Branded Card Container with Live Selection Outline */}
          <div className="relative shadow-2xl">
            <QRCardRenderer
              config={config}
              tableName={tableName}
              directUrl={directUrl}
              previewScale={1.1}
              showSafeZone={showSafeZone}
              interactive={true}
              className="shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
