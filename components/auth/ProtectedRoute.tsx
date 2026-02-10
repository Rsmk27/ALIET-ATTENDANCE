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
                const redirectRole = currentUser.role === 'hod' ? 'faculty' : currentUser.role;
                router.push(`/dashboard/${redirectRole}`);
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
        return null; // Or redirect handled in useEffect
    }

    // Check for pending approval for Faculty/HOD
    if ((currentUser.role === 'faculty' || currentUser.role === 'hod') && currentUser.isApproved === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
                    <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Account Pending Approval</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                        Your account is currently pending approval from the administrator.
                        <br />
                        Please wait for confirmation (via email) before accessing the dashboard.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full btn-primary py-2.5"
                        >
                            Refresh Status
                        </button>
                        <button
                            onClick={() => router.push('/login')} // Or implement signOut here if accessible or expect redirect
                            className="w-full py-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
