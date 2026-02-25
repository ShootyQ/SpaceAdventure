import * as admin from 'firebase-admin';

let firebaseAdminInitError: string | null = null;

// Initialize Firebase Admin only if the private key allows it
if (!admin.apps.length) {
  // We check if the private key looks reasonably real to avoid "Too few bytes" parser errors
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (privateKey && privateKey.length > 100 && clientEmail && projectId) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey,
        }),
      });
    } catch (error: any) {
      firebaseAdminInitError = error?.message || 'Unknown Firebase Admin init error';
      console.error('[FIREBASE_ADMIN] initializeApp failed:', firebaseAdminInitError);
    }
  } else {
    const missing: string[] = [];
    if (!privateKey || privateKey.length <= 100) missing.push('FIREBASE_PRIVATE_KEY');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!projectId) missing.push('FIREBASE_PROJECT_ID (or GOOGLE_CLOUD_PROJECT / NEXT_PUBLIC_FIREBASE_PROJECT_ID)');
    firebaseAdminInitError = `Missing or invalid ${missing.join(', ')}`;
  }
}

// Export a robust fallback if Firebase didn't initialize (e.g. during Build or if keys are missing)
// This prevents the build from crashing when it imports files that use adminDb
export const adminDb = admin.apps.length 
  ? admin.firestore() 
  : {
      collection: (name: string) => ({
        doc: (id: string) => ({
            update: () => Promise.resolve(),
            set: () => Promise.resolve(),
            get: () => Promise.resolve({ exists: false, data: () => ({}) }),
        }),
        where: () => ({ get: () => Promise.resolve({ empty: true, docs: [] }) }),
        add: () => Promise.resolve({ id: 'mock-id' }),
      }),
      doc: (path: string) => ({
         update: () => Promise.resolve(),
         set: () => Promise.resolve(),
         get: () => Promise.resolve({ exists: false, data: () => ({}) }),
      }),
    } as unknown as admin.firestore.Firestore;

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminInitialized = admin.apps.length > 0;
export const adminInitError = firebaseAdminInitError;
