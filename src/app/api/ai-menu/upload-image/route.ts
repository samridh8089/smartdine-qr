import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateMagicBytes, ALLOWED_IMAGE_MIMES, MAX_FILE_SIZE_BYTES, sanitizeFilename } from '@/lib/fileValidation';
import { handleApiError } from '@/lib/errors';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

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
    if (typeof imageUrl === 'string' && imageUrl.includes('supabase.co/storage/v1/object/public/')) {
      return NextResponse.json({ success: true, storageUrl: imageUrl });
    }

    let buffer: Buffer;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    // 2. Data URL handling (e.g. cropped source image base64)
    if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
      const matches = imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length < 3) {
        return NextResponse.json({ error: 'Image could not be saved. Invalid data URL format.' }, { status: 422 });
      }
      mimeType = matches[1].toLowerCase();
      if (!ALLOWED_IMAGE_MIMES.includes(mimeType)) {
        return NextResponse.json({ error: 'Unsupported image format. Allowed formats: JPG, PNG, WEBP.' }, { status: 400 });
      }
      ext = mimeType.split('/')[1] || 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      // 3. External HTTP URL handling
      const fetchRes = await fetch(imageUrl, {
        headers: {
          'Accept': 'image/jpeg,image/png,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      if (!fetchRes.ok) {
        console.error(`[Upload Image Error] Failed to fetch external image: ${fetchRes.status}`);
        return NextResponse.json({ error: 'Image could not be saved. Please try again or select another image.' }, { status: 422 });
      }

      const contentType = (fetchRes.headers.get('content-type') || 'image/jpeg').toLowerCase();
      mimeType = contentType.split(';')[0].trim();
      if (!ALLOWED_IMAGE_MIMES.includes(mimeType)) {
        return NextResponse.json({ error: 'Unsupported file format from remote source.' }, { status: 400 });
      }
      ext = mimeType.split('/')[1] || 'jpg';
      const arrayBuf = await fetchRes.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    } else {
      return NextResponse.json({ error: 'Invalid image URL format.' }, { status: 400 });
    }

    // 4. File Size & Magic Bytes Binary Verification
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File size exceeds 5 MB limit.' }, { status: 400 });
    }

    const magicCheck = validateMagicBytes(buffer);
    if (!magicCheck.valid) {
      console.warn('[Upload Image Security Block] Magic-bytes verification failed. Rejected dangerous payload.');
      return NextResponse.json({ error: 'Invalid image binary signature. Executable or dangerous files are strictly prohibited.' }, { status: 400 });
    }

    // 5. Generate sanitized, isolated path in the required structure: menu_items/<restaurant-id>/<uuid>.<ext>
    const safeRestaurantId = restaurantId.replace(/[^a-zA-Z0-9_\-]/g, '');
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const safeFileName = sanitizeFilename(`${uniqueId}.${ext}`);
    const filePath = `menu_items/${safeRestaurantId}/${safeFileName}`;

    // 6. Upload file buffer to Supabase Storage bucket using service-role client
    let bucketName = 'smartdine-images';
    let { error: uploadErr } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadErr) {
      bucketName = 'menu-item-images';
      const { error: fallbackErr } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (fallbackErr) {
        return handleApiError('Upload-Image Storage', fallbackErr, 'Image could not be saved to cloud storage.', 500);
      }
    }

    // 7. Retrieve public URL
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
    return handleApiError('Upload-Image', err, 'Failed to process image upload.', 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Storage service key not configured' }, { status: 500 });
    }
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');
    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    let bucketName = 'menu-item-images';
    let filePath = '';

    if (imageUrl.includes('/menu-item-images/')) {
      bucketName = 'menu-item-images';
      filePath = decodeURIComponent(imageUrl.split('/menu-item-images/')[1] || '').replace(/\.\./g, '');
    } else if (imageUrl.includes('/smartdine-images/')) {
      bucketName = 'smartdine-images';
      filePath = decodeURIComponent(imageUrl.split('/smartdine-images/')[1] || '').replace(/\.\./g, '');
    } else {
      return NextResponse.json({ success: true, message: 'Non-storage URL ignored' });
    }

    if (filePath) {
      await supabaseAdmin.storage.from(bucketName).remove([filePath]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return handleApiError('Upload-Image DELETE', err, 'Failed to remove image from storage.', 500);
  }
}


