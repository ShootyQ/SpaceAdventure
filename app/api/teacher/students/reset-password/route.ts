import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth) {
      return NextResponse.json({ error: 'Password reset service unavailable.' }, { status: 503 });
    }

    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const teacherUid = decoded.uid;

    const body = await req.json();
    const studentUid = String(body?.studentUid || '');
    const newPassword = String(body?.newPassword || '');

    if (!studentUid || !newPassword) {
      return NextResponse.json({ error: 'Student ID and password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const teacherDoc = await adminDb.collection('users').doc(teacherUid).get();
    if (!teacherDoc.exists || teacherDoc.data()?.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can reset student passwords.' }, { status: 403 });
    }

    const studentDocRef = adminDb.collection('users').doc(studentUid);
    const studentDoc = await studentDocRef.get();

    if (!studentDoc.exists) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const studentData = studentDoc.data() || {};
    if (studentData.role !== 'student' || studentData.teacherId !== teacherUid) {
      return NextResponse.json({ error: 'You can only reset passwords for your own students.' }, { status: 403 });
    }

    await adminAuth.updateUser(studentUid, { password: newPassword });
    await studentDocRef.update({ password: newPassword });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting student password:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reset password.' },
      { status: 500 }
    );
  }
}
