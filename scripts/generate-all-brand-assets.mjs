import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_IMAGE = 'C:/Users/hp/.gemini/antigravity/brain/c31098a8-db36-4f2b-ac6c-52f6615dfe90/.user_uploaded/media_1789715478825.jpg';

// Helper: build ICO file
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type 1
  header.writeUInt16LE(count, 4); // count

  let offset = 6 + count * 16;
  const entries = [];
  for (const { width, height, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(data.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.data)]);
}

async function main() {
  console.log('--- GENERATING CLEVEROPS BRAND ASSETS ---');
  if (!fs.existsSync(SOURCE_IMAGE)) {
    throw new Error('Source image not found: ' + SOURCE_IMAGE);
  }

  const { data, info } = await sharp(SOURCE_IMAGE)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  console.log(`Source image loaded: ${width}x${height}`);

  // Step 1: Create Transparent Emblem (1024x1024)
  const transRgba = Buffer.alloc(width * height * 4);
  const monoRgba = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];

    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

    let alpha = 255;
    if (r > 245 && g > 245 && b > 245) {
      alpha = 0;
    } else if (r > 215 && g > 215 && b > 215) {
      // Smooth linear falloff for anti-aliasing
      alpha = Math.round(255 * (1 - (brightness - 215) / (255 - 215)));
    }

    transRgba[i * 4] = r;
    transRgba[i * 4 + 1] = g;
    transRgba[i * 4 + 2] = b;
    transRgba[i * 4 + 3] = alpha;

    // Monochrome version (white silhouette with same alpha)
    monoRgba[i * 4] = 255;
    monoRgba[i * 4 + 1] = 255;
    monoRgba[i * 4 + 2] = 255;
    monoRgba[i * 4 + 3] = alpha;
  }

  const transparentBuffer = await sharp(transRgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  const monoBuffer = await sharp(monoRgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  // Create App Icon on Solid White Background with safe padding (80% scale)
  const appIconBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      {
        input: await sharp(transparentBuffer).resize(800, 800, { fit: 'contain' }).toBuffer(),
        gravity: 'center'
      }
    ])
    .png()
    .toBuffer();

  // Create Adaptive Foreground on Transparent Background (safe zone ~65% = 330px in 512x512)
  const adaptiveFgBuffer = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: await sharp(transparentBuffer).resize(330, 330, { fit: 'contain' }).toBuffer(),
        gravity: 'center'
      }
    ])
    .png()
    .toBuffer();

  // Create Adaptive Background (Solid White)
  const adaptiveBgBuffer = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .png()
    .toBuffer();

  // 1. PUBLIC DIRECTORY ASSETS
  console.log('Writing public web assets...');
  // public/logo.png (512x512 transparent)
  await sharp(transparentBuffer).resize(512, 512, { fit: 'contain' }).png().toFile('public/logo.png');
  // public/favicon.png (512x512 transparent)
  await sharp(transparentBuffer).resize(512, 512, { fit: 'contain' }).png().toFile('public/favicon.png');
  // public/favicon-48x48.png
  await sharp(transparentBuffer).resize(48, 48, { fit: 'contain' }).png().toFile('public/favicon-48x48.png');
  // public/favicon-32x32.png
  await sharp(transparentBuffer).resize(32, 32, { fit: 'contain' }).png().toFile('public/favicon-32x32.png');
  // public/favicon-16x16.png
  await sharp(transparentBuffer).resize(16, 16, { fit: 'contain' }).png().toFile('public/favicon-16x16.png');
  // public/icon-192.png
  await sharp(transparentBuffer).resize(192, 192, { fit: 'contain' }).png().toFile('public/icon-192.png');
  // public/icon-512.png
  await sharp(transparentBuffer).resize(512, 512, { fit: 'contain' }).png().toFile('public/icon-512.png');
  // public/apple-touch-icon.png (180x180 solid white background with centered logo)
  await sharp(appIconBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png');

  // Multi-resolution favicon.ico (16, 32, 48)
  const [b16, b32, b48] = await Promise.all([
    sharp(transparentBuffer).resize(16, 16).png().toBuffer(),
    sharp(transparentBuffer).resize(32, 32).png().toBuffer(),
    sharp(transparentBuffer).resize(48, 48).png().toBuffer()
  ]);
  const icoBuffer = createIco([
    { width: 16, height: 16, data: b16 },
    { width: 32, height: 32, data: b32 },
    { width: 48, height: 48, data: b48 }
  ]);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  console.log('✓ Public web assets generated successfully.');

  // 2. MOBILE ASSETS (smartdine-mobile/assets)
  console.log('Writing smartdine-mobile/assets...');
  const mobileAssetsDir = path.resolve('smartdine-mobile/assets');
  if (fs.existsSync(mobileAssetsDir)) {
    // App icon (1024x1024)
    await sharp(appIconBuffer).resize(1024, 1024).png().toFile(path.join(mobileAssetsDir, 'icon.png'));
    // Splash icon (512x512)
    await sharp(appIconBuffer).resize(512, 512).png().toFile(path.join(mobileAssetsDir, 'splash-icon.png'));
    // Adaptive foreground (512x512)
    await sharp(adaptiveFgBuffer).toFile(path.join(mobileAssetsDir, 'android-icon-foreground.png'));
    // Adaptive background (512x512)
    await sharp(adaptiveBgBuffer).toFile(path.join(mobileAssetsDir, 'android-icon-background.png'));
    // Adaptive monochrome (512x512)
    await sharp(monoBuffer).resize(330, 330, { fit: 'contain' }).toBuffer().then(buf => {
      return sharp({
        create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
      .composite([{ input: buf, gravity: 'center' }])
      .png()
      .toFile(path.join(mobileAssetsDir, 'android-icon-monochrome.png'));
    });
    // Mobile web favicon
    await sharp(transparentBuffer).resize(512, 512, { fit: 'contain' }).png().toFile(path.join(mobileAssetsDir, 'favicon.png'));
    console.log('✓ smartdine-mobile/assets updated successfully.');
  }

  // 3. ANDROID NATIVE RESOURCES (smartdine-mobile/androide_backup/app/src/main/res/)
  const resDir = path.resolve('smartdine-mobile/androide_backup/app/src/main/res');
  if (fs.existsSync(resDir)) {
    console.log('Writing Android native mipmap and drawable assets...');
    const densities = [
      { name: 'mdpi', size: 48, fgSize: 108, splash: 320 },
      { name: 'hdpi', size: 72, fgSize: 162, splash: 432 },
      { name: 'xhdpi', size: 96, fgSize: 216, splash: 640 },
      { name: 'xxhdpi', size: 144, fgSize: 324, splash: 960 },
      { name: 'xxxhdpi', size: 192, fgSize: 432, splash: 1280 }
    ];

    for (const d of densities) {
      const mipmapFolder = path.join(resDir, `mipmap-${d.name}`);
      const drawableFolder = path.join(resDir, `drawable-${d.name}`);

      if (fs.existsSync(mipmapFolder)) {
        // ic_launcher.png (square icon on white)
        await sharp(appIconBuffer).resize(d.size, d.size).png().toFile(path.join(mipmapFolder, 'ic_launcher.png'));
        // ic_launcher_round.png (circular mask icon)
        const roundSvg = Buffer.from(`<svg width="${d.size}" height="${d.size}"><circle cx="${d.size/2}" cy="${d.size/2}" r="${d.size/2}" fill="#ffffff"/></svg>`);
        const innerRound = Math.round(d.size * 0.75);
        const innerBuf = await sharp(transparentBuffer).resize(innerRound, innerRound, { fit: 'contain' }).toBuffer();
        await sharp(roundSvg).composite([{ input: innerBuf, gravity: 'center' }]).png().toFile(path.join(mipmapFolder, 'ic_launcher_round.png'));

        // webp variants
        await sharp(path.join(mipmapFolder, 'ic_launcher.png')).webp().toFile(path.join(mipmapFolder, 'ic_launcher.webp'));
        await sharp(path.join(mipmapFolder, 'ic_launcher_round.png')).webp().toFile(path.join(mipmapFolder, 'ic_launcher_round.webp'));

        // ic_launcher_foreground.webp
        const fgBuf = await sharp(transparentBuffer).resize(Math.round(d.fgSize * 0.65), Math.round(d.fgSize * 0.65), { fit: 'contain' }).toBuffer();
        await sharp({
          create: { width: d.fgSize, height: d.fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
        })
        .composite([{ input: fgBuf, gravity: 'center' }])
        .webp()
        .toFile(path.join(mipmapFolder, 'ic_launcher_foreground.webp'));

        // ic_launcher_background.webp
        await sharp({
          create: { width: d.fgSize, height: d.fgSize, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
        })
        .webp()
        .toFile(path.join(mipmapFolder, 'ic_launcher_background.webp'));
      }

      if (fs.existsSync(drawableFolder)) {
        // splashscreen_logo.png
        await sharp(transparentBuffer).resize(d.splash, d.splash, { fit: 'contain' }).png().toFile(path.join(drawableFolder, 'splashscreen_logo.png'));
      }
    }
    console.log('✓ Android native resources updated successfully.');
  }

  console.log('ALL BRAND ASSETS SUCCESSFULLY GENERATED!');
}

main().catch(err => {
  console.error('Fatal error generating assets:', err);
  process.exit(1);
});
