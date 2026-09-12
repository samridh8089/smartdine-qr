import { QRDesignConfig, QRTemplatePreset, QRTemplateId } from './types';

export const FONT_OPTIONS = [
  { label: 'Plus Jakarta Sans (Modern Clean)', value: 'Plus Jakarta Sans, sans-serif' },
  { label: 'Inter (High Legibility)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Playfair Display (Luxury Serif)', value: 'Playfair Display, Georgia, serif' },
  { label: 'Cinzel (Royal Classical)', value: 'Cinzel, Georgia, serif' },
  { label: 'Outfit (Trendy Geometric)', value: 'Outfit, sans-serif' },
  { label: 'Montserrat (Bold Architectural)', value: 'Montserrat, sans-serif' },
  { label: 'Poppins (Friendly Contemporary)', value: 'Poppins, sans-serif' },
  { label: 'Caveat (Casual Artisan Script)', value: 'Caveat, cursive' },
  { label: 'Bungee (Bold Gen-Z Display)', value: 'Impact, sans-serif' }
];

export const SHAPE_OPTIONS = [
  { id: 'rounded_square', label: 'Rounded Square', aspect: '1 / 1', desc: 'Standard coaster / table disc' },
  { id: 'square', label: 'Square', aspect: '1 / 1', desc: 'Sharp modern sticker' },
  { id: 'vertical_card', label: 'Vertical Card (Portrait)', aspect: '3 / 4', desc: 'Acrylic table tent card' },
  { id: 'horizontal_card', label: 'Horizontal Card (Landscape)', aspect: '4 / 3', desc: 'Bar counter & desk placard' },
  { id: 'table_tent', label: 'Table Tent (Folded 3D)', aspect: '4 / 5', desc: 'Self-standing table tent' },
  { id: 'standee', label: 'Tall Standee', aspect: '9 / 16', desc: 'Pedestal standing display' },
  { id: 'circle', label: 'Circular Coaster', aspect: '1 / 1', desc: 'Round coaster / disc' }
];

export const FRAME_OPTIONS = [
  { id: 'rounded', label: 'Soft Rounded', desc: 'Gentle 16px corner curve' },
  { id: 'sharp', label: 'Sharp Minimal', desc: 'Crisp geometric edges' },
  { id: 'double', label: 'Double Inset Border', desc: 'Classic fine-dining elegance' },
  { id: 'elegant', label: 'Ornate Corner Brackets', desc: 'Luxury royal accent framing' },
  { id: 'neon', label: 'Neon Glow', desc: 'Luminescent halo border' },
  { id: 'minimal', label: 'Ultra Thin Hairline', desc: '1px clean subtle border' },
  { id: 'shadow_frame', label: 'Deep Drop Shadow', desc: 'Floating elevated effect' },
  { id: 'checker', label: 'Retro Checkerboard', desc: 'Vintage American diner pattern' },
  { id: 'torn_edge', label: 'Torn Kraft Edge', desc: 'Artisan handcrafted border' },
  { id: 'brush_stroke', label: 'Bold Brush Stroke', desc: 'Street food paint finish' }
];

export const PRINT_SIZE_OPTIONS = [
  { id: '5x5', label: '5 × 5 cm', desc: 'Compact sticker / Bar counter', widthMm: 50, heightMm: 50 },
  { id: '8x8', label: '8 × 8 cm', desc: 'Standard table disc / Coaster', widthMm: 80, heightMm: 80 },
  { id: '10x10', label: '10 × 10 cm', desc: 'Large VIP table sticker', widthMm: 100, heightMm: 100 },
  { id: 'A5', label: 'A5 (14.8 × 21 cm)', desc: 'Standing acrylic display card', widthMm: 148, heightMm: 210 },
  { id: 'A4_sheet', label: 'A4 Multi-QR Sheet', desc: 'Print 6–8 table cards per page', widthMm: 210, heightMm: 297 }
];

export const DEFAULT_QR_CONFIG: QRDesignConfig = {
  version: 2,
  templateId: 'emerald_green',
  shape: 'vertical_card',
  selectedPrintSize: '8x8',
  text: {
    restaurantName: 'The Foody Hub',
    tableNameFormat: 'Table {{table_name}}',
    scanText: 'Scan to View Menu & Order',
    welcomeText: 'Contactless Digital Dining',
    footerText: 'Powered by CleverOps • Instant Kitchen Dispatch',
    badgeText: '⭐ 4.9 RATED • BEST IN TOWN',
    restaurantTypography: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      lineHeight: 1.2,
      textAlign: 'center',
      textColor: '#FFFFFF'
    },
    tableTypography: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.2,
      lineHeight: 1.1,
      textAlign: 'center',
      textColor: '#34D399'
    },
    scanTypography: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.2,
      lineHeight: 1.3,
      textAlign: 'center',
      textColor: '#E2E8F0'
    },
    footerTypography: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 9,
      fontWeight: 'normal',
      letterSpacing: 0.4,
      lineHeight: 1.2,
      textAlign: 'center',
      textColor: '#94A3B8'
    }
  },
  qr: {
    size: 185,
    padding: 10,
    borderRadius: 14,
    frameThickness: 0,
    frameColor: '#059669',
    bgColor: '#FFFFFF',
    fgColor: '#064E3B',
    shadow: 'soft',
    position: 'center',
    eyeStyle: 'rounded',
    centerLogo: true,
    centerLogoSize: 34
  },
  logo: {
    enabled: true,
    url: '',
    size: 44,
    shape: 'rounded',
    border: true,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    shadow: true,
    position: 'header'
  },
  background: {
    type: 'gradient',
    color: '#064E3B',
    gradientStart: '#064E3B',
    gradientEnd: '#022C22',
    gradientAngle: 160,
    texture: 'emerald_pattern',
    imageUrl: '',
    foodCategory: 'none',
    filters: {
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      overlayColor: '#000000',
      overlayOpacity: 45,
      zoom: 1.0,
      position: 'center'
    },
    opacity: 95
  },
  lighting: {
    vignette: true,
    vignetteIntensity: 40,
    spotlight: false,
    glow: true,
    glowColor: '#10B981',
    grain: false,
    glassReflection: true
  },
  frame: {
    style: 'rounded',
    color: '#10B981',
    width: 2,
    accentColor: '#34D399'
  },
  stickers: [],
  advanced: {
    editorMode: 'preset',
    showSafeZone: false,
    showRuler: false,
    showGrid: false,
    snapToGuides: true,
    animatedPreview: true,
    customElements: [
      { id: 'el-logo', type: 'logo', x: 50, y: 12, zIndex: 1, locked: false },
      { id: 'el-rest', type: 'restaurant_name', x: 50, y: 22, zIndex: 2, locked: false },
      { id: 'el-table', type: 'table_name', x: 50, y: 31, zIndex: 3, locked: false },
      { id: 'el-qr', type: 'qr_code', x: 50, y: 58, zIndex: 4, locked: false },
      { id: 'el-scan', type: 'scan_text', x: 50, y: 84, zIndex: 5, locked: false },
      { id: 'el-foot', type: 'footer', x: 50, y: 92, zIndex: 6, locked: false }
    ]
  }
};

