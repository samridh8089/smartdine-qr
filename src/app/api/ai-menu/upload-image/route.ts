import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';

export async function POST(req: Request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error('[Upload Image Error] SUPABASE_SERVICE_ROLE_KEY environment variable is not configured.');
      return NextResponse.json({
        error: 'Server storage configuration error. SUPABASE_SERVICE_ROLE_KEY is required for image upload.'
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { restaurantId, itemId, imageUrl } = body;

    if (!restaurantId || !imageUrl) {
      return NextResponse.json({ error: 'Missing restaurantId or imageUrl' }, { status: 400 });
    }

    // 1. If already a Supabase Storage URL, return as-is
    if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
      return NextResponse.json({ success: true, storageUrl: imageUrl });
    }

    let buffer: Buffer;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    // 2. Data URL handling (e.g. cropped source image base64)
    if (imageUrl.startsWith('data:image/')) {
      const matches = imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length < 3) {
        return NextResponse.json({ error: 'Image could not be saved. Please try again or select another image.' }, { status: 422 });
      }
      mimeType = matches[1];
      ext = mimeType.split('/')[1] || 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // 3. External HTTP URL handling
      const fetchRes = await fetch(imageUrl, {
        headers: {
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!fetchRes.ok) {
        console.error(`[Upload Image Error] Failed to fetch external image: ${fetchRes.status}`);
        return NextResponse.json({ error: 'Image could not be saved. Please try again or select another image.', details: `External fetch returned ${fetchRes.status}` }, { status: 422 });
      }

      const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
      mimeType = contentType.startsWith('image/') ? contentType : 'image/jpeg';
      ext = mimeType.split('/')[1]?.split(';')[0] || 'jpg';
      const arrayBuf = await fetchRes.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    } else {
      return NextResponse.json({ error: 'Invalid image URL format.' }, { status: 400 });
    }

    // 4. Generate unique deterministic path: restaurants/{restaurantId}/menu-items/{itemId}/{uniqueId}.jpg
    const safeItemId = (itemId || `item_${Math.random().toString(36).substr(2, 7)}`).replace(/[^a-zA-Z0-9_\-]/g, '');
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const filePath = `restaurants/${restaurantId}/menu-items/${safeItemId}/${uniqueId}.${ext}`;

    // 5. Upload file buffer to Supabase Storage bucket 'menu-item-images' (or 'smartdine-images' fallback) using service-role client ONLY
    let bucketName = 'menu-item-images';
    let { error: uploadErr } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadErr) {
      console.warn(`[Supabase Storage Warning] Bucket ${bucketName} upload failed (${uploadErr.message}). Trying fallback bucket smartdine-images...`);
      bucketName = 'smartdine-images';
      const { error: fallbackErr } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (fallbackErr) {
        console.error('[Supabase Storage Error] All storage uploads failed:', uploadErr.message, fallbackErr.message);
        return NextResponse.json({
          error: 'Image could not be saved. Please try again or select another image.',
          details: `Bucket ${bucketName}: ${uploadErr.message} | Fallback: ${fallbackErr.message}`
        }, { status: 500 });
      }
    }

    // 6. Retrieve permanent public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      storageUrl: publicUrl,
      bucket: bucketName,
      path: filePath
    });
  } catch (err: any) {
    console.error('[Upload Image Catch Error]', err);
    return NextResponse.json({
      error: 'Image could not be saved. Please try again or select another image.',
      details: err.message || String(err)
    }, { status: 500 });
  }
}
