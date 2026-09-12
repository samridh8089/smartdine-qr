'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, Save, Download, Printer, RefreshCw, Smartphone, 
  Layers, Check, Palette, Type, QrCode, Image as ImageIcon, 
  Frame, Square, Maximize2, Sliders, ExternalLink, ShieldCheck, ChevronRight,
  UtensilsCrossed, Smile, SunMedium, Flame, Trash2, Plus, Search
} from 'lucide-react';
import { 
  QRDesignConfig, QRTemplateId, QRCardShape, QRFrameStyle, 
  QRPrintSize, QRPreviewMode, QRTexturePattern, QRFoodCategory, QRStickerItem
} from './types';
import { 
  QR_TEMPLATES, FONT_OPTIONS, SHAPE_OPTIONS, 
  FRAME_OPTIONS, PRINT_SIZE_OPTIONS, applyTemplateToConfig, DEFAULT_QR_CONFIG 
} from './templates';
import { FOOD_BACKGROUND_GALLERY, FOOD_CATEGORIES } from './foodGallery';
import { STICKER_LIBRARY, STICKER_CATEGORIES } from './stickers';
import { QRCardRenderer } from './QRCardRenderer';
import { AdvancedQREditor } from './AdvancedQREditor';
import { saveQRDesignConfig, useQRDesign } from './storage';
import { downloadBrandedTableQR, printSingleBrandedTable, printAllTablesA4Sheet } from './cardCanvasExport';

interface QRDesignStudioProps {
  restaurant: any;
  onSaved?: () => void;
}

type ControlTab = 
  | 'templates' 
  | 'food_gallery'
  | 'stickers'
  | 'lighting'
  | 'background' 
  | 'text' 
  | 'qr' 
  | 'logo' 
  | 'frame' 
  | 'shape' 
  | 'print_sizes' 
  | 'canva';

