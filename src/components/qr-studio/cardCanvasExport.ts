import JSZip from 'jszip';
import { QRDesignConfig } from './types';
import { generateStyledQRDataURL } from './qrGenerator';
import { QR_THEMES_CONFIG } from './qrThemesConfig';

interface TablePrintItem {
  id: string;
  name: string;
  url: string;
}

/**
 * Draws a single branded QR Card onto a high-resolution HTML5 Canvas (300 DPI)
 */
export async function renderQRCardToCanvas(
  config: QRDesignConfig,
  table: TablePrintItem,
  targetWidth = 1000,
  targetHeight?: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');

  // 1. Resolve Theme Config
  const subCat = config.subCategory || 'rajasthani_thali';
  const activeTheme = QR_THEMES_CONFIG[subCat] || QR_THEMES_CONFIG['rajasthani_thali'];

  // Compute height based on aspect ratio
  let height = targetHeight || 1500;
  if (config.aspectRatio === '3x3' || config.shape === 'square' || config.shape === 'rounded_square' || config.shape === 'circle') {
    height = targetWidth;
  } else if (config.aspectRatio === 'A4') {
    height = Math.round(targetWidth * 1.414);
  } else if (config.aspectRatio === '4x6') {
    height = Math.round(targetWidth * 1.5);
  } else if (config.shape === 'horizontal_card') {
    height = Math.round(targetWidth * (3 / 4));
  } else if (config.shape === 'standee') {
    height = Math.round(targetWidth * (16 / 9));
  } else if (config.shape === 'table_tent') {
    height = Math.round(targetWidth * (5 / 4));
  } else {
    height = Math.round(targetWidth * (4.1 / 3));
  }

  canvas.width = targetWidth;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const scale = targetWidth / 320;

  // 1. Clip Shape if circle or rounded
  ctx.save();
  const radius = config.aspectRatio === '3x3' || config.shape === 'circle'
    ? 24 * scale
    : 20 * scale;

  ctx.beginPath();
  drawRoundedRect(ctx, 0, 0, targetWidth, height, radius);
  ctx.clip();

  // 2. Background Base (Gradient / Solid / Texture)
  const bgType = config.bgTextureStyle || config.background.type || 'gradient';
  if (bgType === 'gradient') {
    const angleRad = ((config.background.gradientAngle || activeTheme.bgStyle.gradientAngle || 145) * Math.PI) / 180;
    const x2 = Math.cos(angleRad) * targetWidth;
    const y2 = Math.sin(angleRad) * height;
    const grad = ctx.createLinearGradient(0, 0, Math.abs(x2), Math.abs(y2));
    grad.addColorStop(0, config.background.gradientStart || activeTheme.bgStyle.gradientStart || activeTheme.colors.primary);
    grad.addColorStop(1, config.background.gradientEnd || activeTheme.bgStyle.gradientEnd || '#111827');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetWidth, height);
  } else {
    ctx.fillStyle = config.background.color || activeTheme.colors.primary || '#111827';
    ctx.fillRect(0, 0, targetWidth, height);
  }

  // 2a. Cultural / Atmosphere Theme Background Layer
  let culturalBgUrl = config.customCulturalBgUrl || '';
  if (!culturalBgUrl && config.selectedCulturalBgIndex !== -1) {
    const cIdx = config.selectedCulturalBgIndex ?? 0;
    culturalBgUrl = activeTheme.culturalBackgrounds?.[cIdx]?.imageUrl || activeTheme.culturalBackgrounds?.[0]?.imageUrl || '';
  }

  if (culturalBgUrl && config.heroDisplayMode !== 'wallpaper') {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        const imgAspect = img.width / img.height;
        const canvasAspect = targetWidth / height;
        let drawW = targetWidth;
        let drawH = height;
        if (canvasAspect > imgAspect) {
          drawH = targetWidth / imgAspect;
        } else {
          drawW = height * imgAspect;
        }
        const drawX = (targetWidth - drawW) / 2;
        const drawY = (height - drawH) / 2;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Dark legibility gradient
        const legibilityGrad = ctx.createLinearGradient(0, 0, 0, height);
        legibilityGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        legibilityGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.3)');
        legibilityGrad.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        ctx.fillStyle = legibilityGrad;
        ctx.fillRect(0, 0, targetWidth, height);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = culturalBgUrl;
    });
  }

  // 2b. Hero Image Resolution (with Per-Table Override support)
  let heroImgUrl = '';
  if (config.tableImageOverrides) {
    const rawNum = table.name.replace(/^Table\s*/i, '').trim();
    heroImgUrl = 
      config.tableImageOverrides[table.id] || 
      config.tableImageOverrides[table.name] || 
      config.tableImageOverrides[rawNum] || 
      config.tableImageOverrides[`Table ${rawNum}`] || '';
  }
  const rawNum = parseInt(table.name.replace(/\D/g, ''), 10);
  const presets = activeTheme.dishPresets || [];

  // Distinct food per table rotation
  if (!heroImgUrl && !isNaN(rawNum) && rawNum > 0 && presets.length > 0) {
    const offset = (rawNum - 1) % presets.length;
    heroImgUrl = presets[offset]?.imageUrl || presets[0]?.imageUrl || '';
  }
  if (!heroImgUrl && config.customDishUrl) {
    heroImgUrl = config.customDishUrl;
  }
  if (!heroImgUrl && typeof config.selectedDishIndex === 'number' && presets[config.selectedDishIndex]) {
    heroImgUrl = presets[config.selectedDishIndex].imageUrl;
  }
  if (!heroImgUrl && config.gridDishImages?.[0]) {
    heroImgUrl = config.gridDishImages[0];
  }
  if (!heroImgUrl) {
    heroImgUrl = config.background.imageUrl || presets[0]?.imageUrl || '';
  }

  // 2c. Full-Bleed Wallpaper Background Mode
  if (config.heroDisplayMode === 'wallpaper' && heroImgUrl) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        const blur = (config.bgBlur || 0) * scale * 0.4;
        if (blur > 0) {
          try {
            ctx.filter = `blur(${Math.round(blur)}px)`;
          } catch (e) {
            // continue
          }
        }
        const zoom = (config.heroImageZoom || 100) / 100;
        const imgAspect = img.width / img.height;
        const canvasAspect = targetWidth / height;
        let drawW = targetWidth * zoom;
        let drawH = height * zoom;
        if (canvasAspect > imgAspect) {
          drawH = (targetWidth / imgAspect) * zoom;
        } else {
          drawW = (height * imgAspect) * zoom;
        }
        const drawX = (targetWidth - drawW) / 2 + (config.heroOffsetX || 0) * scale;
        const drawY = (height - drawH) / 2 + (config.heroOffsetY || 0) * scale;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Overlay Tint
        ctx.save();
        ctx.fillStyle = config.bgOverlayColor || '#000000';
        ctx.globalAlpha = (config.bgOverlayOpacity ?? 35) / 100;
        ctx.fillRect(0, 0, targetWidth, height);
        ctx.restore();

        resolve();
      };
      img.onerror = () => resolve();
      img.src = heroImgUrl;
    });
  }

  // 2d. Lighting Effects (Vignette)
  if (config.lighting?.vignette) {
    ctx.save();
    const radGrad = ctx.createRadialGradient(
      targetWidth / 2,
      height / 2,
      targetWidth * 0.25,
      targetWidth / 2,
      height / 2,
      targetWidth * 0.75
    );
    radGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, targetWidth, height);
    ctx.restore();
  }

  // 3. Pre-load Images & Generate QR
  const qrDataUrl = await generateStyledQRDataURL({
    url: table.url,
    appearance: {
      ...config.qr,
      fgColor: config.qr.fgColor || activeTheme.colors.qrFg,
      bgColor: config.qr.bgColor || activeTheme.colors.qrBg
    },
    logoUrl: config.logo?.enabled ? config.logo.url : undefined,
    scale: 3
  });

  const sanitizeDishUrl = (url: string | undefined, fallback: string) => {
    if (!url || url.includes('images.unsplash.com')) return fallback;
    return url;
  };

  const rawTableNum = parseInt(table.name.replace(/\D/g, ''), 10);
  const tableOffset = (!isNaN(rawTableNum) && rawTableNum > 0) ? (rawTableNum - 1) : 0;
  const themePresets = activeTheme.dishPresets || [];

  let dish1Url = heroImgUrl;
  let dish2Url = '';
  let dish3Url = '';

  if (themePresets.length > 0 && !isNaN(rawTableNum) && rawTableNum > 1) {
    dish1Url = heroImgUrl || themePresets[tableOffset % themePresets.length]?.imageUrl || '/dish-presets/3d/rajasthani_thali_3d.png';
    dish2Url = themePresets[(tableOffset + 1) % themePresets.length]?.imageUrl || '/dish-presets/3d/dhaba_chai_samosa_3d.png';
    dish3Url = themePresets[(tableOffset + 2) % themePresets.length]?.imageUrl || '/dish-presets/3d/north_indian_paneer_tikka_3d.png';
  } else {
    dish1Url = sanitizeDishUrl(config.gridDishImages?.[0] || heroImgUrl, '/dish-presets/3d/rajasthani_thali_3d.png');
    dish2Url = sanitizeDishUrl(config.gridDishImages?.[1] || themePresets[1]?.imageUrl, '/dish-presets/3d/dhaba_chai_samosa_3d.png');
    dish3Url = sanitizeDishUrl(config.gridDishImages?.[2] || themePresets[2]?.imageUrl, '/dish-presets/3d/north_indian_paneer_tikka_3d.png');
  }

  const [qrImg, heroImg, dish2Img, dish3Img, logoImg] = await Promise.all([
    loadImage(qrDataUrl),
    loadImage(dish1Url),
    loadImage(dish2Url),
    loadImage(dish3Url),
    config.logo.enabled && config.logo.url ? loadImage(config.logo.url) : Promise.resolve(null)
  ]);

  const dishImgs = [heroImg, dish2Img, dish3Img];

  // Dynamic Table Name
  const formatRaw = config.text.tableNameFormat || 'Table {{table_name}}';
  const resolvedTable = formatRaw.includes('{{table_name}}')
    ? formatRaw.replace(/\{\{table_name\}\}/g, table.name.replace(/^Table\s*/i, ''))
    : `${formatRaw} ${table.name.replace(/^Table\s*/i, '')}`;

  const isSticker = config.aspectRatio === '3x3';
  const qrBaseSize = config.qrCardSize || (isSticker ? 160 : 165);
  const qrBoxSize = qrBaseSize * scale;
  const qrOffX = (config.qrOffsetX || 0) * scale;
  const qrOffY = (config.qrOffsetY || 0) * scale;
  const cardOpacity = (config.cardBgOpacity ?? 80) / 100;
  const hScale = (config.headerScale ?? 100) / 100;
  const fScale = (config.footerScale ?? 100) / 100;
  const hOffY = (config.headerOffsetY || 0) * scale;
  const fOffY = (config.footerOffsetY || 0) * scale;

  const layout = config.studioLayout || 'table_tent_classic';

  // =========================================================================
  // LAYOUT BRANCH 1: MULTI-DISH FLOATING ORBIT (Reference 1: Rizwan Rolls)
  // =========================================================================
  if (layout === 'corner_bowls') {
    // Top Arched High-Contrast Restaurant Banner (Guarantees 100% Readability)
    const bannerW = Math.min(targetWidth * 0.96, targetWidth * 0.9 * hScale);
    const bannerH = 68 * scale * hScale;
    const bannerX = (targetWidth - bannerW) / 2;
    const bannerY = 20 * scale + hOffY;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 14 * scale;
    ctx.shadowOffsetY = 6 * scale;
    ctx.fillStyle = `rgba(255, 255, 255, ${cardOpacity})`;
    drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 24 * scale * hScale);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5 * scale;
    drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 24 * scale * hScale);
    ctx.stroke();

    // Restaurant Name
    ctx.fillStyle = '#0F172A';
    ctx.font = `900 ${Math.round(18 * scale * hScale)}px ${activeTheme.typography.headingFont || 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.fillText(config.text.restaurantName || 'SmartDine Restaurant', targetWidth / 2, bannerY + bannerH * 0.42);

    // Tagline / Subtitle
    ctx.fillStyle = '#D97706';
    ctx.font = `800 ${Math.round(10 * scale * hScale)}px sans-serif`;
    ctx.fillText((config.tagline || 'Hot & Fresh • Fast Order').toUpperCase(), targetWidth / 2, bannerY + bannerH * 0.72);
    ctx.restore();

    // Starburst "SCAN MENU" Callout (Top-Left - Editable & Deletable SS2)
    if (!config.hideTopBadge) {
      ctx.save();
      const sbX = 26 * scale;
      const sbY = 96 * scale;
      ctx.translate(sbX, sbY);
      ctx.rotate((-12 * Math.PI) / 180);
      const sbW = 72 * scale;
      const sbH = 30 * scale;
      ctx.fillStyle = '#9A3412';
      drawRoundedRect(ctx, -sbW / 2, -sbH / 2, sbW, sbH, sbH / 2);
      ctx.fill();
      ctx.strokeStyle = '#FED7AA';
      ctx.lineWidth = 1.5 * scale;
      drawRoundedRect(ctx, -sbW / 2, -sbH / 2, sbW, sbH, sbH / 2);
      ctx.stroke();

      ctx.fillStyle = '#FFF7ED';
      ctx.font = `900 ${Math.round(8.5 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const mainText = config.topBadgeText || 'SCAN MENU';
      const subText = config.topBadgeSubText || 'Fast Order';
      if (subText) {
        ctx.fillText(mainText, 0, -4 * scale);
        ctx.font = `600 ${Math.round(7 * scale)}px sans-serif`;
        ctx.fillText(subText, 0, 5 * scale);
      } else {
        ctx.fillText(mainText, 0, 0);
      }
      ctx.restore();
    }

    // Floating Orbiting Circular Dishes (Reference 1 - Moveable, Scalable & Deletable - SS5)
    const orbitStyle = config.orbitDishStyle || 'transparent_cutout';

    // Orbit Dish 1: Top Right
    if (!config.hideOrbitDish1 && (heroImg || dish2Img)) {
      const d1X = targetWidth - (26 - (config.orbitDish1X || 0)) * scale;
      const d1Y = (120 + (config.orbitDish1Y || 0)) * scale;
      const d1R = 42 * scale * ((config.orbitDish1Scale || 100) / 100);
      drawCircularDish(ctx, heroImg || dish2Img, d1X, d1Y, d1R, '#D4AF37', scale, orbitStyle);
    }
    // Orbit Dish 2: Bottom Left
    if (!config.hideOrbitDish2 && (dish2Img || heroImg)) {
      const d2X = (32 + (config.orbitDish2X || 0)) * scale;
      const d2Y = height - (110 - (config.orbitDish2Y || 0)) * scale;
      const d2R = 45 * scale * ((config.orbitDish2Scale || 100) / 100);
      drawCircularDish(ctx, dish2Img || heroImg, d2X, d2Y, d2R, '#F59E0B', scale, orbitStyle);
    }
    // Orbit Dish 3: Bottom Right
    if (!config.hideOrbitDish3 && (dish3Img || heroImg)) {
      const d3X = targetWidth - (28 - (config.orbitDish3X || 0)) * scale;
      const d3Y = height - (95 - (config.orbitDish3Y || 0)) * scale;
      const d3R = 48 * scale * ((config.orbitDish3Scale || 100) / 100);
      drawCircularDish(ctx, dish3Img || heroImg, d3X, d3Y, d3R, '#D4AF37', scale, orbitStyle);
    }

    // Center QR Card
    const qrCenterY = height * 0.52 + qrOffY;
    drawQRCardBox(ctx, qrImg, targetWidth / 2 + qrOffX, qrCenterY, qrBoxSize, config, activeTheme, scale);

    // Bottom Table Badge Pill (Editable & Deletable SS2)
    if (!config.hideFooterBadge) {
      const botPillW = Math.min(targetWidth * 0.96, targetWidth * 0.88 * fScale);
      const hasSub = !!config.footerSubText;
      const botPillH = (hasSub ? 28 : 24) * scale * fScale;
      const botPillY = height - botPillH - (14 * scale - fOffY);
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${cardOpacity})`;
      drawRoundedRect(ctx, (targetWidth - botPillW) / 2, botPillY, botPillW, botPillH, botPillH / 2);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1 * scale;
      drawRoundedRect(ctx, (targetWidth - botPillW) / 2, botPillY, botPillW, botPillH, botPillH / 2);
      ctx.stroke();

      ctx.fillStyle = '#1E293B';
      ctx.font = `800 ${Math.round(9.5 * scale * fScale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fBrand = config.text.footerText ? `• ${config.text.footerText}` : '';
      if (hasSub) {
        ctx.fillText(`${resolvedTable.toUpperCase()} ${fBrand}`, targetWidth / 2, botPillY + botPillH * 0.38);
        ctx.fillStyle = '#64748B';
        ctx.font = `700 ${Math.round(7 * scale * fScale)}px sans-serif`;
        ctx.fillText(config.footerSubText!.toUpperCase(), targetWidth / 2, botPillY + botPillH * 0.72);
      } else {
        ctx.fillText(`${resolvedTable.toUpperCase()} ${fBrand}`, targetWidth / 2, botPillY + botPillH / 2 + 1);
      }
      ctx.restore();
    }
  }

  // =========================================================================
  // LAYOUT BRANCH 2: DARK CINEMA & GOLD FRAME (Reference 4: Read Our Menu)
  // =========================================================================
  else if (layout === 'three_dish_grid') {
    // Double Gold Border
    ctx.save();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3 * scale;
    drawRoundedRect(ctx, 4 * scale, 4 * scale, targetWidth - 8 * scale, height - 8 * scale, radius - 2 * scale);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1.5 * scale;
    drawRoundedRect(ctx, 10 * scale, 10 * scale, targetWidth - 20 * scale, height - 20 * scale, radius - 6 * scale);
    ctx.stroke();
    ctx.restore();

    // Top 32% Food Photography Banner
    const topH = height * 0.32;
    if (heroImg) {
      ctx.save();
      ctx.beginPath();
      drawRoundedRect(ctx, 0, 0, targetWidth, topH, 0);
      ctx.clip();
      ctx.drawImage(heroImg, 0, 0, targetWidth, topH);

      const topGrad = ctx.createLinearGradient(0, 0, 0, topH);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, targetWidth, topH);

      // Restaurant Name in top banner
      ctx.fillStyle = '#FBBF24';
      ctx.font = `900 ${Math.round(11 * scale * hScale)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText((config.text.restaurantName || 'SmartDine').toUpperCase(), 20 * scale, 24 * scale + hOffY);
      ctx.restore();
    }

    // Bottom 32% Food Photography Banner
    const botH = height * 0.32;
    const botY = height - botH;
    const bImg = dish2Img || heroImg;
    if (bImg) {
      ctx.save();
      ctx.beginPath();
      drawRoundedRect(ctx, 0, botY, targetWidth, botH, 0);
      ctx.clip();
      ctx.drawImage(bImg, 0, botY, targetWidth, botH);

      const bGrad = ctx.createLinearGradient(0, botY, 0, height);
      bGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
      bGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = bGrad;
      ctx.fillRect(0, botY, targetWidth, botH);

      // Bottom Table footer text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `800 ${Math.round(10 * scale * fScale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${resolvedTable.toUpperCase()} • ${config.text.footerText || 'Instant Kitchen Order'}`, targetWidth / 2, height - (16 * scale - fOffY));
      ctx.restore();
    }

    // Center Black Focus Band with Giant Gold "MENU"
    const centerH = height * 0.36;
    const centerY = topH;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.96)';
    ctx.fillRect(0, centerY, targetWidth, centerH);

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(targetWidth, centerY);
    ctx.moveTo(0, centerY + centerH);
    ctx.lineTo(targetWidth, centerY + centerH);
    ctx.stroke();

    // "READ OUR" Subtitle
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${Math.round(9 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('READ OUR', targetWidth / 2, centerY + 18 * scale);

    // Giant Gold "MENU"
    ctx.fillStyle = '#F59E0B';
    ctx.font = `900 ${Math.round(24 * scale)}px Georgia, serif`;
    ctx.fillText('MENU', targetWidth / 2, centerY + 42 * scale);
    ctx.restore();

    // Center QR Card
    const cinemaQRSize = isSticker ? 135 * scale : 145 * scale;
    const cinemaQRCenterY = centerY + centerH * 0.62 + qrOffY;
    drawQRCardBox(ctx, qrImg, targetWidth / 2 + qrOffX, cinemaQRCenterY, cinemaQRSize, config, activeTheme, scale);

    // Playful callout "Scan it, Enjoy ➜"
    ctx.save();
    ctx.fillStyle = '#FCD34D';
    ctx.font = `italic 700 ${Math.round(10.5 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Scan it, Enjoy  ➜', targetWidth / 2 + qrOffX, cinemaQRCenterY + cinemaQRSize / 2 + 18 * scale);
    ctx.restore();
  }

  // =========================================================================
  // LAYOUT BRANCH 3: HERO PHOTO TOP BLEED (Reference 3: Scan Our Menu)
  // =========================================================================
  else if (layout === 'split_luxury') {
    // Top 52% Food Photo Bleed
    const bleedH = height * 0.52;
    if (heroImg) {
      ctx.save();
      ctx.beginPath();
      drawRoundedRect(ctx, 0, 0, targetWidth, bleedH, 0);
      ctx.clip();
      ctx.drawImage(heroImg, 0, 0, targetWidth, bleedH);

      const bleedGrad = ctx.createLinearGradient(0, 0, 0, bleedH);
      bleedGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
      bleedGrad.addColorStop(0.7, 'rgba(0,0,0,0.1)');
      bleedGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = bleedGrad;
      ctx.fillRect(0, 0, targetWidth, bleedH);

      // White Brand Name Top Left
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${Math.round(12 * scale * hScale)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText((config.text.restaurantName || 'SmartDine').toUpperCase(), 20 * scale, 26 * scale + hOffY);
      ctx.restore();
    }

    // Bottom 48% Clean Card (with opacity support)
    const lowerY = bleedH;
    const lowerH = height - lowerY;
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${cardOpacity})`;
    ctx.fillRect(0, lowerY, targetWidth, lowerH);
    ctx.restore();

    // Intersecting QR Card at the boundary
    const splitQRSize = isSticker ? 140 * scale : 155 * scale;
    const splitQRCenterY = bleedH + 6 * scale + qrOffY;
    drawQRCardBox(ctx, qrImg, targetWidth / 2 + qrOffX, splitQRCenterY, splitQRSize, config, activeTheme, scale);

    // Lower Card Typography: "SCAN OUR MENU"
    ctx.save();
    const textBaseY = splitQRCenterY + splitQRSize / 2 + 24 * scale;
    ctx.fillStyle = '#0F172A';
    ctx.font = `900 ${Math.round(14 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('SCAN OUR MENU', targetWidth / 2, textBaseY);

    // Table Name Pill
    ctx.fillStyle = activeTheme.colors.secondary || '#D97706';
    ctx.font = `800 ${Math.round(11 * scale)}px sans-serif`;
    ctx.fillText(resolvedTable.toUpperCase(), targetWidth / 2, textBaseY + 18 * scale);

    // Footer info
    ctx.fillStyle = '#64748B';
    ctx.font = `600 ${Math.round(8.5 * scale * fScale)}px sans-serif`;
    ctx.fillText(config.openingHours ? `Open: ${config.openingHours}` : (config.text.footerText || 'Contactless Mobile Ordering'), targetWidth / 2, height - (14 * scale - fOffY));
    ctx.restore();
  }

  // =========================================================================
  // LAYOUT BRANCH 4: VINTAGE KRAFT CAFE & ARTISAN SKETCH (Reference 2: Menu Cafe)
  // =========================================================================
  else if (layout === 'minimal_lineart') {
    // Kraft paper warm tone base (customizable tint - SS2)
    ctx.save();
    ctx.fillStyle = config.kraftPaperTint || config.background.color || '#C5A880';
    ctx.fillRect(0, 0, targetWidth, height);
    ctx.restore();

    // Top Header: Elegant Script "Menu" or Restaurant Name
    let currentY = 28 * scale + hOffY;
    if (logoImg) {
      const lSize = 34 * scale * hScale;
      ctx.save();
      ctx.beginPath();
      ctx.arc(targetWidth / 2, currentY + lSize / 2, lSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, targetWidth / 2 - lSize / 2, currentY, lSize, lSize);
      ctx.restore();
      currentY += lSize + 8 * scale * hScale;
    }

    ctx.save();
    ctx.fillStyle = '#451A03';
    ctx.font = `italic 900 ${Math.round(22 * scale * hScale)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(config.text.restaurantName || 'Menu', targetWidth / 2, currentY + 16 * scale * hScale);

    // Table Name with Dietary Badge (SS2)
    ctx.fillStyle = '#78350F';
    ctx.font = `800 ${Math.round(10 * scale * hScale)}px sans-serif`;
    const tableText = resolvedTable.toUpperCase();
    const tableTextW = ctx.measureText(tableText).width;
    const badgeSize = 12 * scale * hScale;
    const hasDietary = config.dietaryBadge && config.dietaryBadge !== 'none';

    if (hasDietary) {
      const totalW = tableTextW + badgeSize + 6 * scale;
      const startX = targetWidth / 2 - totalW / 2;
      ctx.textAlign = 'left';
      ctx.fillText(tableText, startX, currentY + 34 * scale);
      drawCanvasDietaryBadge(ctx, startX + tableTextW + 6 * scale + badgeSize / 2, currentY + 30 * scale, badgeSize, config.dietaryBadge!);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(tableText, targetWidth / 2, currentY + 34 * scale);
    }
    ctx.restore();

    // Center Focal QR Code in Warm Tone
    const kraftQRSize = isSticker ? 145 * scale : 155 * scale;
    const kraftQRCenterY = height * 0.52 + qrOffY;
    drawQRCardBox(ctx, qrImg, targetWidth / 2 + qrOffX, kraftQRCenterY, kraftQRSize, config, activeTheme, scale);

    // Bottom Artisan Sketch Callout
    ctx.save();
    ctx.fillStyle = '#451A03';
    ctx.font = `800 ${Math.round(11 * scale * fScale)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('Scan Now', 24 * scale, height - (32 * scale - fOffY));

    ctx.fillStyle = '#78350F';
    ctx.font = `600 ${Math.round(8.5 * scale * fScale)}px sans-serif`;
    ctx.fillText('Contactless Dining', 24 * scale, height - (18 * scale - fOffY));

    // Coffee vignette at bottom-right
    ctx.fillStyle = '#78350F';
    ctx.font = `800 ${Math.round(10 * scale * fScale)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('••• BEANS', targetWidth - 24 * scale, height - (20 * scale - fOffY));
    ctx.restore();
  }

  // =========================================================================
  // LAYOUT BRANCH 6: ROYAL MANDALA PORTAL & DUAL DISHES
  // =========================================================================
  else if (layout === 'circular_mandala_portal') {
    // Double Gold Border
    ctx.save();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3 * scale;
    drawRoundedRect(ctx, 4 * scale, 4 * scale, targetWidth - 8 * scale, height - 8 * scale, radius - 2 * scale);
    ctx.stroke();
    ctx.restore();

    // Top Brand Header
    ctx.save();
    ctx.fillStyle = '#FDE68A';
    ctx.font = `900 ${Math.round(18 * scale * hScale)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText((config.text.restaurantName || 'Royal Heritage').toUpperCase(), targetWidth / 2, 42 * scale + hOffY);
    ctx.font = `700 ${Math.round(8.5 * scale * hScale)}px sans-serif`;
    ctx.fillStyle = '#FBBF24';
    ctx.fillText((config.tagline || 'Padharo Mhare Des').toUpperCase(), targetWidth / 2, 58 * scale + hOffY);
    ctx.restore();

    // Floating Dish 1 - Left
    if (dishImgs[0]) {
      const d1Size = 72 * scale;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 16 * scale;
      ctx.shadowOffsetY = 10 * scale;
      ctx.drawImage(dishImgs[0], 10 * scale, height * 0.32, d1Size, d1Size);
      ctx.restore();
    }

    // Floating Dish 2 - Right
    if (dishImgs[1]) {
      const d2Size = 74 * scale;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 16 * scale;
      ctx.shadowOffsetY = 10 * scale;
      ctx.drawImage(dishImgs[1], targetWidth - d2Size - 10 * scale, height * 0.34, d2Size, d2Size);
      ctx.restore();
    }

    // Center Mandala Halo & QR Card
    const mandalaQRSize = isSticker ? 135 * scale : 145 * scale;
    const mandalaCenterY = height * 0.55 + qrOffY;
    ctx.save();
    ctx.strokeStyle = 'rgba(212,175,55,0.45)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(targetWidth / 2 + qrOffX, mandalaCenterY, mandalaQRSize * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawQRCardBox(ctx, qrImg, targetWidth / 2 + qrOffX, mandalaCenterY, mandalaQRSize, config, activeTheme, scale);

    // Bottom Table Banner
    ctx.save();
    const bW = Math.min(targetWidth * 0.96, targetWidth * 0.88 * fScale);
    const bH = 28 * scale * fScale;
    const bX = (targetWidth - bW) / 2;
    const bY = height - bH - (14 * scale - fOffY);
    ctx.fillStyle = 'rgba(212,175,55,0.2)';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1.5 * scale;
    drawRoundedRect(ctx, bX, bY, bW, bH, 8 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.font = `800 ${Math.round(10 * scale * fScale)}px Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.fillText(resolvedTable.toUpperCase(), bX + 12 * scale, bY + bH * 0.65);
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(8.5 * scale * fScale)}px sans-serif`;
    ctx.fillText((config.ctaBadgeText || 'Scan & Feast').toUpperCase(), bX + bW - 12 * scale, bY + bH * 0.65);
    ctx.restore();
  }

  // =========================================================================
  // LAYOUT BRANCH 7: MODERN BENTO ARCHITECTURAL GRID
  // =========================================================================
  else if (layout === 'bento_modern_grid') {
    // Dark Bento Canvas Background
    ctx.save();
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, targetWidth, height);

    // Top Header Bar
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(13 * scale * hScale)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(config.text.restaurantName || 'SmartDine', 18 * scale, 30 * scale + hOffY);

    ctx.fillStyle = '#34D399';
    ctx.font = `800 ${Math.round(9 * scale * hScale)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(resolvedTable.toUpperCase(), targetWidth - 18 * scale, 30 * scale + hOffY);
    ctx.restore();

    // 2x2 Bento Box Grid
    const pad = 14 * scale;
    const gap = 8 * scale;
    const colW = (targetWidth - pad * 2 - gap) / 2;
    const rowH = (height - 90 * scale) / 2;

    // Bento 1: Dish 1
    ctx.save();
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5 * scale;
    drawRoundedRect(ctx, pad, 44 * scale, colW, rowH, 12 * scale);
    ctx.fill();
    ctx.stroke();
    if (dishImgs[0]) {
      const dSize = Math.min(colW, rowH) * 0.78;
      ctx.drawImage(dishImgs[0], pad + (colW - dSize) / 2, 44 * scale + (rowH - dSize) / 2, dSize, dSize);
    }
    ctx.restore();

    // Bento 2: QR Card
    const bentoQRX = pad + colW + gap + colW / 2;
    const bentoQRY = 44 * scale + rowH / 2;
    const bentoQRSize = Math.min(colW, rowH) * 0.88;
    drawQRCardBox(ctx, qrImg, bentoQRX, bentoQRY, bentoQRSize, config, activeTheme, scale);

    // Bento 3: Quote Box
    ctx.save();
    ctx.fillStyle = '#064E3B';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.5 * scale;
    drawRoundedRect(ctx, pad, 44 * scale + rowH + gap, colW, rowH, 12 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#A7F3D0';
    ctx.font = `800 ${Math.round(9 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(config.funnyQuote ? config.funnyQuote.slice(0, 24) : 'Instant Kitchen Order', pad + colW / 2, 44 * scale + rowH + gap + rowH / 2);
    ctx.restore();

    // Bento 4: Dish 2
    ctx.save();
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5 * scale;
    drawRoundedRect(ctx, pad + colW + gap, 44 * scale + rowH + gap, colW, rowH, 12 * scale);
    ctx.fill();
    ctx.stroke();
    if (dishImgs[1]) {
      const dSize = Math.min(colW, rowH) * 0.78;
      ctx.drawImage(dishImgs[1], pad + colW + gap + (colW - dSize) / 2, 44 * scale + rowH + gap + (rowH - dSize) / 2, dSize, dSize);
    }
    ctx.restore();
  }

  // =========================================================================
  // LAYOUT BRANCH 8: DYNAMIC DIAGONAL SLASH & DUAL FEAST
  // =========================================================================
  else if (layout === 'diagonal_duo_slash') {
    // 45 degree split
    ctx.save();
    ctx.fillStyle = activeTheme.colors.primary;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(targetWidth, 0);
    ctx.lineTo(0, height * 0.75);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(targetWidth, 0);
    ctx.lineTo(targetWidth, height);
    ctx.lineTo(0, height);
    ctx.lineTo(0, height * 0.75);
    ctx.closePath();
    ctx.fill();

    // Glowing Neon Slash Line
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(targetWidth, 0);
    ctx.lineTo(0, height * 0.75);
    ctx.stroke();
    ctx.restore();

    // Dish 1 - Top Right
    if (dishImgs[0]) {
      const d1Size = 80 * scale;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 18 * scale;
      ctx.drawImage(dishImgs[0], targetWidth - d1Size - 8 * scale, 32 * scale, d1Size, d1Size);
      ctx.restore();
    }

    // Dish 2 - Bottom Left
    if (dishImgs[1]) {
      const d2Size = 82 * scale;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 18 * scale;
      ctx.drawImage(dishImgs[1], 8 * scale, height - d2Size - 40 * scale, d2Size, d2Size);
      ctx.restore();
    }

    // Center QR Card
    const slashQRSize = isSticker ? 135 * scale : 145 * scale;
    drawQRCardBox(ctx, qrImg, targetWidth / 2 + qrOffX, height / 2 + qrOffY, slashQRSize, config, activeTheme, scale);

    // Top Header & Bottom Banner
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(13 * scale * hScale)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(config.text.restaurantName || 'SmartDine', 18 * scale, 28 * scale + hOffY);

    ctx.fillStyle = '#F97316';
    ctx.font = `800 ${Math.round(9 * scale * hScale)}px sans-serif`;
    ctx.fillText(resolvedTable.toUpperCase(), 18 * scale, 42 * scale + hOffY);
    ctx.restore();
  }

  // =========================================================================
  // LAYOUT BRANCH 9: NEON NIGHTLIFE & GLASS PORTAL
  // =========================================================================
  else if (layout === 'cocktail_lounge_neon') {
    // Obsidian Background
    ctx.save();
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, targetWidth, height);

    // Neon Cyan Outer Border
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2.5 * scale;
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 16 * scale;
    drawRoundedRect(ctx, 4 * scale, 4 * scale, targetWidth - 8 * scale, height - 8 * scale, radius - 2 * scale);
    ctx.stroke();
    ctx.restore();

    // Top Neon Header
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(18 * scale * hScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 12 * scale;
    ctx.fillText((config.text.restaurantName || 'Night Lounge').toUpperCase(), targetWidth / 2, 42 * scale + hOffY);
    ctx.font = `700 ${Math.round(8.5 * scale * hScale)}px monospace`;
    ctx.fillStyle = '#67E8F9';
    ctx.fillText(`${resolvedTable.toUpperCase()} • BAR & DINING`, targetWidth / 2, 58 * scale + hOffY);
    ctx.restore();

    // Floating Glassware Dish
    if (dishImgs[0]) {
      const gSize = 80 * scale;
      ctx.save();
      ctx.shadowColor = 'rgba(6,182,212,0.6)';
      ctx.shadowBlur = 16 * scale;
      ctx.drawImage(dishImgs[0], targetWidth - gSize - 12 * scale, height * 0.32, gSize, gSize);
      ctx.restore();
    }

    // Center Frosted Glass QR Pedestal
    const neonQRSize = isSticker ? 135 * scale : 145 * scale;
    drawQRCardBox(ctx, qrImg, targetWidth / 2 + qrOffX, height * 0.56 + qrOffY, neonQRSize, config, activeTheme, scale);
  }

  // =========================================================================
  // LAYOUT BRANCH 10: BOTANICAL ARCH & GARDEN BISTRO
  // =========================================================================
  else if (layout === 'arch_sanctuary_botanical') {
    // Natural Cream Card
    ctx.save();
    ctx.fillStyle = '#FDFBF7';
    ctx.fillRect(0, 0, targetWidth, height);

    // Sage Border
    ctx.strokeStyle = '#1C2E24';
    ctx.lineWidth = 2.5 * scale;
    drawRoundedRect(ctx, 4 * scale, 4 * scale, targetWidth - 8 * scale, height - 8 * scale, radius - 2 * scale);
    ctx.stroke();
    ctx.restore();

    // Top Arch Header
    ctx.save();
    ctx.fillStyle = '#1C2E24';
    ctx.font = `italic 900 ${Math.round(19 * scale * hScale)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(config.text.restaurantName || 'Garden Bistro', targetWidth / 2, 40 * scale + hOffY);
    ctx.font = `800 ${Math.round(9 * scale * hScale)}px sans-serif`;
    ctx.fillStyle = '#C2410C';
    ctx.fillText(resolvedTable.toUpperCase(), targetWidth / 2, 56 * scale + hOffY);
    ctx.restore();

    // Centered Dish
    if (dishImgs[0]) {
      const bSize = 84 * scale;
      ctx.save();
      ctx.shadowColor = 'rgba(28,46,36,0.3)';
      ctx.shadowBlur = 14 * scale;
      ctx.drawImage(dishImgs[0], (targetWidth - bSize) / 2, 70 * scale, bSize, bSize);
      ctx.restore();
    }

    // Lower Center QR
    const botQRSize = isSticker ? 125 * scale : 135 * scale;
    drawQRCardBox(ctx, qrImg, targetWidth / 2 + qrOffX, height * 0.68 + qrOffY, botQRSize, config, activeTheme, scale);
  }

  // =========================================================================
  // LAYOUT BRANCH 5: 3D TABLE TENT CLASSIC (Flagship 3D Floating Platter)
  // =========================================================================
  else {
    // Outer Frame Border
    ctx.save();
    ctx.strokeStyle = config.frame.color || activeTheme.colors.qrFrame || '#D4AF37';
    ctx.lineWidth = Math.max(2, (config.frame.width || 2) * scale);
    drawRoundedRect(ctx, ctx.lineWidth / 2, ctx.lineWidth / 2, targetWidth - ctx.lineWidth, height - ctx.lineWidth, radius);
    ctx.stroke();
    ctx.restore();

    // Side Vertical "MENU" Accent (only on taller cards)
    if (!isSticker) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.font = `900 ${Math.round(13 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      const letters = ['M', 'E', 'N', 'U'];
      const startMenuY = height * 0.38;
      letters.forEach((char, idx) => {
        ctx.fillText(char, 14 * scale, startMenuY + idx * 18 * scale);
      });
      ctx.restore();
    }

    // Top Header: Logo, Restaurant Name, Table Pill
    let currentY = 22 * scale + hOffY;
    if (logoImg) {
      const lSize = 34 * scale * hScale;
      ctx.save();
      ctx.beginPath();
      ctx.arc(targetWidth / 2, currentY + lSize / 2, lSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, targetWidth / 2 - lSize / 2, currentY, lSize, lSize);
      ctx.restore();
      currentY += lSize + 8 * scale * hScale;
    }

    ctx.save();
    ctx.fillStyle = config.text.restaurantTypography.textColor || activeTheme.colors.text || '#FFFFFF';
    ctx.font = `bold ${Math.round(17 * scale * hScale)}px ${activeTheme.typography.headingFont || 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.fillText(config.text.restaurantName || 'SmartDine Restaurant', targetWidth / 2, currentY + 14 * scale * hScale);
    currentY += 24 * scale * hScale;

    // Table Pill
    ctx.font = `800 ${Math.round(11 * scale * hScale)}px sans-serif`;
    const tableTextMetrics = ctx.measureText(resolvedTable);
    const pillW = (tableTextMetrics.width + 24 * scale) * hScale;
    const pillH = 20 * scale * hScale;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawRoundedRect(ctx, (targetWidth - pillW) / 2, currentY, pillW, pillH, pillH / 2);
    ctx.fill();

    ctx.strokeStyle = activeTheme.colors.secondary || '#F4A261';
    ctx.lineWidth = 1 * scale;
    drawRoundedRect(ctx, (targetWidth - pillW) / 2, currentY, pillW, pillH, pillH / 2);
    ctx.stroke();

    ctx.fillStyle = activeTheme.colors.secondary || '#F4A261';
    ctx.textBaseline = 'middle';
    ctx.fillText(resolvedTable.toUpperCase(), targetWidth / 2, currentY + pillH / 2 + 1);
    currentY += pillH + 14 * scale;
    ctx.restore();

    // Center QR Card
    const tentQRSize = isSticker ? 155 * scale : 165 * scale;
    const tentQRCenterY = currentY + tentQRSize / 2 + qrOffY;
    drawQRCardBox(ctx, qrImg, targetWidth / 2 + qrOffX, tentQRCenterY, tentQRSize, config, activeTheme, scale);

    // Bottom 3D Elevated Floating Platter Mode
    if (!config.hideCenterDish && config.heroDisplayMode === 'cutout' && heroImg && !isSticker) {
      const dOffX = (config.dishOffsetX || 0) * scale;
      const dOffY = (config.dishOffsetY || 0) * scale;
      const dScaleVal = ((config.dishScale || 100) / 100) * ((config.dishZoom || 100) / 100);

      const isRound = (config.dish3dShape || 'round_platter') === 'round_platter';
      const baseCutoutH = isRound ? 108 * scale : 96 * scale;
      const cutoutH = baseCutoutH * dScaleVal;
      const cutoutW = isRound ? cutoutH : (targetWidth - 36 * scale) * dScaleVal;
      const cutoutRadius = isRound ? cutoutW / 2 : 20 * scale;
      const cutoutX = (targetWidth - cutoutW) / 2 + dOffX;
      const cutoutY = height - cutoutH - 24 * scale + dOffY;

      const rimMode = config.dish3dMode || 'floating_plate';
      const isCutout = config.orbitDishStyle === 'transparent_cutout' || (rimMode as string) === 'cutout_banner';

      if (isCutout) {
        // Clean borderless 3D cutout floating mode without round circle frame (SS2 fix)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 18 * scale;
        ctx.shadowOffsetY = 10 * scale;

        const imgAspect = (heroImg.naturalWidth || heroImg.width) / (heroImg.naturalHeight || heroImg.height || 1);
        let drawW = cutoutW;
        let drawH = cutoutH;
        if (cutoutW / cutoutH > imgAspect) {
          drawW = cutoutH * imgAspect;
        } else {
          drawH = cutoutW / imgAspect;
        }
        const imgX = cutoutX + (cutoutW - drawW) / 2;
        const imgY = cutoutY + (cutoutH - drawH) / 2;
        ctx.drawImage(heroImg, imgX, imgY, drawW, drawH);
        ctx.restore();

        // Dish label pill below the floating dish
        const presets = activeTheme.dishPresets || [];
        const rawNum = parseInt(table.name.replace(/\D/g, ''), 10);
        const offset = (!isNaN(rawNum) && rawNum > 0 && presets.length > 0) ? (rawNum - 1) % presets.length : (config.selectedDishIndex || 0);
        const dishName = presets[offset]?.name || 'Chef Special';

        ctx.save();
        ctx.font = `bold ${Math.round(8.5 * scale)}px sans-serif`;
        const metrics = ctx.measureText(dishName.toUpperCase());
        const pillW = metrics.width + 16 * scale;
        const pillH = 16 * scale;
        const pillX = cutoutX + (cutoutW - pillW) / 2;
        const pillY = cutoutY + cutoutH - 8 * scale;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1 * scale;
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dishName.toUpperCase(), cutoutX + cutoutW / 2, pillY + pillH / 2);
        ctx.restore();
      } else {
        // Soft ambient drop shadow underneath plate
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = 24 * scale;
        ctx.shadowOffsetY = 12 * scale;
        ctx.fillStyle = '#000000';
        drawRoundedRect(ctx, cutoutX + 4 * scale, cutoutY + 4 * scale, cutoutW - 8 * scale, cutoutH - 8 * scale, cutoutRadius);
        ctx.fill();
        ctx.restore();

        // Clip and Draw Dish Image
        ctx.save();
        drawRoundedRect(ctx, cutoutX, cutoutY, cutoutW, cutoutH, cutoutRadius);
        ctx.clip();
        ctx.drawImage(heroImg, cutoutX, cutoutY, cutoutW, cutoutH);

        // 3D Specular Highlight Arc
        const glossGrad = ctx.createRadialGradient(
          cutoutX + cutoutW * 0.35, cutoutY + cutoutH * 0.2, 0,
          cutoutX + cutoutW * 0.35, cutoutY + cutoutH * 0.2, cutoutW * 0.5
        );
        glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        glossGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
        glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glossGrad;
        ctx.fillRect(cutoutX, cutoutY, cutoutW, cutoutH);

        // Gradient overlay at bottom of dish
        const cutoutGrad = ctx.createLinearGradient(0, cutoutY + cutoutH * 0.5, 0, cutoutY + cutoutH);
        cutoutGrad.addColorStop(0, 'rgba(0,0,0,0)');
        cutoutGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = cutoutGrad;
        ctx.fillRect(cutoutX, cutoutY, cutoutW, cutoutH);

        // Dish label
        const dishName = activeTheme.dishPresets[config.selectedDishIndex || 0]?.name || 'Chef Special';
        ctx.font = `bold ${Math.round(isRound ? 8.5 * scale : 10 * scale)}px sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(dishName, cutoutX + cutoutW / 2, cutoutY + cutoutH - 8 * scale);
        ctx.restore();

        // 3D Rim Stroke
        ctx.save();
        let strokeColor = '#D4AF37'; // gold
        if (rimMode === 'ceramic_white') strokeColor = '#FFFFFF';
        else if (rimMode === 'slate_stone') strokeColor = '#3F3F46';
        else if (rimMode === 'terracotta') strokeColor = '#BC6C25';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3.5 * scale;
        drawRoundedRect(ctx, cutoutX, cutoutY, cutoutW, cutoutH, cutoutRadius);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Footer text
    ctx.save();
    ctx.fillStyle = config.text.footerTypography.textColor || activeTheme.colors.text || '#94A3B8';
    ctx.font = `600 ${Math.round(8.5 * scale * fScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(config.text.footerText || 'Powered by SmartDine', targetWidth / 2, height - (12 * scale - fOffY));
    ctx.restore();
  }

  return canvas;
}

/**
 * Loads an HTML Image from URL asynchronously with CORS safe fallback
 */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If external image fails to load or CORS error, fall back to safe local 3D asset
      if (url.startsWith('http')) {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => resolve(null);
        fallbackImg.src = '/dish-presets/3d/rajasthani_thali_3d.png';
      } else {
        resolve(null);
      }
    };
    img.src = url;
  });
}

/**
 * Renders a circular dish plate with rim and shadow (or transparent 3D cutout)
 */
function drawCircularDish(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  centerX: number,
  centerY: number,
  radius: number,
  borderColor: string,
  scale: number,
  style: 'framed_gold' | 'transparent_cutout' = 'framed_gold'
) {
  if (!img) return;

  if (style === 'transparent_cutout') {
    // 3D Transparent Dish Cutout (Zero background, natural drop-shadow)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 18 * scale;
    ctx.shadowOffsetY = 8 * scale;
    ctx.drawImage(img, centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.restore();
    return;
  }

  ctx.save();
  // Deep 3D Ambient drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 16 * scale;
  ctx.shadowOffsetY = 8 * scale;

  // Clip circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  // Zoom 1.15x to eliminate white studio borders on dish presets
  const zoomR = radius * 1.15;
  ctx.drawImage(img, centerX - zoomR, centerY - zoomR, zoomR * 2, zoomR * 2);
  ctx.restore();

  // Border Rim (Framed Gold mode)
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3 * scale;
  ctx.stroke();
  ctx.restore();
}

/**
 * Standard Indian FSSAI Dietary Badge Renderer on Canvas
 */
function drawCanvasDietaryBadge(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  type: string
) {
  if (!type || type === 'none') return;
  const half = size / 2;
  const x = centerX - half;
  const y = centerY - half;
  const isVeg = type === 'veg';
  const isVegan = type === 'vegan';
  const color = isVeg ? '#059669' : isVegan ? '#10B981' : '#B91C1C';

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, size, size);

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, size * 0.12);
  ctx.strokeRect(x, y, size, size);

  ctx.fillStyle = color;
  if (isVeg || isVegan) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const triH = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - triH / 2);
    ctx.lineTo(centerX + triH / 2, centerY + triH / 2);
    ctx.lineTo(centerX - triH / 2, centerY + triH / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Helper to render the styled QR card box + CTA badge + funny quote
 */
function drawQRCardBox(
  ctx: CanvasRenderingContext2D,
  qrImg: HTMLImageElement | null,
  centerX: number,
  centerY: number,
  boxSize: number,
  config: QRDesignConfig,
  activeTheme: any,
  scale: number
) {
  const x = centerX - boxSize / 2;
  const y = centerY - boxSize / 2;
  const radius = 16 * scale;

  ctx.save();
  // Card Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 18 * scale;
  ctx.shadowOffsetY = 8 * scale;
  ctx.fillStyle = config.qr.bgColor || '#FFFFFF';
  drawRoundedRect(ctx, x, y, boxSize, boxSize, radius);
  ctx.fill();
  ctx.restore();

  // Border
  ctx.save();
  ctx.strokeStyle = config.qr.frameColor || activeTheme.colors.qrFrame || '#D4AF37';
  ctx.lineWidth = (config.qr.frameThickness ? config.qr.frameThickness * 0.8 : 2) * scale;
  drawRoundedRect(ctx, x, y, boxSize, boxSize, radius);
  ctx.stroke();
  ctx.restore();

  // Draw QR Image
  if (qrImg) {
    ctx.save();
    const pad = (config.qr.padding || 8) * scale;
    ctx.drawImage(qrImg, x + pad, y + pad, boxSize - pad * 2, boxSize - pad * 2);
    ctx.restore();
  }

  // CTA Pill Badge ("SCAN FOR MENU", "ORDER & PAY", "SCAN TO ORDER", or Custom)
  if (config.ctaBadgeMode !== 'nil') {
    const ctaText = config.ctaBadgeText || 'SCAN FOR MENU';
    ctx.save();
    ctx.font = `800 ${Math.round(10 * scale)}px sans-serif`;
    const ctaMetrics = ctx.measureText(ctaText);
    const ctaW = ctaMetrics.width + 20 * scale;
    const ctaH = 18 * scale;
    const badgeBg = config.ctaBadgeBgColor || activeTheme.colors.secondary || '#F4A261';
    const badgeText = config.ctaBadgeTextColor || activeTheme.colors.primary || '#8B261D';

    ctx.fillStyle = badgeBg;
    drawRoundedRect(ctx, centerX - ctaW / 2, y - ctaH / 2, ctaW, ctaH, ctaH / 2);
    ctx.fill();

    ctx.fillStyle = badgeText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText, centerX, y + 1);
    ctx.restore();
  }

  // Funny Desi Scan Quote Pill (Multi-line Word Wrap & Dynamic Scaling)
  if (config.funnyQuote) {
    ctx.save();
    const rawQuote = `"${config.funnyQuote}"`;
    const quoteLen = config.funnyQuote.length;
    const fSize = Math.round((quoteLen > 38 ? 7.5 : quoteLen > 24 ? 8.5 : 9.5) * scale);
    ctx.font = `800 ${fSize}px sans-serif`;

    const maxBoxWidth = boxSize * 0.94;
    const words = rawQuote.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      if (ctx.measureText(testLine).width > maxBoxWidth - 16 * scale && currentLine) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fSize * 1.25;
    const paddingX = 10 * scale;
    const paddingY = 4 * scale;
    const textBlockWidth = Math.min(
      maxBoxWidth,
      Math.max(...lines.map((l) => ctx.measureText(l).width)) + paddingX * 2
    );
    const textBlockHeight = lines.length * lineHeight + paddingY * 2;
    const fqY = config.ctaBadgeMode !== 'nil' 
      ? y - 9 * scale - textBlockHeight - 3 * scale 
      : y - textBlockHeight / 2 - 2 * scale;

    const cornerRadius = config.funnyQuoteStyle === 'comic_banner' ? 2 * scale : textBlockHeight / 2;
    const qOpacity = (config.funnyQuoteOpacity ?? 90) / 100;

    ctx.save();
    ctx.globalAlpha = qOpacity;
    ctx.fillStyle = config.funnyQuoteBgColor || '#FEF08A';
    drawRoundedRect(ctx, centerX - textBlockWidth / 2, fqY, textBlockWidth, textBlockHeight, cornerRadius);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = config.funnyQuoteTextColor ? `${config.funnyQuoteTextColor}33` : '#F59E0B';
    ctx.lineWidth = 1 * scale;
    drawRoundedRect(ctx, centerX - textBlockWidth / 2, fqY, textBlockWidth, textBlockHeight, cornerRadius);
    ctx.stroke();

    ctx.fillStyle = config.funnyQuoteTextColor || '#854D0E';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    lines.forEach((line, idx) => {
      const lineY = fqY + paddingY + lineHeight * idx + lineHeight / 2;
      ctx.fillText(line, centerX, lineY);
    });
    ctx.restore();
    ctx.restore();
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Downloads a single table's branded card PNG
 */
export async function downloadBrandedTableQR(
  config: QRDesignConfig,
  table: TablePrintItem,
  restaurantSlug: string
) {
  const canvas = await renderQRCardToCanvas(config, table, 1200);
  const dataUrl = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${restaurantSlug}-${table.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-branded-qr.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a ZIP package of branded QR codes for all tables
 */
export async function downloadAllTablesQRZip(
  config: QRDesignConfig,
  tables: TablePrintItem[],
  restaurantSlug: string,
  onProgress?: (current: number, total: number) => void
) {
  const zip = new JSZip();
  const folder = zip.folder(`${restaurantSlug}-branded-qr-cards`);

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    if (onProgress) onProgress(i + 1, tables.length);

    const canvas = await renderQRCardToCanvas(config, table, 1000);
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

    const filename = `${table.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-QR.png`;
    folder?.file(filename, base64Data, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${restaurantSlug}-all-tables-qr.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Prints a single table's branded QR card with correct page sizing
 */
export async function printSingleBrandedTable(
  config: QRDesignConfig,
  table: TablePrintItem
) {
  const canvas = await renderQRCardToCanvas(config, table, 1000);
  const dataUrl = canvas.toDataURL('image/png');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print QR - ${table.name}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f8fafc;
            box-sizing: border-box;
          }
          img {
            max-width: 90vw;
            max-height: 90vh;
            object-fit: contain;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            display: block;
            margin: auto;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
              background: #ffffff !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              min-height: 100vh !important;
              width: 100vw;
            }
            img {
              max-width: 85vw !important;
              max-height: 85vh !important;
              box-shadow: none !important;
              page-break-inside: avoid;
              margin: auto !important;
            }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="${table.name} QR" />
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 600);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Prints an A4 Sheet containing all tables organized in a clean printable grid
 */
export async function printAllTablesA4Sheet(
  config: QRDesignConfig,
  tables: TablePrintItem[],
  restaurantName: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const cardImages: { name: string; dataUrl: string }[] = [];
  for (const table of tables) {
    const canvas = await renderQRCardToCanvas(config, table, 800);
    cardImages.push({ name: table.name, dataUrl: canvas.toDataURL('image/png') });
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>A4 QR Sheet - ${restaurantName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 0;
            background: #FFFFFF;
            color: #0F172A;
          }
          .header {
            text-align: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #E2E8F0;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .sub {
            font-size: 11px;
            color: #64748B;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .card-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px;
            border: 1px dashed #CBD5E1;
            page-break-inside: avoid;
            box-sizing: border-box;
          }
          .card-box img {
            max-width: 100%;
            height: auto;
            max-height: 290px;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${restaurantName} — QR Code Sheets</div>
          <div class="sub">Generated by SmartDine Dynamic QR Studio • Cut along dashed guidelines</div>
        </div>
        <div class="grid">
          ${cardImages
            .map(
              (c) => `
            <div class="card-box">
              <img src="${c.dataUrl}" alt="${c.name}" />
            </div>
          `
            )
            .join('')}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
