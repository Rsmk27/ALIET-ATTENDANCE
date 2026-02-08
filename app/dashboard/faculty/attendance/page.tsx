'use client';

import { useState, useMemo, useEffect } from 'react';
import studentData from '@/data/students.json';
import { detectBranchInfo } from '@/utils/branchDetector';
import { UserCheck, UserX, Save, Filter, AlertTriangle, X, Edit2, Clock, RefreshCw } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, collection, addDoc, serverTimestamp, getDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

export default function AttendancePage() {
    const { currentUser } = useAuth();

    // Selection Filters
    const [selectedBranch, setSelectedBranch] = useState('EEE');
    const [selectedYear, setSelectedYear] = useState(2);
    const [selectedSection, setSelectedSection] = useState('A');
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editingTimestamp, setEditingTimestamp] = useState<any>(null);
    const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
    const [showRecentSubmissions, setShowRecentSubmissions] = useState(false);

    // Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [unmarkedStudents, setUnmarkedStudents] = useState<typeof filteredStudents>([]);

    // Attendance State
    const [attendance, setAttendance] = useState<Record<string, 'Present' | 'Absent'>>({});

    // Load recent submissions on mount
    useEffect(() => {
        loadRecentSubmissions();
    }, [currentUser]);

    const loadRecentSubmissions = async () => {
        if (!currentUser) return;

        try {
            // Get submissions from last 24 hours
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);

            const q = query(
                collection(db, 'attendance'),
                where('facultyId', '==', currentUser.uid),
                orderBy('timestamp', 'desc'),
                limit(10)
            );

            const snapshot = await getDocs(q);
            const submissions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setRecentSubmissions(submissions);
        } catch (error) {
            console.error('Error loading recent submissions:', error);
        }
    };

    const canEdit = (timestamp: any): boolean => {
        if (!timestamp) return false;

        const submittedTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - submittedTime.getTime()) / (1000 * 60 * 60);

        return hoursDiff <= 2;
    };

    const loadAttendanceForEdit = async (docId: string) => {
        try {
            const docRef = doc(db, 'attendance', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Check if can edit
                if (!canEdit(data.timestamp)) {
                    alert('This attendance record is older than 2 hours and cannot be edited.');
                    return;
                }

                // Set filters to match the record
                setSelectedBranch(data.branch);
                setSelectedYear(data.year);
                setSelectedSection(data.section);
                setAttendanceDate(data.date);

                // Load attendance records
                setAttendance(data.records || {});

                // Set edit mode
                setIsEditMode(true);
                setEditingDocId(docId);
                setEditingTimestamp(data.timestamp);
                setShowRecentSubmissions(false);

                alert('Loaded for editing. You can modify and re-submit.');
            }
        } catch (error) {
            console.error('Error loading attendance for edit:', error);
            alert('Failed to load attendance record.');
        }
    };

    const cancelEdit = () => {
        setIsEditMode(false);
        setEditingDocId(null);
        setEditingTimestamp(null);
        setAttendance({});
    };

    // derived list of students based on filters
    const filteredStudents = useMemo(() => {
        const allStudents = Object.entries(studentData as Record<string, string>);

        const mapped = allStudents
            .map(([regNo, name]) => {
                const { data: info, calculatedYear, entryType } = detectBranchInfo(regNo);
                return {
                    regNo,
                    name,
                    branch: info?.branch,
                    year: calculatedYear,
                    entryType
                };
            })
            .filter(student =>
                student.branch === selectedBranch &&
                student.year === selectedYear
            )
            .sort((a, b) => a.regNo.localeCompare(b.regNo));
        return mapped;
    }, [selectedBranch, selectedYear, selectedSection]);

    const handleMark = (regNo: string, status: 'Present' | 'Absent') => {
        setAttendance(prev => ({
            ...prev,
            [regNo]: status
        }));
    };

    const markAll = (status: 'Present' | 'Absent') => {
        const newAttendance = { ...attendance };
        filteredStudents.forEach(s => {
            newAttendance[s.regNo] = status;
        });
        setAttendance(newAttendance);
    };

    const handleSubmitClick = () => {
        // Identify unmarked students
        const unmarked = filteredStudents.filter(s => !attendance[s.regNo]);

        if (unmarked.length > 0) {
            setUnmarkedStudents(unmarked);
            setShowConfirmModal(true);
        } else {
            // All marked, proceed directly (defaulting nothing as none are left, strictly speaking)
            // But we pass 'Present' just in case or null
            finalizeSubmission();
        }
    };

    const finalizeSubmission = async (defaultForUnmarked: 'Present' | 'Absent' = 'Present') => {
        if (!currentUser) return;

        // Check edit permission if in edit mode
        if (isEditMode && editingTimestamp && !canEdit(editingTimestamp)) {
            alert('This attendance record is older than 2 hours and can no longer be edited.');
            return;
        }

        setIsSubmitting(true);
        setShowConfirmModal(false);

        try {
            const finalRecords: Record<string, string> = {};
            let presentCount = 0;
            let absentCount = 0;

            filteredStudents.forEach(s => {
                const status = attendance[s.regNo] || defaultForUnmarked;
                finalRecords[s.regNo] = status;
                if (status === 'Present') presentCount++;
                else absentCount++;
            });

            const docId = `${attendanceDate}_${selectedBranch}_${selectedYear}_${selectedSection}`;
            const attendanceRef = doc(db, 'attendance', docId);

            // Save to Firestore
            await setDoc(attendanceRef, {
                date: attendanceDate,
                branch: selectedBranch,
                year: selectedYear,
                section: selectedSection,
                facultyId: currentUser.uid || 'unknown',
                facultyName: currentUser.name || 'Faculty',
                records: finalRecords,
                stats: {
                    total: filteredStudents.length,
                    present: presentCount,
                    absent: absentCount
                },
                timestamp: serverTimestamp(),
                lastModified: isEditMode ? serverTimestamp() : null
            });

            // Create Log Entry (only for new submissions, not edits)
            if (!isEditMode) {
                const logMessage = `${selectedBranch} ${selectedYear === 1 ? '1st' : selectedYear === 2 ? '2nd' : selectedYear === 3 ? '3rd' : '4th'} Year Taken by ${currentUser.name}`;
                await addDoc(collection(db, 'logs'), {
                    message: logMessage,
                    type: 'attendance',
                    branch: selectedBranch,
                    year: selectedYear,
                    timestamp: serverTimestamp(),
                    facultyName: currentUser.name
                });
            }

            alert(isEditMode ? 'Attendance Updated Successfully!' : 'Attendance Submitted Successfully!');

            // Reset edit mode and reload recent submissions
            if (isEditMode) {
                cancelEdit();
            }
            loadRecentSubmissions();

        } catch (error) {
            console.error('Error submitting attendance:', error);
            alert('Failed to submit attendance.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 relative">
            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-amber-600">
                                <AlertTriangle className="w-8 h-8" />
                                <h3 className="text-xl font-bold">Unmarked Students</h3>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                You have <strong>{unmarkedStudents.length}</strong> students without a marked status.
                                How would you like to handle them?
                            </p>

                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-6 max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-700">
                                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                    {unmarkedStudents.slice(0, 5).map(s => (
                                        <li key={s.regNo} className="flex justify-between">
                                            <span className="font-mono text-gray-500">{s.regNo}</span>
                                            <span>{s.name}</span>
                                        </li>
                                    ))}
                                    {unmarkedStudents.length > 5 && (
                                        <li className="text-center text-xs text-gray-500 italic pt-2">
                                            + {unmarkedStudents.length - 5} more...
                                        </li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => finalizeSubmission('Present')}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserCheck className="w-4 h-4" />
                                    Mark Remaining as Present & Submit
                                </button>
                                <button
                                    onClick={() => finalizeSubmission('Absent')}
                                    className="w-full py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserX className="w-4 h-4" />
                                    Mark Remaining as Absent & Submit
                                </button>
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                >
                                    Cancel & Review
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserCheck className="w-6 h-6 md:w-8 md:h-8 text-primary-600" />
                        Mark Attendance
                    </h1>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-gray-500 w-full md:w-auto">
                        <span className="hidden sm:inline">Date:</span>
                        <input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            className="input-field py-2 px-3 w-full sm:w-auto"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="input-field"
                        disabled={isEditMode}
                    >
                        <option value="EEE">EEE</option>
                        <option value="ECE">ECE</option>
                        <option value="CSE">CSE</option>
                        <option value="IT">IT</option>
                        <option value="MECH">MECH</option>
                        <option value="CIVIL">CIVIL</option>
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="input-field"
                        disabled={isEditMode}
                    >
                        <option value={1}>1st Year</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                    </select>

                    <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="input-field"
                        disabled={isEditMode}
                    >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                    </select>
                </div>

                {/* Edit Mode Indicator */}
                {isEditMode && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700">
                            <Edit2 className="w-5 h-5" />
                            <span className="font-medium">Edit Mode Active</span>
                        </div>
                        <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm"
                        >
                            Cancel Edit
                        </button>
                    </div>
                )}

                {/* Recent Submissions Toggle */}
                {!isEditMode && (
                    <div className="mt-4">
                        <button
                            onClick={() => setShowRecentSubmissions(!showRecentSubmissions)}
                            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {showRecentSubmissions ? 'Hide' : 'Show'} Recent Submissions
                        </button>
                    </div>
                )}
            </div>

            {/* Recent Submissions Section */}
            {showRecentSubmissions && !isEditMode && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Recent Submissions (Last 24 Hours)</h3>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentSubmissions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No recent submissions found.
                            </div>
                        ) : (
                            recentSubmissions.map((submission) => {
                                const editable = canEdit(submission.timestamp);
                                const submittedTime = submission.timestamp?.toDate ? submission.timestamp.toDate() : new Date(submission.timestamp);
                                const timeAgo = Math.floor((new Date().getTime() - submittedTime.getTime()) / (1000 * 60));

                                return (
                                    <div key={submission.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        {submission.branch} - Year {submission.year} - Section {submission.section}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {submission.date}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <span>Present: {submission.stats?.present || 0}</span>
                                                    <span>Absent: {submission.stats?.absent || 0}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                {editable ? (
                                                    <button
                                                        onClick={() => loadAttendanceForEdit(submission.id)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Edit window expired</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Student List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-900/50">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                        Students ({filteredStudents.length})
                    </span>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => markAll('Present')}
                            className="flex-1 sm:flex-none px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-center"
                        >
                            Mark All Present
                        </button>
                        <button
                            onClick={() => markAll('Absent')}
                            className="flex-1 sm:flex-none px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-center"
                        >
                            Mark All Absent
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-medium text-sm">
                            <tr>
                                <th className="p-4 w-16">S.No</th>
                                <th className="p-4">Reg No</th>
                                <th className="p-4">Name</th>
                                <th className="p-4 hidden md:table-cell">Type</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        No students found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student, index) => {
                                    const status = attendance[student.regNo];
                                    return (
                                        <tr key={student.regNo} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="p-4 text-gray-400 text-sm">
                                                {index + 1}
                                            </td>
                                            <td className="p-4 font-mono text-gray-600 dark:text-gray-400">
                                                {student.regNo}
                                            </td>
                                            <td className="p-4 font-medium text-gray-900 dark:text-white">
                                                {student.name}
                                            </td>
                                            <td className="p-4 hidden md:table-cell text-sm text-gray-500">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.entryType === 'Lateral Entry'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {student.entryType || 'Regular'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleMark(student.regNo, 'Present')}
                                                        className={`p-2 rounded-lg transition-all ${status === 'Present'
                                                            ? 'bg-green-500 text-white shadow-md scale-105'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                                                            }`}
                                                    >
                                                        <UserCheck className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMark(student.regNo, 'Absent')}
                                                        className={`p-2 rounded-lg transition-all ${status === 'Absent'
                                                            ? 'bg-red-500 text-white shadow-md scale-105'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                                                            }`}
                                                    >
                                                        <UserX className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredStudents.length > 0 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                        <button
                            onClick={handleSubmitClick}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-medium transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-5 h-5" />
                            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Attendance' : 'Submit Attendance'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
