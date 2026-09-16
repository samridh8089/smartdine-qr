// SmartDine Desktop Preload Bridge (Electron IPC)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: 'desktop',
  isElectron: true,
  getVersion: () => ipcRenderer.invoke('app:version'),

  // Notification API
  showNotification: (options) => ipcRenderer.invoke('desktop:show-notification', options),

  // Window Management
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Offline SQLite Queue & Cache
  enqueueOfflineOrder: (order) => ipcRenderer.invoke('offline:enqueue-order', order),
  getPendingOrders: (restaurantId) => ipcRenderer.invoke('offline:get-pending-orders', restaurantId),
  syncOfflineQueue: () => ipcRenderer.invoke('offline:sync-now'),
  getCachedTables: (restaurantId) => ipcRenderer.invoke('offline:get-cached-tables', restaurantId),
  getCachedMenu: (restaurantId) => ipcRenderer.invoke('offline:get-cached-menu', restaurantId),
  cacheTables: (restaurantId, tables) => ipcRenderer.invoke('offline:cache-tables', { restaurantId, tables }),
  cacheMenu: (restaurantId, items) => ipcRenderer.invoke('offline:cache-menu', { restaurantId, items }),
  getSyncQueue: (restaurantId) => ipcRenderer.invoke('offline:get-sync-queue', restaurantId),

  // Online Status Events
  onSyncStatusChange: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('sync:status', sub);
    return () => ipcRenderer.removeListener('sync:status', sub);
  }
});
