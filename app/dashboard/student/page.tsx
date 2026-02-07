'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AnnouncementTicker from '@/components/announcements/AnnouncementTicker';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    BarChart3,
    DollarSign,
    User,
    LogOut,
    Bell,
} from 'lucide-react';

export default function StudentDashboard() {
    const { currentUser, signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <ProtectedRoute allowedRoles={['student']}>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">{currentUser?.name}</h1>
                                    <p className="text-sm text-gray-600">{currentUser?.registrationNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <Bell className="w-5 h-5 text-gray-600" />
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Announcement Ticker */}
                <AnnouncementTicker />

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Welcome Banner */}
                    <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg p-6 mb-8 text-white">
                        <h2 className="text-2xl font-bold mb-2">Welcome back, {currentUser?.name}!</h2>
                        <p className="text-primary-100">
                            {currentUser?.branch} - {currentUser?.section} | Year {currentUser?.year}
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="card-hover">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Calendar className="w-6 h-6 text-green-600" />
                                </div>
                                <span className="text-2xl font-bold text-green-600">85%</span>
                            </div>
                            <h3 className="text-gray-600 text-sm font-medium">Attendance</h3>
                            <p className="text-gray-500 text-xs mt-1">Overall percentage</p>
                        </div>

                        <div className="card-hover">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <BarChart3 className="w-6 h-6 text-blue-600" />
                                </div>
                                <span className="text-2xl font-bold text-blue-600">78%</span>
                            </div>
                            <h3 className="text-gray-600 text-sm font-medium">Academic Performance</h3>
                            <p className="text-gray-500 text-xs mt-1">Average marks</p>
                        </div>

                        <div className="card-hover">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-yellow-100 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-yellow-600" />
                                </div>
                                <span className="text-2xl font-bold text-yellow-600">₹5,000</span>
                            </div>
                            <h3 className="text-gray-600 text-sm font-medium">Pending Fees</h3>
                            <p className="text-gray-500 text-xs mt-1">Due this semester</p>
                        </div>

                        <div className="card-hover">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <LayoutDashboard className="w-6 h-6 text-purple-600" />
                                </div>
                                <span className="text-2xl font-bold text-purple-600">6</span>
                            </div>
                            <h3 className="text-gray-600 text-sm font-medium">Active Subjects</h3>
                            <p className="text-gray-500 text-xs mt-1">This semester</p>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h3>
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                        <div>
                                            <p className="font-medium text-gray-900">Subject {i}</p>
                                            <p className="text-sm text-gray-500">Feb {i}, 2026</p>
                                        </div>
                                        <span className="badge-success">Present</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Announcements</h3>
                            <div className="space-y-3">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <Bell className="w-4 h-4 text-blue-600 mt-1" />
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">Mid-term Exams Schedule</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                Mid-term examinations will be conducted from March 1-10, 2026.
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2">2 hours ago</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <Bell className="w-4 h-4 text-green-600 mt-1" />
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">Fee Payment Reminder</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                Semester fees due date is approaching. Please clear pending dues.
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2">1 day ago</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
