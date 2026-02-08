'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Users, GraduationCap, Building2, LogOut, Search, Filter, Moon, Sun } from 'lucide-react';
import SpotlightCursor from '@/components/ui/SpotlightCursor';

interface Student {
    uid: string;
    name: string;
    email: string;
    registrationNumber?: string;
    branch?: string;
    year?: number;
    section?: string;
    mobileNumber?: string;
}

interface Faculty {
    uid: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
    mobileNumber?: string;
}

const BRANCHES = ['CIVIL', 'EEE', 'MECH', 'ECE', 'CSE', 'IT', 'CSM', 'CSD'];

function AdminDashboard() {
    const { currentUser, signOut } = useAuth();
    const router = useRouter();
    // Using a map to manage students by branch for easier updates
    const [studentsMap, setStudentsMap] = useState<Record<string, Student[]>>({});
    const students = useMemo(() => Object.values(studentsMap).flat(), [studentsMap]);

    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'faculty' | 'activity'>('students');
    const [logs, setLogs] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBranch, setFilterBranch] = useState('all');
    const [filterYear, setFilterYear] = useState('all');
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const unsubscribes: Unsubscribe[] = [];

        // 1. Listen for Students Data (Per Branch)
        BRANCHES.forEach(branch => {
            const q = collection(db, `admin/students/${branch}`);
            const unsub = onSnapshot(q, (snapshot) => {
                const branchStudents = snapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                })) as Student[];

                setStudentsMap(prev => ({
                    ...prev,
                    [branch]: branchStudents
                }));
                setLoading(false); // Enable UI as soon as data starts flowing
            }, (error) => {
                console.error(`Error listening to ${branch} students:`, error);
                setLoading(false);
            });
            unsubscribes.push(unsub);
        });

        // 2. Listen for Faculty Data
        const facultyQuery = query(
            collection(db, 'users'),
            where('role', '==', 'faculty')
        );
        const unsubFaculty = onSnapshot(facultyQuery, (snapshot) => {
            const facultyData = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as Faculty[];
            setFaculty(facultyData);
        }, (error) => console.error('Error listening to faculty:', error));
        unsubscribes.push(unsubFaculty);

        // 3. Listen for Activity Logs
        const logsQuery = query(
            collection(db, 'admin/logs/logins'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
            const logsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
                };
            });
            setLogs(logsData);
        }, (error) => console.error('Error listening to logs:', error));
        unsubscribes.push(unsubLogs);

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const toggleTheme = () => {
        setDarkMode(!darkMode);
        if (!darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch =
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBranch = filterBranch === 'all' || student.branch === filterBranch;
        const matchesYear = filterYear === 'all' || student.year?.toString() === filterYear;

        return matchesSearch && matchesBranch && matchesYear;
    });

    const filteredFaculty = faculty.filter(member => {
        const matchesSearch =
            member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDepartment = filterBranch === 'all' || member.department === filterBranch;

        return matchesSearch && matchesDepartment;
    });

    // const branches = ['CIVIL', 'EEE', 'MECH', 'ECE', 'CSE', 'IT', 'CSM', 'CSD']; // Moved to top-level constant

    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
                <SpotlightCursor
                    config={{
                        color: darkMode ? '#ffffff' : '#000000',
                        brightness: darkMode ? 0.1 : 0.05,
                        radius: 300
                    }}
                />
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4 sm:gap-0">
                            <div className="text-center sm:text-left">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {currentUser?.name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleTheme}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                                >
                                    {darkMode ? (
                                        <>
                                            <Sun className="w-5 h-5" />
                                            <span className="hidden sm:inline">Light</span>
                                        </>
                                    ) : (
                                        <>
                                            <Moon className="w-5 h-5" />
                                            <span className="hidden sm:inline">Dark</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Students</p>
                                    <p className="text-3xl font-bold text-primary-600">{students.length}</p>
                                </div>
                                <div className="p-3 bg-primary-100 rounded-full">
                                    <GraduationCap className="w-8 h-8 text-primary-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Faculty</p>
                                    <p className="text-3xl font-bold text-secondary-600">{faculty.length}</p>
                                </div>
                                <div className="p-3 bg-secondary-100 rounded-full">
                                    <Building2 className="w-8 h-8 text-secondary-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Users</p>
                                    <p className="text-3xl font-bold text-green-600">{students.length + faculty.length}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-full">
                                    <Users className="w-8 h-8 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branch-wise Statistics */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Students by Branch</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {BRANCHES.map(branch => {
                                const count = students.filter(s => s.branch === branch).length;
                                return (
                                    <div key={branch} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <p className="text-2xl font-bold text-primary-600">{count}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{branch}</p>
                                    </div>
                                );
                            })}
                        </div>
                        {students.filter(s => !s.branch || !BRANCHES.includes(s.branch)).length > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ {students.filter(s => !s.branch || !BRANCHES.includes(s.branch)).length} student(s)
                                    have no branch or invalid branch assigned
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Tabs and Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col lg:flex-row items-center justify-between px-6 py-4 gap-4">
                                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                                    <button
                                        onClick={() => setActiveTab('students')}
                                        className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'students'
                                            ? 'bg-primary-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        Students ({students.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('faculty')}
                                        className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'faculty'
                                            ? 'bg-secondary-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        Faculty ({faculty.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('activity')}
                                        className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'activity'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        Activity Logs
                                    </button>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                    {/* Search */}
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                        />
                                    </div>

                                    {/* Branch Filter */}
                                    <div className="relative w-full sm:w-auto">
                                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <select
                                            value={filterBranch}
                                            onChange={(e) => setFilterBranch(e.target.value)}
                                            className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        >
                                            <option value="all">All Branches</option>
                                            {BRANCHES.map(branch => (
                                                <option key={branch} value={branch}>{branch}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Year Filter (Students Only) */}
                                    {activeTab === 'students' && (
                                        <div className="relative w-full sm:w-auto">
                                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <select
                                                value={filterYear}
                                                onChange={(e) => setFilterYear(e.target.value)}
                                                className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            >
                                                <option value="all">All Years</option>
                                                {[1, 2, 3, 4].map(year => (
                                                    <option key={year} value={year}>{year} Year</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="p-6">
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                                    <p className="mt-4 text-gray-600">Loading data...</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    {activeTab === 'students' ? (
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Name
                                                    </th>
                                                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Registration No.
                                                    </th>

                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Branch
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Year
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Section
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Mobile
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {filteredStudents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                            No students found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredStudents.map((student) => (
                                                        <tr key={student.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.name}</div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden mt-0.5">{student.registrationNumber || '-'}</div>
                                                            </td>
                                                            <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900 dark:text-gray-100">{student.registrationNumber || '-'}</div>
                                                            </td>

                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                                                                    {student.branch || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {student.year || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {student.section || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {student.mobileNumber || '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    ) : activeTab === 'faculty' ? (
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Employee ID
                                                    </th>

                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Department
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Mobile
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {filteredFaculty.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                            No faculty found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredFaculty.map((member) => (
                                                        <tr key={member.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900 dark:text-gray-100">{member.employeeId || '-'}</div>
                                                            </td>

                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-secondary-100 text-secondary-800">
                                                                    {member.department || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {member.mobileNumber || '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Time
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        User
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Role
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Details
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {logs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                            No activity logs found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    logs.map((log) => (
                                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {log.timestamp instanceof Date ? log.timestamp.toLocaleString() : 'Just now'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.name || 'Unknown User'}</div>
                                                                <div className="text-xs text-gray-600 dark:text-gray-300">{log.email}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.role === 'faculty'
                                                                    ? 'bg-secondary-100 text-secondary-800'
                                                                    : 'bg-primary-100 text-primary-800'
                                                                    }`}>
                                                                    {log.role}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                Login Success
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

export default AdminDashboard;
