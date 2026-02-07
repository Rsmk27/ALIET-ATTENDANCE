'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Users, GraduationCap, Building2, LogOut, Search, Filter } from 'lucide-react';

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

function AdminDashboard() {
    const { currentUser, signOut } = useAuth();
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'faculty'>('students');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBranch, setFilterBranch] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Students from all branches
            const allStudents: Student[] = [];

            for (const branch of branches) {
                try {
                    const branchRef = collection(db, `admin/students/${branch}`);
                    const branchSnapshot = await getDocs(branchRef);
                    const branchStudents = branchSnapshot.docs.map(doc => ({
                        uid: doc.id,
                        ...doc.data()
                    })) as Student[];
                    allStudents.push(...branchStudents);
                } catch (error) {
                    console.error(`Error fetching ${branch} students:`, error);
                }
            }

            setStudents(allStudents);

            // Fetch Faculty from users collection
            const facultyQuery = query(
                collection(db, 'users'),
                where('role', '==', 'faculty')
            );
            const facultySnapshot = await getDocs(facultyQuery);
            const facultyData = facultySnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as Faculty[];
            setFaculty(facultyData);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch =
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBranch = filterBranch === 'all' || student.branch === filterBranch;

        return matchesSearch && matchesBranch;
    });

    const filteredFaculty = faculty.filter(member => {
        const matchesSearch =
            member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDepartment = filterBranch === 'all' || member.department === filterBranch;

        return matchesSearch && matchesDepartment;
    });

    const branches = ['CIVIL', 'EEE', 'MECH', 'ECE', 'CSE', 'IT', 'CSM', 'CSD'];

    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                                <p className="text-sm text-gray-600">Welcome, {currentUser?.name}</p>
                            </div>
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

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Students</p>
                                    <p className="text-3xl font-bold text-primary-600">{students.length}</p>
                                </div>
                                <div className="p-3 bg-primary-100 rounded-full">
                                    <GraduationCap className="w-8 h-8 text-primary-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Faculty</p>
                                    <p className="text-3xl font-bold text-secondary-600">{faculty.length}</p>
                                </div>
                                <div className="p-3 bg-secondary-100 rounded-full">
                                    <Building2 className="w-8 h-8 text-secondary-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Users</p>
                                    <p className="text-3xl font-bold text-green-600">{students.length + faculty.length}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-full">
                                    <Users className="w-8 h-8 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branch-wise Statistics */}
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Students by Branch</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {branches.map(branch => {
                                const count = students.filter(s => s.branch === branch).length;
                                return (
                                    <div key={branch} className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-2xl font-bold text-primary-600">{count}</p>
                                        <p className="text-sm text-gray-600">{branch}</p>
                                    </div>
                                );
                            })}
                        </div>
                        {students.filter(s => !s.branch || !branches.includes(s.branch)).length > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ {students.filter(s => !s.branch || !branches.includes(s.branch)).length} student(s)
                                    have no branch or invalid branch assigned
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Tabs and Filters */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="border-b border-gray-200">
                            <div className="flex items-center justify-between px-6 py-4">
                                <div className="flex gap-4">
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
                                </div>

                                <div className="flex gap-4">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Branch Filter */}
                                    <div className="relative">
                                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <select
                                            value={filterBranch}
                                            onChange={(e) => setFilterBranch(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                                        >
                                            <option value="all">All Branches</option>
                                            {branches.map(branch => (
                                                <option key={branch} value={branch}>{branch}</option>
                                            ))}
                                        </select>
                                    </div>
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
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Registration No.
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Email
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Branch
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Year
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Section
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Mobile
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredStudents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                            No students found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredStudents.map((student) => (
                                                        <tr key={student.uid} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">{student.registrationNumber || '-'}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-500">{student.email}</div>
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
                                    ) : (
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Employee ID
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Email
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Department
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Mobile
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredFaculty.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                            No faculty found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredFaculty.map((member) => (
                                                        <tr key={member.uid} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">{member.name}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">{member.employeeId || '-'}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-500">{member.email}</div>
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
