import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "mock-client-email@example.com",
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCd+t5A3s+w\n2M+dJ/2zJ4u5O9/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\ny6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/y6/\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCd+t5A3s+w\n-----END PRIVATE KEY-----",
    }),
  });
}

export const adminDb = admin.firestore();
