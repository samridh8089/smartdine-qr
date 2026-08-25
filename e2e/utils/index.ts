/**
 * SmartDine SaaS — E2E Test Utilities
 * Phase 7A.2 — Infrastructure
 */

import { expect } from '@playwright/test';

/**
 * Generates a standard v4 UUID string.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a unique ephemeral string prefix for test data isolation (Spec TDM-003).
 */
export function generateEphemeralPrefix(testId: string): string {
  return `QA-EPHEMERAL-${testId}-${Date.now()}`;
}

/**
 * Format a number as Indian Currency (INR / Rs.).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Returns formatted date string YYYY-MM-DD.
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generates a safe screenshot filename following Spec Appendix C naming convention.
 */
export function buildScreenshotName(
  testId: string,
  variant: string,
  viewport: string,
  browserName: string
): string {
  const cleanTestId = testId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const cleanVariant = variant.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `${cleanTestId}--${cleanVariant}--${viewport}--${browserName}.png`;
}

/**
 * Soft assertion wrapper for non-blocking checks.
 */
export async function assertWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 5_000,
  message: string = 'Condition timed out'
): Promise<T> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      return await fn();
    } catch {
      await new Promise((res) => setTimeout(res, 200));
    }
  }
  throw new Error(`${message} after ${timeoutMs}ms`);
}
