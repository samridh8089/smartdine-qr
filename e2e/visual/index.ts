/**
 * SmartDine SaaS — Visual Regression Utilities
 * Phase 7A.2 — Infrastructure
 */

export const VR_CONFIG = {
  defaultThreshold: 0.001, // 0.1% pixel difference
  loginThreshold: 0.0005, // 0.05%
  menuThreshold: 0.0015, // 0.15%
} as const;
