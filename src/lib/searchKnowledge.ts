/**
 * CleverOps Smart Search & "How-To" Knowledge Engine
 * Provides instant, zero-latency workflow guides, role-based filtering, and direct action deep-links.
 */

export interface SearchKnowledgeItem {
  id: string;
  category: 'guide' | 'action' | 'navigation';
  title: string;
  subtitle: string;
  keywords: string[];
  icon: string;
  badge?: string;
  steps?: string[];
  tip?: string;
  route: string;
  actionText: string;
  rolesAllowed: string[];
  isPopular?: boolean;
}

export const KNOWLEDGE_CATALOG: SearchKnowledgeItem[] = [
  // 1. AI Recipe Creation (Requested by user)
  {
    id: 'ai-recipe-creator',
    category: 'guide',
    title: 'AI Recipe Kaise Banaye (AI Chef & BOM Costing)',
    subtitle: 'Dish ke ingredients generate karein, food cost calculate karein aur profit margin nikalein',
    keywords: [
      'ai recipe', 'recipe', 'ai chef', 'dish recipe', 'vidhi', 'khana banana', 'bom',
      'portion', 'food cost', 'plate cost', 'recipe kaise banaye', 'ingredient', 'rasoi'
    ],
    icon: 'Sparkles',
    badge: 'AI Tool',
    isPopular: true,
    steps: [
      'Inventory & Recipes (/dashboard/inventory) page par jayein.',
      "Top tabs me se 'Recipes & Food Costing' tab par click karein.",
      "Jis dish ki recipe banani hai uske saamne 'Recipe Configure' ya 'AI Chef' button dabayein.",
      'AI aapko required raw materials, units (grams, ml) aur accurate portion cost suggest karega.',
      "'Save Recipe' par click karein taaki live orders par inventory auto-deduct ho sake."
    ],
    tip: 'AI Recipe chalane se pehle ensure karein ki basic raw materials (jaise Onion, Oil, Paneer) Inventory stock me added hain.',
    route: '/dashboard/inventory?tab=recipes',
    actionText: 'Open AI Recipe Generator',
    rolesAllowed: ['owner', 'manager', 'head_chef', 'chef']
  },

  // 2. Salary Slip (Requested by user)
  {
    id: 'salary-slip-download',
    category: 'guide',
    title: 'Staff ki Salary Slip Kaise Download ya Print Kare',
    subtitle: 'Staff monthly salary slip, deductions, net pay aur printable PDF',
    keywords: [
      'salary slip', 'salary', 'slip', 'vetan', 'tankhah', 'payslip', 'payroll', 'wages',
      'salary slip download', 'print slip', 'staff salary', 'parchi'
    ],
    icon: 'FileText',
    badge: 'Payroll',
    isPopular: true,
    steps: [
      "'Attendance & Shifts' (/dashboard/attendance) page par jayein.",
      "Top menu se 'Payroll & Wages' tab select karein.",
      "Staff list me se jis member ki slip chahiye, uske saamne 'Salary Slip (📄)' icon par click karein.",
      'Month aur Year verify karein — earnings, advance deductions aur total present days auto-calculate honge.',
      "'Download Slip (PDF)' ya 'Print Slip' par click karein."
    ],
    tip: 'Salary slip final karne se pehle month ke saare attendance logs aur advance deductions approve kar lein.',
    route: '/dashboard/attendance?tab=payroll',
    actionText: 'Open Staff Payroll & Slips',
    rolesAllowed: ['owner', 'manager']
  },

  // 2b. Own Salary Slip for Staff / Chef / Waiter
  {
    id: 'my-salary-slip',
    category: 'action',
    title: 'Apni Salary Slip Dekhein',
    subtitle: 'Apne mahine ka hisab, attendance days aur salary slip check karein',
    keywords: ['salary', 'mera vetan', 'my salary', 'slip', 'meri tankhah', 'attendance hisab'],
    icon: 'Wallet',
    badge: 'My Account',
    steps: [
      "'Attendance' page par jayein.",
      'Apni monthly attendance summary aur approved salary statement check karein.'
    ],
    route: '/dashboard/attendance',
    actionText: 'View My Attendance & Slip',
    rolesAllowed: ['head_chef', 'chef', 'kitchen', 'kitchen_helper', 'captain', 'waiter', 'cashier', 'cleaner', 'helper', 'staff']
  },

  // 3. Inventory Add / Delete (Requested by user)
  {
    id: 'inventory-add-delete',
    category: 'guide',
    title: 'Inventory me Item Add ya Delete Kaise Kare',
    subtitle: 'Kacha maal (Raw materials) create karna, stock update karna aur bekar items hatana',
    keywords: [
      'inventory add', 'add item', 'delete item', 'stock add', 'raw material', 'kacha mal',
      'item delete', 'stock update', 'samaad', 'rasan', 'inventory hatana', 'inventory banana'
    ],
    icon: 'Boxes',
    badge: 'Inventory',
    isPopular: true,
    steps: [
      "'Inventory & Recipes' (/dashboard/inventory) page par jayein.",
      "Top bar se 'Stock Items' tab par click karein.",
      "Naya item add karne ke liye: Top-right me '+ Add Raw Material' button dabayein, Name, Category aur Unit (kg, litre, pcs) chunein aur Save karein.",
      "Item delete karne ke liye: List me item dhundhein aur right side ke 🗑️ (Delete) icon par click karke confirm karein."
    ],
    tip: 'Agar kisi item ki purani transactions ya recipe linked hai, to delete karne ki jagah uska stock 0 karein.',
    route: '/dashboard/inventory?tab=items&action=add_item',
    actionText: 'Open Inventory & Add Item',
    rolesAllowed: ['owner', 'manager', 'supervisor', 'head_chef', 'chef', 'kitchen']
  },

  // 4. New Account / Staff Creation (Requested by user)
  {
    id: 'create-new-account',
    category: 'guide',
    title: 'Naya Staff / Manager Account Kaise Banaye',
    subtitle: 'Naye captain, chef, waiter ya manager ko system me add karein aur login PIN dein',
    keywords: [
      'new account', 'staff add', 'naya account', 'naya staff', 'waiter add', 'manager account',
      'captain pin', 'login banana', 'user create', 'add staff', 'staff banana', 'banda add'
    ],
    icon: 'UserPlus',
    badge: 'Team & Access',
    isPopular: true,
    steps: [
      "'Settings' page par jayein aur 'Staff & Permissions' (/dashboard/settings?tab=staff) tab kholein.",
      "Scroll down karke 'Add New Staff Member' card par jayein.",
      "Staff ka Full Name, Mobile Number, aur Role (Manager, Captain, Chef, Waiter, Cashier) select karein.",
      '4-digit ka Quick Login PIN aur monthly salary/wage type set karein.',
      "'Save Staff Profile' par click karein — naya staff member instant login karne ke liye tayar ho jayega."
    ],
    tip: 'Cashier aur Manager ko sensitive permissions milti hain, isliye unka login PIN strong rakhein.',
    route: '/dashboard/settings?tab=staff',
    actionText: 'Create New Staff Member',
    rolesAllowed: ['owner', 'manager']
  },

  // 5. Cash Closing / Register
  {
    id: 'cash-register-closing',
    category: 'guide',
    title: 'Cash Register (Galla) Band Kaise Kare (Day-End Closing)',
    subtitle: 'Shift ya day-end hisab, cash drawer physical balance verify karna aur report download',
    keywords: [
      'cash closing', 'galla', 'galla band', 'cash register', 'closing hisab', 'day end',
      'drawer balance', 'cash tally', 'shift close', 'register close'
    ],
    icon: 'Banknote',
    badge: 'Cash Register',
    isPopular: true,
    steps: [
      "'Cash Register' (/dashboard/cash-closing) page par jayein.",
      'Cash drawer kholkar actual currency notes aur coins count karein.',
      "'Actual Cash in Drawer' field me counted amount enter karein.",
      'System expected cash vs actual cash ka difference calculate karega.',
      "'Close Register' button dabayein aur Day Closing Summary print/download karein."
    ],
    tip: 'Daily galla band karne se cash theft aur billing mismatch zero ho jaate hain.',
    route: '/dashboard/cash-closing',
    actionText: 'Open Cash Register Closing',
    rolesAllowed: ['owner', 'manager', 'supervisor', 'cashier']
  },

  // 6. Tables & QR Code
  {
    id: 'tables-and-qr-codes',
    category: 'guide',
    title: 'Table QR Code Download ya Print Kaise Kare',
    subtitle: 'Tables ke liye acrylic standee, sticker QR codes aur A4 printable sheets',
    keywords: [
      'qr code', 'table qr', 'qr download', 'standee print', 'table standee', 'sticker qr',
      'table add', 'naya table', 'table layout', 'qr print'
    ],
    icon: 'QrCode',
    badge: 'Tables',
    isPopular: true,
    steps: [
      "'Tables' (/dashboard/tables) page par jayein.",
      "Agar naya table add karna hai to '+ Add Table' par click karein aur Table Number set karein.",
      "QR print karne ke liye: Top right me 'Print All Sheets (A4)' ya 'QR Studio' par click karein.",
      'Apne restaurant ka layout choose karein aur High-Resolution PDF print ya download karein.'
    ],
    tip: 'SmartDine ke dynamic QR codes change karne ki zaroorat nahi padti, menu update hone par QR wahi rehta hai.',
    route: '/dashboard/tables',
    actionText: 'Go to Tables & QR Studio',
    rolesAllowed: ['owner', 'manager', 'supervisor', 'captain']
  },

  // 7. Offers & Discounts
  {
    id: 'offers-discounts-setup',
    category: 'guide',
    title: 'Discount Coupon ya Offer Kaise Lagaye',
    subtitle: 'Flat ₹ off, % percentage discount, promo codes aur minimum bill value',
    keywords: [
      'discount', 'offer', 'coupon', 'promo code', 'choot', 'discount lagana', 'flat off',
      'happy hours', 'festival offer', 'special offer'
    ],
    icon: 'Tag',
    badge: 'Marketing',
    steps: [
      "'Offers & Discounts' (/dashboard/offers) page par jayein.",
      "'+ Create Offer' button par click karein.",
      "Discount Type (Percentage % ya Flat ₹) select karein aur amount enter karein.",
      'Agar zaroori ho to Minimum Order Value aur Expiry Date set karein.',
      "'Active' toggle ON karke save karein — offer customer QR menu aur billing par lag jayega."
    ],
    tip: 'Weekday lunch time ke liye special 10% offer set karne se footfall 30% tak badhta hai.',
    route: '/dashboard/offers',
    actionText: 'Manage Offers & Discounts',
    rolesAllowed: ['owner', 'manager']
  },

  // 8. Sales & Financial Reports
  {
    id: 'sales-financial-reports',
    category: 'guide',
    title: 'Daily Sales & Financial Report Kaise Dekhe',
    subtitle: 'Total revenue, payment mode split (UPI vs Cash), peak hours aur net margin',
    keywords: [
      'sales report', 'hisab', 'bikri', 'kamai', 'daily report', 'revenue', 'profit',
      'net margin', 'financial report', 'analytics', 'monthly sales'
    ],
    icon: 'BarChart3',
    badge: 'Reports',
    steps: [
      "'Reports & Analytics' (/dashboard/reports) page par jayein.",
      'Date Range filter se Today, Yesterday, This Week ya Custom Month select karein.',
      'Total Sales, Paid Orders, Cancelled Bills aur Mode of Payment (Cash vs UPI) dekhein.',
      "'Export to Excel / CSV' par click karke CA ya accounting ke liye file download karein."
    ],
    tip: 'Overview dashboard par Owner Net Margin card se aap exact food cost katne ke baad net bachat dekh sakte hain.',
    route: '/dashboard/reports',
    actionText: 'View Reports & Analytics',
    rolesAllowed: ['owner', 'manager', 'supervisor', 'cashier']
  },

  // 9. Menu Item In/Out of Stock Toggle
  {
    id: 'menu-stock-toggle',
    category: 'action',
    title: 'Menu Item Out-of-Stock ya In-Stock Kaise Kare',
    subtitle: 'Koi dish khatam ho gayi to customer menu se turant band karein',
    keywords: [
      'out of stock', 'in stock', 'dish band', 'item band', 'khana khatam', 'menu toggle',
      'dish unavailable', 'stock khatam'
    ],
    icon: 'UtensilsCrossed',
    badge: 'Menu Control',
    steps: [
      "'Smart Menu by Clever Ops' (/dashboard/menu) page par jayein.",
      'Dish ko search karein ya category me scroll karein.',
      "Item card par bane switch ya 'In Stock / Out of Stock' badge par click karein.",
      'Click karte hi customer ke QR menu par wo dish instant blur aur unavailable ho jayegi.'
    ],
    tip: 'Agar Inventory Recipe linked hai, to raw material khatam hote hi dish auto Out-of-Stock ho sakti hai.',
    route: '/dashboard/menu',
    actionText: 'Open Menu & Toggle Availability',
    rolesAllowed: ['owner', 'manager', 'supervisor', 'head_chef', 'chef', 'captain']
  },

  // 10. AI Menu Photo Scanner
  {
    id: 'ai-menu-scanner',
    category: 'guide',
    title: 'Physical Menu Card ki Photo se Menu Kaise Banaye (AI OCR)',
    subtitle: 'Printed menu card ki photo kheechein aur AI se poora digital menu auto-generate karein',
    keywords: [
      'ai menu', 'menu photo', 'scan menu', 'ocr', 'card photo', 'menu banana', 'camera menu',
      'smart menu scanner', 'auto menu'
    ],
    icon: 'Camera',
    badge: 'AI Tool',
    steps: [
      "'Smart Menu by CleverOps' (/dashboard/ai-menu) page par jayein.",
      "Apne restaurant ke printed menu card ki saaf photo click karke upload karein.",
      "'Analyze with AI' par click karein — AI items, rates, aur categories khud detect kar lega.",
      'Detected items ko review karein aur ek click me live menu me publish karein.'
    ],
    tip: 'Menu photo seedhi aur achhi light me kheechein taaki AI price aur items bilkul accurate padh sake.',
    route: '/dashboard/ai-menu',
    actionText: 'Open AI Menu Scanner',
    rolesAllowed: ['owner', 'manager']
  },

  // 11. Kitchen KDS System
  {
    id: 'kitchen-kds-system',
    category: 'navigation',
    title: 'Kitchen Display System (KDS) Screen',
    subtitle: 'Live kitchen orders, preparation time, item ready mark karna aur bell sounds',
    keywords: ['kds', 'kitchen screen', 'kot', 'chef screen', 'cooking order', 'kitchen display', 'rasoi screen'],
    icon: 'ChefHat',
    badge: 'Kitchen',
    steps: [
      "'Kitchen KDS' (/dashboard/kds) screen par jayein.",
      'Naye order aane par kitchen chime ring karega aur order card display hoga.',
      "Jab dish ban jaye to 'Mark Ready' par click karein taaki waiter ko notification mile."
    ],
    route: '/dashboard/kds',
    actionText: 'Open Kitchen KDS Display',
    rolesAllowed: ['owner', 'manager', 'head_chef', 'chef', 'kitchen', 'kitchen_helper']
  },

  // 12. Staff Attendance Punch In / Punch Out
  {
    id: 'staff-punch-in-out',
    category: 'action',
    title: 'Daily Attendance Punch-In / Punch-Out Kaise Kare',
    subtitle: 'Selfie attendance ya 4-digit PIN punch karke duty start ya close karein',
    keywords: [
      'punch in', 'punch out', 'attendance', 'haaziri', 'duty start', 'shift start',
      'selfie punch', 'staff haaziri', 'overtime'
    ],
    icon: 'UserCheck',
    badge: 'Attendance',
    isPopular: true,
    steps: [
      "'Attendance & Shifts' (/dashboard/attendance) par jayein ya direct '/dashboard/attendance/punch' kholein.",
      'Apna naam select karein ya camera ke samne photo click karein.',
      'Duty par aate time "Punch In" aur shift khatam hone par "Punch Out" dabayein.'
    ],
    route: '/dashboard/attendance/punch',
    actionText: 'Punch Attendance Now',
    rolesAllowed: ['owner', 'manager', 'supervisor', 'head_chef', 'chef', 'kitchen', 'kitchen_helper', 'captain', 'waiter', 'cashier', 'cleaner', 'helper', 'staff']
  },

  // 13. Thermal Printer Setup
  {
    id: 'thermal-printer-setup',
    category: 'guide',
    title: 'Thermal POS Printer Kaise Connect Kare',
    subtitle: 'Bluetooth, USB ya LAN network KOT & Bill printer connect aur test print',
    keywords: [
      'printer', 'thermal printer', 'bill printer', 'kot printer', 'bluetooth printer',
      'printer setup', 'print slip', 'paper print', 'pos printer'
    ],
    icon: 'Printer',
    badge: 'Hardware',
    steps: [
      "'Settings' page par jayein aur 'Printers & Hardware Devices' (/dashboard/settings?tab=devices) tab chunein.",
      "Bluetooth ya USB printer ON karein aur 'Pair New Printer' par click karein.",
      "Printer paper width (58mm ya 80mm) select karein.",
      "'Print Test Receipt' dabakar verify karein aur Save settings karein."
    ],
    tip: 'LAN / Network printer kitchen KDS ke liye best hota hai kyunki isme connection disconnect nahi hota.',
    route: '/dashboard/settings?tab=devices',
    actionText: 'Setup Thermal Printer',
    rolesAllowed: ['owner', 'manager']
  },

  // 14. Taxes & Charges (GST / Service Charge)
  {
    id: 'taxes-charges-settings',
    category: 'guide',
    title: 'GST, VAT ya Service Charge Kaise Set Kare',
    subtitle: 'Restaurant bill par GST % lagana, packaging charge aur delivery fees',
    keywords: [
      'gst', 'tax', 'service charge', 'vat', 'packaging charge', 'cgst', 'sgst',
      'tax settings', 'bill charge', 'extra charge'
    ],
    icon: 'Percent',
    badge: 'Billing Config',
    steps: [
      "'Settings' par jayein aur 'Taxes & Bill Charges' (/dashboard/settings?tab=charges) tab kholein.",
      'GST enabled toggle ON karein aur apne composition (5%) ya regular rate select karein.',
      'Agar delivery/takeaway par packaging charge lagana hai to flat rate set karein.',
      "'Save Settings' dabayein — sabhi bills par auto-calculate ho jayega."
    ],
    route: '/dashboard/settings?tab=charges',
    actionText: 'Configure Taxes & GST',
    rolesAllowed: ['owner', 'manager']
  },

  // 15. Low Stock Alerts & Reorder
  {
    id: 'low-stock-alerts',
    category: 'navigation',
    title: 'Low Stock Alerts (Khatam Hone Wala Maal)',
    subtitle: 'Minimum stock limit cross karne wale items ki list aur reorder planning',
    keywords: ['low stock', 'stock khatam', 'reorder', 'alert', 'minimum stock', 'maal khatam', 'purchases'],
    icon: 'AlertTriangle',
    badge: 'Stock Warning',
    steps: [
      "'Inventory & Recipes' (/dashboard/inventory) page par jayein.",
      "'Low Stock Alerts' tab select karein.",
      'Lal (Red) badge wale items check karein aur vendor ko order karein.'
    ],
    route: '/dashboard/inventory?tab=alerts',
    actionText: 'View Low Stock Alerts',
    rolesAllowed: ['owner', 'manager', 'supervisor', 'head_chef', 'chef']
  },

  // 16. Restaurant Profile & Branding
  {
    id: 'restaurant-profile-settings',
    category: 'navigation',
    title: 'Restaurant Name, Logo aur Timings Update Kare',
    subtitle: 'Customer menu banner, contact number, address aur operating hours',
    keywords: ['profile', 'logo', 'restaurant name', 'address', 'timing', 'phone', 'branding', 'banner'],
    icon: 'Store',
    badge: 'Profile',
    steps: [
      "'Settings' page par jayein aur 'Profile & Branding' tab kholein.",
      'Naya Logo upload karein, Restaurant Name aur Address verify karein.',
      "'Save Changes' par click karein."
    ],
    route: '/dashboard/settings?tab=profile',
    actionText: 'Edit Restaurant Profile',
    rolesAllowed: ['owner', 'manager']
  }
];