export const QR_TEMPLATES: QRTemplatePreset[] = [
  // ==========================================
  // ⚡ 10 GEN-Z & FOOD POSTER TEMPLATES
  // ==========================================

  // 1. HYPE BURGER
  {
    id: 'hype_burger',
    name: 'Hype Burger',
    category: 'Gen-Z & Trendy',
    description: 'Pitch black background, electric yellow accents, floating fries and smash burger poster.',
    thumbnailBg: '#0A0A0A',
    thumbnailImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'hype_burger',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#09090B',
        gradientStart: '#18181B',
        gradientEnd: '#000000',
        gradientAngle: 180,
        texture: 'none',
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'fast_food',
        filters: {
          blur: 2,
          brightness: 85,
          contrast: 125,
          saturation: 130,
          overlayColor: '#000000',
          overlayOpacity: 65,
          zoom: 1.1,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'rounded', color: '#FACC15', width: 3, accentColor: '#EAB308' },
      lighting: { vignette: true, vignetteIntensity: 55, spotlight: true, glow: true, glowColor: '#FACC15', grain: true, glassReflection: true },
      text: {
        restaurantName: 'SMASH & CRAVE',
        tableNameFormat: 'BOOTH {{table_name}}',
        scanText: '⚡ SCAN TO ORDER & SMASH',
        welcomeText: 'Fresh Off The Grill',
        footerText: 'CleverOps Live Kitchen • Zero Waiting',
        badgeText: '🔥 LIT & SIZZLING',
        restaurantTypography: {
          fontFamily: 'Impact, sans-serif',
          fontSize: 20,
          fontWeight: 'bold',
          letterSpacing: 2,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FACC15'
        },
        tableTypography: {
          fontFamily: 'Impact, sans-serif',
          fontSize: 26,
          fontWeight: '800',
          letterSpacing: 1,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        scanTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.5,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#FEF08A'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.8,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#A1A1AA'
        }
      },
      qr: {
        size: 185,
        padding: 10,
        borderRadius: 16,
        frameThickness: 2,
        frameColor: '#FACC15',
        bgColor: '#FFFFFF',
        fgColor: '#0A0A0A',
        shadow: 'glow',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 36
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_burger', category: 'food', content: '🍔', type: 'emoji', x: 10, y: 12, size: 28, rotation: -12, opacity: 95, locked: false },
        { id: 'st-2', stickerId: 'st_fries', category: 'food', content: '🍟', type: 'emoji', x: 88, y: 14, size: 28, rotation: 15, opacity: 95, locked: false },
        { id: 'st-3', stickerId: 'st_fire', category: 'genz', content: '🔥', type: 'emoji', x: 86, y: 84, size: 24, rotation: -10, opacity: 90, locked: false }
      ]
    }
  },

  // 2. MATCHA AESTHETIC
  {
    id: 'matcha_aesthetic',
    name: 'Matcha Aesthetic',
    category: 'Gen-Z & Trendy',
    description: 'Serene sage green and cream with organic grain texture and soothing cafe latte art.',
    thumbnailBg: '#2D4336',
    thumbnailImage: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'matcha_aesthetic',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#243329',
        gradientStart: '#2D4336',
        gradientEnd: '#1A261F',
        gradientAngle: 160,
        texture: 'grain',
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'cafe',
        filters: {
          blur: 1,
          brightness: 90,
          contrast: 110,
          saturation: 115,
          overlayColor: '#1A261F',
          overlayOpacity: 55,
          zoom: 1.05,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'rounded', color: '#A7D7B5', width: 2, accentColor: '#D1FAE5' },
      lighting: { vignette: true, vignetteIntensity: 45, spotlight: false, glow: true, glowColor: '#6EE7B7', grain: true, glassReflection: true },
      text: {
        restaurantName: 'THE MATCHA CLUB',
        tableNameFormat: 'Table {{table_name}}',
        scanText: '🌿 Sip, Savor & Order Online',
        welcomeText: 'Ceremonial Grade Moments',
        footerText: 'Slow Brewed • CleverOps Hospitality',
        badgeText: '🍃 100% CEREMONIAL GRADE',
        restaurantTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: 2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#ECFDF5'
        },
        tableTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 23,
          fontWeight: '800',
          letterSpacing: 0.5,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#A7F3D0'
        },
        scanTypography: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.4,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#E6F4EA'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.5,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#9CA3AF'
        }
      },
      qr: {
        size: 185,
        padding: 10,
        borderRadius: 16,
        frameThickness: 1.5,
        frameColor: '#A7F3D0',
        bgColor: '#F4FBF7',
        fgColor: '#1A261F',
        shadow: 'soft',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 34
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_herb', category: 'fresh', content: '🌿', type: 'emoji', x: 12, y: 12, size: 24, rotation: -15, opacity: 90, locked: false },
        { id: 'st-2', stickerId: 'st_sparkles', category: 'genz', content: '✨', type: 'emoji', x: 86, y: 12, size: 22, rotation: 10, opacity: 85, locked: false }
      ]
    }
  },

  // 3. KOREAN CAFE
  {
    id: 'korean_cafe',
    name: 'Korean Cafe',
    category: 'Gen-Z & Trendy',
    description: 'Ivory, beige, and warm milk foam with cute minimalist doodles and buttery croissants.',
    thumbnailBg: '#EDE8E1',
    thumbnailImage: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'korean_cafe',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#F7F5F0',
        gradientStart: '#F7F5F0',
        gradientEnd: '#EFEBE4',
        gradientAngle: 180,
        texture: 'paper',
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'cafe',
        filters: {
          blur: 1,
          brightness: 95,
          contrast: 105,
          saturation: 110,
          overlayColor: '#F5F0E6',
          overlayOpacity: 70,
          zoom: 1.05,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'rounded', color: '#D4C8B8', width: 2, accentColor: '#B8A894' },
      lighting: { vignette: false, vignetteIntensity: 20, spotlight: false, glow: false, glowColor: '#FFFFFF', grain: true, glassReflection: false },
      text: {
        restaurantName: '달콤한 브런치 • Sweet Bakery',
        tableNameFormat: 'Table {{table_name}}',
        scanText: '🥐 Scan to Order Warm Pastries',
        welcomeText: 'Cozy Morning Moments',
        footerText: 'Handcrafted Daily • Powered by CleverOps',
        badgeText: '🥐 FRESHLY BAKED AT 7AM',
        restaurantTypography: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 15,
          fontWeight: 'bold',
          letterSpacing: 0.8,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#4A3B32'
        },
        tableTypography: {
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 24,
          fontWeight: '800',
          letterSpacing: 0,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#6B4E3D'
        },
        scanTypography: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#7D6353'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.4,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#A8998C'
        }
      },
      qr: {
        size: 180,
        padding: 10,
        borderRadius: 14,
        frameThickness: 1,
        frameColor: '#D8CEBE',
        bgColor: '#FFFFFF',
        fgColor: '#4A3B32',
        shadow: 'soft',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 32
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_croissant', category: 'food', content: '🥐', type: 'emoji', x: 12, y: 12, size: 26, rotation: -10, opacity: 95, locked: false },
        { id: 'st-2', stickerId: 'st_heart', category: 'genz', content: '💖', type: 'emoji', x: 88, y: 12, size: 20, rotation: 8, opacity: 90, locked: false }
      ]
    }
  },

  // 4. CYBER NEON
  {
    id: 'cyber_neon',
    name: 'Cyber Neon',
    category: 'Gen-Z & Trendy',
    description: 'Electric violet, cyan luminescence, and frosted glass reflex for cyberpunk lounges.',
    thumbnailBg: '#1E1035',
    thumbnailImage: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'cyber_neon',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#0A0518',
        gradientStart: '#1E1035',
        gradientEnd: '#060212',
        gradientAngle: 180,
        texture: 'none',
        imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'luxury',
        filters: {
          blur: 2,
          brightness: 80,
          contrast: 130,
          saturation: 140,
          overlayColor: '#0A0518',
          overlayOpacity: 65,
          zoom: 1.1,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'neon', color: '#06B6D4', width: 2, accentColor: '#D946EF' },
      lighting: { vignette: true, vignetteIntensity: 60, spotlight: true, glow: true, glowColor: '#06B6D4', grain: false, glassReflection: true },
      text: {
        restaurantName: 'CYBER BISTRO & BAR',
        tableNameFormat: 'POD // {{table_name}}',
        scanText: '⚡ TAP OR SCAN // INSTANT DRINKS',
        welcomeText: 'Midnight Social Space',
        footerText: 'CleverOps Smart Hospitality Core',
        badgeText: '⚡ NEON NIGHT HOUR',
        restaurantTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 16,
          fontWeight: '800',
          letterSpacing: 2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#22D3EE'
        },
        tableTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 26,
          fontWeight: '800',
          letterSpacing: 1,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#F43F5E'
        },
        scanTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#A5F3FC'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.8,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#64748B'
        }
      },
      qr: {
        size: 185,
        padding: 10,
        borderRadius: 16,
        frameThickness: 2,
        frameColor: '#06B6D4',
        bgColor: '#FFFFFF',
        fgColor: '#0A0518',
        shadow: 'glow',
        position: 'center',
        eyeStyle: 'circle',
        centerLogo: true,
        centerLogoSize: 34
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_lightning', category: 'genz', content: '⚡', type: 'emoji', x: 10, y: 12, size: 26, rotation: -12, opacity: 95, locked: false },
        { id: 'st-2', stickerId: 'st_cocktail', category: 'drinks', content: '🍸', type: 'emoji', x: 88, y: 12, size: 26, rotation: 12, opacity: 90, locked: false }
      ]
    }
  },

  // 5. STREET FOOD
  {
    id: 'street_food',
    name: 'Street Food Graffiti',
    category: 'Gen-Z & Trendy',
    description: 'Fiery orange and mustard yellow with street graffiti badges and sizzling wok noodles.',
    thumbnailBg: '#C2410C',
    thumbnailImage: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'street_food',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#431407',
        gradientStart: '#9A3412',
        gradientEnd: '#431407',
        gradientAngle: 155,
        texture: 'none',
        imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'fast_food',
        filters: {
          blur: 1,
          brightness: 90,
          contrast: 125,
          saturation: 135,
          overlayColor: '#270802',
          overlayOpacity: 55,
          zoom: 1.1,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'brush_stroke', color: '#FDBA74', width: 3, accentColor: '#EA580C' },
      lighting: { vignette: true, vignetteIntensity: 50, spotlight: true, glow: true, glowColor: '#F97316', grain: true, glassReflection: false },
      text: {
        restaurantName: 'STREET BITES & CO',
        tableNameFormat: 'BENCH {{table_name}}',
        scanText: '🔥 SCAN FOR STREET SPECIALS',
        welcomeText: 'Authentic Wok & Grill',
        footerText: 'Served Hot & Sizzling • CleverOps',
        badgeText: '🌶️ HOT & FIERY',
        restaurantTypography: {
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: 1.5,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FED7AA'
        },
        tableTypography: {
          fontFamily: 'Impact, sans-serif',
          fontSize: 26,
          fontWeight: '800',
          letterSpacing: 1,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        scanTypography: {
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#FFEDD5'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.5,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FDBA74'
        }
      },
      qr: {
        size: 185,
        padding: 10,
        borderRadius: 14,
        frameThickness: 2,
        frameColor: '#F97316',
        bgColor: '#FFF7ED',
        fgColor: '#431407',
        shadow: 'medium',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 34
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_taco', category: 'food', content: '🌮', type: 'emoji', x: 10, y: 14, size: 26, rotation: -12, opacity: 95, locked: false },
        { id: 'st-2', stickerId: 'st_chili', category: 'fresh', content: '🌶️', type: 'emoji', x: 88, y: 14, size: 24, rotation: 15, opacity: 95, locked: false }
      ]
    }
  },

  // 6. LUXURY BLACK
  {
    id: 'luxury_black',
    name: 'Luxury Black Marble',
    category: 'Luxury',
    description: 'Black Nero Marquina marble with 24k gold leaf foil borders and prime wagyu steak.',
    thumbnailBg: '#09090B',
    thumbnailImage: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'luxury_black',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#000000',
        gradientStart: '#141417',
        gradientEnd: '#000000',
        gradientAngle: 180,
        texture: 'marble',
        imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'luxury',
        filters: {
          blur: 1,
          brightness: 75,
          contrast: 130,
          saturation: 120,
          overlayColor: '#000000',
          overlayOpacity: 65,
          zoom: 1.1,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'elegant', color: '#D4AF37', width: 2, accentColor: '#F59E0B' },
      lighting: { vignette: true, vignetteIntensity: 65, spotlight: true, glow: true, glowColor: '#D4AF37', grain: false, glassReflection: true },
      text: {
        restaurantName: 'THE GRAND STEAKHOUSE',
        tableNameFormat: 'TABLE {{table_name}}',
        scanText: '⚜️ SCAN TO EXPLORE CELLAR & MENU',
        welcomeText: 'A Bespoke Fine Dining Affair',
        footerText: 'Powered by CleverOps • Private Table Concierge',
        badgeText: '👑 MICHELIN RECOGNIZED',
        restaurantTypography: {
          fontFamily: 'Cinzel, Georgia, serif',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: 2.5,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#F59E0B'
        },
        tableTypography: {
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 26,
          fontWeight: '800',
          letterSpacing: 1.5,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        scanTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.2,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#D4AF37'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 1,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#71717A'
        }
      },
      qr: {
        size: 185,
        padding: 10,
        borderRadius: 16,
        frameThickness: 2,
        frameColor: '#D4AF37',
        bgColor: '#FFFFFF',
        fgColor: '#09090B',
        shadow: 'medium',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 34
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_wine', category: 'drinks', content: '🍷', type: 'emoji', x: 12, y: 14, size: 24, rotation: -8, opacity: 90, locked: false },
        { id: 'st-2', stickerId: 'st_diamond', category: 'genz', content: '💎', type: 'emoji', x: 88, y: 14, size: 22, rotation: 8, opacity: 90, locked: false }
      ]
    }
  },

  // 7. CANDY POP
  {
    id: 'candy_pop',
    name: 'Candy Pop Y2K',
    category: 'Gen-Z & Trendy',
    description: 'Pastel baby pink and electric bubblegum blue with Y2K typography and glazed donuts.',
    thumbnailBg: '#EC4899',
    thumbnailImage: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'candy_pop',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#831843',
        gradientStart: '#BE185D',
        gradientEnd: '#4C0519',
        gradientAngle: 140,
        texture: 'dots',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'dessert',
        filters: {
          blur: 1,
          brightness: 95,
          contrast: 120,
          saturation: 140,
          overlayColor: '#700938',
          overlayOpacity: 55,
          zoom: 1.1,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'rounded', color: '#F472B6', width: 3, accentColor: '#38BDF8' },
      lighting: { vignette: true, vignetteIntensity: 40, spotlight: false, glow: true, glowColor: '#F472B6', grain: false, glassReflection: true },
      text: {
        restaurantName: 'SWEET SPOT DESSERTS',
        tableNameFormat: 'BOOTH {{table_name}}',
        scanText: '🍩 SCAN FOR MILKSHAKES & DONUTS',
        welcomeText: 'Sugar, Spice & Everything Nice',
        footerText: 'Made With Love • CleverOps',
        badgeText: '💖 100% YUMMY VIBES',
        restaurantTypography: {
          fontFamily: 'Poppins, sans-serif',
          fontSize: 16,
          fontWeight: '800',
          letterSpacing: 1,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FDF2F8'
        },
        tableTypography: {
          fontFamily: 'Poppins, sans-serif',
          fontSize: 25,
          fontWeight: '800',
          letterSpacing: 0,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#38BDF8' // Sky blue
        },
        scanTypography: {
          fontFamily: 'Poppins, sans-serif',
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#FCE7F3'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.5,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#F472B6'
        }
      },
      qr: {
        size: 185,
        padding: 10,
        borderRadius: 16,
        frameThickness: 2,
        frameColor: '#F472B6',
        bgColor: '#FFFFFF',
        fgColor: '#831843',
        shadow: 'medium',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 34
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_donut', category: 'food', content: '🍩', type: 'emoji', x: 10, y: 14, size: 26, rotation: -12, opacity: 95, locked: false },
        { id: 'st-2', stickerId: 'st_icecream', category: 'food', content: '🍦', type: 'emoji', x: 88, y: 14, size: 26, rotation: 12, opacity: 95, locked: false }
      ]
    }
  },

  // 8. RETRO DINER
  {
    id: 'retro_diner',
    name: 'Retro 50s Diner',
    category: 'Gen-Z & Trendy',
    description: 'Black-and-white checkerboard trim, cherry red, and vintage American diner vibes.',
    thumbnailBg: '#B91C1C',
    thumbnailImage: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'retro_diner',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#7F1D1D',
        gradientStart: '#991B1B',
        gradientEnd: '#450A0A',
        gradientAngle: 180,
        texture: 'none',
        imageUrl: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'fast_food',
        filters: {
          blur: 1,
          brightness: 85,
          contrast: 130,
          saturation: 125,
          overlayColor: '#380606',
          overlayOpacity: 60,
          zoom: 1.1,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'checker', color: '#FFFFFF', width: 3, accentColor: '#EF4444' },
      lighting: { vignette: true, vignetteIntensity: 50, spotlight: true, glow: true, glowColor: '#EF4444', grain: true, glassReflection: true },
      text: {
        restaurantName: 'ROUTE 66 DINER',
        tableNameFormat: 'TABLE {{table_name}}',
        scanText: '🍔 SCAN FOR SHAKES & BURGERS',
        welcomeText: 'Always Open • Since 1958',
        footerText: 'CleverOps Diner POS • Fast Service',
        badgeText: '⭐ ALL-AMERICAN CLASSIC',
        restaurantTypography: {
          fontFamily: 'Impact, sans-serif',
          fontSize: 22,
          fontWeight: 'bold',
          letterSpacing: 2,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        tableTypography: {
          fontFamily: 'Impact, sans-serif',
          fontSize: 28,
          fontWeight: '800',
          letterSpacing: 1.5,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FDE047'
        },
        scanTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.8,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#FEE2E2'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.5,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FCA5A5'
        }
      },
      qr: {
        size: 185,
        padding: 10,
        borderRadius: 12,
        frameThickness: 2,
        frameColor: '#EF4444',
        bgColor: '#FFFFFF',
        fgColor: '#7F1D1D',
        shadow: 'medium',
        position: 'center',
        eyeStyle: 'square',
        centerLogo: true,
        centerLogoSize: 34
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_hotdog', category: 'food', content: '🌭', type: 'emoji', x: 10, y: 14, size: 26, rotation: -12, opacity: 95, locked: false },
        { id: 'st-2', stickerId: 'st_juice', category: 'drinks', content: '🥤', type: 'emoji', x: 88, y: 14, size: 26, rotation: 12, opacity: 95, locked: false }
      ]
    }
  },

  // 9. MIDNIGHT LOUNGE
  {
    id: 'midnight_lounge',
    name: 'Midnight Lounge',
    category: 'Vibrant',
    description: 'Deep velvet navy with amber gold illumination and craft smoked cocktail ambiance.',
    thumbnailBg: '#0A1128',
    thumbnailImage: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'midnight_lounge',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#030712',
        gradientStart: '#0F172A',
        gradientEnd: '#020617',
        gradientAngle: 170,
        texture: 'none',
        imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'luxury',
        filters: {
          blur: 1,
          brightness: 80,
          contrast: 130,
          saturation: 130,
          overlayColor: '#030712',
          overlayOpacity: 65,
          zoom: 1.1,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'elegant', color: '#F59E0B', width: 2, accentColor: '#D97706' },
      lighting: { vignette: true, vignetteIntensity: 60, spotlight: true, glow: true, glowColor: '#F59E0B', grain: false, glassReflection: true },
      text: {
        restaurantName: 'THE NOCTURNE LOUNGE',
        tableNameFormat: 'TABLE {{table_name}}',
        scanText: '🍸 SCAN FOR CRAFT COCKTAILS & TAPAS',
        welcomeText: 'Live Jazz & Smoked Cocktails',
        footerText: 'CleverOps Hospitality Systems',
        badgeText: '🎷 LIVE MUSIC & BITES',
        restaurantTypography: {
          fontFamily: 'Cinzel, Georgia, serif',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: 2.2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FCD34D'
        },
        tableTypography: {
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 25,
          fontWeight: '800',
          letterSpacing: 1,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        scanTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#FBBF24'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.8,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#94A3B8'
        }
      },
      qr: {
        size: 185,
        padding: 10,
        borderRadius: 16,
        frameThickness: 2,
        frameColor: '#F59E0B',
        bgColor: '#FFFFFF',
        fgColor: '#030712',
        shadow: 'glow',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 34
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_cocktail', category: 'drinks', content: '🍸', type: 'emoji', x: 10, y: 14, size: 24, rotation: -10, opacity: 90, locked: false },
        { id: 'st-2', stickerId: 'st_sparkles', category: 'genz', content: '✨', type: 'emoji', x: 88, y: 14, size: 22, rotation: 8, opacity: 85, locked: false }
      ]
    }
  },

  // 10. SOCIAL MEDIA VIRAL
  {
    id: 'social_media_viral',
    name: 'Social Media Viral',
    category: 'Gen-Z & Trendy',
    description: 'Instagram & TikTok viral food poster with rating badge, foodie stickers, and bold layout.',
    thumbnailBg: '#4F46E5',
    thumbnailImage: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&q=80',
    config: {
      templateId: 'social_media_viral',
      shape: 'vertical_card',
      background: {
        type: 'food_photo',
        color: '#1E1B4B',
        gradientStart: '#4338CA',
        gradientEnd: '#0F172A',
        gradientAngle: 150,
        texture: 'none',
        imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
        foodCategory: 'asian',
        filters: {
          blur: 1,
          brightness: 90,
          contrast: 125,
          saturation: 135,
          overlayColor: '#1E1B4B',
          overlayOpacity: 55,
          zoom: 1.1,
          position: 'center'
        },
        opacity: 100
      },
      frame: { style: 'rounded', color: '#818CF8', width: 2.5, accentColor: '#C7D2FE' },
      lighting: { vignette: true, vignetteIntensity: 50, spotlight: true, glow: true, glowColor: '#818CF8', grain: false, glassReflection: true },
      text: {
        restaurantName: '@VIRALBITES_OFFICIAL',
        tableNameFormat: 'TABLE #{{table_name}}',
        scanText: '📸 SCAN TO VIEW REELS & ORDER',
        welcomeText: 'Tag Us In Your Stories!',
        footerText: 'Powered by CleverOps • 100% Contactless',
        badgeText: '⭐ 4.9 RATED ON ZOMATO',
        restaurantTypography: {
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 16,
          fontWeight: '800',
          letterSpacing: 1.2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#C7D2FE'
        },
        tableTypography: {
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 25,
          fontWeight: '800',
          letterSpacing: 0.5,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        scanTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#E0E7FF'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.5,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#A5B4FC'
        }
      },
      qr: {
        size: 185,
        padding: 10,
        borderRadius: 16,
        frameThickness: 2,
        frameColor: '#818CF8',
        bgColor: '#FFFFFF',
        fgColor: '#1E1B4B',
        shadow: 'glow',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 34
      },
      stickers: [
        { id: 'st-1', stickerId: 'st_camera', category: 'genz', content: '📸', type: 'emoji', x: 10, y: 14, size: 24, rotation: -10, opacity: 95, locked: false },
        { id: 'st-2', stickerId: 'st_sushi', category: 'food', content: '🍣', type: 'emoji', x: 88, y: 14, size: 26, rotation: 12, opacity: 95, locked: false }
      ]
    }
  },

  // ==========================================
  // 🏛️ 10 CLASSIC & BRAND SIGNATURE TEMPLATES
  // ==========================================

  // 11. Minimal White
  {
    id: 'minimal_white',
    name: 'Minimal White',
    category: 'Minimalist',
    description: 'Crisp gallery white aesthetic, pure typography, ultra clean contrast.',
    thumbnailBg: '#F8FAFC',
    config: {
      templateId: 'minimal_white',
      shape: 'vertical_card',
      background: {
        type: 'solid',
        color: '#FFFFFF',
        gradientStart: '#FFFFFF',
        gradientEnd: '#F8FAFC',
        gradientAngle: 180,
        texture: 'none',
        imageUrl: '',
        foodCategory: 'none',
        filters: { blur: 0, brightness: 100, contrast: 100, saturation: 100, overlayColor: '#000000', overlayOpacity: 0, zoom: 1.0, position: 'center' },
        opacity: 100
      },
      frame: { style: 'minimal', color: '#E2E8F0', width: 1.5 },
      lighting: { vignette: false, vignetteIntensity: 0, spotlight: false, glow: false, glowColor: '', grain: false, glassReflection: false },
      text: {
        restaurantName: 'The Foody Hub',
        tableNameFormat: 'Table {{table_name}}',
        scanText: 'Scan to View Menu & Order',
        welcomeText: 'Fast & Contactless',
        footerText: 'Powered by CleverOps',
        restaurantTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 15,
          fontWeight: 'bold',
          letterSpacing: 0.2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#0F172A'
        },
        tableTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: -0.4,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#0F172A'
        },
        scanTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.1,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#64748B'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 9,
          fontWeight: 'normal',
          letterSpacing: 0.2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#94A3B8'
        }
      },
      qr: {
        size: 190,
        padding: 10,
        borderRadius: 8,
        frameThickness: 1,
        frameColor: '#E2E8F0',
        bgColor: '#FFFFFF',
        fgColor: '#0F172A',
        shadow: 'soft',
        position: 'center',
        eyeStyle: 'square',
        centerLogo: true,
        centerLogoSize: 32
      },
      logo: {
        enabled: true,
        url: '',
        size: 40,
        shape: 'rounded',
        border: true,
        borderColor: '#E2E8F0',
        borderWidth: 1,
        shadow: false,
        position: 'header'
      }
    }
  },

  // 12. Elegant Black Gold
  {
    id: 'elegant_black_gold',
    name: 'Elegant Black Gold',
    category: 'Luxury',
    description: 'Obsidian black with opulent metallic gold framing and serif typography.',
    thumbnailBg: '#09090B',
    config: {
      templateId: 'elegant_black_gold',
      shape: 'vertical_card',
      background: {
        type: 'gradient',
        color: '#09090B',
        gradientStart: '#18181B',
        gradientEnd: '#09090B',
        gradientAngle: 145,
        texture: 'dark_texture',
        imageUrl: '',
        foodCategory: 'none',
        filters: { blur: 0, brightness: 100, contrast: 100, saturation: 100, overlayColor: '#000000', overlayOpacity: 0, zoom: 1.0, position: 'center' },
        opacity: 100
      },
      frame: { style: 'elegant', color: '#D4AF37', width: 2, accentColor: '#F59E0B' },
      lighting: { vignette: true, vignetteIntensity: 50, spotlight: false, glow: true, glowColor: '#D4AF37', grain: false, glassReflection: true },
      text: {
        restaurantName: 'The Foody Hub',
        tableNameFormat: 'Table {{table_name}}',
        scanText: 'Scan to View Menu & Order',
        welcomeText: 'A Bespoke Culinary Experience',
        footerText: 'Powered by CleverOps • Seamless Service',
        restaurantTypography: {
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: 1.5,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#F59E0B'
        },
        tableTypography: {
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 24,
          fontWeight: '800',
          letterSpacing: 1,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        scanTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.2,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#D4AF37'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 1,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#71717A'
        }
      },
      qr: {
        size: 190,
        padding: 12,
        borderRadius: 14,
        frameThickness: 2,
        frameColor: '#D4AF37',
        bgColor: '#FFFFFF',
        fgColor: '#18181B',
        shadow: 'medium',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 34
      },
      logo: {
        enabled: true,
        url: '',
        size: 42,
        shape: 'circle',
        border: true,
        borderColor: '#D4AF37',
        borderWidth: 2,
        shadow: true,
        position: 'header'
      }
    }
  },

  // 13. Emerald Green (Default CleverOps)
  {
    id: 'emerald_green',
    name: 'Emerald Green (Default)',
    category: 'Brand Signature',
    description: 'CleverOps signature deep emerald gradient with crisp white and mint accents.',
    thumbnailBg: '#064E3B',
    config: DEFAULT_QR_CONFIG
  },

  // 14. Wooden Cafe
  {
    id: 'wooden_cafe',
    name: 'Wooden Cafe',
    category: 'Artisan',
    description: 'Warm organic walnut wood tones, cozy coffeehouse ambience.',
    thumbnailBg: '#451A03',
    config: {
      templateId: 'wooden_cafe',
      shape: 'vertical_card',
      background: {
        type: 'gradient',
        color: '#451A03',
        gradientStart: '#78350F',
        gradientEnd: '#451A03',
        gradientAngle: 160,
        texture: 'wood',
        imageUrl: '',
        foodCategory: 'none',
        filters: { blur: 0, brightness: 100, contrast: 100, saturation: 100, overlayColor: '#000000', overlayOpacity: 0, zoom: 1.0, position: 'center' },
        opacity: 95
      },
      frame: { style: 'double', color: '#FBBF24', width: 2, accentColor: '#D97706' },
      lighting: { vignette: false, vignetteIntensity: 0, spotlight: false, glow: false, glowColor: '', grain: true, glassReflection: false },
      text: {
        restaurantName: 'The Foody Hub',
        tableNameFormat: 'Table {{table_name}}',
        scanText: 'Scan to View Menu & Order',
        welcomeText: 'Freshly Brewed & Prepared',
        footerText: 'Powered by CleverOps',
        restaurantTypography: {
          fontFamily: 'Caveat, cursive',
          fontSize: 20,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FEF3C7'
        },
        tableTypography: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: 0,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FDE68A'
        },
        scanTypography: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.2,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#FEF3C7'
        },
        footerTypography: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 9,
          fontWeight: 'normal',
          letterSpacing: 0.2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#D97706'
        }
      },
      qr: {
        size: 190,
        padding: 10,
        borderRadius: 12,
        frameThickness: 0,
        frameColor: '#78350F',
        bgColor: '#FEF3C7',
        fgColor: '#451A03',
        shadow: 'soft',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 32
      },
      logo: {
        enabled: true,
        url: '',
        size: 40,
        shape: 'rounded',
        border: true,
        borderColor: '#FBBF24',
        borderWidth: 1.5,
        shadow: true,
        position: 'header'
      }
    }
  },

  // 15. Luxury Marble
  {
    id: 'luxury_marble',
    name: 'Luxury Marble',
    category: 'Luxury',
    description: 'Polished white marble grain with soft champagne gold geometric frames.',
    thumbnailBg: '#F1F5F9',
    config: {
      templateId: 'luxury_marble',
      shape: 'vertical_card',
      background: {
        type: 'texture',
        color: '#F8FAFC',
        gradientStart: '#FFFFFF',
        gradientEnd: '#F1F5F9',
        gradientAngle: 135,
        texture: 'marble',
        imageUrl: '',
        foodCategory: 'none',
        filters: { blur: 0, brightness: 100, contrast: 100, saturation: 100, overlayColor: '#000000', overlayOpacity: 0, zoom: 1.0, position: 'center' },
        opacity: 100
      },
      frame: { style: 'elegant', color: '#B45309', width: 2, accentColor: '#D97706' },
      lighting: { vignette: false, vignetteIntensity: 0, spotlight: false, glow: false, glowColor: '', grain: false, glassReflection: true },
      text: {
        restaurantName: 'The Foody Hub',
        tableNameFormat: 'Table {{table_name}}',
        scanText: 'Scan to View Menu & Order',
        welcomeText: 'Contemporary Fine Dining',
        footerText: 'Powered by CleverOps',
        restaurantTypography: {
          fontFamily: 'Cinzel, Georgia, serif',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: 2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#78350F'
        },
        tableTypography: {
          fontFamily: 'Cinzel, Georgia, serif',
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: 1,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#1E293B'
        },
        scanTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.8,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#92400E'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.6,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#94A3B8'
        }
      },
      qr: {
        size: 190,
        padding: 10,
        borderRadius: 12,
        frameThickness: 1.5,
        frameColor: '#D97706',
        bgColor: '#FFFFFF',
        fgColor: '#1E293B',
        shadow: 'medium',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 32
      },
      logo: {
        enabled: true,
        url: '',
        size: 40,
        shape: 'circle',
        border: true,
        borderColor: '#B45309',
        borderWidth: 1.5,
        shadow: false,
        position: 'header'
      }
    }
  },

  // 16. Neon Night
  {
    id: 'neon_night',
    name: 'Neon Night',
    category: 'Vibrant',
    description: 'Electric cyan and violet glow on deep pitch black for lounges and nightlife.',
    thumbnailBg: '#0F172A',
    config: {
      templateId: 'neon_night',
      shape: 'vertical_card',
      background: {
        type: 'gradient',
        color: '#020617',
        gradientStart: '#0F172A',
        gradientEnd: '#020617',
        gradientAngle: 180,
        texture: 'dark_texture',
        imageUrl: '',
        foodCategory: 'none',
        filters: { blur: 0, brightness: 100, contrast: 100, saturation: 100, overlayColor: '#000000', overlayOpacity: 0, zoom: 1.0, position: 'center' },
        opacity: 100
      },
      frame: { style: 'neon', color: '#06B6D4', width: 2, accentColor: '#A855F7' },
      lighting: { vignette: true, vignetteIntensity: 50, spotlight: true, glow: true, glowColor: '#06B6D4', grain: false, glassReflection: true },
      text: {
        restaurantName: 'The Foody Hub',
        tableNameFormat: 'Table {{table_name}}',
        scanText: 'Scan to View Menu & Order',
        welcomeText: 'Cocktails, Beats & Bites',
        footerText: 'Powered by CleverOps',
        restaurantTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 16,
          fontWeight: '800',
          letterSpacing: 1.2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#22D3EE'
        },
        tableTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 24,
          fontWeight: '800',
          letterSpacing: 0.5,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#F43F5E'
        },
        scanTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.5,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#E2E8F0'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.4,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#64748B'
        }
      },
      qr: {
        size: 190,
        padding: 10,
        borderRadius: 14,
        frameThickness: 2,
        frameColor: '#06B6D4',
        bgColor: '#FFFFFF',
        fgColor: '#020617',
        shadow: 'glow',
        position: 'center',
        eyeStyle: 'circle',
        centerLogo: true,
        centerLogoSize: 34
      },
      logo: {
        enabled: true,
        url: '',
        size: 42,
        shape: 'circle',
        border: true,
        borderColor: '#22D3EE',
        borderWidth: 2,
        shadow: true,
        position: 'header'
      }
    }
  },

  // 17. Rustic Brown
  {
    id: 'rustic_brown',
    name: 'Rustic Brown',
    category: 'Artisan',
    description: 'Earthy terracotta & craft paper texture with vintage stamped accents.',
    thumbnailBg: '#7C2D12',
    config: {
      templateId: 'rustic_brown',
      shape: 'vertical_card',
      background: {
        type: 'gradient',
        color: '#7C2D12',
        gradientStart: '#9A3412',
        gradientEnd: '#7C2D12',
        gradientAngle: 150,
        texture: 'paper',
        imageUrl: '',
        foodCategory: 'none',
        filters: { blur: 0, brightness: 100, contrast: 100, saturation: 100, overlayColor: '#000000', overlayOpacity: 0, zoom: 1.0, position: 'center' },
        opacity: 95
      },
      frame: { style: 'rounded', color: '#FED7AA', width: 2, accentColor: '#FDBA74' },
      lighting: { vignette: false, vignetteIntensity: 0, spotlight: false, glow: false, glowColor: '', grain: true, glassReflection: false },
      text: {
        restaurantName: 'The Foody Hub',
        tableNameFormat: 'Table {{table_name}}',
        scanText: 'Scan to View Menu & Order',
        welcomeText: 'Woodfired & Slow Cooked',
        footerText: 'Powered by CleverOps',
        restaurantTypography: {
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 15,
          fontWeight: '800',
          letterSpacing: 1.5,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FFEDD5'
        },
        tableTypography: {
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 23,
          fontWeight: '800',
          letterSpacing: 0.2,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FED7AA'
        },
        scanTypography: {
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#FFF7ED'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.3,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FDBA74'
        }
      },
      qr: {
        size: 190,
        padding: 10,
        borderRadius: 10,
        frameThickness: 1,
        frameColor: '#FED7AA',
        bgColor: '#FFF7ED',
        fgColor: '#7C2D12',
        shadow: 'soft',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 32
      },
      logo: {
        enabled: true,
        url: '',
        size: 40,
        shape: 'rounded',
        border: true,
        borderColor: '#FED7AA',
        borderWidth: 1.5,
        shadow: true,
        position: 'header'
      }
    }
  },

  // 18. Premium Red
  {
    id: 'premium_red',
    name: 'Premium Red',
    category: 'Vibrant',
    description: 'Royal crimson and burgundy with gold trim for fine dining & Asian bistros.',
    thumbnailBg: '#881337',
    config: {
      templateId: 'premium_red',
      shape: 'vertical_card',
      background: {
        type: 'gradient',
        color: '#881337',
        gradientStart: '#9F1239',
        gradientEnd: '#4C0519',
        gradientAngle: 155,
        texture: 'emerald_pattern',
        imageUrl: '',
        foodCategory: 'none',
        filters: { blur: 0, brightness: 100, contrast: 100, saturation: 100, overlayColor: '#000000', overlayOpacity: 0, zoom: 1.0, position: 'center' },
        opacity: 95
      },
      frame: { style: 'elegant', color: '#FBBF24', width: 2, accentColor: '#F59E0B' },
      lighting: { vignette: true, vignetteIntensity: 45, spotlight: false, glow: true, glowColor: '#FBBF24', grain: false, glassReflection: true },
      text: {
        restaurantName: 'The Foody Hub',
        tableNameFormat: 'Table {{table_name}}',
        scanText: 'Scan to View Menu & Order',
        welcomeText: 'A Feast for the Senses',
        footerText: 'Powered by CleverOps',
        restaurantTypography: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: 0.8,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FDE68A'
        },
        tableTypography: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 23,
          fontWeight: '800',
          letterSpacing: 0.2,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        scanTypography: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.3,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#FFE4E6'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.3,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FDA4AF'
        }
      },
      qr: {
        size: 190,
        padding: 10,
        borderRadius: 12,
        frameThickness: 0,
        frameColor: '#881337',
        bgColor: '#FFFFFF',
        fgColor: '#881337',
        shadow: 'medium',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 32
      },
      logo: {
        enabled: true,
        url: '',
        size: 40,
        shape: 'circle',
        border: true,
        borderColor: '#FBBF24',
        borderWidth: 2,
        shadow: true,
        position: 'header'
      }
    }
  },

  // 19. Modern Gradient
  {
    id: 'modern_gradient',
    name: 'Modern Gradient',
    category: 'Contemporary',
    description: 'Dynamic sunset purple to rose gradient with high-contrast floating card.',
    thumbnailBg: '#4F46E5',
    config: {
      templateId: 'modern_gradient',
      shape: 'vertical_card',
      background: {
        type: 'gradient',
        color: '#4F46E5',
        gradientStart: '#4F46E5',
        gradientEnd: '#E11D48',
        gradientAngle: 135,
        texture: 'none',
        imageUrl: '',
        foodCategory: 'none',
        filters: { blur: 0, brightness: 100, contrast: 100, saturation: 100, overlayColor: '#000000', overlayOpacity: 0, zoom: 1.0, position: 'center' },
        opacity: 100
      },
      frame: { style: 'rounded', color: 'rgba(255,255,255,0.4)', width: 2, accentColor: '#FFFFFF' },
      lighting: { vignette: false, vignetteIntensity: 0, spotlight: false, glow: false, glowColor: '', grain: false, glassReflection: true },
      text: {
        restaurantName: 'The Foody Hub',
        tableNameFormat: 'Table {{table_name}}',
        scanText: 'Scan to View Menu & Order',
        welcomeText: 'Seamless Digital Dining',
        footerText: 'Powered by CleverOps',
        restaurantTypography: {
          fontFamily: 'Poppins, sans-serif',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: 0.2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        tableTypography: {
          fontFamily: 'Poppins, sans-serif',
          fontSize: 24,
          fontWeight: '800',
          letterSpacing: -0.2,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        scanTypography: {
          fontFamily: 'Poppins, sans-serif',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.2,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 9,
          fontWeight: 'normal',
          letterSpacing: 0.2,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: 'rgba(255,255,255,0.8)'
        }
      },
      qr: {
        size: 190,
        padding: 10,
        borderRadius: 14,
        frameThickness: 0,
        frameColor: '#4F46E5',
        bgColor: '#FFFFFF',
        fgColor: '#1E1B4B',
        shadow: 'medium',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 34
      },
      logo: {
        enabled: true,
        url: '',
        size: 42,
        shape: 'rounded',
        border: true,
        borderColor: '#FFFFFF',
        borderWidth: 2,
        shadow: true,
        position: 'header'
      }
    }
  },

  // 20. Glassmorphism
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    category: 'Contemporary',
    description: 'Translucent frosted glass layer with diffused blurred glow and sleek rim.',
    thumbnailBg: '#0F172A',
    config: {
      templateId: 'glassmorphism',
      shape: 'vertical_card',
      background: {
        type: 'gradient',
        color: '#0F172A',
        gradientStart: '#1E293B',
        gradientEnd: '#0F172A',
        gradientAngle: 160,
        texture: 'none',
        imageUrl: '',
        foodCategory: 'none',
        filters: { blur: 0, brightness: 100, contrast: 100, saturation: 100, overlayColor: '#000000', overlayOpacity: 0, zoom: 1.0, position: 'center' },
        opacity: 90
      },
      frame: { style: 'shadow_frame', color: 'rgba(255,255,255,0.25)', width: 1.5, accentColor: '#38BDF8' },
      lighting: { vignette: true, vignetteIntensity: 45, spotlight: false, glow: true, glowColor: '#38BDF8', grain: false, glassReflection: true },
      text: {
        restaurantName: 'The Foody Hub',
        tableNameFormat: 'Table {{table_name}}',
        scanText: 'Scan to View Menu & Order',
        welcomeText: 'Touchless Table Ordering',
        footerText: 'Powered by CleverOps',
        restaurantTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#FFFFFF'
        },
        tableTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 23,
          fontWeight: '800',
          letterSpacing: 0,
          lineHeight: 1.1,
          textAlign: 'center',
          textColor: '#38BDF8'
        },
        scanTypography: {
          fontFamily: 'Outfit, sans-serif',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.3,
          lineHeight: 1.3,
          textAlign: 'center',
          textColor: '#E2E8F0'
        },
        footerTypography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 8,
          fontWeight: 'normal',
          letterSpacing: 0.3,
          lineHeight: 1.2,
          textAlign: 'center',
          textColor: '#94A3B8'
        }
      },
      qr: {
        size: 190,
        padding: 10,
        borderRadius: 14,
        frameThickness: 0,
        frameColor: '#38BDF8',
        bgColor: '#FFFFFF',
        fgColor: '#0F172A',
        shadow: 'medium',
        position: 'center',
        eyeStyle: 'rounded',
        centerLogo: true,
        centerLogoSize: 32
      },
      logo: {
        enabled: true,
        url: '',
        size: 40,
        shape: 'rounded',
        border: true,
        borderColor: 'rgba(255,255,255,0.4)',
        borderWidth: 1.5,
        shadow: true,
        position: 'header'
      }
    }
  }
];

