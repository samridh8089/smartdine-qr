import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function verifyAll() {
  console.log('=== STARTING VERIFICATION FOR 4 HIGH-IMPACT IMPROVEMENTS ===\n');

  const browser = await chromium.launch({ headless: true });

  // Test 1A: Browser Language Auto-Suggestion (en-* -> English Recommended)
  console.log('--- TEST 1A: Browser language = en-US (English should be Recommended) ---');
  {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    const analyticsEvents = [];
    await page.exposeFunction('onCleverOpsAnalytics', (data) => analyticsEvents.push(data));
    await page.addInitScript(() => {
      localStorage.clear();
      window.addEventListener('cleverops_analytics', (e) => {
        window.onCleverOpsAnalytics(e.detail);
      });
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#lang-modal-title', { timeout: 10000 });

    const enText = await page.innerText('button:has-text("English")');
    console.log('English button text:\n', enText);
    if (!enText.toLowerCase().includes('recommended')) {
      throw new Error('Expected English to have "Recommended" badge when browser is en-US');
    }
    console.log('PASS: English has "Recommended" badge for en-US browser!');

    // Capture screenshot of English Recommended popup
    const popupEnPath = path.join(SCRATCH_DIR, 'proof_popup_recommended_en.png');
    await page.screenshot({ path: popupEnPath });
    fs.copyFileSync(popupEnPath, path.join(ARTIFACTS_DIR, 'proof_popup_recommended_en.png'));
    console.log('Saved proof_popup_recommended_en.png');

    // Check modal shown analytics event
    const modalEvent = analyticsEvents.find(e => e.event === 'language_modal_shown');
    console.log('Analytics event language_modal_shown:', modalEvent);
    if (!modalEvent || modalEvent.browserDefault !== 'en') {
      throw new Error('Analytics language_modal_shown event missing or incorrect');
    }
    console.log('PASS: Analytics event language_modal_shown received with browserDefault=en');

    // Click English and verify selection event
    await page.click('button:has-text("English")');
    await page.waitForTimeout(500);

    const selEnEvent = analyticsEvents.find(e => e.event === 'language_selected_en');
    console.log('Analytics event language_selected_en:', selEnEvent);
    if (!selEnEvent) {
      throw new Error('Analytics language_selected_en event missing');
    }
    console.log('PASS: Analytics event language_selected_en received!');

    await context.close();
  }

  // Test 1B: Browser Language Auto-Suggestion (hi-IN -> Hinglish Recommended)
  console.log('\n--- TEST 1B: Browser language = hi-IN (Hinglish should be Recommended) ---');
  {
    const context = await browser.newContext({
      locale: 'hi-IN',
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    const analyticsEvents = [];
    await page.exposeFunction('onCleverOpsAnalytics', (data) => analyticsEvents.push(data));
    await page.addInitScript(() => {
      localStorage.clear();
      window.addEventListener('cleverops_analytics', (e) => {
        window.onCleverOpsAnalytics(e.detail);
      });
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#lang-modal-title', { timeout: 10000 });

    const hiText = await page.innerText('button:has-text("Hinglish")');
    console.log('Hinglish button text:\n', hiText);
    if (!hiText.toLowerCase().includes('recommended')) {
      throw new Error('Expected Hinglish to have "Recommended" badge when browser is hi-IN');
    }
    console.log('PASS: Hinglish has "Recommended" badge for hi-IN browser!');

    // Capture screenshot of Hinglish Recommended popup
    const popupHiPath = path.join(SCRATCH_DIR, 'proof_popup_recommended_hi.png');
    await page.screenshot({ path: popupHiPath });
    fs.copyFileSync(popupHiPath, path.join(ARTIFACTS_DIR, 'proof_popup_recommended_hi.png'));
    console.log('Saved proof_popup_recommended_hi.png');

    // Click Hinglish and verify selection event
    await page.click('button:has-text("Hinglish")');
    await page.waitForTimeout(500);

    const selHiEvent = analyticsEvents.find(e => e.event === 'language_selected_hi');
    console.log('Analytics event language_selected_hi:', selHiEvent);
    if (!selHiEvent) {
      throw new Error('Analytics language_selected_hi event missing');
    }
    console.log('PASS: Analytics event language_selected_hi received!');

    await context.close();
  }

  // Test 2: URL Language Support (?lang=en and ?lang=hi) & Priority
  console.log('\n--- TEST 2: URL Language Support (?lang=en and ?lang=hi) ---');
  {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Priority 1: Visit ?lang=en directly without localStorage
    await page.goto('http://localhost:3000/?lang=en', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('h1')?.innerText.includes('Run your entire restaurant'), { timeout: 10000 });
    const h1En = await page.innerText('h1');
    console.log('URL ?lang=en H1:', h1En);
    console.log('PASS: URL ?lang=en correctly loaded English content!');

    const modalVisible = await page.$('#lang-modal-title');
    if (modalVisible) {
      throw new Error('Modal should NOT be shown when ?lang= is provided in URL');
    }
    const savedLang = await page.evaluate(() => localStorage.getItem('language'));
    console.log('Saved localStorage from ?lang=en:', savedLang);
    if (savedLang !== 'en') {
      throw new Error('Expected localStorage to be "en" from ?lang=en');
    }
    console.log('PASS: URL ?lang=en persisted to localStorage!');

    // Visit ?lang=hi
    await page.goto('http://localhost:3000/?lang=hi', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('h1')?.innerText.includes('Restaurant ka har kaam'), { timeout: 10000 });
    const h1Hi = await page.innerText('h1');
    console.log('URL ?lang=hi H1:', h1Hi);
    console.log('PASS: URL ?lang=hi correctly set Hinglish!');

    await context.close();
  }

  // Test 3: Login/Signup Language Consistency
  console.log('\n--- TEST 3: Login/Signup Language Consistency ---');
  {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Load English landing page
    await page.goto('http://localhost:3000/?lang=en', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('h1')?.innerText.includes('Run your entire restaurant'));

    // Check Hero CTA href
    const ctaHref = await page.getAttribute('a:has-text("Start a 3-Day Trial for ₹3")', 'href');
    console.log('Hero CTA href:', ctaHref);
    if (!ctaHref?.includes('lang=en')) {
      throw new Error(`Hero CTA href does not carry lang=en: ${ctaHref}`);
    }
    console.log('PASS: Hero CTA carries lang=en!');

    // Check Sign In href
    const signInHref = await page.getAttribute('a:has-text("Sign In")', 'href');
    console.log('Sign In href:', signInHref);
    if (!signInHref?.includes('lang=en')) {
      throw new Error(`Sign In href does not carry lang=en: ${signInHref}`);
    }
    console.log('PASS: Sign In link carries lang=en!');

    // Click to go to /signup
    await page.goto(`http://localhost:3000${ctaHref}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Register & Activate Restaurant');
    console.log('Navigated to Signup page:', page.url());

    // Verify localStorage in signup page is 'en'
    const signupStored = await page.evaluate(() => localStorage.getItem('language'));
    console.log('Signup page localStorage language:', signupStored);
    if (signupStored !== 'en') {
      throw new Error(`Expected signup page localStorage to be "en", got ${signupStored}`);
    }

    // Verify the sign-in link inside signup carries ?lang=en
    await page.waitForSelector('a:has-text("sign in to your existing account")');
    const signupToLoginHref = await page.getAttribute('a:has-text("sign in to your existing account")', 'href');
    console.log('Signup-to-Login link href:', signupToLoginHref);
    if (!signupToLoginHref?.includes('lang=en')) {
      throw new Error(`Signup-to-Login link does not carry lang=en: ${signupToLoginHref}`);
    }
    console.log('PASS: Signup-to-Login link carries lang=en!');

    // Navigate to /login and verify
    await page.goto(`http://localhost:3000${signupToLoginHref}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Sign in to CleverOps');
    const loginToSignupHref = await page.getAttribute('a:has-text("create a new restaurant account")', 'href');
    console.log('Login-to-Signup link href:', loginToSignupHref);
    if (!loginToSignupHref?.includes('lang=en')) {
      throw new Error(`Login-to-Signup link does not carry lang=en: ${loginToSignupHref}`);
    }
    console.log('PASS: Login-to-Signup link carries lang=en!');

    await context.close();
  }

  // Test 4: Navbar Switch & Analytics Event
  console.log('\n--- TEST 4: Navbar Switch & Analytics Event ---');
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const analyticsEvents = [];
    await page.exposeFunction('onCleverOpsAnalytics', (data) => analyticsEvents.push(data));
    await page.addInitScript(() => {
      localStorage.setItem('language', 'hi');
      window.addEventListener('cleverops_analytics', (e) => {
        window.onCleverOpsAnalytics(e.detail);
      });
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header');

    // Click EN in navbar
    console.log('Switching language in navbar from HI to EN...');
    await page.click('button[aria-label="English"]');
    await page.waitForTimeout(500);

    const switchEvent = analyticsEvents.find(e => e.event === 'language_switched');
    console.log('Analytics event language_switched:', switchEvent);
    if (!switchEvent || switchEvent.from !== 'hi' || switchEvent.to !== 'en') {
      throw new Error('Analytics language_switched event missing or invalid');
    }
    console.log('PASS: Analytics event language_switched received with from=hi, to=en!');

    // Verify URL parameter was updated without reload
    const currentUrl = page.url();
    console.log('Current URL after navbar switch:', currentUrl);
    if (!currentUrl.includes('lang=en')) {
      throw new Error(`URL was not updated with lang=en: ${currentUrl}`);
    }
    console.log('PASS: URL updated with ?lang=en in place for sharing & SEO!');

    await context.close();
  }

  await browser.close();
  console.log('\n=== ALL 4 HIGH-IMPACT IMPROVEMENTS VERIFIED 100% SUCCESSFULLY! ===');
}

verifyAll().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
