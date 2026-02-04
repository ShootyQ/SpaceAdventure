// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// @ts-ignore
import { getAnalytics, isSupported } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyDVHiiCHkP-RFOI26cIrD_OijLnw1r3B8Q",
  authDomain: "spaceadventure-7d540.firebaseapp.com",
  projectId: "spaceadventure-7d540",
  storageBucket: "spaceadventure-7d540.firebasestorage.app",
  messagingSenderId: "546441300465",
  appId: "1:546441300465:web:28ae387d2bdbb8011a1c50",
  measurementId: "G-8R9PYL00XH"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

let analytics;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, auth, googleProvider, analytics };