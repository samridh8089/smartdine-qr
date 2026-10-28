import { createClient } from '@supabase/supabase-js';
import { validateMagicBytes, MAX_FILE_SIZE_BYTES, sanitizeFilename } from './fileValidation';


const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const isServer = typeof window === 'undefined';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rawKey = (isServer && serviceKey && serviceKey !== '[SENSITIVE]')
  ? serviceKey
  : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

if (!rawUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
}
if (!rawKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
}

const supabaseUrl = rawUrl;
const supabaseAnonKey = rawKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: !isServer,
    autoRefreshToken: !isServer,
    detectSessionInUrl: !isServer,
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
 * Safely extracts active Supabase JWT access token across auth session and localStorage
 */
export const getClientAuthToken = async (forceRefresh = false): Promise<string> => {
  if (typeof window === 'undefined') return '';

  try {
    // 1. Direct Supabase session
    if (forceRefresh) {
      const { data: refreshData } = await supabase.auth.refreshSession().catch(() => ({ data: null }));
      if (refreshData?.session?.access_token) {
        return refreshData.session.access_token;
      }
    }

    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: null }));
    if (sessionData?.session?.access_token) {
      return sessionData.session.access_token;
    }

    // 2. Read from localStorage smartdine_auth_token_v2
    const raw = localStorage.getItem('smartdine_auth_token_v2');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const token = Array.isArray(parsed) ? parsed[0]?.access_token : (parsed?.access_token || parsed);
        if (token && typeof token === 'string' && token.length > 20) return token;
      } catch {
        if (typeof raw === 'string' && raw.length > 20) return raw;
      }
    }

    // 3. Scan for Supabase project keys (sb-*-auth-token)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            const token = Array.isArray(parsed) ? parsed[0]?.access_token : (parsed?.access_token || parsed);
            if (token && typeof token === 'string' && token.length > 20) return token;
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn('[getClientAuthToken] Notice extracting auth token:', err);
  }

  return '';
};

/**
 * Returns Bearer and staff authorization headers for authenticated internal API calls
 */
export const getClientAuthHeaders = async (forceRefresh = false): Promise<Record<string, string>> => {
  const token = await getClientAuthToken(forceRefresh);
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'x-staff-token': token
    };
  }
  return {};
};

export const signOutUser = async () => {
  clearActiveUserCache();
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.removeItem('smartdine_auth_token_v2');
      localStorage.removeItem('smartdine_impersonated_profile');
    }
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Logout error:', e);
  }
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
          
          // Secure Server-Side Auto-Link: shift from browser-side upsert to authenticated server route
          try {
            const clientToken = await getClientAuthToken();
            if (clientToken && typeof window !== 'undefined') {
              await fetch('/api/auth/auto-link-profile', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${clientToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ restaurantId: foundRest.id })
              }).catch((linkErr) => {
                console.warn('[Supabase Auth] Auto-link server route notice:', linkErr);
              });
            }
          } catch (linkEx) {
            console.warn('[Supabase Auth] Auto-link exception:', linkEx);
          }
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
  async uploadImage(file: File, restaurantId: string, path: string, previousUrl?: string): Promise<string> {
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

    // In browser environment, upload via server endpoint using service-role to avoid client RLS restrictions
    if (typeof window !== 'undefined') {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file data'));
        reader.readAsDataURL(file);
      });

      const cleanSubdir = path
        .split('/')
        .map(seg => seg.replace(/[^a-zA-Z0-9_\-]/g, ''))
        .filter(Boolean)
        .join('_');

      const uniqueSubPath = cleanSubdir
        ? `${cleanSubdir}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        : `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const authHeaders = await getClientAuthHeaders();

      let res = await fetch('/api/ai-menu/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          restaurantId,
          itemId: uniqueSubPath,
          imageUrl: dataUrl,
          previousUrl: previousUrl || undefined
        })
      });

      // Token retry if 401 Unauthorized
      if (res.status === 401) {
        const refreshedHeaders = await getClientAuthHeaders(true);
        if (refreshedHeaders.Authorization) {
          res = await fetch('/api/ai-menu/upload-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...refreshedHeaders
            },
            body: JSON.stringify({
              restaurantId,
              itemId: uniqueSubPath,
              imageUrl: dataUrl,
              previousUrl: previousUrl || undefined
            })
          });
        }
      }

      const resData = await res.json();
      if (!res.ok || !resData.success || !resData.storageUrl) {
        throw new Error(resData.error || 'Image upload failed');
      }

      return resData.storageUrl;
    }

    const safeRestId = restaurantId.replace(/[^a-zA-Z0-9_\-]/g, '');
    const cleanSubdir = path
      .split('/')
      .map(seg => seg.replace(/[^a-zA-Z0-9_\-]/g, ''))
      .filter(Boolean)
      .join('/');
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileName = `${uniqueId}.${fileExt}`;
    const filePath = `menu_items/${safeRestId}/${fileName}`;

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

  async deleteImage(publicUrl: string, excludeItemId?: string): Promise<void> {
    try {
      if (!publicUrl || !publicUrl.includes('supabase.co/storage')) return;

      const params = new URLSearchParams({ url: publicUrl });
      if (excludeItemId) params.set('excludeItemId', excludeItemId);

      if (typeof window !== 'undefined') {
        const authHeaders = await getClientAuthHeaders();
        const res = await fetch(`/api/ai-menu/upload-image?${params.toString()}`, {
          method: 'DELETE',
          headers: authHeaders
        });
        if (!res.ok) {
          console.warn(`[Storage Delete] Server responded with status ${res.status}`);
        }
        return;
      }

      let bucket = 'smartdine-images';
      let filePath = '';
      if (publicUrl.includes('/menu-item-images/')) {
        bucket = 'menu-item-images';
        filePath = decodeURIComponent(publicUrl.split('/menu-item-images/')[1] || '').replace(/\.\./g, '');
      } else if (publicUrl.includes('/smartdine-images/')) {
        bucket = 'smartdine-images';
        filePath = decodeURIComponent(publicUrl.split('/smartdine-images/')[1] || '').replace(/\.\./g, '');
      } else {
        return;
      }
      filePath = filePath.replace(/^\/+/, '').split('?')[0].trim();
      if (!filePath) return;

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);
        
      if (error) {
        console.error('Failed to delete image from storage:', error.message);
      }
    } catch (e) {
      console.error('Failed to parse or execute public URL deletion:', e);
    }
  }
};

export const storageHelper = storage;

