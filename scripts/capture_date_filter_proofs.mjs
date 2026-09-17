import WebSocket from 'ws';
global.WebSocket = WebSocket;
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Simple .env.local loader
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        process.env[key] = val;
      }
    }
  }
} catch (e) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const executablePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const artifactDir = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\7a89da85-1e34-4d2b-98be-bc1b51120118';

async function captureProofs() {
  console.log('1. Signing in with Supabase to get session token...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'dsoni1281@gmail.com',
    password: '123456'
  });

  if (authErr || !authData?.session) {
    console.error('Sign in failed:', authErr);
    process.exit(1);
  }
  console.log('Got session token for user:', authData.user.id);

  console.log('2. Launching browser using:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Navigate to root to initialize origin domain storage
  console.log('3. Initializing session in browser...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.evaluate((session) => {
    localStorage.setItem('smartdine_auth_token_v2', JSON.stringify(session));
  }, authData.session);

  // Navigate to Live Orders page
  console.log('4. Navigating to /dashboard/orders...');
  await page.goto('http://localhost:3000/dashboard/orders', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for the date input to appear
  console.log('Waiting for date picker selector...');
  await page.waitForSelector('input[type="date"]', { timeout: 20000 });
  console.log('Orders page loaded! Date picker is present.');

  // Proof 1: Today Default
  await new Promise(r => setTimeout(r, 2000));
  const proofTodayPath = path.join(artifactDir, 'proof_today.png');
  await page.screenshot({ path: proofTodayPath, fullPage: false });
  console.log('Saved proof_today.png');

  // Proof 2: Select 13 Sept (2026-09-13)
  console.log('Filtering by 2026-09-13...');
  await page.evaluate((val) => {
    const input = document.querySelector('input[type="date"]');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, '2026-09-13');
  await new Promise(r => setTimeout(r, 3000));
  const proof13Path = path.join(artifactDir, 'proof_13_sept.png');
  await page.screenshot({ path: proof13Path, fullPage: false });
  console.log('Saved proof_13_sept.png');

  // Proof 3: Select 14 Sept (2026-09-14)
  console.log('Filtering by 2026-09-14...');
  await page.evaluate((val) => {
    const input = document.querySelector('input[type="date"]');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, '2026-09-14');
  await new Promise(r => setTimeout(r, 3000));
  const proof14Path = path.join(artifactDir, 'proof_14_sept.png');
  await page.screenshot({ path: proof14Path, fullPage: false });
  console.log('Saved proof_14_sept.png');

  // Proof 4: Click Today button
  console.log('Clicking Today button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const todayBtn = buttons.find(b => b.textContent?.trim() === 'Today');
    if (todayBtn) todayBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));
  const proofTodayBtnPath = path.join(artifactDir, 'proof_today_button.png');
  await page.screenshot({ path: proofTodayBtnPath, fullPage: false });
  console.log('Saved proof_today_button.png');

  // Proof 5: Click Clear button
  console.log('Selecting a past date and then clicking Clear...');
  await page.evaluate((val) => {
    const input = document.querySelector('input[type="date"]');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, '2026-09-13');
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const clearBtn = buttons.find(b => b.textContent?.trim() === 'Clear');
    if (clearBtn) clearBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));
  const proofClearPath = path.join(artifactDir, 'proof_clear.png');
  await page.screenshot({ path: proofClearPath, fullPage: false });
  console.log('Saved proof_clear.png');

  await browser.close();
  console.log('All visual proofs captured successfully!');
}

captureProofs().catch(console.error);