export function getTemplatePreset(templateId: QRTemplateId): QRTemplatePreset {
  return QR_TEMPLATES.find((t) => t.id === templateId) || QR_TEMPLATES[0]; // hype_burger default
}

export function applyTemplateToConfig(
  currentConfig: QRDesignConfig,
  templateId: QRTemplateId
): QRDesignConfig {
  const preset = getTemplatePreset(templateId);
  return {
    ...currentConfig,
    templateId,
    background: {
      ...currentConfig.background,
      ...(preset.config.background || {}),
      filters: {
        ...currentConfig.background.filters,
        ...(preset.config.background?.filters || {})
      }
    },
    lighting: {
      ...currentConfig.lighting,
      ...(preset.config.lighting || {})
    },
    frame: {
      ...currentConfig.frame,
      ...(preset.config.frame || {})
    },
    text: {
      ...currentConfig.text,
      badgeText: preset.config.text?.badgeText || currentConfig.text.badgeText,
      restaurantTypography: {
        ...currentConfig.text.restaurantTypography,
        ...(preset.config.text?.restaurantTypography || {})
      },
      tableTypography: {
        ...currentConfig.text.tableTypography,
        ...(preset.config.text?.tableTypography || {})
      },
      scanTypography: {
        ...currentConfig.text.scanTypography,
        ...(preset.config.text?.scanTypography || {})
      },
      footerTypography: {
        ...currentConfig.text.footerTypography,
        ...(preset.config.text?.footerTypography || {})
      }
    },
    qr: {
      ...currentConfig.qr,
      ...(preset.config.qr || {})
    },
    logo: {
      ...currentConfig.logo,
      ...(preset.config.logo || {})
    },
    stickers: preset.config.stickers || currentConfig.stickers
  };
}
