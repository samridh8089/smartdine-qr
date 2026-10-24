import { 
  QRStudioCategory, 
  QRStudioSubCategory, 
  QRStudioLayout, 
  QRAspectRatio, 
  QRDietaryBadge,
  CulturalBackground,
  QRDesignConfig,
  QRBackgroundConfig
} from './types';

export interface DishPreset {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  tag?: string;
}

export interface Master3DCutout {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  tag: string;
  category: string;
}

export const MASTER_3D_DISH_CUTOUTS: Master3DCutout[] = [
  {
    id: 'cutout_thali',
    name: 'Royal Rajasthani Thali',
    description: 'Authentic 3D floating brass thali with pure desi ghee baatis, dal & sweet churma',
    imageUrl: '/dish-presets/3d/rajasthani_thali_3d.png',
    tag: '3D Thali',
    category: 'Thali & Regional'
  },
  {
    id: 'cutout_samosa',
    name: 'Crispy Samosas & Kadak Chai',
    description: 'Golden fried Punjabi samosas with fresh mint chutney & earthen kullad tea',
    imageUrl: '/dish-presets/3d/dhaba_chai_samosa_3d.png',
    tag: '3D Snack',
    category: 'Snacks & Street Food'
  },
  {
    id: 'cutout_paneer_tikka',
    name: 'Tandoori Paneer Tikka Skewer',
    description: 'Clay-oven charred cottage cheese cubes with tandoori spices & mint dip',
    imageUrl: '/dish-presets/3d/north_indian_paneer_tikka_3d.png',
    tag: '3D Tandoor',
    category: 'North Indian & Tandoor'
  },
  {
    id: 'cutout_biryani',
    name: 'Royal Dum Biryani Clay Handi',
    description: 'Fragrant saffron basmati rice with aromatic spices & mint in traditional earthen pot',
    imageUrl: '/dish-presets/3d/north_indian_biryani_3d.png',
    tag: '3D Biryani',
    category: 'North Indian & Tandoor'
  },
  {
    id: 'cutout_dosa',
    name: 'Golden Crispy Masala Dosa',
    description: 'Curved banana leaf platter with potato-stuffed dosa, coconut & tomato chutneys',
    imageUrl: '/dish-presets/3d/south_indian_masala_dosa_3d.png',
    tag: '3D Dosa',
    category: 'South Indian'
  },
  {
    id: 'cutout_chole_bhature',
    name: 'Punjabi Chole Bhature',
    description: 'Fluffy golden bhature with rich spicy chickpeas, pickled onions & lemon wedge',
    imageUrl: '/dish-presets/3d/dhaba_chole_bhature_3d.png',
    tag: '3D Dhaba',
    category: 'Dhaba & Street Food'
  },
  {
    id: 'cutout_paratha',
    name: 'Amritsari Aloo Paratha Makhan',
    description: 'Crisp layered tawa paratha loaded with melting desi white butter and spiced curd',
    imageUrl: '/dish-presets/3d/dhaba_paratha_makhan_3d.png',
    tag: '3D Paratha',
    category: 'Dhaba & Street Food'
  },
  {
    id: 'cutout_lassi',
    name: 'Kullad Sweet Malai Lassi',
    description: 'Traditional earthen clay cup filled with thick chilled yogurt lassi topped with saffron',
    imageUrl: '/dish-presets/3d/dhaba_kullad_lassi_3d.png',
    tag: '3D Beverage',
    category: 'Dhaba & Street Food'
  },
  {
    id: 'cutout_pav_bhaji',
    name: 'Mumbai Butter Pav Bhaji',
    description: 'Rich spiced vegetable bhaji with melting butter and golden grilled pav buns',
    imageUrl: '/dish-presets/3d/dhaba_pav_bhaji_3d.png',
    tag: '3D Street',
    category: 'Dhaba & Street Food'
  },
  {
    id: 'cutout_donut_waffle',
    name: 'Belgian Waffle & Glazed Donut',
    description: 'Golden honeycomb waffle with fresh sliced strawberries, powdered sugar and glazed donuts',
    imageUrl: '/dish-presets/3d/bakery_glazed_donut_3d.png',
    tag: '3D Waffle',
    category: 'Bakery & Dessert'
  },
  {
    id: 'cutout_pancakes',
    name: 'Fluffy Blueberry Pancakes',
    description: 'Stack of warm buttermilk pancakes dripping with pure maple syrup & fresh berries',
    imageUrl: '/dish-presets/3d/bakery_pancakes_berries_3d.png',
    tag: '3D Pancakes',
    category: 'Bakery & Dessert'
  },
  {
    id: 'cutout_croissant_frappe',
    name: 'Butter Croissant & Iced Frappe',
    description: 'Golden flaky French croissant with a tall glass of whipped caramel iced coffee',
    imageUrl: '/dish-presets/3d/coffee_croissant_frappe_3d.png',
    tag: '3D Cafe',
    category: 'Cafe & Bistro'
  },
  {
    id: 'cutout_coffee',
    name: 'Artisan Latte & Cappuccino',
    description: 'Glazed ceramic cup with exquisite rosette latte art and roasted coffee beans',
    imageUrl: '/dish-presets/3d/coffee_bistro_cappuccino_3d.png',
    tag: '3D Cafe',
    category: 'Cafe & Bistro'
  },
  {
    id: 'cutout_cake',
    name: 'Belgian Chocolate Truffle Cake',
    description: 'Multi-layer dark chocolate ganache cake with mirror gloss glaze & gold flakes',
    imageUrl: '/dish-presets/3d/bakery_chocolate_cake_3d.png',
    tag: '3D Cake',
    category: 'Bakery & Dessert'
  },
  {
    id: 'cutout_burger',
    name: 'Double Smash Cheeseburger & Fries',
    description: 'Loaded toasted brioche burger with melted cheddar & seasoned golden fries',
    imageUrl: '/dish-presets/3d/fast_food_burger_3d.png',
    tag: '3D Burger',
    category: 'Burger & Fast Food'
  },
  {
    id: 'cutout_beer',
    name: 'Craft Amber IPA Pint & Pretzel',
    description: 'Tall frosted pint of golden draught beer with thick creamy foam & Bavarian pretzel',
    imageUrl: '/dish-presets/3d/brew_craft_beer_3d.png',
    tag: '3D Beer',
    category: 'Bar & Lounge'
  },
  {
    id: 'cutout_nachos',
    name: 'Loaded Cheddar Nachos Platter',
    description: 'Crispy corn tortilla chips piled high with melted cheese, salsa, guacamole & jalapenos',
    imageUrl: '/dish-presets/3d/brew_loaded_nachos_3d.png',
    tag: '3D Nachos',
    category: 'Bar & Lounge'
  },
  {
    id: 'cutout_sushi',
    name: 'Dragon Sushi Roll Slate Board',
    description: 'Artisan maki sushi rolls with wasabi, pickled ginger rosette and wooden chopsticks',
    imageUrl: '/dish-presets/3d/pan_asian_sushi_3d.png',
    tag: '3D Sushi',
    category: 'Pan-Asian'
  },
  {
    id: 'cutout_ramen',
    name: 'Pan-Asian Ramen & Dim Sum Basket',
    description: 'Steaming bamboo basket dumplings alongside rich umami broth & chopsticks',
    imageUrl: '/dish-presets/3d/pan_asian_ramen_dimsum_3d.png',
    tag: '3D Asian',
    category: 'Pan-Asian'
  },
  {
    id: 'cutout_cocktail',
    name: 'Craft Neon Botanical Cocktail',
    description: 'Luminous crystal coupe glass with artisan botanical ice sphere & citrus wheel',
    imageUrl: '/dish-presets/3d/bar_neon_cocktail_3d.png',
    tag: '3D Drink',
    category: 'Bar & Lounge'
  },
  {
    id: 'cutout_steak',
    name: 'Fine Dining Gourmet Sizzler Steak',
    description: 'Black marble platter with seared premium cut, roasted rosemary potatoes & herb reduction',
    imageUrl: '/dish-presets/3d/fine_dining_steak_3d.png',
    tag: '3D Sizzler',
    category: 'Fine Dining'
  }
];

export interface SubCategoryThemeConfig {
  id: QRStudioSubCategory;
  name: string;
  category: QRStudioCategory;
  tagline: string;
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
    qrBg: string;
    qrFg: string;
    qrFrame: string;
  };
  bgStyle: {
    type: 'gradient' | 'texture' | 'solid';
    gradientStart: string;
    gradientEnd: string;
    gradientAngle: number;
    texture: 'none' | 'marble' | 'wood' | 'dark_texture' | 'chalkboard' | 'kraft_paper' | 'emerald_pattern' | 'dots' | 'paper';
    overlayColor: string;
    overlayOpacity: number;
    description: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
  };
  dishPresets: DishPreset[];
  culturalBackgrounds: CulturalBackground[];
}

export interface CategoryGroup {
  id: QRStudioCategory;
  name: string;
  icon: string;
  description: string;
  subCategories: QRStudioSubCategory[];
}

export interface StudioLayoutConfig {
  id: QRStudioLayout;
  name: string;
  shortName: string;
  badge: string;
  description: string;
  iconName: string;
}

export interface AspectRatioOption {
  id: QRAspectRatio;
  label: string;
  sublabel: string;
  ratio: string;
  cssAspect: string;
  baseWidth: number;
  baseHeight: number;
}

