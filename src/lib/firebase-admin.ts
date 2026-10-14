import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

let firebaseAdminApp: App | null = null;
let messagingInstance: Messaging | null = null;

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  let serviceAccount: any = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (raw.startsWith('{')) {
        serviceAccount = JSON.parse(raw);
      } else {
        // Base64 encoded JSON
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
    } catch (e: any) {
      console.error('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var:', e?.message);
    }
  }

  if (!serviceAccount) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
    const absolutePath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(process.cwd(), serviceAccountPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`[FirebaseAdmin] Service account credentials not found (neither FIREBASE_SERVICE_ACCOUNT_KEY env var nor file at ${absolutePath})`);
    }

    const serviceAccountContent = fs.readFileSync(absolutePath, 'utf8');
    serviceAccount = JSON.parse(serviceAccountContent);
  }

  firebaseAdminApp = initializeApp({
    credential: cert(serviceAccount)
  });

  console.log('[FirebaseAdmin] Initialized successfully for project:', serviceAccount.project_id);
  return firebaseAdminApp;
}

export function getFirebaseMessaging(): Messaging {
  if (messagingInstance) {
    return messagingInstance;
  }
  const app = getFirebaseAdminApp();
  messagingInstance = getMessaging(app);
  return messagingInstance;
}
