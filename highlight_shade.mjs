import sharp from 'sharp';
import fs from 'fs';

async function highlightNotification() {
  const imagePath = 'screenshot_expanded_shade.png';
  const outputPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_highlighted.png';

  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width || 1080;
  const height = metadata.height || 2340;

  // Create an SVG overlay with a bold Red Circle & Red Box around the notification area (Top 250px - 600px)
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}">
      <!-- Red Highlighting Box around top notification -->
      <rect x="30" y="240" width="${width - 60}" height="320" rx="20" ry="20"
            fill="none" stroke="#ef4444" stroke-width="10" stroke-dasharray="16,8" />
      
      <!-- Bright Pointer Arrow and Text Label -->
      <circle cx="${width / 2}" cy="400" r="160" fill="rgba(239, 68, 68, 0.15)" stroke="#dc2626" stroke-width="8" />
      
      <rect x="${width / 2 - 240}" y="170" width="480" height="60" rx="10" fill="#dc2626" />
      <text x="${width / 2}" y="210" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">
        🔴 HERE IS THE NOTIFICATION
      </text>
    </svg>
  `);

  await sharp(imagePath)
    .composite([{ input: svgOverlay }])
    .toFile(outputPath);

  console.log('Successfully generated highlighted screenshot at:', outputPath);
}

highlightNotification();
