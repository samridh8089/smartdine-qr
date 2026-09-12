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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // 1. Generate QR Code image when appearance or URL changes
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
    // If format doesn't contain {{table_name}}, use the format or append
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
  let shapeRadius = '16px';

  switch (config.shape) {
    case 'square':
      aspectRatio = '1 / 1';
      minWidth = 320;
      minHeight = 320;
      shapeRadius = '4px';
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
        boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
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

  // Background Styles
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
  } else if (config.background.type === 'image' && config.background.imageUrl) {
    backgroundStyles = {
      backgroundImage: `url(${config.background.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };
  } else {
    backgroundStyles = {
      backgroundColor: config.background.color || '#FFFFFF'
    };
  }

  // QR Box Shadow
  let qrShadow = 'none';
  if (config.qr.shadow === 'soft') qrShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
  if (config.qr.shadow === 'medium') qrShadow = '0 8px 24px rgba(0, 0, 0, 0.16)';
  if (config.qr.shadow === 'glow') qrShadow = `0 0 20px ${config.frame.color || '#06B6D4'}80`;

  // Logo Border Radius
  let logoRadius = '8px';
  if (config.logo.shape === 'circle') logoRadius = '9999px';
  if (config.logo.shape === 'square') logoRadius = '2px';

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
      {/* Texture overlay for subtle richness if enabled on non-texture type */}
      {config.background.texture && config.background.texture !== 'none' && config.background.type !== 'texture' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: TEXTURE_PATTERNS[config.background.texture],
            backgroundSize: config.background.texture === 'wood' ? '120px 120px' : 'auto'
          }}
        />
      )}

      {/* Background Opacity Wash if set */}
      {config.background.opacity < 100 && (
        <div
          className="absolute inset-0 pointer-events-none bg-black"
          style={{ opacity: (100 - config.background.opacity) / 100 }}
        />
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
              boxShadow: config.logo.shadow ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
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
          className="w-full truncate"
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
          className="w-full truncate mt-0.5"
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

      {/* CARD CENTER: QR Code Graphic */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-1">
        {/* Safe Scan Zone Indicator Outline (Canva mode) */}
        <div className="relative flex items-center justify-center">
          {showSafeZone && (
            <div
              className="absolute -inset-3 border-2 border-dashed border-red-500 rounded-xl pointer-events-none flex items-center justify-center animate-pulse"
              style={{ zIndex: 20 }}
            >
              <span className="absolute -top-3.5 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                Safe Scan Quiet Zone
              </span>
            </div>
          )}

          {/* QR Graphic Container */}
          <div
            className="flex items-center justify-center overflow-hidden transition-transform"
            style={{
              width: `${(config.qr.size || 180) * previewScale}px`,
              height: `${(config.qr.size || 180) * previewScale}px`,
              padding: `${(config.qr.padding || 8) * previewScale}px`,
              backgroundColor: config.qr.bgColor || '#FFFFFF',
              borderRadius: `${(config.qr.borderRadius || 12) * previewScale}px`,
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
          className="w-full truncate mt-2 px-1"
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
          className="w-full truncate"
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
