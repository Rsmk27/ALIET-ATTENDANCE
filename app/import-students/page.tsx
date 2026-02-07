'use client';

import { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import studentsData from '@/data/students.json';

export default function ImportStudentsPage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const [importing, setImporting] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const parseRegistrationNumber = (regNo: string) => {
        // Extract year and section from registration number
        // Format: 23HP1A0202 or 24HP5A0201
        // 23/24 = year prefix, HP1A02/HP5A02 = branch code, last 2 digits = roll number

        const yearPrefix = regNo.substring(0, 2);
        const year = yearPrefix === '23' ? 2 : yearPrefix === '24' ? 1 : 2;

        // Extract section from the middle part
        const sectionPart = regNo.substring(4, 6);
        const section = sectionPart === '1A' ? 'A' : sectionPart === '5A' ? 'A' : 'A';

        return { year, section };
    };

    const importStudents = async () => {
        setImporting(true);
        setStatus('📊 Starting import from students.json...');

        try {
            const entries = Object.entries(studentsData);
            setProgress({ current: 0, total: entries.length });

            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < entries.length; i++) {
                const [regNo, name] = entries[i];

                try {
                    const { year, section } = parseRegistrationNumber(regNo);

                    const studentData = {
                        name: name as string,
                        email: `${regNo.toLowerCase()}@aliet.ac.in`,
                        registrationNumber: regNo,
                        branch: 'EEE',
                        year: year,
                        section: section,
                        role: 'student',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    // Store in collection: admin/students/EEE
                    const studentRef = doc(collection(db, 'admin/students/EEE'), regNo);
                    await setDoc(studentRef, studentData);

                    successCount++;
                    setProgress({ current: i + 1, total: entries.length });
                    setStatus(`✅ Imported ${successCount} of ${entries.length} students to /admin/students/EEE/...`);
                } catch (error: any) {
                    console.error(`Error importing student ${regNo}:`, error);
                    errorCount++;
                }
            }

            setStatus(`✅ Import complete! Successfully imported ${successCount} students to /admin/students/EEE/. ${errorCount > 0 ? `Failed: ${errorCount}` : ''}`);
            setImporting(false);
        } catch (error: any) {
            setStatus(`❌ Error: ${error.message}`);
            setImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">📥 Import Students from JSON</h1>

                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Data Source:</h3>
                    <p className="text-sm text-blue-800">
                        <code>data/students.json</code>
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                        Found <strong>{Object.keys(studentsData).length} students</strong> ready to import
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                        <li>Branch: EEE</li>
                        <li>Years: 1st & 2nd year</li>
                        <li>Section: A</li>
                    </ul>
                </div>

                <button
                    onClick={importStudents}
                    disabled={importing}
                    className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                    {importing ? 'Importing...' : `Import ${Object.keys(studentsData).length} Students`}
                </button>

                {progress.total > 0 && (
                    <div className="mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                                className="bg-primary-600 h-4 rounded-full transition-all duration-300"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 text-center">
                            {progress.current} / {progress.total}
                        </p>
                    </div>
                )}

                {status && (
                    <div className={`p-4 rounded-lg ${status.includes('✅')
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : status.includes('❌')
                            ? 'bg-red-50 border border-red-200 text-red-800'
                            : 'bg-blue-50 border border-blue-200 text-blue-800'
                        }`}>
                        <pre className="whitespace-pre-wrap text-sm">{status}</pre>
                    </div>
                )}

                <div className="mt-6 flex gap-4">
                    <a href="/dashboard/admin" className="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        ← Back to Admin Dashboard
                    </a>
                    <a href="/dashboard" className="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        Go to Dashboard
                    </a>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> This will create user accounts for all students in the JSON file.
                        Each student will be assigned an email like: <code>registrationnumber@aliet.ac.in</code>
                    </p>
                </div>
            </div>
        </div>
    );
}
