'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import RoleSelectionModal from '@/components/auth/RoleSelectionModal';
import { GraduationCap, Building2, Mail, Lock, User, Phone, Quote, X } from 'lucide-react';
import Image from 'next/image';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import studentData from '@/data/students.json';
import facultyData from '@/data/faculty.json';
import { detectBranchInfo, detectFacultyInfo } from '@/utils/branchDetector';

type LoginMode = 'student' | 'institutional';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, signInWithGoogle, signUp } = useAuth();
    const [mode, setMode] = useState<LoginMode>('student');
    const [loading, setLoading] = useState(false);
    const [showDirectorMessage, setShowDirectorMessage] = useState(false);
    const [showPrincipalMessage, setShowPrincipalMessage] = useState(false);
    const [error, setError] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [studentName, setStudentName] = useState('');
    const [facultyName, setFacultyName] = useState('');
    const [facultyDept, setFacultyDept] = useState('');
    const [lookingUp, setLookingUp] = useState(false);
    const [lookingUpFaculty, setLookingUpFaculty] = useState(false);

    // Student login form
    const [studentForm, setStudentForm] = useState({
        registrationNumber: '',
        password: '',
    });

    // Institutional login form
    const [institutionalForm, setInstitutionalForm] = useState({
        email: '',
        password: '',
    });

    // Lookup student name when registration number changes
    useEffect(() => {
        const lookupStudent = async () => {
            const regNo = studentForm.registrationNumber.toUpperCase().trim();

            if (regNo.length < 8) {
                setStudentName('');
                return;
            }

            setLookingUp(true);
            try {
                // First, try to find in users collection (most reliable)
                const usersRef = collection(db, 'users');
                const userQuery = query(usersRef,
                    where('registrationNumber', '==', regNo),
                    where('role', '==', 'student')
                );
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    setStudentName(userData.name || '');
                    setError('');
                    setLookingUp(false);
                    return;
                }

                // Fallback: Check local students.json
                const localName = (studentData as any)[regNo];
                if (localName) {
                    setStudentName(localName);
                    setError('');
                } else {
                    setStudentName('');
                }

            } catch (err) {
                console.error('Error looking up student:', err);

                // Fallback on error (e.g. permission denied): Check local students.json
                const localName = (studentData as any)[regNo];
                if (localName) {
                    setStudentName(localName);
                    setError('');
                } else {
                    setStudentName('');
                }
            } finally {
                setLookingUp(false);
            }
        };

        const timeoutId = setTimeout(lookupStudent, 500);
        return () => clearTimeout(timeoutId);
    }, [studentForm.registrationNumber]);

    // Lookup faculty name when employee ID changes
    useEffect(() => {
        const lookupFaculty = async () => {
            const rawId = institutionalForm.email.trim();
            // Only lookup if it's an ID (not a full email) or a short ID
            if (!rawId || rawId.includes('@') || rawId.length < 4) {
                setFacultyName('');
                setFacultyDept('');
                return;
            }

            const empId = rawId.toUpperCase();
            const structuralInfo = detectFacultyInfo(empId);
            setLookingUpFaculty(true);
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef,
                    where('employeeId', '==', empId),
                    where('role', 'in', ['faculty', 'hod'])
                );
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data();
                    setFacultyName(userData.name || '');
                    setFacultyDept(userData.department || '');
                } else {
                    // Fallback 1: Local faculty.json
                    const localName = (facultyData as any)[empId];
                    if (localName) {
                        setFacultyName(localName);
                        if (structuralInfo) setFacultyDept(structuralInfo.branch);
                    } else if (structuralInfo) {
                        setFacultyName('');
                        setFacultyDept(structuralInfo.branch);
                    } else {
                        setFacultyName('');
                        setFacultyDept('');
                    }
                }
            } catch (err) {
                console.error('Error looking up faculty:', err);
                // Fallback 2: Local faculty.json on error (permission denied)
                const localName = (facultyData as any)[empId];
                if (localName) {
                    setFacultyName(localName);
                    if (structuralInfo) setFacultyDept(structuralInfo.branch);
                } else if (structuralInfo) {
                    setFacultyDept(structuralInfo.branch);
                } else {
                    setFacultyName('');
                    setFacultyDept('');
                }
            } finally {
                setLookingUpFaculty(false);
            }
        };

        const timeoutId = setTimeout(lookupFaculty, 500);
        return () => clearTimeout(timeoutId);
    }, [institutionalForm.email]);

    const handleStudentLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // For student login, we'll use registration number as email format
            const email = `${studentForm.registrationNumber}@aliet.ac.in`.toLowerCase();
            await signIn(email, studentForm.password);

            // Log activity
            try {
                await addDoc(collection(db, 'admin/logs/logins'), {
                    email,
                    role: 'student',
                    name: studentName || 'Unknown Student',
                    timestamp: new Date()
                });
            } catch (e) {
                console.error('Logging failed', e);
            }

            router.push('/dashboard/student');
        } catch (err: any) {
            // Check if student exists in registry
            const regNo = studentForm.registrationNumber.toUpperCase();
            const existsInRegistry = (studentData as any)[regNo];

            // If user not found (first time login) AND credentials might match default (password == regNo or they entered the correct regNo)
            // AND they are a valid student in our list
            if ((err.message?.includes('auth/user-not-found') || err.message?.includes('auth/invalid-credential')) &&
                existsInRegistry) {

                // If they entered the correct registration number as password (or any password, but for security maybe enforce default?)
                // Actually, if account doesn't exist, we can't verify password.
                // But user instruction is "simple go to student dashboard".
                // So we implicitly trust if they have the RegNo and are in the list, and are trying to "Login".
                // To be safe, let's just create the account with the password they provided.

                try {
                    const email = `${regNo}@aliet.ac.in`.toLowerCase();
                    const password = studentForm.password;

                    // Branch info
                    const { data: info, calculatedYear } = detectBranchInfo(regNo);

                    await signUp(email, password, {
                        role: 'student',
                        name: existsInRegistry, // Name from JSON
                        registrationNumber: regNo,
                        branch: info?.branch || '',
                        department: info?.branch || '',
                        year: calculatedYear || 1,
                    });

                    // Log the auto-creation
                    await addDoc(collection(db, 'admin/logs/logins'), {
                        email,
                        role: 'student',
                        name: existsInRegistry,
                        action: 'auto-register',
                        timestamp: new Date()
                    });

                    router.push('/dashboard/student');
                    return;
                } catch (registerErr: any) {
                    console.error("Auto-registration failed", registerErr);
                    if (registerErr.code === 'auth/email-already-in-use') {
                        setError("Account already exists. Please check your password.");
                    } else {
                        setError("Unable to set up your account automatically. Please try again or contact support.");
                    }
                }
            } else if (err.message?.includes('auth/invalid-credential') || err.message?.includes('auth/user-not-found')) {
                setError('Invalid registration number or password.');
            } else {
                setError(err.message || 'Failed to sign in');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInstitutionalLogin = async (e: React.FormEvent, emailOverride?: string) => {
        if (e && e.preventDefault) e.preventDefault(); // Handle if called directly or via event
        setLoading(true);
        setError('');

        const emailToUse = emailOverride || institutionalForm.email;

        try {
            await signIn(emailToUse, institutionalForm.password);

            // Log activity
            try {
                await addDoc(collection(db, 'admin/logs/logins'), {
                    email: emailToUse,
                    role: 'faculty',
                    name: 'Faculty Member',
                    timestamp: new Date()
                });
            } catch (e) {
                console.error('Logging failed', e);
            }

            // Will redirect based on user role in ProtectedRoute
            router.push('/dashboard');
        } catch (err: any) {
            // Show user-friendly error message
            if (err.message?.includes('auth/invalid-credential') || err.message?.includes('auth/user-not-found')) {
                setError('Invalid email or password. Please try again.');
            } else {
                setError(err.message || 'Failed to sign in');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');

        try {
            const { isNewUser } = await signInWithGoogle();

            if (isNewUser) {
                setShowRoleModal(true);
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleModalComplete = () => {
        setShowRoleModal(false);
        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex flex-col items-center py-12 px-4 overflow-y-auto">
            <div className="w-full max-w-md">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-4 shadow-lg overflow-hidden">
                        <Image
                            src="/logo.png?v=2"
                            alt="ALIETAKE Logo"
                            width={64}
                            height={64}
                            className="object-contain"
                            priority
                            unoptimized // Add unoptimized to bypass Next.js cache for this image specifically
                        />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">ALIETAKE</h1>
                    <p className="text-primary-100">College Management System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {/* Mode Toggle */}
                    <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setMode('student'); }}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${mode === 'student'
                                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                <span>Student</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setMode('institutional'); }}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${mode === 'institutional'
                                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Building2 className="w-4 h-4" />
                                <span>Staff</span>
                            </div>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Student Login Form */}
                    {mode === 'student' && (
                        <form onSubmit={handleStudentLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Registration Number
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={studentForm.registrationNumber}
                                        onChange={(e) =>
                                            setStudentForm({ ...studentForm, registrationNumber: e.target.value.toUpperCase() })
                                        }
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Enter your registration number"
                                    />
                                </div>
                                {lookingUp && studentForm.registrationNumber.length >= 8 && (
                                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                        <span className="animate-spin">⌛</span> Looking up student...
                                    </p>
                                )}
                                {studentName && !lookingUp && (
                                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-100">
                                        <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                                            ✓ {studentName}
                                        </p>
                                    </div>
                                )}
                                {!studentName && !lookingUp && studentForm.registrationNumber.length >= 10 && (
                                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                        <p className="text-xs text-amber-700 flex items-center gap-1">
                                            ⚠️ Student not found in database.
                                            <span className="block mt-1 font-medium">Please verify or register.</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        required
                                        value={studentForm.password}
                                        onChange={(e) =>
                                            setStudentForm({ ...studentForm, password: e.target.value })
                                        }
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Enter your password"
                                    />
                                </div>
                            </div>


                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div className="text-center">
                                <a href="/register" className="text-sm text-primary-600 hover:text-primary-700">
                                    Don't have an account? Register
                                </a>
                            </div>
                        </form>
                    )}

                    {/* Institutional Login Form */}
                    {mode === 'institutional' && (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            // If input looks like an ID (no @), append domain and ensure lowercase
                            const emailOrId = institutionalForm.email.trim();
                            const finalEmail = emailOrId.includes('@')
                                ? emailOrId.toLowerCase()
                                : `${emailOrId}@aliet.ac.in`.toLowerCase();

                            console.log('Attempting faculty login with:', finalEmail); // Debug log
                            handleInstitutionalLogin(e, finalEmail);
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Faculty ID
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={institutionalForm.email}
                                        onChange={(e) =>
                                            setInstitutionalForm({ ...institutionalForm, email: e.target.value })
                                        }
                                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${facultyName ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                                        placeholder="Enter your Faculty ID"
                                    />
                                    {lookingUpFaculty && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                        </div>
                                    )}
                                </div>
                                {(facultyName || facultyDept) && (
                                    <div className="mt-2 p-2 bg-green-50 rounded border border-green-100 flex flex-col animate-in slide-in-from-top-1 duration-200">
                                        {facultyName && (
                                            <p className="text-sm font-semibold text-green-700">
                                                Welcome, {facultyName}
                                            </p>
                                        )}
                                        {facultyDept && (
                                            <p className="text-xs text-green-600">
                                                Department: {facultyDept}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        required
                                        value={institutionalForm.password}
                                        onChange={(e) =>
                                            setInstitutionalForm({ ...institutionalForm, password: e.target.value })
                                        }
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Enter your password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {/* Google Sign In - Only for Students */}
                    {mode === 'student' && (
                        <>
                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            {/* Google Sign In */}
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span className="font-medium text-gray-700">Sign in with Google</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-primary-100 text-sm">
                    <p>&copy; {new Date().getFullYear()} ALIET College. All rights reserved.</p>
                </div>
            </div>

            {/* Excellence in Numbers Banner */}
            <div className="w-full max-w-5xl mt-12 mb-24 md:mb-12 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl mx-4">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">Excellence in Numbers</h2>
                        <p className="text-gray-500 mt-2 font-medium">Milestones that define our journey</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-4 text-center divide-x-0 md:divide-x divide-gray-100">
                        <div className="flex flex-col items-center group">
                            <span className="text-3xl md:text-4xl font-extrabold text-primary-700 group-hover:scale-110 transition-transform">16</span>
                            <span className="text-xs md:text-sm text-gray-500 mt-2 font-medium uppercase tracking-wide">Years of Excellence</span>
                        </div>
                        <div className="flex flex-col items-center group">
                            <span className="text-3xl md:text-4xl font-extrabold text-teal-600 group-hover:scale-110 transition-transform">636</span>
                            <span className="text-xs md:text-sm text-gray-500 mt-2 font-medium uppercase tracking-wide">Total B.Tech Seats</span>
                        </div>
                        <div className="flex flex-col items-center group">
                            <span className="text-3xl md:text-4xl font-extrabold text-primary-700 group-hover:scale-110 transition-transform">138</span>
                            <span className="text-xs md:text-sm text-gray-500 mt-2 font-medium uppercase tracking-wide">Expert Faculty</span>
                        </div>
                        <div className="flex flex-col items-center group">
                            <span className="text-3xl md:text-4xl font-extrabold text-teal-600 group-hover:scale-110 transition-transform">3000</span>
                            <span className="text-xs md:text-sm text-gray-500 mt-2 font-medium uppercase tracking-wide">Students Trained</span>
                        </div>
                        <div className="flex flex-col items-center group col-span-2 md:col-span-1">
                            <span className="text-3xl md:text-4xl font-extrabold text-primary-700 group-hover:scale-110 transition-transform">98</span>
                            <span className="text-xs md:text-sm text-gray-500 mt-2 font-medium uppercase tracking-wide">Acre Campus</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Role Selection Modal */}
            <RoleSelectionModal
                isOpen={showRoleModal}
                onClose={() => setShowRoleModal(false)}
                onComplete={handleRoleModalComplete}
            />

            {/* Principal's Message Button */}
            <button
                onClick={() => setShowPrincipalMessage(true)}
                className="hidden md:flex fixed bottom-20 right-4 bg-white/90 backdrop-blur-sm text-primary-700 px-4 py-3 rounded-full shadow-xl hover:bg-white hover:scale-105 transition-all items-center gap-2 font-medium z-40 border border-white/20"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote w-5 h-5"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /></svg>
                <span className="hidden sm:inline">Principal's Message</span>
            </button>

            {/* Principal's Message Modal */}
            {showPrincipalMessage && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowPrincipalMessage(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors z-10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x w-6 h-6"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>

                        <div className="p-6 md:p-10">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                {/* Image Column */}
                                <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col items-center">
                                    <div className="aspect-[3/4] relative w-full max-w-[240px] rounded-xl overflow-hidden shadow-lg ring-4 ring-gray-50">
                                        <Image
                                            src="/principal.jpg"
                                            alt="Dr. O. Mahesh"
                                            fill
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                    <div className="mt-4 text-center">
                                        <h3 className="font-bold text-gray-900 text-lg">Dr. O. Mahesh</h3>
                                        <p className="text-primary-600 font-medium">Principal, ALIET</p>
                                    </div>
                                </div>

                                {/* Content Column */}
                                <div className="w-full md:w-2/3">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote w-8 h-8 text-primary-500 rotate-180"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /></svg>
                                        Principal's Message
                                    </h2>
                                    <div className="prose prose-blue text-gray-600 space-y-4 text-justify leading-relaxed">
                                        <p>
                                            Andhra Loyola Institute of Engineering and Technology (ALIET) is a name to be reckoned with in the field of technical education in Andhra Pradesh. Within a short time from its beginnings, it emerged as one of the premier Engineering Institutions in the state with recognition of NBA and NAAC A+. ALIET with its strong industry tie-ups, industry-institution exchange programmes and exposures has an edge and it is selected for LITE–Leadership in Teaching Excellence in the state.
                                        </p>
                                        <p>
                                            Academic Excellence with compassionate commitment is at the very heart of the vision and mission of the institution which moulds the students as global citizens. ALIET boasts of the committed and talented faculty who constantly monitor the progress of the students, and prepare them with cutting edge technological skills for the fast changing times. Students of ALIET with discipline and technical skills continue to find placement in several reputed industries and hence the institution has an impressive placement record. ALIET ensures positive academic framework and encourages students of different social milieu to be global players in science and technology.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Director's Message Button */}
            <button
                onClick={() => setShowDirectorMessage(true)}
                className="hidden md:flex fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm text-primary-700 px-4 py-3 rounded-full shadow-xl hover:bg-white hover:scale-105 transition-all items-center gap-2 font-medium z-40 border border-white/20"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote w-5 h-5"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /></svg>
                <span className="hidden sm:inline">Director's Message</span>
            </button>

            {/* Director's Message Modal */}
            {showDirectorMessage && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowDirectorMessage(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors z-10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x w-6 h-6"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>

                        <div className="p-6 md:p-10">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                {/* Image Column */}
                                <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col items-center">
                                    <div className="aspect-[3/4] relative w-full max-w-[240px] rounded-xl overflow-hidden shadow-lg ring-4 ring-gray-50">
                                        <Image
                                            src="/director.jpg"
                                            alt="Rev. Fr. Dr. B. Joji Reddy S.J."
                                            fill
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                    <div className="mt-4 text-center">
                                        <h3 className="font-bold text-gray-900 text-lg">Rev. Fr. Dr. B. Joji Reddy S.J.</h3>
                                        <p className="text-primary-600 font-medium">Director, ALIET</p>
                                    </div>
                                </div>

                                {/* Content Column */}
                                <div className="w-full md:w-2/3">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote w-8 h-8 text-primary-500 rotate-180"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /></svg>
                                        Director's Message
                                    </h2>
                                    <div className="prose prose-blue text-gray-600 space-y-4 text-justify leading-relaxed">
                                        <p>
                                            Andhra Loyola Institute of Engineering and Technology (ALIET) is an autonomous institution nationally accredited by NAAC and NBA, and boasts of a legacy of driving academic excellence, fostering human interactions with a vision of preparing students as men and women for others. The sprawling campus with greenery and serenity is a home for the young to dream and shape their careers. It nurtures students' dreams and navigates their personal and academic life and instills in them the confidence to face the world with all its complexities and challenges. ALIET seeks to provide an environment in which a student is confident, comfortable and guided in order to hone individual's skills and talents to become competent and committed engineers.
                                        </p>
                                        <p>
                                            ALIET promotes a culture of learning in a culture of human interactions and exchange, drives the academic excellence by providing space and platform to think, ideate, explore and create. It emphasizes overcoming adversity to realize dreams and be leaders to give the world an alternative narrative and perspective of life. Today's enemy has no face but continues to threaten the world in the form of technology with all its adverse effects, and hence it is very pertinent to note that ALIET encourages students to learn, relearn and unlearn in the process of becoming individuals who can make a difference and create an impact in the society they live.
                                        </p>
                                        <p>
                                            We wish and desire that our students are competent, compassionate and committed individuals who can be the change and the agents of transformation. The institution continues to esteem highly the trust of parents and treads very carefully in shaping the young minds to become global citizens for tomorrow, and as men and women for others.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation Bar - Only visible on mobile */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-100 z-50 flex pb-1">
                <button
                    onClick={() => setShowDirectorMessage(true)}
                    className="flex-1 py-3 flex flex-col items-center justify-center gap-1 active:bg-gray-50 text-gray-600 hover:text-primary-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote w-5 h-5 rotate-180"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /></svg>
                    <span className="text-xs font-medium">Director's Message</span>
                </button>
                <div className="w-px bg-gray-200 my-2"></div>
                <button
                    onClick={() => setShowPrincipalMessage(true)}
                    className="flex-1 py-3 flex flex-col items-center justify-center gap-1 active:bg-gray-50 text-gray-600 hover:text-primary-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote w-5 h-5"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /></svg>
                    <span className="text-xs font-medium">Principal's Message</span>
                </button>
            </div>
        </div>
    );
}
