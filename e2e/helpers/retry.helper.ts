/**
 * SmartDine SaaS — Retry Helper
 * Phase 7A.2 — Infrastructure
 */

export class RetryHelper {
  /**
   * Executes an async action with retry logic.
   */
  public static async executeWithRetry<T>(
    action: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1_000
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await action();
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }
    throw lastError;
  }
}
