import dns from 'dns';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateMagicBytes, ALLOWED_IMAGE_MIMES, MAX_FILE_SIZE_BYTES, sanitizeFilename } from '@/lib/fileValidation';
import { handleApiError } from '@/lib/errors';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  // IPv4 check
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
      if (parts[0] === 127) return true; // 127.0.0.0/8 loopback
      if (parts[0] === 10) return true;  // 10.0.0.0/8 private
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12 private
      if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16 private
      if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 link-local
      if (parts[0] === 0) return true; // 0.0.0.0/8
    }
    return false;
  }
  // IPv6 check
  const normalized = ip.toLowerCase().trim();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // fc00::/7
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true; // fe80::/10
  return false;
}

async function isSafeExternalImageUrl(rawUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname || hostname === 'localhost') return false;

    if (isPrivateIp(hostname)) return false;

    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) return false;
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, itemId, imageUrl, previousUrl, oldImageUrl } = body;
    const oldToClean = previousUrl || oldImageUrl;

    if (!restaurantId || !imageUrl) {
      return NextResponse.json({ error: 'Missing restaurantId or imageUrl' }, { status: 400 });
    }

    // Enforce Staff Authorization & Tenant Isolation
    const authCheck = await verifyStaffRequest(
      req,
      ['owner', 'manager', 'supervisor', 'head_chef', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('[Upload Image Error] SUPABASE_SERVICE_ROLE_KEY environment variable is not configured.');
      return NextResponse.json({
        error: 'Server storage configuration error. SUPABASE_SERVICE_ROLE_KEY is required for image upload.'
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

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
    } else if (typeof imageUrl === 'string' && imageUrl.startsWith('https://')) {
      const isSafe = await isSafeExternalImageUrl(imageUrl);
      if (!isSafe) {
        return NextResponse.json({ error: 'Invalid or restricted image URL.' }, { status: 400 });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout limit

      let fetchRes: Response;
      try {
        fetchRes = await fetch(imageUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'Accept': 'image/jpeg,image/png,image/webp,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!fetchRes.ok) {
        console.error(`[Upload Image Error] Failed to fetch external image: ${fetchRes.status}`);
        return NextResponse.json({ error: 'Image could not be saved. Please try again or select another image.' }, { status: 422 });
      }

      const contentLength = fetchRes.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'File size exceeds 5 MB limit.' }, { status: 400 });
      }

      const contentType = (fetchRes.headers.get('content-type') || 'image/jpeg').toLowerCase();
      mimeType = contentType.split(';')[0].trim();
      if (!ALLOWED_IMAGE_MIMES.includes(mimeType)) {
        return NextResponse.json({ error: 'Unsupported file format from remote source.' }, { status: 400 });
      }
      ext = mimeType.split('/')[1] || 'jpg';
      const arrayBuf = await fetchRes.arrayBuffer();
      if (arrayBuf.byteLength > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'File size exceeds 5 MB limit.' }, { status: 400 });
      }
      buffer = Buffer.from(arrayBuf);
    } else {
      return NextResponse.json({ error: 'Invalid image URL format. Only HTTPS URLs are permitted.' }, { status: 400 });
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

    // Normalize true MIME type and extension from verified magic bytes
    const finalMime = magicCheck.detectedType || mimeType;
    let finalExt = ext;
    if (finalMime === 'image/png') finalExt = 'png';
    else if (finalMime === 'image/webp') finalExt = 'webp';
    else if (finalMime === 'image/jpeg' || finalMime === 'image/jpg') finalExt = 'jpeg';

    // 5. Generate sanitized, isolated path in the required structure: menu_items/<restaurant-id>/<uuid>.<ext>
    const safeRestaurantId = restaurantId.replace(/[^a-zA-Z0-9_\-]/g, '');
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const safeFileName = sanitizeFilename(`${uniqueId}.${finalExt}`);
    const filePath = `menu_items/${safeRestaurantId}/${safeFileName}`;

    // 6. Upload file buffer to Supabase Storage bucket using service-role client
    let bucketName = 'smartdine-images';
    let { error: uploadErr } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: finalMime,
        upsert: true
      });

    if (uploadErr) {
      bucketName = 'menu-item-images';
      const { error: fallbackErr } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: finalMime,
          upsert: true
        });

      if (fallbackErr) {
        return handleApiError('Upload-Image Storage', fallbackErr, 'Image could not be saved to cloud storage.', 500);
      }
    }

    // 7. Retrieve public URL and ensure accessibility
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const baseSupabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl).replace(/\/+$/, '');
    const finalStorageUrl = (publicUrl || `${baseSupabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`).trim();

    // Verify generated public URL returns HTTP 200 before returning to client
    try {
      const verifyRes = await fetch(finalStorageUrl, { method: 'HEAD' });
      if (!verifyRes.ok && verifyRes.status !== 405) {
        console.warn(`[Upload Image] HEAD check returned status ${verifyRes.status}`);
      }
    } catch (verifyErr) {
      console.warn('[Upload Image] Pre-flight verification notice:', verifyErr);
    }

    // 8. Clean up replaced storage object if previousUrl was provided (atomic replacement)
    let previousCleanupResult = null;
    if (oldToClean && typeof oldToClean === 'string' && oldToClean.includes('supabase.co/storage') && oldToClean !== finalStorageUrl) {
      try {
        previousCleanupResult = await deleteStorageObjectIfUnshared(supabaseAdmin, oldToClean, itemId);
      } catch (cleanErr) {
        console.warn('[Upload Image] Background cleanup notice for old image:', cleanErr);
      }
    }

    return NextResponse.json({
      success: true,
      storageUrl: finalStorageUrl,
      bucket: bucketName,
      path: filePath,
      replacedOldImage: previousCleanupResult?.deleted ?? false
    });
  } catch (err: any) {
    return handleApiError('Upload-Image', err, 'Failed to process image upload.', 500);
  }
}

