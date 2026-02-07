'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({
    children,
    allowedRoles,
}: {
    children: React.ReactNode;
    allowedRoles?: string[];
}) {
    const { currentUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!currentUser) {
                router.push('/login');
            } else if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
                // Redirect to appropriate dashboard based on role
                router.push(`/dashboard/${currentUser.role}`);
            }
        }
    }, [currentUser, loading, allowedRoles, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
        return null;
    }

    return <>{children}</>;
}
