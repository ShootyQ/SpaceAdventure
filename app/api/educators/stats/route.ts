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
    let activeStudents = 24;
    let weeklyMissions = 5;

    if (validTeachers.length > 0) {
        // Pick a random teacher
        const randomTeacher = validTeachers[Math.floor(Math.random() * validTeachers.length)];
        const names = (randomTeacher.displayName || "KC").trim().split(' ');
        
        if (names.length >= 2) {
            initials = `${names[0][0]}${names[names.length - 1][0]}`;
        } else if (names.length === 1 && names[0].length >= 2) {
            initials = names[0].substring(0, 2);
        } else if (names.length === 1) {
            initials = names[0];
        }

        // Try to fetch real stats for this teacher from subcollections/queries
        // Note: In a real high-throughput scenario, we might want to aggregate these in a separate stats doc
        try {
            // Count students for this teacher
            const studentsQuery = await adminDb.collection('users')
                .where('role', '==', 'student')
                .where('teacherId', '==', randomTeacher.uid)
                .count()
                .get();
            
            // If the random teacher has 0 students, we might want to default to a reasonable demo number 
            // or just show 0. Let's start with real data first.
            if (studentsQuery.data().count > 0) {
                 activeStudents = studentsQuery.data().count;
            }

            // Count missions for this teacher
            const missionsQuery = await adminDb.collection('users')
                .doc(randomTeacher.uid)
                .collection('missions')
                .count()
                .get();
            
            if (missionsQuery.data().count > 0) {
                weeklyMissions = missionsQuery.data().count;
            }

        } catch (statError) {
            console.error("Error fetching detailed stats for teacher:", statError);
            // Fallback to defaults (24, 5) if permission/query fails
        }
    }

    return NextResponse.json({ 
        count: count, 
        initials: initials.toUpperCase(),
        activeStudents,
        weeklyMissions
    });

  } catch (error) {
    console.error("Error fetching educator stats:", error);
    // Fail gracefully with default
    return NextResponse.json({ count: 1, initials: "KC" }, { status: 200 });
  }
}
