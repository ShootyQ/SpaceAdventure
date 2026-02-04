import { initializeApp, getApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "./firebase";

/**
 * Creates a student account using a temporary secondary Firebase App instance.
 * This prevents the current logged-in teacher from being signed out.
 */
export async function createStudentAuthAccount(email: string, pass: string) {
    // Unique name for secondary app to avoid conflicts
    const appName = `student-creator-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        // User created successfully.
        // We sign out immediately from the secondary app to be safe, though deleteApp should handle it.
        await signOut(secondaryAuth);
        return userCredential.user.uid;
    } catch (error) {
        console.error("Error creating student auth:", error);
        throw error;
    } finally {
        await deleteApp(secondaryApp);
    }
}
