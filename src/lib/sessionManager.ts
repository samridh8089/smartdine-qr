// Device verification and trusted device management permanently removed

export async function isDeviceTrusted(userId?: string): Promise<boolean> {
  return true;
}

export async function setDeviceTrusted(userId?: string): Promise<any> {
  return { is_trusted: true };
}

export async function getActiveDevices(userId?: string): Promise<any[]> {
  return [];
}

export async function removeTrustedDevice(userId?: string, targetSessionId?: string): Promise<void> {}

export async function logoutAllDevices(userId?: string): Promise<void> {}

export async function registerDeviceActivity(userId?: string): Promise<void> {}

export function getDeviceSessionId(): string {
  return 'standard_session';
}

export function getDeviceInfo(): any {
  return { platform: 'Web', browser: 'Browser', deviceName: 'Web Device' };
}
