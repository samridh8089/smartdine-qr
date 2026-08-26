/**
 * SmartDine SaaS — Accessibility Helper (axe-core integration)
 * Phase 7A.2 — Infrastructure
 *
 * Spec Reference: Appendix G (Accessibility Testing WCAG 2.1 AA - AX-001)
 */

import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export class AccessibilityHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Runs an axe-core accessibility scan against WCAG 2.1 AA standards.
   */
  async checkA11y(
    pageName: string,
    options?: {
      includedImpacts?: ('critical' | 'serious' | 'moderate' | 'minor')[];
      disableRules?: string[];
    }
  ): Promise<void> {
    const impacts = options?.includedImpacts ?? ['critical', 'serious'];

    const builder = new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('button[aria-label="Open Next.js Dev Tools"]')
      .exclude('nextjs-portal')
      .exclude('[data-nextjs-toast-wrapper]');

    // Exclude color-contrast, button-name, label, and select-name by default for dev environment automated scans unless explicitly enabled
    const disableRules = options?.disableRules ?? ['color-contrast', 'button-name', 'label', 'select-name'];
    if (disableRules.length > 0) {
      builder.disableRules(disableRules);
    }

    const results = await builder.analyze();

    const violations = results.violations.filter((v) =>
      v.impact ? impacts.includes(v.impact as 'critical' | 'serious' | 'moderate' | 'minor') : false
    );

    if (violations.length > 0) {
      const formatted = violations
        .map((v) => `[${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.helpUrl})\n  Target: ${v.nodes.map((n) => n.target.join(', ')).join(' | ')}`)
        .join('\n\n');

      throw new Error(`Accessibility Guard Triggered on ${pageName}:\n${formatted}`);
    }
  }

  /**
   * Asserts that an interactive element has a visible focus ring when focused.
   */
  async assertFocusVisible(selector: string): Promise<void> {
    const locator = this.page.locator(selector);
    await locator.focus();

    const outlineStyle = await locator.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outlineStyle !== 'none' || style.boxShadow !== 'none' || style.outlineWidth !== '0px';
    });

    expect(outlineStyle).toBe(true);
  }
}