export const QRDesignStudio: React.FC<QRDesignStudioProps> = ({ restaurant, onSaved }) => {
  // 1. Hooks strictly declared at top (Guardrail compliance)
  const { designConfig: initialConfig, isLoading } = useQRDesign(restaurant);
  const [config, setConfig] = useState<QRDesignConfig>(initialConfig);
  const [activeControlTab, setActiveControlTab] = useState<ControlTab>('templates');
  const [previewMode, setPreviewMode] = useState<QRPreviewMode>('card');
  const [previewTableNum, setPreviewTableNum] = useState<string>('12');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'genz' | 'classic'>('all');
  const [foodCategory, setFoodCategory] = useState<QRFoodCategory | 'all'>('all');
  const [stickerCategory, setStickerCategory] = useState<string>('all');
  const [stickerSearch, setStickerSearch] = useState<string>('');

  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'genz') {
      return QR_TEMPLATES.filter((t) => t.category === 'Gen-Z & Trendy' || t.category === 'Food Poster');
    }
    if (templateFilter === 'classic') {
      return QR_TEMPLATES.filter((t) => t.category !== 'Gen-Z & Trendy' && t.category !== 'Food Poster');
    }
    return QR_TEMPLATES;
  }, [templateFilter]);

  const filteredFoodPhotos = useMemo(() => {
    if (foodCategory === 'all') return FOOD_BACKGROUND_GALLERY;
    return FOOD_BACKGROUND_GALLERY.filter((item) => item.category === foodCategory);
  }, [foodCategory]);

  const filteredStickers = useMemo(() => {
    let list = STICKER_LIBRARY;
    if (stickerCategory !== 'all') {
      list = list.filter((s) => s.category === stickerCategory);
    }
    if (stickerSearch.trim()) {
      const q = stickerSearch.toLowerCase().trim();
      list = list.filter((s) => s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
    }
    return list;
  }, [stickerCategory, stickerSearch]);

  // Sync state if initial config loads
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const restaurantSlug = restaurant?.slug || 'thefoodyhub';
  const restaurantName = restaurant?.name || 'The Foody Hub';
  const demoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/menu/${restaurantSlug}/table/${previewTableNum}`
    : `https://www.cleverops.in/menu/${restaurantSlug}/table/${previewTableNum}`;

  // Handle Template Selection
  const handleSelectTemplate = (templateId: QRTemplateId) => {
    const updated = applyTemplateToConfig(config, templateId);
    setConfig(updated);
  };

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveQRDesignConfig(restaurant, config);
    setIsSaving(false);
    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onSaved) onSaved();
    } else {
      alert(result.error || 'Failed to save QR design settings.');
    }
  };

  // Handle Quick Download Preview
  const handleDownloadPreview = async () => {
    await downloadBrandedTableQR(
      config,
      { id: 'preview', name: `Table ${previewTableNum}`, url: demoUrl },
      restaurantSlug
    );
  };

  // Handle Quick Print Preview
  const handlePrintPreview = async () => {
    await printSingleBrandedTable(
      config,
      { id: 'preview', name: `Table ${previewTableNum}`, url: demoUrl }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
              Auto-Applied to All Tables
            </span>
            <span className="text-xs text-slate-400">One global design for restaurant</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            QR Design Studio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customize branded QR stickers, table tents, and cards. Every table inside Tables & QRs updates automatically.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPreview}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download preview PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPreview}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Print test card"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Test</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold text-white flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              saveSuccess
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saveSuccess ? 'Saved & Applied!' : 'Save QR Design'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: CONTROLS & EDITING ================= */}
        <div className="lg:col-span-6 space-y-4">
          {/* Controls Navigation Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'templates', label: 'Templates (20)', icon: Sparkles },
              { id: 'food_gallery', label: 'Food Photos', icon: UtensilsCrossed },
              { id: 'stickers', label: 'Stickers & Badges', icon: Smile },
              { id: 'lighting', label: 'Lighting & FX', icon: SunMedium },
              { id: 'background', label: 'Background', icon: Palette },
              { id: 'text', label: 'Typography', icon: Type },
              { id: 'qr', label: 'QR Style', icon: QrCode },
              { id: 'logo', label: 'Logo', icon: ImageIcon },
              { id: 'frame', label: 'Frame', icon: Frame },
              { id: 'shape', label: 'Shape', icon: Square },
              { id: 'print_sizes', label: 'Print Sizes', icon: Maximize2 },
              { id: 'canva', label: 'Canva Editor', icon: Sliders }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeControlTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveControlTab(tab.id as ControlTab)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Controls Panel Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
            {/* 1. TEMPLATES TAB */}
            {activeControlTab === 'templates' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      20 Ready-Made Restaurant Templates
                    </h3>
                    <p className="text-xs text-slate-500">
                      Layered food posters, Gen-Z aesthetic cards, and classic minimal designs.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setTemplateFilter('all')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                        templateFilter === 'all'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      All (20)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateFilter('genz')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                        templateFilter === 'genz'
                          ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      🔥 Gen-Z & Food (10)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateFilter('classic')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                        templateFilter === 'classic'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Classic (10)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = config.templateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tpl.id)}
                        className={`group relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 overflow-hidden ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-sm bg-emerald-50/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 hover:shadow-2xs'
                        }`}
                        style={{ background: tpl.thumbnailBg }}
                      >
                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-xs z-15">
                            <Check className="w-3 h-3 stroke-3" />
                          </div>
                        )}

                        <div className="relative z-10">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-xs">
                            {tpl.category}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-2 drop-shadow-md">
                            {tpl.name}
                          </h4>
                        </div>

                        <p className="relative z-10 text-[10px] text-white/90 line-clamp-2 leading-tight drop-shadow-sm">
                          {tpl.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NEW TAB: FOOD GALLERY */}
            {activeControlTab === 'food_gallery' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                      Food Photography Library
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Scan-Safe Layering
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Click any food photo to apply it as your card background with automatic contrast overlay and quiet zone protection.
                  </p>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setFoodCategory('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      foodCategory === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  {FOOD_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFoodCategory(cat.id as QRFoodCategory)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        foodCategory === cat.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {filteredFoodPhotos.map((item) => {
                    const isCurrent =
                      config.background.type === 'food_photo' &&
                      config.background.imageUrl === item.imageUrl;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setConfig({
                            ...config,
                            background: {
                              ...config.background,
                              type: 'food_photo',
                              imageUrl: item.imageUrl,
                              filters: {
                                ...config.background.filters,
                                blur: 2,
                                brightness: 100,
                                contrast: 105,
                                saturation: 110,
                                zoom: 105,
                                overlayColor: item.overlayColor,
                                overlayOpacity: item.overlayOpacity
                              }
                            },
                            lighting: {
                              ...config.lighting,
                              vignette: true,
                              vignetteStrength: 50,
                              spotlight: true
                            }
                          });
                        }}
                        className={`group relative rounded-xl border overflow-hidden text-left cursor-pointer transition-all h-32 flex flex-col justify-end p-2.5 ${
                          isCurrent
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {isCurrent && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow z-10">
                            <Check className="w-3 h-3 stroke-3" />
                          </div>
                        )}

                        <div className="relative z-10">
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/50 text-white/90 backdrop-blur-xs">
                            {item.category.replace('_', ' ')}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-1 drop-shadow-sm truncate">
                            {item.name}
                          </h4>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NEW TAB: STICKERS & BADGES */}
            {activeControlTab === 'stickers' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-emerald-600" />
                    Stickers, Doodles & Review Badges
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tap any badge or sticker to place it onto your card. Customize scale, rotation, and corner position below.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search stickers (e.g. fire, zomato, chef, burger)..."
                    value={stickerSearch}
                    onChange={(e) => setStickerSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setStickerCategory('all')}
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      stickerCategory === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  {STICKER_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setStickerCategory(c.id)}
                      className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        stickerCategory === c.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Sticker Library Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[220px] overflow-y-auto pr-1 p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  {filteredStickers.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        const isBadge = st.category === 'badges';
                        const newStk: QRStickerItem = {
                          id: `stk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                          type: isBadge ? 'badge' : 'emoji',
                          content: st.symbol,
                          position: (config.stickers && config.stickers.length % 2 === 0) ? 'top-right' : 'bottom-right',
                          scale: 1,
                          rotation: isBadge ? 0 : (Math.random() > 0.5 ? 12 : -12),
                          bgColor: isBadge ? '#EF4444' : undefined,
                          textColor: isBadge ? '#FFFFFF' : undefined
                        };
                        setConfig({
                          ...config,
                          stickers: [...(config.stickers || []), newStk]
                        });
                      }}
                      className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:scale-105 transition-all flex flex-col items-center justify-center cursor-pointer shadow-2xs group"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">
                        {st.symbol}
                      </span>
                      <span className="text-[9px] text-slate-500 truncate w-full text-center mt-1">
                        {st.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* ACTIVE STICKERS MANAGEMENT */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Active Stickers on Card ({config.stickers?.length || 0})
                    </h4>
                    {config.stickers && config.stickers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, stickers: [] })}
                        className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {(!config.stickers || config.stickers.length === 0) ? (
                    <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                      No stickers on card yet. Tap any badge or icon above to add!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {config.stickers.map((stk, idx) => (
                        <div
                          key={stk.id}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{stk.content}</span>
                            <select
                              value={stk.position}
                              onChange={(e) => {
                                const updated = [...config.stickers];
                                updated[idx] = { ...stk, position: e.target.value as any };
                                setConfig({ ...config, stickers: updated });
                              }}
                              className="px-1.5 py-1 bg-white dark:bg-slate-700 border rounded text-[11px] font-medium"
                            >
                              <option value="top-left">Top-Left</option>
                              <option value="top-right">Top-Right</option>
                              <option value="bottom-left">Bottom-Left</option>
                              <option value="bottom-right">Bottom-Right</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Scale Slider */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Size</span>
                              <input
                                type="range"
                                min="0.6"
                                max="1.8"
                                step="0.1"
                                value={stk.scale || 1}
                                onChange={(e) => {
                                  const updated = [...config.stickers];
                                  updated[idx] = { ...stk, scale: Number(e.target.value) };
                                  setConfig({ ...config, stickers: updated });
                                }}
                                className="w-14 accent-emerald-600"
                              />
                            </div>

                            {/* Rotation Slider */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Rot</span>
                              <input
                                type="range"
                                min="-45"
                                max="45"
                                step="5"
                                value={stk.rotation || 0}
                                onChange={(e) => {
                                  const updated = [...config.stickers];
                                  updated[idx] = { ...stk, rotation: Number(e.target.value) };
                                  setConfig({ ...config, stickers: updated });
                                }}
                                className="w-14 accent-emerald-600"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = config.stickers.filter((_, i) => i !== idx);
                                setConfig({ ...config, stickers: updated });
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NEW TAB: LIGHTING & AMBIANCE */}
            {activeControlTab === 'lighting' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <SunMedium className="w-4 h-4 text-emerald-600" />
                    Lighting, Vignettes & Gen-Z Ambiance
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Control studio lighting layers, moody edge vignettes, and live animated steam & sparkles.
                  </p>
                </div>

                {/* 1. Live Animated Preview Toggle */}
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Gen-Z Live Animated Preview
                    </span>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Renders drifting sparkles, rising steam puffs, and QR glow pulses in the live preview stage.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.advanced?.animatedPreview}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        advanced: { ...config.advanced, animatedPreview: e.target.checked }
                      })
                    }
                    className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* 2. Vignette Toggle & Slider */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Moody Edge Vignette
                      </span>
                      <p className="text-[10px] text-slate-500">
                        Darkens the outer card edges to make the center QR pop.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.lighting?.vignette}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          lighting: { ...config.lighting, vignette: e.target.checked }
                        })
                      }
                      className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {config.lighting?.vignette && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Vignette Intensity</span>
                        <span className="font-mono text-slate-500">{config.lighting?.vignetteStrength || 45}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={config.lighting?.vignetteStrength || 45}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lighting: { ...config.lighting, vignetteStrength: Number(e.target.value) }
                          })
                        }
                        className="w-full accent-emerald-600"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Top Hero Spotlight */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Top Hero Spotlight
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Projects a soft overhead studio light onto the restaurant title & food photo.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.lighting?.spotlight}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lighting: { ...config.lighting, spotlight: e.target.checked }
                      })
                    }
                    className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* 4. Ambient Card Glow */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Ambient Card Glow
                      </span>
                      <p className="text-[10px] text-slate-500">
                        Casts a colored neon aura around the entire printed card.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.lighting?.glow}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          lighting: { ...config.lighting, glow: e.target.checked }
                        })
                      }
                      className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {config.lighting?.glow && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <span className="text-xs text-slate-600">Glow Aura Color:</span>
                      <input
                        type="color"
                        value={config.lighting?.glowColor || '#10B981'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lighting: { ...config.lighting, glowColor: e.target.value }
                          })
                        }
                        className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 p-0"
                      />
                    </div>
                  )}
                </div>

                {/* 5. Analog Film Grain */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Analog Film Grain Noise
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Adds vintage film texture for specialty cafes and indie roasteries.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.lighting?.grain}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lighting: { ...config.lighting, grain: e.target.checked }
                      })
                    }
                    className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 2. TEXT & TYPOGRAPHY TAB */}
            {activeControlTab === 'text' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Text & Typography
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize restaurant name, table format, instructions, and font styles.
                  </p>
                </div>

                {/* Restaurant Name Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    value={config.text.restaurantName}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        text: { ...config.text, restaurantName: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                    placeholder="e.g. The Foody Hub"
                  />
                </div>

                {/* Table Name Format Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Table Name Format
                    </label>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">
                      use {'{{table_name}}'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={config.text.tableNameFormat}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        text: { ...config.text, tableNameFormat: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 font-mono"
                    placeholder="Table {{table_name}}"
                  />
                </div>

                {/* Scan Instruction Text */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Scan Call To Action
                  </label>
                  <input
                    type="text"
                    value={config.text.scanText}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        text: { ...config.text, scanText: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                    placeholder="Scan to View Menu & Order"
                  />
                </div>

                {/* Footer Text */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Footer Text
                  </label>
                  <input
                    type="text"
                    value={config.text.footerText}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        text: { ...config.text, footerText: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                    placeholder="Powered by CleverOps"
                  />
                </div>

                {/* Font Family Selector */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Font Family
                  </label>
                  <select
                    value={config.text.restaurantTypography.fontFamily}
                    onChange={(e) => {
                      const f = e.target.value;
                      setConfig({
                        ...config,
                        text: {
                          ...config.text,
                          restaurantTypography: { ...config.text.restaurantTypography, fontFamily: f },
                          tableTypography: { ...config.text.tableTypography, fontFamily: f },
                          scanTypography: { ...config.text.scanTypography, fontFamily: f }
                        }
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Text Color Pickers */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Header Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.text.restaurantTypography.textColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            text: {
                              ...config.text,
                              restaurantTypography: {
                                ...config.text.restaurantTypography,
                                textColor: e.target.value
                              }
                            }
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                      />
                      <input
                        type="text"
                        value={config.text.restaurantTypography.textColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            text: {
                              ...config.text,
                              restaurantTypography: {
                                ...config.text.restaurantTypography,
                                textColor: e.target.value
                              }
                            }
                          })
                        }
                        className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border rounded"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Table Highlight Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.text.tableTypography.textColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            text: {
                              ...config.text,
                              tableTypography: {
                                ...config.text.tableTypography,
                                textColor: e.target.value
                              }
                            }
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                      />
                      <input
                        type="text"
                        value={config.text.tableTypography.textColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            text: {
                              ...config.text,
                              tableTypography: {
                                ...config.text.tableTypography,
                                textColor: e.target.value
                              }
                            }
                          })
                        }
                        className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. QR STYLE CUSTOMIZATION TAB */}
            {activeControlTab === 'qr' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    QR Code Appearance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize QR size, colors, corner radius, and quiet zone while maintaining 100% scannability.
                  </p>
                </div>

                {/* QR Size Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">QR Code Size</span>
                    <span className="font-mono text-slate-500">{config.qr.size} px</span>
                  </div>
                  <input
                    type="range"
                    min="140"
                    max="280"
                    step="5"
                    value={config.qr.size}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        qr: { ...config.qr, size: Number(e.target.value) }
                      })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                {/* QR Quiet Zone Padding */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Quiet Margin Padding</span>
                    <span className="font-mono text-slate-500">{config.qr.padding} px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="28"
                    step="2"
                    value={config.qr.padding}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        qr: { ...config.qr, padding: Number(e.target.value) }
                      })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                {/* QR Corner Radius */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Border Radius</span>
                    <span className="font-mono text-slate-500">{config.qr.borderRadius} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="2"
                    value={config.qr.borderRadius}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        qr: { ...config.qr, borderRadius: Number(e.target.value) }
                      })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                {/* QR Colors */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      QR Foreground
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.qr.fgColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            qr: { ...config.qr, fgColor: e.target.value }
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                      />
                      <input
                        type="text"
                        value={config.qr.fgColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            qr: { ...config.qr, fgColor: e.target.value }
                          })
                        }
                        className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border rounded"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      QR Background
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.qr.bgColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            qr: { ...config.qr, bgColor: e.target.value }
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                      />
                      <input
                        type="text"
                        value={config.qr.bgColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            qr: { ...config.qr, bgColor: e.target.value }
                          })
                        }
                        className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* QR Center Logo Option */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Center Logo in QR
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Renders mini restaurant logo badge inside the QR center.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.qr.centerLogo}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        qr: { ...config.qr, centerLogo: e.target.checked }
                      })
                    }
                    className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 4. LOGO CUSTOMIZATION TAB */}
            {activeControlTab === 'logo' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Restaurant Logo Customization
                  </h3>
                  <p className="text-xs text-slate-500">
                    Control logo visibility, image upload, shape, border, and position.
                  </p>
                </div>

                {/* Enable Logo Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Display Logo on Card
                  </span>
                  <input
                    type="checkbox"
                    checked={config.logo.enabled}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        logo: { ...config.logo, enabled: e.target.checked }
                      })
                    }
                    className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Logo URL / Upload */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Logo Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.logo.url}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          logo: { ...config.logo, url: e.target.value }
                        })
                      }
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                      placeholder="https://... or paste image URL"
                    />
                    {restaurant?.logo_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            logo: { ...config.logo, url: restaurant.logo_url }
                          })
                        }
                        className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Use Profile Logo
                      </button>
                    )}
                  </div>
                </div>

                {/* Logo Size Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Logo Size</span>
                    <span className="font-mono text-slate-500">{config.logo.size} px</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="80"
                    step="2"
                    value={config.logo.size}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        logo: { ...config.logo, size: Number(e.target.value) }
                      })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                {/* Logo Shape */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Logo Frame Shape
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'circle', label: 'Circle' },
                      { id: 'rounded', label: 'Rounded' },
                      { id: 'square', label: 'Square' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            logo: { ...config.logo, shape: s.id as any }
                          })
                        }
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                          config.logo.shape === s.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. BACKGROUND CONTROLS TAB */}
            {activeControlTab === 'background' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Background Styling & Textures
                  </h3>
                  <p className="text-xs text-slate-500">
                    Switch between solid colors, gradients, or built-in artisan textures.
                  </p>
                </div>

                {/* Background Mode Selector */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'food_photo', label: 'Food Photo' },
                    { id: 'gradient', label: 'Gradient' },
                    { id: 'texture', label: 'Texture' },
                    { id: 'solid', label: 'Solid Color' }
                  ].map((bgType) => (
                    <button
                      key={bgType.id}
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          background: { ...config.background, type: bgType.id as any }
                        })
                      }
                      className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                        config.background.type === bgType.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {bgType.label}
                    </button>
                  ))}
                </div>

                {/* If Food Photo / Image: Photo Controls & Filters */}
                {(config.background.type === 'food_photo' || config.background.type === 'image') && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Food Photo Selection
                        </span>
                        <p className="text-[10px] text-slate-500">
                          Pick from 40+ high-res dishes or paste a custom URL.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveControlTab('food_gallery')}
                        className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                      >
                        <UtensilsCrossed className="w-3 h-3" />
                        Browse Gallery
                      </button>
                    </div>

                    {/* Custom Image URL Input */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Image URL
                      </label>
                      <input
                        type="text"
                        value={config.background.imageUrl || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            background: { ...config.background, imageUrl: e.target.value }
                          })
                        }
                        placeholder="https://... or select from Food Gallery"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    {/* Photo Filter Sliders */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Visual Depth & Contrast Filters
                      </h4>

                      {/* Blur Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400">Background Blur (Bokeh)</span>
                          <span className="font-mono text-slate-500">{config.background.filters?.blur || 0}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={config.background.filters?.blur || 0}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: {
                                ...config.background,
                                filters: {
                                  ...config.background.filters,
                                  blur: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full accent-emerald-600"
                        />
                      </div>

                      {/* Brightness Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400">Brightness</span>
                          <span className="font-mono text-slate-500">{config.background.filters?.brightness || 100}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          value={config.background.filters?.brightness || 100}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: {
                                ...config.background,
                                filters: {
                                  ...config.background.filters,
                                  brightness: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full accent-emerald-600"
                        />
                      </div>

                      {/* Contrast Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400">Contrast</span>
                          <span className="font-mono text-slate-500">{config.background.filters?.contrast || 100}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          value={config.background.filters?.contrast || 100}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: {
                                ...config.background,
                                filters: {
                                  ...config.background.filters,
                                  contrast: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full accent-emerald-600"
                        />
                      </div>

                      {/* Saturation Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400">Vibrancy (Saturation)</span>
                          <span className="font-mono text-slate-500">{config.background.filters?.saturation || 100}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={config.background.filters?.saturation || 100}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: {
                                ...config.background,
                                filters: {
                                  ...config.background.filters,
                                  saturation: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full accent-emerald-600"
                        />
                      </div>

                      {/* Zoom Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400">Crop / Zoom Scale</span>
                          <span className="font-mono text-slate-500">{config.background.filters?.zoom || 100}%</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="150"
                          value={config.background.filters?.zoom || 100}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: {
                                ...config.background,
                                filters: {
                                  ...config.background.filters,
                                  zoom: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full accent-emerald-600"
                        />
                      </div>

                      {/* Darkening Overlay Tint */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Darkening Tint Color & Opacity
                          </span>
                          <input
                            type="color"
                            value={config.background.filters?.overlayColor || '#000000'}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                background: {
                                  ...config.background,
                                  filters: {
                                    ...config.background.filters,
                                    overlayColor: e.target.value
                                  }
                                }
                              })
                            }
                            className="w-6 h-6 rounded cursor-pointer border border-slate-300 p-0"
                          />
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Tint Opacity</span>
                          <span className="font-mono text-slate-500">{config.background.filters?.overlayOpacity ?? 35}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={config.background.filters?.overlayOpacity ?? 35}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: {
                                ...config.background,
                                filters: {
                                  ...config.background.filters,
                                  overlayOpacity: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full accent-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* If Texture: Texture Pickers */}
                {config.background.type === 'texture' && (
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Select Texture Pattern
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'marble', label: 'Luxury Marble' },
                        { id: 'wood', label: 'Warm Wood' },
                        { id: 'dark_texture', label: 'Carbon Texture' },
                        { id: 'emerald_pattern', label: 'Emerald Motif' },
                        { id: 'paper', label: 'Craft Paper' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setConfig({
                              ...config,
                              background: { ...config.background, texture: t.id as QRTexturePattern }
                            })
                          }
                          className={`py-2 px-3 text-xs font-bold rounded-xl border text-left cursor-pointer transition-colors ${
                            config.background.texture === t.id
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* If Gradient: Color Picks */}
                {config.background.type === 'gradient' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Gradient Start
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.background.gradientStart}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: { ...config.background, gradientStart: e.target.value }
                            })
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                        />
                        <input
                          type="text"
                          value={config.background.gradientStart}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: { ...config.background, gradientStart: e.target.value }
                            })
                          }
                          className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border rounded"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Gradient End
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.background.gradientEnd}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: { ...config.background, gradientEnd: e.target.value }
                            })
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                        />
                        <input
                          type="text"
                          value={config.background.gradientEnd}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              background: { ...config.background, gradientEnd: e.target.value }
                            })
                          }
                          className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border rounded"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* If Solid: Single Color Pick */}
                {config.background.type === 'solid' && (
                  <div className="pt-2 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Solid Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.background.color || '#111827'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            background: { ...config.background, color: e.target.value }
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                      />
                      <input
                        type="text"
                        value={config.background.color || '#111827'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            background: { ...config.background, color: e.target.value }
                          })
                        }
                        className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 border rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. FRAME STYLES TAB */}
            {activeControlTab === 'frame' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Frame Styles & Borders
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose from double luxury borders, neon halos, or sharp minimalist frames.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {FRAME_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          frame: { ...config.frame, style: f.id as QRFrameStyle }
                        })
                      }
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        config.frame.style === f.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-bold">{f.label}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{f.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Frame Color Picker */}
                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Frame Border Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.frame.color}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          frame: { ...config.frame, color: e.target.value }
                        })
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                    />
                    <input
                      type="text"
                      value={config.frame.color}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          frame: { ...config.frame, color: e.target.value }
                        })
                      }
                      className="w-28 px-2 py-1 text-xs font-mono bg-slate-50 border rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. STICKER SHAPE TAB */}
            {activeControlTab === 'shape' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Card & Sticker Shape
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose the form factor matching your physical table stands or acrylic stickers.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {SHAPE_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          shape: s.id as QRCardShape
                        })
                      }
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        config.shape === s.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-bold">{s.label}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 8. PRINT SIZES TAB */}
            {activeControlTab === 'print_sizes' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Print Dimensions & Exports
                  </h3>
                  <p className="text-xs text-slate-500">
                    Outputs are generated at 300 DPI high-resolution for professional printing.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {PRINT_SIZE_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          selectedPrintSize: p.id as QRPrintSize
                        })
                      }
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                        config.selectedPrintSize === p.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold">{p.label}</span>
                        <span className="block text-[10px] text-slate-500">{p.desc}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {p.widthMm} × {p.heightMm} mm
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 9. CANVA-LIKE ADVANCED EDITOR TAB */}
            {activeControlTab === 'canva' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    Advanced Canva-Style Editor
                  </h3>
                  <p className="text-xs text-slate-500">
                    Use full drag-and-drop workspace, rulers, alignment guides, undo/redo, and safe scan zone indicator.
                  </p>
                </div>

                <div className="h-[460px]">
                  <AdvancedQREditor
                    config={config}
                    onChange={setConfig}
                    tableName={previewTableNum}
                    directUrl={demoUrl}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: LIVE REALTIME PREVIEW ================= */}
        <div className="lg:col-span-6 space-y-4 sticky top-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            {/* Preview Header with Mockup Selector Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live Preview
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Instant Realtime
                </span>
                {config.advanced?.animatedPreview && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 animate-pulse">
                    ✨ Gen-Z Live Mode
                  </span>
                )}
              </div>

              {/* Mockup Tabs */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[11px] font-semibold">
                {[
                  { id: 'card', label: 'Card' },
                  { id: 'table_tent', label: 'Table Tent' },
                  { id: 'sticker', label: 'Sticker' },
                  { id: 'mobile', label: 'Mobile' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPreviewMode(m.id as QRPreviewMode)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      previewMode === m.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Canvas Stage */}
            <div className="min-h-[460px] bg-slate-100 dark:bg-slate-950/60 rounded-xl flex items-center justify-center p-6 overflow-hidden relative border border-slate-200/60 dark:border-slate-800">
              {/* Single Card Mode */}
              {previewMode === 'card' && (
                <div className="transition-transform duration-200" style={{ transform: `scale(${zoomScale})` }}>
                  <QRCardRenderer
                    config={config}
                    tableName={previewTableNum}
                    directUrl={demoUrl}
                    previewScale={1.1}
                    className="shadow-xl"
                  />
                </div>
              )}

              {/* Table Tent Mode: Realistic 3D Angled Acrylic Stand */}
              {previewMode === 'table_tent' && (
                <div className="flex flex-col items-center justify-center py-4">
                  {/* Angled Acrylic Top */}
                  <div
                    className="relative p-2 bg-slate-200/50 dark:bg-slate-800/40 rounded-t-2xl shadow-2xl backdrop-blur-sm border-t border-l border-r border-white/60"
                    style={{
                      transform: 'perspective(600px) rotateX(8deg)',
                      transformOrigin: 'bottom center'
                    }}
                  >
                    <QRCardRenderer
                      config={config}
                      tableName={previewTableNum}
                      directUrl={demoUrl}
                      previewScale={0.95}
                    />
                  </div>
                  {/* Acrylic Triangular Base */}
                  <div className="w-72 h-4 bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800 rounded-b-lg shadow-md border-t border-slate-400" />
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">
                    Self-Standing Acrylic Table Tent Mockup
                  </span>
                </div>
              )}

              {/* Table Sticker Mode: Realistic Walnut / Marble Tabletop Placement */}
              {previewMode === 'sticker' && (
                <div
                  className="w-full max-w-sm p-8 rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden"
                  style={{
                    backgroundColor: '#3E2723',
                    backgroundImage:
                      'radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.5) 100%)'
                  }}
                >
                  <div className="shadow-2xl hover:scale-105 transition-transform">
                    <QRCardRenderer
                      config={config}
                      tableName={previewTableNum}
                      directUrl={demoUrl}
                      previewScale={0.88}
                    />
                  </div>
                </div>
              )}

              {/* Mobile Phone Mockup */}
              {previewMode === 'mobile' && (
                <div className="w-56 h-[420px] bg-slate-900 rounded-[32px] p-2.5 shadow-2xl border-4 border-slate-700 flex flex-col justify-between overflow-hidden">
                  <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto mb-2" />
                  <div className="flex-1 bg-white rounded-2xl p-3 flex flex-col items-center justify-center overflow-hidden">
                    <QRCardRenderer
                      config={config}
                      tableName={previewTableNum}
                      directUrl={demoUrl}
                      previewScale={0.62}
                    />
                  </div>
                  <div className="w-16 h-1 bg-slate-700 rounded-full mx-auto mt-2" />
                </div>
              )}
            </div>

            {/* Preview Controls Bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Test Table:</span>
                <select
                  value={previewTableNum}
                  onChange={(e) => setPreviewTableNum(e.target.value)}
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded font-mono text-xs"
                >
                  <option value="1">Table 1</option>
                  <option value="4">Table 4</option>
                  <option value="12">Table 12</option>
                  <option value="VIP 1">VIP Table 1</option>
                  <option value="Balcony 3">Balcony 3</option>
                </select>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Zoom:</span>
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.max(0.7, zoomScale - 0.1))}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 cursor-pointer text-xs"
                >
                  -
                </button>
                <span className="font-mono text-[11px] w-10 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.min(1.4, zoomScale + 0.1))}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 cursor-pointer text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
