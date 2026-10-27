import QRCode from 'qrcode';
import { QRAppearance } from './types';

const qrCache = new Map<string, string>();

interface GenerateQRCardImageOptions {
  url: string;
  appearance: QRAppearance;
  logoUrl?: string;
  scale?: number;
}

/**
 * Generates a high-resolution, perfectly scannable QR Code Data URL
 * with custom colors, quiet zone padding, and optional embedded center logo.
 */
export async function generateStyledQRDataURL({
  url,
  appearance,
  logoUrl,
  scale = 2
}: GenerateQRCardImageOptions): Promise<string> {
  const cacheKey = `${url}_${appearance.fgColor}_${appearance.bgColor}_${appearance.padding}_${appearance.size}_${appearance.centerLogo ? logoUrl : ''}_${scale}`;
  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey)!;
  }

  try {
    const targetSize = Math.round((appearance.size || 200) * scale);
    const quietMargin = Math.max(3, Math.round((appearance.padding || 8) / 4));

    // Optical Scannability Guardrail: Ensure dark modules have strong contrast against light background
    const requestedFg = (appearance.fgColor || '#0F172A').trim();
    const isRedOrLowContrast = /^#?(8b|b9|5c|e6|ff|00f5)/i.test(requestedFg);
    const effectiveFg = isRedOrLowContrast ? '#0F172A' : requestedFg;
    const effectiveBg = (appearance.bgColor || '#FFFFFF').trim();

    // 1. Generate base QR code on an offscreen canvas
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;

      await QRCode.toCanvas(canvas, url, {
        width: targetSize,
        margin: quietMargin,
        color: {
          dark: effectiveFg,
          light: effectiveBg
        },
        errorCorrectionLevel: 'H' // High error tolerance (up to 30% occluded by center logo)
      });

      // 2. If center logo is enabled, draw it centered with a protective circular/rounded white badge
      if (appearance.centerLogo && logoUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve();

            // Cap badge size to max 20% of targetSize to strictly preserve Reed-Solomon QR data blocks
            const rawBadgeSize = Math.round((appearance.centerLogoSize || 32) * scale);
            const badgeSize = Math.min(rawBadgeSize, Math.round(targetSize * 0.20));
            const badgeX = (targetSize - badgeSize) / 2;
            const badgeY = (targetSize - badgeSize) / 2;

            ctx.save();
            // Draw background badge for quiet separation without bleeding shadow
            ctx.fillStyle = effectiveBg;
            ctx.shadowColor = 'rgba(0,0,0,0.08)';
            ctx.shadowBlur = 2 * scale;

            // Rounded badge
            const radius = badgeSize * 0.25;
            ctx.beginPath();
            ctx.moveTo(badgeX + radius, badgeY);
            ctx.lineTo(badgeX + badgeSize - radius, badgeY);
            ctx.quadraticCurveTo(badgeX + badgeSize, badgeY, badgeX + badgeSize, badgeY + radius);
            ctx.lineTo(badgeX + badgeSize, badgeY + badgeSize - radius);
            ctx.quadraticCurveTo(badgeX + badgeSize, badgeY + badgeSize, badgeX + badgeSize - radius, badgeY + badgeSize);
            ctx.lineTo(badgeX + radius, badgeY + badgeSize);
            ctx.quadraticCurveTo(badgeX, badgeY + badgeSize, badgeX, badgeY + badgeSize - radius);
            ctx.lineTo(badgeX, badgeY + radius);
            ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
            ctx.closePath();
            ctx.fill();

            // Draw image clipped inside badge
            const pad = 2 * scale;
            ctx.save();
            ctx.beginPath();
            ctx.arc(targetSize / 2, targetSize / 2, (badgeSize / 2) - pad, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, badgeX + pad, badgeY + pad, badgeSize - (pad * 2), badgeSize - (pad * 2));
            ctx.restore();

            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = logoUrl;
        });
      }

      const dataUrl = canvas.toDataURL('image/png');
      qrCache.set(cacheKey, dataUrl);
      return dataUrl;
    }

    // Server-side / fallback
    const fallbackUrl = await QRCode.toDataURL(url, {
      width: targetSize,
      margin: quietMargin,
      color: {
        dark: effectiveFg,
        light: effectiveBg
      },
      errorCorrectionLevel: 'H'
    });
    qrCache.set(cacheKey, fallbackUrl);
    return fallbackUrl;
  } catch (err) {
    console.error('Error generating styled QR:', err);
    return '';
  }
}
