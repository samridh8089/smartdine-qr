import JSZip from 'jszip';
import { QRDesignConfig } from './types';
import { generateStyledQRDataURL } from './qrGenerator';

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

  // Compute height based on shape aspect ratio
  let height = targetHeight || 1350;
  if (config.shape === 'square' || config.shape === 'rounded_square' || config.shape === 'circle') {
    height = targetWidth;
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

  const scale = targetWidth / 300;

  // 1. Clip Shape if circle or rounded
  ctx.save();
  const radius = config.shape === 'circle'
    ? targetWidth / 2
    : config.shape === 'rounded_square'
    ? 28 * scale
    : config.shape === 'square'
    ? 0
    : 18 * scale;

  ctx.beginPath();
  if (config.shape === 'circle') {
    ctx.arc(targetWidth / 2, height / 2, targetWidth / 2, 0, Math.PI * 2);
  } else {
    drawRoundedRect(ctx, 0, 0, targetWidth, height, radius);
  }
  ctx.clip();

  // 2. Background Base
  if (config.background.type === 'gradient') {
    const angleRad = ((config.background.gradientAngle || 160) * Math.PI) / 180;
    const x2 = Math.cos(angleRad) * targetWidth;
    const y2 = Math.sin(angleRad) * height;
    const grad = ctx.createLinearGradient(0, 0, Math.abs(x2), Math.abs(y2));
    grad.addColorStop(0, config.background.gradientStart || '#064E3B');
    grad.addColorStop(1, config.background.gradientEnd || '#022C22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetWidth, height);
  } else {
    ctx.fillStyle = config.background.color || '#111827';
    ctx.fillRect(0, 0, targetWidth, height);
  }

  // 2b. Food Photography / Image Background Layer
  if ((config.background.type === 'food_photo' || config.background.type === 'image') && config.background.imageUrl) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        const filters = config.background.filters;
        if (filters) {
          try {
            ctx.filter = `blur(${Math.round((filters.blur || 0) * scale * 0.4)}px) brightness(${filters.brightness || 100}%) contrast(${filters.contrast || 100}%) saturate(${filters.saturation || 100}%)`;
          } catch (e) {
            // Some canvas environments might ignore ctx.filter
          }
        }
        const zoom = (filters?.zoom || 100) / 100;
        // Cover aspect ratio
        const imgAspect = img.width / img.height;
        const canvasAspect = targetWidth / height;
        let drawW = targetWidth * zoom;
        let drawH = height * zoom;
        if (canvasAspect > imgAspect) {
          drawH = (targetWidth / imgAspect) * zoom;
        } else {
          drawW = (height * imgAspect) * zoom;
        }
        const drawX = (targetWidth - drawW) / 2;
        const drawY = (height - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Contrast Overlay Tint
        ctx.save();
        ctx.fillStyle = filters?.overlayColor || '#000000';
        ctx.globalAlpha = ((filters?.overlayOpacity ?? 35) / 100);
        ctx.fillRect(0, 0, targetWidth, height);
        ctx.restore();

        resolve();
      };
      img.onerror = () => resolve();
      img.src = config.background.imageUrl;
    });
  }

  // 2c. Lighting Effects Layer (Vignette & Spotlight)
  if (config.lighting?.vignette) {
    ctx.save();
    const vStrength = ((config.lighting?.vignetteStrength ?? 45) / 100);
    const radGrad = ctx.createRadialGradient(
      targetWidth / 2,
      height / 2,
      targetWidth * 0.25,
      targetWidth / 2,
      height / 2,
      targetWidth * 0.75
    );
    radGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    radGrad.addColorStop(1, `rgba(0, 0, 0, ${vStrength.toFixed(2)})`);
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, targetWidth, height);
    ctx.restore();
  }

  if (config.lighting?.spotlight) {
    ctx.save();
    const spotGrad = ctx.createRadialGradient(
      targetWidth / 2,
      height * 0.15,
      0,
      targetWidth / 2,
      height * 0.15,
      targetWidth * 0.6
    );
    spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    spotGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    spotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, targetWidth, height);
    ctx.restore();
  }

  // 3. Frame Border
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = config.frame.color || '#10B981';
  ctx.lineWidth = Math.max(1, (config.frame.width || 2) * scale);

  if (config.frame.style === 'double') {
    const inset = 6 * scale;
    ctx.beginPath();
    if (config.shape === 'circle') {
      ctx.arc(targetWidth / 2, height / 2, (targetWidth / 2) - inset, 0, Math.PI * 2);
    } else {
      drawRoundedRect(ctx, inset, inset, targetWidth - inset * 2, height - inset * 2, radius);
    }
    ctx.stroke();
  }

  ctx.beginPath();
  if (config.shape === 'circle') {
    ctx.arc(targetWidth / 2, height / 2, targetWidth / 2 - (ctx.lineWidth / 2), 0, Math.PI * 2);
  } else {
    drawRoundedRect(ctx, ctx.lineWidth / 2, ctx.lineWidth / 2, targetWidth - ctx.lineWidth, height - ctx.lineWidth, radius);
  }
  ctx.stroke();
  ctx.restore();

  // 4. Logo
  let currentY = 28 * scale;
  if (config.logo.enabled && config.logo.url && config.logo.position === 'header') {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const lSize = (config.logo.size || 40) * scale;
        const lx = (targetWidth - lSize) / 2;
        ctx.save();
        if (config.logo.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(lx + lSize / 2, currentY + lSize / 2, lSize / 2, 0, Math.PI * 2);
          ctx.clip();
        }
        ctx.drawImage(img, lx, currentY, lSize, lSize);
        ctx.restore();
        currentY += lSize + 10 * scale;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = config.logo.url;
    });
  }

  // 5. Restaurant Name
  ctx.save();
  ctx.fillStyle = config.text.restaurantTypography.textColor || '#FFFFFF';
  ctx.font = `${config.text.restaurantTypography.fontWeight || 'bold'} ${Math.round(config.text.restaurantTypography.fontSize * scale)}px ${config.text.restaurantTypography.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(config.text.restaurantName || 'The Foody Hub', targetWidth / 2, currentY + 16 * scale);
  currentY += (config.text.restaurantTypography.fontSize * scale) + 12 * scale;
  ctx.restore();

  // 6. Dynamic Table Name
  const formatRaw = config.text.tableNameFormat || 'Table {{table_name}}';
  const resolvedTable = formatRaw.includes('{{table_name}}')
    ? formatRaw.replace(/\{\{table_name\}\}/g, table.name.replace(/^Table\s*/i, ''))
    : `${formatRaw} ${table.name.replace(/^Table\s*/i, '')}`;

  ctx.save();
  ctx.fillStyle = config.text.tableTypography.textColor || '#34D399';
  ctx.font = `${config.text.tableTypography.fontWeight || '800'} ${Math.round(config.text.tableTypography.fontSize * scale)}px ${config.text.tableTypography.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(resolvedTable, targetWidth / 2, currentY + 18 * scale);
  currentY += (config.text.tableTypography.fontSize * scale) + 20 * scale;
  ctx.restore();

  // 7. Render QR Code (High-Contrast Scan-Safe Container)
  const qrSize = (config.qr.size || 180) * scale;
  const qrX = (targetWidth - qrSize) / 2;
  const qrY = currentY;

  const qrDataUrl = await generateStyledQRDataURL({
    url: table.url,
    appearance: config.qr,
    logoUrl: config.logo?.enabled ? config.logo.url : undefined,
    scale: 3
  });

  if (qrDataUrl) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        // QR Container Background with Soft Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 16 * scale;
        ctx.shadowOffsetY = 6 * scale;
        ctx.fillStyle = config.qr.bgColor || '#FFFFFF';
        drawRoundedRect(ctx, qrX, qrY, qrSize, qrSize, (config.qr.borderRadius || 14) * scale);
        ctx.fill();
        ctx.restore();

        // Draw QR Image
        ctx.save();
        const pad = (config.qr.padding || 8) * scale;
        ctx.drawImage(img, qrX + pad, qrY + pad, qrSize - pad * 2, qrSize - pad * 2);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = qrDataUrl;
    });
  }

  currentY += qrSize + 22 * scale;

  // 8. Scan CTA Text
  ctx.save();
  ctx.fillStyle = config.text.scanTypography.textColor || '#E2E8F0';
  ctx.font = `${config.text.scanTypography.fontWeight || '600'} ${Math.round(config.text.scanTypography.fontSize * scale)}px ${config.text.scanTypography.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(config.text.scanText || 'Scan to View Menu & Order', targetWidth / 2, currentY);
  ctx.restore();

  // 9. Footer
  ctx.save();
  ctx.fillStyle = config.text.footerTypography.textColor || '#94A3B8';
  ctx.font = `normal ${Math.round(config.text.footerTypography.fontSize * scale)}px ${config.text.footerTypography.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(config.text.footerText || 'Powered by CleverOps', targetWidth / 2, height - 16 * scale);
  ctx.restore();

  // 10. Stickers & Badges Layer
  if (config.stickers && config.stickers.length > 0) {
    const pad = 12 * scale;
    for (const sticker of config.stickers) {
      let sx = pad;
      let sy = pad;
      if (sticker.position === 'top-right') {
        sx = targetWidth - pad - 60 * scale;
        sy = pad;
      } else if (sticker.position === 'bottom-left') {
        sx = pad;
        sy = height - pad - 40 * scale;
      } else if (sticker.position === 'bottom-right') {
        sx = targetWidth - pad - 60 * scale;
        sy = height - pad - 40 * scale;
      } else if (sticker.position === 'custom') {
        sx = (sticker.x || 10) * scale;
        sy = (sticker.y || 10) * scale;
      }

      ctx.save();
      const rot = ((sticker.rotation || 0) * Math.PI) / 180;
      ctx.translate(sx + 20 * scale, sy + 20 * scale);
      ctx.rotate(rot);
      const stScale = (sticker.scale || 1);

      if (sticker.type === 'badge') {
        // Draw Pill Badge
        const bText = sticker.content;
        ctx.font = `bold ${Math.round(11 * scale * stScale)}px sans-serif`;
        const metrics = ctx.measureText(bText);
        const bWidth = metrics.width + 16 * scale;
        const bHeight = 22 * scale * stScale;
        ctx.fillStyle = sticker.bgColor || '#EF4444';
        drawRoundedRect(ctx, -bWidth / 2, -bHeight / 2, bWidth, bHeight, bHeight / 2);
        ctx.fill();

        ctx.fillStyle = sticker.textColor || '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bText, 0, 1);
      } else {
        // Draw Emoji / Icon
        ctx.font = `${Math.round(26 * scale * stScale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.content, 0, 0);
      }
      ctx.restore();
    }
  }

  return canvas;
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
          }
          img {
            max-width: 90vw;
            max-height: 90vh;
            object-fit: contain;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
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

  // Generate cards for all tables
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
          <div class="sub">Generated by CleverOps QR Design Studio • Cut along dashed guidelines</div>
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
