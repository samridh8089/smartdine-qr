/**
 * SmartDine File Upload Security Validator
 * Validates MIME types, magic-byte binary signatures, file sizes, and filename safety.
 */

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

export const ALLOWED_AUDIO_MIMES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a'
];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates binary buffer magic-bytes signature
 */
export function validateMagicBytes(buffer: Buffer | Uint8Array): { valid: boolean; detectedType?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { valid: true, detectedType: 'image/jpeg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return { valid: true, detectedType: 'image/png' };
  }

  // 3. WEBP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { valid: true, detectedType: 'image/webp' };
  }

  // 4. MP3: ID3 or FF FB / FF F3 / FF F2
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
    (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0)
  ) {
    return { valid: true, detectedType: 'audio/mpeg' };
  }

  // 5. WAV: RIFF .... WAVE
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
  ) {
    return { valid: true, detectedType: 'audio/wav' };
  }

  // Reject SVG, HTML, JS, PHP, EXEs or unknown binaries
  return { valid: false };
}

/**
 * Sanitizes filename to prevent directory traversal and injection attacks
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'file';
  const clean = filename
    .replace(/\0/g, '')
    .replace(/(\.\.[\/\\])+/g, '')
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  
  const ext = clean.split('.').pop()?.toLowerCase() || '';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'mp3', 'wav', 'm4a'].includes(ext) ? ext : 'jpg';
  
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${safeExt}`;
}
