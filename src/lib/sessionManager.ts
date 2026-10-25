// CleverOps Device & Session Manager
// Automatically syncs and tracks active hardware & browser sessions

import { supabase, signOutUser } from './supabase';
import { db } from './db';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let devId = localStorage.getItem('cleverops_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('cleverops_device_id', devId);
    }
    return devId;
  } catch {
    return 'fallback_session_' + Date.now();
  }
}

export function detectCurrentDeviceInfo(): { deviceName: string; platform: 'Desktop' | 'Mobile' | 'Tablet'; isApp: boolean } {
  if (typeof window === 'undefined') {
    return { deviceName: 'Web Device', platform: 'Desktop', isApp: false };
  }
  const ua = navigator.userAgent;
  const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone === true;
  const isWebView = /wv|Version\/4\.0/i.test(ua) || (window as any).Capacitor !== undefined || (window as any).Android !== undefined;
  const isApp = isStandalone || isWebView;

  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const osName = ua.includes('Windows') ? 'Windows PC' : ua.includes('Mac') ? 'macOS Device' : ua.includes('Android') ? 'Android Mobile' : ua.includes('iPhone') ? 'iPhone' : isTablet ? 'Tablet' : isMobile ? 'Mobile Device' : 'Desktop Browser';
  const browserName = isApp ? 'CleverOps App' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : ua.includes('Edg') ? 'Edge' : 'Browser';

  return {
    deviceName: `${osName} (${browserName})`,
    platform: isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop',
    isApp
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` };
    }
  } catch (_) {}
  return {};
}

export async function registerDeviceActivity(restaurantId?: string, profile?: any): Promise<void> {
  if (!restaurantId || typeof window === 'undefined') return;
  try {
    const deviceId = getOrCreateDeviceId();

    // Check if this device has been revoked
    const rest = await db.getRestaurantById(restaurantId);
    if (rest?.settings?.revoked_devices?.[deviceId]) {
      console.warn('[SessionManager] This device has been revoked remotely.');
      localStorage.removeItem('cleverops_device_id');
      await signOutUser();
      window.location.href = '/login?reason=session_revoked';
      return;
    }

    const { deviceName, platform } = detectCurrentDeviceInfo();
    const authHeaders = await getAuthHeaders();

    await fetch('/api/auth/device-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({
        restaurantId,
        action: 'register',
        deviceId,
        deviceName,
        platform,
        userEmail: profile?.email || '',
        userId: profile?.id || ''
      })
    });
  } catch (e) {
    console.warn('Failed to register device session:', e);
  }
}

export async function getActiveDevices(restaurantId?: string): Promise<any[]> {
  if (!restaurantId || typeof window === 'undefined') return [];
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/auth/device-session?restaurantId=${encodeURIComponent(restaurantId)}`, {
      headers: authHeaders
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.devices || [];
  } catch (e) {
    console.warn('Failed to get active devices:', e);
    return [];
  }
}

export async function removeTrustedDevice(restaurantId?: string, targetDeviceId?: string): Promise<void> {
  if (!restaurantId || !targetDeviceId || typeof window === 'undefined') return;
  const authHeaders = await getAuthHeaders();

  // 1. Call server API
  try {
    const res = await fetch('/api/auth/device-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({
        restaurantId,
        action: 'logout_device',
        targetDeviceId
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Server remove failed');
    }
  } catch (serverErr) {
    console.warn('Server logout error, executing client fallback:', serverErr);
  }

  // 2. Direct client database update guarantee
  try {
    const rest = await db.getRestaurantById(restaurantId);
    if (rest) {
      const currentDevices = { ...(rest.settings?.active_devices || {}) };
      const revokedDevices = { ...(rest.settings?.revoked_devices || {}) };
      
      delete currentDevices[targetDeviceId];
      for (const [k, v] of Object.entries(currentDevices) as [string, any][]) {
        if (v.device_id === targetDeviceId || v.device_session_id === targetDeviceId || k === targetDeviceId) {
          delete currentDevices[k];
        }
      }

      revokedDevices[targetDeviceId] = {
        revoked_at: new Date().toISOString()
      };

      await db.updateRestaurant(restaurantId, {
        settings: {
          ...rest.settings,
          active_devices: currentDevices,
          revoked_devices: revokedDevices
        }
      });
    }

    // If target was a mobile app session, clear push_token from profile
    if (targetDeviceId.startsWith('app_session_')) {
      const profId = targetDeviceId.replace('app_session_', '');
      await supabase.from('profiles').update({ push_token: null, updated_at: new Date().toISOString() }).eq('id', profId);
    }
  } catch (clientErr) {
    console.error('Client fallback device remove error:', clientErr);
  }
}

export async function logoutAllDevices(restaurantId?: string): Promise<void> {
  if (!restaurantId || typeof window === 'undefined') return;
  const authHeaders = await getAuthHeaders();

  try {
    await fetch('/api/auth/device-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({
        restaurantId,
        action: 'logout_all'
      })
    });
  } catch (e) {
    console.warn('Server logout all error, fallback directly:', e);
  }

  try {
    const rest = await db.getRestaurantById(restaurantId);
    if (rest) {
      const revoked: Record<string, any> = { ...(rest.settings?.revoked_devices || {}) };
      for (const k of Object.keys(rest.settings?.active_devices || {})) {
        revoked[k] = { revoked_at: new Date().toISOString() };
      }
      await db.updateRestaurant(restaurantId, {
        settings: {
          ...rest.settings,
          active_devices: {},
          revoked_devices: revoked
        }
      });
    }
    await supabase.from('profiles').update({ push_token: null }).eq('restaurant_id', restaurantId);
  } catch (err) {
    console.error('Logout all client fallback error:', err);
  }
}

export async function isDeviceTrusted(userId?: string): Promise<boolean> {
  return true;
}

export async function setDeviceTrusted(userId?: string): Promise<any> {
  return { is_trusted: true };
}

export function getDeviceSessionId(): string {
  return getOrCreateDeviceId();
}

export function getDeviceInfo(): any {
  return detectCurrentDeviceInfo();
}
