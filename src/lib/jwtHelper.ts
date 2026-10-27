/**
 * JWT Helper Utilities
 * Pure fail-closed cryptographic token decoder with zero framework dependencies.
 */

/**
 * Decodes standard base64url encoded JWT payload safely.
 * Throws an error on any malformed structure or unparseable JSON (fail-closed).
 */
export function decodeJwtPayloadSafe(token: string): Record<string, any> {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing or invalid token string');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT structure: expected 3 dot-separated parts');
  }
  let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const decodedStr = Buffer.from(base64, 'base64').toString('utf8');
  const payload = JSON.parse(decodedStr);
  if (!payload || typeof payload !== 'object') {
    throw new Error('JWT payload is not a valid JSON object');
  }
  return payload;
}
