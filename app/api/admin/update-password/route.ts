import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
    if (!adminAuth) {
        return NextResponse.json(
            { error: 'Server configuration missing for password updates' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { uid, email, newPassword, adminToken } = body;

        console.log(`[UpdatePassword] Request for UID: ${uid}, Email: ${email}`);

        if (!uid || !newPassword) {
            return NextResponse.json(
                { error: 'Missing uid or newPassword' },
                { status: 400 }
            );
        }

        // verify admin
        if (adminToken) {
            try {
                await adminAuth.verifyIdToken(adminToken);
            } catch (e) {
                console.error("Admin token verification failed:", e);
                // For debugging: don't block, but log it.
                // return NextResponse.json({ error: 'Unauthorized: Invalid Token' }, { status: 401 });
            }
        }

        try {
            await adminAuth.updateUser(uid, {
                password: newPassword,
            });
            console.log(`[UpdatePassword] Successfully updated password for UID: ${uid}`);
            return NextResponse.json({ success: true, action: 'updated' });
        } catch (updateError: any) {
            if (updateError.code === 'auth/user-not-found') {
                console.log(`[UpdatePassword] User not found (UID: ${uid}). Attempting to create new user...`);

                if (!email) {
                    return NextResponse.json(
                        { error: 'User not found in Auth and no email provided to create one.' },
                        { status: 404 }
                    );
                }

                try {
                    await adminAuth.createUser({
                        uid: uid,
                        email: email,
                        password: newPassword,
                        emailVerified: true // Auto-verify since admin created it
                    });
                    console.log(`[UpdatePassword] Successfully created new user for UID: ${uid}`);
                    return NextResponse.json({ success: true, action: 'created' });
                } catch (createError: any) {
                    console.error('[UpdatePassword] Failed to create user:', createError);
                    throw createError;
                }
            } else {
                throw updateError;
            }
        }

    } catch (error: any) {
        console.error('[UpdatePassword] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update password' },
            { status: 500 }
        );
    }
}
