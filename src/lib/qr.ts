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
