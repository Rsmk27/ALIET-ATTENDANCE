'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, User, Mail, Lock, Phone, Building2 } from 'lucide-react';
import { detectBranchInfo } from '@/utils/branchDetector';
import studentData from '@/data/students.json';

export default function RegisterPage() {
    const router = useRouter();
    const { signUp } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [branchWarning, setBranchWarning] = useState('');
    const [entryType, setEntryType] = useState<string | undefined>('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        registrationNumber: '',
        mobileNumber: '',
        password: '',
        confirmPassword: '',
        department: '',
        branch: '',
        section: '',
        year: 1,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
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
            // Use registration number as email format for students
            const email = `${formData.registrationNumber}@aliet.edu`;

            await signUp(email, formData.password, {
                role: 'student',
                name: formData.name,
                registrationNumber: formData.registrationNumber,
                mobileNumber: formData.mobileNumber,
                department: formData.department,
                branch: formData.branch,
                section: formData.section,
                year: formData.year,
            });

            router.push('/dashboard/student');
        } catch (err: any) {
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
                    <h1 className="text-4xl font-bold text-white mb-2">Student Registration</h1>
                    <p className="text-primary-100">Create your ALIETAKE account</p>
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
                                        className="input-field"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Registration Number *
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        value={formData.registrationNumber}
                                        onChange={(e) => {
                                            const newRegNo = e.target.value.toUpperCase();
                                            const { data: info, warning, entryType, calculatedYear } = detectBranchInfo(newRegNo);

                                            setBranchWarning(warning || '');
                                            setEntryType(entryType);

                                            // Auto-fill Name from Registry
                                            const foundName = (studentData as Record<string, string>)[newRegNo];

                                            setFormData({
                                                ...formData,
                                                registrationNumber: newRegNo,
                                                name: foundName || formData.name, // Only overwrite if found
                                                branch: info?.branch || formData.branch,
                                                department: info?.branch || formData.department,
                                                year: calculatedYear || formData.year
                                            });
                                        }}
                                        className="input-field"
                                        placeholder="e.g., 24HP5A0216"
                                    />
                                    {branchWarning && (
                                        <p className="text-red-500 text-xs mt-1">{branchWarning}</p>
                                    )}
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
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            placeholder="10-digit mobile number"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Academic Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5" />
                                Academic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Department *
                                    </label>
                                    <select
                                        required
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="">Select Department</option>
                                        <option value="CSE">Computer Science (CSE)</option>
                                        <option value="ECE">Electronics & Communication (ECE)</option>
                                        <option value="EEE">Electrical & Electronics (EEE)</option>
                                        <option value="MECH">Mechanical (MECH)</option>
                                        <option value="CIVIL">Civil Engineering (CIVIL)</option>
                                        <option value="IT">Information Technology (IT)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Branch *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.branch}
                                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g., CSE"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Section *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.section}
                                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g., A"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Year *
                                    </label>
                                    <select
                                        required
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                        className="input-field"
                                    >
                                        <option value={1}>1st Year</option>
                                        <option value={2}>2nd Year</option>
                                        <option value={3}>3rd Year</option>
                                        <option value={4}>4th Year</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Entry Level
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        disabled
                                        value={entryType || ''}
                                        className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                                        placeholder="Auto-detected (e.g., Regular)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                Security
                            </h3>
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
                                        className="input-field"
                                        placeholder="At least 6 characters"
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
                                        onChange={(e) =>
                                            setFormData({ ...formData, confirmPassword: e.target.value })
                                        }
                                        className="input-field"
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
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </div>

                        <div className="text-center text-sm text-gray-600">
                            Already have an account?{' '}
                            <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                                Sign in
                            </a>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-primary-100 text-sm">
                    <p>© 2026 ALIET College. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
