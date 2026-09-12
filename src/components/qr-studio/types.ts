export type QRTemplateId =
  // Classic 10
  | 'minimal_white'
  | 'elegant_black_gold'
  | 'emerald_green'
  | 'wooden_cafe'
  | 'luxury_marble'
  | 'neon_night'
  | 'rustic_brown'
  | 'premium_red'
  | 'modern_gradient'
  | 'glassmorphism'
  // Gen-Z & Food Poster 10
  | 'hype_burger'
  | 'matcha_aesthetic'
  | 'korean_cafe'
  | 'cyber_neon'
  | 'street_food'
  | 'luxury_black'
  | 'candy_pop'
  | 'retro_diner'
  | 'midnight_lounge'
  | 'social_media_viral';

export type QRCardShape =
  | 'square'
  | 'rounded_square'
  | 'circle'
  | 'vertical_card'
  | 'horizontal_card'
  | 'table_tent'
  | 'standee';

export type QRFrameStyle =
  | 'rounded'
  | 'sharp'
  | 'double'
  | 'neon'
  | 'elegant'
  | 'minimal'
  | 'shadow_frame'
  | 'checker'
  | 'torn_edge'
  | 'brush_stroke';

export type QRTexturePattern =
  | 'none'
  | 'marble'
  | 'wood'
  | 'dark_texture'
  | 'emerald_pattern'
  | 'paper'
  | 'grain'
  | 'dots';

export type QRFoodCategory =
  | 'none'
  | 'fast_food'
  | 'cafe'
  | 'indian'
  | 'asian'
  | 'dessert'
  | 'luxury';

export type QRPrintSize =
  | '5x5'
  | '8x8'
  | '10x10'
  | 'A5'
  | 'A4_sheet';

export type QRPreviewMode =
  | 'card'
  | 'mobile'
  | 'sticker'
  | 'table_tent'
  | 'sheet';

export interface QRTypography {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | '500' | '600' | '700' | 'bold' | '800' | '900';
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  textColor: string;
  textShadow?: string;
}

export interface QRTextConfig {
  restaurantName: string;
  tableNameFormat: string; // e.g. "{{table_name}}" or "Table {{table_name}}"
  scanText: string;
  welcomeText: string;
  footerText: string;
  badgeText?: string; // e.g. "⭐ 4.9 RATED" or "CHEF'S SPECIAL"
  restaurantTypography: QRTypography;
  tableTypography: QRTypography;
  scanTypography: QRTypography;
  footerTypography: QRTypography;
}

export interface QRAppearance {
  size: number; // 120 - 320
  padding: number; // quiet zone 4 - 32
  borderRadius: number; // 0 - 32
  frameThickness: number; // 0 - 12
  frameColor: string;
  bgColor: string;
  fgColor: string;
  shadow: 'none' | 'soft' | 'medium' | 'glow';
  position: 'top' | 'center' | 'bottom';
  eyeStyle: 'square' | 'rounded' | 'circle';
  centerLogo: boolean;
  centerLogoSize: number; // 20 - 64
}

export interface QRLogoConfig {
  enabled: boolean;
  url: string;
  size: number; // 32 - 120
  shape: 'circle' | 'rounded' | 'square';
  border: boolean;
  borderColor: string;
  borderWidth: number;
  shadow: boolean;
  position: 'header' | 'above_qr' | 'center_qr' | 'footer';
}

export interface QRBackgroundFilterConfig {
  blur: number; // 0 - 20px
  brightness: number; // 50 - 150%
  contrast: number; // 50 - 150%
  saturation: number; // 0 - 200%
  overlayColor: string; // e.g. '#000000'
  overlayOpacity: number; // 0 - 100%
  zoom: number; // 1.0 - 2.0
  position: 'center' | 'top' | 'bottom';
}

export interface QRLightingConfig {
  vignette: boolean;
  vignetteIntensity?: number; // 0 - 100
  vignetteStrength?: number; // 0 - 100
  spotlight: boolean;
  glow: boolean;
  glowColor: string;
  grain: boolean;
  glassReflection?: boolean;
}

export interface QRBackgroundConfig {
  type: 'solid' | 'gradient' | 'texture' | 'image' | 'food_photo';
  color: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  texture: QRTexturePattern;
  imageUrl: string;
  foodCategory: QRFoodCategory;
  filters: QRBackgroundFilterConfig;
  opacity: number; // 0 - 100
}

export interface QRFrameConfig {
  style: QRFrameStyle;
  color: string;
  width: number;
  accentColor?: string;
}

export interface QRStickerItem {
  id: string;
  stickerId?: string;
  category?: string;
  content: string; // emoji, SVG, or text badge
  type: 'emoji' | 'svg' | 'badge';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
  scale?: number;
  bgColor?: string;
  textColor?: string;
  x?: number; // 0 - 100 percentage
  y?: number; // 0 - 100 percentage
  size?: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
}

export interface QRCanvasElement {
  id: string;
  type: 'logo' | 'restaurant_name' | 'table_name' | 'qr_code' | 'scan_text' | 'footer' | 'badge';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
  zIndex: number;
  locked: boolean;
}

export interface QRDesignConfig {
  version: number;
  templateId: QRTemplateId;
  shape: QRCardShape;
  selectedPrintSize: QRPrintSize;
  text: QRTextConfig;
  qr: QRAppearance;
  logo: QRLogoConfig;
  background: QRBackgroundConfig;
  lighting: QRLightingConfig;
  frame: QRFrameConfig;
  stickers: QRStickerItem[];
  advanced: {
    editorMode: 'preset' | 'canva';
    showSafeZone: boolean;
    showRuler: boolean;
    showGrid: boolean;
    snapToGuides: boolean;
    animatedPreview: boolean; // steam/sparkle in preview
    customElements: QRCanvasElement[];
  };
  updatedAt?: string;
}

export interface QRTemplatePreset {
  id: QRTemplateId;
  name: string;
  category: 'Gen-Z & Trendy' | 'Food Poster' | 'Brand Signature' | 'Luxury' | 'Minimalist' | 'Artisan' | 'Vibrant' | 'Contemporary';
  description: string;
  thumbnailBg: string;
  thumbnailImage?: string;
  config: Partial<QRDesignConfig>;
}
