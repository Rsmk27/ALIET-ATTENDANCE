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

        // Logic matching utils/branchDetector.ts (Dynamic System Date)
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;

        let year = currentYear - parseInt(yearPrefix, 10);

        // If Academic Year started (June 5+), add 1
        if (currentDate.getMonth() >= 5) {
            year += 1;
        }

        // Extract section from the middle part
        const sectionPart = regNo.substring(4, 6);
        const section = sectionPart === '1A' ? 'A' : sectionPart === '5A' ? 'A' : 'A';

        // Lateral Entry (+1 Year)
        if (sectionPart === '5A') {
            year += 1;
        }

        // Clamp to 1-4
        year = Math.max(1, Math.min(4, year));

        return { year, section };
    };

    const importStudents = async () => {
        setImporting(true);
        setStatus('📊 Starting import from students.json...');

        try {
            const { detectBranchInfo } = await import('@/utils/branchDetector');
            const entries = Object.entries(studentsData);
            setProgress({ current: 0, total: entries.length });

            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < entries.length; i++) {
                const [regNo, name] = entries[i];

                try {
                    const info = detectBranchInfo(regNo);
                    const year = info.calculatedYear || 1;
                    const branch = info.data?.branch || 'EEE'; // Default to EEE if unknown, as per original file
                    const section = 'A'; // Default to A as we don't have section in JSON

                    const studentData = {
                        name: name as string,
                        email: `${regNo.toLowerCase()}@aliet.ac.in`,
                        registrationNumber: regNo,
                        branch: branch,
                        year: year,
                        section: section,
                        role: 'student',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isApproved: true // Auto-approve imported students
                    };

                    // 1. Ensure Year Document Exists
                    const yearDocRef = doc(db, 'admin', 'students', branch, String(year));
                    await setDoc(yearDocRef, { year: year, active: true }, { merge: true });

                    // 2. Store in Hierarchical Path
                    // path: admin/students/{branch}/{year}/{section}/{regNo}
                    const studentRef = doc(db, 'admin', 'students', branch, String(year), section, regNo);
                    await setDoc(studentRef, studentData, { merge: true });

                    // 3. Also create in main 'users' collection for Auth linking later?
                    // The main 'users' collection usually uses UID. Since we don't have UID (no auth user yet),
                    // we can't create the main user doc effectively without a UID.
                    // These imported students will be "unclaimed" profiles until they sign up?
                    // Or is this for just filling the admin view?
                    // Assuming admin view for now.

                    // NOTE: If they sign up later, the AuthContext signUp will overwrite/link this if logic allows.
                    // Currently AuthContext writes to this path using UID. 
                    // Use RegNo as ID here for now so it's consistent. 
                    // But wait, AuthContext uses `user.uid` as the document ID in the hierarchy.
                    // If we use RegNo here, we might have duplicates if they sign up (UID != RegNo).
                    // BUT, we can't generate a UID without creating an Auth user.
                    // So using RegNo is the best we can do for "pre-filled" data.

                    successCount++;
                    setProgress({ current: i + 1, total: entries.length });
                    setStatus(`✅ Imported ${successCount} of ${entries.length} to /admin/students/${branch}/${year}/${section}...`);
                } catch (error: any) {
                    console.error(`Error importing student ${regNo}:`, error);
                    errorCount++;
                }
            }

            setStatus(`✅ Import complete! Successfully imported ${successCount} students. Failed: ${errorCount}`);
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
