'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { X } from 'lucide-react';
import { detectBranchInfo } from '@/utils/branchDetector';
import studentData from '@/data/students.json';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface RoleSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export default function RoleSelectionModal({
    isOpen,
    onClose,
    onComplete,
}: RoleSelectionModalProps) {
    const { updateUserProfile, currentUser, firebaseUser } = useAuth();
    const [step, setStep] = useState<'role' | 'details'>('role');
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        registrationNumber: '',
        employeeId: '',
        mobileNumber: '',
        emailId: '',
        department: '',
        branch: '',
        section: '',
        year: 1,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [branchWarning, setBranchWarning] = useState('');
    const [entryType, setEntryType] = useState<string | undefined>('');
    const [mobileNumberLocked, setMobileNumberLocked] = useState(false);

    const userEmail = currentUser?.email || firebaseUser?.email;
    const isAdminEmail = userEmail === 'zestacademyonline@gmail.com';

    useEffect(() => {
        // Check if mobile number was already updated
        if (currentUser?.mobileNumber) {
            setMobileNumberLocked(true);
            setFormData(prev => ({ ...prev, mobileNumber: currentUser.mobileNumber || '' }));
        }
        if (currentUser?.emailId) {
            setFormData(prev => ({ ...prev, emailId: currentUser.emailId || '' }));
        }
    }, [currentUser]);

    if (!isOpen) return null;

    const handleRoleSelect = (role: UserRole) => {
        setSelectedRole(role);
        setStep('details');
    };

    const checkDuplicates = async (mobile: string, email: string) => {
        try {
            // Check for duplicate mobile number
            if (mobile && mobile !== currentUser?.mobileNumber) {
                const mobileQuery = query(
                    collection(db, 'users'),
                    where('mobileNumber', '==', mobile)
                );
                const mobileSnapshot = await getDocs(mobileQuery);
                if (!mobileSnapshot.empty) {
                    return 'This mobile number is already registered';
                }
            }

            // Check for duplicate email
            if (email && email !== currentUser?.emailId) {
                const emailQuery = query(
                    collection(db, 'users'),
                    where('emailId', '==', email)
                );
                const emailSnapshot = await getDocs(emailQuery);
                if (!emailSnapshot.empty) {
                    return 'This email ID is already registered';
                }
            }

            return null;
        } catch (err) {
            console.error('Error checking duplicates:', err);
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Check for duplicates
            const duplicateError = await checkDuplicates(formData.mobileNumber, formData.emailId);
            if (duplicateError) {
                setError(duplicateError);
                setLoading(false);
                return;
            }

            const profileData: any = {
                role: selectedRole,
                name: formData.name,
                mobileNumber: formData.mobileNumber,
                emailId: formData.emailId,
            };

            if (selectedRole === 'student') {
                profileData.registrationNumber = formData.registrationNumber || '';
                profileData.department = formData.department || '';
                profileData.branch = formData.branch || '';
                profileData.section = formData.section || '';
                profileData.year = formData.year || 1;
                // Set default password to Registration Number as requested
                profileData.password = formData.registrationNumber || '';
            } else {
                profileData.employeeId = formData.employeeId || '';
                profileData.department = formData.department || '';
                // Set default password to Employee ID as requested
                profileData.password = formData.employeeId || '';
            }

            await updateUserProfile(profileData);
            onComplete();
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-4 md:p-6 relative my-8 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                {step === 'role' ? (
                    <div>
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                            Select Your Role
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Please select your role to continue
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleRoleSelect('student')}
                                className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                            >
                                <div className="font-semibold text-gray-900 dark:text-white">Student</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    View attendance, marks, and fees
                                </div>
                            </button>

                            <button
                                onClick={() => handleRoleSelect('faculty')}
                                className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                            >
                                <div className="font-semibold text-gray-900 dark:text-white">Faculty</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Mark attendance and manage classes
                                </div>
                            </button>

                            <button
                                onClick={() => handleRoleSelect('hod')}
                                className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                            >
                                <div className="font-semibold text-gray-900 dark:text-white">
                                    Head of Department
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Oversee department performance
                                </div>
                            </button>


                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                            Complete Your Profile
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Role: <span className="font-semibold capitalize">{selectedRole}</span>
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {selectedRole === 'student' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                        Registration Number *
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        value={formData.registrationNumber}
                                        onChange={async (e) => {
                                            const newRegNo = e.target.value.toUpperCase().trim();
                                            const { data: info, warning, entryType, calculatedYear } = detectBranchInfo(newRegNo);

                                            setBranchWarning(warning || '');
                                            setEntryType(entryType);

                                            let foundName = (studentData as Record<string, string>)[newRegNo];

                                            // Additional Lookup in Firestore for admin-registered students
                                            if (newRegNo.length >= 8) {
                                                try {
                                                    const usersRef = collection(db, 'users');
                                                    const q = query(usersRef, where('registrationNumber', '==', newRegNo), where('role', '==', 'student'));
                                                    const snapshot = await getDocs(q);
                                                    if (!snapshot.empty) {
                                                        const dbData = snapshot.docs[0].data();
                                                        foundName = dbData.name || foundName;

                                                        // Auto-fill other fields if found in DB
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            name: dbData.name || prev.name,
                                                            department: dbData.department || prev.department,
                                                            branch: dbData.branch || dbData.department || prev.branch,
                                                            year: dbData.year || prev.year,
                                                            section: dbData.section || prev.section,
                                                        }));
                                                    }
                                                } catch (err) {
                                                    console.error("DB Lookup failed:", err);
                                                }
                                            }

                                            setFormData(prev => ({
                                                ...prev,
                                                registrationNumber: newRegNo,
                                                name: foundName || prev.name,
                                                branch: info?.branch || prev.branch,
                                                department: info?.branch || prev.department,
                                                year: calculatedYear || prev.year
                                            }));
                                        }}
                                        className="input-field"
                                        placeholder="Enter Registration Number"
                                    />
                                    {formData.name && formData.registrationNumber.length >= 8 && (
                                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                Student Found: {formData.name}
                                            </p>
                                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                                ID: {formData.registrationNumber} | Branch: {formData.branch || formData.department}
                                            </p>
                                        </div>
                                    )}
                                    {branchWarning && (
                                        <p className="text-red-500 text-xs mt-1">{branchWarning}</p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field"
                                />
                            </div>

                            {selectedRole === 'student' ? (
                                <>


                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                            Department *
                                        </label>
                                        <select
                                            required
                                            value={formData.department}
                                            onChange={(e) =>
                                                setFormData({ ...formData, department: e.target.value })
                                            }
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                                Branch *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.branch}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, branch: e.target.value })
                                                }
                                                className="input-field"
                                                placeholder="e.g., CSE"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                                Section *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.section}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, section: e.target.value })
                                                }
                                                className="input-field"
                                                placeholder="e.g., A"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                            Year *
                                        </label>
                                        <select
                                            required
                                            value={formData.year}
                                            onChange={(e) =>
                                                setFormData({ ...formData, year: parseInt(e.target.value) })
                                            }
                                            className="input-field"
                                        >
                                            <option value={1}>1st Year</option>
                                            <option value={2}>2nd Year</option>
                                            <option value={3}>3rd Year</option>
                                            <option value={4}>4th Year</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                            Entry Level
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            disabled
                                            value={entryType || ''}
                                            className="input-field bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                                            placeholder="Auto-detected (e.g., Regular)"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                            Employee ID *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.employeeId}
                                            onChange={(e) =>
                                                setFormData({ ...formData, employeeId: e.target.value })
                                            }
                                            className="input-field"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                            Department *
                                        </label>
                                        <select
                                            required
                                            value={formData.department}
                                            onChange={(e) =>
                                                setFormData({ ...formData, department: e.target.value })
                                            }
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
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                    Mobile Number *
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.mobileNumber}
                                    onChange={(e) =>
                                        setFormData({ ...formData, mobileNumber: e.target.value })
                                    }
                                    className={`input-field ${mobileNumberLocked ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}`}
                                    placeholder="10-digit mobile number"
                                    disabled={mobileNumberLocked}
                                    readOnly={mobileNumberLocked}
                                />
                                {mobileNumberLocked && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        ⚠️ Mobile number can only be set once and cannot be changed
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                    Email ID *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.emailId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, emailId: e.target.value })
                                    }
                                    className="input-field"
                                    placeholder="your.email@example.com"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep('role')}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    disabled={loading}
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Complete'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
