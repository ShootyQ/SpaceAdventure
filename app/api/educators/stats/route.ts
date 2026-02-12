import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Revalidate every hour to keep stats reasonably fresh but cached
export const revalidate = 3600;

function toInitials(displayName: string | undefined) {
  const safe = (displayName || "").trim();
  if (!safe) return "";

  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return parts[0].slice(0, 1).toUpperCase();
}

export async function GET() {
  try {
    // If Admin SDK is not initialized (mock mode), return fallback
    // We can detect mock by checking if 'listCollections' exists or just try/catch
    
    const teachersQuery = await adminDb.collection('users')
      .where('role', '==', 'teacher')
      .get();
      
    if (teachersQuery.empty) {
      // Fallback for marketing/early-access environments where the DB may be empty.
      // Keep this non-sensitive and static.
      return NextResponse.json({
        count: 2,
        initials: "CD",
        initialsList: ["CD", "SK"],
        activeStudents: 24,
        weeklyMissions: 5,
      });
    }

    const count = teachersQuery.size;
    const teachers = teachersQuery.docs.map((doc) => ({ uid: doc.id, ...doc.data() } as any));
    const validTeachers = teachers.filter((t: any) => t.displayName);

    const sortedTeachers = [...validTeachers].sort((a: any, b: any) =>
      String(a.displayName || "").localeCompare(String(b.displayName || ""))
    );

    const initialsList = sortedTeachers
      .map((t: any) => toInitials(t.displayName))
      .filter(Boolean)
      .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)
      .slice(0, 2);

    let initials = initialsList[0] || "KC";
    let activeStudents = 24;
    let weeklyMissions = 5;

    if (sortedTeachers.length > 0) {
      const primaryTeacher = sortedTeachers[0];

      // Try to fetch real stats for this teacher from subcollections/queries
      // Note: In a higher-throughput scenario, we'd aggregate these in a separate stats doc.
      try {
        // Count students for this teacher
        const studentsQuery = await adminDb
          .collection('users')
          .where('role', '==', 'student')
          .where('teacherId', '==', primaryTeacher.uid)
          .count()
          .get();

        if (studentsQuery.data().count > 0) {
          activeStudents = studentsQuery.data().count;
        }

        // Count missions for this teacher
        const missionsQuery = await adminDb
          .collection('users')
          .doc(primaryTeacher.uid)
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
      count,
      initials,
      initialsList: initialsList.length ? initialsList : [initials],
      activeStudents,
      weeklyMissions,
    });

  } catch (error) {
    console.error("Error fetching educator stats:", error);
    // Fail gracefully with default
    return NextResponse.json({
      count: 2,
      initials: "CD",
      initialsList: ["CD", "SK"],
      activeStudents: 24,
      weeklyMissions: 5,
    }, { status: 200 });
  }
}
