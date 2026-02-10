'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Users, GraduationCap, Building2, LogOut, Search, Filter, Moon, Sun, UserPlus, Edit, X, Save, Trash2, AlertTriangle, Check, XCircle, Mail } from 'lucide-react';
import SpotlightCursor from '@/components/ui/SpotlightCursor';
import { TableSkeleton } from '@/components/ui/Skeleton';

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
    isApproved?: boolean;
}

const BRANCHES = ['CIVIL', 'EEE', 'MECH', 'ECE', 'CSE', 'IT', 'CSM', 'CSD'];

function AdminDashboard() {
    const { currentUser, signOut } = useAuth();
    const router = useRouter();
    // Using a map to manage students by branch for easier updates
    const [studentsMap, setStudentsMap] = useState<Record<string, Student[]>>({});
    const students = useMemo(() => Object.values(studentsMap).flat(), [studentsMap]);

    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [pendingFaculty, setPendingFaculty] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'faculty' | 'activity' | 'pending'>('students');
    const [logs, setLogs] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBranch, setFilterBranch] = useState('all');
    const [filterYear, setFilterYear] = useState('all');
    const { darkMode, toggleTheme } = useTheme();

    // Edit Modal States
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Student | Faculty | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const [editLoading, setEditLoading] = useState(false);

    // Delete Modal States
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<Student | Faculty | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);


    useEffect(() => {
        const unsubscribes: Unsubscribe[] = [];

        // 1. Listen for ALL Students from Users Collection
        const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student')
        );

        const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
            const allStudents = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as Student[];

            // Group by branch
            const grouped = allStudents.reduce((acc, student) => {
                const branch = student.branch || 'Unknown';
                if (!acc[branch]) acc[branch] = [];
                acc[branch].push(student);
                return acc;
            }, {} as Record<string, Student[]>);

            // Initialize all branches to ensure UI consistency
            BRANCHES.forEach(b => {
                if (!grouped[b]) grouped[b] = [];
            });

            setStudentsMap(grouped);
            setLoading(false);
        }, (error) => {
            console.error("Error listening to students:", error);
            setLoading(false);
        });
        unsubscribes.push(unsubStudents);

        // 2. Listen for Faculty and HOD Data
        const facultyQuery = query(
            collection(db, 'users'),
            where('role', 'in', ['faculty', 'hod'])
        );
        const unsubFaculty = onSnapshot(facultyQuery, (snapshot) => {
            const facultyData = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as Faculty[];
            // Separate approved and pending
            setFaculty(facultyData.filter(f => f.isApproved !== false));
            setPendingFaculty(facultyData.filter(f => f.isApproved === false));
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

    const handleApproveUser = async (user: Faculty) => {
        if (!confirm(`Are you sure you want to approve ${user.name}? This will grant them access to the dashboard.`)) return;

        try {
            const { doc: docImport, updateDoc, setDoc, serverTimestamp } = await import('firebase/firestore');

            // 1. Update User Document
            const userRef = docImport(db, 'users', user.uid);
            await updateDoc(userRef, {
                isApproved: true,
                updatedAt: serverTimestamp()
            });

            // 2. Also update in admin/hierarchy if exists (though listener handles display)
            // Faculty are stored in distinct branch collections, but 'isApproved' lives on the User object primarily.
            // If we duplicated execution data, we might need to update it, but typically 'isApproved' checks the main 'users' collection.

            // 3. Send Email (Mock)
            // In a real app, this would call a Cloud Function or API
            console.log(`Sending approval email to ${user.email}...`);
            alert(`Approved ${user.name}. An email notification has been sent to ${user.email}.`);

            // 4. Log the action
            const { addDoc, collection } = await import('firebase/firestore');
            await addDoc(collection(db, 'admin/logs/approvals'), {
                adminId: currentUser?.uid,
                adminName: currentUser?.name,
                targetUserId: user.uid,
                targetUserName: user.name,
                action: 'approve',
                timestamp: serverTimestamp()
            });

        } catch (error) {
            console.error("Error approving user:", error);
            alert("Failed to approve user");
        }
    };

    const handleEditUser = (user: Student | Faculty) => {
        setEditingUser(user);
        setEditFormData({ ...user });
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;

        setEditLoading(true);
        try {
            const { doc: docImport, updateDoc, setDoc, serverTimestamp } = await import('firebase/firestore');

            // Update main users collection
            const userRef = docImport(db, 'users', editingUser.uid);
            await updateDoc(userRef, {
                ...editFormData,
                updatedAt: serverTimestamp()
            });

            // Update hierarchical structure based on role
            const isStudent = 'registrationNumber' in editingUser;

            if (isStudent) {
                // Update student in admin hierarchy
                const student = editFormData as Student;
                if (student.branch && student.year && student.section) {
                    const hierarchyRef = docImport(db, 'admin', 'students', student.branch, String(student.year), student.section, editingUser.uid);
                    await setDoc(hierarchyRef, {
                        ...editFormData,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            } else {
                // Update faculty in admin hierarchy
                const faculty = editFormData as Faculty;
                if (faculty.department) {
                    const branchRef = docImport(db, 'admin', 'faculty', 'branch', faculty.department);
                    const memberRef = docImport(branchRef, 'faculty_members', editingUser.uid);
                    await setDoc(memberRef, {
                        ...editFormData,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            }

            setEditModalOpen(false);
            setEditingUser(null);
            setEditFormData({});
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Failed to update user. Please try again.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteClick = (user: Student | Faculty) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        setDeleteLoading(true);
        try {
            // --- OPTIMISTIC UI: Remove from local maps immediately ---
            const isStudent = 'registrationNumber' in userToDelete;
            if (isStudent) {
                setStudentsMap(prev => {
                    const newMap = { ...prev };
                    Object.keys(newMap).forEach(branch => {
                        newMap[branch] = newMap[branch].filter(s => s.uid !== userToDelete.uid);
                    });
                    return newMap;
                });
            } else {
                setFaculty(prev => prev.filter(f => f.uid !== userToDelete.uid));
                setPendingFaculty(prev => prev.filter(f => f.uid !== userToDelete.uid));
            }
            setDeleteModalOpen(false);
            // ---------------------------------------------------------

            const { doc: docImport, deleteDoc } = await import('firebase/firestore');

            // Delete from main users collection
            const userRef = docImport(db, 'users', userToDelete.uid);
            await deleteDoc(userRef);

            // Delete from hierarchy based on role
            if (isStudent) {
                const student = userToDelete as Student;
                if (student.branch && student.year && student.section) {
                    const hierarchyRef = docImport(db, 'admin', 'students', student.branch, String(student.year), student.section, userToDelete.uid);
                    await deleteDoc(hierarchyRef);
                }
            } else {
                const faculty = userToDelete as Faculty;
                if (faculty.department) {
                    const branchRef = docImport(db, 'admin', 'faculty', 'branch', faculty.department);
                    const memberRef = docImport(branchRef, 'faculty_members', userToDelete.uid);
                    await deleteDoc(memberRef);
                }
            }

            setUserToDelete(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user. Please try again.');
        } finally {
            setDeleteLoading(false);
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
                                    onClick={() => router.push('/register-faculty')}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    <span className="hidden sm:inline">Register Faculty</span>
                                </button>
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
                                    <button
                                        onClick={() => setActiveTab('pending')}
                                        className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'pending'
                                            ? 'bg-amber-500 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            } relative`}
                                    >
                                        Pending Approvals
                                        {pendingFaculty.length > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-white">
                                                {pendingFaculty.length}
                                            </span>
                                        )}
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
                                <TableSkeleton rows={8} cols={activeTab === 'students' ? 7 : activeTab === 'faculty' ? 5 : 4} />
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
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {filteredStudents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => handleEditUser(student)}
                                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                                                                        title="Edit Student"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                        <span className="hidden sm:inline">Edit</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClick(student)}
                                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
                                                                        title="Remove Student"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        <span className="hidden sm:inline">Remove</span>
                                                                    </button>
                                                                </div>
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
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {filteredFaculty.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <button
                                                                    onClick={() => handleEditUser(member)}
                                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                                                                    title="Edit Faculty"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                    <span className="hidden sm:inline">Edit</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    ) : activeTab === 'pending' ? (
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Faculty Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Email
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Department
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {pendingFaculty.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                            No pending approvals
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    pendingFaculty.map((member) => (
                                                        <tr key={member.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</div>
                                                                <div className="text-xs text-gray-500">{member.mobileNumber || 'No mobile'}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900 dark:text-gray-100">{member.email}</div>
                                                                <div className="text-xs text-gray-500">{member.employeeId || 'ID Pending'}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-secondary-100 text-secondary-800">
                                                                    {member.department || 'Unassigned'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Pending
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => handleApproveUser(member)}
                                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm"
                                                                        title="Approve Faculty"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            // Reuse existing delete logic or create simpler one
                                                                            handleDeleteClick(member);
                                                                        }}
                                                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                                        title="Reject & Delete"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                        Reject
                                                                    </button>
                                                                </div>
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

            {/* Edit User Modal */}
            {editModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Edit {'registrationNumber' in editingUser ? 'Student' : 'Faculty'}
                            </h2>
                            <button
                                onClick={() => setEditModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                disabled={editLoading}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
                                {/* Common Fields */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.name || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={editFormData.email || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={editFormData.mobileNumber || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="10-digit mobile number"
                                    />
                                </div>

                                {/* Student-specific Fields */}
                                {'registrationNumber' in editingUser && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Registration Number
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.registrationNumber || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, registrationNumber: e.target.value.toUpperCase() })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Branch
                                                </label>
                                                <select
                                                    value={editFormData.branch || ''}
                                                    onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                >
                                                    <option value="">Select Branch</option>
                                                    {BRANCHES.map(branch => (
                                                        <option key={branch} value={branch}>{branch}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Year
                                                </label>
                                                <select
                                                    value={editFormData.year || ''}
                                                    onChange={(e) => setEditFormData({ ...editFormData, year: parseInt(e.target.value) })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                >
                                                    <option value="">Select Year</option>
                                                    <option value={1}>1st Year</option>
                                                    <option value={2}>2nd Year</option>
                                                    <option value={3}>3rd Year</option>
                                                    <option value={4}>4th Year</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Section
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.section || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value.toUpperCase() })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                placeholder="e.g., A, B, C"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Faculty-specific Fields */}
                                {'employeeId' in editingUser && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Employee ID
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.employeeId || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Department
                                            </label>
                                            <select
                                                value={editFormData.department || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            >
                                                <option value="">Select Department</option>
                                                {BRANCHES.map(branch => (
                                                    <option key={branch} value={branch}>{branch}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => setEditModalOpen(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 font-medium"
                                        disabled={editLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={editLoading}
                                    >
                                        {editLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteModalOpen && userToDelete && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-red-100 rounded-full">
                                    <AlertTriangle className="w-8 h-8 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Removal</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
                                </div>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Are you sure you want to remove <strong>{userToDelete.name}</strong> from the system?
                                All associated data for this {'registrationNumber' in userToDelete ? 'student' : 'faculty'} will be permanently deleted.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 font-medium"
                                    disabled={deleteLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteUser}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Removing...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Remove User
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
}

export default AdminDashboard;
