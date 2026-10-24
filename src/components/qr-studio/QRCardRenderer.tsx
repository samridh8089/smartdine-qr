'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Utensils, Sparkles, Smartphone, Clock, Wifi, Globe, Phone, ShieldCheck, Leaf, MessageSquare, Coffee, Compass, Wine, LayoutGrid, Sliders, Flower2 } from 'lucide-react';
import { QRDesignConfig, QRAspectRatio } from './types';
import { generateStyledQRDataURL } from './qrGenerator';
import { TEXTURE_PATTERNS } from './textures';
import { QR_THEMES_CONFIG, ASPECT_RATIO_OPTIONS } from './qrThemesConfig';

interface QRCardRendererProps {
  config: QRDesignConfig;
  tableName?: string; // e.g. "Table 4" or "12"
  directUrl?: string; // e.g. "https://www.cleverops.in/menu/slug/tbl/uuid"
  previewScale?: number; // 0.5 to 1.5
  className?: string;
  showSafeZone?: boolean;
  interactive?: boolean;
  aspectRatioOverride?: QRAspectRatio;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const QRCardRenderer: React.FC<QRCardRendererProps> = ({
  config,
  tableName = '12',
  directUrl = 'https://www.cleverops.in/menu/demo/table/12',
  previewScale = 1,
  className = '',
  showSafeZone = false,
  interactive = false,
  aspectRatioOverride,
  containerRef
}) => {
  // 1. Hooks strictly declared at top (CleverOps Guardrail compliance)
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const activeTheme = useMemo(() => {
    const subCat = config.subCategory || 'rajasthani_thali';
    return QR_THEMES_CONFIG[subCat] || QR_THEMES_CONFIG['rajasthani_thali'];
  }, [config.subCategory]);

  const activeHeroImage = useMemo(() => {
    // 1. Table-specific explicit override if available
    if (config.tableImageOverrides) {
      const rawNum = tableName.replace(/^Table\s*/i, '').trim();
      const assigned =
        config.tableImageOverrides[tableName] ||
        config.tableImageOverrides[rawNum] ||
        config.tableImageOverrides[`Table ${rawNum}`];
      if (assigned && !assigned.includes('images.unsplash.com')) return assigned;
    }

    // 2. Custom uploaded dish URL
    if (config.customDishUrl) return config.customDishUrl;

    const presets = activeTheme.dishPresets || [];

    // 3. Dynamic per-table distinct food rotation (SS4)
    // If table has a number > 1 (Table 2, Table 3, etc.), rotate dishes automatically so each table has a distinct picture!
    const tableDigits = tableName.replace(/\D/g, '');
    const tableNum = parseInt(tableDigits, 10);
    if (!isNaN(tableNum) && tableNum > 1 && presets.length > 0) {
      const baseIdx = (typeof config.selectedDishIndex === 'number' && config.selectedDishIndex >= 0) ? config.selectedDishIndex : 0;
      const rotatedIdx = (baseIdx + tableNum - 1) % presets.length;
      if (presets[rotatedIdx]?.imageUrl && !presets[rotatedIdx].imageUrl.includes('images.unsplash.com')) {
        return presets[rotatedIdx].imageUrl;
      }
    }

    // 4. Sub-category dish preset by index
    const dishIdx = config.selectedDishIndex ?? 0;
    if (presets && presets[dishIdx] && !presets[dishIdx].imageUrl.includes('images.unsplash.com')) {
      return presets[dishIdx].imageUrl;
    }
    return presets[0]?.imageUrl || '/dish-presets/3d/rajasthani_thali_3d.png';
  }, [
    config.tableImageOverrides,
    tableName,
    config.customDishUrl,
    config.selectedDishIndex,
    activeTheme,
    config.background.imageUrl
  ]);

  const activeCulturalBg = useMemo(() => {
    if (config.customCulturalBgUrl) return config.customCulturalBgUrl;
    if (config.selectedCulturalBgIndex === -1) return '';
    const idx = config.selectedCulturalBgIndex ?? 0;
    if (activeTheme.culturalBackgrounds && activeTheme.culturalBackgrounds[idx]) {
      return activeTheme.culturalBackgrounds[idx].imageUrl;
    }
    return activeTheme.culturalBackgrounds?.[0]?.imageUrl || '';
  }, [config.customCulturalBgUrl, config.selectedCulturalBgIndex, activeTheme]);

  const gridImages = useMemo(() => {
    const presets = activeTheme.dishPresets || [];
    const tableDigits = tableName.replace(/\D/g, '');
    const tableNum = parseInt(tableDigits, 10);
    const offset = (!isNaN(tableNum) && tableNum > 0) ? (tableNum - 1) : 0;

    const sanitizeUrl = (url: string | undefined, fallback: string) => {
      if (!url || url.includes('images.unsplash.com')) return fallback;
      return url;
    };

    const p0 = presets.length > 0 ? presets[offset % presets.length]?.imageUrl : '/dish-presets/3d/rajasthani_thali_3d.png';
    const p1 = presets.length > 1 ? presets[(offset + 1) % presets.length]?.imageUrl : '/dish-presets/3d/dhaba_chai_samosa_3d.png';
    const p2 = presets.length > 2 ? presets[(offset + 2) % presets.length]?.imageUrl : '/dish-presets/3d/north_indian_paneer_tikka_3d.png';

    const d0 = sanitizeUrl(config.gridDishImages?.[0] || activeHeroImage, sanitizeUrl(p0, '/dish-presets/3d/rajasthani_thali_3d.png'));
    const d1 = sanitizeUrl(config.gridDishImages?.[1], sanitizeUrl(p1, '/dish-presets/3d/dhaba_chai_samosa_3d.png'));
    const d2 = sanitizeUrl(config.gridDishImages?.[2], sanitizeUrl(p2, '/dish-presets/3d/north_indian_paneer_tikka_3d.png'));

    // 1. Explicit per-table image override
    if (config.tableImageOverrides && config.tableImageOverrides[tableName]) {
      const explicit = config.tableImageOverrides[tableName];
      return [sanitizeUrl(explicit, d0), sanitizeUrl(d1, p1), sanitizeUrl(d2, p2)];
    }

    // 2. Dynamic rotation for subsequent tables on /dashboard/tables (Table 2, Table 3, Table 4...)
    if (!isNaN(tableNum) && tableNum > 1 && presets.length > 0) {
      return [sanitizeUrl(p0, p0), sanitizeUrl(p1, p1), sanitizeUrl(p2, p2)];
    }

    // 3. Studio preview / Table 1: use explicit gridDishImages so user can change Orbit 1, 2, and 3!
    return [d0, d1, d2];
  }, [config.gridDishImages, config.tableImageOverrides, activeTheme, activeHeroImage, tableName]);

  const effectiveAspectRatio = useMemo(() => {
    const targetRatio = aspectRatioOverride || config.aspectRatio || '4x6';
    const match = ASPECT_RATIO_OPTIONS.find((opt) => opt.id === targetRatio);
    return match || ASPECT_RATIO_OPTIONS[0];
  }, [aspectRatioOverride, config.aspectRatio]);

  const resolvedTableName = useMemo(() => {
    const rawFormat = config.text.tableNameFormat || 'Table {{table_name}}';
    if (rawFormat.includes('{{table_name}}')) {
      return rawFormat.replace(/\{\{table_name\}\}/g, tableName.replace(/^Table\s*/i, ''));
    }
    return `${rawFormat} ${tableName.replace(/^Table\s*/i, '')}`;
  }, [config.text.tableNameFormat, tableName]);

  useEffect(() => {
    let isMounted = true;

    async function loadQR() {
      const data = await generateStyledQRDataURL({
        url: directUrl,
        appearance: {
          ...config.qr,
          fgColor: config.qr.fgColor || activeTheme.colors.qrFg,
          bgColor: config.qr.bgColor || activeTheme.colors.qrBg
        },
        logoUrl: config.logo?.enabled ? config.logo.url : undefined,
        scale: 2.5
      });
      if (isMounted) {
        setQrDataUrl(data);
      }
    }

    loadQR();
    return () => {
      isMounted = false;
    };
  }, [
    directUrl, 
    config.qr, 
    config.logo?.enabled, 
    config.logo?.url,
    activeTheme.colors.qrFg,
    activeTheme.colors.qrBg
  ]);

  // Derived style variables
  const layout = config.studioLayout || 'table_tent_classic';
  const widthPx = effectiveAspectRatio.baseWidth * previewScale;
  const heightPx = effectiveAspectRatio.baseHeight * previewScale;
  const isSticker = effectiveAspectRatio.id === '3x3';

  // Smart QR auto-shift positioning
  const qrPositionClass = useMemo(() => {
    const mode = config.qrPositionMode || 'auto';
    if (mode === 'top') return 'mt-1 mb-auto py-1';
    if (mode === 'bottom') return 'mt-auto mb-1 py-1';
    if (mode === 'center') return 'my-auto py-1';
    // 'auto' mode: auto-shift upward when cutout food photo is active at the bottom
    return config.heroDisplayMode === 'cutout' && !isSticker ? 'mt-1 mb-auto py-1' : 'my-auto py-1';
  }, [config.qrPositionMode, config.heroDisplayMode, isSticker]);

  // Background styling
  const bgTexture = config.bgTextureStyle || config.background.type || 'gradient';
  let bgStyles: React.CSSProperties = {};

  if (bgTexture === 'gradient') {
    const angle = config.background.gradientAngle || activeTheme.bgStyle.gradientAngle || 145;
    const start = config.background.gradientStart || activeTheme.bgStyle.gradientStart || activeTheme.colors.primary;
    const end = config.background.gradientEnd || activeTheme.bgStyle.gradientEnd || '#111827';
    bgStyles = {
      background: `linear-gradient(${angle}deg, ${start}, ${end})`
    };
  } else if (bgTexture === 'solid') {
    bgStyles = {
      backgroundColor: config.background.color || activeTheme.colors.primary
    };
  } else {
    // Texture pattern (wood, marble, chalkboard, kraft_paper, etc.)
    const patternKey = bgTexture === 'custom_image' ? 'none' : bgTexture;
    const patternUrl = TEXTURE_PATTERNS[patternKey] || TEXTURE_PATTERNS[activeTheme.bgStyle.texture] || '';
    bgStyles = {
      backgroundColor: config.background.color || activeTheme.colors.primary,
      backgroundImage: patternUrl,
      backgroundSize: patternKey === 'wood' ? '120px 120px' : patternKey === 'chalkboard' ? '160px 160px' : 'auto'
    };
  }

  // Frame Styles
  const frameBorderWidth = Math.max(1, Math.round((config.frame.width || 2) * previewScale));
  const frameBorderColor = config.frame.color || activeTheme.colors.qrFrame || '#D4AF37';

  // Dietary Badge Element
  const renderDietaryBadge = (scale = 1) => {
    const type = config.dietaryBadge || 'veg';
    if (type === 'none') return null;

    if (type === 'veg') {
      return (
        <div 
          className="inline-flex items-center justify-center border-2 border-emerald-600 bg-white rounded-sm shrink-0 shadow-xs"
          style={{ width: `${16 * previewScale * scale}px`, height: `${16 * previewScale * scale}px` }}
          title="100% Pure Vegetarian"
        >
          <div 
            className="rounded-full bg-emerald-600" 
            style={{ width: `${8 * previewScale * scale}px`, height: `${8 * previewScale * scale}px` }} 
          />
        </div>
      );
    }

    if (type === 'non_veg') {
      return (
        <div 
          className="inline-flex items-center justify-center border-2 border-red-700 bg-white rounded-sm shrink-0 shadow-xs"
          style={{ width: `${16 * previewScale * scale}px`, height: `${16 * previewScale * scale}px` }}
          title="Non-Vegetarian"
        >
          <div 
            className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-red-700" 
            style={{
              borderLeftWidth: `${4 * previewScale * scale}px`,
              borderRightWidth: `${4 * previewScale * scale}px`,
              borderBottomWidth: `${8 * previewScale * scale}px`
            }}
          />
        </div>
      );
    }

    if (type === 'vegan') {
      return (
        <div 
          className="inline-flex items-center gap-1 bg-emerald-600/90 text-white rounded-full font-bold uppercase tracking-wider shrink-0 shadow-xs backdrop-blur-xs"
          style={{ 
            fontSize: `${9 * previewScale * scale}px`, 
            padding: `${2 * previewScale * scale}px ${6 * previewScale * scale}px` 
          }}
          title="100% Vegan"
        >
          <Leaf className="shrink-0" style={{ width: `${9 * previewScale * scale}px`, height: `${9 * previewScale * scale}px` }} />
          <span>Vegan</span>
        </div>
      );
    }

    return null;
  };

  // Safe QR Quiet Zone Box
  const renderQRCard = (qrBoxSize = 180, ctaBadge = true) => {
    const baseSize = config.qrCardSize || qrBoxSize;
    const finalSize = baseSize * previewScale;
    const padding = (config.qr.padding || 8) * previewScale;
    const radius = (config.qr.borderRadius || 16) * previewScale;
    const ctaText = config.ctaBadgeText || config.text.badgeText || 'SCAN FOR MENU';
    const qrFreeX = (config.qrOffsetX || 0) * previewScale;
    const qrFreeY = (config.qrOffsetY || 0) * previewScale;

    return (
      <div 
        className="relative flex flex-col items-center justify-center shrink-0 transition-transform duration-200"
        style={{
          transform: `translate(${qrFreeX}px, ${qrFreeY}px)`
        }}
      >
        {/* Canva Safe Zone Indicator */}
        {showSafeZone && (
          <div 
            className="absolute -inset-3 border-2 border-dashed border-red-500 rounded-2xl pointer-events-none flex items-center justify-center animate-pulse z-30"
          >
            <span className="absolute -top-3.5 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
              Safe Quiet Zone
            </span>
          </div>
        )}

        {/* Funny Desi Scan Quote Banner / Speech Bubble (Frosted Glass & Blur - SS3) */}
        {config.funnyQuote && (() => {
          const quoteLen = config.funnyQuote.length;
          const dynamicFontSize = quoteLen > 38 ? 8 * previewScale : quoteLen > 24 ? 8.8 * previewScale : 9.5 * previewScale;
          const qBlur = config.funnyQuoteBlur ?? 8;
          const qOpacity = (config.funnyQuoteOpacity ?? 90) / 100;
          
          let quoteBg = config.funnyQuoteBgColor || '#FEF08A';
          if (quoteBg.startsWith('#') && quoteBg.length >= 7) {
            const r = parseInt(quoteBg.substring(1, 3), 16) || 0;
            const g = parseInt(quoteBg.substring(3, 5), 16) || 0;
            const b = parseInt(quoteBg.substring(5, 7), 16) || 0;
            quoteBg = `rgba(${r}, ${g}, ${b}, ${qOpacity})`;
          }

          return (
            <div
              className={`relative -mb-1.5 z-30 px-3 py-1 font-black tracking-tight text-center border transition-all whitespace-normal text-balance max-w-[94%] leading-tight ${
                config.funnyQuoteStyle === 'speech_bubble'
                  ? 'rounded-2xl shadow-xl'
                  : config.funnyQuoteStyle === 'comic_banner'
                  ? 'rounded-none uppercase transform -rotate-1 shadow-lg'
                  : 'rounded-full shadow-lg'
              }`}
              style={{
                backgroundColor: quoteBg,
                backdropFilter: `blur(${qBlur}px)`,
                WebkitBackdropFilter: `blur(${qBlur}px)`,
                color: config.funnyQuoteTextColor || '#854D0E',
                borderColor: config.funnyQuoteTextColor ? `${config.funnyQuoteTextColor}33` : '#F59E0B',
                fontSize: `${dynamicFontSize}px`,
                boxShadow: '0 4px 14px rgba(0,0,0,0.22)'
              }}
              title={config.funnyQuote}
            >
              &quot;{config.funnyQuote}&quot;
              {config.funnyQuoteStyle === 'speech_bubble' && (
                <div 
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-6"
                  style={{ borderTopColor: quoteBg }}
                />
              )}
            </div>
          );
        })()}

        {/* Top Curved / Floating Pill Badge */}
        {ctaBadge && config.ctaBadgeMode !== 'nil' && (
          <div
            className="relative -mb-3 z-20 px-3.5 py-1 rounded-full shadow-md font-extrabold tracking-wider uppercase text-center border whitespace-nowrap transition-all"
            style={{
              backgroundColor: config.ctaBadgeBgColor || activeTheme.colors.secondary,
              color: config.ctaBadgeTextColor || activeTheme.colors.primary,
              borderColor: config.ctaBadgeBgColor ? `${config.ctaBadgeBgColor}88` : activeTheme.colors.accent,
              fontSize: `${10 * previewScale}px`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
            }}
          >
            {config.ctaBadgeText || ctaText}
          </div>
        )}

        {/* White / High-Contrast Locked QR Card */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all shadow-xl"
          style={{
            width: `${finalSize}px`,
            height: `${finalSize}px`,
            padding: `${padding}px`,
            backgroundColor: config.qr.bgColor || '#FFFFFF',
            borderRadius: `${radius}px`,
            border: `${config.qr.frameThickness ? config.qr.frameThickness * previewScale : 2}px solid ${config.qr.frameColor || activeTheme.colors.qrFrame}`,
            boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.35)'
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Table QR Code"
              className="w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Image zoom and offset transforms
  const imgZoom = (config.heroImageZoom || 100) / 100;
  const imgX = (config.heroOffsetX || 0) * previewScale;
  const imgY = (config.heroOffsetY || 0) * previewScale;
  const blurVal = config.bgBlur || 0;
  const overlayOp = (config.bgOverlayOpacity ?? 35) / 100;
  const overlayColor = config.bgOverlayColor || '#000000';

  return (
    <div
      ref={containerRef as any}
      id="smartdine-qr-canvas-container"
      className={`relative select-none flex flex-col justify-between overflow-hidden shadow-2xl transition-all ${className}`}
      style={{
        ...bgStyles,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        aspectRatio: effectiveAspectRatio.cssAspect,
        border: `${frameBorderWidth}px solid ${frameBorderColor}`,
        borderRadius: isSticker ? '9999px' : `${20 * previewScale}px`,
        boxSizing: 'border-box'
      }}
    >
      {/* 0. CULTURAL / ATMOSPHERE THEME BACKGROUND LAYER */}
      {activeCulturalBg && config.heroDisplayMode !== 'wallpaper' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <img
            src={activeCulturalBg}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
            }}
            className="w-full h-full object-cover transition-transform duration-300"
            style={{
              filter: `blur(${blurVal}px)`,
              transform: 'scale(1.04)'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.7) 100%)'
            }}
          />
        </div>
      )}

      {/* 1. FULL BACKGROUND WALLPAPER MODE */}
      {config.heroDisplayMode === 'wallpaper' && activeHeroImage && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <img
            src={activeHeroImage}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/dish-presets/3d/rajasthani_thali_3d.png';
            }}
            className="w-full h-full object-cover transition-transform duration-300"
            style={{
              filter: `blur(${blurVal}px)`,
              transform: `scale(${imgZoom}) translate(${imgX}px, ${imgY}px)`
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: overlayColor,
              opacity: overlayOp
            }}
          />
        </div>
      )}

      {/* 2. AMBIENT LIGHTING OVERLAY */}
      {config.lighting?.vignette && (
        <div
          className="absolute inset-0 pointer-events-none z-1"
          style={{
            background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.55) 100%)'
          }}
        />
      )}
      {config.lighting?.spotlight && (
        <div
          className="absolute inset-0 pointer-events-none z-1"
          style={{
            background: 'radial-gradient(circle at 50% 15%, rgba(255,255,255,0.2) 0%, transparent 70%)'
          }}
        />
      )}

      {/* =========================================================================
          LAYOUT 1: 3D TABLE TENT CLASSIC
         ========================================================================= */}
      {layout === 'table_tent_classic' && (() => {
        const isSpacious = (config.canvasSpacing || 'spacious') === 'spacious';
        const paddingClass = isSpacious ? 'p-4.5' : config.canvasSpacing === 'compact' ? 'p-2.5' : 'p-3.5';
        const order = config.elementOrder || 'header_qr_dish';

        // 1. Header Section
        const renderHeader = () => (
          <div key="header" className="w-full flex flex-col items-center text-center pt-1 px-3 shrink-0">
            <div className="flex items-center justify-center gap-2 mb-1">
              {config.logo.enabled && config.logo.url && (
                <div
                  className="rounded-full bg-white p-1 shadow-md overflow-hidden shrink-0"
                  style={{
                    width: `${34 * previewScale}px`,
                    height: `${34 * previewScale}px`
                  }}
                >
                  <img src={config.logo.url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              {renderDietaryBadge()}
            </div>

            <h2
              className="font-bold tracking-tight truncate w-full drop-shadow-md"
              style={{
                fontFamily: activeTheme.typography.headingFont,
                color: activeTheme.colors.text,
                fontSize: `${16 * previewScale}px`,
                lineHeight: 1.2
              }}
            >
              {config.text.restaurantName || 'SmartDine Restaurant'}
            </h2>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full mt-1 font-black uppercase tracking-wider shadow-sm border border-white/20"
              style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                color: activeTheme.colors.secondary,
                fontSize: `${11 * previewScale}px`
              }}
            >
              <Utensils className="h-2.5 w-2.5" />
              <span>{resolvedTableName}</span>
            </div>

            {config.tagline && (
              <p
                className="text-xs mt-1 truncate max-w-[90%] opacity-80 italic drop-shadow-xs"
                style={{
                  color: activeTheme.colors.text,
                  fontSize: `${9 * previewScale}px`
                }}
              >
                {config.tagline}
              </p>
            )}
          </div>
        );

        // 2. Center QR Section
        const renderQR = () => (
          <div key="qr" className={`${qrPositionClass} flex items-center justify-center my-auto shrink-0`}>
            {renderQRCard(isSticker ? 155 : isSpacious ? 165 : 175, true)}
          </div>
        );

        // 3. 3D Floating Dish Showcase
        const renderDish = () => {
          if (config.hideCenterDish || !activeHeroImage || isSticker || config.heroDisplayMode === 'wallpaper') return null;

          const presets = activeTheme.dishPresets || [];
          const tableDigits = tableName.replace(/\D/g, '');
          const tableNum = parseInt(tableDigits, 10);
          const offset = (!isNaN(tableNum) && tableNum > 0) ? (tableNum - 1) : 0;
          const dishPreset = presets.length > 0
            ? presets[offset % presets.length]
            : (typeof config.selectedDishIndex === 'number' ? presets[config.selectedDishIndex] : null);
          const dishName = dishPreset?.name || 'Chef Special';

          const freeX = (config.dishOffsetX || 0) * previewScale;
          const freeY = (config.dishOffsetY || 0) * previewScale;
          const freeScale = ((config.dishScale || 100) / 100) * ((config.dishZoom || 100) / 100) * imgZoom;
          const tiltDeg = config.dish3dTilt ?? 6;
          const rimMode = config.dish3dMode || 'floating_plate';
          const isCutout = config.orbitDishStyle === 'transparent_cutout' || (rimMode as string) === 'cutout_banner';

          // Seamless Borderless 3D Cutout Floating Mode (Fixed SS2 - No circular plate clipping)
          if (isCutout) {
            return (
              <div 
                key="dish"
                className="relative w-full flex flex-col items-center justify-center shrink-0 z-15 transition-all"
                style={{ 
                  transform: `translate(${freeX}px, ${freeY}px) scale(${freeScale})`,
                  transformOrigin: 'center bottom',
                  margin: isSpacious ? '4px 0' : '0'
                }}
              >
                <div
                  className="relative transition-all mx-auto shrink-0 flex items-center justify-center"
                  style={{
                    width: `${(isSpacious ? 134 : 116) * previewScale}px`,
                    height: `${(isSpacious ? 112 : 96) * previewScale}px`,
                    filter: 'drop-shadow(0 14px 18px rgba(0,0,0,0.85))'
                  }}
                >
                  <img
                    src={activeHeroImage}
                    alt={dishName}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/dish-presets/3d/rajasthani_thali_3d.png';
                    }}
                    className="w-full h-full object-contain transition-transform duration-300"
                  />
                  {/* Floating Dish Name Pill */}
                  <div className="absolute -bottom-1 inset-x-2 flex items-center justify-center pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full bg-slate-950/90 text-white font-extrabold text-[8px] uppercase tracking-wide border border-amber-400/60 shadow-md truncate">
                      {dishName}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // 3D Realistic Framed Platter Mode (only if explicitly requested with circular rim)
          let rimBorder = '3.5px solid #D4AF37';
          let rimGlow = '0 24px 38px -8px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.7), 0 0 16px rgba(212,175,55,0.35)';
          if (rimMode === 'ceramic_white') {
            rimBorder = '3.5px solid #FFFFFF';
            rimGlow = '0 22px 35px -8px rgba(0,0,0,0.65), inset 0 2px 5px rgba(255,255,255,0.9)';
          } else if (rimMode === 'slate_stone') {
            rimBorder = '3.5px solid #3F3F46';
            rimGlow = '0 24px 38px -8px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.2)';
          } else if (rimMode === 'terracotta') {
            rimBorder = '3.5px solid #BC6C25';
            rimGlow = '0 22px 35px -8px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.3)';
          }

          const plateHeight = (isSpacious ? 112 : 98) * previewScale;

          return (
            <div 
              key="dish"
              className="relative w-full flex flex-col items-center justify-center shrink-0 z-15 transition-all"
              style={{
                transform: `translate(${freeX}px, ${freeY}px) perspective(700px) rotateX(${tiltDeg}deg) scale(${freeScale})`,
                transformOrigin: 'center bottom',
                margin: isSpacious ? '4px 0' : '0'
              }}
            >
              {/* Soft Ambient Contact Shadow Underneath Plate */}
              <div
                className="absolute -bottom-2 w-[85%] h-5 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 50%, transparent 75%)',
                  filter: 'blur(4px)'
                }}
              />

              {/* 3D Elevated Platter Container (Round 3D Platter as requested in ss5) */}
              <div
                className="relative rounded-full aspect-square overflow-hidden transition-all mx-auto shrink-0 shadow-2xl"
                style={{
                  width: `${(isSpacious ? 116 : 102) * previewScale}px`,
                  height: `${(isSpacious ? 116 : 102) * previewScale}px`,
                  border: rimBorder,
                  boxShadow: rimGlow
                }}
              >
                {/* Hero Food Photography */}
                <img
                  src={activeHeroImage}
                  alt={dishName}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/dish-presets/3d/rajasthani_thali_3d.jpg';
                  }}
                  className="w-full h-full object-cover transition-transform duration-300"
                />

                {/* 3D Specular Light Reflection Arc */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-full"
                  style={{
                    background: 'radial-gradient(ellipse at 35% 20%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 35%, transparent 65%)'
                  }}
                />

                {/* Floating Dish Name Pill */}
                <div className="absolute bottom-1 inset-x-2 flex items-center justify-center pointer-events-none">
                  <span className="px-2 py-0.5 rounded-full bg-slate-950/90 text-white font-extrabold text-[8px] uppercase tracking-wide border border-amber-400/60 shadow-md truncate">
                    {dishName}
                  </span>
                </div>
              </div>
            </div>
          );
        };

        // 4. Footer Section
        const renderFooter = () => (
          <div 
            key="footer"
            className="w-full text-center mt-1 shrink-0 flex items-center justify-center gap-2 opacity-80"
            style={{ color: activeTheme.colors.text, fontSize: `${8.5 * previewScale}px` }}
          >
            {config.openingHours && (
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> {config.openingHours}
              </span>
            )}
            {config.wifiPassword && (
              <span className="flex items-center gap-1">
                <Wifi className="h-2.5 w-2.5" /> {config.wifiPassword}
              </span>
            )}
            <span>•</span>
            <span className="font-semibold">{config.text.footerText || 'Powered by SmartDine'}</span>
          </div>
        );

        // Sequence Ordering based on user layout choice
        const renderOrderedElements = () => {
          switch (order) {
            case 'header_dish_qr':
              return [renderHeader(), renderDish(), renderQR(), renderFooter()];
            case 'qr_dish_header':
              return [renderQR(), renderDish(), renderHeader(), renderFooter()];
            case 'dish_header_qr':
              return [renderDish(), renderHeader(), renderQR(), renderFooter()];
            case 'header_qr_dish':
            default:
              return [renderHeader(), renderQR(), renderDish(), renderFooter()];
          }
        };

        return (
          <div className={`relative z-10 w-full h-full flex flex-col justify-between ${paddingClass}`}>
            {/* Side Vertical "MENU" Banner (Only on taller layouts) */}
            {!isSticker && (
              <div 
                className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center tracking-widest font-black uppercase pointer-events-none opacity-20 select-none z-5"
                style={{
                  fontSize: `${12 * previewScale}px`,
                  color: activeTheme.colors.secondary,
                  writingMode: 'vertical-rl',
                  textOrientation: 'upright'
                }}
              >
                M E N U
              </div>
            )}

            {renderOrderedElements()}
          </div>
        );
      })()}

      {/* =========================================================================
          LAYOUT 2: MULTI-DISH FLOATING ORBIT (Reference 1 Style)
         ========================================================================= */}
      {layout === 'corner_bowls' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-3.5 overflow-hidden">
          {/* Top Arched High-Contrast Restaurant Banner (Glassmorphic / Moveable) */}
          <div 
            className="w-[92%] mx-auto rounded-3xl p-2.5 shadow-md text-center z-15 shrink-0 transition-all border border-amber-300/80"
            style={{
              transform: `translateY(${(config.headerOffsetY || 0) * previewScale}px)`,
              backgroundColor: `rgba(255, 255, 255, ${(config.cardBgOpacity ?? 80) / 100})`,
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <h2
                className="font-black tracking-tight text-slate-900 truncate"
                style={{
                  fontFamily: activeTheme.typography.headingFont,
                  fontSize: `${16 * previewScale}px`
                }}
              >
                {config.text.restaurantName || 'SmartDine'}
              </h2>
              {renderDietaryBadge(0.9)}
            </div>
            <div 
              className="text-[10px] font-bold tracking-wide uppercase"
              style={{ color: activeTheme.colors.secondary }}
            >
              {config.tagline || 'Hot & Delicious • Table ' + resolvedTableName}
            </div>
          </div>

          {/* Starburst "SCAN MENU" Sticker Callout (Top-Left - Editable & Deletable SS2) */}
          {!config.hideTopBadge && (
            <div 
              className="absolute top-18 left-3 z-20 px-2.5 py-1.5 rounded-full font-black text-center shadow-lg border-2 transform -rotate-12 pointer-events-none"
              style={{
                backgroundColor: '#9A3412',
                borderColor: '#FED7AA',
                color: '#FFF7ED',
                fontSize: `${9 * previewScale}px`
              }}
            >
              {config.topBadgeText || 'SCAN MENU'}
              <div className="text-[7.5px] opacity-80 font-normal">
                {config.topBadgeSubText || 'Fast Order'}
              </div>
            </div>
          )}

          {/* Floating Orbiting Dishes around the Card (Reference 1 - Moveable, Scalable, Deletable & 3D Round Platter SS1/SS5) */}
          {(() => {
            const isCutout = config.orbitDishStyle === 'transparent_cutout';
            const dZoom = ((config.dishZoom || 100) / 100) * 1.15; // 1.15x auto-crops outer white studio margins
            const s1 = ((config.orbitDish1Scale || 100) / 100);
            const s2 = ((config.orbitDish2Scale || 100) / 100);
            const s3 = ((config.orbitDish3Scale || 100) / 100);

            return (
              <>
                {/* Orbit Dish 1: Top Right */}
                {!config.hideOrbitDish1 && (
                  <div
                    className={`absolute pointer-events-none z-10 aspect-square rounded-full overflow-hidden transition-all ${
                      isCutout ? 'border-0 shadow-2xl' : 'shadow-xl border-2'
                    }`}
                    style={{
                      top: `calc(14% + ${(config.orbitDish1Y || 0) * previewScale}px)`,
                      right: `calc(-4px + ${(config.orbitDish1X || 0) * previewScale}px)`,
                      width: `${78 * previewScale * s1}px`,
                      height: `${78 * previewScale * s1}px`,
                      borderColor: activeTheme.colors.secondary,
                      filter: 'drop-shadow(0 14px 18px rgba(0,0,0,0.75))',
                      backgroundColor: '#000000'
                    }}
                  >
                    <img 
                      src={gridImages[0] || activeHeroImage} 
                      alt="" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/dish-presets/3d/rajasthani_thali_3d.jpg';
                      }}
                      className="w-full h-full object-cover"
                      style={{ transform: `scale(${dZoom})` }}
                    />
                  </div>
                )}

                {/* Orbit Dish 2: Bottom Left */}
                {!config.hideOrbitDish2 && (
                  <div
                    className={`absolute pointer-events-none z-10 aspect-square rounded-full overflow-hidden transition-all ${
                      isCutout ? 'border-0 shadow-2xl' : 'shadow-xl border-2'
                    }`}
                    style={{
                      bottom: `calc(7% + ${(config.orbitDish2Y || 0) * previewScale}px)`,
                      left: `calc(-4px + ${(config.orbitDish2X || 0) * previewScale}px)`,
                      width: `${84 * previewScale * s2}px`,
                      height: `${84 * previewScale * s2}px`,
                      borderColor: '#F59E0B',
                      filter: 'drop-shadow(0 14px 18px rgba(0,0,0,0.75))',
                      backgroundColor: '#000000'
                    }}
                  >
                    <img 
                      src={gridImages[1] || activeHeroImage} 
                      alt="" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/dish-presets/3d/north_indian_paneer_tikka_3d.jpg';
                      }}
                      className="w-full h-full object-cover"
                      style={{ transform: `scale(${dZoom})` }}
                    />
                  </div>
                )}

                {/* Orbit Dish 3: Bottom Right */}
                {!config.hideOrbitDish3 && (
                  <div
                    className={`absolute pointer-events-none z-10 aspect-square rounded-full overflow-hidden transition-all ${
                      isCutout ? 'border-0 shadow-2xl' : 'shadow-xl border-2'
                    }`}
                    style={{
                      bottom: `calc(6% + ${(config.orbitDish3Y || 0) * previewScale}px)`,
                      right: `calc(-4px + ${(config.orbitDish3X || 0) * previewScale}px)`,
                      width: `${86 * previewScale * s3}px`,
                      height: `${86 * previewScale * s3}px`,
                      borderColor: activeTheme.colors.secondary,
                      filter: 'drop-shadow(0 14px 18px rgba(0,0,0,0.75))',
                      backgroundColor: '#000000'
                    }}
                  >
                    <img 
                      src={gridImages[2] || activeHeroImage} 
                      alt="" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/dish-presets/3d/south_indian_masala_dosa_3d.jpg';
                      }}
                      className="w-full h-full object-cover"
                      style={{ transform: `scale(${dZoom})` }}
                    />
                  </div>
                )}
              </>
            );
          })()}

          {/* Center QR Code Container with Pill Badge (Moveable) */}
          <div 
            className={`${qrPositionClass} flex flex-col items-center justify-center z-15 my-auto transition-all`}
            style={{
              transform: `translate(${(config.qrOffsetX || 0) * previewScale}px, ${(config.qrOffsetY || 0) * previewScale}px)`
            }}
          >
            {renderQRCard(isSticker ? 150 : 165, true)}
          </div>

          {/* Bottom Table and Footer Bar (Glassmorphic / Moveable - Editable & Deletable SS2) */}
          {!config.hideFooterBadge && (
            <div 
              className="w-[88%] mx-auto rounded-full py-1.5 px-3 shadow-md border border-slate-200/80 text-center z-15 shrink-0 transition-all flex flex-col items-center justify-center leading-tight"
              style={{
                transform: `translateY(${(config.footerOffsetY || 0) * previewScale}px)`,
                backgroundColor: `rgba(255, 255, 255, ${(config.cardBgOpacity ?? 80) / 100})`,
                backdropFilter: 'blur(10px)'
              }}
            >
              <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                {resolvedTableName} {config.text.footerText ? `• ${config.text.footerText}` : ''}
              </span>
              {config.footerSubText && (
                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {config.footerSubText}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          LAYOUT 3: DARK CINEMA & GOLD FRAME (Reference 4 Style)
         ========================================================================= */}
      {layout === 'three_dish_grid' && (
        <div 
          className="relative z-10 w-full h-full flex flex-col justify-between overflow-hidden bg-black"
          style={{
            border: '2px solid #D4AF37',
            outline: '1.5px solid rgba(212,175,55,0.45)',
            outlineOffset: '-5px'
          }}
        >
          {/* Top 22%: Real Food Photography Banner */}
          <div className="relative w-full h-[22%] overflow-hidden shrink-0">
            <img 
              src={gridImages[0] || activeHeroImage} 
              alt="" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/dish-presets/3d/fine_dining_steak_3d.png';
              }}
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85" />
            
            <div className="absolute top-2 left-3 right-3 flex items-center justify-between text-white">
              <span className="font-extrabold text-[10px] uppercase tracking-widest drop-shadow text-amber-300">
                {config.text.restaurantName || 'SmartDine'}
              </span>
              {renderDietaryBadge(0.85)}
            </div>
          </div>

          {/* Center Black Focus Band with Giant Gold "MENU" */}
          <div className="relative w-full flex-1 bg-black/95 border-y-2 border-amber-400/80 shadow-2xl py-2 px-3 flex flex-col items-center justify-center z-20">
            <div className="text-center mb-0.5">
              <span className="text-white font-bold tracking-widest uppercase text-[9px] block">
                READ OUR
              </span>
              <h1 
                className="font-serif font-black tracking-widest text-amber-400 uppercase drop-shadow-md leading-none"
                style={{ fontSize: `${22 * previewScale}px` }}
              >
                MENU
              </h1>
            </div>

            {/* QR Code Container */}
            <div className="my-0.5">
              {renderQRCard(isSticker ? 135 : 145, true)}
            </div>

            {/* Playful script callout: "Scan it, Enjoy" with arrow */}
            <div className="flex items-center gap-1.5 mt-0.5 text-amber-300 italic font-medium text-[10.5px]">
              <span>Scan it, Enjoy</span>
              <span className="text-amber-400 font-bold">➜</span>
            </div>
          </div>

          {/* Bottom 22%: Real Food Photography Banner */}
          <div className="relative w-full h-[22%] overflow-hidden shrink-0">
            <img 
              src={gridImages[1] || activeHeroImage} 
              alt="" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/dish-presets/3d/fast_food_burger_3d.png';
              }}
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/90" />
            
            <div className="absolute bottom-1.5 left-0 right-0 text-center text-white/90 text-[9px] font-bold tracking-wider uppercase">
              {resolvedTableName} • {config.text.footerText || 'Instant Kitchen Order'}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 4: HERO PHOTO TOP BLEED (Reference 3 Style)
         ========================================================================= */}
      {layout === 'split_luxury' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between overflow-hidden bg-white">
          {/* Top 50%: Appetizing Hero Food Photo */}
          <div className="relative w-full h-[52%] overflow-hidden shrink-0">
            <img 
              src={config.customDishUrl || config.gridDishImages?.[0] || activeHeroImage} 
              alt="" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/dish-presets/3d/rajasthani_thali_3d.jpg';
              }}
              className="w-full h-full object-cover"
              style={{
                transform: `scale(${imgZoom}) translate(${imgX}px, ${imgY}px)`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40" />

            <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-white">
              <span className="font-extrabold uppercase tracking-widest text-[11px] drop-shadow">
                {config.text.restaurantName || 'SmartDine'}
              </span>
              {renderDietaryBadge(0.9)}
            </div>
          </div>

          {/* Intersecting Center QR Code Card (Moveable) */}
          <div 
            className="relative z-20 flex justify-center -mt-16 shrink-0 transition-all"
            style={{
              transform: `translate(${(config.qrOffsetX || 0) * previewScale}px, ${(config.qrOffsetY || 0) * previewScale}px)`
            }}
          >
            {renderQRCard(isSticker ? 145 : 155, true)}
          </div>

          {/* Bottom 45%: Clean Crisp White Callout (Glassmorphic) */}
          <div 
            className="w-full flex-1 flex flex-col items-center justify-between p-3 text-center z-10 transition-all"
            style={{
              backgroundColor: `rgba(255, 255, 255, ${(config.cardBgOpacity ?? 95) / 100})`,
              backdropFilter: 'blur(10px)'
            }}
          >
            <div>
              <span className="font-black uppercase tracking-wider text-slate-900 block" style={{ fontSize: `${13 * previewScale}px` }}>
                SCAN OUR MENU
              </span>
              <div 
                className="font-extrabold uppercase tracking-wider text-[11px] mt-0.5"
                style={{ color: activeTheme.colors.secondary }}
              >
                {resolvedTableName}
              </div>
            </div>

            <div className="text-[9px] text-slate-500 font-medium pb-1">
              {config.openingHours ? `Open: ${config.openingHours}` : (config.text.footerText || 'Contactless Mobile Ordering')}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 5: VINTAGE KRAFT CAFE & ARTISAN SKETCH (Reference 2 Style - SS2)
         ========================================================================= */}
      {layout === 'minimal_lineart' && (
        <div 
          className="relative z-10 w-full h-full flex flex-col justify-between p-4 overflow-hidden"
          style={{
            backgroundColor: config.kraftPaperTint || config.background.color || '#C5A880',
            backgroundImage: TEXTURE_PATTERNS.kraft_paper
          }}
        >
          {/* Top Logo & Elegant Script "Menu" */}
          <div className="w-full flex flex-col items-center text-center pt-1">
            {config.logo.enabled && config.logo.url ? (
              <div 
                className="rounded-full bg-white/90 p-1 shadow-xs overflow-hidden shrink-0 mb-1"
                style={{ width: `${32 * previewScale}px`, height: `${32 * previewScale}px` }}
              >
                <img src={config.logo.url} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="text-[9px] font-mono tracking-widest uppercase text-amber-950/70 border border-amber-900/40 rounded-full px-2.5 py-0.5 mb-1">
                ADD LOGO
              </div>
            )}

            <h1
              className="font-serif italic font-black text-amber-950 tracking-wide"
              style={{
                fontSize: `${22 * previewScale}px`,
                textShadow: '0 1px 2px rgba(255,255,255,0.6)'
              }}
            >
              {config.text.restaurantName || 'Menu'}
            </h1>

            <div className="flex items-center justify-center gap-2 mt-0.5">
              <div className="text-amber-900 font-bold uppercase tracking-widest text-[10px]">
                {resolvedTableName}
              </div>
              {renderDietaryBadge(0.85)}
            </div>
          </div>

          {/* Center Focal QR Code in Warm Tone */}
          <div className={`${qrPositionClass} flex items-center justify-center my-auto z-10`}>
            {renderQRCard(isSticker ? 150 : 160, true)}
          </div>

          {/* Bottom Hand-Drawn Coffee Cup / Culinary Sketch */}
          <div className="w-full flex items-end justify-between pt-1 z-10">
            <div className="text-left text-amber-950 font-bold">
              <span className="text-[11px] block">Scan Now</span>
              <span className="text-[8.5px] opacity-75 font-normal">Contactless Dining</span>
            </div>

            {/* Vintage Cup & Beans Icon Vignette */}
            <div className="flex items-center gap-1.5 text-amber-900/80">
              <Coffee className="w-6 h-6 stroke-[1.5]" />
              <div className="flex flex-col text-[7.5px] font-mono leading-tight">
                <span>•••</span>
                <span>beans</span>
              </div>
            </div>
          </div>
        </div>
      )}

      

{/* =========================================================================
          LAYOUT 6: ROYAL MANDALA PORTAL & DUAL DISHES (Concept 6 Style)
         ========================================================================= */}
      {layout === 'circular_mandala_portal' && (
        <div 
          className="relative z-10 w-full h-full flex flex-col justify-between p-3.5 overflow-hidden text-center"
          style={{
            border: '2px solid #D4AF37',
            outline: '1.5px solid rgba(212,175,55,0.4)',
            outlineOffset: '-6px'
          }}
        >
          {/* Top Royal Brand Header */}
          <div className="w-full flex flex-col items-center pt-1 z-15">
            <div className="flex items-center justify-between w-full px-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-300/90 flex items-center gap-1">
                <Compass className="w-2.5 h-2.5" /> Royal Dining
              </span>
              {renderDietaryBadge(0.85)}
            </div>

            <h1 
              className="font-serif font-black tracking-widest uppercase text-amber-200 drop-shadow-md leading-tight"
              style={{ fontSize: `${18 * previewScale}px` }}
            >
              {config.text.restaurantName || 'Royal Heritage'}
            </h1>
            <p className="text-[8.5px] font-semibold text-amber-300/80 uppercase tracking-widest mt-0.5">
              {config.tagline || 'Padharo Mhare Des'}
            </p>
          </div>

          {/* Floating Dual Dishes (Top Left & Top Right of Center Portal) */}
          <div className="relative w-full flex-1 flex items-center justify-center my-auto z-15">
            {/* Dish 1 - Left Orbit */}
            <div 
              className="absolute -left-2 top-2 pointer-events-none drop-shadow-2xl transition-transform hover:scale-105"
              style={{
                width: `${72 * previewScale}px`,
                height: `${72 * previewScale}px`,
                filter: 'drop-shadow(0 12px 16px rgba(0,0,0,0.85))'
              }}
            >
              <img 
                src={gridImages[0] || activeHeroImage} 
                alt="" 
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Dish 2 - Right Orbit */}
            <div 
              className="absolute -right-2 top-4 pointer-events-none drop-shadow-2xl transition-transform hover:scale-105"
              style={{
                width: `${74 * previewScale}px`,
                height: `${74 * previewScale}px`,
                filter: 'drop-shadow(0 12px 16px rgba(0,0,0,0.85))'
              }}
            >
              <img 
                src={gridImages[1] || activeHeroImage} 
                alt="" 
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Center Golden Mandala Halo Container */}
            <div className="relative flex items-center justify-center">
              <div 
                className="absolute inset-0 -m-6 rounded-full border-2 border-dashed border-amber-400/40 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.03) 70%, transparent 100%)'
                }}
              />
              <div 
                className="absolute inset-0 -m-3 rounded-full border border-amber-300/60 pointer-events-none"
              />
              {renderQRCard(isSticker ? 140 : 150, true)}
            </div>
          </div>

          {/* Bottom Royal Arch Table Banner */}
          <div className="w-full z-15 pt-1">
            <div 
              className="w-full rounded-lg py-1 px-3 border border-amber-400/60 shadow-lg flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(0,0,0,0.7) 100%)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <span className="font-serif font-extrabold uppercase text-[10px] tracking-widest text-amber-200">
                {resolvedTableName}
              </span>
              <span className="text-[8.5px] font-bold text-amber-300/90 uppercase tracking-wider">
                {config.ctaBadgeText || 'Scan & Feast'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 7: MODERN BENTO ARCHITECTURAL GRID (Concept 7 Style)
         ========================================================================= */}
      {layout === 'bento_modern_grid' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-3.5 bg-slate-950 text-white overflow-hidden">
          {/* Top Bento Header Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-white block">
                {config.text.restaurantName || 'SmartDine'}
              </span>
              <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest">
                {config.tagline || 'Mobile Order System'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[8.5px] font-bold">
                {resolvedTableName}
              </span>
              {renderDietaryBadge(0.8)}
            </div>
          </div>

          {/* Main Asymmetric Bento Body (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-2 my-auto flex-1 py-2">
            {/* Bento Cell 1: 3D Food Showcase */}
            <div className="relative rounded-xl bg-slate-900 border border-slate-800 p-2 flex flex-col items-center justify-center overflow-hidden group">
              <div className="absolute top-1.5 left-2 text-[7.5px] font-bold uppercase tracking-wider text-slate-400">
                Chef Pick
              </div>
              <div 
                className="w-full h-20 flex items-center justify-center shrink-0 mt-2"
                style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.8))' }}
              >
                <img 
                  src={gridImages[0] || activeHeroImage} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Bento Cell 2: QR Code Core */}
            <div className="relative rounded-xl bg-white p-2 flex flex-col items-center justify-center shadow-lg text-slate-900">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-900 mb-1">
                Scan Code
              </span>
              {renderQRCard(isSticker ? 100 : 110, false)}
            </div>

            {/* Bento Cell 3: Smart Quote Banner */}
            <div className="relative rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-2 flex flex-col justify-between">
              <div className="flex items-center gap-1 text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" /> Instant Kitchen
              </div>
              <p className="text-[9px] font-bold text-emerald-200 leading-tight">
                {config.funnyQuote || 'Bhookh lagi hai? Sharma mat, scan kar!'}
              </p>
              <div className="text-[7.5px] font-mono text-emerald-400/70">
                100% Touchless
              </div>
            </div>

            {/* Bento Cell 4: Second 3D Dish or Drink */}
            <div className="relative rounded-xl bg-slate-900 border border-slate-800 p-2 flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute top-1.5 left-2 text-[7.5px] font-bold uppercase tracking-wider text-slate-400">
                Special
              </div>
              <div 
                className="w-full h-20 flex items-center justify-center shrink-0 mt-2"
                style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.8))' }}
              >
                <img 
                  src={gridImages[1] || activeHeroImage} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Bottom Bento Status Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[8px] font-mono text-slate-500 shrink-0">
            <span>READY TO ORDER</span>
            <span>{config.openingHours || 'DIRECT KITCHEN SYNC'}</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 8: DYNAMIC DIAGONAL SLASH & DUAL FEAST (Concept 8 Style)
         ========================================================================= */}
      {layout === 'diagonal_duo_slash' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between overflow-hidden bg-slate-950 text-white">
          {/* Angled 45° Color Block Divider */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${activeTheme.colors.primary} 0%, ${activeTheme.colors.primary} 48%, #F97316 48.5%, #F97316 49.5%, #0F172A 50%, #0F172A 100%)`
            }}
          />

          {/* Top Brand Header */}
          <div className="relative z-20 w-full flex items-center justify-between p-3.5 pb-0 shrink-0">
            <div>
              <span className="text-[12px] font-black uppercase tracking-widest text-white drop-shadow block">
                {config.text.restaurantName || 'SmartDine'}
              </span>
              <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-amber-300">
                {resolvedTableName}
              </span>
            </div>
            {renderDietaryBadge(0.85)}
          </div>

          {/* Top-Right Dish Floating */}
          <div 
            className="absolute top-8 right-1 pointer-events-none z-20"
            style={{
              width: `${82 * previewScale}px`,
              height: `${82 * previewScale}px`,
              filter: 'drop-shadow(0 14px 20px rgba(0,0,0,0.9))'
            }}
          >
            <img 
              src={gridImages[0] || activeHeroImage} 
              alt="" 
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Center Interlocking QR Badge */}
          <div className="relative z-30 my-auto flex flex-col items-center justify-center">
            {renderQRCard(isSticker ? 140 : 150, true)}
          </div>

          {/* Bottom-Left Dish Floating */}
          <div 
            className="absolute bottom-6 left-1 pointer-events-none z-20"
            style={{
              width: `${86 * previewScale}px`,
              height: `${86 * previewScale}px`,
              filter: 'drop-shadow(0 14px 20px rgba(0,0,0,0.9))'
            }}
          >
            <img 
              src={gridImages[1] || activeHeroImage} 
              alt="" 
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Bottom High Energy Footer */}
          <div className="relative z-20 w-full p-3 pt-0 flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-white shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-orange-600 text-white shadow-md">
              {config.ctaBadgeText || 'FAST ORDER'}
            </span>
            <span className="text-slate-400 font-mono text-[8px]">
              {config.text.footerText || 'Instant Kitchen Dispense'}
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 9: NEON NIGHTLIFE & GLASS PORTAL (Concept 9 Style)
         ========================================================================= */}
      {layout === 'cocktail_lounge_neon' && (
        <div 
          className="relative z-10 w-full h-full flex flex-col justify-between p-3.5 overflow-hidden bg-black text-white"
          style={{
            border: '2px solid rgba(6,182,212,0.8)',
            boxShadow: 'inset 0 0 20px rgba(6,182,212,0.2), 0 0 25px rgba(6,182,212,0.25)'
          }}
        >
          {/* Top Neon Brand Header */}
          <div className="w-full text-center pt-1 z-15 shrink-0">
            <div className="flex items-center justify-between w-full px-2 mb-1">
              <span className="text-[8.5px] font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                <Wine className="w-2.5 h-2.5" /> Bar & Lounge
              </span>
              {renderDietaryBadge(0.85)}
            </div>
            <h1 
              className="font-black uppercase tracking-widest text-white leading-tight drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              style={{ fontSize: `${18 * previewScale}px` }}
            >
              {config.text.restaurantName || 'Night Lounge'}
            </h1>
            <p className="text-[8px] font-mono text-cyan-300 uppercase tracking-widest mt-0.5">
              {resolvedTableName} • {config.tagline || 'Cocktails & Dine'}
            </p>
          </div>

          {/* Center Glassmorphic QR Pedestal with Floating Glassware */}
          <div className="relative w-full flex-1 flex items-center justify-center my-auto z-15">
            {/* Floating Beverage 3D Cutout */}
            <div 
              className="absolute -right-3 top-2 pointer-events-none drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]"
              style={{
                width: `${82 * previewScale}px`,
                height: `${82 * previewScale}px`
              }}
            >
              <img 
                src={gridImages[0] || activeHeroImage} 
                alt="" 
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Glowing Frosted Glass QR Card Holder */}
            <div 
              className="p-3 rounded-2xl border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(12px)'
              }}
            >
              {renderQRCard(isSticker ? 135 : 145, true)}
            </div>
          </div>

          {/* Bottom Neon CTA Strip */}
          <div className="w-full z-15 pt-1 shrink-0">
            <div 
              className="w-full rounded-full py-1 px-3 border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-between"
              style={{
                background: 'linear-gradient(90deg, rgba(6,182,212,0.2) 0%, rgba(168,85,247,0.2) 100%)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <span className="font-mono font-bold text-[8.5px] uppercase tracking-wider text-cyan-300">
                {config.ctaBadgeText || 'TAP OR SCAN'}
              </span>
              <span className="font-mono text-[8px] text-purple-300">
                {config.text.footerText || 'Instant Service'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYOUT 10: BOTANICAL ARCH & GARDEN BISTRO (Concept 10 Style)
         ========================================================================= */}
      {layout === 'arch_sanctuary_botanical' && (
        <div 
          className="relative z-10 w-full h-full flex flex-col justify-between p-4 overflow-hidden text-center"
          style={{
            backgroundColor: '#FDFBF7',
            border: '2px solid #1C2E24',
            outline: '1.5px solid rgba(28,46,36,0.25)',
            outlineOffset: '-6px'
          }}
        >
          {/* Top Romanesque Arch Brand Header */}
          <div className="w-full flex flex-col items-center pt-1 z-15 shrink-0">
            <div className="flex items-center gap-1.5 text-emerald-900 text-[8px] font-bold uppercase tracking-widest mb-0.5">
              <Flower2 className="w-2.5 h-2.5 text-emerald-800" /> Farm to Table <Flower2 className="w-2.5 h-2.5 text-emerald-800" />
            </div>

            <h1 
              className="font-serif italic font-black text-emerald-950 tracking-wide leading-tight"
              style={{ fontSize: `${20 * previewScale}px` }}
            >
              {config.text.restaurantName || 'Garden Bistro'}
            </h1>

            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-[9px] font-bold text-amber-900 uppercase tracking-widest">
                {resolvedTableName}
              </span>
              {renderDietaryBadge(0.85)}
            </div>
          </div>

          {/* Centered Floating 3D Artisanal Dish */}
          <div 
            className="w-full flex items-center justify-center my-1 z-15 shrink-0"
            style={{
              height: `${80 * previewScale}px`,
              filter: 'drop-shadow(0 12px 16px rgba(28,46,36,0.3))'
            }}
          >
            <img 
              src={gridImages[0] || activeHeroImage} 
              alt="" 
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
              className="h-full w-auto object-contain"
            />
          </div>

          {/* Lower Center QR Code in Natural Sage Frame */}
          <div className="my-auto z-15 flex items-center justify-center">
            {renderQRCard(isSticker ? 125 : 135, true)}
          </div>

          {/* Bottom Artisanal Kitchen Banner */}
          <div className="w-full z-15 pt-1 shrink-0">
            <span className="text-[8.5px] font-serif italic text-emerald-900/80 block">
              {config.tagline || 'Artisanal Kitchen & Fresh Daily Specials'}
            </span>
            <span className="text-[7.5px] font-sans font-bold text-emerald-950/60 uppercase tracking-widest mt-0.5 block">
              {config.text.footerText || 'Direct Table Order'}
            </span>
          </div>
        </div>
      )}

      {/* 4. FLOATING STICKERS LAYER (from config.stickers) */}
      {config.stickers && config.stickers.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
          {config.stickers.map((st) => {
            const padOffset = `${12 * previewScale}px`;
            let posStyle: React.CSSProperties = {};
            if (st.position === 'top-left') posStyle = { top: padOffset, left: padOffset };
            else if (st.position === 'top-right') posStyle = { top: padOffset, right: padOffset };
            else if (st.position === 'bottom-left') posStyle = { bottom: padOffset, left: padOffset };
            else if (st.position === 'bottom-right') posStyle = { bottom: padOffset, right: padOffset };
            else if (st.position === 'custom') {
              posStyle = {
                top: `${(st.y || 10) * previewScale}px`,
                left: `${(st.x || 10) * previewScale}px`
              };
            }

            return (
              <div
                key={st.id}
                className="absolute pointer-events-none drop-shadow-md select-none font-bold"
                style={{
                  ...posStyle,
                  transform: `scale(${st.scale || 1}) rotate(${st.rotation || 0}deg)`,
                  fontSize: `${18 * previewScale}px`
                }}
              >
                {st.content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
