// CleverOps Device & Session Manager
// Automatically syncs and tracks active hardware & browser sessions

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

export function detectCurrentDeviceInfo(): { deviceName: string; platform: 'Desktop' | 'Mobile' | 'Tablet' } {
  if (typeof window === 'undefined') {
    return { deviceName: 'Web Device', platform: 'Desktop' };
  }
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const osName = ua.includes('Windows') ? 'Windows PC' : ua.includes('Mac') ? 'macOS Device' : ua.includes('Android') ? 'Android Mobile' : ua.includes('iPhone') ? 'iPhone' : isTablet ? 'Tablet' : isMobile ? 'Mobile Device' : 'Desktop Browser';
  const browserName = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : ua.includes('Edg') ? 'Edge' : 'Browser';

  return {
    deviceName: `${osName} (${browserName})`,
    platform: isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop'
  };
}

export async function registerDeviceActivity(restaurantId?: string, profile?: any): Promise<void> {
  if (!restaurantId || typeof window === 'undefined') return;
  try {
    const deviceId = getOrCreateDeviceId();
    const { deviceName, platform } = detectCurrentDeviceInfo();

    await fetch('/api/auth/device-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`/api/auth/device-session?restaurantId=${encodeURIComponent(restaurantId)}`);
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
  await fetch('/api/auth/device-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      action: 'logout_device',
      targetDeviceId
    })
  });
}

export async function logoutAllDevices(restaurantId?: string): Promise<void> {
  if (!restaurantId || typeof window === 'undefined') return;
  await fetch('/api/auth/device-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      action: 'logout_all'
    })
  });
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
