'use client';

import { useState, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import studentData from '@/data/students.json';
import { detectBranchInfo } from '@/utils/branchDetector';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import {
    Filter,
    Calendar,
    Users,
    TrendingUp,
    ArrowUpRight,
    Search
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AnalyticsPage() {
    // Filters
    const [selectedBranch, setSelectedBranch] = useState('EEE');
    const [selectedYear, setSelectedYear] = useState(2);
    const [selectedSection, setSelectedSection] = useState('A');
    const [isLoading, setIsLoading] = useState(false);

    // Data State
    const [attendanceDocs, setAttendanceDocs] = useState<any[]>([]);
    const [studentStats, setStudentStats] = useState<any[]>([]);
    const [dailyStats, setDailyStats] = useState<any[]>([]);
    const [overallPercent, setOverallPercent] = useState(0);

    // 1. Fetch Attendance Data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const q = query(
                    collection(db, 'attendance'),
                    where('branch', '==', selectedBranch),
                    where('year', '==', selectedYear),
                    where('section', '==', selectedSection),
                    orderBy('date', 'asc') // Ensure chronological order
                );

                const snapshot = await getDocs(q);
                const docs = snapshot.docs.map(doc => doc.data());
                setAttendanceDocs(docs);

            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedBranch, selectedYear, selectedSection]);

    // 2. Process Data
    useEffect(() => {
        if (attendanceDocs.length === 0) {
            setStudentStats([]);
            setDailyStats([]);
            setOverallPercent(0);
            return;
        }

        // Daily Stats for Chart
        const daily = attendanceDocs.map(record => {
            const total = record.stats?.total || 1;
            const present = record.stats?.present || 0;
            return {
                date: record.date,
                percent: Math.round((present / total) * 100),
                present,
                total
            };
        });
        setDailyStats(daily);

        // Overall Class Percentage
        const totalClasses = attendanceDocs.length;
        const totalPossible = daily.reduce((acc, curr) => acc + curr.total, 0);
        const totalPresent = daily.reduce((acc, curr) => acc + curr.present, 0);
        setOverallPercent(totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0);


        // Per-Student Stats
        // Initialize map with all students in this class (from static JSON) 
        // to ensure we show everyone even if they missed all classes
        // reusing logic from AttendancePage to filter the static list
        const allStudents = Object.entries(studentData as Record<string, string>);
        const classStudents = allStudents
            .map(([regNo, name]) => {
                const { data: info, calculatedYear } = detectBranchInfo(regNo);
                return { regNo, name, branch: info?.branch, year: calculatedYear };
            })
            .filter(s => s.branch === selectedBranch && s.year === selectedYear);

        const statsMap = new Map();

        // Initialize with 0
        classStudents.forEach(s => {
            statsMap.set(s.regNo, {
                name: s.name,
                regNo: s.regNo,
                present: 0,
                total: totalClasses,
                percent: 0
            });
        });

        // Tally attendance
        attendanceDocs.forEach(doc => {
            const records = doc.records || {};
            // Iterate all students in the class list
            classStudents.forEach(s => {
                const status = records[s.regNo];
                const current = statsMap.get(s.regNo);

                // If record exists and is Present, increment
                if (status === 'Present') {
                    current.present++;
                }
                // If record is missing, it implies Absent or Not Marked? 
                // Usually we count it as 'total' classes held, so if they are not Present, they are Absent.
                // unless we want to handle "Not Enrolled at that time"? 
                // For simplicity, assume enrolled for all.
            });
        });

        // Calculate Percentages
        const finalStats = Array.from(statsMap.values()).map((s: any) => ({
            ...s,
            percent: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
        })).sort((a, b) => a.regNo.localeCompare(b.regNo));

        setStudentStats(finalStats);

    }, [attendanceDocs, selectedBranch, selectedYear]); // Recalculate if docs or class definition changes


    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            {/* Header & Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-primary-600" />
                            Attendance Analytics
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Visualize class performance and trends.</p>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="input-field py-2"
                        >
                            {['EEE', 'ECE', 'CSE', 'IT', 'MECH', 'CIVIL'].map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="input-field py-2"
                        >
                            {[1, 2, 3, 4].map(y => (
                                <option key={y} value={y}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Year</option>
                            ))}
                        </select>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="input-field py-2"
                        >
                            {['A', 'B', 'C'].map(s => (
                                <option key={s} value={s}>Section {s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-md">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-blue-800">Total Classes</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{attendanceDocs.length}</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-md">
                                <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-green-800">Overall Attendance</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{overallPercent}%</p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-md">
                                <ArrowUpRight className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-sm font-medium text-purple-800">Avg. Students/Class</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">
                            {attendanceDocs.length > 0
                                ? Math.round(dailyStats.reduce((acc, curr) => acc + curr.present, 0) / attendanceDocs.length)
                                : 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Daily Trend Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-6">Attendance Trend (Last 30 Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="percent"
                                    name="Attendance %"
                                    stroke="#2563eb"
                                    strokeWidth={2}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Low Attendance List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <h3 className="font-semibold text-gray-800 mb-4 text-red-600">Low Attendance Alert (&lt; 65%)</h3>
                    <div className="overflow-y-auto max-h-[300px]">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reg No</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {studentStats.filter(s => s.percent < 65).length === 0 ? (
                                    <tr><td colSpan={3} className="p-4 text-center text-sm text-gray-500">No students below 65%</td></tr>
                                ) : (
                                    studentStats.filter(s => s.percent < 65).map(s => (
                                        <tr key={s.regNo}>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-600">{s.regNo}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-[120px]">{s.name}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">{s.percent}%</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detailed Student List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">Detailed Student Report</h3>
                    <button className="text-primary-600 text-sm font-medium hover:underline">Download CSV</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">S.No</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reg No</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Classes Attended</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Percentage</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {studentStats.map((student, idx) => (
                                <tr key={student.regNo} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{student.regNo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                                        <span className="font-medium text-gray-900">{student.present}</span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span>{student.total}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.percent >= 75 ? 'bg-green-100 text-green-800' :
                                                student.percent >= 65 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {student.percent}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
