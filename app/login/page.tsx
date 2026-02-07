'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import RoleSelectionModal from '@/components/auth/RoleSelectionModal';
import { GraduationCap, Building2, Mail, Lock, User, Phone } from 'lucide-react';
import Image from 'next/image';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

type LoginMode = 'student' | 'institutional';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, signInWithGoogle } = useAuth();
    const [mode, setMode] = useState<LoginMode>('student');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [studentName, setStudentName] = useState('');
    const [lookingUp, setLookingUp] = useState(false);

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
                // Search in all branch collections
                const branches = ['CIVIL', 'EEE', 'MECH', 'ECE', 'CSE', 'IT', 'CSM', 'CSD'];

                for (const branch of branches) {
                    const studentRef = collection(db, `admin/students/${branch}`);
                    const q = query(studentRef, where('registrationNumber', '==', regNo));
                    const snapshot = await getDocs(q);

                    if (!snapshot.empty) {
                        const studentData = snapshot.docs[0].data();
                        setStudentName(studentData.name || '');
                        setLookingUp(false);
                        return;
                    }
                }

                setStudentName('');
            } catch (err) {
                console.error('Error looking up student:', err);
                setStudentName('');
            } finally {
                setLookingUp(false);
            }
        };

        const timeoutId = setTimeout(lookupStudent, 500);
        return () => clearTimeout(timeoutId);
    }, [studentForm.registrationNumber]);

    const handleStudentLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // For student login, we'll use registration number as email format
            const email = `${studentForm.registrationNumber}@aliet.edu`;
            await signIn(email, studentForm.password);
            router.push('/dashboard/student');
        } catch (err: any) {
            // Show user-friendly error message
            if (err.message?.includes('auth/invalid-credential') || err.message?.includes('auth/user-not-found')) {
                setError('Student not found. Please check your registration number and password.');
            } else {
                setError(err.message || 'Failed to sign in');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInstitutionalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signIn(institutionalForm.email, institutionalForm.password);
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
        <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
                        <GraduationCap className="w-12 h-12 text-primary-600" />
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
                                    <p className="text-xs text-gray-500 mt-1">
                                        🔍 Looking up student...
                                    </p>
                                )}
                                {studentName && !lookingUp && (
                                    <p className="text-sm text-green-600 font-medium mt-1 flex items-center gap-1">
                                        ✓ {studentName}
                                    </p>
                                )}
                                {!studentName && !lookingUp && studentForm.registrationNumber.length >= 8 && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        ⚠️ Student not found in database
                                    </p>
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
                        <form onSubmit={handleInstitutionalLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        value={institutionalForm.email}
                                        onChange={(e) =>
                                            setInstitutionalForm({ ...institutionalForm, email: e.target.value })
                                        }
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Enter your email"
                                    />
                                </div>
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
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-primary-100 text-sm">
                    <p>© 2026 ALIET College. All rights reserved.</p>
                </div>
            </div>

            {/* Role Selection Modal */}
            <RoleSelectionModal
                isOpen={showRoleModal}
                onClose={() => setShowRoleModal(false)}
                onComplete={handleRoleModalComplete}
            />
        </div>
    );
}
