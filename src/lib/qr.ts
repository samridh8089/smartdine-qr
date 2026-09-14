import QRCode from 'qrcode';

export interface QROptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generates a high-quality QR code data URL (Base64 PNG) for a given text.
 */
export async function generateQRDataURL(text: string, options?: QROptions): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: options?.width || 512,
      margin: options?.margin ?? 2,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff'
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'H'
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Canonical URL builder for Table QR codes, ensuring 100% parity across
 * preview, print, and download.
 */
export function getCanonicalTableQRUrl(origin: string, restaurantSlug: string, tableId: string): string {
  const cleanOrigin = (origin || (typeof window !== 'undefined' ? window.location.origin : 'https://www.cleverops.in')).replace(/\/+$/, '');
  const cleanSlug = encodeURIComponent((restaurantSlug || '').trim());
  const cleanTableId = encodeURIComponent((tableId || '').trim());
  return `${cleanOrigin}/menu/${cleanSlug}/table/${cleanTableId}`;
}
