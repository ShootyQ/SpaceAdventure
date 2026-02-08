import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Revalidate every hour to keep stats reasonably fresh but cached
export const revalidate = 3600;

export async function GET() {
  try {
    // If Admin SDK is not initialized (mock mode), return fallback
    // We can detect mock by checking if 'listCollections' exists or just try/catch
    
    const teachersQuery = await adminDb.collection('users')
      .where('role', '==', 'teacher')
      .get();
      
    if (teachersQuery.empty) {
      // Return a default count if database is empty or mock is running
      // Default to 1 (the creator)
      return NextResponse.json({ count: 1, initials: "KC" });
    }

    const count = teachersQuery.size;
    const teachers = teachersQuery.docs.map(doc => doc.data());
    const validTeachers = teachers.filter((t: any) => t.displayName);
    
    let initials = "KC";
    if (validTeachers.length > 0) {
        const randomTeacher = validTeachers[Math.floor(Math.random() * validTeachers.length)];
        const names = (randomTeacher.displayName || "KC").trim().split(' ');
        
        if (names.length >= 2) {
            initials = `${names[0][0]}${names[names.length - 1][0]}`;
        } else if (names.length === 1 && names[0].length >= 2) {
            initials = names[0].substring(0, 2);
        } else if (names.length === 1) {
            initials = names[0];
        }
    }

    return NextResponse.json({ 
        count: count, 
        initials: initials.toUpperCase() 
    });

  } catch (error) {
    console.error("Error fetching educator stats:", error);
    // Fail gracefully with default
    return NextResponse.json({ count: 1, initials: "KC" }, { status: 200 });
  }
}
