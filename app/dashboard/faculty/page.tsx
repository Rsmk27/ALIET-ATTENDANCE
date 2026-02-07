'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FacultyDashboard() {
    const { currentUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!currentUser || currentUser.role !== 'faculty')) {
            router.push('/login');
        }
    }, [currentUser, loading, router]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (!currentUser || currentUser.role !== 'faculty') return null;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Faculty Dashboard</h1>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Welcome, {currentUser.name}</h2>
                <p className="text-gray-600 mb-4">Manage your classes and mark attendance here.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div
                        className="bg-blue-50 p-4 rounded-md border border-blue-100 hover:shadow-lg transition cursor-pointer"
                        onClick={() => router.push('/dashboard/faculty/attendance')}
                    >
                        <h3 className="font-bold text-blue-700">Mark Attendance</h3>
                        <p className="text-sm text-blue-600">Record daily attendance for students.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
