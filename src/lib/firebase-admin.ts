import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
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

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
  const absolutePath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.join(process.cwd(), serviceAccountPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`[FirebaseAdmin] Service account file not found at path: ${absolutePath}`);
  }

  const serviceAccountContent = fs.readFileSync(absolutePath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountContent);

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