/**
 * Normalizes input strings for robust phonetic / Hinglish search
 */
function normalizeQuery(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Searches the knowledge catalog with role-based permission filtering and score-based ranking
 */
export function searchKnowledgeCatalog(
  rawQuery: string,
  userRole: string = 'owner',
  limit: number = 8
): { items: SearchKnowledgeItem[]; query: string } {
  const query = normalizeQuery(rawQuery);
  const normalizedRole = userRole.toLowerCase();

  // Filter items allowed for this user's role
  const roleFiltered = KNOWLEDGE_CATALOG.filter(item => {
    // Owner and manager have access to everything
    if (normalizedRole === 'owner' || normalizedRole === 'manager') return true;
    return item.rolesAllowed.includes(normalizedRole);
  });

  // If no query, return popular / trending recommendations for this role
  if (!query) {
    const popular = roleFiltered.filter(item => item.isPopular);
    return {
      items: (popular.length > 0 ? popular : roleFiltered).slice(0, limit),
      query: ''
    };
  }

  const queryTerms = query.split(' ').filter(Boolean);

  // Score each item based on term matches
  const scored = roleFiltered.map(item => {
    let score = 0;
    const titleNorm = normalizeQuery(item.title);
    const subtitleNorm = normalizeQuery(item.subtitle);
    const keywordsNorm = item.keywords.map(k => normalizeQuery(k));
    const stepsNorm = (item.steps || []).map(s => normalizeQuery(s)).join(' ');

    // 1. Exact query match in title
    if (titleNorm.includes(query)) score += 50;

    // 2. Exact match in any keyword
    if (keywordsNorm.some(k => k === query || k.includes(query))) score += 40;

    // 3. Term-by-term scoring
    for (const term of queryTerms) {
      if (titleNorm.includes(term)) score += 20;
      if (keywordsNorm.some(k => k.includes(term))) score += 15;
      if (subtitleNorm.includes(term)) score += 10;
      if (stepsNorm.includes(term)) score += 5;
    }

    // Boost popular items slightly on ties
    if (item.isPopular) score += 2;

    return { item, score };
  });

  const matched = scored
    .filter(res => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(res => res.item);

  return {
    items: matched.slice(0, limit),
    query
  };
}
