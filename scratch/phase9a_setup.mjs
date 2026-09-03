import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function step1OwnerSignup() {
  console.log('=== PHASE 1: OWNER SIGNUP & RESTAURANT CREATION (THE FOODY HUB) ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[Browser Console Error]:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[Network Error ${res.status()}]:`, res.url());
      networkErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  const url = 'https://www.cleverops.in/signup?plan=trial';
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="John Doe"]', { timeout: 15000 });

  // Fill in Owner Details
  console.log('Filling form fields for The Foody Hub...');
  await page.fill('input[placeholder="John Doe"]', 'Deepak Soni');
  await page.fill('input[placeholder="you@example.com"]', 'dsoni1281@gmail.com');
  await page.fill('input[placeholder="e.g. +91 99999 88888"]', '8949266064');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.fill('input[placeholder="The Bistro Cafe"]', 'The Foody Hub');

  // Menu slug should auto-generate to foody-hub or we set foodyhub
  await page.fill('input[placeholder="bistro-cafe"]', 'foodyhub');

  await page.waitForTimeout(500);

  const filledScreenPath = path.join(SCRATCH_DIR, 'phase9a_step1_form_filled.png');
  await page.screenshot({ path: filledScreenPath, fullPage: true });
  fs.copyFileSync(filledScreenPath, path.join(ARTIFACTS_DIR, 'phase9a_step1_form_filled.png'));
  console.log('Saved phase9a_step1_form_filled.png');

  // Submit the form
  console.log('Submitting registration form...');
  const submitBtn = await page.waitForSelector('button[type="submit"]');
  await submitBtn.click();

  // Wait for result / navigation / OTP / error modal
  console.log('Waiting for response / navigation...');
  await page.waitForTimeout(8000);

  const currentUrl = page.url();
  console.log('Current URL after submit:', currentUrl);

  const resultScreenPath = path.join(SCRATCH_DIR, 'phase9a_step1_result.png');
  await page.screenshot({ path: resultScreenPath, fullPage: true });
  fs.copyFileSync(resultScreenPath, path.join(ARTIFACTS_DIR, 'phase9a_step1_result.png'));
  console.log('Saved phase9a_step1_result.png');

  // Check if error banner or text exists
  const errorEl = await page.$('.bg-red-50, .text-red-600, .text-red-500, [role="alert"]');
  let errorText = null;
  if (errorEl) {
    errorText = await errorEl.innerText();
    console.log('Form Error Text:', errorText);
  }

  // Check if OTP modal or screen appeared
  const pageContent = await page.content();
  const hasOtpPrompt = pageContent.includes('Enter OTP') || pageContent.includes('verification code') || pageContent.includes('OTP');
  console.log('Has OTP Prompt:', hasOtpPrompt);

  console.log('Console Errors:', consoleErrors);
  console.log('Network Errors:', networkErrors);

  await browser.close();
}

step1OwnerSignup().catch(err => {
  console.error('Error in step1OwnerSignup:', err);
  process.exit(1);
});