export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  {
    id: '4x6',
    label: '4 × 6 Table Tent',
    sublabel: 'Classic standing acrylic holder',
    ratio: '2:3',
    cssAspect: '2 / 3',
    baseWidth: 320,
    baseHeight: 480
  },
  {
    id: 'A4',
    label: 'A4 Poster',
    sublabel: 'Standard wall or entry display',
    ratio: '1:1.41',
    cssAspect: '1 / 1.414',
    baseWidth: 320,
    baseHeight: 452
  },
  {
    id: '3x3',
    label: '3 × 3 Sticker',
    sublabel: 'Compact disc or tabletop sticker',
    ratio: '1:1',
    cssAspect: '1 / 1',
    baseWidth: 340,
    baseHeight: 340
  }
];

export const STUDIO_LAYOUTS: StudioLayoutConfig[] = [
  {
    id: 'corner_bowls',
    name: 'Multi-Dish Floating Orbit (Ref 1)',
    shortName: 'Orbit (Ref 1)',
    badge: 'Ref 1 Style',
    description: 'Arched high-contrast brand header, 3 floating plates with gold rims & starburst callout',
    iconName: 'UtensilsCrossed'
  },
  {
    id: 'minimal_lineart',
    name: 'Vintage Kraft & Cafe Sketch (Ref 2)',
    shortName: 'Kraft (Ref 2)',
    badge: 'Ref 2 Style',
    description: 'Kraft paper texture, cursive script typography, warm espresso QR & coffee sketch',
    iconName: 'Frame'
  },
  {
    id: 'split_luxury',
    name: 'Hero Photo Top Bleed (Ref 3)',
    shortName: 'Top Bleed (Ref 3)',
    badge: 'Ref 3 Style',
    description: 'Top 50% food bleed, interlocking QR badge, crisp high-contrast lower card',
    iconName: 'Sparkles'
  },
  {
    id: 'three_dish_grid',
    name: 'Dark Cinema & Gold Frame (Ref 4)',
    shortName: 'Cinema Gold (Ref 4)',
    badge: 'Ref 4 Style',
    description: 'Top & bottom food banners, jet-black focus band with giant gold MENU',
    iconName: 'Layers'
  },
  {
    id: 'table_tent_classic',
    name: '3D Table Tent Classic (Flagship)',
    shortName: '3D Table Tent',
    badge: 'Flagship 3D',
    description: 'Elevated 3D floating platter with specular gloss reflection, gold rim & vertical side accent',
    iconName: 'Smartphone'
  },
  {
    id: 'circular_mandala_portal',
    name: 'Royal Mandala Portal & Twin Floating Dishes',
    shortName: 'Mandala Portal',
    badge: 'Royal Palace',
    description: 'Sacred arched motif, circular golden mandala halo around QR, dual floating 3D dishes & royal crest',
    iconName: 'Compass'
  },
  {
    id: 'bento_modern_grid',
    name: 'Modern Bento Architectural Grid',
    shortName: 'Bento Grid',
    badge: 'Ultra Modern',
    description: 'Swiss-style modular geometric panels, divided photo cards, crisp typography & embedded minimalist QR',
    iconName: 'LayoutGrid'
  },
  {
    id: 'diagonal_duo_slash',
    name: 'Dynamic Diagonal Split & Duo Dishes',
    shortName: 'Diagonal Duo',
    badge: 'High Energy',
    description: 'Angled 45° dynamic color-blocked divider, twin floating 3D dishes on corners & glowing neon bars',
    iconName: 'Sliders'
  },
  {
    id: 'cocktail_lounge_neon',
    name: 'Neon Nightlife & Glass Portal',
    shortName: 'Neon Glass',
    badge: 'Lounge & Bar',
    description: 'Deep obsidian backdrop with glowing neon tubes, frosted glass card holder & floating glassware',
    iconName: 'Wine'
  },
  {
    id: 'arch_sanctuary_botanical',
    name: 'Botanical Arch & Garden Bistro',
    shortName: 'Garden Arch',
    badge: 'Organic Cafe',
    description: 'Romanesque curved archway framed with subtle botanical foliage accents & centered floating dish',
    iconName: 'Flower2'
  }
];

export interface SmartSuggestionCombo {
  id: string;
  title: string;
  refTag: string;
  badge: string;
  description: string;
  previewColors: {
    bg: string;
    cardBg: string;
    text: string;
    accent: string;
    badgeBg: string;
  };
  layout: QRStudioLayout;
  configUpdates: Partial<Omit<QRDesignConfig, 'background'>> & {
    background?: Partial<QRBackgroundConfig>;
  };
}

