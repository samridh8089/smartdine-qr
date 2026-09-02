'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  QrCode, ChefHat, BarChart3, 
  Smartphone, Check, Sparkles, Menu, X, 
  Play, Clock, ChevronDown, ChevronUp, AlertTriangle, 
  ShieldCheck, Zap, Laptop, Users, Receipt, Package,
  Lock, FileText, XCircle, CheckCircle2, RefreshCw, Layers,
  Globe, Mail, Phone, MapPin
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
  const [activePreviewTab, setActivePreviewTab] = useState<'owner' | 'kitchen' | 'waiter' | 'cashier'>('owner');
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

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
        btnHinglish: '🇮🇳 Hinglish',
        btnEnglish: '🌍 English',
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
        pill: 'AI-Powered Restaurant Operating System',
        titlePrefix: 'Restaurant ka har kaam.',
        titleHighlight: 'Ek hi App se.',
        subtitle: 'Order se lekar Kitchen, Inventory, AI Recipe Costing, Billing aur Reports tak sab kuch ek hi app me. Laptop ya alag machine ki zarurat nahi.',
        trialCta: 'Start 3-Day Trial for ₹3',
        demoCta: 'Watch Live Demo',
        microcopy1: 'Razorpay se sirf ₹3 pay karo. 3 din sab features unlock.',
        microcopy2: 'No Laptop Required • No Extra Hardware • Setup in Minutes',
        pills: [
          'No Laptop Required',
          'Built for Restaurant Owners',
          'Razorpay Secure',
          '5 Minute Setup',
        ],
        chips: [
          'QR Ordering',
          'Live KDS',
          'Inventory',
          'AI Recipe',
          'AI Menu',
          'Billing',
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
          kitchen: 'Kitchen Display',
          waiter: 'Waiter',
          cashier: 'Cashier',
        },
        subtitles: {
          owner: '📱 Owner: Sales, inventory aur staff ek hi screen se manage karo.',
          kitchen: '🍳 Kitchen: Live order queue bina kisi confusion ke.',
          waiter: '🛎️ Waiter: Table requests aur bill instantly receive karo.',
          cashier: '💳 Cashier: UPI aur receipt 2 taps me.',
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
          card2Title: 'Table 05 • Printed Receipt',
          card2Status: 'Payment received via UPI',
          card2Action: 'Thermal 3-Inch Receipt Printed',
          card3Title: "Today's Collection",
          card3Total: '₹24,850 Total',
          card3Breakdown: 'UPI: ₹18,400 • Cash: ₹6,450',
          card3Action: 'Day Cash Register Synced',
        },
      },
      whyUs: {
        title: 'Jo phone chalana aata hai, CleverOps bhi chal jayega.',
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
        subtitle: 'Din bhar ki bhag-daud ke baad kaghaz ke bills aur hisaab-kitab ka bojh — dekhiye CleverOps kaise poora process automate karta hai.',
        col1Title: 'Without CleverOps',
        col1Badge: 'Manual & Frustrating',
        col1List: [
          { strong: 'Orders ka hisaab alag', p: 'Kaghaz ke parcho aur slips ko jodte-jodte raat ke 12 baj jate hain.' },
          { strong: 'Kitchen se baar baar puchna', p: 'Kaunsa order late hua, chef ne kya banaya, accountability zero hoti hai.' },
          { strong: 'Stock kab khatam hua pata nahi', p: 'Subah dukan kholte hi achanak pata chalta hai paneer ya butter khatam hai.' },
          { strong: 'Dish ki asli costing nahi dikhti', p: 'Market me rate badhne par pata nahi chalta kaunsi dish loss me bik rahi hai.' },
          { strong: 'Staff coordination me time waste', p: 'Waiter, kitchen aur billing counter ke beech aapsi chikhna-chillana.' },
        ],
        col2Title: 'With CleverOps',
        col2Badge: '100% Automated',
        col2List: [
          { strong: 'Sab orders live', p: 'Customer QR scan karke order kare, kitchen aur counter par turant sync.' },
          { strong: 'Kitchen automatically sync', p: 'Live KDS tickets with timers — chef ko har order ki exact details clear.' },
          { strong: 'Low stock alert', p: 'Stock khatam hone se pehle Owner ke mobile par automatic alert notification.' },
          { strong: 'Dish costing automatically update', p: 'Daily ingredient prices update karte hi har dish ka live profit margin ready.' },
          { strong: 'Ek dashboard me poora restaurant', p: '10:30 PM hote hi closing sales, items sold aur inventory report 1-tap me ready.' },
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
        ],
      },
      caseStudies: {
        badge: 'Customer Stories & Case Studies Coming Soon',
        text: 'CleverOps restaurants aur cafes ke operations ko transform kar raha hai. Real verified customer reviews jaldi publish honge.',
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
        title: '3-Day Trial for ₹3',
        subtitle: 'Razorpay se sirf ₹3 pay karo',
        cta: 'Start 3-Day Trial for ₹3',
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
        btnHinglish: '🇮🇳 Hinglish',
        btnEnglish: '🌍 English',
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
        pill: 'AI-Powered Restaurant Operating System',
        titlePrefix: 'Run your entire restaurant.',
        titleHighlight: 'From one app.',
        subtitle: 'Manage Orders, Kitchen, Inventory, AI Recipe Costing, Billing and Reports from a single app. No laptop or extra hardware needed.',
        trialCta: 'Start a 3-Day Trial for ₹3',
        demoCta: 'Watch Live Demo',
        microcopy1: 'Pay just ₹3 via Razorpay. Unlock all features for 3 days.',
        microcopy2: 'No Laptop Required • No Extra Hardware • Setup in Minutes',
        pills: [
          'No Laptop Required',
          'Built for Restaurant Owners',
          'Razorpay Secure',
          '5 Minute Setup',
        ],
        chips: [
          'QR Ordering',
          'Live KDS',
          'Inventory',
          'AI Recipe',
          'AI Menu',
          'Billing',
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
          kitchen: 'Kitchen Display',
          waiter: 'Waiter',
          cashier: 'Cashier',
        },
        subtitles: {
          owner: '📱 Owner: Manage sales, inventory, and staff from a single screen.',
          kitchen: '🍳 Kitchen: Live order queue without any confusion.',
          waiter: '🛎️ Waiter: Receive table service calls and bill requests instantly.',
          cashier: '💳 Cashier: Instant UPI QR and receipt printing in 2 taps.',
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
          card2Title: 'Table 05 • Printed Receipt',
          card2Status: 'Payment received via UPI',
          card2Action: 'Thermal 3-Inch Receipt Printed',
          card3Title: "Today's Collection",
          card3Total: '₹24,850 Total',
          card3Breakdown: 'UPI: ₹18,400 • Cash: ₹6,450',
          card3Action: 'Day Cash Register Synced',
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
        subtitle: 'After a long day on your feet, sorting paper bills and inventory is exhausting — see how CleverOps automates everything.',
        col1Title: 'Without CleverOps',
        col1Badge: 'Manual & Frustrating',
        col1List: [
          { strong: 'Disconnected order tallying', p: 'Tallying paper slips and register books until midnight.' },
          { strong: 'Repeatedly checking on the kitchen', p: 'Zero accountability on late orders, food prep times, or chef delays.' },
          { strong: 'Stock runs out without warning', p: 'Opening the doors in the morning only to find paneer or butter out of stock.' },
          { strong: 'No visibility on true dish costing', p: 'Market prices rise and you don’t realize which dishes are losing money.' },
          { strong: 'Wasted time coordinating staff', p: 'Shouting and chaos between waiters, kitchen, and the billing counter.' },
        ],
        col2Title: 'With CleverOps',
        col2Badge: '100% Automated',
        col2List: [
          { strong: 'All orders synced live', p: 'Customers scan the QR code to order; instant sync to kitchen and counter.' },
          { strong: 'Kitchen automatically synchronized', p: 'Live KDS tickets with timers — complete clarity on every order for the chef.' },
          { strong: 'Low stock alerts', p: 'Automatic notifications sent straight to the owner’s phone before stock runs out.' },
          { strong: 'Dish costing updates automatically', p: 'Daily ingredient rate changes immediately update live gross profit margins.' },
          { strong: 'Your entire restaurant in one dashboard', p: 'By 10:30 PM closing, total revenue, item sales, and inventory reports are ready in 1 tap.' },
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
        ],
      },
      caseStudies: {
        badge: 'Customer Stories & Case Studies Coming Soon',
        text: 'CleverOps is transforming operations for restaurants and cafes across India. Verified customer reviews will be published soon.',
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
        title: '3-Day Trial for ₹3',
        subtitle: 'Pay just ₹3 via Razorpay',
        cta: 'Start a 3-Day Trial for ₹3',
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

  const featureIcons = [QrCode, ChefHat, Package, Sparkles, Smartphone, Receipt, BarChart3];
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
                    ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl sm:text-3xl select-none">🇮🇳</span>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm sm:text-base">Hinglish</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      {!isBrowserEn ? 'Default choice' : 'Switch anytime later'}
                    </div>
                  </div>
                </div>
                {!isBrowserEn && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold uppercase text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-full shrink-0">
                    Recommended
                  </span>
                )}
              </button>

              {/* Option 2: English Card Button */}
              <button
                onClick={() => handleModalSelect('en')}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isBrowserEn
                    ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl sm:text-3xl select-none">🌍</span>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm sm:text-base">English</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      {isBrowserEn ? 'Default choice' : 'Switch anytime later'}
                    </div>
                  </div>
                </div>
                {isBrowserEn && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold uppercase text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-full shrink-0">
                    Recommended
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header / Navbar - Light Premium Sticky Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 py-3.5 px-4 sm:px-8 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        <Link href={`/?lang=${language}`} className="flex items-center gap-3" aria-label="CleverOps Home">
          <img src="/logo.png" alt="CleverOps Restaurant Operating System Logo" className="h-9 w-auto object-contain" />
          <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">CleverOps</span>
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

        {/* Mobile Header Buttons */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Language Switcher (Segmented control) */}
          <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-100 text-[11px] font-bold shadow-2xs" role="group" aria-label="Language selector">
            <button
              onClick={() => handleNavbarSwitch('hi')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer min-h-[36px] flex items-center justify-center ${
                language === 'hi'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={language === 'hi'}
              aria-label="Hinglish"
            >
              HI
            </button>
            <button
              onClick={() => handleNavbarSwitch('en')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer min-h-[36px] flex items-center justify-center ${
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
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-xs min-h-[38px]">
              {t.nav.trialCtaMobile}
            </button>
          </Link>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navbar overlay */}
        {mobileMenuOpen && (
          <nav aria-label="Mobile Navigation" className="absolute top-14 left-0 w-full bg-white border-b border-slate-200 flex flex-col p-6 space-y-4 shadow-xl z-20 md:hidden animate-pop">
            <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">{t.nav.productPreview}</a>
            <a href="#why-us" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">{t.nav.noHardwareNeeded}</a>
            <a href="#profit-intelligence" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">{t.nav.smartCosting}</a>
            <a href="#roles" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">{t.nav.demoVideos}</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">{t.nav.pricing}</a>
            <div className="h-px bg-slate-100 my-1" />
            <Link href={`/login?lang=${language}`} onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">
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

      <main className="flex-1">

      {/* 1. Hero Section (Compressed Mobile First-Fold) */}
      <section className="px-4 sm:px-8 md:px-12 pt-3 pb-3 sm:pt-14 sm:pb-14 md:pt-18 md:pb-16 max-w-4xl mx-auto text-center space-y-2.5 sm:space-y-6">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-3 py-0.5 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-emerald-800">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>{t.hero.pill}</span>
        </div>
        
        {/* Headline */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight sm:leading-[1.15]">
          {t.hero.titlePrefix} <span className="text-emerald-600">{t.hero.titleHighlight}</span>
        </h1>
        
        {/* Subheadline */}
        <p className="text-xs sm:text-base md:text-lg text-slate-600 max-w-xl sm:max-w-2xl mx-auto leading-relaxed">
          {t.hero.subtitle}
        </p>
        
        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-0.5 w-full max-w-xs sm:max-w-none mx-auto">
          <Link href={`/signup?plan=trial&lang=${language}`} className="w-full sm:w-auto">
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm md:text-base font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2">
              <span>{t.hero.trialCta}</span>
            </button>
          </Link>
          <a href="#roles" className="w-full sm:w-auto">
            <button className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-6 py-3 rounded-xl text-sm md:text-base font-semibold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]">
              <Play className="h-4 w-4 fill-slate-700 text-slate-700" />
              <span>{t.hero.demoCta}</span>
            </button>
          </a>
        </div>

        {/* Microcopy */}
        <div className="space-y-0.5">
          <p className="text-xs sm:text-sm text-slate-700 font-bold">
            {t.hero.microcopy1}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            {t.hero.microcopy2}
          </p>
        </div>

        {/* 4 Hero Trust Pills — "Built for Restaurant Owners" */}
        <div className="pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs">
            <Laptop className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{t.hero.pills[0]}</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs">
            <Users className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{t.hero.pills[1]}</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{t.hero.pills[2]}</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs">
            <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{t.hero.pills[3]}</span>
          </div>
        </div>

        {/* What You Get — 2 Rows x 3 Chips */}
        <div className="pt-0.5 grid grid-cols-3 gap-1.5 sm:gap-2 max-w-xl mx-auto">
          {t.hero.chips.map((chip, idx) => (
            <span key={idx} className="h-8 sm:h-auto inline-flex items-center justify-center px-2 sm:px-3.5 py-1 rounded-xl text-[10.5px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs text-center">
              {chip}
            </span>
          ))}
        </div>
      </section>

      {/* Trust Strip */}
      <section className="bg-slate-50 border-y border-slate-200/80 py-2 sm:py-3 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-1.5 text-[11px] sm:text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{t.trustStrip[0]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{t.trustStrip[1]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{t.trustStrip[2]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{t.trustStrip[3]}</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1 justify-center">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{t.trustStrip[4]}</span>
          </div>
        </div>
      </section>

      {/* 2. Dashboard Preview Section (Authentic Snapshot, Clearly Labeled Demo) */}
      <section id="preview" className="px-4 sm:px-6 md:px-12 py-5 sm:py-14 max-w-5xl mx-auto w-full space-y-3 sm:space-y-6 scroll-mt-16">
        <div className="text-center space-y-1 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold text-slate-700">
            <Layers className="h-3 w-3 text-emerald-600" />
            <span>{t.preview.badge}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">{t.preview.title}</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">{t.preview.subtitle}</p>
        </div>

        {/* 4 Role Tab Switcher with Enhanced Emerald Active Feedback */}
        <div className="flex justify-center w-full px-1">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setActivePreviewTab('owner')}
              className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[38px] ${
                activePreviewTab === 'owner'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              {t.preview.tabs.owner}
            </button>
            <button
              onClick={() => setActivePreviewTab('kitchen')}
              className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[38px] ${
                activePreviewTab === 'kitchen'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              {t.preview.tabs.kitchen}
            </button>
            <button
              onClick={() => setActivePreviewTab('waiter')}
              className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[38px] ${
                activePreviewTab === 'waiter'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              {t.preview.tabs.waiter}
            </button>
            <button
              onClick={() => setActivePreviewTab('cashier')}
              className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[38px] ${
                activePreviewTab === 'cashier'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              {t.preview.tabs.cashier}
            </button>
          </div>
        </div>

        {/* Role Explanation Subtitle */}
        <div className="text-center">
          <p className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 py-1.5 px-4 rounded-full inline-block">
            {t.preview.subtitles[activePreviewTab]}
          </p>
        </div>

        {/* Authentic UI Snapshot Container — Clearly Marked as Demo Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 shadow-sm w-full transition-all duration-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t.preview.demoHeader}</span>
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {t.preview.sampleTag}
            </span>
          </div>

          {/* Owner Tab */}
          {activePreviewTab === 'owner' && (
            <div className="space-y-3 sm:space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">{t.preview.owner.todaySales}</p>
                  <p className="text-lg font-black text-slate-900">₹24,850</p>
                  <p className="text-[10px] text-emerald-600 font-bold">{t.preview.owner.salesDemo}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">{t.preview.owner.activeTables}</p>
                  <p className="text-lg font-black text-slate-900">12 / 16</p>
                  <p className="text-[10px] text-slate-500">{t.preview.owner.occupancy}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">{t.preview.owner.pendingBills}</p>
                  <p className="text-lg font-black text-slate-900">₹3,890</p>
                  <p className="text-[10px] text-slate-500">{t.preview.owner.tablesCheckout}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">{t.preview.owner.kitchenQueue}</p>
                  <p className="text-lg font-black text-slate-900">4 Orders</p>
                  <p className="text-[10px] text-emerald-600 font-bold">{t.preview.owner.avgPrep}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">{t.preview.owner.staffOnline}</p>
                  <p className="text-lg font-black text-slate-900">5 Active</p>
                  <p className="text-[10px] text-slate-500">{t.preview.owner.allRolesSynced}</p>
                </div>
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-0.5">
                  <p className="text-[10px] font-semibold text-amber-800 uppercase">{t.preview.owner.lowStock}</p>
                  <p className="text-lg font-black text-amber-900">3 Items</p>
                  <p className="text-[10px] text-amber-700 font-bold">{t.preview.owner.alertTriggered}</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{t.preview.owner.riceAlert}</span>
                </div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">{t.preview.owner.actionRequired}</span>
              </div>
            </div>
          )}

          {/* Kitchen Display Tab */}
          {activePreviewTab === 'kitchen' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 animate-fade-in">
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 sm:p-3.5 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                  <span>{t.preview.kitchen.batch1}</span>
                  <span className="bg-amber-100 px-2 py-0.5 rounded text-[10px]">{t.preview.kitchen.statusNew}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{t.preview.kitchen.items1}</p>
                <p className="text-[10px] text-slate-500">{t.preview.kitchen.notes1}</p>
              </div>
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 sm:p-3.5 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                  <span>{t.preview.kitchen.batch2}</span>
                  <span className="bg-blue-100 px-2 py-0.5 rounded text-[10px]">{t.preview.kitchen.statusPrep}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{t.preview.kitchen.items2}</p>
                <p className="text-[10px] text-slate-500">{t.preview.kitchen.notes2}</p>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 sm:p-3.5 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                  <span>{t.preview.kitchen.batch3}</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px]">{t.preview.kitchen.statusReady}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{t.preview.kitchen.items3}</p>
                <p className="text-[10px] text-emerald-700 font-bold">{t.preview.kitchen.notes3}</p>
              </div>
            </div>
          )}

          {/* Waiter Tab */}
          {activePreviewTab === 'waiter' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs animate-fade-in">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-purple-900">
                  <span>{t.preview.waiter.card1Title}</span>
                  <span className="bg-purple-100 px-2 py-0.5 rounded text-[10px]">{t.preview.waiter.card1Badge}</span>
                </div>
                <p className="text-slate-700 font-medium">{t.preview.waiter.card1Desc}</p>
                <p className="text-[10px] text-slate-500">{t.preview.waiter.card1Time}</p>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-emerald-900">
                  <span>{t.preview.waiter.card2Title}</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px]">₹1,450</span>
                </div>
                <p className="text-slate-700 font-medium">{t.preview.waiter.card2Desc}</p>
                <p className="text-[10px] text-emerald-700 font-bold">{t.preview.waiter.card2Time}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.waiter.card3Title}</span>
                  <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px]">{t.preview.waiter.card3Badge}</span>
                </div>
                <p className="text-slate-700 font-medium">{t.preview.waiter.card3Desc}</p>
                <button className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded w-full mt-1 cursor-pointer">
                  {t.preview.waiter.punchButton}
                </button>
              </div>
            </div>
          )}

          {/* Cashier Tab */}
          {activePreviewTab === 'cashier' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.cashier.card1Title}</span>
                  <span className="text-emerald-600 font-extrabold text-sm">₹1,450</span>
                </div>
                <p className="text-slate-600">{t.preview.cashier.card1Subtotal}</p>
                <div className="bg-emerald-600 text-white font-bold text-center py-1.5 rounded text-[11px]">
                  {t.preview.cashier.card1Action}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.cashier.card2Title}</span>
                  <span className="text-slate-900 font-bold">₹2,100</span>
                </div>
                <p className="text-slate-600">{t.preview.cashier.card2Status}</p>
                <div className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-center py-1.5 rounded text-[11px]">
                  {t.preview.cashier.card2Action}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{t.preview.cashier.card3Title}</span>
                  <span className="text-slate-900 font-bold">{t.preview.cashier.card3Total}</span>
                </div>
                <p className="text-slate-600">{t.preview.cashier.card3Breakdown}</p>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-center py-1.5 rounded text-[11px]">
                  {t.preview.cashier.card3Action}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Dedicated "No Laptop Required" Objection Remover Section */}
      <section id="why-us" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-slate-50 border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {t.whyUs.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.whyUs.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2 shadow-2xs">
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">{t.whyUs.card1Title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.whyUs.card1Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2 shadow-2xs">
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Laptop className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">{t.whyUs.card2Title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.whyUs.card2Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2 shadow-2xs">
              <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">{t.whyUs.card3Title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.whyUs.card3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Restaurant Reality Section ("Restaurant Band Hone Ke Baad...") */}
      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {t.reality.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              {t.reality.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Column 1: Without CleverOps */}
            <div className="bg-slate-50/80 border border-red-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-red-100">
                <span className="text-base font-black text-red-900">{t.reality.col1Title}</span>
                <span className="text-[11px] font-extrabold uppercase text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  {t.reality.col1Badge}
                </span>
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
                {t.reality.col1List.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900">{item.strong}</strong>
                      <p className="text-slate-500 text-xs">{item.p}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: With CleverOps */}
            <div className="bg-white border border-emerald-300 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs ring-1 ring-emerald-500/20">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <span className="text-base font-black text-emerald-950">{t.reality.col2Title}</span>
                <span className="text-[11px] font-extrabold uppercase text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {t.reality.col2Badge}
                </span>
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
                {t.reality.col2List.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900">{item.strong}</strong>
                      <p className="text-slate-600 text-xs">{item.p}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Smart Costing & Food Cost Intelligence Section (Inventory USP) */}
      <section id="profit-intelligence" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-slate-50 border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {t.smartCosting.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              {t.smartCosting.subtitle}
            </p>
          </div>

          {/* Highlight Impact Callout */}
          <div className="bg-white border border-emerald-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-2 shadow-2xs text-center">
            <span className="inline-block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200">
              {t.smartCosting.badge}
            </span>
            <p className="text-sm sm:text-base font-black text-slate-900 leading-relaxed">
              {t.smartCosting.impactHeadline}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t.smartCosting.impactDesc}
            </p>
          </div>

          {/* Practical Recipe Cost Calculation Example Card */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900">{t.smartCosting.demoDish}</span>
                <span className="text-[10px] font-extrabold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {t.smartCosting.demoTag}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{t.smartCosting.menuPrice}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Before */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">{t.smartCosting.beforeTitle}</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">{t.smartCosting.paneerRate}</span>
                  <span className="font-bold text-slate-900">₹280 / kg</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">{t.smartCosting.baseCost}</span>
                  <span className="font-extrabold text-emerald-700">₹48</span>
                </div>
                <div className="pt-0.5 text-[10.5px] text-emerald-800 font-semibold">
                  {t.smartCosting.beforeProfit}
                </div>
              </div>

              {/* After */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">{t.smartCosting.afterTitle}</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-900">{t.smartCosting.paneerRate}</span>
                  <span className="font-bold text-amber-950">{t.smartCosting.afterPaneer}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-900">{t.smartCosting.baseCost}</span>
                  <span className="font-extrabold text-amber-900">₹62</span>
                </div>
                <div className="pt-0.5 text-[10.5px] text-amber-900 font-bold">
                  {t.smartCosting.afterProfit}
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-center">
              <p className="text-xs font-bold text-emerald-950">
                {t.smartCosting.highlightBanner}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.smartCosting.card1Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.smartCosting.card1Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.smartCosting.card2Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.smartCosting.card2Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.smartCosting.card3Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.smartCosting.card3Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.smartCosting.card4Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.smartCosting.card4Desc}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs sm:col-span-2 lg:col-span-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.smartCosting.card5Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.smartCosting.card5Desc}
              </p>
            </div>
          </div>

          <div className="text-center bg-emerald-50/80 border border-emerald-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-2xs">
            <p className="text-xs sm:text-sm font-bold text-emerald-950">
              {t.smartCosting.bottomTag}
            </p>
          </div>
        </div>
      </section>

      {/* 6. Real 6-Step Daily Workflow Timeline */}
      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {t.workflow.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.workflow.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
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
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
                  <div className={`inline-flex items-center gap-1.5 ${colors[idx % colors.length]} font-black text-xs px-2.5 py-1 rounded-md`}>
                    <Clock className={`h-3.5 w-3.5 ${iconColors[idx % iconColors.length]}`} />
                    <span>{step.time}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Believable Demo Videos Section (45 sec Demo Cards) */}
      <section id="roles" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 max-w-5xl mx-auto w-full space-y-4 sm:space-y-8 scroll-mt-16 bg-slate-50 border-b border-slate-200/80">
        <div className="text-center space-y-1 sm:space-y-2">
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            {t.demoVideos.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
            {t.demoVideos.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Owner App */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4">
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
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{t.demoVideos.card1Header}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t.demoVideos.card1Desc}
              </p>
            </div>
          </div>

          {/* Card 2: Kitchen Display */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4">
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
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{t.demoVideos.card2Header}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t.demoVideos.card2Desc}
              </p>
            </div>
          </div>

          {/* Card 3: Waiter App */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4">
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
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{t.demoVideos.card3Header}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t.demoVideos.card3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Feature Showcase Carousel (Scrollable Mobile) */}
      <section id="features" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {t.features.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-4 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-6 md:pb-0 scrollbar-none">
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

      {/* 9. Case Studies & Stories Section (Honest Placeholder) */}
      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-14 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>{t.caseStudies.badge}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-lg mx-auto">
            {t.caseStudies.text}
          </p>
        </div>
      </section>

      {/* 10. Traditional POS Comparison Matrix */}
      <section id="comparison" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {t.comparison.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.comparison.subtitle}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-slate-100/80 p-3 sm:p-4 text-xs sm:text-sm font-bold">
              <div className="text-slate-600">{t.comparison.headers[0]}</div>
              <div className="text-slate-500">{t.comparison.headers[1]}</div>
              <div className="text-emerald-700 flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{t.comparison.headers[2]}</span>
              </div>
            </div>

            {/* Rows */}
            {t.comparison.rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
                <div className="font-semibold text-slate-800">{row.feature}</div>
                <div className="text-slate-500">{row.pos}</div>
                <div className="text-emerald-700 font-bold">{row.clever}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FAQ Accordion Section */}
      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {t.faqs.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              {t.faqs.subtitle}
            </p>
          </div>

          <div className="space-y-2.5">
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
      <section id="pricing" className="px-4 sm:px-8 md:px-12 py-10 sm:py-16 max-w-6xl mx-auto space-y-10 scroll-mt-16">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{t.pricing.title}</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase">{t.pricing.subtitle}</p>
          </div>

          {/* Pricing Toggle */}
          <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.pricing.monthly}
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'yearly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.pricing.yearly}
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricingPlans.map(plan => {
            const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const pricePeriod = billingInterval === 'yearly' ? t.pricing.perYear : t.pricing.perMonth;
            const featuresList = Array.isArray(plan.features) ? plan.features : [];
            const planDesc = t.pricing.plans[plan.id as keyof typeof t.pricing.plans] || plan.name;

            return (
              <Card key={plan.id} className="flex flex-col justify-between hover:shadow-lg transition-all duration-300 hover:scale-101 animate-fade-in bg-white border border-slate-200">
                <CardContent className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-black text-slate-900 text-xl capitalize">{plan.name} {t.pricing.planSuffix}</h3>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{planDesc}</p>
                    </div>

                    <div className="flex items-baseline">
                      <span className="text-4xl font-black text-slate-950">{formatPrice(price)}</span>
                      <span className="text-slate-400 text-xs font-semibold">{pricePeriod}</span>
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
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 shrink-0 font-sans">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            {/* Column 1: Brand Info */}
            <div className="space-y-4 md:col-span-1">
              <Link href={`/?lang=${language}`} className="flex items-center gap-3">
                <img src="/logo.png" alt="CleverOps Logo" className="h-9 w-auto object-contain" />
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

      {/* 15. Sticky Mobile CTA Floating Bar (Enhanced Trust Reassurance) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-slate-200 py-2 px-3.5 flex flex-col gap-1 shadow-lg md:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-900">{t.floatingBar.title}</span>
            <span className="text-[10px] text-slate-500 font-medium">{t.floatingBar.subtitle}</span>
          </div>
          <Link href={`/signup?plan=trial&lang=${language}`}>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 cursor-pointer min-h-[44px]">
              {t.floatingBar.cta}
            </button>
          </Link>
        </div>
        <div className="text-[9.5px] font-semibold text-slate-500 text-center tracking-tight border-t border-slate-100/80 pt-1">
          {t.floatingBar.microcopy}
        </div>
      </div>

    </div>
  );
}
