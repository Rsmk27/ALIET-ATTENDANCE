'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
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
    Line,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import {
    Filter,
    Calendar,
    Users,
    TrendingUp,
    ArrowUpRight,
    Search,
    Download,
    FileSpreadsheet,
    FileText,
    ChevronDown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import html2canvas from 'html2canvas';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AnalyticsPage() {
    const { currentUser } = useAuth();

    // Filters
    const [selectedBranch, setSelectedBranch] = useState(currentUser?.department || 'EEE');
    const [selectedYear, setSelectedYear] = useState(2);
    const [selectedSection, setSelectedSection] = useState('A');

    // Get today's date in YYYY-MM-DD format
    const getTodayString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const [startDate, setStartDate] = useState(getTodayString());
    const [endDate, setEndDate] = useState(getTodayString());
    const [isLoading, setIsLoading] = useState(false);

    // Helper: Format date to dd-mm-yyyy
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
    };

    // Update default branch when currentUser loads
    useEffect(() => {
        if (currentUser?.department) {
            setSelectedBranch(currentUser.department);
        }
    }, [currentUser]);

    // Data State
    // Data State
    const [attendanceDocs, setAttendanceDocs] = useState<any[]>([]);
    const [overallPercent, setOverallPercent] = useState(0);

    // Graph Type State
    const [selectedGraph, setSelectedGraph] = useState('pie');
    const chartRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Attendance Data (Real-time)
    useEffect(() => {
        setIsLoading(true);

        const q = query(
            collection(db, 'attendance'),
            where('branch', '==', selectedBranch),
            where('year', '==', selectedYear),
            where('section', '==', selectedSection)
            // orderBy('date', 'asc') - Removed to avoid missing index issues
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => doc.data());
            // Client-side sorting
            docs.sort((a, b) => a.date.localeCompare(b.date));
            setAttendanceDocs(docs);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching analytics:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [selectedBranch, selectedYear, selectedSection]);

    // 3. Helper: Calculate Stats for a given set of docs
    const calculateStats = (students: any[], docs: any[]) => {
        const totalClasses = docs.length;
        const statsMap = new Map();

        // Initialize with 0
        students.forEach(s => {
            statsMap.set(s.regNo, {
                name: s.name,
                regNo: s.regNo,
                present: 0,
                total: totalClasses,
                percent: 0
            });
        });

        // Tally attendance
        docs.forEach(doc => {
            const records = doc.records || {};
            students.forEach(s => {
                const status = records[s.regNo];
                // Check for loose match or case sensitivity if exact match fails
                if (status === 'Present' || status === 'present' || status === true) {
                    const current = statsMap.get(s.regNo);
                    if (current) current.present++;
                }
            });
        });

        // Calculate Percentages
        return Array.from(statsMap.values()).map((s: any) => ({
            ...s,
            percent: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
        })).sort((a: any, b: any) => a.regNo.localeCompare(b.regNo));
    };

    // 4. Derived State (replacing the large useEffect)

    // A. Class Student List
    const classStudents = useMemo(() => {
        const allStudents = Object.entries(studentData as Record<string, string>);
        return allStudents
            .map(([regNo, name]) => {
                const { data: info, calculatedYear } = detectBranchInfo(regNo);
                return { regNo, name, branch: info?.branch, year: calculatedYear };
            })
            .filter(s => s.branch === selectedBranch && s.year === selectedYear);


    }, [selectedBranch, selectedYear]);

    // B. Filtered Docs based on Date Range
    const filteredDocs = useMemo(() => {
        let docs = attendanceDocs;
        if (startDate) {
            docs = docs.filter(d => d.date >= startDate);
        }
        if (endDate) {
            docs = docs.filter(d => d.date <= endDate);
        }
        return docs;
    }, [attendanceDocs, startDate, endDate]);

    // C. Global Stats (Filtered) - For Charts, Alerts & Reports
    const globalStudentStats = useMemo(() => {
        return calculateStats(classStudents, filteredDocs);
    }, [classStudents, filteredDocs]);

    // D. Daily Stats (for Charts)
    const dailyStats = useMemo(() => {
        return filteredDocs.map(record => {
            const records = record.records || {};
            const values = Object.values(records);

            // Recalculate from records if possible for accuracy
            let total = values.length;
            let present = values.filter((v: any) => v === 'Present' || v === 'present' || v === true).length;

            // Fallback to stored stats if records are empty (e.g. legacy data?)
            if (total === 0 && record.stats) {
                total = record.stats.total || 0;
                present = record.stats.present || 0;
            }

            if (total === 0) total = 1; // Prevent div by zero

            return {
                date: record.date,
                percent: Math.round((present / total) * 100),
                present,
                total,
                topic: record.topic || 'No Topic'
            };
        });
    }, [filteredDocs]);

    // D. Overall Percentage
    useEffect(() => {
        if (dailyStats.length === 0) {
            setOverallPercent(0);
            return;
        }
        const totalPossible = dailyStats.reduce((acc, curr) => acc + curr.total, 0);
        const totalPresent = dailyStats.reduce((acc, curr) => acc + curr.present, 0);
        setOverallPercent(totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0);
    }, [dailyStats]);

    // E. Removed local report stats, using globalStudentStats now


    // 5. Compute Distribution Stats (uses Global Stats)
    const distributionStats = useMemo(() => {
        const buckets = [
            { range: '90-100%', count: 0, fill: '#16a34a' },
            { range: '80-89%', count: 0, fill: '#22c55e' },
            { range: '70-79%', count: 0, fill: '#84cc16' },
            { range: '60-69%', count: 0, fill: '#facc15' },
            { range: '<60%', count: 0, fill: '#ef4444' }
        ];

        globalStudentStats.forEach((s: any) => {
            if (s.percent >= 90) buckets[0].count++;
            else if (s.percent >= 80) buckets[1].count++;
            else if (s.percent >= 70) buckets[2].count++;
            else if (s.percent >= 60) buckets[3].count++;
            else buckets[4].count++;
        });

        return buckets;
    }, [globalStudentStats]);




    const handleDownloadReport = (type: 'pdf' | 'excel' | 'csv') => {
        const fileName = `Attendance_Report_${selectedBranch}_${selectedYear}Year_${startDate}_to_${endDate}`;

        if (type === 'excel') {
            // Create worksheet with custom headers for Excel
            const headerInfo = [
                ["ALIET Attendance Report"],
                [`Branch: ${selectedBranch} | Year: ${selectedYear} | Section: ${selectedSection}`],
                [`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`],
                [`Downloaded: ${new Date().toLocaleString()}`],
                [] // Spacer
            ];

            const tableHeaders = ["S.No", "Reg No", "Name", "Classes Attended", "Total Classes", "Percentage"];

            const tableBody = globalStudentStats.map((s: any, i: number) => [
                i + 1,
                s.regNo,
                s.name,
                s.present,
                s.total,
                s.percent + '%'
            ]);

            const wsData = [...headerInfo, tableHeaders, ...tableBody];
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Optional: Merge title cells for better look (A1:F1, etc.)
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }); // Merge Title
            ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }); // Merge Branch Info
            ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }); // Merge Date Range

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance");
            XLSX.writeFile(wb, `${fileName}.xlsx`);

        } else if (type === 'csv') {
            const data = globalStudentStats.map((s: any, i: number) => ({
                'S.No': i + 1,
                'Reg No': s.regNo,
                'Name': s.name,
                'Classes Attended': s.present,
                'Total Classes': s.total,
                'Percentage': s.percent + '%'
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance");
            XLSX.writeFile(wb, `${fileName}.csv`);

        } else if (type === 'pdf') {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.text("ALIET Attendance Report", 14, 20);

            doc.setFontSize(12);
            doc.text(`Branch: ${selectedBranch} | Year: ${selectedYear} | Section: ${selectedSection}`, 14, 30);
            doc.text(`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 38);
            doc.text(`Downloaded: ${new Date().toLocaleString()}`, 14, 46);

            // Table
            autoTable(doc, {
                startY: 55,
                head: [['S.No', 'Reg No', 'Name', 'Present', 'Total', '%']],
                body: globalStudentStats.map((s: any, i: number) => [
                    i + 1, s.regNo, s.name, s.present, s.total, `${s.percent}%`
                ]),
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235] } // Blue header
            });

            doc.save(`${fileName}.pdf`);
        }
        setShowDownloadMenu(false);
    };

    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const handleDownloadGraph = async () => {
        if (!chartRef.current) return;

        try {
            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                onclone: (clonedDoc) => {
                    const clonedContainer = clonedDoc.getElementById('chart-container');
                    const controls = clonedDoc.getElementById('chart-controls');

                    if (controls) {
                        controls.style.display = 'none';
                    }

                    if (clonedContainer) {
                        // Add Header (Date & Time)
                        const header = clonedDoc.createElement('div');
                        header.innerText = `Downloaded: ${new Date().toLocaleString()}`;
                        header.style.textAlign = 'center';
                        header.style.marginBottom = '20px';
                        header.style.fontSize = '12px';
                        header.style.color = '#6b7280';
                        header.style.fontFamily = 'monospace';
                        clonedContainer.insertBefore(header, clonedContainer.firstChild);

                        const footer = clonedDoc.createElement('div');
                        const rangeText = startDate || endDate ? ` (${formatDate(startDate) || 'Start'} to ${formatDate(endDate) || 'End'})` : '';
                        footer.innerText = `#${selectedYear === 1 ? '1st' : selectedYear === 2 ? '2nd' : selectedYear === 3 ? '3rd' : '4th'} Year ${selectedBranch} Students${rangeText}`;
                        footer.style.textAlign = 'center';
                        footer.style.marginTop = '20px';
                        footer.style.fontSize = '16px';
                        footer.style.fontWeight = 'bold';
                        footer.style.color = '#374151';
                        clonedContainer.appendChild(footer);
                    }
                }
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `${selectedGraph}_chart_${new Date().toISOString().split('T')[0]}.png`;
            link.click();
        } catch (e) {
            console.error("Download failed", e);
        }
    };


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
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="input-field py-2 text-sm w-full"
                            >
                                {['EEE', 'ECE', 'CSE', 'IT', 'MECH', 'CIVIL'].map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="input-field py-2 text-sm w-full"
                            >
                                {[1, 2, 3, 4].map(y => (
                                    <option key={y} value={y}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Year</option>
                                ))}
                            </select>
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                className="input-field py-2 text-sm w-full"
                            >
                                {['A', 'B', 'C'].map(s => (
                                    <option key={s} value={s}>Section {s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-2 w-full sm:w-auto">
                            <span className="text-xs text-gray-500 font-medium uppercase whitespace-nowrap">Range:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-sm outline-none text-gray-700 min-w-0 flex-1 sm:w-32 bg-transparent"
                                placeholder="Start"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-sm outline-none text-gray-700 min-w-0 flex-1 sm:w-32 bg-transparent"
                                placeholder="End"
                            />
                        </div>
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
                <div id="chart-container" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200" ref={chartRef}>
                    <div id="chart-controls" className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-gray-800">
                            {selectedGraph === 'pie' ? 'Attendance Distribution (Pie)' :
                                selectedGraph === 'trend' ? 'Attendance Trend (Last 30 Days)' :
                                    selectedGraph === 'distribution' ? 'Student Performance Distribution' :
                                        'Daily Presence Count'}
                        </h3>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedGraph}
                                onChange={(e) => setSelectedGraph(e.target.value)}
                                className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                            >
                                <option value="pie">Pie Chart</option>
                                <option value="trend">Trend Line</option>
                                <option value="distribution">Distribution</option>
                                <option value="daily">Daily Count</option>
                            </select>
                            <button
                                onClick={handleDownloadGraph}
                                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                                title="Download Chart"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {selectedGraph === 'pie' ? (
                                <PieChart>
                                    <Pie
                                        data={distributionStats}
                                        dataKey="count"
                                        nameKey="range"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ range, count }) => count > 0 ? `${range}` : ''}
                                    >
                                        {distributionStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name: string) => [`${value} Students`, name]}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                </PieChart>
                            ) : selectedGraph === 'trend' ? (
                                <LineChart data={dailyStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(val) => formatDate(val).substring(0, 5)}
                                    />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                                                        <p className="font-bold text-gray-900">{label}</p>
                                                        <p className="text-blue-600 font-semibold">
                                                            Attendance: {data.percent}%
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            ({data.present}/{data.total} Students)
                                                        </p>
                                                        {data.topic && data.topic !== 'No Topic' && (
                                                            <div className="mt-2 pt-2 border-t border-gray-100">
                                                                <p className="text-xs font-semibold text-gray-700">Topic:</p>
                                                                <p className="text-xs text-gray-600 italic max-w-[200px] break-words">
                                                                    {data.topic}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
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
                            ) : selectedGraph === 'distribution' ? (
                                <BarChart data={distributionStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="count" name="Students" fill="#8884d8">
                                        {distributionStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <BarChart data={dailyStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(val) => formatDate(val).substring(0, 5)}
                                    />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                                                        <p className="font-bold text-gray-900">{label}</p>
                                                        <p className="text-green-600 font-semibold">
                                                            Present: {data.present}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Total Class Strength: {data.total}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="present" name="Students Present" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            )}
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
                                {globalStudentStats.filter((s: any) => s.percent < 65).length === 0 ? (
                                    <tr><td colSpan={3} className="p-4 text-center text-sm text-gray-500">No students below 65%</td></tr>
                                ) : (
                                    globalStudentStats.filter((s: any) => s.percent < 65).map((s: any) => (
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
                <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-semibold text-gray-800">Detailed Student Report</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                className="flex items-center gap-2 text-primary-600 text-sm font-medium hover:bg-primary-50 px-3 py-2 rounded-lg transition-colors border border-primary-100"
                            >
                                <Download className="w-4 h-4" />
                                Download Report
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            {showDownloadMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
                                    <button
                                        onClick={() => handleDownloadReport('pdf')}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4 text-red-500" />
                                        PDF Document
                                    </button>
                                    <button
                                        onClick={() => handleDownloadReport('excel')}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                        Excel (.xlsx)
                                    </button>
                                    <button
                                        onClick={() => handleDownloadReport('csv')}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                                        Google Sheets (.csv)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
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
                            {globalStudentStats.map((student: any, idx: number) => (
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
