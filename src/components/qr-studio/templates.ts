import { QRDesignConfig, QRTemplatePreset, QRTemplateId } from './types';

export const FONT_OPTIONS = [
  { label: 'Plus Jakarta Sans (Modern Clean)', value: 'Plus Jakarta Sans, sans-serif' },
  { label: 'Inter (High Legibility)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Playfair Display (Luxury Serif)', value: 'Playfair Display, Georgia, serif' },
  { label: 'Cinzel (Royal Classical)', value: 'Cinzel, Georgia, serif' },
  { label: 'Outfit (Trendy Geometric)', value: 'Outfit, sans-serif' },
  { label: 'Montserrat (Bold Architectural)', value: 'Montserrat, sans-serif' },
  { label: 'Poppins (Friendly Contemporary)', value: 'Poppins, sans-serif' },
  { label: 'Caveat (Casual Artisan Script)', value: 'Caveat, cursive' }
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
  { id: 'shadow_frame', label: 'Deep Drop Shadow', desc: 'Floating elevated effect' }
];

export const PRINT_SIZE_OPTIONS = [
  { id: '5x5', label: '5 × 5 cm', desc: 'Compact sticker / Bar counter', widthMm: 50, heightMm: 50 },
  { id: '8x8', label: '8 × 8 cm', desc: 'Standard table disc / Coaster', widthMm: 80, heightMm: 80 },
  { id: '10x10', label: '10 × 10 cm', desc: 'Large VIP table sticker', widthMm: 100, heightMm: 100 },
  { id: 'A5', label: 'A5 (14.8 × 21 cm)', desc: 'Standing acrylic display card', widthMm: 148, heightMm: 210 },
  { id: 'A4_sheet', label: 'A4 Multi-QR Sheet', desc: 'Print 6–8 table cards per page', widthMm: 210, heightMm: 297 }
];

export const DEFAULT_QR_CONFIG: QRDesignConfig = {
  version: 1,
  templateId: 'emerald_green',
  shape: 'vertical_card',
  selectedPrintSize: '8x8',
  text: {
    restaurantName: 'The Foody Hub',
    tableNameFormat: 'Table {{table_name}}',
    scanText: 'Scan to View Menu & Order',
    welcomeText: 'Contactless Digital Dining',
    footerText: 'Powered by CleverOps • Instant Kitchen Dispatch',
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
      textColor: '#34D399' // Bright emerald
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
    size: 190,
    padding: 12,
    borderRadius: 12,
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
    opacity: 95
  },
  frame: {
    style: 'rounded',
    color: '#10B981',
    width: 2,
    accentColor: '#34D399'
  },
  advanced: {
    editorMode: 'preset',
    showSafeZone: false,
    showRuler: false,
    showGrid: false,
    snapToGuides: true,
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
  // 1. Minimal White
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
        opacity: 100
      },
      frame: { style: 'minimal', color: '#E2E8F0', width: 1.5 },
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

  // 2. Elegant Black Gold
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
        opacity: 100
      },
      frame: { style: 'elegant', color: '#D4AF37', width: 2, accentColor: '#F59E0B' },
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

  // 3. Emerald Green (Default CleverOps)
  {
    id: 'emerald_green',
    name: 'Emerald Green (Default)',
    category: 'Brand Signature',
    description: 'CleverOps signature deep emerald gradient with crisp white and mint accents.',
    thumbnailBg: '#064E3B',
    config: DEFAULT_QR_CONFIG
  },

  // 4. Wooden Cafe
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
        opacity: 95
      },
      frame: { style: 'double', color: '#FBBF24', width: 2, accentColor: '#D97706' },
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

  // 5. Luxury Marble
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
        opacity: 100
      },
      frame: { style: 'elegant', color: '#B45309', width: 2, accentColor: '#D97706' },
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

  // 6. Neon Night
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
        opacity: 100
      },
      frame: { style: 'neon', color: '#06B6D4', width: 2, accentColor: '#A855F7' },
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

  // 7. Rustic Brown
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
        opacity: 95
      },
      frame: { style: 'rounded', color: '#FED7AA', width: 2, accentColor: '#FDBA74' },
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

  // 8. Premium Red
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
        opacity: 95
      },
      frame: { style: 'elegant', color: '#FBBF24', width: 2, accentColor: '#F59E0B' },
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

  // 9. Modern Gradient
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
        opacity: 100
      },
      frame: { style: 'rounded', color: 'rgba(255,255,255,0.4)', width: 2, accentColor: '#FFFFFF' },
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

  // 10. Glassmorphism
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
        opacity: 90
      },
      frame: { style: 'shadow_frame', color: 'rgba(255,255,255,0.25)', width: 1.5, accentColor: '#38BDF8' },
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
  return QR_TEMPLATES.find((t) => t.id === templateId) || QR_TEMPLATES[2]; // emerald_green default
}

export function applyTemplateToConfig(
  currentConfig: QRDesignConfig,
  templateId: QRTemplateId
): QRDesignConfig {
  const preset = getTemplatePreset(templateId);
  return {
    ...currentConfig,
    templateId,
    background: { ...currentConfig.background, ...(preset.config.background || {}) },
    frame: { ...currentConfig.frame, ...(preset.config.frame || {}) },
    text: {
      ...currentConfig.text,
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
    }
  };
}
