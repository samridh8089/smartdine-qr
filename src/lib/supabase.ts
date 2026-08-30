import { createClient } from '@supabase/supabase-js';
import { validateMagicBytes, MAX_FILE_SIZE_BYTES, sanitizeFilename } from './fileValidation';


const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'smartdine_auth_token_v2'
  }
});


// High-speed in-memory user cache with short TTL to eliminate redundant queries across layouts/pages
let cachedProfile: any = null;
let cachedProfileTimestamp = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache for rapid intra-page navigations

export const clearActiveUserCache = () => {
  cachedProfile = null;
  cachedProfileTimestamp = 0;
};

/**
 * Robust active user resolver with proactive token refresh and multi-tab safety
 */
export const getActiveUser = async (forceRefresh = false) => {
  // 1. Check Super Admin Impersonation Session
  if (typeof window !== 'undefined') {
    const impersonated = sessionStorage.getItem('smartdine_impersonated_profile');
    if (impersonated) {
      try {
        return JSON.parse(impersonated);
      } catch (e) {}
    }
  }

  // 2. Fast cache hit
  const now = Date.now();
  if (!forceRefresh && cachedProfile && (now - cachedProfileTimestamp < CACHE_TTL_MS)) {
    return cachedProfile;
  }

  try {
    // 3. Check current session or refresh if needed
    let sessionUser: any = null;
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    
    if (sessionData?.session?.user) {
      sessionUser = sessionData.session.user;
    } else {
      // Attempt silent token refresh on wake / sleep return
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session?.user) {
        sessionUser = refreshData.session.user;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          sessionUser = userData.user;
        }
      }
    }

    if (!sessionUser) {
      cachedProfile = null;
      return null;
    }

    // 4. Fetch profile from database
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .maybeSingle();

    let resolvedRestId = data?.restaurant_id || sessionUser.user_metadata?.restaurant_id || null;

    // Self-Healing Fallback: Auto-resolve missing restaurant_id from restaurants table
    if (!resolvedRestId) {
      try {
        const { data: matchedRests } = await supabase
          .from('restaurants')
          .select('id, owner_id, settings, subscription_plan')
          .order('created_at', { ascending: false })
          .limit(20);

        const foundRest = (matchedRests || []).find(r => 
          r.owner_id === sessionUser.id ||
          (sessionUser.email && r.settings?.owner_email?.toLowerCase() === sessionUser.email?.toLowerCase()) ||
          (sessionUser.phone && r.settings?.owner_phone === sessionUser.phone)
        );

        if (foundRest) {
          resolvedRestId = foundRest.id;
          
          // Auto-upsert profile row to link this restaurant_id permanently
          await supabase.from('profiles').upsert({
            id: sessionUser.id,
            email: sessionUser.email || '',
            full_name: sessionUser.user_metadata?.fullName || sessionUser.email || 'Owner',
            role: sessionUser.user_metadata?.role || 'owner',
            restaurant_id: foundRest.id,
            is_active: true
          });
        }
      } catch (matchErr) {
        console.warn('[Supabase Auth] Restaurant auto-matching notice:', matchErr);
      }
    }

    if (error || !data) {
      const fallbackProfile = {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.user_metadata?.fullName || sessionUser.email,
        role: sessionUser.user_metadata?.role || 'owner',
        restaurant_id: resolvedRestId,
        phone: sessionUser.user_metadata?.phone || '',
        is_active: true
      };
      cachedProfile = fallbackProfile;
      cachedProfileTimestamp = now;
      return fallbackProfile;
    }

    const finalProfile = { ...data, restaurant_id: resolvedRestId || data.restaurant_id };
    cachedProfile = finalProfile;
    cachedProfileTimestamp = now;
    return finalProfile;
  } catch (err) {
    console.warn('[Supabase Auth] getActiveUser recovery attempt error:', err);
    return cachedProfile || null;
  }
};

// Lifecycle listener: automatically refresh session whenever window or tab regains focus
if (typeof window !== 'undefined') {
  const handleWakeAndFocus = async () => {
    if (document.visibilityState === 'visible') {
      try {
        await supabase.auth.getSession();
      } catch (e) {}
    }
  };

  window.addEventListener('visibilitychange', handleWakeAndFocus);
  window.addEventListener('focus', handleWakeAndFocus);
  window.addEventListener('online', handleWakeAndFocus);
}

export const IS_MOCK_MODE = false;

export const storage = {
  async uploadImage(file: File, restaurantId: string, path: string): Promise<string> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('File size exceeds the 5 MB limit.');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
      throw new Error('Unsupported file format. Please upload jpg, jpeg, png, or webp.');
    }

    if (file.type && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      throw new Error('Invalid image MIME type.');
    }

    // Binary Magic-Bytes inspection
    try {
      const arrayBuf = await file.slice(0, 32).arrayBuffer();
      const magicCheck = validateMagicBytes(new Uint8Array(arrayBuf));
      if (!magicCheck.valid) {
        throw new Error('Invalid image binary content. File rejected for security reasons.');
      }
    } catch (e: any) {
      if (e.message?.includes('security reasons')) throw e;
    }

    const safeRestId = restaurantId.replace(/[^a-zA-Z0-9_\-]/g, '');
    const safePath = path.replace(/[^a-zA-Z0-9_\-]/g, '');
    const fileName = sanitizeFilename(`${safePath}.${fileExt}`);
    const filePath = `${safeRestId}/${fileName}`;

    const { error } = await supabase.storage
      .from('smartdine-images')
      .upload(filePath, file, {
        contentType: file.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: true
      });

    if (error) {
      throw new Error('Image upload failed: ' + error.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('smartdine-images')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async uploadAudio(file: File, restaurantId: string, path: string): Promise<string> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('File size exceeds the 5 MB limit.');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['mp3', 'wav', 'm4a'].includes(fileExt)) {
      throw new Error('Unsupported file format. Please upload mp3, wav, or m4a.');
    }

    if (file.type && !['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a'].includes(file.type.toLowerCase())) {
      throw new Error('Invalid audio MIME type.');
    }

    // Binary Magic-Bytes inspection
    try {
      const arrayBuf = await file.slice(0, 32).arrayBuffer();
      const magicCheck = validateMagicBytes(new Uint8Array(arrayBuf));
      if (!magicCheck.valid) {
        throw new Error('Invalid audio binary content. File rejected for security reasons.');
      }
    } catch (e: any) {
      if (e.message?.includes('security reasons')) throw e;
    }

    const safeRestId = restaurantId.replace(/[^a-zA-Z0-9_\-]/g, '');
    const safePath = path.replace(/[^a-zA-Z0-9_\-]/g, '');
    const fileName = sanitizeFilename(`${safePath}.${fileExt}`);
    const filePath = `${safeRestId}/${fileName}`;

    const { error } = await supabase.storage
      .from('smartdine-images')
      .upload(filePath, file, {
        contentType: file.type || `audio/${fileExt}`,
        upsert: true
      });

    if (error) {
      throw new Error('Audio upload failed: ' + error.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('smartdine-images')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async deleteImage(publicUrl: string): Promise<void> {
    try {
      const parts = publicUrl.split('/smartdine-images/');
      if (parts.length < 2) return;
      const filePath = decodeURIComponent(parts[1]).replace(/\.\./g, '');
      
      const { error } = await supabase.storage
        .from('smartdine-images')
        .remove([filePath]);
        
      if (error) {
        console.error('Failed to delete image from storage:', error.message);
      }
    } catch (e) {
      console.error('Failed to parse public URL for deletion:', e);
    }
  }
};

