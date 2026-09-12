'use client';

import React, { useState, useEffect } from 'react';
import { QRDesignConfig } from './types';
import { generateStyledQRDataURL } from './qrGenerator';
import { TEXTURE_PATTERNS } from './textures';

interface QRCardRendererProps {
  config: QRDesignConfig;
  tableName?: string; // e.g. "Table 4" or "VIP Lounge 2"
  directUrl?: string; // e.g. "https://www.cleverops.in/menu/slug/tbl/uuid"
  previewScale?: number; // 0.5 to 1.5
  className?: string;
  showSafeZone?: boolean;
  interactive?: boolean;
}

export const QRCardRenderer: React.FC<QRCardRendererProps> = ({
  config,
  tableName = '12',
  directUrl = 'https://www.cleverops.in/menu/demo/table/12',
  previewScale = 1,
  className = '',
  showSafeZone = false,
  interactive = false
}) => {
  // 1. Hooks strictly declared at top (Guardrail compliance)
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function loadQR() {
      const data = await generateStyledQRDataURL({
        url: directUrl,
        appearance: config.qr,
        logoUrl: config.logo?.enabled ? config.logo.url : undefined,
        scale: 2
      });
      if (isMounted) {
        setQrDataUrl(data);
      }
    }

    loadQR();
    return () => {
      isMounted = false;
    };
  }, [directUrl, config.qr, config.logo?.enabled, config.logo?.url]);

  // Dynamic table name replacement
  const formatTableName = () => {
    const rawFormat = config.text.tableNameFormat || 'Table {{table_name}}';
    if (rawFormat.includes('{{table_name}}')) {
      return rawFormat.replace(/\{\{table_name\}\}/g, tableName.replace(/^Table\s*/i, ''));
    }
    return `${rawFormat} ${tableName.replace(/^Table\s*/i, '')}`;
  };

  const resolvedTableName = formatTableName();

  // Determine Aspect Ratio and Dimensions according to shape
  let aspectRatio = '3 / 4';
  let minWidth = 280;
  let minHeight = 370;
  let shapeRadius = '18px';

  switch (config.shape) {
    case 'square':
      aspectRatio = '1 / 1';
      minWidth = 320;
      minHeight = 320;
      shapeRadius = '6px';
      break;
    case 'rounded_square':
      aspectRatio = '1 / 1';
      minWidth = 320;
      minHeight = 320;
      shapeRadius = '28px';
      break;
    case 'circle':
      aspectRatio = '1 / 1';
      minWidth = 320;
      minHeight = 320;
      shapeRadius = '9999px';
      break;
    case 'horizontal_card':
      aspectRatio = '4 / 3';
      minWidth = 360;
      minHeight = 270;
      shapeRadius = '18px';
      break;
    case 'standee':
      aspectRatio = '9 / 16';
      minWidth = 260;
      minHeight = 460;
      shapeRadius = '20px';
      break;
    case 'table_tent':
      aspectRatio = '4 / 5';
      minWidth = 300;
      minHeight = 375;
      shapeRadius = '14px';
      break;
    case 'vertical_card':
    default:
      aspectRatio = '3 / 4.1';
      minWidth = 290;
      minHeight = 395;
      shapeRadius = '18px';
      break;
  }

  // Frame Styles
  let frameStyles: React.CSSProperties = {};
  switch (config.frame.style) {
    case 'sharp':
      frameStyles = {
        border: `${config.frame.width || 2}px solid ${config.frame.color || '#E2E8F0'}`,
        borderRadius: '0px'
      };
      break;
    case 'double':
      frameStyles = {
        border: `${(config.frame.width || 2) * 2}px double ${config.frame.color || '#D4AF37'}`,
        borderRadius: shapeRadius
      };
      break;
    case 'neon':
      frameStyles = {
        border: `${config.frame.width || 2}px solid ${config.frame.color || '#06B6D4'}`,
        boxShadow: `0 0 15px ${config.frame.color || '#06B6D4'}, inset 0 0 10px ${config.frame.color || '#06B6D4'}40`,
        borderRadius: shapeRadius
      };
      break;
    case 'elegant':
      frameStyles = {
        border: `${config.frame.width || 2}px solid ${config.frame.color || '#D4AF37'}`,
        outline: `2px dashed ${config.frame.accentColor || '#F59E0B'}80`,
        outlineOffset: '-6px',
        borderRadius: shapeRadius
      };
      break;
    case 'minimal':
      frameStyles = {
        border: `1px solid ${config.frame.color || '#E2E8F0'}`,
        borderRadius: shapeRadius
      };
      break;
    case 'shadow_frame':
      frameStyles = {
        border: `${config.frame.width || 1}px solid ${config.frame.color || 'rgba(255,255,255,0.2)'}`,
        boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1)',
        borderRadius: shapeRadius
      };
      break;
    case 'rounded':
    default:
      frameStyles = {
        border: `${config.frame.width || 2}px solid ${config.frame.color || '#10B981'}`,
        borderRadius: shapeRadius
      };
      break;
  }

  // Base Background Styles (underneath food photo or texture)
  let backgroundStyles: React.CSSProperties = {};
  if (config.background.type === 'gradient') {
    backgroundStyles = {
      background: `linear-gradient(${config.background.gradientAngle || 160}deg, ${config.background.gradientStart || '#064E3B'}, ${config.background.gradientEnd || '#022C22'})`
    };
  } else if (config.background.type === 'texture') {
    const pattern = TEXTURE_PATTERNS[config.background.texture || 'marble'] || '';
    backgroundStyles = {
      backgroundColor: config.background.color || '#FFFFFF',
      backgroundImage: pattern,
      backgroundSize: config.background.texture === 'wood' ? '120px 120px' : 'auto'
    };
  } else {
    backgroundStyles = {
      backgroundColor: config.background.color || '#111827'
    };
  }

  // Ambient Glow Style on main card container
  if (config.lighting?.glow) {
    const glowColor = config.lighting.glowColor || config.frame.color || '#10B981';
    frameStyles.boxShadow = `${frameStyles.boxShadow ? `${frameStyles.boxShadow}, ` : ''}0 0 25px ${glowColor}50`;
  }

  // QR Box Shadow
  let qrShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.2)';
  if (config.qr.shadow === 'soft') qrShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
  if (config.qr.shadow === 'medium') qrShadow = '0 12px 28px rgba(0, 0, 0, 0.28)';
  if (config.qr.shadow === 'glow') qrShadow = `0 0 25px ${config.frame.color || '#06B6D4'}90`;

  // Logo Border Radius
  let logoRadius = '8px';
  if (config.logo.shape === 'circle') logoRadius = '9999px';
  if (config.logo.shape === 'square') logoRadius = '2px';

  // Filters for food photo
  const filters = config.background.filters;
  const foodFilterString = filters
    ? `blur(${filters.blur || 0}px) brightness(${filters.brightness || 100}%) contrast(${filters.contrast || 100}%) saturate(${filters.saturation || 100}%)`
    : 'none';
  const foodZoomScale = filters?.zoom ? filters.zoom / 100 : 1;

  // Vignette overlay style
  const vignetteStrength = ((config.lighting?.vignetteStrength ?? 45) / 100).toFixed(2);

  // Animated Preview
  const isAnimated = config.advanced?.animatedPreview;

  return (
    <div
      className={`relative select-none flex flex-col justify-between overflow-hidden transition-all ${className}`}
      style={{
        ...backgroundStyles,
        ...frameStyles,
        aspectRatio,
        width: `${minWidth * previewScale}px`,
        minHeight: `${minHeight * previewScale}px`,
        padding: `${16 * previewScale}px`,
        boxSizing: 'border-box'
      }}
    >
      {/* 1. LAYER: Food Photo / Custom Image Background */}
      {(config.background.type === 'food_photo' || config.background.type === 'image') && config.background.imageUrl && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <img
            src={config.background.imageUrl}
            alt="Background"
            className="w-full h-full object-cover transition-transform duration-500"
            style={{
              filter: foodFilterString,
              transform: `scale(${foodZoomScale})`
            }}
          />
          {/* Contrast Overlay Tint */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity"
            style={{
              backgroundColor: filters?.overlayColor || '#000000',
              opacity: (filters?.overlayOpacity ?? 35) / 100
            }}
          />
        </div>
      )}

      {/* 2. LAYER: Texture Overlay */}
      {config.background.texture && config.background.texture !== 'none' && config.background.type !== 'texture' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-25 z-1"
          style={{
            backgroundImage: TEXTURE_PATTERNS[config.background.texture],
            backgroundSize: config.background.texture === 'wood' ? '120px 120px' : 'auto'
          }}
        />
      )}

      {/* 3. LAYER: Lighting - Vignette */}
      {config.lighting?.vignette && (
        <div
          className="absolute inset-0 pointer-events-none z-2"
          style={{
            background: `radial-gradient(circle at center, transparent 40%, rgba(0,0,0,${vignetteStrength}) 100%)`
          }}
        />
      )}

      {/* 4. LAYER: Lighting - Spotlight Effect */}
      {config.lighting?.spotlight && (
        <div
          className="absolute inset-0 pointer-events-none z-2"
          style={{
            background: 'radial-gradient(circle at 50% 15%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 45%, transparent 75%)'
          }}
        />
      )}

      {/* 5. LAYER: Lighting - Grain Noise Overlay */}
      {config.lighting?.grain && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20 z-2 mix-blend-overlay"
          style={{
            backgroundImage: TEXTURE_PATTERNS['grain'] || TEXTURE_PATTERNS['dots']
          }}
        />
      )}

      {/* 6. LAYER: Animated Preview Effects (Steam, Sparkles, Pulse) */}
      {isAnimated && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {/* Floating Sparkle 1 */}
          <span
            className="absolute text-yellow-300 select-none animate-bounce text-sm"
            style={{ top: '15%', right: '12%', animationDuration: '2.5s' }}
          >
            ✨
          </span>
          {/* Floating Sparkle 2 */}
          <span
            className="absolute text-pink-300 select-none animate-pulse text-xs"
            style={{ bottom: '25%', left: '8%', animationDuration: '1.8s' }}
          >
            ⭐
          </span>
          {/* Steam Puffs for hot food */}
          <div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-8 h-12 pointer-events-none opacity-30 blur-xs bg-gradient-to-t from-white/40 to-transparent rounded-full animate-pulse"
            style={{ animationDuration: '3s' }}
          />
        </div>
      )}

      {/* 7. LAYER: Floating Stickers & Foodie Badges */}
      {config.stickers && config.stickers.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          {config.stickers.map((st) => {
            let positionStyles: React.CSSProperties = {};
            const paddingOffset = `${10 * previewScale}px`;

            switch (st.position) {
              case 'top-left':
                positionStyles = { top: paddingOffset, left: paddingOffset };
                break;
              case 'top-right':
                positionStyles = { top: paddingOffset, right: paddingOffset };
                break;
              case 'bottom-left':
                positionStyles = { bottom: paddingOffset, left: paddingOffset };
                break;
              case 'bottom-right':
                positionStyles = { bottom: paddingOffset, right: paddingOffset };
                break;
              case 'custom':
                positionStyles = {
                  top: `${(st.x || 10) * previewScale}px`,
                  left: `${(st.y || 10) * previewScale}px`
                };
                break;
            }

            const stickerScale = (st.scale || 1) * previewScale;
            const rotation = st.rotation || 0;

            if (st.type === 'badge') {
              return (
                <div
                  key={st.id}
                  className="absolute pointer-events-none shadow-lg font-bold flex items-center gap-1 backdrop-blur-xs whitespace-nowrap"
                  style={{
                    ...positionStyles,
                    transform: `scale(${stickerScale}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    backgroundColor: st.bgColor || '#EF4444',
                    color: st.textColor || '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '9999px',
                    padding: '3px 8px',
                    fontSize: '10px'
                  }}
                >
                  {st.content}
                </div>
              );
            }

            return (
              <div
                key={st.id}
                className="absolute pointer-events-none drop-shadow-md select-none"
                style={{
                  ...positionStyles,
                  transform: `scale(${stickerScale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  fontSize: `${24 * previewScale}px`,
                  lineHeight: 1
                }}
              >
                {st.content}
              </div>
            );
          })}
        </div>
      )}

      {/* CARD TOP HEADER: Logo + Restaurant Name */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-1 w-full">
        {config.logo.enabled && config.logo.url && config.logo.position === 'header' && (
          <div
            className="flex items-center justify-center overflow-hidden mb-1"
            style={{
              width: `${(config.logo.size || 40) * previewScale}px`,
              height: `${(config.logo.size || 40) * previewScale}px`,
              borderRadius: logoRadius,
              border: config.logo.border
                ? `${config.logo.borderWidth || 1}px solid ${config.logo.borderColor || 'rgba(255,255,255,0.3)'}`
                : 'none',
              boxShadow: config.logo.shadow ? '0 4px 10px rgba(0,0,0,0.25)' : 'none',
              backgroundColor: '#FFFFFF'
            }}
          >
            <img
              src={config.logo.url}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Restaurant Name */}
        <div
          className="w-full truncate drop-shadow-sm"
          style={{
            fontFamily: config.text.restaurantTypography.fontFamily,
            fontSize: `${config.text.restaurantTypography.fontSize * previewScale}px`,
            fontWeight: config.text.restaurantTypography.fontWeight,
            letterSpacing: `${config.text.restaurantTypography.letterSpacing}px`,
            lineHeight: config.text.restaurantTypography.lineHeight,
            color: config.text.restaurantTypography.textColor,
            textAlign: config.text.restaurantTypography.textAlign
          }}
        >
          {config.text.restaurantName || 'The Foody Hub'}
        </div>

        {/* Table Name Badge */}
        <div
          className="w-full truncate mt-0.5 drop-shadow-sm"
          style={{
            fontFamily: config.text.tableTypography.fontFamily,
            fontSize: `${config.text.tableTypography.fontSize * previewScale}px`,
            fontWeight: config.text.tableTypography.fontWeight,
            letterSpacing: `${config.text.tableTypography.letterSpacing}px`,
            lineHeight: config.text.tableTypography.lineHeight,
            color: config.text.tableTypography.textColor,
            textAlign: config.text.tableTypography.textAlign
          }}
        >
          {resolvedTableName}
        </div>
      </div>

      {/* CARD CENTER: High-Contrast Scan-Safe QR Code Graphic */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-1">
        {/* Safe Scan Zone Indicator Outline (Canva mode) */}
        <div className="relative flex items-center justify-center">
          {showSafeZone && (
            <div
              className="absolute -inset-3 border-2 border-dashed border-red-500 rounded-xl pointer-events-none flex items-center justify-center animate-pulse"
              style={{ zIndex: 25 }}
            >
              <span className="absolute -top-3.5 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                Safe Scan Quiet Zone
              </span>
            </div>
          )}

          {/* QR Graphic Container (High-Contrast, Scan-Safe Zone) */}
          <div
            className={`flex items-center justify-center overflow-hidden transition-all ${
              isAnimated ? 'animate-pulse' : ''
            }`}
            style={{
              width: `${(config.qr.size || 180) * previewScale}px`,
              height: `${(config.qr.size || 180) * previewScale}px`,
              padding: `${(config.qr.padding || 8) * previewScale}px`,
              backgroundColor: config.qr.bgColor || '#FFFFFF',
              borderRadius: `${(config.qr.borderRadius || 14) * previewScale}px`,
              border: config.qr.frameThickness
                ? `${config.qr.frameThickness * previewScale}px solid ${config.qr.frameColor || '#000000'}`
                : 'none',
              boxShadow: qrShadow
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-full h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs"
                style={{ color: config.qr.fgColor || '#000000' }}
              >
                <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Scan instruction CTA */}
        <div
          className="w-full truncate mt-2.5 px-1 drop-shadow-sm"
          style={{
            fontFamily: config.text.scanTypography.fontFamily,
            fontSize: `${config.text.scanTypography.fontSize * previewScale}px`,
            fontWeight: config.text.scanTypography.fontWeight,
            letterSpacing: `${config.text.scanTypography.letterSpacing}px`,
            lineHeight: config.text.scanTypography.lineHeight,
            color: config.text.scanTypography.textColor,
            textAlign: config.text.scanTypography.textAlign
          }}
        >
          {config.text.scanText || 'Scan to View Menu & Order'}
        </div>
      </div>

      {/* CARD FOOTER: Powered by CleverOps / Subtext */}
      <div className="relative z-10 w-full text-center mt-1">
        <div
          className="w-full truncate drop-shadow-xs"
          style={{
            fontFamily: config.text.footerTypography.fontFamily,
            fontSize: `${config.text.footerTypography.fontSize * previewScale}px`,
            fontWeight: config.text.footerTypography.fontWeight,
            letterSpacing: `${config.text.footerTypography.letterSpacing}px`,
            lineHeight: config.text.footerTypography.lineHeight,
            color: config.text.footerTypography.textColor,
            textAlign: config.text.footerTypography.textAlign
          }}
        >
          {config.text.footerText || 'Powered by CleverOps'}
        </div>
      </div>
    </div>
  );
};
