'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { 
  Sparkles, Save, Download, Printer, RefreshCw, 
  Check, QrCode, FileArchive, CheckCircle2,
  ZoomIn, ZoomOut, Upload, ShieldCheck,
  LayoutTemplate, Utensils, Type, MessageSquare, Sliders,
  ChevronRight, ArrowRight, Eye, Layers, Palette, Clock, Wifi,
  UtensilsCrossed, Frame, Coffee, Wine, Flame, ChevronDown, Trash2, EyeOff
} from 'lucide-react';

import { 
  QRDesignConfig, 
  QRStudioLayout, 
  QRStudioCategory, 
  QRStudioSubCategory, 
  QRDietaryBadge, 
  QRAspectRatio 
} from './types';
import { 
  QR_THEMES_CONFIG, 
  CATEGORY_GROUPS, 
  STUDIO_LAYOUTS, 
  ASPECT_RATIO_OPTIONS, 
  FUNNY_SCAN_QUOTES,
  SubCategoryThemeConfig,
  SMART_SUGGESTION_COMBOS,
  SmartSuggestionCombo
} from './qrThemesConfig';
import { QRCardRenderer } from './QRCardRenderer';
import { saveQRDesignConfig, useQRDesign } from './storage';
import { 
  downloadBrandedTableQR, 
  downloadAllTablesQRZip, 
  printSingleBrandedTable, 
  printAllTablesA4Sheet 
} from './cardCanvasExport';
import { db } from '@/lib/db';
import { getCanonicalTableQRUrl } from '@/lib/qr';
import { storageHelper } from '@/lib/supabase';

interface QRDesignStudioProps {
  restaurant: any;
  onSaved?: () => void;
}

interface TableItem {
  id: string;
  name: string;
}

type StudioStep = 'style' | 'food' | 'branding' | 'quote' | 'finetune';

