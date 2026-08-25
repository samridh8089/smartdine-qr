/**
 * SmartDine SaaS — Environment Helper
 * Phase 7A.2 — Infrastructure
 */

export class EnvironmentHelper {
  public static get baseUrl(): string {
    return process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
  }

  public static get supabaseUrl(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  }

  public static get supabaseAnonKey(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  }

  public static get supabaseServiceKey(): string {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  }

  public static get isCI(): boolean {
    return !!process.env.CI;
  }
}
