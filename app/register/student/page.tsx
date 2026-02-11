'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, User, Phone, Building2, CheckCircle, Lock } from 'lucide-react';
import { detectBranchInfo } from '@/utils/branchDetector';
import studentData from '@/data/students.json';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function StudentRegisterPage() {
    const router = useRouter();
    const { signUp } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [branchWarning, setBranchWarning] = useState('');
    const [entryType, setEntryType] = useState<string | undefined>('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    // Auto-redirect after 3 seconds when success modal is shown
    useEffect(() => {
        if (showSuccessModal) {
            const timer = setTimeout(() => {
                router.push('/dashboard/student');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessModal, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation - registration number must be at least 6 characters
        if (formData.registrationNumber.length < 6) {
            setError('Registration number must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            // Use registration number as email format for students
            const email = `${formData.registrationNumber}@aliet.edu`;
            // Use registration number as default password
            const password = formData.registrationNumber;

            // Check if student exists in database
            let studentExists = false;
            let existingStudentData = null;
            const branches = ['CIVIL', 'EEE', 'MECH', 'ECE', 'CSE', 'IT', 'CSM', 'CSD'];

            for (const branch of branches) {
                const studentRef = collection(db, `admin/students/${branch}`);
                const q = query(studentRef, where('registrationNumber', '==', formData.registrationNumber));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    studentExists = true;
                    existingStudentData = snapshot.docs[0].data();
                    break;
                }
            }

            // Create Firebase Auth account with registration number as password
            await signUp(email, password, {
                role: 'student',
                name: formData.name,
                registrationNumber: formData.registrationNumber,
                mobileNumber: formData.mobileNumber,
                department: formData.department,
                branch: formData.branch,
                section: formData.section,
                year: formData.year,
            });

            // Create or update student profile in admin/students/{branch}
            const studentProfileData = {
                name: formData.name,
                email: email,
                registrationNumber: formData.registrationNumber,
                branch: formData.branch,
                department: formData.department,
                section: formData.section,
                year: formData.year,
                mobileNumber: formData.mobileNumber,
                role: 'student',
                createdAt: existingStudentData?.createdAt || new Date(),
                updatedAt: new Date()
            };

            // Store in the respective branch collection
            const branchStudentRef = doc(collection(db, `admin/students/${formData.branch}`), formData.registrationNumber);
            await setDoc(branchStudentRef, studentProfileData, { merge: true });

            // Show success modal
            setShowSuccessModal(true);
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
                                        placeholder="e.g., 24HP5A0216"
                                    />
                                    {branchWarning && (
                                        <p className="text-red-500 text-xs mt-1">{branchWarning}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
                                        placeholder="Enter your full name"
                                    />
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
                                        onChange={(e) => {
                                            const selectedDept = e.target.value;
                                            setFormData({
                                                ...formData,
                                                department: selectedDept,
                                                branch: selectedDept
                                            });
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
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
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            const validDepts = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"];
                                            if (validDepts.includes(val)) {
                                                setFormData({ ...formData, branch: e.target.value, department: val });
                                            } else {
                                                setFormData({ ...formData, branch: e.target.value });
                                            }
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
                                        placeholder="e.g., EEE"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-500 cursor-not-allowed"
                                        placeholder="Auto-detected (e.g., Regular)"
                                    />
                                </div>
                            </div>
                        </div>


                        {/* Password Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 mb-1">Default Password</h4>
                                    <p className="text-sm text-blue-700">
                                        Your <strong>registration number</strong> will be used as your default password.
                                        You can change it later from your dashboard settings.
                                    </p>
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
                    <p>© {new Date().getFullYear()} ALIET College. All rights reserved.</p>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-fadeIn">
                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                            <p className="text-gray-600">
                                Your account has been created successfully.
                            </p>
                        </div>

                        <div className="space-y-3 text-left bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Name:</span>
                                <span className="font-medium text-gray-900">{formData.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Registration No:</span>
                                <span className="font-medium text-gray-900">{formData.registrationNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Branch:</span>
                                <span className="font-medium text-gray-900">{formData.branch}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Year:</span>
                                <span className="font-medium text-gray-900">{formData.year}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push('/dashboard/student')}
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
