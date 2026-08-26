import { test, expect } from '@playwright/test';

test.describe('Auth Freeze P0 Suite @p0', () => {

  test('Signup Flow @p0', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('h2, h1')).toContainText(/Create|Sign Up|Register/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Login Flow @p0', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2, h1')).toContainText(/Sign In|Welcome|Login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Forgot Password Request Flow @p0', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('h2, h1')).toContainText(/Reset your password/i);
    await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('body')).toContainText(/Check your inbox|sent a password reset link/i);
  });

  test('Reset Password Page Rendering @p0', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.locator('h2, h1')).toContainText(/Set New Password/i);
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('Expired Reset Link Handling @p0', async ({ page }) => {
    await page.goto('/reset-password?error_description=Email+link+is+invalid+or+has+expired');
    await expect(page.locator('body')).toContainText(/invalid or has expired/i);
  });

  test('Invalid Recovery Token Handling @p0', async ({ page }) => {
    await page.goto('/auth/callback?token_hash=invalid_token_12345&type=recovery&next=/reset-password');
    await expect(page).toHaveURL(/reset-password/);
  });

});
