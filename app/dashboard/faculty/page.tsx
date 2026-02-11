'use client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    User, BarChart3, Presentation, LogOut, Users,
    X, CheckCircle, Clock, Calendar as CalendarIcon
} from 'lucide-react';
import studentData from '@/data/students.json';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useState, useEffect } from 'react';

export default function FacultyDashboard() {
    const { currentUser, loading, signOut } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await signOut();
            router.push('/login');
        }
    };

    if (loading) return <DashboardSkeleton />;

    return (
        <ProtectedRoute allowedRoles={['faculty', 'hod']}>
            {currentUser && (
                <div className="p-8 max-w-7xl mx-auto space-y-6">
                    {/* Header with Logout */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {currentUser.role === 'hod' ? 'HOD Dashboard' : 'Faculty Dashboard'}
                        </h1>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>

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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
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

                        {/* Recent Attendance Sidebar */}
                        <div className="lg:col-span-1">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">
                                {currentUser.role === 'hod' ? 'Department Attendance' : 'My Recent Attendance'}
                            </h2>
                            <RecentAttendanceList currentUser={currentUser} />
                        </div>
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
}



function RecentAttendanceList({ currentUser }: { currentUser: any }) {
    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                // Fetch recent attendance
                // For HOD: filter by branch
                // For Faculty: filter by facultyId
                const q = currentUser.role === 'hod'
                    ? query(collection(db, 'attendance'), where('branch', '==', currentUser.department), limit(5))
                    : query(collection(db, 'attendance'), where('facultyId', '==', currentUser.uid), limit(5));

                const snapshot = await getDocs(q);
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a: any, b: any) => {
                        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                        return timeB - timeA;
                    });

                setRecentAttendance(docs);
            } catch (err) {
                console.error("Error fetching recent attendance:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecent();
    }, [currentUser]);

    if (loading) return <div className="text-gray-500 text-sm italic">Loading recent records...</div>;
    if (recentAttendance.length === 0) return <div className="text-gray-400 text-sm py-4 bg-gray-50 rounded-lg text-center">No recent records found</div>;

    const absentees = selectedRecord ? Object.entries(selectedRecord.records || {})
        .filter(([_, status]) => status === 'Absent')
        .map(([regNo]) => ({
            regNo,
            name: (studentData as Record<string, string>)[regNo] || 'Unknown Student'
        })) : [];

    return (
        <div className="space-y-3">
            {recentAttendance.map((record) => (
                <div
                    key={record.id}
                    className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative"
                    onClick={() => setSelectedRecord(record)}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-blue-600 uppercase">
                            {record.branch} - {record.year}Y {record.section}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{record.date}</span>
                        </div>
                        <div className="text-xs">
                            <span className="text-green-600 font-semibold">{record.stats?.present}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-gray-600">{record.stats?.total}</span>
                        </div>
                    </div>
                    {currentUser.role === 'hod' && (
                        <p className="text-[10px] text-gray-400 mt-1 border-t pt-1">
                            By: {record.facultyName || 'Unknown'}
                        </p>
                    )}
                    <div className="absolute right-2 bottom-2 rotate-0 group-hover:rotate-6 opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
                            View Absentees <Users className="w-2.5 h-2.5" />
                        </span>
                    </div>
                </div>
            ))}
            <button
                onClick={() => window.location.href = '/dashboard/faculty/attendance'}
                className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-2"
            >
                View All Records
            </button>

            {/* Absentees Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-red-500" />
                                    Absentees List
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {selectedRecord.branch} {selectedRecord.year}Y {selectedRecord.section} | {selectedRecord.date}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="max-h-[60vh] overflow-y-auto p-4">
                            {absentees.length > 0 ? (
                                <div className="space-y-2">
                                    {absentees.map((s, idx) => (
                                        <div key={s.regNo} className="flex items-center justify-between p-3 bg-red-50/30 rounded-xl border border-red-100/50">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{s.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono uppercase">{s.regNo}</p>
                                                </div>
                                            </div>
                                            <div className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">
                                                Absent
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center bg-green-50 rounded-xl border border-green-100">
                                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="font-bold text-green-700">100% Attendance!</p>
                                    <p className="text-xs text-green-600">No students were absent for this class.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                            <span>Total Absentees: <b className="text-red-600">{absentees.length}</b></span>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
