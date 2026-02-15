
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { deleteUserRequestSchema } from '@/lib/validation/schemas';
import { isAdminEmail } from '@/lib/security/admin';
import { z } from 'zod';

export async function POST(req: NextRequest) {
    if (!adminAuth || !adminDb) {
        return NextResponse.json(
            { error: 'Server configuration missing for user deletion' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();

        // SECURITY: Validate input before processing
        let validated;
        try {
            validated = deleteUserRequestSchema.parse(body);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    {
                        error: 'Invalid input',
                        details: error.errors.map(e => ({
                            field: e.path.join('.'),
                            message: e.message
                        }))
                    },
                    { status: 400 }
                );
            }
            throw error;
        }

        const { uid, adminToken } = validated;

        if (process.env.NODE_ENV === 'development') {
            console.log(`[DeleteUser] Request to delete user UID: ${uid}`);
        }

        // SECURITY: Verify admin token and admin role
        if (!adminToken) {
            return NextResponse.json(
                { error: 'Unauthorized: No token provided' },
                { status: 401 }
            );
        }

        try {
            const decodedToken = await adminAuth.verifyIdToken(adminToken);
            
            // SECURITY: Verify admin access using centralized utility
            if (!isAdminEmail(decodedToken.email)) {
                return NextResponse.json(
                    { error: 'Forbidden: Admin access required' },
                    { status: 403 }
                );
            }
            
            // TODO: Implement custom claims for better security
            // const userRecord = await adminAuth.getUser(decodedToken.uid);
            // if (!userRecord.customClaims?.admin) {
            //     return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
            // }
        } catch (authError) {
            console.error("Admin token verification failed:", authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Delete from Firebase Authentication
        try {
            await adminAuth.deleteUser(uid);
            if (process.env.NODE_ENV === 'development') {
                console.log(`[DeleteUser] Successfully deleted user from Auth: ${uid}`);
            }
        } catch (authDeleteError: any) {
            if (authDeleteError.code === 'auth/user-not-found') {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[DeleteUser] User not found in Auth (UID: ${uid}), skipping.`);
                }
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
            if (process.env.NODE_ENV === 'development') {
                console.log(`[DeleteUser] Deleted from 'users' collection: ${uid}`);
            }

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
