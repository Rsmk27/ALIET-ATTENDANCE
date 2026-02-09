'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '@/lib/firebase/config';
import { initializeApp, getApp } from 'firebase/app';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, LayoutDashboard, ShieldAlert, Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useAuth, ADMIN_EMAILS } from '@/context/AuthContext';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function RegisterFaculty() {
    const router = useRouter();
    const { currentUser, loading } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        facultyId: '',
        registrationNumber: '',
        department: 'CSE',
        role: 'faculty', // Default to faculty
        year: '1',
        section: 'A',
        password: '' // Default empty per user request
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Bulk Upload State
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [bulkUploadProgress, setBulkUploadProgress] = useState({ current: 0, total: 0, status: '' });
    const [bulkResults, setBulkResults] = useState<{ success: any[], failed: any[] }>({ success: [], failed: [] });
    const [showBulkUpload, setShowBulkUpload] = useState(false);

    // Initialize secondary app ONLY on client to avoid build errors
    // Use a secondary app instance to create users without logging out the current admin
    const getSecondaryAuth = () => {
        let secondaryApp;
        try {
            secondaryApp = getApp('Secondary');
        } catch (e) {
            secondaryApp = initializeApp(firebaseConfig, 'Secondary');
        }
        return getAuth(secondaryApp);
    };

    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'CSM', 'CSD', 'MBA'];

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    // Access Control: Only specific emails allowed
    if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center">
                <ShieldAlert className="w-16 h-16 text-red-600 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-6">You do not have permission to view this page.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation: Check name and either FacultyID or RegNo
        if (!formData.name) {
            setStatus({ type: 'error', message: 'Please fill in name' });
            return;
        }
        if (formData.role === 'student' && !formData.registrationNumber) {
            setStatus({ type: 'error', message: 'Please fill in Registration Number' });
            return;
        }
        if (formData.role !== 'student' && !formData.facultyId) {
            setStatus({ type: 'error', message: 'Please fill in Faculty ID' });
            return;
        }

        setIsLoading(true);
        setStatus({ type: '', message: '' });

        const name = formData.name;
        const isStudent = formData.role === 'student';
        const rawId = isStudent ? formData.registrationNumber : formData.facultyId;
        const id = rawId.toUpperCase();

        // Email generation logic
        const email = `${id}@aliet.ac.in`.toLowerCase();
        const password = formData.password || 'password123'; // Fallback if empty

        try {
            // 1. Create Auth User using Secondary Auth instance (prevents logout)
            const secondaryAuth = getSecondaryAuth();
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;

            // 2. Create Firestore Profile users/{uid}
            const userProfile: any = {
                uid: user.uid,
                name: name,
                email: email,
                role: formData.role,
                createdAt: serverTimestamp(),
                department: formData.department,
                branch: formData.department, // For compatibility
                mobileNumber: ''
            };

            // Add role-specific fields
            if (isStudent) {
                userProfile.registrationNumber = id;
                userProfile.year = parseInt(formData.year);
                userProfile.section = formData.section.toUpperCase();
            } else {
                userProfile.employeeId = id;
            }

            await setDoc(doc(db, 'users', user.uid), userProfile);

            // 3. Create Admin Hierarchy
            if (isStudent) {
                // Student Hierarchy: admin/students/{branch}/{year}/{section}/{uid}
                try {
                    const deepPathRef = doc(db, 'admin', 'students', formData.department, formData.year, formData.section, user.uid);
                    await setDoc(deepPathRef, userProfile);
                } catch (err) {
                    console.error("Error creating student hierarchy:", err);
                }
            } else {
                // Faculty Hierarchy: admin/faculty/branch/{dept}/faculty_members/{uid}
                // Ensuring path segments are correct: admin (col), faculty (doc), branch (subcol), {dept} (doc), faculty_members (subcol), {uid} (doc)
                const branchRef = doc(db, 'admin', 'faculty', 'branch', formData.department);
                const memberRef = doc(branchRef, 'faculty_members', user.uid);

                try {
                    await setDoc(branchRef, { name: formData.department, updatedAt: serverTimestamp() }, { merge: true });
                    await setDoc(memberRef, { ...userProfile, joinedAt: serverTimestamp() });
                } catch (err) {
                    console.error("Error creating faculty hierarchy:", err);
                }
            }

            setStatus({
                type: 'success',
                message: `SUCCESS! Created ${formData.role}: ${name} (${id})\nLogin ID: ${id}`
            });

            // Clear form (except defaults)
            setFormData(prev => ({
                ...prev,
                name: '',
                facultyId: '',
                registrationNumber: '',
                password: ''
            }));

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setStatus({ type: 'error', message: `User ID ${id} already exists! Try logging in.` });
            } else {
                setStatus({ type: 'error', message: 'Error: ' + err.message });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // File Upload Handler - Parse different file formats
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setBulkFile(file);
        setParsedData([]);
        setBulkResults({ success: [], failed: [] });

        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        try {
            let data: any[] = [];

            if (fileExtension === 'csv') {
                // Parse CSV
                const text = await file.text();
                const result = Papa.parse(text, { header: true, skipEmptyLines: true });
                data = result.data;
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                // Parse Excel
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(firstSheet);
            } else if (fileExtension === 'pdf') {
                setStatus({
                    type: 'error',
                    message: 'PDF parsing requires specific format. Please use CSV or Excel for best results.'
                });
                return;
            } else if (fileExtension === 'docx' || fileExtension === 'doc') {
                setStatus({
                    type: 'error',
                    message: 'Word document parsing requires specific format. Please use CSV or Excel for best results.'
                });
                return;
            } else {
                setStatus({ type: 'error', message: 'Unsupported file format. Please use CSV or Excel.' });
                return;
            }

            // Normalize data - map common column names
            const normalizedData = data.map((row: any) => {
                const isStudent = row.registrationNumber || row['Registration Number'] || row.regNo || row['Reg No'];

                return {
                    name: row.name || row.Name || row.fullName || row['Full Name'] || '',
                    role: isStudent ? 'student' : (row.role || row.Role || 'faculty'),
                    registrationNumber: row.registrationNumber || row['Registration Number'] || row.regNo || row['Reg No'] || '',
                    year: row.year || row.Year || row.class || row.Class || '1',
                    section: row.section || row.Section || row.sec || row.Sec || 'A',
                    facultyId: row.facultyId || row['Faculty ID'] || row.employeeId || row['Employee ID'] || '',
                    department: row.department || row.Department || row.branch || row.Branch || 'CSE',
                    password: row.password || row.Password || 'password123'
                };
            }).filter((item: any) => item.name);

            setParsedData(normalizedData);
            setStatus({
                type: 'success',
                message: `Successfully parsed ${normalizedData.length} records from ${file.name}`
            });
        } catch (error: any) {
            console.error('File parsing error:', error);
            setStatus({ type: 'error', message: 'Error parsing file: ' + error.message });
        }
    };

    // Bulk Upload Handler
    const handleBulkUpload = async () => {
        if (parsedData.length === 0) {
            setStatus({ type: 'error', message: 'No data to upload. Please upload a file first.' });
            return;
        }

        setIsLoading(true);
        setBulkUploadProgress({ current: 0, total: parsedData.length, status: 'Processing...' });
        const results = { success: [] as any[], failed: [] as any[] };

        for (let i = 0; i < parsedData.length; i++) {
            const userData = parsedData[i];
            setBulkUploadProgress({
                current: i + 1,
                total: parsedData.length,
                status: `Processing ${userData.name}...`
            });

            try {
                await createUserInBulk(userData);
                results.success.push({ ...userData, reason: 'Created successfully' });
            } catch (error: any) {
                results.failed.push({ ...userData, reason: error.message });
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        setBulkResults(results);
        setIsLoading(false);
        setBulkUploadProgress({
            current: parsedData.length,
            total: parsedData.length,
            status: 'Complete!'
        });
        setStatus({
            type: results.failed.length > 0 ? 'error' : 'success',
            message: `Bulk upload complete!\nSuccess: ${results.success.length}\nFailed: ${results.failed.length}`
        });
    };

    // Helper function to create individual user in bulk
    const createUserInBulk = async (userData: any) => {
        const isStudent = userData.role === 'student';
        const id = (isStudent ? userData.registrationNumber : userData.facultyId).toUpperCase();
        const email = `${id}@aliet.ac.in`.toLowerCase();
        const password = userData.password || 'password123';

        const secondaryAuth = getSecondaryAuth();
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const user = userCredential.user;

        const userProfile: any = {
            uid: user.uid,
            name: userData.name,
            email: email,
            role: userData.role,
            createdAt: serverTimestamp(),
            department: userData.department,
            branch: userData.department,
            mobileNumber: ''
        };

        if (isStudent) {
            userProfile.registrationNumber = id;
            userProfile.year = parseInt(userData.year);
            userProfile.section = userData.section.toUpperCase();
        } else {
            userProfile.employeeId = id;
        }

        await setDoc(doc(db, 'users', user.uid), userProfile);

        if (isStudent) {
            const deepPathRef = doc(db, 'admin', 'students', userData.department, userData.year, userData.section, user.uid);
            await setDoc(deepPathRef, userProfile);
        } else {
            const branchRef = doc(db, 'admin', 'faculty', 'branch', userData.department);
            const memberRef = doc(branchRef, 'faculty_members', user.uid);
            await setDoc(branchRef, { name: userData.department, updatedAt: serverTimestamp() }, { merge: true });
            await setDoc(memberRef, { ...userProfile, joinedAt: serverTimestamp() });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-blue-600" />
                        Admin: Register User
                    </h1>
                    <button
                        onClick={() => router.push('/dashboard/admin')}
                        className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                    >
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>
                </div>

                <div className="mb-6 bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-200">
                    Logged in as Admin: <strong>{currentUser?.email}</strong>
                </div>

                {/* Toggle between Single and Bulk Upload */}
                <div className="mb-6 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setShowBulkUpload(false)}
                        className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${!showBulkUpload
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        <UserPlus className="w-4 h-4 inline mr-2" />
                        Single Registration
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowBulkUpload(true)}
                        className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${showBulkUpload
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        <Upload className="w-4 h-4 inline mr-2" />
                        Bulk Upload
                    </button>
                </div>

                {!showBulkUpload ? (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g. John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                            <select
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="student">Student</option>
                                <option value="faculty">Faculty</option>
                                <option value="hod">Head of Department (HOD)</option>
                            </select>
                        </div>

                        {formData.role === 'student' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                        placeholder="e.g. 20HP1A0501"
                                        value={formData.registrationNumber}
                                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Generated Email: {((formData.registrationNumber || "example") + "@aliet.ac.in").toLowerCase()}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                        <select
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        >
                                            {[1, 2, 3, 4].map((y) => (
                                                <option key={y} value={y}>{y} Year</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                                        <select
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.section}
                                            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                        >
                                            {['A', 'B', 'C', 'D'].map((s) => (
                                                <option key={s} value={s}>Section {s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty ID</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                    placeholder="e.g. FAC-CSE-001"
                                    value={formData.facultyId}
                                    onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Generated Email: {((formData.facultyId || "example") + "@aliet.ac.in").toLowerCase()}
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch/Department</label>
                            <select
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            >
                                {departments.map((dept) => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="text"
                                className="w-full border p-2 rounded bg-gray-50 text-gray-600"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Leave empty for default: password123"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isLoading ? 'Creating...' : `Create ${formData.role === 'student' ? 'Student' : 'Faculty'} Account`}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        {/* File Upload Section */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                            <label className="cursor-pointer">
                                <span className="text-blue-600 hover:text-blue-700 font-medium">
                                    Choose file
                                </span>
                                <span className="text-gray-600"> or drag and drop</span>
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                                Supported: CSV, Excel (.xlsx, .xls)
                            </p>
                            {bulkFile && (
                                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-700">
                                    <FileText className="w-4 h-4" />
                                    {bulkFile.name}
                                </div>
                            )}
                        </div>

                        {/* File Format Guide */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
                            <h3 className="font-semibold text-blue-900 mb-2">📋 File Format Guide:</h3>
                            <p className="text-blue-800 mb-2"><strong>For Students:</strong> name, registrationNumber, year, section, department</p>
                            <p className="text-blue-800 mb-3"><strong>For Faculty:</strong> name, facultyId, department, role (faculty/hod)</p>
                            <div className="flex gap-2 mt-2">
                                <a
                                    href="/sample-students.csv"
                                    download
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                                >
                                    📥 Download Student Template
                                </a>
                                <a
                                    href="/sample-faculty.csv"
                                    download
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                                >
                                    📥 Download Faculty Template
                                </a>
                            </div>
                        </div>

                        {/* Parsed Data Preview */}
                        {parsedData.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 border-b">
                                    <h3 className="font-semibold text-gray-800">
                                        Parsed Data ({parsedData.length} records)
                                    </h3>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Name</th>
                                                <th className="px-3 py-2 text-left">Role</th>
                                                <th className="px-3 py-2 text-left">ID</th>
                                                <th className="px-3 py-2 text-left">Dept</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.map((item, idx) => (
                                                <tr key={idx} className="border-t hover:bg-gray-50">
                                                    <td className="px-3 py-2">{item.name}</td>
                                                    <td className="px-3 py-2">{item.role}</td>
                                                    <td className="px-3 py-2 text-xs">
                                                        {item.role === 'student' ? item.registrationNumber : item.facultyId}
                                                    </td>
                                                    <td className="px-3 py-2">{item.department}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 border-t">
                                    <button
                                        onClick={handleBulkUpload}
                                        disabled={isLoading}
                                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? 'Uploading...' : `Upload ${parsedData.length} Users`}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Progress Indicator */}
                        {isLoading && bulkUploadProgress.total > 0 && (
                            <div className="border rounded-lg p-4 bg-blue-50">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium">Progress:</span>
                                    <span>{bulkUploadProgress.current} / {bulkUploadProgress.total}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(bulkUploadProgress.current / bulkUploadProgress.total) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-600">{bulkUploadProgress.status}</p>
                            </div>
                        )}

                        {/* Results Display */}
                        {(bulkResults.success.length > 0 || bulkResults.failed.length > 0) && (
                            <div className="space-y-3">
                                {bulkResults.success.length > 0 && (
                                    <div className="border border-green-200 rounded-lg overflow-hidden">
                                        <div className="bg-green-50 px-4 py-2 border-b border-green-200 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <h3 className="font-semibold text-green-800">
                                                Successfully Created ({bulkResults.success.length})
                                            </h3>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto p-3 text-sm text-green-800">
                                            {bulkResults.success.map((item, idx) => (
                                                <div key={idx} className="py-1">✓ {item.name}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {bulkResults.failed.length > 0 && (
                                    <div className="border border-red-200 rounded-lg overflow-hidden">
                                        <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center gap-2">
                                            <XCircle className="w-4 h-4 text-red-600" />
                                            <h3 className="font-semibold text-red-800">
                                                Failed ({bulkResults.failed.length})
                                            </h3>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto p-3 text-sm text-red-800">
                                            {bulkResults.failed.map((item, idx) => (
                                                <div key={idx} className="py-1">
                                                    ✗ {item.name}: {item.reason}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {status.type && (
                    <div className={`mt-6 p-4 rounded text-sm whitespace-pre-line ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        {status.message}
                    </div>
                )}

                <div className="mt-6 pt-4 border-t text-center">
                    <a href="/login" className="text-blue-500 hover:underline flex items-center justify-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                    </a>
                </div>
            </div>
        </div>
    );
}
password: 'password'