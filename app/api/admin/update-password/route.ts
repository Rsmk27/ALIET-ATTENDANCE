
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { updatePasswordRequestSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

export async function POST(req: NextRequest) {
    if (!adminAuth) {
        return NextResponse.json(
            { error: 'Server configuration missing for password updates' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();

        // SECURITY: Validate input before processing
        let validated;
        try {
            validated = updatePasswordRequestSchema.parse(body);
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

        const { uid, email, newPassword, adminToken } = validated;

        // SECURITY: Verify admin authentication (CRITICAL - DO NOT DISABLE)
        if (!adminToken) {
            return NextResponse.json(
                { error: 'Unauthorized: No token provided' },
                { status: 401 }
            );
        }

        try {
            const decodedToken = await adminAuth.verifyIdToken(adminToken);
            
            // SECURITY: Verify admin access
            // Check if user email is in admin list
            const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
                ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(e => e.trim())
                : ['zestacademyonline@gmail.com', 'ramunarlapati27@gmail.com'];
            
            if (!decodedToken.email || !adminEmails.includes(decodedToken.email)) {
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
        } catch (e) {
            console.error("Admin token verification failed:", e);
            return NextResponse.json(
                { error: 'Unauthorized: Invalid Token' },
                { status: 401 }
            );
        }

        try {
            await adminAuth.updateUser(uid, {
                password: newPassword,
            });
            if (process.env.NODE_ENV === 'development') {
                console.log(`[UpdatePassword] Successfully updated password for UID: ${uid}`);
            }
            return NextResponse.json({ success: true, action: 'updated' });
        } catch (updateError: any) {
            if (updateError.code === 'auth/user-not-found') {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[UpdatePassword] User not found (UID: ${uid}). Attempting to create new user...`);
                }

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
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[UpdatePassword] Successfully created new user for UID: ${uid}`);
                    }
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
