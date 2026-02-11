'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, User, Phone, Building2, CheckCircle, Lock, Mail, Briefcase } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function FacultyRegisterPage() {
    const router = useRouter();
    const { signUp } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        employeeId: '',
        mobileNumber: '',
        password: '',
        confirmPassword: '',
        department: '',
    });

    // Auto-redirect after 3 seconds when success modal is shown
    useEffect(() => {
        if (showSuccessModal) {
            const timer = setTimeout(() => {
                router.push('/dashboard/faculty');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessModal, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            // Check if employee ID already exists
            // Although Firebase Auth checks email, we might want to check ID uniqueness in 'users' collection ideally.
            // For now, rely on Auth email uniqueness.

            await signUp(formData.email, formData.password, {
                role: 'faculty',
                name: formData.name,
                employeeId: formData.employeeId,
                mobileNumber: formData.mobileNumber,
                department: formData.department,
                isApproved: false, // Pending admin approval
            });

            // Show success modal
            setShowSuccessModal(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
                        <GraduationCap className="w-12 h-12 text-primary-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">STAFF REGISTRATION</h1>
                    <p className="text-primary-100">Join the ALIETAKE Staff Team</p>
                </div>

                {/* Registration Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Personal Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Personal Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white text-gray-900"
                                        placeholder="Dr./Mr./Ms. Full Name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Staff ID *
                                    </label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.employeeId}
                                            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
                                            placeholder="Staff ID"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address *
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
                                            placeholder="official@aliet.ac.in"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mobile Number *
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            required
                                            value={formData.mobileNumber}
                                            onChange={(e) =>
                                                setFormData({ ...formData, mobileNumber: e.target.value })
                                            }
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
                                            placeholder="10-digit mobile number"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Professional Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5" />
                                Professional Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Department *
                                    </label>
                                    <select
                                        required
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white text-gray-900"
                                    >
                                        <option value="">Select Department</option>
                                        <option value="CSE">Computer Science (CSE)</option>
                                        <option value="ECE">Electronics & Communication (ECE)</option>
                                        <option value="EEE">Electrical & Electronics (EEE)</option>
                                        <option value="MECH">Mechanical (MECH)</option>
                                        <option value="CIVIL">Civil Engineering (CIVIL)</option>
                                        <option value="IT">Information Technology (IT)</option>
                                        <option value="S&H">Science & Humanities (S&H)</option>
                                        <option value="MBA">Management (MBA)</option>
                                    </select>
                                </div>
                            </div>
                        </div>


                        {/* Password */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                Security
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white text-gray-900"
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm Password *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white text-gray-900"
                                        placeholder="Re-enter password"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Submitting Request...' : 'Register as Staff'}
                            </button>
                        </div>

                        <div className="text-center text-sm text-gray-600">
                            Already have an account?{' '}
                            <a href="/login?mode=institutional" className="text-primary-600 hover:text-primary-700 font-medium">
                                Staff Login
                            </a>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-primary-100 text-sm">
                    <p>© {new Date().getFullYear()} ALIET College. All rights reserved.</p>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-fadeIn">
                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
                                <CheckCircle className="w-12 h-12 text-yellow-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
                            <p className="text-gray-600">
                                Your account has been created and is pending admin approval.
                            </p>
                        </div>

                        <div className="space-y-3 text-left bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Name:</span>
                                <span className="font-medium text-gray-900">{formData.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Employee ID:</span>
                                <span className="font-medium text-gray-900">{formData.employeeId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Department:</span>
                                <span className="font-medium text-gray-900">{formData.department}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push('/dashboard/faculty')}
                            className="w-full btn-primary py-3 text-lg font-semibold"
                        >
                            Go to Dashboard
                        </button>

                        <p className="text-sm text-gray-500 mt-4">
                            Redirecting automatically in 3 seconds...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
