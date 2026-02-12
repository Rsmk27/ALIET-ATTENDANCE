
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
    if (!adminAuth || !adminDb) {
        return NextResponse.json(
            { error: 'Server configuration missing for user deletion' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { uid, adminToken } = body;

        if (!uid) {
            return NextResponse.json(
                { error: 'Missing UID' },
                { status: 400 }
            );
        }

        console.log(`[DeleteUser] Request to delete user UID: ${uid}`);

        // 1. Verify admin token
        if (adminToken) {
            try {
                const decodedToken = await adminAuth.verifyIdToken(adminToken);
                // Optionally check role
                // const userRecord = await adminAuth.getUser(decodedToken.uid);
                // if (userRecord.customClaims?.role !== 'admin') { ... }
            } catch (authError) {
                console.error("Admin token verification failed:", authError);
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        } else {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }

        // 2. Delete from Firebase Authentication
        try {
            await adminAuth.deleteUser(uid);
            console.log(`[DeleteUser] Successfully deleted user from Auth: ${uid}`);
        } catch (authDeleteError: any) {
            if (authDeleteError.code === 'auth/user-not-found') {
                console.log(`[DeleteUser] User not found in Auth (UID: ${uid}), skipping.`);
            } else {
                console.error("[DeleteUser] Failed to delete user from Auth:", authDeleteError);
                // We proceed to try delete from Firestore even if Auth fails (maybe already deleted)
            }
        }

        // 3. Delete from Firestore (Server-side deletion for reliability)
        // We will do this here as well to ensure data consistency
        try {
            // Delete from 'users' collection
            await adminDb.collection('users').doc(uid).delete();
            console.log(`[DeleteUser] Deleted from 'users' collection: ${uid}`);

            // We can also try to find where else the user might be stored
            // The client logic handles the specific hierarchy deletion:
            // admin/students/BRANCH/YEAR/SECTION/UID
            // or admin/faculty/branch/DEPARTMENT/faculty_members/UID

            // Since path construction is complex and depends on user data,
            // we will let the client handle the specific hierarchy deletion 
            // OR we can fetch the user data first here and then delete.

            // Let's keep it simple: API handles Auth deletion primarily.
            // But having a server-side backup for 'users' collection is good.

        } catch (dbError) {
            console.error("[DeleteUser] Failed to delete from users collection:", dbError);
            return NextResponse.json(
                { error: 'Failed to delete user data from database' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' });

    } catch (error: any) {
        console.error('[DeleteUser] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
