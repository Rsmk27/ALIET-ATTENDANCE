
'use client';

import { useState, useMemo } from 'react';
import studentData from '@/data/students.json';
import { detectBranchInfo } from '@/utils/branchDetector';
import { UserCheck, UserX, Save, Filter } from 'lucide-react';

export default function AttendancePage() {
    // Selection Filters
    const [selectedBranch, setSelectedBranch] = useState('EEE'); // Default EEE as per uploaded data
    const [selectedYear, setSelectedYear] = useState(2);        // Default 2nd Year
    const [selectedSection, setSelectedSection] = useState('A');
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

    // Attendance State: Record<RegNo, Status> (Present/Absent)
    // Default to Present (true) or Empty? standard is Default Present.
    const [attendance, setAttendance] = useState<Record<string, 'Present' | 'Absent'>>({});

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
                    entryType // useful for display/filtering
                };
            })
            .filter(student =>
                student.branch === selectedBranch &&
                student.year === selectedYear
                // TODO: Add Section logic
            )
            .sort((a, b) => a.regNo.localeCompare(b.regNo));

        // Debugging: Log the composition of the filtered list
        console.group('Attendance Page Debug: Filtered List');
        console.log(`Filters: Branch=${selectedBranch}, Year=${selectedYear}, Section=${selectedSection}`);
        console.log(`Total Matches: ${mapped.length}`);
        console.log('Sample:', mapped.slice(0, 3));
        const regularCount = mapped.filter(s => s.entryType === 'Regular').length;
        const lateralCount = mapped.filter(s => s.entryType === 'Lateral Entry').length;
        console.log(`Composition: Regular=${regularCount}, Lateral=${lateralCount}`);
        console.groupEnd();

        return mapped;
    }, [selectedBranch, selectedYear, selectedSection]);

    // Initialize attendance for new filtered list
    // (Optional: preserve state if re-filtering)

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

    const handleSubmit = () => {
        console.log('Submitting Attendance:', {
            date: attendanceDate,
            branch: selectedBranch,
            year: selectedYear,
            section: selectedSection,
            records: attendance
        });
        alert('Attendance Submitted (Console Log)!');
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
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
                    >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                    </select>
                </div>
            </div>

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
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-medium transform active:scale-95"
                        >
                            <Save className="w-5 h-5" />
                            Submit Attendance
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
