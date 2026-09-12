export type QRTemplateId =
  | 'minimal_white'
  | 'elegant_black_gold'
  | 'emerald_green'
  | 'wooden_cafe'
  | 'luxury_marble'
  | 'neon_night'
  | 'rustic_brown'
  | 'premium_red'
  | 'modern_gradient'
  | 'glassmorphism';

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
  | 'shadow_frame';

export type QRTexturePattern =
  | 'none'
  | 'marble'
  | 'wood'
  | 'dark_texture'
  | 'emerald_pattern'
  | 'paper';

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
  fontWeight: 'normal' | '500' | '600' | 'bold' | '800';
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  textColor: string;
}

export interface QRTextConfig {
  restaurantName: string;
  tableNameFormat: string; // e.g. "{{table_name}}" or "Table {{table_name}}"
  scanText: string;
  welcomeText: string;
  footerText: string;
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

export interface QRBackgroundConfig {
  type: 'solid' | 'gradient' | 'texture' | 'image';
  color: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  texture: QRTexturePattern;
  imageUrl: string;
  opacity: number; // 0 - 100
}

export interface QRFrameConfig {
  style: QRFrameStyle;
  color: string;
  width: number;
  accentColor?: string;
}

export interface QRCanvasElement {
  id: string;
  type: 'logo' | 'restaurant_name' | 'table_name' | 'qr_code' | 'scan_text' | 'footer' | 'badge';
  x: number; // percentage or px
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
  frame: QRFrameConfig;
  advanced: {
    editorMode: 'preset' | 'canva';
    showSafeZone: boolean;
    showRuler: boolean;
    showGrid: boolean;
    snapToGuides: boolean;
    customElements: QRCanvasElement[];
  };
  updatedAt?: string;
}

export interface QRTemplatePreset {
  id: QRTemplateId;
  name: string;
  category: string;
  description: string;
  thumbnailBg: string;
  config: Partial<QRDesignConfig>;
}
