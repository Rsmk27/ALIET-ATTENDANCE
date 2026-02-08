'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { User, BarChart3, Presentation } from 'lucide-react';

export default function FacultyDashboard() {
    const { currentUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!currentUser || currentUser.role !== 'faculty')) {
            router.push('/login');
        }
    }, [currentUser, loading, router]);

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!currentUser || currentUser.role !== 'faculty') return null;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>

            {/* Profile Card */}
            <div
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all group"
                onClick={() => router.push('/dashboard/faculty/profile')}
            >
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{currentUser.name}</h2>
                        <p className="text-gray-500 font-medium">{currentUser.employeeId}</p>
                        <p className="text-sm text-gray-400 mt-1">{currentUser.department}</p>
                    </div>
                </div>
            </div>

            {/* Actions Grid */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mark Attendance */}
                    <div
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                        onClick={() => router.push('/dashboard/faculty/attendance')}
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Presentation className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Mark Attendance</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Record daily attendance for your assigned classes.</p>
                    </div>

                    {/* Analytics */}
                    <div
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
                        onClick={() => router.push('/dashboard/faculty/analytics')}
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">View Analytics</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Visualize attendance trends and student performance.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