export const SMART_SUGGESTION_COMBOS: SmartSuggestionCombo[] = [
  {
    id: 'ref1_orbit',
    title: 'Multi-Dish Floating Orbit',
    refTag: 'Ref 1: Rizwan Rolls',
    badge: 'Vibrant Multi-Dish',
    description: 'Arched brand header, 3 floating orbiting dishes with gold rims & starburst callout',
    previewColors: {
      bg: '#8B261D',
      cardBg: '#FFFFFF',
      text: '#0F172A',
      accent: '#F59E0B',
      badgeBg: '#9A3412'
    },
    layout: 'corner_bowls',
    configUpdates: {
      studioLayout: 'corner_bowls',
      background: {
        type: 'gradient',
        color: '#8B261D',
        gradientStart: '#8B261D',
        gradientEnd: '#5C1610',
        gradientAngle: 135
      },
      dish3dMode: 'gold_rim',
      heroDisplayMode: 'cutout',
      canvasSpacing: 'spacious',
      funnyQuote: 'Khao piyo aish karo, scan karke order karo!',
      funnyQuoteStyle: 'speech_bubble',
      funnyQuoteBgColor: '#FEF3C7',
      funnyQuoteTextColor: '#78350F',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'SCAN & ORDER',
      ctaBadgeBgColor: '#D97706',
      ctaBadgeTextColor: '#FFFFFF',
      tagline: 'Hot & Fresh Gourmet Kitchen'
    }
  },
  {
    id: 'ref4_dark_gold',
    title: 'Dark Cinema & Gold Frame',
    refTag: 'Ref 4: Read Our Menu',
    badge: 'Luxury Cinema',
    description: 'Top & bottom food photography, jet-black focus band with giant gold READ OUR MENU',
    previewColors: {
      bg: '#0A0A0B',
      cardBg: '#000000',
      text: '#FBBF24',
      accent: '#D4AF37',
      badgeBg: '#F59E0B'
    },
    layout: 'three_dish_grid',
    configUpdates: {
      studioLayout: 'three_dish_grid',
      background: {
        type: 'gradient',
        color: '#0A0A0B',
        gradientStart: '#0A0A0B',
        gradientEnd: '#18181B',
        gradientAngle: 180
      },
      dish3dMode: 'slate_stone',
      heroDisplayMode: 'cutout',
      canvasSpacing: 'balanced',
      funnyQuote: 'Menu dekhne ke liye wait kyu? Scan kar, order kar!',
      funnyQuoteStyle: 'pill',
      funnyQuoteBgColor: '#000000',
      funnyQuoteTextColor: '#FBBF24',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'ORDER & PAY',
      ctaBadgeBgColor: '#F59E0B',
      ctaBadgeTextColor: '#000000',
      tagline: 'READ OUR MENU • Scan it, Enjoy'
    }
  },
  {
    id: 'ref3_top_bleed',
    title: 'Hero Photo Top Bleed',
    refTag: 'Ref 3: Scan Our Menu',
    badge: 'Modern Commercial',
    description: 'Top 50% food bleed, interlocking QR badge, crisp high-contrast white card',
    previewColors: {
      bg: '#FFFFFF',
      cardBg: '#FFFFFF',
      text: '#0F172A',
      accent: '#2563EB',
      badgeBg: '#0F172A'
    },
    layout: 'split_luxury',
    configUpdates: {
      studioLayout: 'split_luxury',
      background: {
        type: 'solid',
        color: '#FFFFFF',
        gradientStart: '#FFFFFF',
        gradientEnd: '#F8FAFC',
        gradientAngle: 0
      },
      dish3dMode: 'floating_plate',
      heroDisplayMode: 'cutout',
      canvasSpacing: 'spacious',
      funnyQuote: 'Bhookh lagi hai? Sharma mat, scan kar!',
      funnyQuoteStyle: 'comic_banner',
      funnyQuoteBgColor: '#FFFFFF',
      funnyQuoteTextColor: '#0F172A',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'SCAN OUR MENU',
      ctaBadgeBgColor: '#0F172A',
      ctaBadgeTextColor: '#FFFFFF',
      tagline: 'Contactless Mobile Ordering'
    }
  },
  {
    id: 'ref2_vintage_kraft',
    title: 'Vintage Kraft & Cafe Sketch',
    refTag: 'Ref 2: Menu Cafe',
    badge: 'Rustic & Artisan',
    description: 'Warm kraft paper texture, cursive script typography, warm espresso QR & coffee sketch',
    previewColors: {
      bg: '#C5A880',
      cardBg: '#FEF3C7',
      text: '#451A03',
      accent: '#78350F',
      badgeBg: '#78350F'
    },
    layout: 'minimal_lineart',
    configUpdates: {
      studioLayout: 'minimal_lineart',
      background: {
        type: 'solid',
        color: '#C5A880',
        gradientStart: '#C5A880',
        gradientEnd: '#A78B60',
        gradientAngle: 0
      },
      dish3dMode: 'ceramic_white',
      bgTextureStyle: 'kraft_paper',
      heroDisplayMode: 'cutout',
      canvasSpacing: 'balanced',
      funnyQuote: 'Coffee chahiye toh scan kar na bhiduu!',
      funnyQuoteStyle: 'speech_bubble',
      funnyQuoteBgColor: '#FEF3C7',
      funnyQuoteTextColor: '#451A03',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'SCAN FOR MENU',
      ctaBadgeBgColor: '#78350F',
      ctaBadgeTextColor: '#FEF3C7',
      tagline: 'Freshly Brewed & Baked Daily'
    }
  },
  {
    id: 'classic_3d_tent',
    title: '3D Platter Table Tent Classic',
    refTag: 'Flagship 3D',
    badge: '3D Elevated Platter',
    description: 'Elevated 3D platter with specular gloss reflection, gold rim & vertical side accent',
    previewColors: {
      bg: '#1E293B',
      cardBg: '#FFFFFF',
      text: '#FFFFFF',
      accent: '#D4AF37',
      badgeBg: '#F59E0B'
    },
    layout: 'table_tent_classic',
    configUpdates: {
      studioLayout: 'table_tent_classic',
      background: {
        type: 'gradient',
        color: '#1E293B',
        gradientStart: '#1E293B',
        gradientEnd: '#0F172A',
        gradientAngle: 180
      },
      dish3dMode: 'floating_plate',
      dish3dTilt: 6,
      heroDisplayMode: 'cutout',
      canvasSpacing: 'spacious',
      elementOrder: 'header_qr_dish',
      funnyQuote: 'Table tera, order bhi tera! Scan kar fatfat!',
      funnyQuoteStyle: 'speech_bubble',
      funnyQuoteBgColor: '#FFFFFF',
      funnyQuoteTextColor: '#0F172A',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'SCAN TO ORDER',
      ctaBadgeBgColor: '#F59E0B',
      ctaBadgeTextColor: '#000000',
      tagline: 'Chef Special • Dine-in Experience'
    }
  },
  {
    id: 'ref6_royal_mandala',
    title: 'Royal Mandala Portal & Dual Feasts',
    refTag: 'Concept 6: Royal Heritage',
    badge: 'Royal Palace',
    description: 'Sacred arched temple motif, circular golden mandala halo around QR, dual floating 3D dishes & royal crest',
    previewColors: {
      bg: '#701A1E',
      cardBg: '#FFFBEB',
      text: '#FFFBEB',
      accent: '#D4AF37',
      badgeBg: '#D4AF37'
    },
    layout: 'circular_mandala_portal',
    configUpdates: {
      studioLayout: 'circular_mandala_portal',
      background: {
        type: 'gradient',
        color: '#701A1E',
        gradientStart: '#701A1E',
        gradientEnd: '#3F0C0E',
        gradientAngle: 150
      },
      dish3dMode: 'gold_rim',
      heroDisplayMode: 'cutout',
      canvasSpacing: 'spacious',
      funnyQuote: 'Padharo Mhare Des • Scan & Feast like Royalty',
      funnyQuoteStyle: 'pill',
      funnyQuoteBgColor: '#FFFBEB',
      funnyQuoteTextColor: '#701A1E',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'ROYAL FEAST MENU',
      ctaBadgeBgColor: '#D4AF37',
      ctaBadgeTextColor: '#000000',
      tagline: 'Authentic Royal Heritage Dining'
    }
  },
  {
    id: 'ref7_modern_bento',
    title: 'Modern Bento Architectural Grid',
    refTag: 'Concept 7: Swiss Minimal',
    badge: 'Bento Grid',
    description: 'Swiss-style modular geometric panels, divided photo cards, crisp typography & embedded minimalist QR',
    previewColors: {
      bg: '#0F172A',
      cardBg: '#FFFFFF',
      text: '#0F172A',
      accent: '#10B981',
      badgeBg: '#10B981'
    },
    layout: 'bento_modern_grid',
    configUpdates: {
      studioLayout: 'bento_modern_grid',
      background: {
        type: 'solid',
        color: '#0F172A',
        gradientStart: '#0F172A',
        gradientEnd: '#1E293B',
        gradientAngle: 180
      },
      dish3dMode: 'floating_plate',
      heroDisplayMode: 'cutout',
      canvasSpacing: 'balanced',
      funnyQuote: 'Bhookh lagi hai? Sharma mat, scan kar!',
      funnyQuoteStyle: 'comic_banner',
      funnyQuoteBgColor: '#FFFFFF',
      funnyQuoteTextColor: '#0F172A',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'TOUCHLESS MENU',
      ctaBadgeBgColor: '#10B981',
      ctaBadgeTextColor: '#FFFFFF',
      tagline: 'Modern Architectural Dining'
    }
  },
  {
    id: 'ref8_dynamic_slash',
    title: 'Dynamic Diagonal Slash & Dual Feast',
    refTag: 'Concept 8: High Energy',
    badge: 'Dynamic Duo',
    description: 'Angled 45° dynamic color-blocked divider, twin floating 3D dishes on corners & glowing neon bars',
    previewColors: {
      bg: '#18181B',
      cardBg: '#F97316',
      text: '#FFFFFF',
      accent: '#FACC15',
      badgeBg: '#F97316'
    },
    layout: 'diagonal_duo_slash',
    configUpdates: {
      studioLayout: 'diagonal_duo_slash',
      background: {
        type: 'gradient',
        color: '#18181B',
        gradientStart: '#18181B',
        gradientEnd: '#27272A',
        gradientAngle: 135
      },
      dish3dMode: 'gold_rim',
      heroDisplayMode: 'cutout',
      canvasSpacing: 'spacious',
      funnyQuote: 'Pehle pet pooja, baaki sab kaam dooja!',
      funnyQuoteStyle: 'speech_bubble',
      funnyQuoteBgColor: '#FEF08A',
      funnyQuoteTextColor: '#854D0E',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'FAST ORDER QR',
      ctaBadgeBgColor: '#F97316',
      ctaBadgeTextColor: '#FFFFFF',
      tagline: 'High Speed Instant Kitchen'
    }
  },
  {
    id: 'ref9_neon_nightlife',
    title: 'Neon Nightlife & Glass Portal',
    refTag: 'Concept 9: Cyber Lounge',
    badge: 'Lounge & Bar',
    description: 'Deep obsidian backdrop with glowing neon tubes, frosted glass card holder & floating glassware',
    previewColors: {
      bg: '#030712',
      cardBg: '#111827',
      text: '#38BDF8',
      accent: '#06B6D4',
      badgeBg: '#06B6D4'
    },
    layout: 'cocktail_lounge_neon',
    configUpdates: {
      studioLayout: 'cocktail_lounge_neon',
      background: {
        type: 'gradient',
        color: '#030712',
        gradientStart: '#030712',
        gradientEnd: '#0F172A',
        gradientAngle: 180
      },
      dish3dMode: 'slate_stone',
      heroDisplayMode: 'cutout',
      canvasSpacing: 'spacious',
      funnyQuote: 'Taste aisa ki dil bole encore! Scan karo aur order karo',
      funnyQuoteStyle: 'pill',
      funnyQuoteBgColor: '#000000',
      funnyQuoteTextColor: '#38BDF8',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'SCAN & SIP',
      ctaBadgeBgColor: '#06B6D4',
      ctaBadgeTextColor: '#000000',
      tagline: 'Cocktail Lounge & Night Dining'
    }
  },
  {
    id: 'ref10_botanical_arch',
    title: 'Botanical Arch & Garden Bistro',
    refTag: 'Concept 10: Garden Bistro',
    badge: 'Organic Cafe',
    description: 'Romanesque curved archway framed with subtle botanical foliage accents & centered floating dish',
    previewColors: {
      bg: '#1C2E24',
      cardBg: '#FDFBF7',
      text: '#1C2E24',
      accent: '#C2410C',
      badgeBg: '#C2410C'
    },
    layout: 'arch_sanctuary_botanical',
    configUpdates: {
      studioLayout: 'arch_sanctuary_botanical',
      background: {
        type: 'gradient',
        color: '#1C2E24',
        gradientStart: '#1C2E24',
        gradientEnd: '#0E1712',
        gradientAngle: 160
      },
      dish3dMode: 'terracotta',
      heroDisplayMode: 'cutout',
      canvasSpacing: 'balanced',
      funnyQuote: 'Garama-garam swad, bas ek scan ki doori par!',
      funnyQuoteStyle: 'speech_bubble',
      funnyQuoteBgColor: '#FDFBF7',
      funnyQuoteTextColor: '#1C2E24',
      ctaBadgeMode: 'preset',
      ctaBadgeText: 'ARTISANAL MENU',
      ctaBadgeBgColor: '#C2410C',
      ctaBadgeTextColor: '#FFFFFF',
      tagline: 'Farm-to-Table Fresh Daily Kitchen'
    }
  }
];

export const FUNNY_SCAN_QUOTES = [
  "Coffee chahiye toh scan kar na bhiduu!",
  "Bhookh lagi hai? Sharma mat, scan kar!",
  "Menu dekhne ke liye wait kyu? Scan kar, order kar!",
  "Khaane me kya hai? Phone nikaal aur scan maar!",
  "Pehle pet pooja, baaki sab kaam dooja!",
  "Diet kal se, aaj full pet pooja!",
  "Taste aisa ki dil bole encore! Scan karo aur order karo",
  "Garama-garam swad, bas ek scan ki doori par!",
  "Wait mat kar lala, scan kar aur mangwa!",
  "Pet me chuhe kood rahe hain? Turant scan karo!",
  "Chai aur baatein, scan karte hi shuru!",
  "Table tera, order bhi tera! Scan kar fatfat!"
];

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: 'Utensils',
    description: 'Authentic cuisines, royal thalis & multi-cuisine dining',
    subCategories: [
      'rajasthani_thali',
      'north_indian_tandoor',
      'south_indian',
      'chinese_pan_asian',
      'fine_dining_multi'
    ]
  },
  {
    id: 'cafe_bakery',
    name: 'Cafe & Bakery',
    icon: 'Coffee',
    description: 'Artisan coffee, cakes, bistro bites & healthy bowls',
    subCategories: [
      'bakery_cakes',
      'coffee_bistro',
      'pizza_burger_fastfood',
      'healthy_salad'
    ]
  },
  {
    id: 'bar_pub',
    name: 'Bar, Pub & Lounge',
    icon: 'Wine',
    description: 'Cocktails, nightlife lounges, breweries & taprooms',
    subCategories: [
      'cocktail_nightlife',
      'craft_beer_brewery'
    ]
  },
  {
    id: 'dhaba_street',
    name: 'Dhaba & Street Food',
    icon: 'Flame',
    description: 'Desi highway dhabas, chai tapris & street delicacies',
    subCategories: [
      'highway_dhaba_tapri'
    ]
  }
];

