import sharp from 'sharp';
import fs from 'fs';

async function highlightActualScreenshot() {
  const imagePath = 'screenshot_actual_token_killed.png';
  const outputPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_actual_token_highlighted.png';

  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width || 1080;
  const height = metadata.height || 2340;

  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect x="30" y="240" width="${width - 60}" height="320" rx="20" ry="20"
            fill="none" stroke="#22c55e" stroke-width="10" stroke-dasharray="16,8" />
      <circle cx="${width / 2}" cy="400" r="160" fill="rgba(34, 197, 94, 0.15)" stroke="#16a34a" stroke-width="8" />
      <rect x="${width / 2 - 260}" y="170" width="520" height="60" rx="10" fill="#16a34a" />
      <text x="${width / 2}" y="210" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">
        🟢 DELIVERED TO PHYSICAL DEVICE
      </text>
    </svg>
  `);

  await sharp(imagePath)
    .composite([{ input: svgOverlay }])
    .toFile(outputPath);

  console.log('Successfully generated actual token highlighted screenshot at:', outputPath);
}

highlightActualScreenshot();