/**
 * Safely removes a storage object from Supabase Storage buckets,
 * verifying first that no OTHER dish in the restaurant/database shares the same image.
 * Guarantees: Never delete another dish's image!
 */
async function deleteStorageObjectIfUnshared(
  supabaseAdmin: any,
  imageUrl: string,
  excludeItemId?: string | null
): Promise<{ deleted: boolean; bucket: string; path: string; reason?: string }> {
  let bucketName = 'smartdine-images';
  let rawPath = '';

  if (imageUrl.includes('/menu-item-images/')) {
    bucketName = 'menu-item-images';
    rawPath = imageUrl.split('/menu-item-images/')[1] || '';
  } else if (imageUrl.includes('/smartdine-images/')) {
    bucketName = 'smartdine-images';
    rawPath = imageUrl.split('/smartdine-images/')[1] || '';
  } else {
    return { deleted: false, bucket: '', path: '', reason: 'Non-storage URL ignored' };
  }

  let filePath = '';
  try {
    filePath = decodeURIComponent(rawPath).replace(/\.\./g, '');
  } catch {
    filePath = rawPath.replace(/\.\./g, '');
  }

  // Strip query parameters and leading slashes
  filePath = filePath.replace(/^\/+/, '').split('?')[0].trim();
  if (!filePath) {
    return { deleted: false, bucket: bucketName, path: '', reason: 'Empty or invalid file path' };
  }

  try {
    const res = await supabaseAdmin
      .from('menu_items')
      .select('id, name')
      .or(`image_url.eq.${imageUrl},image_url.ilike.%${filePath}%`);

    const referencingItems: Array<{ id: string; name: string }> = res.data || [];

    if (res.error) {
      console.warn('[Upload Image Clean] Safety check query notice:', res.error.message);
    }

    if (referencingItems.length > 0) {
      const otherDishes = excludeItemId
        ? referencingItems.filter(item => item.id !== excludeItemId)
        : referencingItems;

      const isSharedByOthers = excludeItemId
        ? otherDishes.length > 0
        : referencingItems.length > 1;

      if (isSharedByOthers) {
        console.log(`[Upload Image Clean] Preserving ${filePath}: shared by other dish(es):`, otherDishes.map(d => d.name).join(', '));
        return {
          deleted: false,
          bucket: bucketName,
          path: filePath,
          reason: 'Image is shared by other dishes; retained to prevent broken references'
        };
      }
    }
  } catch (checkErr) {
    console.warn('[Upload Image Clean] Referencing check notice:', checkErr);
  }

  const { error: removeErr } = await supabaseAdmin.storage
    .from(bucketName)
    .remove([filePath]);

  if (removeErr) {
    console.error(`[Upload Image Clean] Failed to remove ${filePath} from ${bucketName}:`, removeErr.message);
    throw removeErr;
  }

  console.log(`[Upload Image Clean] Successfully deleted unreferenced storage object: ${bucketName}/${filePath}`);
  return {
    deleted: true,
    bucket: bucketName,
    path: filePath
  };
}

export async function DELETE(req: Request) {
  try {
    const authCheck = await verifyStaffRequest(
      req,
      ['owner', 'manager', 'supervisor', 'head_chef', 'super_admin']
    );
    if (!authCheck.isAuthorized) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Storage service key not configured' }, { status: 500 });
    }
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');
    const excludeItemId = searchParams.get('excludeItemId');

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const result = await deleteStorageObjectIfUnshared(supabaseAdmin, imageUrl, excludeItemId);

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      bucket: result.bucket,
      path: result.path,
      message: result.reason || (result.deleted ? 'Storage object successfully deleted' : 'Storage object retained')
    });
  } catch (err: any) {
    return handleApiError('Upload-Image DELETE', err, 'Failed to remove image from storage.', 500);
  }
}