export const QR_THEMES_CONFIG: Record<QRStudioSubCategory, SubCategoryThemeConfig> = {
  // ================= 1. RAJASTHANI & THALI =================
  rajasthani_thali: {
    id: 'rajasthani_thali',
    name: 'Rajasthani & Thali',
    category: 'restaurant',
    tagline: 'Padharo Mhare Des • Royal Heritage Dining',
    colors: {
      primary: '#8B261D', // Royal Maroon
      secondary: '#F4A261', // Gold / Saffron
      text: '#FFF8F0', // Warm Cream
      accent: '#D4AF37', // Metallic Gold
      qrBg: '#FFFFFF',
      qrFg: '#8B261D',
      qrFrame: '#D4AF37'
    },
    bgStyle: {
      type: 'gradient',
      gradientStart: '#8B261D',
      gradientEnd: '#4A110D',
      gradientAngle: 145,
      texture: 'marble',
      overlayColor: '#000000',
      overlayOpacity: 35,
      description: 'Terracotta & Royal Maroon gradient with ethnic royal mandala borders'
    },
    typography: {
      fontFamily: 'Playfair Display, Georgia, serif',
      headingFont: 'Cinzel, Georgia, serif'
    },
    dishPresets: [
      {
        id: 'raj_thali_3d',
        name: '3D Royal Rajasthani Thali',
        description: 'Authentic 3D floating brass thali with pure desi ghee baatis, dal & sweet churma',
        imageUrl: '/dish-presets/3d/rajasthani_thali_3d.png',
        tag: '3D Thali'
      },
      {
        id: 'raj_chole_bhature_3d',
        name: '3D Punjabi Chole Bhature',
        description: 'Golden puffed bhature with rich spicy chickpeas & pickled salad',
        imageUrl: '/dish-presets/3d/dhaba_chole_bhature_3d.png',
        tag: '3D Feast'
      },
      {
        id: 'raj_paratha_3d',
        name: '3D Desi Makhan Aloo Paratha',
        description: 'Golden roasted paratha with melting white butter & earthen bowl curd',
        imageUrl: '/dish-presets/3d/dhaba_paratha_makhan_3d.png',
        tag: '3D Paratha'
      },
      {
        id: 'raj_paneer_tikka_3d',
        name: '3D Sizzling Paneer Tikka',
        description: 'Clay-oven charred cottage cheese cubes with tandoori spices & mint dip',
        imageUrl: '/dish-presets/3d/north_indian_paneer_tikka_3d.png',
        tag: '3D Tandoor'
      },
      {
        id: 'raj_samosa_3d',
        name: '3D Crispy Samosas & Kadak Chai',
        description: 'Golden fried Punjabi samosas with fresh mint chutney & earthen kullad tea',
        imageUrl: '/dish-presets/3d/dhaba_chai_samosa_3d.png',
        tag: '3D Snack'
      },
      {
        id: 'raj_lassi_3d',
        name: '3D Mitti Kullad Sweet Lassi',
        description: 'Traditional earthen pot filled with creamy sweet lassi topped with saffron',
        imageUrl: '/dish-presets/3d/dhaba_kullad_lassi_3d.png',
        tag: '3D Beverage'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'raj_bg_palace_night',
        name: 'Royal Palace Twilight & Diyas',
        description: 'Atmospheric haveli courtyard with glowing brass oil lamps at dusk',
        imageUrl: '/backgrounds/rajasthani/rajasthani_palace_night.jpg',
        overlayOpacity: 45
      },
      {
        id: 'raj_bg_dunes',
        name: 'Jaisalmer Golden Dunes',
        description: 'Warm golden sand ripples under Thar desert sunset',
        imageUrl: '/backgrounds/rajasthani/jaisalmer_golden_dunes.jpg',
        overlayOpacity: 45
      },
      {
        id: 'raj_bg_mehrangarh',
        name: 'Mehrangarh Fort Golden Sunset',
        description: 'Majestic Jodhpur stone fortress glowing under amber twilight sky',
        imageUrl: '/backgrounds/rajasthani/mehrangarh_fort_sunset.jpg',
        overlayOpacity: 48
      },
      {
        id: 'raj_bg_pushkar',
        name: 'Pushkar Sacred Ghats & Lamps',
        description: 'Sacred heritage temple water reflection with evening brass aarti bells',
        imageUrl: '/backgrounds/rajasthani/pushkar_ghats_evening.jpg',
        overlayOpacity: 45
      },
      {
        id: 'raj_bg_palace',
        name: 'Royal Palace Architecture',
        description: 'Ornate heritage jaali arches and royal Rajput stone carving',
        imageUrl: '/backgrounds/rajasthani/haveli_jaali_patwon.jpg',
        overlayOpacity: 50
      },
      {
        id: 'raj_bg_camels',
        name: 'Desert Camels at Dusk',
        description: 'Camel caravan silhouette across golden desert horizon',
        imageUrl: '/backgrounds/rajasthani/desert_camels_dunes.jpg',
        overlayOpacity: 45
      }
    ],
  },

  // ================= 2. NORTH INDIAN & TANDOOR =================
  north_indian_tandoor: {
    id: 'north_indian_tandoor',
    name: 'North Indian & Tandoor',
    category: 'restaurant',
    tagline: 'Smoky Charcoal Flavors & Rich Mughlai Curries',
    colors: {
      primary: '#1E1E24', // Dark Slate
      secondary: '#F77F00', // Tandoori Orange
      text: '#FFFFFF',
      accent: '#FCBF49', // Ember Gold
      qrBg: '#FFFFFF',
      qrFg: '#1E1E24',
      qrFrame: '#F77F00'
    },
    bgStyle: {
      type: 'texture',
      gradientStart: '#1E1E24',
      gradientEnd: '#0D0D11',
      gradientAngle: 160,
      texture: 'dark_texture',
      overlayColor: '#000000',
      overlayOpacity: 45,
      description: 'Dark charcoal wood & rustic slate texture with glowing tandoori embers'
    },
    typography: {
      fontFamily: 'Montserrat, sans-serif',
      headingFont: 'Montserrat, sans-serif'
    },
    dishPresets: [
      {
        id: 'ni_paneer_tikka_3d',
        name: '3D Sizzling Paneer Tikka',
        description: 'Clay-oven charred cottage cheese cubes with tandoori spices & mint dip',
        imageUrl: '/dish-presets/3d/north_indian_paneer_tikka_3d.png',
        tag: '3D Tandoor'
      },
      {
        id: 'ni_biryani_3d',
        name: '3D Royal Dum Biryani Clay Handi',
        description: 'Fragrant saffron basmati rice with aromatic spices & mint in traditional earthen pot',
        imageUrl: '/dish-presets/3d/north_indian_biryani_3d.png',
        tag: '3D Handi'
      },
      {
        id: 'ni_chole_bhature_3d',
        name: '3D Punjabi Chole Bhature',
        description: 'Fluffy golden bhature with rich spicy chickpeas & pickled onions',
        imageUrl: '/dish-presets/3d/dhaba_chole_bhature_3d.png',
        tag: '3D Punjabi'
      },
      {
        id: 'ni_paratha_3d',
        name: '3D Amritsari Kulcha Paratha',
        description: 'Crisp layered tawa paratha loaded with melting desi white butter',
        imageUrl: '/dish-presets/3d/dhaba_paratha_makhan_3d.png',
        tag: '3D Makhan'
      },
      {
        id: 'ni_samosa_3d',
        name: '3D Crispy Samosas & Kadak Chai',
        description: 'Golden fried Punjabi samosas with fresh mint chutney & earthen kullad tea',
        imageUrl: '/dish-presets/3d/dhaba_chai_samosa_3d.png',
        tag: '3D Snack'
      },
      {
        id: 'ni_lassi_3d',
        name: '3D Kullad Malai Lassi',
        description: 'Traditional earthen clay cup filled with thick chilled yogurt lassi',
        imageUrl: '/dish-presets/3d/dhaba_kullad_lassi_3d.png',
        tag: '3D Lassi'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'ni_bg_haveli',
        name: 'Amritsar Grand Heritage Haveli',
        description: 'Historic Punjabi brick architecture with warm hanging lanterns',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 48
      },
      {
        id: 'ni_bg_tandoor',
        name: 'Clay Tandoor Embers',
        description: 'Rustic charcoal clay tandoor with glowing golden coals',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      },
      {
        id: 'ni_bg_wheat',
        name: 'Punjab Golden Wheat Fields',
        description: 'Vibrant golden harvest fields during warm countryside sunset',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'ni_bg_mughal',
        name: 'Mughal Heritage Stone Arches',
        description: 'Classic red sandstone monument arches and antique lanterns',
        imageUrl: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      },
      {
        id: 'ni_bg_spices',
        name: 'Old Delhi Spice Bazaar',
        description: 'Aromatic mounds of saffron, whole cardamom and garam masala',
        imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 48
      }
    ],
  },

  // ================= 3. SOUTH INDIAN =================
  south_indian: {
    id: 'south_indian',
    name: 'South Indian',
    category: 'restaurant',
    tagline: 'Crispy Dosas, Steaming Idlis & Brass Filter Kaapi',
    colors: {
      primary: '#2D6A4F', // Banana Leaf Green
      secondary: '#FFC300', // Sun Gold
      text: '#FFFFFF',
      accent: '#52B788', // Light Leaf
      qrBg: '#FFFFFF',
      qrFg: '#1B4332',
      qrFrame: '#2D6A4F'
    },
    bgStyle: {
      type: 'gradient',
      gradientStart: '#2D6A4F',
      gradientEnd: '#081C15',
      gradientAngle: 150,
      texture: 'emerald_pattern',
      overlayColor: '#000000',
      overlayOpacity: 30,
      description: 'Fresh banana leaf motif with warm temple-brass arches'
    },
    typography: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      headingFont: 'Outfit, sans-serif'
    },
    dishPresets: [
      {
        id: 'si_dosa_3d',
        name: '3D Golden Crispy Masala Dosa',
        description: 'Curved banana leaf platter with potato-stuffed dosa, coconut & tomato chutneys',
        imageUrl: '/dish-presets/3d/south_indian_masala_dosa_3d.png',
        tag: '3D Dosa'
      },
      {
        id: 'si_filter_coffee_3d',
        name: '3D South Indian Filter Coffee',
        description: 'Frothy aromatic brew in authentic cup with roasted beans',
        imageUrl: '/dish-presets/3d/coffee_bistro_cappuccino_3d.png',
        tag: '3D Coffee'
      },
      {
        id: 'si_thali_3d',
        name: '3D Traditional South Indian Thali',
        description: 'Banana leaf heritage brass platter with sambar, rasam, kootu & appalam',
        imageUrl: '/dish-presets/3d/rajasthani_thali_3d.png',
        tag: '3D Thali'
      },
      {
        id: 'si_vada_samosa_3d',
        name: '3D Crispy Medu Vada & Chutney',
        description: 'Golden crisp lentil fritters with spicy coconut dip & hot tea',
        imageUrl: '/dish-presets/3d/dhaba_chai_samosa_3d.png',
        tag: '3D Snack'
      },
      {
        id: 'si_biryani_3d',
        name: '3D Hyderabadi Dum Biryani',
        description: 'Slow-cooked aromatic basmati rice layered with fragrant spices in clay handi',
        imageUrl: '/dish-presets/3d/north_indian_biryani_3d.png',
        tag: '3D Biryani'
      },
      {
        id: 'si_lassi_3d',
        name: '3D Chilled Spiced Buttermilk',
        description: 'Refreshing churned curd beverage with roasted cumin and fresh coriander',
        imageUrl: '/dish-presets/3d/dhaba_kullad_lassi_3d.png',
        tag: '3D Drink'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'si_bg_courtyard',
        name: 'Chettinad Heritage Courtyard',
        description: 'Classical south Indian teakwood pillars and antique stone verandah',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'si_bg_backwaters',
        name: 'Kerala Palms & Backwaters',
        description: 'Serene emerald canals, traditional houseboats and tropical palms',
        imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 40
      },
      {
        id: 'si_bg_diya',
        name: 'Brass Temple Diya & Jasmine',
        description: 'Sacred glowing brass oil lamps with fragrant jasmine garlands',
        imageUrl: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      },
      {
        id: 'si_bg_plantation',
        name: 'Lush Banana Leaf Plantation',
        description: 'Morning dew across vibrant green banana trees and spice estate',
        imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 42
      }
    ],
  },

  // ================= 4. CHINESE & PAN-ASIAN =================
  chinese_pan_asian: {
    id: 'chinese_pan_asian',
    name: 'Chinese & Pan-Asian',
    category: 'restaurant',
    tagline: 'Wok-Tossed Flavors, Dimsums & Street Bowls',
    colors: {
      primary: '#B91C1C', // Oriental Red
      secondary: '#FFB703', // Wok Gold
      text: '#FFFFFF',
      accent: '#F97316', // Ember Red-Orange
      qrBg: '#FFFFFF',
      qrFg: '#B91C1C',
      qrFrame: '#FFB703'
    },
    bgStyle: {
      type: 'gradient',
      gradientStart: '#B91C1C',
      gradientEnd: '#450A0A',
      gradientAngle: 135,
      texture: 'dark_texture',
      overlayColor: '#000000',
      overlayOpacity: 40,
      description: 'Red & Yellow wave/wok theme with floating chili & basil leaf accents'
    },
    typography: {
      fontFamily: 'Outfit, sans-serif',
      headingFont: 'Montserrat, sans-serif'
    },
    dishPresets: [
      {
        id: 'pa_dimsum_3d',
        name: '3D Steaming Dim Sum Dumpling Basket',
        description: 'Steaming bamboo basket dumplings alongside rich umami broth & chopsticks',
        imageUrl: '/dish-presets/3d/pan_asian_ramen_dimsum_3d.png',
        tag: '3D Dim Sum'
      },
      {
        id: 'pa_sushi_3d',
        name: '3D Dragon Sushi Maki Platter',
        description: 'Artisan maki sushi rolls with wasabi, pickled ginger rosette and wooden chopsticks',
        imageUrl: '/dish-presets/3d/pan_asian_sushi_3d.png',
        tag: '3D Sushi'
      },
      {
        id: 'pa_cocktail_3d',
        name: '3D Tokyo Craft Botanical Cocktail',
        description: 'Luminous crystal coupe glass with artisan botanical ice sphere & citrus wheel',
        imageUrl: '/dish-presets/3d/bar_neon_cocktail_3d.png',
        tag: '3D Drink'
      },
      {
        id: 'pa_steak_sizzler_3d',
        name: '3D Teriyaki Sizzler Platter',
        description: 'Sizzling hot plate with glazed reduction, fresh vegetables & sesame garnish',
        imageUrl: '/dish-presets/3d/fine_dining_steak_3d.png',
        tag: '3D Sizzler'
      },
      {
        id: 'pa_pav_bhaji_3d',
        name: '3D Asian Fusion Steamed Bao Platter',
        description: 'Warm soft fluffy buns with savory glazed fillings and spicy dipping sauce',
        imageUrl: '/dish-presets/3d/dhaba_pav_bhaji_3d.png',
        tag: '3D Street'
      },
      {
        id: 'pa_donut_3d',
        name: '3D Sweet Sesame Honey Pastry',
        description: 'Crisp golden glazed dessert treats with light powdered sugar dusting',
        imageUrl: '/dish-presets/3d/bakery_glazed_donut_3d.png',
        tag: '3D Dessert'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'asia_bg_lanterns',
        name: 'Red Silk Festival Lanterns',
        description: 'Warm glowing oriental lanterns strung along nocturnal courtyard',
        imageUrl: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'asia_bg_bamboo',
        name: 'Kyoto Zen Bamboo Forest',
        description: 'Towering emerald green bamboo stalks with soft filtered sunlight',
        imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 40
      },
      {
        id: 'asia_bg_pagoda',
        name: 'Cherry Blossom Pagoda Pavilion',
        description: 'Traditional curved wooden eaves adorned with blooming sakura',
        imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'asia_bg_neon',
        name: 'Tokyo Asian Street Alley',
        description: 'Vibrant neon kanji signage and evening street-bistro atmosphere',
        imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      }
    ],
  },

  // ================= 5. FINE DINING & MULTI-CUISINE =================
  fine_dining_multi: {
    id: 'fine_dining_multi',
    name: 'Fine Dining & Multi-Cuisine',
    category: 'restaurant',
    tagline: 'Artisanal Gastronomy & High-End Culinary Art',
    colors: {
      primary: '#121212', // Luxury Black
      secondary: '#D4AF37', // Metallic Gold
      text: '#F8F9FA', // Off-White
      accent: '#C5A880', // Champagne Gold
      qrBg: '#FFFFFF',
      qrFg: '#121212',
      qrFrame: '#D4AF37'
    },
    bgStyle: {
      type: 'texture',
      gradientStart: '#18181B',
      gradientEnd: '#09090B',
      gradientAngle: 180,
      texture: 'marble',
      overlayColor: '#000000',
      overlayOpacity: 50,
      description: 'White & Black Italian marble texture with metallic gold dividers'
    },
    typography: {
      fontFamily: 'Playfair Display, Georgia, serif',
      headingFont: 'Playfair Display, Georgia, serif'
    },
    dishPresets: [
      {
        id: 'fd_steak_3d',
        name: '3D Gourmet Sizzler Steak Platter',
        description: 'Black marble platter with seared premium cut, roasted rosemary potatoes & herb reduction',
        imageUrl: '/dish-presets/3d/fine_dining_steak_3d.png',
        tag: '3D Sizzler'
      },
      {
        id: 'fd_sushi_3d',
        name: '3D Artisan Salmon Sushi Platter',
        description: 'Artisan maki sushi rolls with wasabi, pickled ginger rosette and wooden chopsticks',
        imageUrl: '/dish-presets/3d/pan_asian_sushi_3d.png',
        tag: '3D Sushi'
      },
      {
        id: 'fd_cake_3d',
        name: '3D Belgian Truffle Cake Slice',
        description: 'Multi-layer dark chocolate ganache cake with mirror gloss glaze & gold flakes',
        imageUrl: '/dish-presets/3d/bakery_chocolate_cake_3d.png',
        tag: '3D Dessert'
      },
      {
        id: 'fd_cocktail_3d',
        name: '3D Crystal Coupé Cocktail',
        description: 'Luminous crystal coupe glass with artisan botanical ice sphere & citrus wheel',
        imageUrl: '/dish-presets/3d/bar_neon_cocktail_3d.png',
        tag: '3D Cocktail'
      },
      {
        id: 'fd_beer_3d',
        name: '3D Craft Draught Beer Glass',
        description: 'Tall chilled pint of golden frothy draft beer with Bavarian pretzel',
        imageUrl: '/dish-presets/3d/brew_craft_beer_3d.png',
        tag: '3D Craft Beer'
      },
      {
        id: 'fd_coffee_3d',
        name: '3D Single-Origin Espresso Cafe',
        description: 'Glazed ceramic cup with exquisite rosette latte art and roasted coffee beans',
        imageUrl: '/dish-presets/3d/coffee_bistro_cappuccino_3d.png',
        tag: '3D Cafe'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'fine_bg_chandelier',
        name: 'Grand Crystal Chandelier',
        description: 'Sparkling golden crystal chandelier over dark luxury dining salon',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'fine_bg_marble',
        name: 'Italian Nero Marquina Marble',
        description: 'Deep black polished marble with delicate gold and white veining',
        imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 40
      },
      {
        id: 'fine_bg_cellar',
        name: 'French Wine Cellar & Casks',
        description: 'Ambient vaulted cobblestone cellar with vintage reserve casks',
        imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      },
      {
        id: 'fine_bg_candlelight',
        name: 'Romantic Candlelit Table Setting',
        description: 'Fine crystal goblets and polished silver under soft candle glow',
        imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      }
    ],
  },

  // ================= 6. BAKERY & CAKES =================
  bakery_cakes: {
    id: 'bakery_cakes',
    name: 'Bakery & Cakes',
    category: 'cafe_bakery',
    tagline: 'Freshly Baked Treats, Confections & Pastries',
    colors: {
      primary: '#FFF0F3', // Pastel Pink / Cream
      secondary: '#5E548E', // Berry Purple
      text: '#4A2545', // Deep Wine Text
      accent: '#FFB4A2', // Soft Peach
      qrBg: '#FFFFFF',
      qrFg: '#5E548E',
      qrFrame: '#FFB4A2'
    },
    bgStyle: {
      type: 'gradient',
      gradientStart: '#FFF0F3',
      gradientEnd: '#FDE2E4',
      gradientAngle: 135,
      texture: 'paper',
      overlayColor: '#FFFFFF',
      overlayOpacity: 10,
      description: 'Soft cream & pastel pink bakery aesthetic with delicate sprinkles'
    },
    typography: {
      fontFamily: 'Poppins, sans-serif',
      headingFont: 'Playfair Display, Georgia, serif'
    },
    dishPresets: [
      {
        id: 'bk_cake_3d',
        name: '3D Belgian Chocolate Truffle Cake',
        description: 'Multi-layer dark chocolate ganache cake with mirror gloss glaze & gold flakes',
        imageUrl: '/dish-presets/3d/bakery_chocolate_cake_3d.png',
        tag: '3D Cake'
      },
      {
        id: 'bk_donut_waffle_3d',
        name: '3D Belgian Waffle & Glazed Donut',
        description: 'Golden honeycomb waffle with fresh sliced strawberries, powdered sugar and glazed donuts',
        imageUrl: '/dish-presets/3d/bakery_glazed_donut_3d.png',
        tag: '3D Waffle'
      },
      {
        id: 'bk_pancakes_3d',
        name: '3D Fluffy Blueberry Pancakes',
        description: 'Stack of warm buttermilk pancakes dripping with pure maple syrup & fresh berries',
        imageUrl: '/dish-presets/3d/bakery_pancakes_berries_3d.png',
        tag: '3D Pancakes'
      },
      {
        id: 'bk_croissant_frappe_3d',
        name: '3D Butter Croissant & Iced Frappe',
        description: 'Golden flaky French croissant with a tall glass of whipped caramel iced coffee',
        imageUrl: '/dish-presets/3d/coffee_croissant_frappe_3d.png',
        tag: '3D Pastry'
      },
      {
        id: 'bk_coffee_3d',
        name: '3D Artisan Latte Art Cup',
        description: 'Glazed ceramic cup with exquisite rosette latte art and roasted coffee beans',
        imageUrl: '/dish-presets/3d/coffee_bistro_cappuccino_3d.png',
        tag: '3D Coffee'
      },
      {
        id: 'bk_burger_3d',
        name: '3D Brioche French Toast Slider',
        description: 'Loaded toasted sweet brioche with caramelized crust & golden fries',
        imageUrl: '/dish-presets/3d/fast_food_burger_3d.png',
        tag: '3D Brioche'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'bake_bg_paris',
        name: 'Parisian Patisserie Counter',
        description: 'Charming French street bakery display with golden crusts & tarts',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 42
      },
      {
        id: 'bake_bg_flour',
        name: 'Artisan Wood & Flour Table',
        description: 'Rustic wooden prep table dusted with organic baker wheat flour',
        imageUrl: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'bake_bg_macarons',
        name: 'Pastel Cafe & Confectionery',
        description: 'Delicate pastel sweets, floral accents and afternoon tea ambiance',
        imageUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 40
      },
      {
        id: 'bake_bg_waffles',
        name: 'Cozy Morning Breakfast Table',
        description: 'Sunlit breakfast table with fresh bakery pastries and berries',
        imageUrl: 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      }
    ],
  },

  // ================= 7. COFFEE & BISTRO =================
  coffee_bistro: {
    id: 'coffee_bistro',
    name: 'Coffee & Bistro',
    category: 'cafe_bakery',
    tagline: 'Artisan Roasts, Espresso & Cozy Conversations',
    colors: {
      primary: '#6F4E37', // Espresso Brown
      secondary: '#ECB176', // Latte Cream
      text: '#FFFFFF',
      accent: '#DDB892', // Warm Tan
      qrBg: '#FFFFFF',
      qrFg: '#3E2723',
      qrFrame: '#ECB176'
    },
    bgStyle: {
      type: 'texture',
      gradientStart: '#4A2E18',
      gradientEnd: '#2B1708',
      gradientAngle: 160,
      texture: 'kraft_paper',
      overlayColor: '#000000',
      overlayOpacity: 45,
      description: 'Kraft paper & roasted coffee bean warm rustic texture'
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Outfit, sans-serif'
    },
    dishPresets: [
      {
        id: 'cf_cappuccino_3d',
        name: '3D Artisan Latte & Cappuccino',
        description: 'Glazed ceramic cup with exquisite rosette latte art and roasted coffee beans',
        imageUrl: '/dish-presets/3d/coffee_bistro_cappuccino_3d.png',
        tag: '3D Espresso'
      },
      {
        id: 'cf_croissant_frappe_3d',
        name: '3D Golden Croissant & Iced Frappe',
        description: 'Golden flaky French croissant with a tall glass of whipped caramel iced coffee',
        imageUrl: '/dish-presets/3d/coffee_croissant_frappe_3d.png',
        tag: '3D Bistro'
      },
      {
        id: 'cf_donut_waffle_3d',
        name: '3D Belgian Waffle & Glazed Donut',
        description: 'Golden honeycomb waffle with fresh sliced strawberries & powdered sugar',
        imageUrl: '/dish-presets/3d/bakery_glazed_donut_3d.png',
        tag: '3D Waffle'
      },
      {
        id: 'cf_pancakes_3d',
        name: '3D Blueberry Maple Pancakes',
        description: 'Stack of warm buttermilk pancakes dripping with pure maple syrup & fresh berries',
        imageUrl: '/dish-presets/3d/bakery_pancakes_berries_3d.png',
        tag: '3D Brunch'
      },
      {
        id: 'cf_cake_3d',
        name: '3D Chocolate Espresso Fudge Cake',
        description: 'Multi-layer dark chocolate ganache cake with mirror gloss glaze',
        imageUrl: '/dish-presets/3d/bakery_chocolate_cake_3d.png',
        tag: '3D Dessert'
      },
      {
        id: 'cf_burger_3d',
        name: '3D Gourmet Bistro Brioche Burger',
        description: 'Loaded toasted brioche burger with melted cheddar & seasoned golden fries',
        imageUrl: '/dish-presets/3d/fast_food_burger_3d.png',
        tag: '3D Burger'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'cafe_bg_roastery',
        name: 'Artisan Espresso Roastery',
        description: 'Burlap bean sacks and warm roasted Arabica beans in rustic roaster',
        imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'cafe_bg_brick',
        name: 'Warm Brick Wall & Fairy Lights',
        description: 'Urban industrial hipster cafe corner with exposed brick & Edison bulbs',
        imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 48
      },
      {
        id: 'cafe_bg_barista',
        name: 'Copper Barista Espresso Bar',
        description: 'Polished Italian espresso machine and steam in sunny morning cafe',
        imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 42
      },
      {
        id: 'cafe_bg_leather',
        name: 'Vintage Wood & Leather Bistro',
        description: 'Classic European reading lounge with dark wood study tables',
        imageUrl: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      }
    ],
  },

  // ================= 8. PIZZA, BURGERS & FAST FOOD =================
  pizza_burger_fastfood: {
    id: 'pizza_burger_fastfood',
    name: 'Pizza, Burgers & Fast Food',
    category: 'cafe_bakery',
    tagline: 'Loaded Cheesy Pizzas, Sizzling Burgers & Shakes',
    colors: {
      primary: '#B5651D', // Rustic Brick / Cheddar
      secondary: '#F4A261', // Warm Amber
      text: '#FFFFFF',
      accent: '#E63946', // Vibrant Ketchup Red
      qrBg: '#FFFFFF',
      qrFg: '#1F2937',
      qrFrame: '#F4A261'
    },
    bgStyle: {
      type: 'gradient',
      gradientStart: '#991B1B',
      gradientEnd: '#1F130B',
      gradientAngle: 140,
      texture: 'dark_texture',
      overlayColor: '#000000',
      overlayOpacity: 40,
      description: 'Rustic café table with energetic street-bistro vibes'
    },
    typography: {
      fontFamily: 'Montserrat, sans-serif',
      headingFont: 'Montserrat, sans-serif'
    },
    dishPresets: [
      {
        id: 'ff_burger_3d',
        name: '3D Double Smash Cheeseburger & Fries',
        description: 'Loaded toasted brioche burger with melted cheddar & seasoned golden fries',
        imageUrl: '/dish-presets/3d/fast_food_burger_3d.png',
        tag: '3D Burger'
      },
      {
        id: 'ff_nachos_3d',
        name: '3D Loaded Cheddar Nachos Platter',
        description: 'Crispy corn tortilla chips piled high with melted cheese, salsa & jalapenos',
        imageUrl: '/dish-presets/3d/brew_loaded_nachos_3d.png',
        tag: '3D Nachos'
      },
      {
        id: 'ff_pav_bhaji_3d',
        name: '3D Buttery Mumbai Street Sliders',
        description: 'Rich spiced vegetable bhaji with melting butter and golden grilled pav buns',
        imageUrl: '/dish-presets/3d/dhaba_pav_bhaji_3d.png',
        tag: '3D Sliders'
      },
      {
        id: 'ff_donut_waffle_3d',
        name: '3D Glazed Donut & Belgian Waffle',
        description: 'Golden honeycomb waffle with fresh sliced strawberries and glazed donuts',
        imageUrl: '/dish-presets/3d/bakery_glazed_donut_3d.png',
        tag: '3D Treats'
      },
      {
        id: 'ff_frappe_3d',
        name: '3D Iced Caramel Frappe & Shake',
        description: 'Tall glass of chilled whipped caramel frappe with buttery croissant snack',
        imageUrl: '/dish-presets/3d/coffee_croissant_frappe_3d.png',
        tag: '3D Shake'
      },
      {
        id: 'ff_beer_3d',
        name: '3D Chilled Draft Beverage Pint',
        description: 'Tall frosted glass of bubbly golden beverage with Bavarian pretzel snack',
        imageUrl: '/dish-presets/3d/brew_craft_beer_3d.png',
        tag: '3D Drink'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'fast_bg_woodfire',
        name: 'Woodfire Brick Pizza Oven',
        description: 'Roaring natural wood fire inside authentic rustic stone hearth',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 48
      },
      {
        id: 'fast_bg_diner',
        name: 'Vintage American Neon Diner',
        description: 'Classic chrome bar stools and glowing retro neon sign diner',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      },
      {
        id: 'fast_bg_chalkboard',
        name: 'Rustic Bistro Tabletop',
        description: 'Warm weathered wood with chalkboard menu art and spice grinders',
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'fast_bg_grill',
        name: 'Sizzling Charcoal Burger Grill',
        description: 'Smoky open grill atmosphere with searing flame-kissed flavors',
        imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 46
      }
    ],
  },

  // ================= 9. HEALTHY & SALAD BAR =================
  healthy_salad: {
    id: 'healthy_salad',
    name: 'Healthy & Salad Bar',
    category: 'cafe_bakery',
    tagline: 'Clean Greens, Macro Bowls & Cold-Pressed Elixirs',
    colors: {
      primary: '#E9F5DB', // Sage Green
      secondary: '#2D6A4F', // Forest Green
      text: '#1B4332', // Deep Organic Green
      accent: '#74C69D', // Fresh Sprout Green
      qrBg: '#FFFFFF',
      qrFg: '#1B4332',
      qrFrame: '#2D6A4F'
    },
    bgStyle: {
      type: 'gradient',
      gradientStart: '#E9F5DB',
      gradientEnd: '#CFE1B9',
      gradientAngle: 155,
      texture: 'paper',
      overlayColor: '#FFFFFF',
      overlayOpacity: 10,
      description: 'Organic clean white & botanical green leaves'
    },
    typography: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      headingFont: 'Plus Jakarta Sans, sans-serif'
    },
    dishPresets: [
      {
        id: 'hs_pancakes_3d',
        name: '3D Berry & Antioxidant Oat Pancakes',
        description: 'Nutritious stack of warm oat pancakes loaded with blueberries and wild berries',
        imageUrl: '/dish-presets/3d/bakery_pancakes_berries_3d.png',
        tag: '3D Superfood'
      },
      {
        id: 'hs_sushi_3d',
        name: '3D Fresh Avocado & Cucumber Maki Rolls',
        description: 'Plant-forward artisan sushi rolls with wasabi, pickled ginger and fresh greens',
        imageUrl: '/dish-presets/3d/pan_asian_sushi_3d.png',
        tag: '3D Green'
      },
      {
        id: 'hs_lassi_3d',
        name: '3D Probiotic Farm Fresh Yogurt Lassi',
        description: 'Traditional earthen clay cup filled with thick chilled probiotic lassi',
        imageUrl: '/dish-presets/3d/dhaba_kullad_lassi_3d.png',
        tag: '3D Probiotic'
      },
      {
        id: 'hs_dosa_3d',
        name: '3D Crisp Gluten-Free Rice Dosa',
        description: 'Crispy fermented rice & lentil crepe with fresh coconut and tomato dips',
        imageUrl: '/dish-presets/3d/south_indian_masala_dosa_3d.png',
        tag: '3D Healthy'
      },
      {
        id: 'hs_frappe_3d',
        name: '3D Cold Brewed Almond Coffee',
        description: 'Chilled iced cold brew beverage with golden croissant bite',
        imageUrl: '/dish-presets/3d/coffee_croissant_frappe_3d.png',
        tag: '3D Cold Brew'
      },
      {
        id: 'hs_steak_3d',
        name: '3D Lean Protein Sizzler Platter',
        description: 'Seared lean protein platter with herb reduction and garden rosemary potatoes',
        imageUrl: '/dish-presets/3d/fine_dining_steak_3d.png',
        tag: '3D Protein'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'health_bg_greenhouse',
        name: 'Sunlit Botanical Greenhouse',
        description: 'Lush potted herbs, organic greens and bright morning conservatory',
        imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 38
      },
      {
        id: 'health_bg_crate',
        name: 'Organic Farm Fresh Harvest',
        description: 'Handmade wooden crates filled with farm-harvested crisp vegetables',
        imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 42
      },
      {
        id: 'health_bg_marble',
        name: 'Clean White Kitchen Studio',
        description: 'Minimalist white marble island with fresh culinary microgreens',
        imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 35
      },
      {
        id: 'health_bg_tropical',
        name: 'Tropical Citrus & Acai Flatlay',
        description: 'Refreshing colorful seasonal fruits and coconut palm shadows',
        imageUrl: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 40
      }
    ],
  },

  // ================= 10. COCKTAIL & NIGHTLIFE BAR =================
  cocktail_nightlife: {
    id: 'cocktail_nightlife',
    name: 'Cocktail & Nightlife Bar',
    category: 'bar_pub',
    tagline: 'High-Energy Mixology, Neon Lounges & Late Beats',
    colors: {
      primary: '#0B090A', // Pitch Black
      secondary: '#FF007F', // Neon Pink
      text: '#FFFFFF',
      accent: '#00F5D4', // Vibrant Cyan
      qrBg: '#0F172A',
      qrFg: '#00F5D4',
      qrFrame: '#FF007F'
    },
    bgStyle: {
      type: 'gradient',
      gradientStart: '#160824',
      gradientEnd: '#05020A',
      gradientAngle: 160,
      texture: 'dots',
      overlayColor: '#000000',
      overlayOpacity: 55,
      description: 'Dark moody nightclub with glowing neon frame around QR and header'
    },
    typography: {
      fontFamily: 'Outfit, sans-serif',
      headingFont: 'Montserrat, sans-serif'
    },
    dishPresets: [
      {
        id: 'bar_cocktail_3d',
        name: '3D Craft Neon Botanical Cocktail',
        description: 'Luminous crystal coupe glass with artisan botanical ice sphere & citrus wheel',
        imageUrl: '/dish-presets/3d/bar_neon_cocktail_3d.png',
        tag: '3D Signature'
      },
      {
        id: 'bar_beer_3d',
        name: '3D Amber IPA Craft Beer Pint',
        description: 'Tall chilled pint of golden frothy draft craft beer with salted pretzel',
        imageUrl: '/dish-presets/3d/brew_craft_beer_3d.png',
        tag: '3D Draught'
      },
      {
        id: 'bar_nachos_3d',
        name: '3D Loaded Cheddar Nachos Platter',
        description: 'Crispy corn tortilla chips piled high with melted cheese, salsa, guacamole & jalapenos',
        imageUrl: '/dish-presets/3d/brew_loaded_nachos_3d.png',
        tag: '3D Bar Bites'
      },
      {
        id: 'bar_sushi_3d',
        name: '3D Dragon Maki Roll Lounge Platter',
        description: 'Artisan maki sushi rolls on sleek black slate board with wasabi and ginger',
        imageUrl: '/dish-presets/3d/pan_asian_sushi_3d.png',
        tag: '3D Lounge'
      },
      {
        id: 'bar_burger_3d',
        name: '3D Late-Night Smash Cheeseburger',
        description: 'Loaded toasted brioche burger with melted cheddar & seasoned golden fries',
        imageUrl: '/dish-presets/3d/fast_food_burger_3d.png',
        tag: '3D Pub Grub'
      },
      {
        id: 'bar_cake_3d',
        name: '3D Liqueur Chocolate Truffle Cake',
        description: 'Multi-layer dark chocolate ganache cake with mirror gloss glaze & gold flakes',
        imageUrl: '/dish-presets/3d/bakery_chocolate_cake_3d.png',
        tag: '3D Dessert'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'bar_bg_neon',
        name: 'Cyberpunk Neon Bar Lounge',
        description: 'Luminescent electric cyan and violet bar counter reflections',
        imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'bar_bg_speakeasy',
        name: 'Moody Speakeasy Spirits Wall',
        description: 'Warm amber backlit liquor shelves and polished mahogany wood',
        imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      },
      {
        id: 'bar_bg_skyline',
        name: 'Rooftop Skyline Night View',
        description: 'Metropolitan skyscrapers bokeh lights from exclusive terrace',
        imageUrl: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'bar_bg_glassware',
        name: 'Cocktail Mixology Counter',
        description: 'Chilled crystal cocktail coupe and aromatic botanical garnishes',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 48
      }
    ],
  },

  // ================= 11. CRAFT BEER & BREWERY =================
  craft_beer_brewery: {
    id: 'craft_beer_brewery',
    name: 'Craft Beer & Brewery',
    category: 'bar_pub',
    tagline: 'Freshly Brewed IPAs, Stout & Chilled Pints on Tap',
    colors: {
      primary: '#1F2421', // Chalkboard Black
      secondary: '#F8961E', // Amber Beer Gold
      text: '#EDF2F4', // Froth White
      accent: '#E76F51', // Hops Copper
      qrBg: '#FFFFFF',
      qrFg: '#1F2421',
      qrFrame: '#F8961E'
    },
    bgStyle: {
      type: 'texture',
      gradientStart: '#272018',
      gradientEnd: '#130F0A',
      gradientAngle: 150,
      texture: 'chalkboard',
      overlayColor: '#000000',
      overlayOpacity: 50,
      description: 'Dark chalkboard & wooden barrel pub texture with wheat/hop icons'
    },
    typography: {
      fontFamily: 'Montserrat, sans-serif',
      headingFont: 'Montserrat, sans-serif'
    },
    dishPresets: [
      {
        id: 'brew_beer_3d',
        name: '3D Craft Amber IPA Beer Pint',
        description: 'Tall frosted glass of golden frothy draft craft beer with Bavarian pretzel',
        imageUrl: '/dish-presets/3d/brew_craft_beer_3d.png',
        tag: '3D On Tap'
      },
      {
        id: 'brew_nachos_3d',
        name: '3D Loaded Cheddar Nachos Platter',
        description: 'Crispy corn tortilla chips piled high with melted cheese, salsa, guacamole & jalapenos',
        imageUrl: '/dish-presets/3d/brew_loaded_nachos_3d.png',
        tag: '3D Taproom'
      },
      {
        id: 'brew_burger_3d',
        name: '3D Brewpub Double Cheeseburger',
        description: 'Loaded toasted brioche burger with melted cheddar & seasoned golden fries',
        imageUrl: '/dish-presets/3d/fast_food_burger_3d.png',
        tag: '3D Burger'
      },
      {
        id: 'brew_cocktail_3d',
        name: '3D Hops Infused Craft Cocktail',
        description: 'Luminous crystal coupe glass with artisan botanical ice sphere & citrus wheel',
        imageUrl: '/dish-presets/3d/bar_neon_cocktail_3d.png',
        tag: '3D Cocktail'
      },
      {
        id: 'brew_samosa_3d',
        name: '3D Crispy Spicy Finger Bites',
        description: 'Golden fried Punjabi samosas with fresh mint chutney & earthen kullad tea',
        imageUrl: '/dish-presets/3d/dhaba_chai_samosa_3d.png',
        tag: '3D Finger Food'
      },
      {
        id: 'brew_steak_3d',
        name: '3D Sizzling Brewpub Sizzler Platter',
        description: 'Black marble platter with seared premium cut, roasted rosemary potatoes & herb reduction',
        imageUrl: '/dish-presets/3d/fine_dining_steak_3d.png',
        tag: '3D Sizzler'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'brew_bg_copper',
        name: 'Copper Brewery Fermenter Tanks',
        description: 'Authentic polished copper brew kettles inside working taproom',
        imageUrl: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'brew_bg_casks',
        name: 'Aging Oak Beer & Whiskey Casks',
        description: 'Dark subterranean warehouse with stacked oak maturation casks',
        imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      },
      {
        id: 'brew_bg_pub',
        name: 'Rustic Wood Taproom Wall',
        description: 'Classic European beer hall with brass draught beer taps',
        imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 48
      },
      {
        id: 'brew_bg_hops',
        name: 'Golden Barley & Malt Harvest',
        description: 'Crisp agricultural hop vines and toasted brewing grains',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      }
    ],
  },

  // ================= 12. HIGHWAY DHABA & CHAI TAPRI =================
  highway_dhaba_tapri: {
    id: 'highway_dhaba_tapri',
    name: 'Highway Dhaba & Chai Tapri',
    category: 'dhaba_street',
    tagline: 'Asli Desi Swad • Mitti Ki Khushbu & Kadak Chai',
    colors: {
      primary: '#BC6C25', // Earthen Mud / Ochre
      secondary: '#9B2226', // Desi Red / Clay
      text: '#FEFAE0', // Butter Cream
      accent: '#DDA15E', // Khichdi Gold
      qrBg: '#FFFDF0',
      qrFg: '#5C1D11',
      qrFrame: '#9B2226'
    },
    bgStyle: {
      type: 'gradient',
      gradientStart: '#7F1D1D',
      gradientEnd: '#3F120A',
      gradientAngle: 145,
      texture: 'wood',
      overlayColor: '#000000',
      overlayOpacity: 45,
      description: 'Desi Truck-Art border with mitti & rustic wooden dhaba frame'
    },
    typography: {
      fontFamily: 'Montserrat, sans-serif',
      headingFont: 'Montserrat, sans-serif'
    },
    dishPresets: [
      {
        id: 'dh_samosa_3d',
        name: '3D Crispy Samosas & Kadak Chai',
        description: 'Golden fried Punjabi samosas with fresh mint chutney & earthen kullad tea',
        imageUrl: '/dish-presets/3d/dhaba_chai_samosa_3d.png',
        tag: '3D Chai Tapri'
      },
      {
        id: 'dh_chole_bhature_3d',
        name: '3D Asli Punjabi Chole Bhature',
        description: 'Puffed golden bhature with rich spicy chickpeas, pickled red onions & lemon wedge',
        imageUrl: '/dish-presets/3d/dhaba_chole_bhature_3d.png',
        tag: '3D Dhaba'
      },
      {
        id: 'dh_paratha_3d',
        name: '3D Amritsari Aloo Paratha Makhan',
        description: 'Crisp layered tawa paratha loaded with melting desi white butter and spiced curd',
        imageUrl: '/dish-presets/3d/dhaba_paratha_makhan_3d.png',
        tag: '3D Desi Makhan'
      },
      {
        id: 'dh_lassi_3d',
        name: '3D Kullad Malai Sweet Lassi',
        description: 'Traditional earthen clay cup filled with thick chilled yogurt lassi topped with saffron',
        imageUrl: '/dish-presets/3d/dhaba_kullad_lassi_3d.png',
        tag: '3D Earthen Pot'
      },
      {
        id: 'dh_pav_bhaji_3d',
        name: '3D Street Style Butter Pav Bhaji',
        description: 'Rich spiced vegetable bhaji with melting butter and golden grilled pav buns',
        imageUrl: '/dish-presets/3d/dhaba_pav_bhaji_3d.png',
        tag: '3D Street Food'
      },
      {
        id: 'dh_paneer_tikka_3d',
        name: '3D Dhaba Tandoori Paneer Tikka',
        description: 'Clay-oven charred cottage cheese cubes with tandoori spices & mint dip',
        imageUrl: '/dish-presets/3d/north_indian_paneer_tikka_3d.png',
        tag: '3D Tandoor'
      }
    ],
    culturalBackgrounds: [
      {
        id: 'dh_bg_highway_night',
        name: 'Grand Trunk Road Night Lights',
        description: 'Glowing vintage incandescent bulb strings at highway truck stop',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'dh_bg_charpai',
        name: 'Roadside Charpai under Tree',
        description: 'Traditional village woven cot with hurricane lantern under banyan',
        imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 45
      },
      {
        id: 'dh_bg_truckart',
        name: 'Desi Truck-Art Vibrant Wall',
        description: 'Colorful hand-painted floral borders and Indian truck-art motifs',
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      },
      {
        id: 'dh_bg_tapri',
        name: 'Steaming Mitti Tapri & Chai',
        description: 'Baked terracotta kullads and roadside kadak cutting chai kettle',
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 46
      },
      {
        id: 'dh_bg_chulha',
        name: 'Clay Chulha & Hearth Warmth',
        description: 'Rustic woodfire earthen hearth with smoky village dhaba aroma',
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 50
      }
    ],
  }
};
