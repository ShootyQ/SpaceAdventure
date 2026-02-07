import * as admin from 'firebase-admin';

// Initialize Firebase Admin only if the private key allows it
if (!admin.apps.length) {
  // We check if the private key looks reasonably real to avoid "Too few bytes" parser errors
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (privateKey && privateKey.length > 100) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
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
