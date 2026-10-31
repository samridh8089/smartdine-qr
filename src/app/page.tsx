'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Upload, ArrowRight,
  QrCode, ChefHat, BarChart3, 
  Smartphone, Check, Sparkles, Menu, X, 
  Play, Clock, ChevronDown, ChevronUp, AlertTriangle, 
  ShieldCheck, Zap, Laptop, Users, Receipt, Package,
  Lock, FileText, XCircle, CheckCircle2, RefreshCw, Layers,
  Globe, Mail, Phone, MapPin, Languages, Banknote, Wallet, UserCheck, Utensils, Coffee, Store, PhoneCall
} from 'lucide-react';

import { db, PricingPlan } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';


// Analytics tracking helper
function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  try {
    console.log(`[Analytics] ${eventName}`, params || {});
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', eventName, params);
    }
    if (Array.isArray((window as any).dataLayer)) {
      (window as any).dataLayer.push({ event: eventName, ...params });
    }
    window.dispatchEvent(new CustomEvent('cleverops_analytics', {
      detail: { event: eventName, ...params }
    }));
  } catch (err) {
    console.warn('[Analytics Error]', err);
  }
}

export default function LandingPage() {
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const [isBrowserEn, setIsBrowserEn] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<'owner' | 'kitchen' | 'waiter' | 'cashier' | 'smart_menu' | 'attendance'>('owner');
  const [kdsTickets, setKdsTickets] = useState<{ id: string; table: string; status: 'new' | 'preparing' | 'ready' | 'served'; items: string; notes: string }[]>([
    { id: 'batch1', table: 'Table 04 • Batch #1', status: 'new', items: '2x Paneer Tikka • 1x Garlic Naan', notes: 'Chef Note: Less spicy, butter on side' },
    { id: 'batch2', table: 'Table 09 • Batch #2', status: 'preparing', items: '1x Dal Makhani • 2x Roti', notes: 'Timer: 6 min elapsed' },
    { id: 'batch3', table: 'Table 02 • Batch #1', status: 'ready', items: '1x Veg Biryani • 1x Boondi Raita', notes: 'Ready to serve • Waiter notified' },
  ]);
  const [smartMenuUploaded, setSmartMenuUploaded] = useState(false);
  const [smartMenuFileName, setSmartMenuFileName] = useState<string>('sample-menu.jpg');
  const [smartMenuDraftItems, setSmartMenuDraftItems] = useState([
    { id: '1', name: 'Paneer Butter Masala', category: 'Main Course', price: 280, isVeg: true },
    { id: '2', name: 'Dal Makhani Slow-Cooked', category: 'Main Course', price: 240, isVeg: true },
    { id: '3', name: 'Butter Tandoori Roti', category: 'Breads', price: 35, isVeg: true },
    { id: '4', name: 'Special Veg Dum Biryani', category: 'Rice', price: 290, isVeg: true },
  ]);
  const [smartMenuSavedNotice, setSmartMenuSavedNotice] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  // Savings Calculator States
  const [calcTables, setCalcTables] = useState<number>(10);
  const [calcStaff, setCalcStaff] = useState<number>(6);
  const [calcMonthlySale, setCalcMonthlySale] = useState<number>(500000);

  // Dynamic Savings Calculation (Real-Time Memoized Formula Engine)
  const savingsCalc = useMemo(() => {
    const kitchenLeak = Math.round(calcMonthlySale * 0.03);
    const staffAndOtLeak = Math.round((calcStaff * 2200) + (calcTables * 350));
    const turnoverAndAutoMenu = Math.round((calcTables * 1100) + (calcMonthlySale * 0.015));
    const cashLeak = Math.round(calcMonthlySale * 0.012);
    const hardwareSaved = calcTables >= 8 ? 3500 : 2000;
    const totalMonthly = kitchenLeak + staffAndOtLeak + turnoverAndAutoMenu + cashLeak + hardwareSaved;
    const totalYearly = totalMonthly * 12;

    return {
      kitchenLeak,
      staffAndOtLeak,
      turnoverAndAutoMenu,
      cashLeak,
      hardwareSaved,
      totalMonthly,
      totalYearly,
    };
  }, [calcTables, calcStaff, calcMonthlySale]);

  useEffect(() => {
    // 1. Language Resolution with Strict Priority: URL parameter -> localStorage -> Browser language
    if (typeof window !== 'undefined') {
      const browserIsEn = Boolean(navigator.language && navigator.language.toLowerCase().startsWith('en'));
      setIsBrowserEn(browserIsEn);
      const browserDefault: 'hi' | 'en' = browserIsEn ? 'en' : 'hi';

      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang')?.toLowerCase();

      if (urlLang === 'en' || urlLang === 'hi') {
        // Priority 1: URL parameter (?lang=en or ?lang=hi)
        setLanguage(urlLang);
        localStorage.setItem('language', urlLang);
        setShowLangModal(false);
      } else {
        const saved = localStorage.getItem('language');
        if (saved === 'hi' || saved === 'en') {
          // Priority 2: localStorage
          setLanguage(saved);
          setShowLangModal(false);
        } else if (typeof navigator !== 'undefined' && navigator.webdriver) {
          // Automated E2E test suites should not be blocked by first-time modal
          setLanguage(browserDefault);
          setShowLangModal(false);
        } else {
          // Priority 3: Browser language fallback (show modal for first-time visitor)
          setLanguage(browserDefault);
          setShowLangModal(true);
          trackEvent('language_modal_shown', { browserDefault });
        }
      }
    }

    // Redirect auth error hash fragments from landing homepage to /login or /forgot-password
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('error=')) {
      console.warn('[LandingPage] Auth hash error detected on landing page. Forwarding to /login...');
      window.location.href = `/login${window.location.hash}`;
      return;
    }

    async function loadPricing() {
      const plans = await db.getPricingPlans();
      setPricingPlans(plans);
    }
    loadPricing();
  }, []);

  const handleModalSelect = (lang: 'hi' | 'en') => {
    trackEvent(lang === 'hi' ? 'language_selected_hi' : 'language_selected_en', { source: 'modal' });
    setLanguage(lang);
    localStorage.setItem('language', lang);
    setShowLangModal(false);

    // Keep URL parameter in sync for sharing & SEO
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleNavbarSwitch = (newLang: 'hi' | 'en') => {
    if (newLang === language) return;
    trackEvent('language_switched', { from: language, to: newLang });
    setLanguage(newLang);
    localStorage.setItem('language', newLang);

    // Keep URL parameter in sync for sharing & SEO
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', newLang);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const copy = {
    hi: {
      modal: {
        title: 'Choose your language',
        subtitle: 'Aap kabhi bhi baad me language change kar sakte hain.',
        btnHinglish: 'Hinglish',
        btnEnglish: 'English',
      },
      nav: {
        preview: 'Preview',
        noHardware: 'No Hardware',
        smartCosting: 'Smart Costing',
        demoVideos: 'Demo Videos',
        pricing: 'Pricing',
        signIn: 'Sign In',
        trialCta: 'Start 3-Day Trial for ₹3',
        trialCtaMobile: 'Trial ₹3',
        productPreview: 'Product Preview',
        noHardwareNeeded: 'No Hardware Needed',
      },
      hero: {
        pill: 'Restaurant, Cafe aur Cloud Kitchen Owners ke liye',
        titlePrefix: 'Restaurant ka har kaam.',
        titleHighlight: 'Ab aapke Mobile par.',
        subtitle: 'Bina ₹40,000 ki POS machine ya computer kharide — Billing, Live Kitchen (KOT), Raw Material Chori, aur Roz ka Galla (Cash) apne regular phone se sambhalein.',
        checkpoints: [
          'Koi Laptop ya Hardware Nahi Chahiye',
          '5 Minute me Staff Seekh Jayega',
          'Stock Chori aur Food Cost par 100% Control',
        ],
        trialCta: '3-Din Trial Shuru Karein (Sirf ₹3)',
        demoCta: 'Live Demo Screen Dekhein',
        microcopy: '🔒 100% Safe Razorpay Checkout • Koi Auto-Debit Nahi • Turant Chalu',
      },
      scrollMagnet: {
        boldLine: 'Sale toh roz hoti hai, par paisa kahan gayab ho raha hai?',
        subLine: 'Sirf ₹3 ke 3-Din Trial me apne kitchen, galla, staff hours aur stock ka pura sach khud apni aankhon se dekhein — Niche Calculator me apne restaurant ki bachat check karein:',
        cta: 'Bachat Calculator',
      },
      calculator: {
        badge: 'Live Restaurant Leak & Profit Calculator',
        title: 'Apne Restaurant ka Mahine ka Chhupa Hua Loss Check Karein',
        subtitle: 'Apne Tables, Staff aur Monthly Sale ke hisaab se dekhein CleverOps har mahine aapka kitna paisa aur waqt bacha sakta hai:',
        tablesLabel: 'Kul Tables',
        staffLabel: 'Kul Staff (Waiter + Kitchen + Cashier)',
        salesLabel: 'Monthly Sale (Approx ₹)',
        resultHeadline: 'Aapki Anumanit Monthly Bachat & Extra Kamai:',
        perMonth: '/ Month',
        yearlyBadge: (val: string) => `Saal ka ~${val} Bachega!`,
        row1Title: 'Kitchen Chori & Cancel Order Leak Band:',
        row1Desc: '(Recipe BOM aur Cancelled Food Audit se)',
        row2Title: 'Staff Exact Hours, OT Control & Zyada Tables:',
        row2Desc: '(Exact working hours/OT hisaab + QR se wahi staff zyada tables sambhalega)',
        row3Title: 'Fast Table Turnover & Auto Stock-Out Menu:',
        row3Desc: '(Jo stock me nahi wo menu se auto-hide + KDS se 20 min fast service)',
        row4Title: 'Galla Mismatch & Petty Cash Chori Band:',
        row4Desc: '(Shift Cash Closing aur Photo Slip Voucher se)',
        row5Title: 'Biometric & Menu Printing Kharcha Zero:',
        row5Desc: '(Selfie+GPS Attendance aur AI Menu Scanner se)',
        ctaText: (val: string) => `Har mahine ${val} ka nuksan rokne ke liye — Sirf ₹3 ke 3-Din Trial me apne restaurant ka pura sach khud dekhein!`,
        ctaBtn: 'Sirf ₹3 Me 3-Din Trial Chalu Karein →',
      },
      operationsBreakdown: {
        badge: 'Operations Simplified • 100% Practical',
        title: 'Yeh Paisa Kaise Bachta Hai & Roz Ka Kaam Kaise Aasaan Hota Hai?',
        subtitle: 'Kisi theoretical gyaan ke bina — dekhiye CleverOps ke 8 real ground features aapke restaurant ko kaise chalate hain:',
        cards: [
          {
            num: '01',
            title: 'Kaun Kitni Der Kaam Kar Raha Hai + Auto Overtime & Payroll',
            desc: 'Selfie + GPS Geofence se punch-in/out. Har employee ne aaj kitne ghante kaam kiya, kab late aaya, kitna Overtime (OT) bana aur kitna advance liya — mahine ke aakhir me 1-click me exact salary aur PDF slip ready.',
          },
          {
            num: '02',
            title: 'Inventory Khatam = Customer Menu se Dish Auto-Hide',
            desc: 'Jo raw material ya item inventory me khatam ho gaya, wo customer ke QR Menu se apne-aap hide (Out of Stock) ho jayega. Waiter ko table par jaakar \'Sir yeh dish nahi hai\' bolne ki sharmindagi nahi hogi, aur stock dalte hi dish wapas menu me chalu ho jayegi.',
          },
          {
            num: '03',
            title: 'Wahi Staff, Zyada Tables (Bina Naye Hiring ke)',
            desc: 'Customer table QR se khud order karega aur screen se hi 1-Click me \'Water\', \'Cutlery\', \'Call Waiter\' ya \'Bill\' mangwayega. Waiter ke fokat chakkar बचेंगे aur wahi staff peak rush me zyada tables aaram se sambhal lega.',
          },
          {
            num: '04',
            title: 'Kitchen Chori & Cancel Order Audit (Food Disposition)',
            desc: 'Har order par Recipe BOM ke hisaab se exact gram stock minus hota hai. Agar koi order cancel hota hai, to chef ko mark karna hi padega ki khana dusri table ko resell hua, staff meal me gaya ya waste hua — bina hisaab khana gayab hona band.',
          },
          {
            num: '05',
            title: 'Raat ka Galla (Cash Closing) & Petty Cash Photo Slips',
            desc: 'Subah ka Opening Float + Din ki Cash Sale - Approved Petty Cash (doodh/sabzi ki photo parchi ke saath) = Exact Galla Hisaab. ₹10 bhi kam-zyada hua to Red Variance Alert aayega.',
          },
          {
            num: '06',
            title: 'Loud Kitchen Bell & Offline KDS (No Paper KOT)',
            desc: 'Order aate hi kitchen screen par घंटी (bell) bajti hai aur live timer chalta hai. Khana bante hi 1-tap me waiter ke phone par \'Order Ready\' alert jata hai. Wi-Fi band hone par bhi offline queue kaam karti hai.',
          },
          {
            num: '07',
            title: '1-Click Split Bill & Multi-Round Party Table Merge',
            desc: 'Customer 3 baar order de (Starters, Main Course, Dessert) ya 2 tables jod kar birthday party kare — sabka 1 single bill banega. \'Aadha Cash, Aadha UPI\' ka hisaab Split Calculator 2 second me kar dega.',
          },
          {
            num: '08',
            title: 'AI Menu Scanner & 1-Click CA / Tally GST Report',
            desc: 'Kagaz ke menu ki photo khinch kar 2 minute me digital menu banayein. Aur mahine ke aakhir me CA ko GST filing ke liye 1-click me Tally CSV report bhej dein.',
          },
        ],
      },
      trustStrip: [
        'No Laptop Required',
        'Multi-Device Sync',
        'Live Kitchen Updates',
        'Multi-Role Access',
        'Zero Commission',
      ],
      preview: {
        badge: 'Same App • Different Role',
        title: 'Your Restaurant in One Screen',
        subtitle: 'Tap each role to see how CleverOps runs front-of-house and kitchen operations live',
        tabs: {
          owner: 'Owner',
          smartMenu: 'Smart Menu',
          kitchen: 'Kitchen Display',
          waiter: 'Waiter',
          cashier: 'Cashier',
          attendance: 'Staff Attendance',
        },
        subtitles: {
          smart_menu: 'Smart Menu: Scan paper menu images & build editable draft menus with AI.',
          owner: 'Owner: Sales, inventory aur staff ek hi screen se manage karo.',
          kitchen: 'Kitchen: Live order queue bina kisi confusion ke.',
          waiter: 'Waiter: Table requests aur bill instantly receive karo.',
          cashier: 'Cashier: UPI aur receipt 2 taps me.',
          attendance: 'Staff Attendance: Phone se direct selfie biometric clock-in aur wage tracking.',
        },
        demoHeader: 'Demo Dashboard Preview',
        sampleTag: 'Sample Restaurant Data',
        owner: {
          todaySales: "Today's Sales",
          salesDemo: '↑ 18% (Demo)',
          activeTables: 'Active Tables',
          occupancy: '75% Occupancy',
          pendingBills: 'Pending Bills',
          tablesCheckout: '3 tables checkout',
          kitchenQueue: 'Kitchen Queue',
          avgPrep: 'Avg 6 min prep',
          staffOnline: 'Staff Online',
          allRolesSynced: 'All roles synced',
          lowStock: 'Low Stock',
          alertTriggered: 'Alert Triggered',
          riceAlert: 'Low Stock Alert: Basmati Rice (3.2 kg remaining)',
          actionRequired: 'Action Required',
        },
        kitchen: {
          batch1: 'Table 04 • Batch #1',
          statusNew: 'NEW ORDER',
          items1: '2x Paneer Tikka • 1x Garlic Naan',
          notes1: 'Chef Note: Less spicy, butter on side',
          batch2: 'Table 09 • Batch #2',
          statusPrep: 'PREPARING',
          items2: '1x Dal Makhani • 2x Roti',
          notes2: 'Timer: 6 min elapsed',
          batch3: 'Table 02 • Batch #1',
          statusReady: 'READY',
          items3: '1x Veg Biryani • 1x Raita',
          notes3: 'Waiter notified to pick up',
        },
        waiter: {
          card1Title: 'Table 03 • Table Call',
          card1Badge: 'URGENT',
          card1Desc: 'Customer requested water & extra cutlery',
          card1Time: 'Notification: 1 min ago',
          card2Title: 'Table 12 • Bill Request',
          card2Desc: 'Customer ready to settle check',
          card2Time: 'Forwarded to Cashier',
          card3Title: 'Table 07 • Served Items',
          card3Badge: '3 ITEMS SERVED',
          card3Desc: '2x Cold Coffee • 1x Cheese Pizza',
          punchButton: '+ Punch Add-on Item',
        },
        cashier: {
          card1Title: 'Table 12 • UPI Payment',
          card1Subtotal: 'Subtotal: ₹1,380 + GST: ₹70',
          card1Action: 'Instant UPI QR Generated',
          card2Title: 'Petty Cash Voucher',
          card2Status: 'Fresh Coriander & Ice • Approved',
          card2Action: 'Voucher #PC-108 Recorded',
          card3Title: 'Shift Cash Balancing',
          card3Total: '₹6,450 Total',
          card3Breakdown: 'Expected ₹6,450 • Counted ₹6,450',
          card3Action: 'Discrepancy: ₹0.00 Balanced',
        },
        attendance: {
          card1Title: 'Chef Vikram • Kitchen',
          card1Badge: 'ON DUTY',
          card1Desc: 'Clock-in: 10:15 AM • Selfie Verified',
          card1Action: '7h 20m Elapsed',
          card2Title: 'Waiter Rahul • Service',
          card2Badge: 'ON DUTY',
          card2Desc: 'Shift #1 Morning • 0 Late Marks',
          card2Action: 'PIN Clock-in Recorded',
          card3Title: 'Daily Attendance Summary',
          card3Total: '5 / 5 Present',
          card3Desc: 'Zero Biometric Hardware Required',
          card3Action: 'Automatic Wage Estimation',
        },
      },
      whyUs: {
        title: 'Agar phone chalana aata hai, to CleverOps bhi aasani se chala loge.',
        subtitle: 'Kisi mehengi POS machine, computer ya printer setup ki zarurat nahi.',
        card1Title: 'Purana Android phone chalega',
        card1Desc: 'Aapka aur aapke staff ka regular phone hi kaafi hai. Koi extra hardware kharidne ki zarurat nahi.',
        card2Title: 'Alag POS machine nahi chahiye',
        card2Desc: '₹30,000 se ₹50,000 ka bulky hardware expense bachega. Direct cloud-native web app.',
        card3Title: '5 minute me staff seekh jayega',
        card3Desc: 'WhatsApp jaisa simple aur intuitive layout. Kisi training ya technical knowledge ki zarurat nahi.',
      },
      reality: {
        title: 'Restaurant band hone ke baad bhi owner ka kaam khatam nahi hota.',
        subtitle: 'Din bhar ki bhag-daud ke baad kaghaz ke bills, cash galla aur inventory ka bojh — dekhiye CleverOps kaise poora hisaab automate karta hai.',
        col1Title: 'Without CleverOps',
        col1Badge: 'Manual & Frustrating',
        col1List: [
          { strong: 'Raat ko Galla Milane me Ghanto Barbaad', p: 'Cash counter par ₹500, ₹200, ₹100 ke notes gin-te waqt hisaab nahi milta. Cash kam nikalne par pata nahi chalta kis cashier shift me chori hui.' },
          { strong: 'Kaghaz ki KOT Parchi Gum ya Bheeg Jana', p: 'Kitchen me paper slips paani ya tel se bheeg jati hain ya kho jati hain. Chef ko late order milta hai aur customer 30 minute baad gussa hota hai.' },
          { strong: 'Raw Material Chori & Midnight Stockout', p: 'Paneer, chicken, cheese ya amul butter kitna bacha hai pata nahi chalta. Subah restaurant kholte hi stockout hone par customer wapas jate hain.' },
          { strong: 'Mandi ke Rate Badhne par Menu me Loss', p: 'Mandi me tamatar ₹30 se ₹80 ho gaya ya cooking oil mehenga ho gaya, par menu price purani rehti hai. Pata hi nahi chalta kaunsi plate loss me bik rahi hai.' },
          { strong: 'Doodh, Sabzi ke Kharcho me Cash Leakage', p: 'Staff daily kache kharche (petty cash) ke naam par bina receipt ke galla se paise nikal leta hai, aur attendance register me fake time mark karta hai.' },
        ],
        col2Title: 'With CleverOps',
        col2Badge: '100% Automated',
        col2List: [
          { strong: 'Shift Cash Register & Denominations', p: 'Shift khatam hote hi cashier notes (500x, 200x, 100x) count enter karega. System turant Expected vs Counted Cash milakar Over/Short hisaab clear kar deta hai.' },
          { strong: 'Live KDS Screen & Color-Coded Timers', p: 'Har table ka order phone ya tablet par live KDS screen par aata hai. Green se Red color timer alert deta hai — ek bhi order miss ya late nahi hota.' },
          { strong: 'Auto Recipe Stock Deduct & Low Stock Alerts', p: 'Har plate Paneer Butter Masala order hone par 200g Paneer aur 25g Butter auto-minus hota hai. Stock limit reach hote hi Owner ke mobile par turant alert notification.' },
          { strong: 'Dynamic AI Recipe Costing & Live Margin %', p: 'Mandi ke naye purchase rates dalte hi CleverOps har plate ki real recipe cost calculate karta hai aur live Gross Profit % dikhata hai — zero guessing.' },
          { strong: 'Petty Cash Voucher with Photo & PIN Clock-in', p: 'Bina bill ki photo upload kiye galla se ₹1 bhi voucher pass nahi hota. Staff selfie + 4-digit PIN se attendance mark karta hai aur automatic wage ready hoti hai.' },
        ],
      },
      smartCosting: {
        title: 'Aaj Tamatar mehenga hua. Kal Oil. Par aapki dish ki asli costing kitni badli?',
        subtitle: 'Shayad aapne kabhi calculate nahi kiya. CleverOps har recipe ki real costing automatically track karta hai.',
        badge: 'Food Cost Intelligence',
        impactHeadline: 'Tamatar ₹30 se ₹70 ho gaya? Oil mehenga ho gaya? Cheese ka rate badal gaya?',
        impactDesc: 'CleverOps automatically dish ki recipe costing update karega aur live profit margin dikhayega.',
        demoDish: 'Paneer Butter Masala',
        demoTag: 'Demo Recipe Calculation',
        menuPrice: 'Menu Selling Price: ₹220',
        beforeTitle: 'Before Rate Change',
        paneerRate: 'Paneer Wholesale Rate:',
        baseCost: 'Dish Base Recipe Cost:',
        beforeProfit: 'Gross Profit Margin: 78% (₹172 profit)',
        afterTitle: 'After Market Price Spike',
        afterPaneer: '₹360 / kg (+28%)',
        afterProfit: 'Live Margin Auto-Updated: 71% (₹158 profit)',
        highlightBanner: 'Rate badalte hi CleverOps recipe costing automatically update karta hai.',
        card1Title: 'Live Cost Tracking',
        card1Desc: 'Ingredient ka rate badalte hi recipe costing update. Har rate change ka live calculation.',
        card2Title: 'Low Stock Alert',
        card2Desc: 'Inventory kam hote hi Owner aur Manager ko alert. Stock khatam hone se pehle notification.',
        card3Title: 'Auto Menu Hide',
        card3Desc: 'Item khatam? Dish customer menu se automatically hide taaki waiter ko "nahi hai" na bolna pade.',
        card4Title: 'Auto Return',
        card4Desc: 'Refill karte hi dish wapas menu me aa jaye bina kisi manual settings ya click ke.',
        card5Title: 'Margin Visibility',
        card5Desc: 'Kaunsi dish profit de rahi hai aur kaunsi loss me ja rahi hai — real-time gross margin report mobile par dekhein.',
        bottomTag: 'Refill hote hi dish automatically menu me wapas aa jayegi.',
      },
      workflow: {
        title: 'Subah se Raat tak — CleverOps Poora Din Kaise Handle Karta Hai',
        subtitle: 'Kitchen se lekar billing aur closing reports tak — bina kisi confusion ke smooth operations',
        steps: [
          { time: '9:00 AM', title: 'Restaurant Open', desc: 'Store check aur low stock alerts. Turant pata chal jata hai aaj market se kya raw material mangwana hai.' },
          { time: '11:30 AM', title: 'QR Orders Start', desc: 'Customers table par baithe hi QR code scan karke order punch karte hain. Zero waiter dependency.' },
          { time: '1:00 PM', title: 'Kitchen Auto-Sync', desc: 'Lunch rush me kitchen display screen par color-coded tickets chalte hain with prep timers aur chef notes.' },
          { time: '4:00 PM', title: 'Low Stock Alert', desc: 'Koi ingredient khatam hone laga to Owner ko auto-alert milta hai aur dish menu se automatically hide ho jati hai.' },
          { time: '8:30 PM', title: 'Rush Hour Handled', desc: 'Dinner rush me fast table turnover, instant UPI QR payment aur 3-inch thermal billing counter par smooth.' },
          { time: '10:30 PM', title: 'Reports Automatically Ready', desc: 'Day closing hote hi total revenue, item sales, consumption aur net profit margins mobile dashboard par ready.' },
        ],
      },
      demoVideos: {
        title: 'Dekho CleverOps Asli Restaurant Me Kaise Kaam Karta Hai',
        subtitle: 'Watch how owners, kitchen staff and waiters use CleverOps in real restaurants.',
        card1Title: 'Owner App (45 sec Demo)',
        card1Badge: 'Real Owner Dashboard',
        card1Header: 'Owner App Demo',
        card1Desc: 'Sales, Reports aur Inventory management live.',
        card2Title: 'Kitchen Display (45 sec Demo)',
        card2Badge: 'Live Kitchen Workflow',
        card2Header: 'Kitchen Display Demo',
        card2Desc: 'Live order tickets aur kitchen workflow live.',
        card3Title: 'Waiter App (45 sec Demo)',
        card3Badge: 'Waiter Service Flow',
        card3Header: 'Waiter App Demo',
        card3Desc: 'Table requests, quick punch aur billing live.',
      },
      features: {
        title: 'Feature Showcase',
        subtitle: 'Swipe karke dekhiye restaurant operating system ke sabhi powerful features',
        unlockText: '100% Unlocked in ₹3 Trial',
        items: [
          { title: 'QR Ordering', desc: 'Table par instant digital menu. Zero wait time, direct order placing without app installation.' },
          { title: 'Live KDS', desc: 'Dedicated kitchen display screen with color-coded tickets and real-time preparation timers.' },
          { title: 'Inventory', desc: 'Automatic raw material deduction on every order. Low stock alerts before you run out.' },
          { title: 'AI Recipe', desc: 'Calculates exact ingredient proportions, standard cooking instructions, and per-dish base cost.' },
          { title: 'AI Menu', desc: 'Generates high-converting dish descriptions and automated category structuring in seconds.' },
          { title: 'Billing & GST', desc: 'Subtotal, customizable GST, thermal receipt printouts, and dynamic UPI QR checkout.' },
          { title: 'Reports & Analytics', desc: 'Daily sales, food cost margin tracking, and top selling leaderboard right on your mobile.' },
          { title: 'Shift Cash Closing', desc: 'Shift drawer balancing, denomination counting, over/short alerts, and audit-ready Z-Reports.' },
          { title: 'Petty Cash Vouchers', desc: 'Record daily emergency kitchen expenses with manager approvals and zero cash drawer theft.' },
          { title: 'Staff Attendance', desc: 'Selfie and PIN-based clock-in, shift management, late marks, and automated monthly payroll.' },
        ],
      },
      businessTypes: {
        title: 'Har Food Business ke liye Banaya Gaya',
        subtitle: 'Chhota cafe ho ya bada family restaurant — CleverOps har format ke operations ko aasaan banata hai',
        items: [
          { title: 'Fine Dine & Family Restaurants', desc: 'Table QR Ordering + Live Kitchen KOT + Captain Waiter App.' },
          { title: 'Cafes & QSRs', desc: 'Fast Counter Billing + Token Display + Recipe Cost & Profit Margins.' },
          { title: 'Cloud Kitchens & Dhabas', desc: 'Raw Material Stock Inventory + Roz ka Galla (Daily Cash Closing).' },
          { title: '100% Made in India Support', desc: 'Direct WhatsApp aur Call par support, bina kisi technical confusion ke.' },
        ],
      },
      comparison: {
        title: 'Traditional POS vs CleverOps',
        subtitle: 'Factual comparison based on real restaurant operations',
        headers: ['Feature', 'Traditional POS', 'CleverOps'],
        rows: [
          { feature: 'QR Ordering', pos: 'Partial', clever: 'Yes' },
          { feature: 'Live Kitchen (KDS)', pos: 'Limited / Add-on', clever: 'Yes' },
          { feature: 'Inventory & Stock', pos: 'Extra Software', clever: 'Included' },
          { feature: 'Recipe Costing', pos: 'Manual', clever: 'Automatic' },
          { feature: 'Low Stock Alerts', pos: 'No', clever: 'Yes' },
          { feature: 'Auto Menu Hide', pos: 'No', clever: 'Yes' },
          { feature: 'One App for All Roles', pos: 'No', clever: 'Yes' },
          { feature: 'Shift Cash Register Closing', pos: 'Extra Paid Add-on', clever: 'Yes' },
          { feature: 'Petty Cash Vouchers', pos: 'Manual Ledger', clever: 'Yes' },
          { feature: 'Staff Attendance & Payroll', pos: 'Separate ₹15,000 Machine', clever: 'Yes (Phone)' },
          { feature: 'Owner Reports', pos: 'Basic', clever: 'Live on Mobile' },
          { feature: 'Hardware Required', pos: 'Often Yes (Costly)', clever: 'No (Phone is enough)' },
        ],
      },
      faqs: {
        title: 'Frequently Asked Questions',
        subtitle: 'Restaurant owners ke aam sawal aur unke seedhe jawab',
        list: [
          { q: 'Kya CleverOps chalane ke liye laptop ya computer chahiye?', a: 'Bilkul nahi. Aap aur aapka staff poora CleverOps apne regular smartphone ya kisi purane Android tablet se chala sakte hain.' },
          { q: 'Existing Android phone chalega?', a: 'Haan! CleverOps ek lightweight cloud-native app hai. Kisi bhi basic Android phone ya iPhone par smooth chalta hai.' },
          { q: 'Waiter aur Kitchen alag alag login kar sakte hain?', a: 'Haan, CleverOps me role-based access hai. Waiter ko sirf table orders aur service requests dikhenge, Kitchen ko live KDS tickets, aur Owner ko poora control.' },
          { q: 'Inventory aur recipe costing kaise track hoti hai?', a: 'Menu item banate waqt ingredients link ho jate hain. Har order par inventory automatically deduct hoti hai aur live ingredient rate ke hisaab se costing update hoti hai.' },
          { q: 'Item khatam hone par dish automatically hide ho jati hai?', a: 'Haan! Jaise hi kisi ingredient ka stock khatam hota hai, customer ke QR menu se wo dish automatically hide ho jati hai taaki order confusion na ho. Refill hote hi wapas aa jati hai.' },
          { q: '₹3 ke trial me kya kya milega?', a: 'Poore 3 din ke liye sabhi Pro/Premium features 100% unlocked milenge: QR Ordering, Live KDS, Inventory, AI Menu, AI Recipes aur Reports. Koi hidden charge nahi.' },
        ],
      },
      conversionStrip: {
        badge: 'Zero Risk Trial',
        title: 'Sirf ₹3 me 3 din ke liye sab features unlock.',
        desc: 'Razorpay secure checkout. Koi hidden charge ya setup fees nahi.',
        cta: 'Start 3-Day Trial for ₹3',
        secure: 'Razorpay Secure',
      },
      pricing: {
        title: 'Flexible SaaS Subscription Plans',
        subtitle: 'Zero order commission. Pay a simple flat recurring subscription.',
        monthly: 'Monthly Billing',
        yearly: 'Yearly Billing (10% Off)',
        planSuffix: 'Plan',
        perMonth: '/month',
        perYear: '/year',
        getStarted: 'Get Started',
        unlimitedBadge: 'Unlimited tables & menu items',
        upToBadge: (tables: any, items: any) => `Up to ${tables} tables & ${items} menu items`,
        plans: {
          starter: 'Ideal for small cafes or pop-up bistros testing QR ordering.',
          pro: 'Perfect for standard restaurants looking to optimize workflows.',
          premium: 'Best for large multi-room dining lounges and high volume outlets.',
        },
      },
      trustBadges: [
        'Cancel Anytime',
        'GST Invoice',
        'Razorpay Secure',
        'Cloud Backup',
      ],
      floatingBar: {
        title: '3-Din Trial @ ₹3',
        subtitle: 'Koi Auto-Debit Nahi',
        cta: 'Abhi Chalu Karein →',
        microcopy: 'No Laptop Required • Razorpay Secure • Instant Activation',
      },
      footer: {
        desc: 'Modern QR Code Ordering System, Kitchen KDS & Waiter Calling Portal for fast-paced restaurants & cafes.',
        gateway: 'Razorpay Verified Secure Gateway',
        productHeading: 'Product & Solution',
        featuresLink: 'Platform Features',
        pricingLink: 'Pricing & Subscription',
        aboutLink: 'About Us',
        loginLink: 'Restaurant Login',
        registerLink: 'Register Restaurant',
        legalHeading: 'Legal & Compliance',
        refundLink: 'Cancellation & Refund Policy',
        privacyLink: 'Privacy Policy',
        termsLink: 'Terms & Conditions',
        disclaimerLink: 'Disclaimer',
        supportHeading: 'Support & Help',
        address: '214B 2nd Floor, Riddhi Siddhi Complex, Madhuban, Udaipur, Rajasthan - 313001',
        rights: 'All rights reserved.',
        privacy: 'Privacy',
        refunds: 'Refunds',
        terms: 'Terms',
        contact: 'Contact',
      }
    },
    en: {
      modal: {
        title: 'Choose your language',
        subtitle: 'You can switch your language anytime later.',
        btnHinglish: 'Hinglish',
        btnEnglish: 'English',
      },
      nav: {
        preview: 'Preview',
        noHardware: 'No Hardware',
        smartCosting: 'Smart Costing',
        demoVideos: 'Demo Videos',
        pricing: 'Pricing',
        signIn: 'Sign In',
        trialCta: 'Start a 3-Day Trial for ₹3',
        trialCtaMobile: 'Trial ₹3',
        productPreview: 'Product Preview',
        noHardwareNeeded: 'No Hardware Needed',
      },
      hero: {
        pill: 'Built for Restaurant, Cafe & Cloud Kitchen Owners',
        titlePrefix: 'Run your entire restaurant.',
        titleHighlight: 'Right from your Mobile.',
        subtitle: 'Run Billing, Live Kitchen (KOT), Food Inventory, and Daily Cash Register from your regular phone — without buying expensive ₹40,000 POS machines.',
        checkpoints: [
          'No Laptop or Extra Hardware Needed',
          'Staff Learns in 5 Minutes',
          '100% Control over Stock & Food Cost',
        ],
        trialCta: 'Start 3-Day Trial (Just ₹3)',
        demoCta: 'View Live Demo Screen',
        microcopy: '🔒 100% Safe Razorpay Checkout • No Auto-Debit • Instant Activation',
      },
      scrollMagnet: {
        boldLine: 'Sales happen every day, but where is the money quietly leaking?',
        subLine: 'In just a ₹3 3-Day Trial, see the complete reality of your kitchen, cash drawer, staff hours, and inventory with your own eyes — Check your savings in the calculator below:',
        cta: 'Check Loss Calculator',
      },
      calculator: {
        badge: 'Live Restaurant Leak & Profit Calculator',
        title: 'Calculate the Hidden Monthly Losses in Your Restaurant',
        subtitle: 'Based on your tables, staff, and monthly sales, see how much money and time CleverOps saves every single month:',
        tablesLabel: 'Total Tables',
        staffLabel: 'Total Staff (Waiters, Kitchen, Cashiers)',
        salesLabel: 'Monthly Sales (Approx ₹)',
        resultHeadline: 'Estimated Monthly Savings & Extra Profit:',
        perMonth: '/ Month',
        yearlyBadge: (val: string) => `Saves ~${val} Every Year!`,
        row1Title: 'Kitchen Pilferage & Cancelled Order Audit:',
        row1Desc: '(Via Recipe BOM & Cancelled Food Disposition audit)',
        row2Title: 'Exact Working Hours, OT Control & More Tables per Waiter:',
        row2Desc: '(Exact shift hours tracking + QR ordering lets existing staff handle more tables)',
        row3Title: 'Fast Table Turnover & Auto Stock-Out Menu Sync:',
        row3Desc: '(Items with zero stock auto-hide from menu + KDS enables 20-min faster service)',
        row4Title: 'Cash Drawer Reconciliation & Petty Cash Oversight:',
        row4Desc: '(Shift cash closing with denomination counting and photo slip voucher approvals)',
        row5Title: 'Biometric Machine & Menu Printing Zero Expense:',
        row5Desc: '(Phone selfie + GPS clock-in and instant AI paper menu digitization)',
        ctaText: (val: string) => `To stop losing ${val} every single month — Start a ₹3 3-Day Trial and discover your restaurant\'s true numbers!`,
        ctaBtn: 'Start 3-Day Trial for Just ₹3 →',
      },
      operationsBreakdown: {
        badge: 'Operations Simplified • 100% Practical',
        title: 'How is This Money Saved & Daily Work Simplified?',
        subtitle: 'Zero theoretical jargon — see how CleverOps\'s 8 real ground features run your restaurant smoothly:',
        cards: [
          {
            num: '01',
            title: 'Exact Working Hours + Automated Overtime & Payroll',
            desc: 'Selfie + GPS Geofence clock-in/out. Track exact daily hours, late arrivals, overtime, and salary advances — generate complete PDF payslips at month-end in one click.',
          },
          {
            num: '02',
            title: 'Depleted Stock = Instant Menu Auto-Hide',
            desc: 'When raw ingredients run out, the dish automatically hides from the customer QR menu. Never embarrass waiters having to say \'Sorry, out of stock\', and restock brings it back instantly.',
          },
          {
            num: '03',
            title: 'Same Staff, More Tables (Without New Hires)',
            desc: 'Guests order from table QR codes and request \'Water\', \'Cutlery\', \'Call Waiter\', or \'Bill\' directly on screen. Eliminates wasted waiter trips so current staff easily handles rush hours.',
          },
          {
            num: '04',
            title: 'Kitchen Pilferage & Cancelled Order Audit',
            desc: 'Every order deducts exact grams based on Recipe BOM. If an order is cancelled, chefs must log whether it was resold, consumed as staff meal, or wasted — no more unaccounted food.',
          },
          {
            num: '05',
            title: 'Night Shift Cash Closing & Photo Petty Cash Slips',
            desc: 'Morning float + Cash sales - Approved petty cash vouchers (with mandatory bill photos) = Exact cash drawer tally. Even a ₹10 discrepancy triggers an instant Red Variance Alert.',
          },
          {
            num: '06',
            title: 'Loud Kitchen Chime & Offline-First KDS',
            desc: 'Audible chime and prep timers on every new order. As soon as food is plated, a 1-tap \'Ready\' notification rings the waiter\'s phone. Offline queue works even if Wi-Fi drops.',
          },
          {
            num: '07',
            title: '1-Click Split Bills & Party Table Merging',
            desc: 'Whether guests place 3 order rounds (Starters, Mains, Dessert) or merge tables for a large party, a single consolidated bill is generated with 2-second cash/UPI split calculations.',
          },
          {
            num: '08',
            title: 'AI Paper Menu Scanner & 1-Click Tally GST Reports',
            desc: 'Photograph paper menus to build an editable digital menu in 2 minutes. At month-end, hand your CA a 1-click Tally-ready CSV export for seamless GST filing.',
          },
        ],
      },
      trustStrip: [
        'No Laptop Required',
        'Multi-Device Sync',
        'Live Kitchen Updates',
        'Multi-Role Access',
        'Zero Commission',
      ],
      preview: {
        badge: 'Same App • Different Role',
        title: 'Your Restaurant in One Screen',
        subtitle: 'Tap each role to see how CleverOps runs front-of-house and kitchen operations live',
        tabs: {
          owner: 'Owner',
          smartMenu: 'Smart Menu',
          kitchen: 'Kitchen Display',
          waiter: 'Waiter',
          cashier: 'Cashier',
          attendance: 'Staff Attendance',
        },
        subtitles: {
          smart_menu: 'Smart Menu: Scan paper menu images & build editable draft menus with AI.',
          owner: 'Owner: Manage sales, inventory, and staff from a single screen.',
          kitchen: 'Kitchen: Live order queue without any confusion.',
          waiter: 'Waiter: Receive table service calls and bill requests instantly.',
          cashier: 'Cashier: Instant UPI QR and receipt printing in 2 taps.',
          attendance: 'Staff Attendance: Direct phone-based selfie biometric clock-in and automated payroll tracking.',
        },
        demoHeader: 'Demo Dashboard Preview',
        sampleTag: 'Sample Restaurant Data',
        owner: {
          todaySales: "Today's Sales",
          salesDemo: '↑ 18% (Demo)',
          activeTables: 'Active Tables',
          occupancy: '75% Occupancy',
          pendingBills: 'Pending Bills',
          tablesCheckout: '3 tables checkout',
          kitchenQueue: 'Kitchen Queue',
          avgPrep: 'Avg 6 min prep',
          staffOnline: 'Staff Online',
          allRolesSynced: 'All roles synced',
          lowStock: 'Low Stock',
          alertTriggered: 'Alert Triggered',
          riceAlert: 'Low Stock Alert: Basmati Rice (3.2 kg remaining)',
          actionRequired: 'Action Required',
        },
        kitchen: {
          batch1: 'Table 04 • Batch #1',
          statusNew: 'NEW ORDER',
          items1: '2x Paneer Tikka • 1x Garlic Naan',
          notes1: 'Chef Note: Less spicy, butter on side',
          batch2: 'Table 09 • Batch #2',
          statusPrep: 'PREPARING',
          items2: '1x Dal Makhani • 2x Roti',
          notes2: 'Timer: 6 min elapsed',
          batch3: 'Table 02 • Batch #1',
          statusReady: 'READY',
          items3: '1x Veg Biryani • 1x Raita',
          notes3: 'Waiter notified to pick up',
        },
        waiter: {
          card1Title: 'Table 03 • Table Call',
          card1Badge: 'URGENT',
          card1Desc: 'Customer requested water & extra cutlery',
          card1Time: 'Notification: 1 min ago',
          card2Title: 'Table 12 • Bill Request',
          card2Desc: 'Customer ready to settle check',
          card2Time: 'Forwarded to Cashier',
          card3Title: 'Table 07 • Served Items',
          card3Badge: '3 ITEMS SERVED',
          card3Desc: '2x Cold Coffee • 1x Cheese Pizza',
          punchButton: '+ Punch Add-on Item',
        },
        cashier: {
          card1Title: 'Table 12 • UPI Payment',
          card1Subtotal: 'Subtotal: ₹1,380 + GST: ₹70',
          card1Action: 'Instant UPI QR Generated',
          card2Title: 'Petty Cash Voucher',
          card2Status: 'Fresh Coriander & Ice • Approved',
          card2Action: 'Voucher #PC-108 Recorded',
          card3Title: 'Shift Cash Balancing',
          card3Total: '₹6,450 Total',
          card3Breakdown: 'Expected ₹6,450 • Counted ₹6,450',
          card3Action: 'Discrepancy: ₹0.00 Balanced',
        },
        attendance: {
          card1Title: 'Chef Vikram • Kitchen',
          card1Badge: 'ON DUTY',
          card1Desc: 'Clock-in: 10:15 AM • Selfie Verified',
          card1Action: '7h 20m Elapsed',
          card2Title: 'Waiter Rahul • Service',
          card2Badge: 'ON DUTY',
          card2Desc: 'Shift #1 Morning • 0 Late Marks',
          card2Action: 'PIN Clock-in Recorded',
          card3Title: 'Daily Attendance Summary',
          card3Total: '5 / 5 Present',
          card3Desc: 'Zero Biometric Hardware Required',
          card3Action: 'Automatic Wage Estimation',
        },
      },
      whyUs: {
        title: 'If you can use a phone, you can run CleverOps.',
        subtitle: 'No expensive POS machine, bulky computer, or printer setup required.',
        card1Title: 'Any Android phone works',
        card1Desc: 'Your staff’s regular smartphones are enough. No need to buy specialized hardware.',
        card2Title: 'No separate POS machine needed',
        card2Desc: 'Save ₹30,000 to ₹50,000 in upfront hardware costs. Run directly on the modern cloud web app.',
        card3Title: 'Staff learns in 5 minutes',
        card3Desc: 'Simple and intuitive layout as easy as WhatsApp. Zero training or technical knowledge needed.',
      },
      reality: {
        title: 'Even after closing hours, a restaurant owner’s work isn’t done.',
        subtitle: 'After a long day on your feet, sorting paper bills, cash discrepancies, and stock is exhausting — see how CleverOps automates your entire restaurant.',
        col1Title: 'Without CleverOps',
        col1Badge: 'Manual & Frustrating',
        col1List: [
          { strong: 'Hours Wasted Tallying Cash Drawers', p: 'Counting ₹500, ₹200, ₹100 notes manually at midnight. When cash is short, you have no proof of which cashier shift caused the discrepancy.' },
          { strong: 'Lost, Soaked & Delayed Paper KOTs', p: 'Kitchen slips get lost, oil-soaked, or misplaced. Shouting between waiters and chefs leads to furious customers waiting 40 minutes for food.' },
          { strong: 'Kitchen Pilferage & Surprise Stockouts', p: 'No track of how much paneer, chicken, or butter was used vs wasted. You open in the morning only to find core ingredients completely exhausted.' },
          { strong: 'Mandi Price Spikes Selling Dishes at a Loss', p: 'Tomato or cooking oil wholesale prices surge 60%, but your menu price stays unchanged — quietly eroding your monthly net profits.' },
          { strong: 'Unverified Petty Cash & Staff Proxy Time', p: 'Cash disappears from the register for daily milk/veggies without receipts, while staff fill paper registers with fabricated attendance hours.' },
        ],
        col2Title: 'With CleverOps',
        col2Badge: '100% Automated',
        col2List: [
          { strong: 'Shift Cash Register & Note Denominations', p: 'Cashiers input note counts (500x, 200x, 100x) at shift end. Instant Expected vs Actual reconciliation highlights any over/short variance.' },
          { strong: 'Live Multi-KDS Display & Prep Timers', p: 'Orders appear instantly on kitchen phone/tablet displays with color-coded timers (Green → Yellow → Red). Zero lost tickets or delayed meals.' },
          { strong: 'Auto Recipe Stock Deduction & Low-Stock Alerts', p: 'Every billed dish automatically deducts raw materials based on its linked recipe. Owners get instant mobile alerts before items run dry.' },
          { strong: 'Dynamic AI Recipe Costing & Live Margin %', p: 'Enter new wholesale purchase prices and CleverOps instantly recalculates plate cost and live profit margin % across all portions.' },
          { strong: 'Photo Petty Cash Vouchers & PIN Attendance', p: 'Cash disbursements require mandatory bill photo uploads and manager approval. Staff clock in via selfie + 4-digit PIN with automated payroll.' },
        ],
      },
      smartCosting: {
        title: 'Tomato prices went up today. Oil tomorrow. But how did your dish cost change?',
        subtitle: 'Chances are you’ve never calculated it in real time. CleverOps tracks true recipe costing automatically.',
        badge: 'Food Cost Intelligence',
        impactHeadline: 'Tomatoes surged from ₹30 to ₹70? Cooking oil got expensive? Cheese rates changed?',
        impactDesc: 'CleverOps automatically updates recipe costing and displays your live gross profit margin.',
        demoDish: 'Paneer Butter Masala',
        demoTag: 'Demo Recipe Calculation',
        menuPrice: 'Menu Selling Price: ₹220',
        beforeTitle: 'Before Rate Change',
        paneerRate: 'Paneer Wholesale Rate:',
        baseCost: 'Dish Base Recipe Cost:',
        beforeProfit: 'Gross Profit Margin: 78% (₹172 profit)',
        afterTitle: 'After Market Price Spike',
        afterPaneer: '₹360 / kg (+28%)',
        afterProfit: 'Live Margin Auto-Updated: 71% (₹158 profit)',
        highlightBanner: 'The moment wholesale rates change, CleverOps updates recipe costs automatically.',
        card1Title: 'Live Cost Tracking',
        card1Desc: 'Instant recipe costing adjustments as soon as ingredient market prices change.',
        card2Title: 'Low Stock Alert',
        card2Desc: 'Owner and manager alerted before ingredients run out. Proactive notifications.',
        card3Title: 'Auto Menu Hide',
        card3Desc: 'Ingredient out of stock? Dish automatically hides from the customer QR menu to prevent order rejection.',
        card4Title: 'Auto Return',
        card4Desc: 'Refill stock and the dish instantly reappears on the customer menu with zero clicks.',
        card5Title: 'Margin Visibility',
        card5Desc: 'See which dishes generate profit and which bleed money — real-time gross margin reports on your mobile.',
        bottomTag: 'The moment you restock, the dish automatically returns to the menu.',
      },
      workflow: {
        title: 'From Morning to Midnight — How CleverOps Manages Your Entire Day',
        subtitle: 'From kitchen preparation to billing and closing reports — seamless, confusion-free operations',
        steps: [
          { time: '9:00 AM', title: 'Restaurant Opens', desc: 'Stock inspection and low-stock alerts. Know immediately what supplies to procure from the market.' },
          { time: '11:30 AM', title: 'QR Ordering Begins', desc: 'Guests scan the QR code right at their tables and place orders directly. Zero waiter dependency.' },
          { time: '1:00 PM', title: 'Kitchen Auto-Sync', desc: 'During the lunch rush, color-coded KDS tickets with timers and chef notes keep the line moving fast.' },
          { time: '4:00 PM', title: 'Low Stock Alerts', desc: 'If an ingredient runs low, the owner receives an alert and the dish auto-hides from the menu.' },
          { time: '8:30 PM', title: 'Dinner Rush Handled', desc: 'Rapid table turnover with dynamic UPI QR payment and 3-inch thermal billing at the counter.' },
          { time: '10:30 PM', title: 'Automated Closing Reports', desc: 'At day’s end, total revenue, item breakdown, ingredient usage, and net margins are ready in one tap.' },
        ],
      },
      demoVideos: {
        title: 'See How CleverOps Works in a Real Restaurant',
        subtitle: 'Watch how owners, kitchen staff, and waiters use CleverOps in real daily operations.',
        card1Title: 'Owner App (45 sec Demo)',
        card1Badge: 'Real Owner Dashboard',
        card1Header: 'Owner App Demo',
        card1Desc: 'Live sales analytics, reports, and inventory management.',
        card2Title: 'Kitchen Display (45 sec Demo)',
        card2Badge: 'Live Kitchen Workflow',
        card2Header: 'Kitchen Display Demo',
        card2Desc: 'Real-time order tickets and streamlined kitchen workflow.',
        card3Title: 'Waiter App (45 sec Demo)',
        card3Badge: 'Waiter Service Flow',
        card3Header: 'Waiter App Demo',
        card3Desc: 'Instant table calling, quick add-on punching, and bill settlements.',
      },
      features: {
        title: 'Feature Showcase',
        subtitle: 'Swipe through all the powerful features built for modern restaurants',
        unlockText: '100% Unlocked in ₹3 Trial',
        items: [
          { title: 'QR Ordering', desc: 'Instant digital menu right at the table. Zero wait times, direct ordering without app downloads.' },
          { title: 'Live KDS', desc: 'Dedicated kitchen display screen with color-coded tickets and real-time preparation timers.' },
          { title: 'Inventory', desc: 'Automatic raw material deduction on every order. Low stock alerts before you run out.' },
          { title: 'AI Recipe', desc: 'Calculates exact ingredient proportions, standard cooking instructions, and per-dish base cost.' },
          { title: 'AI Menu', desc: 'Generates high-converting dish descriptions and automated category structuring in seconds.' },
          { title: 'Billing & GST', desc: 'Subtotal, customizable GST, thermal receipt printouts, and dynamic UPI QR checkout.' },
          { title: 'Reports & Analytics', desc: 'Daily sales, food cost margin tracking, and top-selling leaderboard right on your mobile.' },
          { title: 'Shift Cash Closing', desc: 'Shift drawer balancing, denomination counting, over/short alerts, and audit-ready Z-Reports.' },
          { title: 'Petty Cash Vouchers', desc: 'Record daily emergency kitchen expenses with manager approvals and zero cash drawer theft.' },
          { title: 'Staff Attendance', desc: 'Selfie and PIN-based clock-in, shift management, late marks, and automated monthly payroll.' },
        ],
      },
      businessTypes: {
        title: 'Built for Every Food Business',
        subtitle: 'From cozy cafes to busy multi-floor restaurants — CleverOps adapts to your specific operation',
        items: [
          { title: 'Fine Dine & Family Restaurants', desc: 'Table QR Ordering + Live Kitchen KOT + Captain Waiter App.' },
          { title: 'Cafes & QSRs', desc: 'Fast Counter Billing + Token Display + Recipe Cost & Profit Margins.' },
          { title: 'Cloud Kitchens & Dhabas', desc: 'Raw Material Stock Inventory + Daily Cash Register Closing.' },
          { title: '100% Made in India Support', desc: 'Direct assistance via WhatsApp and Phone with zero delays.' },
        ],
      },
      comparison: {
        title: 'Traditional POS vs CleverOps',
        subtitle: 'Factual comparison based on real restaurant operations',
        headers: ['Feature', 'Traditional POS', 'CleverOps'],
        rows: [
          { feature: 'QR Ordering', pos: 'Partial', clever: 'Yes' },
          { feature: 'Live Kitchen (KDS)', pos: 'Limited / Add-on', clever: 'Yes' },
          { feature: 'Inventory & Stock', pos: 'Extra Software', clever: 'Included' },
          { feature: 'Recipe Costing', pos: 'Manual', clever: 'Automatic' },
          { feature: 'Low Stock Alerts', pos: 'No', clever: 'Yes' },
          { feature: 'Auto Menu Hide', pos: 'No', clever: 'Yes' },
          { feature: 'One App for All Roles', pos: 'No', clever: 'Yes' },
          { feature: 'Shift Cash Register Closing', pos: 'Extra Paid Add-on', clever: 'Yes' },
          { feature: 'Petty Cash Vouchers', pos: 'Manual Ledger', clever: 'Yes' },
          { feature: 'Staff Attendance & Payroll', pos: 'Separate ₹15,000 Machine', clever: 'Yes (Phone)' },
          { feature: 'Owner Reports', pos: 'Basic', clever: 'Live on Mobile' },
          { feature: 'Hardware Required', pos: 'Often Yes (Costly)', clever: 'No (Phone is enough)' },
        ],
      },
      faqs: {
        title: 'Frequently Asked Questions',
        subtitle: 'Clear, honest answers to common questions from restaurant owners',
        list: [
          { q: 'Do I need a laptop or computer to run CleverOps?', a: 'Not at all. You and your staff can run the entire CleverOps platform on your regular smartphones or any affordable Android tablet.' },
          { q: 'Will my existing Android phone work?', a: 'Yes! CleverOps is a lightweight, cloud-native web app. It runs smoothly on any basic Android phone or iPhone.' },
          { q: 'Can Waiters and Kitchen staff have separate logins?', a: 'Yes, CleverOps features role-based access control. Waiters see only table orders and service calls, Kitchen gets live KDS tickets, and the Owner retains full control.' },
          { q: 'How does inventory and recipe costing tracking work?', a: 'When you create a menu item, you link raw ingredients. With every order placed, stock is automatically deducted and recipe costing updates based on live ingredient prices.' },
          { q: 'Does a dish automatically hide from the menu when out of stock?', a: 'Yes! As soon as an ingredient is depleted, the dish automatically hides from the customer QR menu to prevent order confusion. Once restocked, it returns immediately.' },
          { q: 'What is included in the ₹3 trial?', a: 'You get 100% unlocked access to all Pro/Premium features for 3 full days: QR Ordering, Live KDS, Inventory, AI Menu, AI Recipes, and Reports. Zero hidden fees.' },
        ],
      },
      conversionStrip: {
        badge: 'Zero Risk Trial',
        title: 'Unlock all features for 3 days for just ₹3.',
        desc: 'Razorpay secure checkout. Zero hidden charges or setup fees.',
        cta: 'Start a 3-Day Trial for ₹3',
        secure: 'Razorpay Secure',
      },
      pricing: {
        title: 'Flexible SaaS Subscription Plans',
        subtitle: 'Zero order commission. Pay a simple flat recurring subscription.',
        monthly: 'Monthly Billing',
        yearly: 'Yearly Billing (10% Off)',
        planSuffix: 'Plan',
        perMonth: '/month',
        perYear: '/year',
        getStarted: 'Get Started',
        unlimitedBadge: 'Unlimited tables & menu items',
        upToBadge: (tables: any, items: any) => `Up to ${tables} tables & ${items} menu items`,
        plans: {
          starter: 'Ideal for small cafes or pop-up bistros testing QR ordering.',
          pro: 'Perfect for standard restaurants looking to optimize workflows.',
          premium: 'Best for large multi-room dining lounges and high volume outlets.',
        },
      },
      trustBadges: [
        'Cancel Anytime',
        'GST Invoice',
        'Razorpay Secure',
        'Cloud Backup',
      ],
      floatingBar: {
        title: '3-Day Trial @ ₹3',
        subtitle: 'No Auto-Debit',
        cta: 'Start Now →',
        microcopy: 'No Laptop Required • Razorpay Secure • Instant Activation',
      },
      footer: {
        desc: 'Modern QR Code Ordering System, Kitchen KDS & Waiter Calling Portal for fast-paced restaurants & cafes.',
        gateway: 'Razorpay Verified Secure Gateway',
        productHeading: 'Product & Solution',
        featuresLink: 'Platform Features',
        pricingLink: 'Pricing & Subscription',
        aboutLink: 'About Us',
        loginLink: 'Restaurant Login',
        registerLink: 'Register Restaurant',
        legalHeading: 'Legal & Compliance',
        refundLink: 'Cancellation & Refund Policy',
        privacyLink: 'Privacy Policy',
        termsLink: 'Terms & Conditions',
        disclaimerLink: 'Disclaimer',
        supportHeading: 'Support & Help',
        address: '214B 2nd Floor, Riddhi Siddhi Complex, Madhuban, Udaipur, Rajasthan - 313001',
        rights: 'All rights reserved.',
        privacy: 'Privacy',
        refunds: 'Refunds',
        terms: 'Terms',
        contact: 'Contact',
      }
    }
  };

  const t = copy[language];

  const featureIcons = [QrCode, ChefHat, Package, Sparkles, Smartphone, Receipt, BarChart3, Banknote, Wallet, UserCheck];
  const featureColors = [
    'bg-emerald-50 text-emerald-600',
    'bg-amber-50 text-amber-600',
    'bg-blue-50 text-blue-600',
    'bg-purple-50 text-purple-600',
    'bg-indigo-50 text-indigo-600',
    'bg-emerald-50 text-emerald-600',
    'bg-teal-50 text-teal-600'
  ];

  return (
    <div className="bg-white text-slate-900 min-h-screen flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20 md:pb-0 overflow-x-hidden">
      
      {/* 1. First Visit Language Popup Modal (Browser Language Recommendation Badge, Apple/Stripe look, Soft backdrop blur, ESC disabled) */}
      {showLangModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lang-modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
            }
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full mx-4 space-y-5 animate-scale-up text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <Globe className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h3 id="lang-modal-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t.modal.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                {t.modal.subtitle}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              {/* Option 1: Hinglish Card Button */}
              <button
                onClick={() => handleModalSelect('hi')}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  !isBrowserEn
                    ? 'bg-gray-50 border-gray-900 ring-1 ring-gray-950 dark:bg-gray-800 dark:border-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Languages className="w-6 h-6 text-gray-700 dark:text-gray-300 shrink-0" />
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">Hinglish</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      {!isBrowserEn ? 'Default choice' : 'Switch anytime later'}
                    </div>
                  </div>
                </div>
                {!isBrowserEn && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase text-gray-900 bg-gray-100 border border-gray-300 dark:text-white dark:bg-gray-800 dark:border-gray-700 px-2.5 py-1 rounded-full shrink-0">
                    Recommended
                  </span>
                )}
              </button>

              {/* Option 2: English Card Button */}
              <button
                onClick={() => handleModalSelect('en')}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isBrowserEn
                    ? 'bg-gray-50 border-gray-900 ring-1 ring-gray-950 dark:bg-gray-800 dark:border-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Globe className="w-6 h-6 text-gray-700 dark:text-gray-300 shrink-0" />
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">English</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      {isBrowserEn ? 'Default choice' : 'Switch anytime later'}
                    </div>
                  </div>
                </div>
                {isBrowserEn && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase text-gray-900 bg-gray-100 border border-gray-300 dark:text-white dark:bg-gray-800 dark:border-gray-700 px-2.5 py-1 rounded-full shrink-0">
                    Recommended
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header / Navbar - Light Premium Sticky Bar (64px mobile height) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-16 px-3.5 sm:px-8 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        <Link href={`/?lang=${language}`} className="flex items-center gap-2 sm:gap-3 shrink-0" aria-label="CleverOps Home">
          <img src="/logo.png" alt="CleverOps Restaurant Operating System Logo" width={36} height={36} style={{ height: '36px', width: 'auto' }} className="h-8 sm:h-9 w-auto object-contain" />
          <span className="font-black text-sm sm:text-lg tracking-tight text-slate-900">CleverOps</span>
        </Link>

        {/* Desktop menu actions */}
        <nav aria-label="Desktop Navigation" className="hidden md:flex items-center gap-6">
          <a href="#preview" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">{t.nav.preview}</a>
          <a href="#why-us" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">{t.nav.noHardware}</a>
          <a href="#profit-intelligence" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">{t.nav.smartCosting}</a>
          <a href="#roles" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">{t.nav.demoVideos}</a>
          <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">{t.nav.pricing}</a>
          <Link href={`/login?lang=${language}`} className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">
            {t.nav.signIn}
          </Link>

          {/* Desktop Language Switcher (Compact HI | EN pill) */}
          <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-bold shadow-2xs" role="group" aria-label="Language selector">
            <button
              onClick={() => handleNavbarSwitch('hi')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer min-h-[30px] flex items-center justify-center ${
                language === 'hi'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={language === 'hi'}
              aria-label="Hinglish"
            >
              HI
            </button>
            <span className="text-slate-300 mx-0.5 select-none">|</span>
            <button
              onClick={() => handleNavbarSwitch('en')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer min-h-[30px] flex items-center justify-center ${
                language === 'en'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={language === 'en'}
              aria-label="English"
            >
              EN
            </button>
          </div>

          <Link href={`/signup?plan=trial&lang=${language}`}>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer min-h-[40px]">
              {t.nav.trialCta}
            </button>
          </Link>
        </nav>

        {/* Mobile Header Actions (Compact Sign In + Language Toggle + Hamburger) */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <Link href={`/login?lang=${language}`} className="text-xs font-bold text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            {t.nav.signIn}
          </Link>

          {/* Compact Mobile Language Switcher (HI | EN) */}
          <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-100 text-[11px] font-bold shadow-2xs" role="group" aria-label="Language selector">
            <button
              onClick={() => handleNavbarSwitch('hi')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center justify-center ${
                language === 'hi'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={language === 'hi'}
              aria-label="Hinglish"
            >
              HI
            </button>
            <span className="text-slate-300 mx-0.5 select-none text-[10px]">|</span>
            <button
              onClick={() => handleNavbarSwitch('en')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center justify-center ${
                language === 'en'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={language === 'en'}
              aria-label="English"
            >
              EN
            </button>
          </div>

          {/* Hamburger Menu (40x40px touch target) */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navbar overlay */}
        {mobileMenuOpen && (
          <nav aria-label="Mobile Navigation" className="absolute top-16 left-0 w-full bg-white border-b border-slate-200 flex flex-col p-5 space-y-4 shadow-xl z-40 md:hidden animate-pop">
            {/* Mobile Language Switcher inside Drawer */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Language / भाषा:</span>
              <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-white text-xs font-bold shadow-2xs" role="group" aria-label="Language selector">
                <button
                  onClick={() => { handleNavbarSwitch('hi'); setMobileMenuOpen(false); }}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer min-h-[36px] flex items-center justify-center ${
                    language === 'hi'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={language === 'hi'}
                  aria-label="Hinglish"
                >
                  🇮🇳 Hinglish
                </button>
                <button
                  onClick={() => { handleNavbarSwitch('en'); setMobileMenuOpen(false); }}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer min-h-[36px] flex items-center justify-center ${
                    language === 'en'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={language === 'en'}
                  aria-label="English"
                >
                  English
                </button>
              </div>
            </div>

            <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 min-h-[44px] flex items-center">{t.nav.productPreview}</a>
            <a href="#why-us" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 min-h-[44px] flex items-center">{t.nav.noHardwareNeeded}</a>
            <a href="#profit-intelligence" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 min-h-[44px] flex items-center">{t.nav.smartCosting}</a>
            <a href="#roles" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 min-h-[44px] flex items-center">{t.nav.demoVideos}</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 min-h-[44px] flex items-center">{t.nav.pricing}</a>
            <div className="h-px bg-slate-100 my-1" />
            <Link href={`/login?lang=${language}`} onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 min-h-[44px] flex items-center">
              {t.nav.signIn}
            </Link>
            <Link href={`/signup?plan=trial&lang=${language}`} onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-xs min-h-[48px] cursor-pointer">
                {t.nav.trialCta}
              </button>
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1 pb-28 md:pb-0">

      {/* 1. Hero Section (Mobile-First Above-the-Fold Fit & Desktop Grid) */}
      <section className="px-4 sm:px-8 md:px-12 pt-4 pb-8 sm:pt-12 sm:pb-14 md:pt-16 md:pb-18 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          
          {/* Left Column: Mobile Above-The-Fold Pitch */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-3.5 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold text-emerald-800 max-w-full">
              <span>🇮🇳</span>
              <span className="leading-tight">{t.hero.pill}</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[50px] font-black text-slate-900 tracking-tight leading-tight sm:leading-[1.15]">
              {t.hero.titlePrefix} <span className="text-emerald-600 block sm:inline">{t.hero.titleHighlight}</span>
            </h1>
            
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {t.hero.subtitle}
            </p>

            {/* Value Pitch & Audit Hook Callout (Clean Emerald Surface Directly Under H1) */}
            <a
              href="#savings-breakdown"
              className="group block bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/90 hover:border-emerald-300 rounded-2xl p-3 sm:p-3.5 transition-all shadow-2xs hover:shadow-xs text-left max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>{t.scrollMagnet.boldLine}</span>
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-medium">
                    {t.scrollMagnet.subLine}
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all">
                    <span>{t.scrollMagnet.cta}</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </a>
            
            {/* 3 Clean Horizontal Checkmarks (Compact vertical stack on mobile) */}
            <div className="space-y-1.5 pt-0.5 text-xs sm:text-sm font-semibold text-slate-700 max-w-lg mx-auto lg:mx-0 text-left">
              {t.hero.checkpoints.map((pt, idx) => (
                <div key={idx} className="flex items-center justify-start gap-2">
                  <div className="h-4.5 w-4.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            {/* Action CTAs: Full width on mobile, 52px high-contrast touch target */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5 pt-1.5 w-full max-w-md mx-auto lg:mx-0">
              <Link href={`/signup?plan=trial&lang=${language}`} className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-6 rounded-2xl text-sm sm:text-base font-black shadow-md shadow-emerald-600/25 transition-all cursor-pointer h-13 min-h-[52px] flex items-center justify-center gap-2">
                  <span>{t.hero.trialCta}</span>
                </button>
              </Link>
              <a href="#preview" className="hidden sm:inline-flex w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-6 rounded-2xl text-sm md:text-base font-semibold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 h-13 min-h-[52px]">
                  <Play className="h-4 w-4 fill-slate-700 text-slate-700" />
                  <span>{t.hero.demoCta}</span>
                </button>
              </a>
            </div>

            {/* Single Clean Reassurance Line */}
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold pt-0.5 max-w-md mx-auto lg:mx-0">
              {t.hero.microcopy}
            </p>

            {/* Mobile Native App Widget Preview (Instant Visual Proof - Mobile only, lg:hidden) */}
            <div className="block lg:hidden w-full pt-1.5">
              <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-3.5 shadow-md space-y-2.5 text-left">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-black text-slate-900 tracking-tight">Royal Spice Bistro</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                    Live Mobile OS
                  </span>
                </div>

                {/* 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today's Sales</p>
                    <p className="text-sm font-black text-slate-900 leading-snug">₹24,850</p>
                    <p className="text-[10px] text-emerald-600 font-bold">↑ 18%</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active KOTs</p>
                    <p className="text-sm font-black text-slate-900 leading-snug">4 Orders</p>
                    <p className="text-[10px] text-slate-500 font-medium">Kitchen Live</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cash Drawer</p>
                    <p className="text-sm font-black text-slate-900 leading-snug">₹8,400</p>
                    <p className="text-[10px] text-emerald-600 font-bold">Matched ✓</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Staff Present</p>
                    <p className="text-sm font-black text-slate-900 leading-snug">5 / 5</p>
                    <p className="text-[10px] text-slate-500 font-medium">Online</p>
                  </div>
                </div>

                {/* Bottom Red/Amber Alert Strip */}
                <div className="p-2 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px] leading-tight">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>⚠️ Low Stock Alert: Paneer (1.2 kg left) — Auto-alert sent to Owner</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Desktop High-Impact Live Dashboard Visual Card (hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-left relative overflow-hidden">
              
              {/* Header with Live Status */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black text-slate-900 tracking-tight">Royal Spice Bistro • Live OS</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Counter Synced
                </span>
              </div>

              {/* 2x2 Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Sales</p>
                  <p className="text-xl font-black text-slate-900">₹24,850</p>
                  <p className="text-[11px] text-emerald-600 font-bold">↑ 18% vs yesterday</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active KOTs</p>
                  <p className="text-xl font-black text-slate-900">4 Orders</p>
                  <p className="text-[11px] text-slate-500 font-medium">Kitchen Live</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cash Drawer</p>
                  <p className="text-xl font-black text-slate-900">₹8,400</p>
                  <p className="text-[11px] text-emerald-600 font-bold">Matched ✓</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Staff Present</p>
                  <p className="text-xl font-black text-slate-900">5 / 5</p>
                  <p className="text-[11px] text-slate-500 font-medium">Online</p>
                </div>
              </div>

              {/* Low Stock Alert Bar */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>⚠️ Low Stock Alert: Paneer (1.2 kg left) — Auto-alert sent to Owner</span>
                </div>
              </div>

              {/* Bottom Quick Link */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
                <span>12 Tables Active • 5 Staff Synced</span>
                <a href="#preview" className="text-emerald-600 font-bold hover:underline flex items-center gap-1">
                  <span>Preview Screen</span>
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>

            </div>
          </div>

        </div>

      </section>

      {/* 1.5. Interactive Restaurant Loss & Profit Calculator & Operations Simplified */}
      <section id="savings-breakdown" className="scroll-mt-16 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/70 border-b border-slate-200/80 px-4 sm:px-6 md:px-12 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
          
          {/* SECTION HEADER (Clean Emerald Badge, No Loud Yellow) */}
          <div className="text-center space-y-2.5 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/90 px-3.5 py-1 rounded-full text-xs font-bold text-emerald-800 shadow-2xs">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
              <span>{t.calculator.badge}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t.calculator.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              {t.calculator.subtitle}
            </p>
          </div>

          {/* CALCULATOR MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* LEFT COLUMN: 3 EDITABLE INPUT FIELDS + TOUCH SLIDERS */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
              
              {/* Slider 1: Tables (With Editable Input) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Utensils className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{t.calculator.tablesLabel}</span>
                  </label>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={calcTables || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                        setCalcTables(val);
                      }}
                      className="w-18 sm:w-20 px-2.5 py-1 text-right text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-50/50 border border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg outline-none transition-all"
                    />
                    <span className="text-xs font-bold text-slate-500 select-none">Tables</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={2}
                  max={50}
                  step={1}
                  value={Math.min(50, Math.max(2, calcTables || 2))}
                  onChange={(e) => setCalcTables(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
                {/* Presets */}
                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  {[6, 10, 18, 30].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCalcTables(preset)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        calcTables === preset
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {preset} Tables
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 2: Staff (With Editable Input) */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{t.calculator.staffLabel}</span>
                  </label>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={calcStaff || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                        setCalcStaff(val);
                      }}
                      className="w-18 sm:w-20 px-2.5 py-1 text-right text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-50/50 border border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg outline-none transition-all"
                    />
                    <span className="text-xs font-bold text-slate-500 select-none">Staff</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={2}
                  max={40}
                  step={1}
                  value={Math.min(40, Math.max(2, calcStaff || 2))}
                  onChange={(e) => setCalcStaff(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
                {/* Presets */}
                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  {[3, 6, 12, 20].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCalcStaff(preset)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        calcStaff === preset
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {preset} Staff
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 3: Monthly Sales (With Editable Input) */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{t.calculator.salesLabel}</span>
                  </label>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-bold text-slate-500 select-none">₹</span>
                    <input
                      type="number"
                      min={10000}
                      step={10000}
                      value={calcMonthlySale || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                        setCalcMonthlySale(val);
                      }}
                      className="w-24 sm:w-28 px-2.5 py-1 text-right text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-50/50 border border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg outline-none transition-all"
                    />
                    <span className="text-[11px] font-bold text-emerald-700 ml-1 select-none whitespace-nowrap">
                      ({calcMonthlySale >= 100000 ? `${(calcMonthlySale / 100000).toFixed(1)}L` : `${Math.round(calcMonthlySale / 1000)}k`})
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={3000000}
                  step={50000}
                  value={Math.min(3000000, Math.max(100000, calcMonthlySale || 100000))}
                  onChange={(e) => setCalcMonthlySale(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
                {/* Presets */}
                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  {[300000, 500000, 1000000, 2000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCalcMonthlySale(preset)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        calcMonthlySale === preset
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      ₹{(preset / 100000).toFixed(0)} Lakh
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] sm:text-xs text-slate-500 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Formulas are based on real audit data across Indian dining outlets: 3% kitchen pilferage/cancel losses, exact staff hours/OT tracking, and fast table turnaround.</span>
              </div>

            </div>

            {/* RIGHT COLUMN: DARK SLATE / EMERALD RESULT CARD (Clean Lucide Icons, No Emojis) */}
            <div className="lg:col-span-6 bg-slate-900 text-white border-2 border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 text-left relative overflow-hidden">
              
              {/* Highlight Headline & Main Savings Number */}
              <div className="space-y-1.5 border-b border-slate-800 pb-4">
                <p className="text-xs sm:text-sm font-bold text-slate-300">
                  {t.calculator.resultHeadline}
                </p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-400 tracking-tight">
                    ₹{new Intl.NumberFormat('en-IN').format(savingsCalc.totalMonthly)}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-400">
                    {t.calculator.perMonth}
                  </span>
                </div>
                <div className="pt-1">
                  <span className="inline-block bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black px-3 py-1 rounded-full">
                    {t.calculator.yearlyBadge(new Intl.NumberFormat('en-IN').format(savingsCalc.totalYearly))}
                  </span>
                </div>
              </div>

              {/* 5 Real-Time Live Breakdown Rows (With Clean Lucide Icons) */}
              <div className="space-y-3 text-xs sm:text-sm">
                
                {/* Row 1 */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-100 flex items-center gap-2">
                      <ChefHat className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{t.calculator.row1Title}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 pl-6">{t.calculator.row1Desc}</p>
                  </div>
                  <span className="font-mono font-black text-emerald-400 shrink-0">
                    ₹{new Intl.NumberFormat('en-IN').format(savingsCalc.kitchenLeak)}/mo
                  </span>
                </div>

                {/* Row 2 */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-100 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{t.calculator.row2Title}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 pl-6">{t.calculator.row2Desc}</p>
                  </div>
                  <span className="font-mono font-black text-emerald-400 shrink-0">
                    ₹{new Intl.NumberFormat('en-IN').format(savingsCalc.staffAndOtLeak)}/mo
                  </span>
                </div>

                {/* Row 3 */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-100 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{t.calculator.row3Title}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 pl-6">{t.calculator.row3Desc}</p>
                  </div>
                  <span className="font-mono font-black text-emerald-400 shrink-0">
                    +₹{new Intl.NumberFormat('en-IN').format(savingsCalc.turnoverAndAutoMenu)}/mo
                  </span>
                </div>

                {/* Row 4 */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-100 flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{t.calculator.row4Title}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 pl-6">{t.calculator.row4Desc}</p>
                  </div>
                  <span className="font-mono font-black text-emerald-400 shrink-0">
                    ₹{new Intl.NumberFormat('en-IN').format(savingsCalc.cashLeak)}/mo
                  </span>
                </div>

                {/* Row 5 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-100 flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{t.calculator.row5Title}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 pl-6">{t.calculator.row5Desc}</p>
                  </div>
                  <span className="font-mono font-black text-emerald-400 shrink-0">
                    ₹{new Intl.NumberFormat('en-IN').format(savingsCalc.hardwareSaved)}/mo
                  </span>
                </div>

              </div>

              {/* Bottom Direct CTA */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <p className="text-[11.5px] sm:text-xs text-slate-300 font-medium leading-relaxed">
                  {t.calculator.ctaText(new Intl.NumberFormat('en-IN').format(savingsCalc.totalMonthly))}
                </p>
                <Link
                  href={`/signup?plan=trial&lang=${language}`}
                  className="block w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold py-3.5 px-4 rounded-2xl text-center text-sm sm:text-base shadow-lg transition-all cursor-pointer"
                >
                  {t.calculator.ctaBtn}
                </Link>
              </div>

            </div>

          </div>

          {/* PART 2: 8 OPERATIONAL FEATURE CARDS (CLEAN LUCIDE ICONS, NO EMOJIS) */}
          <div className="pt-8 sm:pt-10 border-t border-slate-200/80 space-y-6 sm:space-y-8">
            <div className="text-center space-y-2 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold text-emerald-800">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>{t.operationsBreakdown.badge}</span>
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {t.operationsBreakdown.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                {t.operationsBreakdown.subtitle}
              </p>
            </div>

            {/* Compact 2-column mobile grid (< 768px) and 4-column desktop grid for snappy scrolling */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
              {t.operationsBreakdown.cards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/90 hover:border-emerald-400 rounded-2xl p-3 sm:p-4 space-y-2 shadow-2xs hover:shadow-xs transition-all text-left flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {card.num}
                      </span>
                      <span className="text-emerald-600">
                        {idx === 0 ? <Clock className="h-4 w-4" /> : 
                         idx === 1 ? <Package className="h-4 w-4" /> : 
                         idx === 2 ? <Users className="h-4 w-4" /> : 
                         idx === 3 ? <ChefHat className="h-4 w-4" /> : 
                         idx === 4 ? <Banknote className="h-4 w-4" /> : 
                         idx === 5 ? <PhoneCall className="h-4 w-4" /> : 
                         idx === 6 ? <Receipt className="h-4 w-4" /> : 
                                     <FileText className="h-4 w-4" />}
                      </span>
                    </div>
                    <h4 className="text-[12px] sm:text-sm font-black text-slate-900 leading-snug">
                      {card.title}
                    </h4>
                    <p className="text-[10.5px] sm:text-xs text-slate-600 leading-relaxed font-normal">
                      {card.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Reassurance Banner below the 8 cards */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-black text-slate-900">
                  Yeh saare 8 operations sirf ₹3 ke 3-Din Trial me 100% unlocked hain.
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Koi laptop ya hardware nahi chahiye • Regular smartphone par chalta hai • No auto-debit.
                </p>
              </div>
              <Link
                href={`/signup?plan=trial&lang=${language}`}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition-all"
              >
                Start Trial for ₹3 →
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* 2. Dashboard Preview Section (Authentic Snapshot, Clearly Labeled Demo) */}
      <section id="preview" className="px-4 sm:px-6 md:px-12 pt-14 pb-12 sm:py-16 max-w-5xl mx-auto w-full space-y-4 sm:space-y-6 scroll-mt-16">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold text-slate-700">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            <span>{t.preview.badge}</span>
          </div>
          <h2 className="text-[28px] sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">{t.preview.title}</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">{t.preview.subtitle}</p>
        </div>

        {/* 4 Role Tab Switcher: Smooth Horizontally Scrollable on Mobile (Min 110px each) */}
        <div className="w-full -mx-4 px-4 sm:mx-0 sm:px-0 flex justify-start sm:justify-center overflow-x-auto scrollbar-none scroll-smooth">
          <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1.5 snap-x snap-mandatory min-w-max mx-auto">
            <button
              onClick={() => setActivePreviewTab('owner')}
              className={`min-w-[110px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[44px] snap-start flex items-center justify-center ${
                activePreviewTab === 'owner'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              {t.preview.tabs.owner}
            </button>
            <button
              onClick={() => setActivePreviewTab('kitchen')}
              className={`min-w-[110px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[44px] snap-start flex items-center justify-center ${
                activePreviewTab === 'kitchen'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              {t.preview.tabs.kitchen}
            </button>
            <button
              onClick={() => setActivePreviewTab('waiter')}
              className={`min-w-[110px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[44px] snap-start flex items-center justify-center ${
                activePreviewTab === 'waiter'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              {t.preview.tabs.waiter}
            </button>
            <button
              onClick={() => setActivePreviewTab('cashier')}
              className={`min-w-[110px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[44px] snap-start flex items-center justify-center ${
                activePreviewTab === 'cashier'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              {t.preview.tabs.cashier}
            </button>
            <button
              onClick={() => setActivePreviewTab('smart_menu')}
              data-testid="tab-smart-menu"
              className={`min-w-[110px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[44px] snap-start flex items-center justify-center gap-1.5 ${
                activePreviewTab === 'smart_menu'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Smart Menu</span>
            </button>
            <button
              onClick={() => setActivePreviewTab('attendance')}
              data-testid="tab-attendance"
              className={`min-w-[110px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[44px] snap-start flex items-center justify-center gap-1.5 ${
                activePreviewTab === 'attendance'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>{t.preview.tabs.attendance}</span>
            </button>
          </div>
        </div>

        {/* Role Explanation Subtitle */}
        <div className="text-center">
          <p className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 py-1.5 px-4 rounded-full inline-block leading-snug">
            {t.preview.subtitles[activePreviewTab]}
          </p>
        </div>

        {/* Authentic UI Snapshot Container — Clearly Marked as Demo Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm w-full transition-all duration-200 space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t.preview.demoHeader}</span>
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {t.preview.sampleTag}
            </span>
          </div>

          {/* Owner Tab: 2-column metrics, larger numbers, smaller labels */}
          {activePreviewTab === 'owner' && (
            <div className="space-y-3 sm:space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t.preview.owner.todaySales}</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">₹24,850</p>
                  <p className="text-xs text-emerald-600 font-bold">{t.preview.owner.salesDemo}</p>
                </div>
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t.preview.owner.activeTables}</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">12 / 16</p>
                  <p className="text-xs text-slate-500">{t.preview.owner.occupancy}</p>
                </div>
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t.preview.owner.pendingBills}</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">₹3,890</p>
                  <p className="text-xs text-slate-500">{t.preview.owner.tablesCheckout}</p>
                </div>
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t.preview.owner.kitchenQueue}</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">4 Orders</p>
                  <p className="text-xs text-emerald-600 font-bold">{t.preview.owner.avgPrep}</p>
                </div>
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t.preview.owner.staffOnline}</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">5 Active</p>
                  <p className="text-xs text-slate-500">{t.preview.owner.allRolesSynced}</p>
                </div>
                <div className="bg-amber-50/80 p-3.5 sm:p-4 rounded-xl border border-amber-200 space-y-1">
                  <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">{t.preview.owner.lowStock}</p>
                  <p className="text-xl sm:text-2xl font-black text-amber-900 leading-tight">3 Items</p>
                  <p className="text-xs text-amber-700 font-bold">{t.preview.owner.alertTriggered}</p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{t.preview.owner.riceAlert}</span>
                </div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">{t.preview.owner.actionRequired}</span>
              </div>

              {/* Smart Menu Import Entry Point */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900">Smart Menu AI Import & Digitizer</p>
                    <p className="text-[11px] text-slate-600">Scan paper menus, edit drafts & build digital menus in seconds</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('smart_menu')}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                  data-testid="open-smart-menu-import"
                >
                  <span>Import Smart Menu</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Kitchen Display Tab */}
          {activePreviewTab === 'kitchen' && (
            <div className="space-y-4 animate-fade-in" data-testid="kds-preview-container">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {kdsTickets.map((ticket) => {
                  const isNew = ticket.status === 'new';
                  const isPrep = ticket.status === 'preparing';
                  const isReady = ticket.status === 'ready';
                  const isServed = ticket.status === 'served';

                  const cardBg = isNew
                    ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                    : isPrep
                    ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                    : isReady
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800';

                  const badgeBg = isNew
                    ? 'bg-amber-100 text-amber-800'
                    : isPrep
                    ? 'bg-blue-100 text-blue-800'
                    : isReady
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700';

                  const statusLabel = isNew
                    ? t.preview.kitchen.statusNew
                    : isPrep
                    ? t.preview.kitchen.statusPrep
                    : isReady
                    ? t.preview.kitchen.statusReady
                    : 'SERVED';

                  return (
                    <div
                      key={ticket.id}
                      className={`border rounded-xl p-3.5 sm:p-4 space-y-2.5 flex flex-col justify-between ${cardBg}`}
                      data-testid={`kds-preview-ticket-${ticket.id}`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span>{ticket.table}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${badgeBg}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">{ticket.items}</p>
                        <p className="text-[10px] text-slate-500">{ticket.notes}</p>
                      </div>

                      {/* Interactive Ticket Status Controls */}
                      <div className="pt-2 border-t border-slate-200/60">
                        {isPrep && (
                          <button
                            type="button"
                            onClick={() => {
                              setKdsTickets(prev => prev.map(tk => tk.id === ticket.id ? { ...tk, status: 'ready', notes: 'Ready to serve • Waiter notified' } : tk));
                            }}
                            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                            data-testid={`advance-ticket-${ticket.id}`}
                            aria-label={`Mark ${ticket.table} as Ready`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Mark as Ready</span>
                          </button>
                        )}
                        {isNew && (
                          <button
                            type="button"
                            onClick={() => {
                              setKdsTickets(prev => prev.map(tk => tk.id === ticket.id ? { ...tk, status: 'preparing', notes: 'Timer: just started' } : tk));
                            }}
                            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                            data-testid={`advance-ticket-${ticket.id}`}
                            aria-label={`Start preparing ${ticket.table}`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>Start Preparing</span>
                          </button>
                        )}
                        {isReady && (
                          <button
                            type="button"
                            onClick={() => {
                              setKdsTickets(prev => prev.map(tk => tk.id === ticket.id ? { ...tk, status: 'served', notes: 'Served to table by waiter' } : tk));
                            }}
                            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 active:bg-black text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                            data-testid={`advance-ticket-${ticket.id}`}
                            aria-label={`Mark ${ticket.table} as Served`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark as Served</span>
                          </button>
                        )}
                        {isServed && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">Completed</span>
                            <button
                              type="button"
                              onClick={() => {
                                setKdsTickets(prev => prev.map(tk => tk.id === ticket.id ? { ...tk, status: 'preparing', notes: 'Timer: restarted' } : tk));
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-800 underline font-semibold cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Direct Link to Live Kitchen Display Queue */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 gap-2 text-xs">
                <span className="text-slate-600 font-medium">Interactive preview: advance Table 09 from Preparing to Ready above.</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setKdsTickets([
                        { id: 'batch1', table: 'Table 04 • Batch #1', status: 'new', items: '2x Paneer Tikka • 1x Garlic Naan', notes: 'Chef Note: Less spicy, butter on side' },
                        { id: 'batch2', table: 'Table 09 • Batch #2', status: 'preparing', items: '1x Dal Makhani • 2x Roti', notes: 'Timer: 6 min elapsed' },
                        { id: 'batch3', table: 'Table 02 • Batch #1', status: 'ready', items: '1x Veg Biryani • 1x Boondi Raita', notes: 'Ready to serve • Waiter notified' },
                      ]);
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer underline"
                  >
                    Reset Tickets
                  </button>
                  <Link
                    href="/dashboard/kds"
                    className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <span>Open Live Kitchen Queue UI</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Waiter Tab */}
          {activePreviewTab === 'waiter' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-fade-in">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-purple-900">
                  <span>{t.preview.waiter.card1Title}</span>
                  <span className="bg-purple-100 px-2 py-0.5 rounded text-[10px]">{t.preview.waiter.card1Badge}</span>
                </div>
                <p className="text-slate-700 font-medium">{t.preview.waiter.card1Desc}</p>
                <p className="text-[10px] text-slate-500">{t.preview.waiter.card1Time}</p>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-emerald-900">
                  <span>{t.preview.waiter.card2Title}</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px]">₹1,450</span>
                </div>
                <p className="text-slate-700 font-medium">{t.preview.waiter.card2Desc}</p>
                <p className="text-[10px] text-emerald-700 font-bold">{t.preview.waiter.card2Time}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.waiter.card3Title}</span>
                  <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px]">{t.preview.waiter.card3Badge}</span>
                </div>
                <p className="text-slate-700 font-medium">{t.preview.waiter.card3Desc}</p>
                <button className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl w-full mt-1 cursor-pointer min-h-[44px] flex items-center justify-center">
                  {t.preview.waiter.punchButton}
                </button>
              </div>
            </div>
          )}

          {/* Smart Menu Display & Import Flow Tab */}
          {activePreviewTab === 'smart_menu' && (
            <div className="space-y-4 animate-fade-in" data-testid="smart-menu-preview-section">
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Smart Menu by CleverOps</h3>
                      <p className="text-xs text-slate-500">Upload paper menu photo or use fixture to auto-extract dishes and edit draft menu</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      AI Smart Menu Scanner
                    </span>
                  </div>
                </div>

                {/* Upload & Fixture Dropzone */}
                <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white/80 rounded-xl p-4 sm:p-6 text-center space-y-2 transition-colors">
                  <input
                    type="file"
                    id="smart-menu-file-input"
                    accept="image/*"
                    data-testid="smart-menu-file-input"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSmartMenuFileName(e.target.files[0].name);
                        setSmartMenuUploaded(true);
                      }
                    }}
                  />
                  <label
                    htmlFor="smart-menu-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                  >
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      Upload Menu Image or Document
                    </p>
                    <p className="text-[11px] text-slate-500">Supports JPG, PNG photos of printed or handwritten menus</p>
                  </label>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSmartMenuFileName('sample-menu.jpg');
                        setSmartMenuUploaded(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                      data-testid="use-sample-fixture-btn"
                    >
                      Use Test Fixture Image (sample-menu.jpg)
                    </button>
                    <a
                      href="/fixtures/sample-menu.jpg"
                      download
                      className="text-xs text-slate-500 hover:text-emerald-700 underline"
                    >
                      Download sample-menu.jpg
                    </a>
                  </div>
                </div>
              </div>

              {/* Draft Menu Editing Flow */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3" data-testid="draft-menu-flow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Draft Menu Editing Flow ({smartMenuDraftItems.length} Extracted Dishes)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      File: <span className="font-semibold text-slate-700">{smartMenuFileName}</span> • Edit names, categories & prices before publishing
                    </p>
                  </div>
                  {smartMenuSavedNotice && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 animate-fade-in">
                      <CheckCircle2 className="h-3 w-3" /> Draft menu saved!
                    </span>
                  )}
                </div>

                {/* Editable Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {smartMenuDraftItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSmartMenuDraftItems(prev => prev.map(di => di.id === item.id ? { ...di, name: val } : di));
                            }}
                            className="text-xs font-bold text-slate-900 w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                            aria-label="Dish name"
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSmartMenuDraftItems(prev => prev.map(di => di.id === item.id ? { ...di, price: val } : di));
                          }}
                          className="w-16 text-xs font-black text-slate-900 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:border-emerald-500 focus:outline-none"
                          aria-label="Price"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Draft Menu Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                  <span className="text-[11px] text-slate-500">
                    Live changes are automatically previewed across customer QR menus.
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSmartMenuSavedNotice(true);
                        setTimeout(() => setSmartMenuSavedNotice(false), 3000);
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-sm"
                      data-testid="save-draft-menu-btn"
                    >
                      Save Draft Menu
                    </button>
                    <Link
                      href="/dashboard/menu"
                      className="flex-1 sm:flex-initial px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-lg text-center transition-colors"
                    >
                      Open Full Menu UI
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cashier Tab */}
          {activePreviewTab === 'cashier' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.cashier.card1Title}</span>
                  <span className="text-emerald-600 font-extrabold text-sm">₹1,450</span>
                </div>
                <p className="text-slate-600">{t.preview.cashier.card1Subtotal}</p>
                <div className="bg-emerald-600 text-white font-bold text-center py-2 rounded-xl text-xs min-h-[36px] flex items-center justify-center">
                  {t.preview.cashier.card1Action}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.cashier.card2Title}</span>
                  <span className="text-slate-900 font-bold">-₹350</span>
                </div>
                <p className="text-slate-600">{t.preview.cashier.card2Status}</p>
                <div className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-center py-2 rounded-xl text-xs min-h-[36px] flex items-center justify-center">
                  {t.preview.cashier.card2Action}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.cashier.card3Title}</span>
                  <span className="text-slate-900 font-bold">{t.preview.cashier.card3Total}</span>
                </div>
                <p className="text-slate-600">{t.preview.cashier.card3Breakdown}</p>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-center py-2 rounded-xl text-xs min-h-[36px] flex items-center justify-center">
                  {t.preview.cashier.card3Action}
                </div>
              </div>
            </div>
          )}

          {/* Staff Attendance Tab */}
          {activePreviewTab === 'attendance' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.attendance.card1Title}</span>
                  <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {t.preview.attendance.card1Badge}
                  </span>
                </div>
                <p className="text-slate-600">{t.preview.attendance.card1Desc}</p>
                <div className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-center py-2 rounded-xl text-xs min-h-[36px] flex items-center justify-center">
                  {t.preview.attendance.card1Action}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.attendance.card2Title}</span>
                  <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {t.preview.attendance.card2Badge}
                  </span>
                </div>
                <p className="text-slate-600">{t.preview.attendance.card2Desc}</p>
                <div className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-center py-2 rounded-xl text-xs min-h-[36px] flex items-center justify-center">
                  {t.preview.attendance.card2Action}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.attendance.card3Title}</span>
                  <span className="text-slate-900 font-bold">{t.preview.attendance.card3Total}</span>
                </div>
                <p className="text-slate-600">{t.preview.attendance.card3Desc}</p>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-center py-2 rounded-xl text-xs min-h-[36px] flex items-center justify-center">
                  {t.preview.attendance.card3Action}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Dedicated "No Laptop Required" Objection Remover Section */}
      <section id="why-us" className="px-4 sm:px-6 md:px-12 pt-14 pb-12 sm:py-16 bg-slate-50 border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-[28px] sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">
              {t.whyUs.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.whyUs.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5 shadow-2xs">
              <div className="h-11 w-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-[20px] sm:text-lg leading-snug">{t.whyUs.card1Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.whyUs.card1Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5 shadow-2xs">
              <div className="h-11 w-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Laptop className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-[20px] sm:text-lg leading-snug">{t.whyUs.card2Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.whyUs.card2Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5 shadow-2xs">
              <div className="h-11 w-11 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-[20px] sm:text-lg leading-snug">{t.whyUs.card3Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.whyUs.card3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Restaurant Reality Section ("Restaurant Band Hone Ke Baad...") */}
      <section className="px-4 sm:px-6 md:px-12 pt-14 pb-12 sm:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-[28px] sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">
              {t.reality.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              {t.reality.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Column 1: Without CleverOps */}
            <div className="bg-slate-50/80 border border-red-200 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3.5 border-b border-red-100 gap-2">
                <span className="text-base sm:text-lg font-black text-red-950">{t.reality.col1Title}</span>
                <span className="text-xs font-extrabold uppercase text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 shrink-0">
                  {t.reality.col1Badge}
                </span>
              </div>
              <ul className="space-y-4 text-xs sm:text-sm text-slate-700">
                {t.reality.col1List.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-bold text-[13.5px] sm:text-sm mb-0.5">{item.strong}</strong>
                      <p className="text-slate-500 text-xs leading-relaxed">{item.p}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: With CleverOps */}
            <div className="bg-white border border-emerald-300 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xs ring-1 ring-emerald-500/20">
              <div className="flex items-center justify-between pb-3.5 border-b border-emerald-100 gap-2">
                <span className="text-base sm:text-lg font-black text-emerald-950">{t.reality.col2Title}</span>
                <span className="text-xs font-extrabold uppercase text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                  {t.reality.col2Badge}
                </span>
              </div>
              <ul className="space-y-4 text-xs sm:text-sm text-slate-700">
                {t.reality.col2List.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-bold text-[13.5px] sm:text-sm mb-0.5">{item.strong}</strong>
                      <p className="text-slate-600 text-xs leading-relaxed">{item.p}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Smart Costing & Food Cost Intelligence Section (Inventory USP) */}
      <section id="profit-intelligence" className="px-4 sm:px-6 md:px-12 pt-14 pb-12 sm:py-16 bg-slate-50 border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-[28px] sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">
              {t.smartCosting.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              {t.smartCosting.subtitle}
            </p>
          </div>

          {/* Highlight Impact Callout */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-2.5 shadow-2xs text-center">
            <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {t.smartCosting.badge}
            </span>
            <p className="text-base sm:text-base font-black text-slate-900 leading-relaxed">
              {t.smartCosting.impactHeadline}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t.smartCosting.impactDesc}
            </p>
          </div>

          {/* Practical Recipe Cost Calculation Example Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">{t.smartCosting.demoDish}</span>
                <span className="text-[10px] font-extrabold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {t.smartCosting.demoTag}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">{t.smartCosting.menuPrice}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Before */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">{t.smartCosting.beforeTitle}</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">{t.smartCosting.paneerRate}</span>
                  <span className="font-bold text-slate-900">₹280 / kg</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">{t.smartCosting.baseCost}</span>
                  <span className="font-extrabold text-emerald-700">₹48</span>
                </div>
                <div className="pt-0.5 text-xs text-emerald-800 font-semibold">
                  {t.smartCosting.beforeProfit}
                </div>
              </div>

              {/* After */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">{t.smartCosting.afterTitle}</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-900">{t.smartCosting.paneerRate}</span>
                  <span className="font-bold text-amber-950">{t.smartCosting.afterPaneer}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-900">{t.smartCosting.baseCost}</span>
                  <span className="font-extrabold text-amber-900">₹62</span>
                </div>
                <div className="pt-0.5 text-xs text-amber-900 font-bold">
                  {t.smartCosting.afterProfit}
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-center">
              <p className="text-xs font-bold text-emerald-950">
                {t.smartCosting.highlightBanner}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-base leading-snug">{t.smartCosting.card1Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.smartCosting.card1Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-base leading-snug">{t.smartCosting.card2Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.smartCosting.card2Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-base leading-snug">{t.smartCosting.card3Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.smartCosting.card3Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-base leading-snug">{t.smartCosting.card4Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.smartCosting.card4Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs sm:col-span-2 lg:col-span-2">
              <h3 className="font-bold text-slate-900 text-base leading-snug">{t.smartCosting.card5Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.smartCosting.card5Desc}
              </p>
            </div>
          </div>

          <div className="text-center bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
            <p className="text-xs sm:text-sm font-bold text-emerald-950">
              {t.smartCosting.bottomTag}
            </p>
          </div>
        </div>
      </section>

      {/* 6. Real 6-Step Daily Workflow Timeline */}
      <section className="px-4 sm:px-6 md:px-12 pt-14 pb-12 sm:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-[28px] sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">
              {t.workflow.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.workflow.subtitle}
            </p>
          </div>

          {/* Mobile Swipe Cue */}
          <div className="flex md:hidden items-center justify-end text-xs font-semibold text-emerald-700 gap-1 -mb-2">
            <span>Swipe karke dekhein</span>
            <span>→</span>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {t.workflow.steps.map((step, idx) => {
              const colors = [
                'bg-emerald-50 text-emerald-800',
                'bg-blue-50 text-blue-800',
                'bg-amber-50 text-amber-800',
                'bg-purple-50 text-purple-800',
                'bg-indigo-50 text-indigo-800',
                'bg-slate-900 text-white'
              ];
              const iconColors = [
                'text-emerald-600',
                'text-blue-600',
                'text-amber-600',
                'text-purple-600',
                'text-indigo-600',
                'text-emerald-400'
              ];
              return (
                <div key={idx} className="min-w-[270px] sm:min-w-0 snap-center bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-2xs flex-1">
                  <div className={`inline-flex items-center gap-1.5 ${colors[idx % colors.length]} font-black text-xs px-2.5 py-1 rounded-md`}>
                    <Clock className={`h-3.5 w-3.5 ${iconColors[idx % iconColors.length]}`} />
                    <span>{step.time}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Believable Demo Videos Section (45 sec Demo Cards) */}
      <section id="roles" className="px-4 sm:px-6 md:px-12 pt-14 pb-12 sm:py-16 max-w-5xl mx-auto w-full space-y-6 sm:space-y-8 scroll-mt-16 bg-slate-50 border-b border-slate-200/80">
        <div className="text-center space-y-2">
          <h2 className="text-[28px] sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">
            {t.demoVideos.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
            {t.demoVideos.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Owner App */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs p-5 flex flex-col justify-between space-y-4">
            <div className="aspect-[16/9] bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center group cursor-pointer hover:bg-slate-100/60 transition-colors relative">
              <div className="h-11 w-11 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600 ml-0.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 tracking-wide">{t.demoVideos.card1Title}</span>
              <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">0:45</span>
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 border border-emerald-200/60">
                {t.demoVideos.card1Badge}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">{t.demoVideos.card1Header}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t.demoVideos.card1Desc}
              </p>
            </div>
          </div>

          {/* Card 2: Kitchen Display */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs p-5 flex flex-col justify-between space-y-4">
            <div className="aspect-[16/9] bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center group cursor-pointer hover:bg-slate-100/60 transition-colors relative">
              <div className="h-11 w-11 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600 ml-0.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 tracking-wide">{t.demoVideos.card2Title}</span>
              <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">0:45</span>
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 border border-emerald-200/60">
                {t.demoVideos.card2Badge}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">{t.demoVideos.card2Header}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t.demoVideos.card2Desc}
              </p>
            </div>
          </div>

          {/* Card 3: Waiter App */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs p-5 flex flex-col justify-between space-y-4">
            <div className="aspect-[16/9] bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center group cursor-pointer hover:bg-slate-100/60 transition-colors relative">
              <div className="h-11 w-11 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600 ml-0.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 tracking-wide">{t.demoVideos.card3Title}</span>
              <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">0:45</span>
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 border border-emerald-200/60">
                {t.demoVideos.card3Badge}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">{t.demoVideos.card3Header}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t.demoVideos.card3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Feature Showcase Carousel (Scrollable Mobile) */}
      <section id="features" className="px-4 sm:px-6 md:px-12 pt-14 pb-12 sm:py-16 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-[28px] sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">
              {t.features.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>

          {/* Mobile Swipe Cue */}
          <div className="flex md:hidden items-center justify-end text-xs font-semibold text-emerald-700 gap-1 -mb-2">
            <span>Swipe karke dekhein</span>
            <span>→</span>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-6 md:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {t.features.items.map((feat, idx) => {
              const Icon = featureIcons[idx % featureIcons.length];
              const color = featureColors[idx % featureColors.length];
              return (
                <div 
                  key={idx} 
                  className="min-w-[260px] sm:min-w-[280px] md:min-w-0 snap-center bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className={`h-10 w-10 ${color} rounded-xl flex items-center justify-center shadow-inner`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base">{feat.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {feat.desc}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center gap-1 text-emerald-700 text-xs font-bold">
                    <span>{t.features.unlockText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Built for Every Food Business Trust Section */}
      <section className="px-4 sm:px-6 md:px-12 py-12 sm:py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">
              {t.businessTypes.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.businessTypes.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {t.businessTypes.items.map((item, idx) => {
              const icons = [Utensils, Coffee, Store, PhoneCall];
              const Icon = icons[idx % icons.length];
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-2xs hover:shadow-md transition-shadow">
                  <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. Traditional POS Comparison Matrix */}
      <section id="comparison" className="px-4 sm:px-6 md:px-12 pt-14 pb-12 sm:py-16 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-[28px] sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">
              {t.comparison.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.comparison.subtitle}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100">
            {/* Table Header (50% - 25% - 25% distribution for 360px screens) */}
            <div className="grid grid-cols-12 bg-slate-100/90 p-3 sm:p-4 text-xs sm:text-sm font-bold border-b border-slate-200 items-center">
              <div className="col-span-6 text-slate-700">{t.comparison.headers[0]}</div>
              <div className="col-span-3 text-center text-slate-500 text-[11px] sm:text-xs">
                <span className="hidden sm:inline">{t.comparison.headers[1]}</span>
                <span className="sm:hidden">Old POS</span>
              </div>
              <div className="col-span-3 text-center text-emerald-700 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>CleverOps</span>
              </div>
            </div>

            {/* Rows */}
            {t.comparison.rows.map((row, idx) => {
              const isPosNegative = row.pos.toLowerCase().includes('no') || row.pos.toLowerCase().includes('extra') || row.pos.toLowerCase().includes('costly') || row.pos.toLowerCase().includes('manual') || row.pos.toLowerCase().includes('separate');
              return (
                <div key={idx} className="grid grid-cols-12 p-2.5 sm:p-3.5 text-xs sm:text-sm items-center hover:bg-slate-50/50 transition-colors">
                  {/* Col 1: 50% width */}
                  <div className="col-span-6 font-semibold text-slate-800 text-[11px] sm:text-xs leading-snug pr-2">
                    {row.feature}
                  </div>

                  {/* Col 2: Traditional POS (25% width) */}
                  <div className="col-span-3 text-center text-[10px] sm:text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1">
                    {isPosNegative ? (
                      <span className="text-rose-500 font-bold shrink-0">✕</span>
                    ) : (
                      <span className="text-amber-600 shrink-0">~</span>
                    )}
                    <span className="truncate max-w-full">{row.pos}</span>
                  </div>

                  {/* Col 3: CleverOps (25% width) */}
                  <div className="col-span-3 text-center text-[10px] sm:text-xs text-emerald-700 font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 bg-emerald-50/60 py-1 rounded-lg">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span className="truncate max-w-full">{row.clever}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. FAQ Accordion Section */}
      <section className="px-4 sm:px-6 md:px-12 pt-14 pb-12 sm:py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-[28px] sm:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">
              {t.faqs.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.faqs.subtitle}
            </p>
          </div>

          <div className="space-y-3">
            {t.faqs.list.map((faq, idx) => (
              <div 
                key={idx} 
                className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-colors"
              >
                <button
                  onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex justify-between items-center gap-4 cursor-pointer font-bold text-slate-900 text-xs sm:text-sm min-h-[48px]"
                >
                  <span>{faq.q}</span>
                  {activeFaqIndex === idx ? (
                    <ChevronUp className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {activeFaqIndex === idx && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-2 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. ₹3 Conversion Strip (Consistent Wording) */}
      <section className="px-4 sm:px-8 md:px-12 pt-12 sm:pt-16 max-w-5xl mx-auto w-full">
        <div className="bg-white border-2 border-emerald-500/80 rounded-2xl p-5 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-center sm:text-left">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>{t.conversionStrip.badge}</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900">
              {t.conversionStrip.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {t.conversionStrip.desc}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Link href={`/signup?plan=trial&lang=${language}`} className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer min-h-[48px]">
                {t.conversionStrip.cta}
              </button>
            </Link>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{t.conversionStrip.secure}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 13. Pricing Comparison Matrix Section */}
      <section id="pricing" className="px-4 sm:px-8 md:px-12 pt-14 pb-12 sm:py-16 max-w-6xl mx-auto space-y-8 sm:space-y-10 scroll-mt-16">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-[28px] md:text-3xl font-black text-slate-900 tracking-tight leading-[1.22]">{t.pricing.title}</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase">{t.pricing.subtitle}</p>
          </div>

          {/* Pricing Toggle */}
          <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                billingInterval === 'monthly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.pricing.monthly}
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                billingInterval === 'yearly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.pricing.yearly}
            </button>
          </div>
        </div>

        {/* 3-Day Full Access Trial for ₹3 Highlight */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              <Sparkles className="h-3 w-3" />
              <span>Full Access Trial</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              3-Day Full Access Trial (Sirf ₹3 me)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              QR Ordering, Live KDS, Inventory, AI Recipe Costing, Cash Closing, Petty Cash aur Staff Attendance. Bina kisi POS machine ya extra hardware ke apne regular phone par 72 hours tak sab kuch test karein.
            </p>
            <p className="text-[11px] text-slate-500 font-semibold">
              🔒 100% Safe Razorpay Checkout • Koi Auto-Debit Nahi • Turant Activation
            </p>
          </div>

          <Link href={`/signup?plan=trial&lang=${language}`} className="shrink-0 w-full md:w-auto">
            <button className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3.5 rounded-xl text-sm shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[48px]">
              <span>3-Din Trial Shuru Karein (Sirf ₹3)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {pricingPlans.map(plan => {
            const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const pricePeriod = billingInterval === 'yearly' ? t.pricing.perYear : t.pricing.perMonth;
            const featuresList = Array.isArray(plan.features) ? plan.features : [];
            const planDesc = t.pricing.plans[plan.id as keyof typeof t.pricing.plans] || plan.name;

            return (
              <Card key={plan.id} className="flex flex-col justify-between hover:shadow-lg transition-all duration-300 hover:scale-101 animate-fade-in bg-white border border-slate-200 rounded-2xl">
                <CardContent className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-black text-slate-900 text-xl capitalize">{plan.name} {t.pricing.planSuffix}</h3>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{planDesc}</p>
                    </div>

                    <div className="flex items-baseline">
                      <span className="text-3xl sm:text-4xl font-black text-slate-950">{formatPrice(price)}</span>
                      <span className="text-slate-400 text-xs font-semibold ml-1">{pricePeriod}</span>
                    </div>

                    <Badge variant="neutral" className="w-full justify-center bg-slate-50 border-slate-100 text-slate-600 font-semibold py-1">
                      {(plan.max_tables ?? 0) >= 9999 && (plan.max_items ?? 0) >= 9999 
                        ? t.pricing.unlimitedBadge
                        : t.pricing.upToBadge((plan.max_tables ?? 0) >= 9999 ? 'Unlimited' : (plan.max_tables ?? 0), (plan.max_items ?? 0) >= 9999 ? 'Unlimited' : (plan.max_items ?? 0))}
                    </Badge>

                    <ul className="space-y-2.5 text-xs text-slate-600 pt-2">
                      {featuresList.map(f => (
                        <li key={f} className="flex items-center gap-2 font-semibold">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <Link href={`/signup?plan=${plan.id}&interval=${billingInterval}&lang=${language}`}>
                      <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-all cursor-pointer hover:scale-102 min-h-[48px]">
                        {t.pricing.getStarted}
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 14. Trust Footer Badges */}
        <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-700 shadow-2xs text-center">
            <RefreshCw className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{t.trustBadges[0]}</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-700 shadow-2xs text-center">
            <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{t.trustBadges[1]}</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-700 shadow-2xs text-center">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{t.trustBadges[2]}</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-700 shadow-2xs text-center">
            <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{t.trustBadges[3]}</span>
          </div>
        </div>
      </section>
      </main>

      {/* Translated Footer */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 shrink-0 font-sans pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            {/* Column 1: Brand Info */}
            <div className="space-y-4 md:col-span-1">
              <Link href={`/?lang=${language}`} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center shadow-xs">
                  <img src="/logo.png" alt="CleverOps Logo" className="h-full w-full object-contain" />
                </div>
                <span className="font-black text-lg tracking-tight text-white">CleverOps</span>
              </Link>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t.footer.desc}
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-1">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{t.footer.gateway}</span>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">{t.footer.productHeading}</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/#features" className="hover:text-emerald-400 transition-colors">{t.footer.featuresLink}</Link>
                </li>
                <li>
                  <Link href="/#pricing" className="hover:text-emerald-400 transition-colors">{t.footer.pricingLink}</Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-emerald-400 transition-colors">{t.footer.aboutLink}</Link>
                </li>
                <li>
                  <Link href={`/login?lang=${language}`} className="hover:text-emerald-400 transition-colors">{t.footer.loginLink}</Link>
                </li>
                <li>
                  <Link href={`/signup?lang=${language}`} className="hover:text-emerald-400 transition-colors">{t.footer.registerLink}</Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal & Policies */}
            <div className="space-y-3">
              <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">{t.footer.legalHeading}</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/refund-policy" className="hover:text-emerald-400 transition-colors text-emerald-400 font-bold">
                    {t.footer.refundLink}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-emerald-400 transition-colors">{t.footer.privacyLink}</Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-emerald-400 transition-colors">{t.footer.termsLink}</Link>
                </li>
                <li>
                  <Link href="/terms#disclaimer" className="hover:text-emerald-400 transition-colors">{t.footer.disclaimerLink}</Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact Info */}
            <div className="space-y-3">
              <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">{t.footer.supportHeading}</h4>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                  <a href="mailto:dsoni1281@gmail.com" className="hover:text-white transition-colors">dsoni1281@gmail.com</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                  <a href="tel:+918949266064" className="hover:text-white transition-colors">+91 89492 66064 (Deepak Kumar Soni)</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                  <a href="tel:+917742054535" className="hover:text-white transition-colors">+91 77420 54535</a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-400">{t.footer.address}</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} CleverOps (cleverops.in). {t.footer.rights}</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy-policy" className="hover:text-slate-400 transition-colors">{t.footer.privacy}</Link>
              <span>•</span>
              <Link href="/refund-policy" className="hover:text-slate-400 transition-colors">{t.footer.refunds}</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-slate-400 transition-colors">{t.footer.terms}</Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-slate-400 transition-colors">{t.footer.contact}</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* 15. Thumb-Zone Sticky Bottom Bar (h-16, z-50, Non-intrusive) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-4 flex items-center justify-between h-16 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex flex-col justify-center pr-2 min-w-0">
          <span className="text-xs font-black text-slate-900 tracking-tight truncate">{t.floatingBar.title}</span>
          <span className="text-[10px] text-slate-500 font-semibold truncate">{t.floatingBar.subtitle}</span>
        </div>
        <Link href={`/signup?plan=trial&lang=${language}`} className="shrink-0">
          <button className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs shadow-emerald-600/20 cursor-pointer h-10 min-h-[40px] flex items-center justify-center whitespace-nowrap">
            {t.floatingBar.cta}
          </button>
        </Link>
      </div>

    </div>
  );
}