export const QRDesignStudio: React.FC<QRDesignStudioProps> = ({ restaurant, onSaved }) => {
  // =========================================================================
  // 1. REACT HOOKS: Strict Declaration Order (CleverOps Guardrail Compliance)
  // =========================================================================

  // Hook Group 1: useState
  const { designConfig: initialConfig, isLoading } = useQRDesign(restaurant);
  const [config, setConfig] = useState<QRDesignConfig>(initialConfig);
  const [activeStep, setActiveStep] = useState<StudioStep>('style');
  const [simulateStandee, setSimulateStandee] = useState<boolean>(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState<QRStudioCategory>('restaurant');
  const [selectedTableId, setSelectedTableId] = useState<string>('table-1');
  const [tablesList, setTablesList] = useState<TableItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(0.92);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [editingDishSlot, setEditingDishSlot] = useState<number>(0);

  // Hook Group 2: useRef
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tableFileInputRef = useRef<HTMLInputElement | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Hook Group 3: useMemo
  const activeSubCategory = useMemo<QRStudioSubCategory>(() => {
    return config.subCategory || 'rajasthani_thali';
  }, [config.subCategory]);

  const activeTheme = useMemo<SubCategoryThemeConfig>(() => {
    return QR_THEMES_CONFIG[activeSubCategory] || QR_THEMES_CONFIG['rajasthani_thali'];
  }, [activeSubCategory]);

  const activeCategoryGroup = useMemo(() => {
    return CATEGORY_GROUPS.find((g) => g.id === activeCategoryTab) || CATEGORY_GROUPS[0];
  }, [activeCategoryTab]);

  const effectiveTables = useMemo<TableItem[]>(() => {
    if (tablesList.length > 0) return tablesList;
    return [
      { id: 'tbl-1', name: 'Table 1' },
      { id: 'tbl-2', name: 'Table 2' },
      { id: 'tbl-3', name: 'Table 3' },
      { id: 'tbl-4', name: 'Table 4' },
      { id: 'tbl-5', name: 'VIP Lounge 1' },
      { id: 'tbl-takeaway', name: 'Takeaway Counter' }
    ];
  }, [tablesList]);

  const activeTable = useMemo<TableItem>(() => {
    const match = effectiveTables.find((t) => t.id === selectedTableId);
    return match || effectiveTables[0];
  }, [effectiveTables, selectedTableId]);

  const restaurantSlug = useMemo<string>(() => {
    return restaurant?.slug || 'thefoodyhub';
  }, [restaurant?.slug]);

  const canonicalQRUrl = useMemo<string>(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.cleverops.in';
    return getCanonicalTableQRUrl(origin, restaurantSlug, activeTable.id);
  }, [restaurantSlug, activeTable.id]);

  const activeTableAssignedImage = useMemo<string | null>(() => {
    if (!config.perTableCustomization || !config.tableImageOverrides) return null;
    const rawNum = activeTable.name.replace(/^Table\s*/i, '').trim();
    return (
      config.tableImageOverrides[activeTable.id] ||
      config.tableImageOverrides[activeTable.name] ||
      config.tableImageOverrides[rawNum] ||
      config.tableImageOverrides[`Table ${rawNum}`] ||
      null
    );
  }, [config.perTableCustomization, config.tableImageOverrides, activeTable]);

  const dishSlots = useMemo(() => {
    if (config.studioLayout === 'corner_bowls') {
      return [
        { index: 0, label: 'Orbit 1 (Top-Right)' },
        { index: 1, label: 'Orbit 2 (Bottom-Left)' },
        { index: 2, label: 'Orbit 3 (Bottom-Right)' }
      ];
    }
    if (config.studioLayout === 'three_dish_grid') {
      return [
        { index: 0, label: 'Top Food Banner' },
        { index: 1, label: 'Bottom Food Banner' }
      ];
    }
    if (config.studioLayout === 'split_luxury') {
      return [
        { index: 0, label: 'Top Hero Food (50% Bleed)' }
      ];
    }
    return [
      { index: 0, label: 'Center 3D Platter' }
    ];
  }, [config.studioLayout]);

  const activeHeroImage = useMemo<string>(() => {
    if (config.customDishUrl) return config.customDishUrl;
    const idx = config.selectedDishIndex ?? 0;
    if (activeTheme.dishPresets && activeTheme.dishPresets[idx]) {
      return activeTheme.dishPresets[idx].imageUrl;
    }
    return activeTheme.dishPresets?.[0]?.imageUrl || '';
  }, [config.customDishUrl, config.selectedDishIndex, activeTheme]);

  // Hook Group 4: useCallback
  const handleSelectSubCategory = useCallback((subCatKey: QRStudioSubCategory) => {
    const theme = QR_THEMES_CONFIG[subCatKey];
    if (!theme) return;

    setActiveCategoryTab(theme.category);

    setConfig((prev) => {
      const defaultDishUrl = theme.dishPresets[0]?.imageUrl || '/dish-presets/3d/rajasthani_thali_3d.png';
      const nextGrid = [
        theme.dishPresets[0]?.imageUrl || defaultDishUrl,
        theme.dishPresets[1]?.imageUrl || '/dish-presets/3d/dhaba_chai_samosa_3d.png',
        theme.dishPresets[2]?.imageUrl || '/dish-presets/3d/north_indian_paneer_tikka_3d.png'
      ];
      const nextOverrides = { ...(prev.tableImageOverrides || {}) };
      if (activeTable.name && defaultDishUrl) {
        nextOverrides[activeTable.name] = defaultDishUrl;
        const rawNum = activeTable.name.replace(/^Table\s*/i, '').trim();
        nextOverrides[rawNum] = defaultDishUrl;
      }

      return {
        ...prev,
        mainCategory: theme.category,
        subCategory: subCatKey,
        tagline: theme.tagline || prev.tagline,
        selectedDishIndex: 0,
        customDishUrl: '', // Reset custom image to use fresh presets
        selectedCulturalBgIndex: 0,
        customCulturalBgUrl: '',
        gridDishImages: nextGrid,
        tableImageOverrides: nextOverrides,
        bgTextureStyle: theme.bgStyle.type === 'texture' ? theme.bgStyle.texture : 'gradient',
        background: {
          ...prev.background,
          type: theme.bgStyle.type === 'texture' ? 'texture' : 'gradient',
          color: theme.colors.primary,
          gradientStart: theme.bgStyle.gradientStart,
          gradientEnd: theme.bgStyle.gradientEnd,
          gradientAngle: theme.bgStyle.gradientAngle,
          texture: theme.bgStyle.texture,
          filters: {
            ...prev.background.filters,
            overlayColor: theme.bgStyle.overlayColor,
            overlayOpacity: theme.bgStyle.overlayOpacity
          }
        },
        frame: {
          ...prev.frame,
          color: theme.colors.qrFrame
        },
        qr: {
          ...prev.qr,
          fgColor: theme.colors.qrFg,
          bgColor: theme.colors.qrBg,
          frameColor: theme.colors.qrFrame
        },
        text: {
          ...prev.text,
          restaurantTypography: {
            ...prev.text.restaurantTypography,
            fontFamily: theme.typography.headingFont,
            textColor: theme.colors.text
          },
          tableTypography: {
            ...prev.text.tableTypography,
            textColor: theme.colors.secondary
          },
          scanTypography: {
            ...prev.text.scanTypography,
            textColor: theme.colors.text
          }
        }
      };
    });
  }, [activeTable.name]);

  const handleSelectLayout = useCallback((layoutId: QRStudioLayout) => {
    setEditingDishSlot(0);
    setConfig((prev) => ({
      ...prev,
      studioLayout: layoutId
    }));
  }, []);

  const handleApplySmartSuggestion = useCallback((comboId: string) => {
    const match = SMART_SUGGESTION_COMBOS.find((c) => c.id === comboId);
    if (!match) return;

    setConfig((prev) => ({
      ...prev,
      ...match.configUpdates,
      background: match.configUpdates.background
        ? { ...prev.background, ...match.configUpdates.background }
        : prev.background
    }));
  }, []);

  const handleSelectAspectRatio = useCallback((ratioId: QRAspectRatio) => {
    setConfig((prev) => ({
      ...prev,
      aspectRatio: ratioId
    }));
  }, []);

  const handleSelectDishPreset = useCallback((dishIndex: number) => {
    const theme = QR_THEMES_CONFIG[config.subCategory || 'rajasthani_thali'] || QR_THEMES_CONFIG['rajasthani_thali'];
    const chosenUrl = theme.dishPresets?.[dishIndex]?.imageUrl || '';
    const targetSlot = (editingDishSlot >= 0 && editingDishSlot < dishSlots.length) ? editingDishSlot : 0;

    setConfig((prev) => {
      const nextGrid = Array.isArray(prev.gridDishImages) ? [...prev.gridDishImages] : [];
      while (nextGrid.length < 3) {
        nextGrid.push(theme.dishPresets?.[nextGrid.length]?.imageUrl || chosenUrl);
      }
      nextGrid[targetSlot] = chosenUrl;

      const nextOverrides = { ...(prev.tableImageOverrides || {}) };
      if (targetSlot === 0 && activeTable.name && chosenUrl) {
        nextOverrides[activeTable.name] = chosenUrl;
        const rawNum = activeTable.name.replace(/^Table\s*/i, '').trim();
        nextOverrides[rawNum] = chosenUrl;
      }

      return {
        ...prev,
        selectedDishIndex: targetSlot === 0 ? dishIndex : prev.selectedDishIndex,
        customDishUrl: targetSlot === 0 ? '' : prev.customDishUrl,
        gridDishImages: nextGrid,
        tableImageOverrides: nextOverrides
      };
    });
  }, [config.subCategory, editingDishSlot, dishSlots.length, activeTable.name]);

  const handleSelectCulturalBgPreset = useCallback((bgIndex: number) => {
    setConfig((prev) => ({
      ...prev,
      selectedCulturalBgIndex: bgIndex,
      customCulturalBgUrl: ''
    }));
  }, []);

  const handleCustomCulturalBgUpload = useCallback((file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setConfig((prev) => ({
          ...prev,
          customCulturalBgUrl: result,
          selectedCulturalBgIndex: -2
        }));
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleTogglePerTableCustomization = useCallback((enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      perTableCustomization: enabled
    }));
  }, []);

  const handleAutoDistributeAcrossTables = useCallback(() => {
    const presets = activeTheme.dishPresets || [];
    if (presets.length === 0 || effectiveTables.length === 0) return;

    const newImageOverrides: Record<string, string> = {};
    const newIndexOverrides: Record<string, number> = {};

    effectiveTables.forEach((tbl, idx) => {
      const presetIdx = idx % presets.length;
      const assignedPreset = presets[presetIdx];
      newImageOverrides[tbl.id] = assignedPreset.imageUrl;
      newImageOverrides[tbl.name] = assignedPreset.imageUrl;
      newIndexOverrides[tbl.id] = presetIdx;
    });

    setConfig((prev) => ({
      ...prev,
      perTableCustomization: true,
      tableImageOverrides: newImageOverrides,
      tableDishIndexOverrides: newIndexOverrides
    }));
  }, [activeTheme.dishPresets, effectiveTables]);

  const handleAssignPresetToCurrentTable = useCallback((dishIndex: number) => {
    const dish = activeTheme.dishPresets[dishIndex];
    if (!dish) return;

    setConfig((prev) => {
      const currentOverrides = { ...(prev.tableImageOverrides || {}) };
      const currentIndexOverrides = { ...(prev.tableDishIndexOverrides || {}) };

      currentOverrides[activeTable.id] = dish.imageUrl;
      currentOverrides[activeTable.name] = dish.imageUrl;
      currentIndexOverrides[activeTable.id] = dishIndex;

      return {
        ...prev,
        perTableCustomization: true,
        tableImageOverrides: currentOverrides,
        tableDishIndexOverrides: currentIndexOverrides
      };
    });
  }, [activeTheme.dishPresets, activeTable]);

  const handleResetCurrentTableImage = useCallback(() => {
    setConfig((prev) => {
      const currentOverrides = { ...(prev.tableImageOverrides || {}) };
      delete currentOverrides[activeTable.id];
      delete currentOverrides[activeTable.name];

      return {
        ...prev,
        tableImageOverrides: currentOverrides
      };
    });
  }, [activeTable, editingDishSlot]);

  const handleSelectQRPosition = useCallback((mode: 'auto' | 'top' | 'center' | 'bottom') => {
    setConfig((prev) => ({
      ...prev,
      qrPositionMode: mode
    }));
  }, []);

  const handleSelectFunnyQuote = useCallback((quote: string) => {
    setConfig((prev) => ({
      ...prev,
      funnyQuote: prev.funnyQuote === quote ? '' : quote
    }));
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, target: 'dish' | 'background' | 'current_table' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, or WebP).');
      return;
    }

    let processedFile: File = file;
    let fallbackDataUrl = '';

    // Pre-process image on client canvas: downscale & auto-remove white background for dish cutouts
    try {
      const processed = await new Promise<{ file: File; dataUrl: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (re) => {
          const rawData = re.target?.result as string;
          const img = new Image();
          img.onload = () => {
            const maxDim = 900;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve({ file, dataUrl: rawData });
            }

            ctx.drawImage(img, 0, 0, w, h);

            // If target is food dish: check for solid white/light background and auto-cutout to transparent 3D PNG (SS1/SS5)
            if (target === 'dish') {
              const imgData = ctx.getImageData(0, 0, w, h);
              const data = imgData.data;

              // Sample 4 corners
              const corners = [
                0,
                (w - 1) * 4,
                (h - 1) * w * 4,
                ((h - 1) * w + w - 1) * 4
              ];
              let whiteCorners = 0;
              corners.forEach((idx) => {
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                if (r > 190 && g > 190 && b > 190 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
                  whiteCorners++;
                }
              });

              // If image has white or light-grey background in corners: flood fill to alpha = 0
              if (whiteCorners >= 3) {
                const visited = new Uint8Array(w * h);
                const queue = new Int32Array(w * h);
                let qHead = 0;
                let qTail = 0;

                const isBg = (i: number) => {
                  const r = data[i * 4];
                  const g = data[i * 4 + 1];
                  const b = data[i * 4 + 2];
                  const min = Math.min(r, g, b);
                  const max = Math.max(r, g, b);
                  return (min > 200) || (min > 165 && (max - min) < 25);
                };

                for (let x = 0; x < w; x++) {
                  const top = x;
                  const bot = (h - 1) * w + x;
                  if (isBg(top)) { visited[top] = 1; queue[qTail++] = top; }
                  if (isBg(bot)) { visited[bot] = 1; queue[qTail++] = bot; }
                }
                for (let y = 0; y < h; y++) {
                  const left = y * w;
                  const right = y * w + (w - 1);
                  if (!visited[left] && isBg(left)) { visited[left] = 1; queue[qTail++] = left; }
                  if (!visited[right] && isBg(right)) { visited[right] = 1; queue[qTail++] = right; }
                }

                while (qHead < qTail) {
                  const curr = queue[qHead++];
                  const cx = curr % w;
                  const cy = Math.floor(curr / w);

                  data[curr * 4 + 3] = 0;

                  if (cx > 0) {
                    const left = curr - 1;
                    if (!visited[left] && isBg(left)) { visited[left] = 1; queue[qTail++] = left; }
                  }
                  if (cx < w - 1) {
                    const right = curr + 1;
                    if (!visited[right] && isBg(right)) { visited[right] = 1; queue[qTail++] = right; }
                  }
                  if (cy > 0) {
                    const up = curr - w;
                    if (!visited[up] && isBg(up)) { visited[up] = 1; queue[qTail++] = up; }
                  }
                  if (cy < h - 1) {
                    const down = curr + w;
                    if (!visited[down] && isBg(down)) { visited[down] = 1; queue[qTail++] = down; }
                  }
                }

                // Feather outer border
                for (let y = 1; y < h - 1; y++) {
                  for (let x = 1; x < w - 1; x++) {
                    const idx = y * w + x;
                    if (data[idx * 4 + 3] > 0) {
                      const hasTrans =
                        data[(idx - 1) * 4 + 3] === 0 ||
                        data[(idx + 1) * 4 + 3] === 0 ||
                        data[(idx - w) * 4 + 3] === 0 ||
                        data[(idx + w) * 4 + 3] === 0;
                      if (hasTrans) {
                        const r = data[idx * 4];
                        const g = data[idx * 4 + 1];
                        const b = data[idx * 4 + 2];
                        if (r > 190 && g > 190 && b > 190) {
                          data[idx * 4 + 3] = Math.max(0, Math.round(255 - ((r + g + b) / 3 - 190) * 5));
                        }
                      }
                    }
                  }
                }

                ctx.putImageData(imgData, 0, 0);
              }
            }

            canvas.toBlob((blob) => {
              if (blob) {
                const cleanedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' });
                resolve({ file: cleanedFile, dataUrl: canvas.toDataURL('image/png') });
              } else {
                resolve({ file, dataUrl: rawData });
              }
            }, 'image/png');
          };
          img.onerror = () => resolve({ file, dataUrl: rawData });
          img.src = rawData;
        };
        reader.onerror = () => resolve({ file, dataUrl: '' });
        reader.readAsDataURL(file);
      });

      processedFile = processed.file;
      fallbackDataUrl = processed.dataUrl;
    } catch (e) {
      console.warn('Canvas pre-processing error:', e);
    }

    let finalImageUrl = '';

    // 1. Upload clean transparent image to restaurant's permanent Supabase Storage
    const restId = restaurant?.id || '';
    if (restId && restId !== 'demo') {
      try {
        finalImageUrl = await storageHelper.uploadImage(processedFile, restId, `qr_${target}`);
      } catch (uploadErr) {
        console.warn('Supabase storage upload failed, using clean client dataUrl:', uploadErr);
      }
    }

    if (!finalImageUrl) {
      finalImageUrl = fallbackDataUrl;
    }

    if (!finalImageUrl) return;

    const result = finalImageUrl;
    if (target === 'dish') {
      const targetSlot = (editingDishSlot >= 0 && editingDishSlot < dishSlots.length) ? editingDishSlot : 0;
      setConfig((prev) => {
        const nextGrid = Array.isArray(prev.gridDishImages) ? [...prev.gridDishImages] : [];
        while (nextGrid.length < 3) nextGrid.push(result);
        nextGrid[targetSlot] = result;

        const nextOverrides = { ...(prev.tableImageOverrides || {}) };
        if (targetSlot === 0 && activeTable.name) {
          nextOverrides[activeTable.name] = result;
          const rawNum = activeTable.name.replace(/^Table\s*/i, '').trim();
          nextOverrides[rawNum] = result;
        }

        return {
          ...prev,
          customDishUrl: targetSlot === 0 ? result : prev.customDishUrl,
          selectedDishIndex: targetSlot === 0 ? undefined : prev.selectedDishIndex,
          gridDishImages: nextGrid,
          tableImageOverrides: nextOverrides
        };
      });
    } else if (target === 'logo') {
      setConfig((prev) => ({
        ...prev,
        logo: {
          ...prev.logo,
          enabled: true,
          url: result
        }
      }));
    } else if (target === 'current_table') {
      setConfig((prev) => {
        const currentOverrides = { ...(prev.tableImageOverrides || {}) };
        currentOverrides[activeTable.id] = result;
        currentOverrides[activeTable.name] = result;
        return {
          ...prev,
          perTableCustomization: true,
          tableImageOverrides: currentOverrides
        };
      });
    } else {
      setConfig((prev) => ({
        ...prev,
        bgTextureStyle: 'custom_image',
        background: {
          ...prev.background,
          type: 'image',
          imageUrl: result
        }
      }));
    }
  }, [restaurant?.id, activeTable, editingDishSlot, dishSlots.length]);

  const handleSaveConfig = useCallback(async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await saveQRDesignConfig(restaurant, config);
      if (res.success) {
        setSaveSuccess(true);
        if (onSaved) onSaved();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(res.error || 'Failed to save QR configuration.');
      }
    } catch (err: any) {
      alert('Failed to save QR design: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  }, [restaurant, config, onSaved]);

  const handleDownloadSingle = useCallback(async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.cleverops.in';
      const item = {
        id: activeTable.id,
        name: activeTable.name,
        url: getCanonicalTableQRUrl(origin, restaurantSlug, activeTable.id)
      };
      await downloadBrandedTableQR(config, item, restaurantSlug);
    } catch (err: any) {
      alert('Failed to download QR card: ' + (err.message || err));
    }
  }, [config, activeTable, restaurantSlug]);

  const handleDownloadAllZip = useCallback(async () => {
    try {
      setIsBulkDownloading(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.cleverops.in';
      const items = effectiveTables.map((t) => ({
        id: t.id,
        name: t.name,
        url: getCanonicalTableQRUrl(origin, restaurantSlug, t.id)
      }));

      await downloadAllTablesQRZip(config, items, restaurantSlug, (current, total) => {
        setBulkProgress({ current, total });
      });
    } catch (err: any) {
      alert('Failed to generate bulk QR ZIP: ' + (err.message || err));
    } finally {
      setIsBulkDownloading(false);
      setBulkProgress(null);
    }
  }, [config, effectiveTables, restaurantSlug]);

  const handlePrintSingle = useCallback(async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.cleverops.in';
      const item = {
        id: activeTable.id,
        name: activeTable.name,
        url: getCanonicalTableQRUrl(origin, restaurantSlug, activeTable.id)
      };
      await printSingleBrandedTable(config, item);
    } catch (err: any) {
      alert('Failed to print QR standee: ' + (err.message || err));
    }
  }, [config, activeTable, restaurantSlug]);

  const handlePrintAllA4 = useCallback(async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.cleverops.in';
      const items = effectiveTables.map((t) => ({
        id: t.id,
        name: t.name,
        url: getCanonicalTableQRUrl(origin, restaurantSlug, t.id)
      }));
      await printAllTablesA4Sheet(config, items, restaurant?.name || 'SmartDine');
    } catch (err: any) {
      alert('Failed to prepare A4 printable sheet: ' + (err.message || err));
    }
  }, [config, effectiveTables, restaurant?.name, restaurantSlug]);

  // Hook Group 5: useEffect
  useEffect(() => {
    if (initialConfig) {
      setConfig((prev) => ({
        ...prev,
        ...initialConfig
      }));
      if (initialConfig.mainCategory) {
        setActiveCategoryTab(initialConfig.mainCategory);
      }
    }
  }, [initialConfig]);

  useEffect(() => {
    let isMounted = true;

    async function loadTables() {
      if (!restaurant?.id) return;
      try {
        const dbTables = await db.getTables(restaurant.id);
        if (isMounted && Array.isArray(dbTables) && dbTables.length > 0) {
          const formatted: TableItem[] = dbTables.map((t: any) => ({
            id: t.id,
            name: t.name
          }));
          setTablesList(formatted);
          if (formatted[0]) {
            setSelectedTableId(formatted[0].id);
          }
        }
      } catch (e) {
        console.warn('Could not load tables in QR Studio:', e);
      }
    }

    loadTables();
    return () => {
      isMounted = false;
    };
  }, [restaurant?.id]);

  useEffect(() => {
    if (editingDishSlot >= dishSlots.length) {
      setEditingDishSlot(0);
    }
  }, [dishSlots.length, editingDishSlot]);

  // =========================================================================
  // 2. RENDER WORKSPACE: Systematic Creative 2-Panel Architecture
  // =========================================================================

  return (
    <div className="w-full flex flex-col bg-white text-slate-800 rounded-xl border border-slate-200 shadow-xs overflow-hidden min-h-[820px]">
      
      {/* ================= TOP STUDIO HEADER BAR ================= */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Creative QR Standee Studio
            </h1>
          </div>
        </div>

        {/* Global Save & Production Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadAllZip}
            disabled={isBulkDownloading}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            title="Download ZIP with high-res 300 DPI PNGs for all tables"
          >
            <FileArchive className="w-3.5 h-3.5 text-slate-500" />
            <span>{isBulkDownloading ? `Zipping (${bulkProgress?.current || 0}/${bulkProgress?.total || 0})...` : 'Bulk ZIP'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintAllA4}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            title="Print all table QR cards on multi-grid A4 sheets"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print All (A4)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ${
              saveSuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved Successfully</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Design</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= FULL-WIDTH STEP NAVIGATION BAR (ss1 #2) ================= */}
      <div className="w-full bg-slate-50 border-b border-slate-200 px-6 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 max-w-5xl">
          {[
            { id: 'style', label: '1. Style', icon: LayoutTemplate, tag: '5 Concepts' },
            { id: 'food', label: '2. 3D Food', icon: Utensils, tag: 'Platter & Vibe' },
            { id: 'branding', label: '3. Brand', icon: Type, tag: 'Clear Contrast' },
            { id: 'quote', label: '4. Quotes & CTA', icon: MessageSquare, tag: 'Punchlines' },
            { id: 'finetune', label: '5. Fine-Tune', icon: Sliders, tag: 'Positions & Glass' }
          ].map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id as StudioStep)}
                className={`flex-1 py-2 px-3 rounded-lg text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                  isActive
                    ? 'bg-white shadow-xs border border-slate-200 ring-1 ring-slate-900/10'
                    : 'hover:bg-slate-200/60 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                    {step.label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {step.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= MAIN 2-PANEL CREATIVE WORKSPACE ================= */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[760px] divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* =============================================================
            PANEL 1 (Cols 5): SYSTEMATIC 5-STEP CREATION PIPELINE
           ============================================================= */}
        <div className="lg:col-span-5 flex flex-col bg-white overflow-hidden max-h-[820px]">

          {/* Step Content Container */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">

            {/* -------------------------------------------------------------
                STEP 1: CREATIVE STYLES (The 5 Reference Concepts)
               ------------------------------------------------------------- */}
            {activeStep === 'style' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Step 1: Choose Creative Structure Concept
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {SMART_SUGGESTION_COMBOS.map((combo) => {
                    const isSelected = config.studioLayout === combo.layout;
                    return (
                      <div
                        key={combo.id}
                        onClick={() => handleApplySmartSuggestion(combo.id)}
                        className={`group relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/10'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/10 text-amber-400' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <LayoutTemplate className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold tracking-tight">
                              {combo.title}
                            </h4>
                            <span className={`text-[10px] font-semibold ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                              {combo.badge}
                            </span>
                          </div>
                        </div>

                        {/* Selected Check Pill */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'bg-slate-50 border-slate-200 text-transparent group-hover:border-slate-300'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Next: Customize food & 3D platter</span>
                  <button
                    type="button"
                    onClick={() => setActiveStep('food')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Next Step <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 2: CUISINE, 3D DISH & ATMOSPHERE
               ------------------------------------------------------------- */}
            {activeStep === 'food' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-amber-500" />
                    Step 2: Cuisine, 3D Dishes & Atmosphere
                  </h3>
                </div>

                {/* Cuisine & Subcategory Selector */}
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block">
                    Select Cuisine Category & Theme
                  </label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block mb-1">Category</span>
                      <select
                        value={activeCategoryTab}
                        onChange={(e) => {
                          const newCat = e.target.value as QRStudioCategory;
                          setActiveCategoryTab(newCat);
                          const group = CATEGORY_GROUPS.find((g) => g.id === newCat);
                          if (group && group.subCategories[0]) {
                            handleSelectSubCategory(group.subCategories[0]);
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer shadow-2xs"
                      >
                        {CATEGORY_GROUPS.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block mb-1">Theme / Cuisines</span>
                      <select
                        value={activeSubCategory}
                        onChange={(e) => handleSelectSubCategory(e.target.value as QRStudioSubCategory)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer shadow-2xs"
                      >
                        {activeCategoryGroup.subCategories.map((subKey) => {
                          const theme = QR_THEMES_CONFIG[subKey];
                          if (!theme) return null;
                          return (
                            <option key={subKey} value={subKey}>{theme.name}</option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Multi-Dish Position Slot Selector (ss3, ss4, ss6) */}
                {/* Multi-Dish Position Slot Selector (ss3, ss4, ss6, ss5) */}
                {dishSlots.length > 1 && (
                  <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {config.studioLayout === 'corner_bowls'
                          ? 'Select Orbit Dish Position to Edit'
                          : 'Select Banner Position to Edit'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Slot {editingDishSlot + 1} of {dishSlots.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {dishSlots.map((slot) => {
                        const isCurrentSlot = editingDishSlot === slot.index;
                        const isHidden = 
                          config.studioLayout === 'corner_bowls' && (
                            (slot.index === 0 && config.hideOrbitDish1) ||
                            (slot.index === 1 && config.hideOrbitDish2) ||
                            (slot.index === 2 && config.hideOrbitDish3)
                          );
                        const currentSlotImg =
                          config.gridDishImages?.[slot.index] ||
                          (slot.index === 0 ? activeHeroImage : activeTheme.dishPresets?.[slot.index]?.imageUrl) ||
                          '';

                        return (
                          <button
                            key={slot.index}
                            type="button"
                            onClick={() => setEditingDishSlot(slot.index)}
                            className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 relative ${
                              isCurrentSlot
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 border border-black/10 bg-slate-200 relative">
                              {currentSlotImg ? (
                                <img src={currentSlotImg} alt="" className={`w-full h-full object-cover ${isHidden ? 'opacity-30' : ''}`} />
                              ) : (
                                <Utensils className="w-4 h-4 m-auto text-slate-400" />
                              )}
                              {isHidden && (
                                <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center">
                                  <EyeOff className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="truncate flex-1">
                              <span className={`text-[10px] font-bold block truncate ${isCurrentSlot ? 'text-white' : 'text-slate-800'}`}>
                                {slot.label}
                              </span>
                              <span className={`text-[9px] block truncate ${
                                isHidden
                                  ? 'text-red-400 font-bold'
                                  : isCurrentSlot
                                    ? 'text-amber-300 font-semibold'
                                    : 'text-slate-400'
                              }`}>
                                {isHidden ? 'Hidden' : isCurrentSlot ? 'Editing' : 'Tap to Edit'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Orbit Dish Size & Delete/Hide Controls (SS5) */}
                    {config.studioLayout === 'corner_bowls' && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-2">
                        {(() => {
                          const isSlotHidden =
                            (editingDishSlot === 0 && config.hideOrbitDish1) ||
                            (editingDishSlot === 1 && config.hideOrbitDish2) ||
                            (editingDishSlot === 2 && config.hideOrbitDish3);
                          const currentScale =
                            editingDishSlot === 0
                              ? (config.orbitDish1Scale ?? 100)
                              : editingDishSlot === 1
                                ? (config.orbitDish2Scale ?? 100)
                                : (config.orbitDish3Scale ?? 100);

                          const handleToggleHide = () => {
                            if (editingDishSlot === 0) {
                              setConfig((prev) => ({ ...prev, hideOrbitDish1: !prev.hideOrbitDish1 }));
                            } else if (editingDishSlot === 1) {
                              setConfig((prev) => ({ ...prev, hideOrbitDish2: !prev.hideOrbitDish2 }));
                            } else if (editingDishSlot === 2) {
                              setConfig((prev) => ({ ...prev, hideOrbitDish3: !prev.hideOrbitDish3 }));
                            }
                          };

                          const handleScaleChange = (val: number) => {
                            if (editingDishSlot === 0) {
                              setConfig((prev) => ({ ...prev, orbitDish1Scale: val }));
                            } else if (editingDishSlot === 1) {
                              setConfig((prev) => ({ ...prev, orbitDish2Scale: val }));
                            } else if (editingDishSlot === 2) {
                              setConfig((prev) => ({ ...prev, orbitDish3Scale: val }));
                            }
                          };

                          return (
                            <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-800">
                                  {dishSlots[editingDishSlot]?.label || 'Dish'} Settings:
                                </span>
                                <button
                                  type="button"
                                  onClick={handleToggleHide}
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                    isSlotHidden
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                                  }`}
                                >
                                  {isSlotHidden ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      Restore Dish
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="w-3 h-3" />
                                      Delete / Hide Dish
                                    </>
                                  )}
                                </button>
                              </div>

                              <div>
                                <div className="flex justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                                  <span>Dish Size (Scale)</span>
                                  <span className="font-mono font-bold text-slate-900">{currentScale}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="50"
                                  max="150"
                                  step="5"
                                  value={currentScale}
                                  onChange={(e) => handleScaleChange(parseInt(e.target.value, 10))}
                                  className="w-full accent-slate-900 cursor-pointer"
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Orbit Dish Render Mode (SS1/SS5: 3D Transparent Cutout vs Framed Gold) */}
                        <div className="pt-1 space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-800 block">
                            Orbit Dish Style (SS1 / SS5)
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'framed_gold', label: 'Gold Platter Rim (3D)' },
                              { id: 'transparent_cutout', label: 'Floating Cutout (Borderless)' }
                            ].map((mode) => {
                              const isSelected = (config.orbitDishStyle || 'framed_gold') === mode.id;
                              return (
                                <button
                                  key={mode.id}
                                  type="button"
                                  onClick={() => setConfig((prev) => ({ ...prev, orbitDishStyle: mode.id as any }))}
                                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center border transition-all cursor-pointer truncate ${
                                    isSelected
                                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {mode.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Dish Zoom & Edge Crop Slider (Eliminates white studio background margins) */}
                          <div className="pt-1.5 border-t border-slate-200/60">
                            <div className="flex justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                              <span>Platter Zoom & Edge Crop</span>
                              <span className="font-mono font-bold text-slate-900">{config.dishZoom ?? 100}%</span>
                            </div>
                            <input
                              type="range"
                              min="100"
                              max="150"
                              step="5"
                              value={config.dishZoom ?? 100}
                              onChange={(e) => setConfig((prev) => ({ ...prev, dishZoom: parseInt(e.target.value, 10) }))}
                              className="w-full accent-slate-900 cursor-pointer"
                              title="Zoom food photo to fill the circular platter and crop out any white background"
                            />
                            <p className="text-[9.5px] text-slate-400">
                              Increases zoom inside the plate so zero white studio borders remain around food.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3D Realistic Dish Platter Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Pick Food for: <span className="text-amber-600 font-black">{dishSlots[editingDishSlot]?.label || 'Platter'}</span>
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      3D Cutout (Zero Background)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(activeTheme.dishPresets || []).map((dish, idx) => {
                      const activeSlotUrl = config.gridDishImages?.[editingDishSlot] || (editingDishSlot === 0 ? activeHeroImage : '');
                      const isSelected = activeSlotUrl === dish.imageUrl || (editingDishSlot === 0 && config.selectedDishIndex === idx && !config.customDishUrl);
                      return (
                        <button
                          key={dish.id || idx}
                          type="button"
                          onClick={() => handleSelectDishPreset(idx)}
                          className={`group relative rounded-xl border text-left transition-all cursor-pointer aspect-4/3 flex flex-col justify-between p-2.5 overflow-hidden ${
                            isSelected
                              ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-1 shadow-md bg-amber-50/50'
                              : 'border-slate-200 hover:border-slate-400 bg-slate-50/80 hover:bg-slate-100'
                          }`}
                        >
                          {/* Centered Floating 3D Cutout Asset */}
                          <div className="w-full flex-1 flex items-center justify-center p-1 pointer-events-none">
                            <img
                              src={dish.imageUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="max-h-[85px] max-w-[85px] object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.src = '/dish-presets/3d/rajasthani_thali_3d.png';
                              }}
                            />
                          </div>

                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs z-10">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}

                          {dish.tag && (
                            <div className="absolute top-1.5 left-1.5 z-10">
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shadow-xs">
                                {dish.tag}
                              </span>
                            </div>
                          )}

                          <div className="relative z-10 pt-1 border-t border-slate-200/80">
                            <p className="text-[11px] font-bold text-slate-900 leading-tight truncate">
                              {dish.name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom food upload button */}
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'dish')}
                    />
                    {(editingDishSlot === 0 ? !!config.customDishUrl : (config.gridDishImages?.[editingDishSlot] && !activeTheme.dishPresets?.some(p => p.imageUrl === config.gridDishImages?.[editingDishSlot]))) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-emerald-700 font-semibold">Custom 3D cutout uploaded</span>
                        <button
                          type="button"
                          onClick={() => handleSelectDishPreset(editingDishSlot % (activeTheme.dishPresets?.length || 1))}
                          className="text-[11px] text-red-600 underline cursor-pointer"
                        >
                          Reset to Presets
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-slate-700 font-semibold underline flex items-center gap-1.5 hover:text-slate-900 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        Upload Custom Food Photo (Auto 3D Cutout)
                      </button>
                    )}
                  </div>
                </div>

                {/* 3D Platter Rim Style */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-800 block">
                    3D Platter Rim & Surface Style
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'floating_plate', label: 'Floating Platter' },
                      { id: 'gold_rim', label: 'Pure Gold Rim' },
                      { id: 'ceramic_white', label: 'Ceramic White' },
                      { id: 'slate_stone', label: 'Slate Stone' },
                      { id: 'terracotta', label: 'Clay Terracotta' },
                      { id: 'cutout_banner', label: 'Flat Banner' }
                    ].map((rim) => {
                      const isSelected = (config.dish3dMode || 'floating_plate') === rim.id;
                      return (
                        <button
                          key={rim.id}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, dish3dMode: rim.id as any }))}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer truncate ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {rim.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3D Platter Size & Visibility (table_tent_classic - SS5) */}
                {config.studioLayout === 'table_tent_classic' && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">3D Platter Size & Visibility</span>
                      <button
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, hideCenterDish: !prev.hideCenterDish }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          config.hideCenterDish
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                        }`}
                      >
                        {config.hideCenterDish ? (
                          <>
                            <Check className="w-3 h-3" />
                            Restore Platter
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3" />
                            Delete / Hide Platter
                          </>
                        )}
                      </button>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                        <span>Platter Zoom</span>
                        <span className="font-mono font-bold text-slate-900">{config.dishZoom ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="140"
                        step="5"
                        value={config.dishZoom ?? 100}
                        onChange={(e) => setConfig((prev) => ({ ...prev, dishZoom: parseInt(e.target.value, 10) }))}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Atmosphere Wallpaper Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Atmosphere Theme Wallpaper
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSelectCulturalBgPreset(-1)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                        config.selectedCulturalBgIndex === -1
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Clean Solid (No Photo)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {(activeTheme.culturalBackgrounds || []).map((bg, idx) => {
                      const isSelected = config.selectedCulturalBgIndex === idx && !config.customCulturalBgUrl;
                      return (
                        <button
                          key={bg.id || idx}
                          type="button"
                          onClick={() => handleSelectCulturalBgPreset(idx)}
                          className={`group relative rounded-lg overflow-hidden border text-left transition-all cursor-pointer aspect-4/3 flex flex-col justify-end p-1.5 ${
                            isSelected
                              ? 'border-slate-900 ring-2 ring-slate-900 shadow-xs'
                              : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={bg.imageUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                          <p className="relative z-10 text-[10px] font-bold text-white truncate drop-shadow-xs">
                            {bg.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>


                {/* Per Table Food Toggle */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Per-Table Unique Food</span>
                    <span className="text-[10px] text-slate-500">Every table gets a distinct dish picture</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoDistributeAcrossTables}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-300"
                  >
                    Auto Distribute
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep('style')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Back to Styles
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep('branding')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Next: Branding <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 3: BRANDING & READABILITY
               ------------------------------------------------------------- */}
            {activeStep === 'branding' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Type className="w-4 h-4 text-amber-500" />
                    Step 3: Restaurant Branding & Crystal-Clear Contrast
                  </h3>
                </div>

                {/* Card Background Opacity & Frosted Glass (ss2) */}
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Card Background Opacity & Frosted Glass
                    </label>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {config.cardBgOpacity ?? 80}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={config.cardBgOpacity ?? 80}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setConfig((prev) => ({ ...prev, cardBgOpacity: val }));
                    }}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    {[
                      { label: 'Solid', val: 100 },
                      { label: 'Frosted', val: 80 },
                      { label: 'Translucent', val: 55 },
                      { label: 'Sheer', val: 25 },
                      { label: 'Clear', val: 0 }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, cardBgOpacity: preset.val }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                          (config.cardBgOpacity ?? 80) === preset.val
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vintage Kraft & Cafe Paper Color Tone (minimal_lineart - SS2) */}
                {config.studioLayout === 'minimal_lineart' && (
                  <div className="space-y-2.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Vintage Kraft Paper Color Tone (SS2)
                      </label>
                      <span className="text-[10px] font-mono font-bold text-amber-900">
                        {config.kraftPaperTint || '#C5A880'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { label: 'Warm Amber', color: '#C5A880' },
                        { label: 'Charcoal Noir', color: '#1F2937' },
                        { label: 'Botanical Sage', color: '#2D3A2F' },
                        { label: 'Burgundy Wine', color: '#4A1521' },
                        { label: 'Espresso Roast', color: '#382216' },
                        { label: 'Ivory Cream', color: '#F5EBE0' },
                        { label: 'Vintage Navy', color: '#1E293B' },
                        { label: 'Terracotta', color: '#8B4513' }
                      ].map((tone) => {
                        const isCurrent = (config.kraftPaperTint || '#C5A880').toLowerCase() === tone.color.toLowerCase();
                        return (
                          <button
                            key={tone.color}
                            type="button"
                            onClick={() => setConfig((prev) => ({ ...prev, kraftPaperTint: tone.color }))}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                              isCurrent
                                ? 'ring-2 ring-slate-900 border-slate-900 shadow-xs bg-white'
                                : 'border-slate-200 hover:border-slate-400 bg-white/80'
                            }`}
                          >
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: tone.color }}
                            />
                            <span className="truncate text-[10px] text-slate-800">{tone.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
                      <span className="text-[10px] font-medium text-amber-950">Custom Paper Color:</span>
                      <input
                        type="color"
                        value={config.kraftPaperTint || '#C5A880'}
                        onChange={(e) => setConfig((prev) => ({ ...prev, kraftPaperTint: e.target.value }))}
                        className="w-6 h-6 rounded cursor-pointer border border-amber-300 p-0"
                      />
                    </div>
                  </div>
                )}

                {/* Restaurant Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    value={config.text.restaurantName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig((prev) => ({
                        ...prev,
                        text: {
                          ...prev.text,
                          restaurantName: val
                        }
                      }));
                    }}
                    placeholder="Enter Restaurant Name"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 shadow-2xs"
                  />
                </div>

                {/* Tagline / Subtitle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Tagline / Heritage Subtitle
                  </label>
                  <input
                    type="text"
                    value={config.tagline || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig((prev) => ({ ...prev, tagline: val }));
                    }}
                    placeholder="e.g. Royal Heritage Dining • Authentic Spices"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-slate-900 shadow-2xs"
                  />
                </div>

                {/* Table Number Formatting */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Table Label Format
                  </label>
                  <input
                    type="text"
                    value={config.text.tableNameFormat || 'Table {{table_name}}'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig((prev) => ({
                        ...prev,
                        text: {
                          ...prev.text,
                          tableNameFormat: val
                        }
                      }));
                    }}
                    placeholder="Table {{table_name}}"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-slate-900 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-400">
                    Use <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{'{{table_name}}'}</code> for dynamic table numbering.
                  </p>
                </div>

                {/* Dietary Food Badge */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Dietary Classification Badge
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'veg', label: '100% Veg' },
                      { id: 'non_veg', label: 'Non-Veg' },
                      { id: 'vegan', label: 'Vegan' }
                    ].map((badge) => {
                      const isSelected = (config.dietaryBadge || 'none') === badge.id;
                      return (
                        <button
                          key={badge.id}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, dietaryBadge: badge.id as any }))}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {badge.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Top-Left Sticker Callout Badge (Editable & Deletable - SS2) */}
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Top-Left Callout Badge (SS2)
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, hideTopBadge: !prev.hideTopBadge }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        config.hideTopBadge
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {config.hideTopBadge ? (
                        <>
                          <Check className="w-3 h-3" />
                          Restore Badge
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          Delete / Hide Badge
                        </>
                      )}
                    </button>
                  </div>

                  {!config.hideTopBadge && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block mb-1">Badge Title</span>
                        <input
                          type="text"
                          value={config.topBadgeText || ''}
                          onChange={(e) => setConfig((prev) => ({ ...prev, topBadgeText: e.target.value }))}
                          placeholder="SCAN MENU"
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-2xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block mb-1">Badge Subtitle</span>
                        <input
                          type="text"
                          value={config.topBadgeSubText || ''}
                          onChange={(e) => setConfig((prev) => ({ ...prev, topBadgeSubText: e.target.value }))}
                          placeholder="Fast Order"
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Footer Table Pill Badge (Editable & Deletable - SS2) */}
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Bottom Table Footer Pill (SS2)
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, hideFooterBadge: !prev.hideFooterBadge }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        config.hideFooterBadge
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {config.hideFooterBadge ? (
                        <>
                          <Check className="w-3 h-3" />
                          Restore Pill
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          Delete / Hide Pill
                        </>
                      )}
                    </button>
                  </div>

                  {!config.hideFooterBadge && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block mb-1">Brand / Footer Action Text</span>
                        <input
                          type="text"
                          value={config.text.footerText || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConfig((prev) => ({
                              ...prev,
                              text: { ...prev.text, footerText: val }
                            }));
                          }}
                          placeholder="POWERED BY CLEVEROPS"
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-2xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block mb-1">Footer Tagline / Subtitle</span>
                        <input
                          type="text"
                          value={config.footerSubText || ''}
                          onChange={(e) => setConfig((prev) => ({ ...prev, footerSubText: e.target.value }))}
                          placeholder="INSTANT KITCHEN DISPATCH"
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Logo Upload */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Restaurant Logo
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.logo.enabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setConfig((prev) => ({
                            ...prev,
                            logo: { ...prev.logo, enabled: val }
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-slate-900" />
                    </label>
                  </div>

                  {config.logo.enabled && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <input
                        ref={tableFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                      {config.logo.url ? (
                        <div className="w-10 h-10 rounded-full bg-white p-1 border border-slate-300 overflow-hidden shrink-0">
                          <img src={config.logo.url} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <Upload className="w-4 h-4" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => tableFileInputRef.current?.click()}
                        className="text-xs font-bold text-slate-800 hover:text-slate-950 underline cursor-pointer"
                      >
                        {config.logo.url ? 'Change Logo Image' : 'Upload Brand Logo PNG'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep('food')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Back to Food
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep('quote')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Next: Quotes & CTA <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 4: FUNNY QUOTES & CTA BADGES
               ------------------------------------------------------------- */}
            {activeStep === 'quote' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    Step 4: Catchy Funny Quotes & CTA Action
                  </h3>
                </div>

                {/* Click to Pick Funny Quotes */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Pick a Popular Desi Scan Punchline
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FUNNY_SCAN_QUOTES.map((q) => {
                      const isSelected = config.funnyQuote === q;
                      return (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleSelectFunnyQuote(q)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'bg-amber-400 border-amber-500 text-slate-950 font-bold shadow-xs'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 font-medium'
                          }`}
                        >
                          &quot;{q}&quot;
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={config.funnyQuote || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig((prev) => ({ ...prev, funnyQuote: val }));
                    }}
                    placeholder="Or type a custom punchline..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 mt-1 shadow-2xs"
                  />
                </div>

                {/* Quote Style & Colors */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-800 block">
                    Quote Display Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'speech_bubble', label: 'Speech Bubble' },
                      { id: 'pill', label: 'Floating Pill' },
                      { id: 'comic_banner', label: 'Comic Banner' }
                    ].map((st) => {
                      const isSelected = (config.funnyQuoteStyle || 'speech_bubble') === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, funnyQuoteStyle: st.id as any }))}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quote Frosted Glass & Blur (SS3) */}
                <div className="space-y-2.5 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Quote Frosted Glass & Background Blur (SS3)
                    </label>
                    <span className="text-[10px] font-mono font-bold text-slate-700">
                      Blur {config.funnyQuoteBlur ?? 8}px • Opacity {config.funnyQuoteOpacity ?? 90}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block mb-1">
                        Glass Blur ({config.funnyQuoteBlur ?? 8}px)
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={config.funnyQuoteBlur ?? 8}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, funnyQuoteBlur: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block mb-1">
                        Bubble Opacity ({config.funnyQuoteOpacity ?? 90}%)
                      </span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={config.funnyQuoteOpacity ?? 90}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, funnyQuoteOpacity: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    {[
                      { label: 'Solid', op: 100, blur: 0 },
                      { label: 'Frosted Glass', op: 85, blur: 8 },
                      { label: 'Glassmorphic', op: 60, blur: 14 },
                      { label: 'Deep Blur', op: 40, blur: 20 }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, funnyQuoteOpacity: preset.op, funnyQuoteBlur: preset.blur }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                          (config.funnyQuoteOpacity ?? 90) === preset.op && (config.funnyQuoteBlur ?? 8) === preset.blur
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quote Bubble Color Customization */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Quote Bubble Colors
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfig((prev) => ({
                        ...prev,
                        funnyQuoteBgColor: '#FEF08A',
                        funnyQuoteTextColor: '#854D0E'
                      }))}
                      className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold cursor-pointer"
                    >
                      Reset Colors
                    </button>
                  </div>

                  {/* Quote Background Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <span>Background Color</span>
                      <span className="font-mono text-[10px] text-slate-500">{config.funnyQuoteBgColor || '#FEF08A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: 'Amber', color: '#FEF08A' },
                        { label: 'Gold', color: '#F59E0B' },
                        { label: 'White', color: '#FFFFFF' },
                        { label: 'Orange', color: '#FB923C' },
                        { label: 'Rose', color: '#FECDD3' },
                        { label: 'Mint', color: '#BBF7D0' },
                        { label: 'Slate', color: '#1E293B' },
                        { label: 'Burgundy', color: '#4A0E17' }
                      ].map((swatch) => (
                        <button
                          key={swatch.color}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, funnyQuoteBgColor: swatch.color }))}
                          title={swatch.label}
                          className={`w-6 h-6 rounded-full border transition-all cursor-pointer shadow-2xs ${
                            (config.funnyQuoteBgColor || '#FEF08A').toLowerCase() === swatch.color.toLowerCase()
                              ? 'ring-2 ring-slate-900 ring-offset-1 scale-110'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch.color }}
                        />
                      ))}
                      <div className="relative flex items-center ml-1">
                        <input
                          type="color"
                          value={config.funnyQuoteBgColor || '#FEF08A'}
                          onChange={(e) => setConfig((prev) => ({ ...prev, funnyQuoteBgColor: e.target.value }))}
                          className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                          title="Custom Background Color"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quote Text Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <span>Text / Font Color</span>
                      <span className="font-mono text-[10px] text-slate-500">{config.funnyQuoteTextColor || '#854D0E'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: 'Brown', color: '#854D0E' },
                        { label: 'Obsidian', color: '#0F172A' },
                        { label: 'Pure White', color: '#FFFFFF' },
                        { label: 'Crimson', color: '#991B1B' },
                        { label: 'Forest', color: '#166534' },
                        { label: 'Navy', color: '#1E3A8A' }
                      ].map((swatch) => (
                        <button
                          key={swatch.color}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, funnyQuoteTextColor: swatch.color }))}
                          title={swatch.label}
                          className={`w-6 h-6 rounded-full border transition-all cursor-pointer shadow-2xs ${
                            (config.funnyQuoteTextColor || '#854D0E').toLowerCase() === swatch.color.toLowerCase()
                              ? 'ring-2 ring-slate-900 ring-offset-1 scale-110'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch.color }}
                        />
                      ))}
                      <div className="relative flex items-center ml-1">
                        <input
                          type="color"
                          value={config.funnyQuoteTextColor || '#854D0E'}
                          onChange={(e) => setConfig((prev) => ({ ...prev, funnyQuoteTextColor: e.target.value }))}
                          className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                          title="Custom Text Color"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Action Badge */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      QR Action Callout Badge (CTA)
                    </label>
                    <span className="text-[10px] text-slate-400">Scan pill over QR</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'preset', label: 'Standard Pill' },
                      { id: 'custom', label: 'Custom Text' },
                      { id: 'nil', label: 'Hide (Nil)' }
                    ].map((mode) => {
                      const isSelected = (config.ctaBadgeMode || 'preset') === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, ctaBadgeMode: mode.id as any }))}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>

                  {config.ctaBadgeMode !== 'nil' && (
                    <>
                      {/* Preset Quick Chips */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {['SCAN FOR MENU', 'ORDER & PAY', 'SCAN TO ORDER'].map((textOpt) => {
                          const isSelected = config.ctaBadgeText === textOpt;
                          return (
                            <button
                              key={textOpt}
                              type="button"
                              onClick={() => setConfig((prev) => ({ ...prev, ctaBadgeText: textOpt }))}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer truncate ${
                                isSelected
                                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {textOpt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom CTA Text Input */}
                      <input
                        type="text"
                        value={config.ctaBadgeText || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig((prev) => ({ ...prev, ctaBadgeText: val, ctaBadgeMode: 'custom' }));
                        }}
                        placeholder="Type custom action callout text..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs"
                      />

                      {/* CTA Badge Background & Text Colors */}
                      <div className="space-y-3 pt-2 border-t border-slate-200/70">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">
                            CTA Badge Colors
                          </label>
                          <button
                            type="button"
                            onClick={() => setConfig((prev) => ({
                              ...prev,
                              ctaBadgeBgColor: '',
                              ctaBadgeTextColor: ''
                            }))}
                            className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold cursor-pointer"
                          >
                            Reset to Theme Default
                          </button>
                        </div>

                        {/* CTA Badge Background Color */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                            <span>Badge Background Color</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {config.ctaBadgeBgColor || 'Theme Default'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                              { label: 'Amber Gold', color: '#F59E0B' },
                              { label: 'Warm Orange', color: '#F97316' },
                              { label: 'Crimson Red', color: '#DC2626' },
                              { label: 'Emerald Green', color: '#10B981' },
                              { label: 'Royal Blue', color: '#3B82F6' },
                              { label: 'Obsidian Black', color: '#0F172A' },
                              { label: 'Crisp White', color: '#FFFFFF' }
                            ].map((swatch) => (
                              <button
                                key={swatch.color}
                                type="button"
                                onClick={() => setConfig((prev) => ({ ...prev, ctaBadgeBgColor: swatch.color }))}
                                title={swatch.label}
                                className={`w-6 h-6 rounded-full border transition-all cursor-pointer shadow-2xs ${
                                  (config.ctaBadgeBgColor || '').toLowerCase() === swatch.color.toLowerCase()
                                    ? 'ring-2 ring-slate-900 ring-offset-1 scale-110'
                                    : 'border-slate-300 hover:scale-105'
                                }`}
                                style={{ backgroundColor: swatch.color }}
                              />
                            ))}
                            <div className="relative flex items-center ml-1">
                              <input
                                type="color"
                                value={config.ctaBadgeBgColor || '#F59E0B'}
                                onChange={(e) => setConfig((prev) => ({ ...prev, ctaBadgeBgColor: e.target.value }))}
                                className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                                title="Custom CTA Background Color"
                              />
                            </div>
                          </div>
                        </div>

                        {/* CTA Badge Text Color */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                            <span>Badge Text Color</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {config.ctaBadgeTextColor || 'Theme Default'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                              { label: 'Pure White', color: '#FFFFFF' },
                              { label: 'Jet Black', color: '#0F172A' },
                              { label: 'Deep Amber', color: '#78350F' },
                              { label: 'Dark Maroon', color: '#7F1D1D' },
                              { label: 'Soft Cream', color: '#FFFBEB' },
                              { label: 'Light Gold', color: '#FDE68A' }
                            ].map((swatch) => (
                              <button
                                key={swatch.color}
                                type="button"
                                onClick={() => setConfig((prev) => ({ ...prev, ctaBadgeTextColor: swatch.color }))}
                                title={swatch.label}
                                className={`w-6 h-6 rounded-full border transition-all cursor-pointer shadow-2xs ${
                                  (config.ctaBadgeTextColor || '').toLowerCase() === swatch.color.toLowerCase()
                                    ? 'ring-2 ring-slate-900 ring-offset-1 scale-110'
                                    : 'border-slate-300 hover:scale-105'
                                }`}
                                style={{ backgroundColor: swatch.color }}
                              />
                            ))}
                            <div className="relative flex items-center ml-1">
                              <input
                                type="color"
                                value={config.ctaBadgeTextColor || '#FFFFFF'}
                                onChange={(e) => setConfig((prev) => ({ ...prev, ctaBadgeTextColor: e.target.value }))}
                                className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                                title="Custom CTA Text Color"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep('branding')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Back to Branding
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep('finetune')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Next: Fine-Tune <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 5: FINE TUNING & FREE OFFSETS
               ------------------------------------------------------------- */}
            {activeStep === 'finetune' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    Step 5: Free Placement & Pro Finishes
                  </h3>
                </div>

                {/* Card Background Opacity & Frosted Glass (ss2) */}
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Card Background Opacity & Frosted Glass
                    </label>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {config.cardBgOpacity ?? 80}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={config.cardBgOpacity ?? 80}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setConfig((prev) => ({ ...prev, cardBgOpacity: val }));
                    }}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    {[
                      { label: 'Solid', val: 100 },
                      { label: 'Frosted', val: 80 },
                      { label: 'Translucent', val: 55 },
                      { label: 'Sheer', val: 25 },
                      { label: 'Clear', val: 0 }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, cardBgOpacity: preset.val }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                          (config.cardBgOpacity ?? 80) === preset.val
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free Offsets & Sizing for Rectangular Boxes (Header & Footer) */}
                <div className="space-y-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 block">Header & Footer Size & Positioning</span>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, headerScale: 100, footerScale: 100, headerOffsetY: 0, footerOffsetY: 0 }))}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Size Scaling Sliders */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-600 font-semibold">Header Size</span>
                        <span className="text-[10px] font-mono text-slate-800 font-bold">{config.headerScale ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="150"
                        step="5"
                        value={config.headerScale ?? 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, headerScale: val }));
                        }}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-600 font-semibold">Footer Size</span>
                        <span className="text-[10px] font-mono text-slate-800 font-bold">{config.footerScale ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="150"
                        step="5"
                        value={config.footerScale ?? 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, footerScale: val }));
                        }}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Y-Position Sliders */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block mb-1">Header Y: {config.headerOffsetY || 0}px</span>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={config.headerOffsetY || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, headerOffsetY: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block mb-1">Footer Y: {config.footerOffsetY || 0}px</span>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={config.footerOffsetY || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, footerOffsetY: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Free Offsets for QR Card */}
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-800 block">Center QR Placement (X / Y)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block mb-1">QR X: {config.qrOffsetX || 0}px</span>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={config.qrOffsetX || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, qrOffsetX: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block mb-1">QR Y: {config.qrOffsetY || 0}px</span>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={config.qrOffsetY || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, qrOffsetY: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Top Badge & Footer Pill Visibility Quick Actions (SS2) */}
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-800 block">Badges & Callouts Visibility (SS2)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-700">Top Callout Badge</span>
                      <button
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, hideTopBadge: !prev.hideTopBadge }))}
                        className={`text-[9px] px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                          config.hideTopBadge
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        {config.hideTopBadge ? 'Restore' : 'Delete / Hide'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-700">Footer Table Pill</span>
                      <button
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, hideFooterBadge: !prev.hideFooterBadge }))}
                        className={`text-[9px] px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                          config.hideFooterBadge
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        {config.hideFooterBadge ? 'Restore' : 'Delete / Hide'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Free Offsets for Orbiting Circular Dishes (ss2) */}
                {config.studioLayout === 'corner_bowls' && (
                  <div className="space-y-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block">Orbit Circular Dishes Placement</span>
                    
                    {/* Orbit 1 */}
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700">Orbit Dish 1 (Top-Right): X {config.orbitDish1X || 0}px / Y {config.orbitDish1Y || 0}px</span>
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, hideOrbitDish1: !prev.hideOrbitDish1 }))}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-all ${
                            config.hideOrbitDish1
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {config.hideOrbitDish1 ? 'Restore' : 'Delete / Hide'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="range"
                          min="-60"
                          max="60"
                          value={config.orbitDish1X || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setConfig((prev) => ({ ...prev, orbitDish1X: val }));
                          }}
                          className="w-full accent-slate-900 cursor-pointer"
                          title="Dish 1 X"
                        />
                        <input
                          type="range"
                          min="-60"
                          max="60"
                          value={config.orbitDish1Y || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setConfig((prev) => ({ ...prev, orbitDish1Y: val }));
                          }}
                          className="w-full accent-slate-900 cursor-pointer"
                          title="Dish 1 Y"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Scale / Size:</span>
                        <span className="font-mono font-bold text-slate-800">{config.orbitDish1Scale ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        step="5"
                        value={config.orbitDish1Scale ?? 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, orbitDish1Scale: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>

                    {/* Orbit 2 */}
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700">Orbit Dish 2 (Bottom-Left): X {config.orbitDish2X || 0}px / Y {config.orbitDish2Y || 0}px</span>
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, hideOrbitDish2: !prev.hideOrbitDish2 }))}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-all ${
                            config.hideOrbitDish2
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {config.hideOrbitDish2 ? 'Restore' : 'Delete / Hide'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="range"
                          min="-60"
                          max="60"
                          value={config.orbitDish2X || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setConfig((prev) => ({ ...prev, orbitDish2X: val }));
                          }}
                          className="w-full accent-slate-900 cursor-pointer"
                          title="Dish 2 X"
                        />
                        <input
                          type="range"
                          min="-60"
                          max="60"
                          value={config.orbitDish2Y || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setConfig((prev) => ({ ...prev, orbitDish2Y: val }));
                          }}
                          className="w-full accent-slate-900 cursor-pointer"
                          title="Dish 2 Y"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Scale / Size:</span>
                        <span className="font-mono font-bold text-slate-800">{config.orbitDish2Scale ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        step="5"
                        value={config.orbitDish2Scale ?? 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, orbitDish2Scale: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>

                    {/* Orbit 3 */}
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700">Orbit Dish 3 (Bottom-Right): X {config.orbitDish3X || 0}px / Y {config.orbitDish3Y || 0}px</span>
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, hideOrbitDish3: !prev.hideOrbitDish3 }))}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-all ${
                            config.hideOrbitDish3
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {config.hideOrbitDish3 ? 'Restore' : 'Delete / Hide'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="range"
                          min="-60"
                          max="60"
                          value={config.orbitDish3X || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setConfig((prev) => ({ ...prev, orbitDish3X: val }));
                          }}
                          className="w-full accent-slate-900 cursor-pointer"
                          title="Dish 3 X"
                        />
                        <input
                          type="range"
                          min="-60"
                          max="60"
                          value={config.orbitDish3Y || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setConfig((prev) => ({ ...prev, orbitDish3Y: val }));
                          }}
                          className="w-full accent-slate-900 cursor-pointer"
                          title="Dish 3 Y"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Scale / Size:</span>
                        <span className="font-mono font-bold text-slate-800">{config.orbitDish3Scale ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        step="5"
                        value={config.orbitDish3Scale ?? 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, orbitDish3Scale: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 3D Platter Options (When table tent classic) */}
                {config.studioLayout === 'table_tent_classic' && (
                  <>
                    <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">3D Platter Scale & Visibility</span>
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, hideCenterDish: !prev.hideCenterDish }))}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                            config.hideCenterDish
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {config.hideCenterDish ? 'Restore Platter' : 'Delete / Hide'}
                        </button>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Platter Zoom:</span>
                        <span className="font-mono font-bold text-slate-800">{config.dishZoom ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="140"
                        step="5"
                        value={config.dishZoom ?? 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, dishZoom: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">3D Platter Tilt Angle</span>
                        <span className="text-slate-500 font-mono">{config.dish3dTilt ?? 6}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="16"
                        step="1"
                        value={config.dish3dTilt ?? 6}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({ ...prev, dish3dTilt: val }));
                        }}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>0° Flat</span>
                        <span>8° Natural</span>
                        <span>16° Deep 3D</span>
                      </div>
                    </div>

                    <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-800 block">3D Dish Placement (X / Y)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium block mb-1">Offset X: {config.dishOffsetX || 0}px</span>
                          <input
                            type="range"
                            min="-60"
                            max="60"
                            value={config.dishOffsetX || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setConfig((prev) => ({ ...prev, dishOffsetX: val }));
                            }}
                            className="w-full accent-slate-900 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium block mb-1">Offset Y: {config.dishOffsetY || 0}px</span>
                          <input
                            type="range"
                            min="-60"
                            max="60"
                            value={config.dishOffsetY || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setConfig((prev) => ({ ...prev, dishOffsetY: val }));
                            }}
                            className="w-full accent-slate-900 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Spacing density */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Card Spacing & Padding
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'spacious', label: 'Spacious' },
                      { id: 'balanced', label: 'Balanced' },
                      { id: 'compact', label: 'Compact' }
                    ].map((sp) => {
                      const isSelected = (config.canvasSpacing || 'spacious') === sp.id;
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, canvasSpacing: sp.id as any }))}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {sp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>


                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep('quote')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Back to Quotes
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save & Finish
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* =============================================================
            PANEL 2 (Cols 7): LIVE CANAVAS HERO STAGE & PRODUCTION EXPORT
           ============================================================= */}
        <div className="lg:col-span-7 flex flex-col bg-slate-100/75 p-5 justify-between relative overflow-hidden">
          
          {/* Stage Top Control Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs z-20">
            
            {/* Aspect Ratio Toggles */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {ASPECT_RATIO_OPTIONS.map((ratio) => {
                const isActive = (config.aspectRatio || '4x6') === ratio.id;
                return (
                  <button
                    key={ratio.id}
                    type="button"
                    onClick={() => handleSelectAspectRatio(ratio.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ratio.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Table Switcher Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Preview:</span>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer shadow-2xs"
              >
                {effectiveTables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Standee Mockup Toggle & Zoom */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSimulateStandee((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                  simulateStandee
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Toggle physical acrylic table tent standee frame simulation"
              >
                <Eye className="w-3 h-3" />
                <span>Standee Mockup</span>
              </button>

              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(0.65, prev - 0.08))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono px-1 font-bold text-slate-700">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(1.25, prev + 0.08))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Centered Canvas Container with Acrylic Standee Simulation */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 overflow-auto">
            <div 
              className="relative flex flex-col items-center transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'center center'
              }}
            >
              {/* Optional Acrylic Standee Frame Mockup */}
              {simulateStandee ? (
                <div className="relative p-3.5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/80 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] flex flex-col items-center ring-1 ring-slate-900/5">
                  {/* Subtle top acrylic glare highlight */}
                  <div className="absolute inset-x-6 top-1.5 h-0.5 bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none" />
                  {/* Diagonal light reflection across acrylic face */}
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />

                  {/* The Live Rendered QR Card */}
                  <QRCardRenderer
                    config={config}
                    tableName={activeTable.name}
                    directUrl={canonicalQRUrl}
                    previewScale={1}
                    showSafeZone={showSafeZone}
                    containerRef={canvasContainerRef}
                  />

                  {/* Physical Acrylic Table Standee Base with Reflection Slot */}
                  <div 
                    className="w-[110%] h-4 rounded-b-xl mt-1.5 shadow-[0_12px_24px_-4px_rgba(0,0,0,0.3)] flex items-center justify-center border-t border-white/60 bg-gradient-to-b from-white/90 via-slate-100 to-slate-200 relative overflow-hidden backdrop-blur-md pointer-events-none"
                  >
                    <div className="w-24 h-1 rounded-full bg-slate-900/15 shadow-inner" />
                  </div>
                  {/* Ambient drop shadow under standee foot */}
                  <div className="w-[115%] h-2 bg-black/20 blur-md rounded-full -mt-0.5 pointer-events-none" />
                </div>
              ) : (
                <QRCardRenderer
                  config={config}
                  tableName={activeTable.name}
                  directUrl={canonicalQRUrl}
                  previewScale={1}
                  showSafeZone={showSafeZone}
                  containerRef={canvasContainerRef}
                />
              )}
            </div>
          </div>

          {/* Bottom Stage Production Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-xs z-20">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">
                Live 300 DPI Rendering
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">
                Ready for high-res table tent print
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintSingle}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                title="Print current table standee"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Table</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSingle}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                title="Download 300 DPI PNG file for this table"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
