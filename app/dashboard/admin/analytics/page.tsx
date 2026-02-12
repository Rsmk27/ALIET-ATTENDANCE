'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import studentData from '@/data/students.json';
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
    Download,
    FileSpreadsheet,
    FileText,
    ChevronDown,
    Building2,
    LayoutDashboard,
    BarChart3,
    LogOut,
    Check
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AdminAnalyticsPage() {
    const { currentUser, signOut } = useAuth();
    const router = useRouter();

    // Filters - Institution Level (Multiple Branches)
    const BRANCHES = ['EEE', 'ECE', 'CSE', 'IT', 'MECH', 'CIVIL'];
    const [selectedBranches, setSelectedBranches] = useState<string[]>(BRANCHES); // All branches selected by default
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const [selectedYear, setSelectedYear] = useState(0); // 0 = All Years
    const [selectedSection, setSelectedSection] = useState('ALL');

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

    // Chart states
    const [selectedGraph, setSelectedGraph] = useState('pie');
    const chartRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await signOut();
            router.push('/login');
        }
    };

    // Handle branch selection
    const toggleBranch = (branch: string) => {
        setSelectedBranches(prev => {
            if (prev.includes(branch)) {
                return prev.filter(b => b !== branch);
            } else {
                return [...prev, branch];
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedBranches.length === BRANCHES.length) {
            setSelectedBranches([]);
        } else {
            setSelectedBranches(BRANCHES);
        }
    };

    // 1. Fetch all attendance documents
    const [attendanceDocs, setAttendanceDocs] = useState<any[]>([]);

    useEffect(() => {
        const fetchAttendance = async () => {
            setIsLoading(true);
            try {
                const attendanceRef = collection(db, 'attendance');
                const q = query(attendanceRef, orderBy('date', 'desc'));
                const snapshot = await getDocs(q);
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAttendanceDocs(docs);
            } catch (error) {
                console.error('Error fetching attendance:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttendance();
    }, []);

    // A. Filter attendance docs by date range and selected branches
    const filteredDocs = useMemo(() => {
        return attendanceDocs.filter(doc => {
            const docDate = doc.date;
            if (!docDate) return false;

            const inDateRange = (!startDate || docDate >= startDate) && (!endDate || docDate <= endDate);
            if (!inDateRange) return false;

            // Institution level: filter by multiple branches, year, section
            if (selectedBranches.length > 0 && !selectedBranches.includes(doc.branch)) return false;
            if (selectedYear !== 0 && doc.year !== selectedYear) return false;
            if (selectedSection !== 'ALL' && doc.section !== selectedSection) return false;

            return true;
        });
    }, [attendanceDocs, startDate, endDate, selectedBranches, selectedYear, selectedSection]);

    // 2. Filter students based on selected filters - Extract from attendance records
    const filteredStudents = useMemo(() => {
        const studentMap = new Map();
        const studentNames = studentData as Record<string, string>;

        filteredDocs.forEach(doc => {
            const records = doc.records || {};
            Object.keys(records).forEach(regNo => {
                if (!studentMap.has(regNo)) {
                    // Extract student info from attendance record
                    studentMap.set(regNo, {
                        regNo,
                        name: studentNames[regNo] || regNo, // Use name from students.json or fallback to regNo
                        branch: doc.branch,
                        year: doc.year,
                        section: doc.section
                    });
                }
            });
        });

        return Array.from(studentMap.values());
    }, [filteredDocs]);

    // 3. Helper: Calculate Stats for a given set of docs
    const calculateStats = (students: any[], docs: any[]) => {
        const totalClasses = docs.length;
        const statsMap = new Map();

        // Initialize with 0
        students.forEach(s => {
            statsMap.set(s.regNo, {
                name: s.name,
                regNo: s.regNo,
                branch: s.branch,
                year: s.year,
                section: s.section,
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

    // B. Global Student Stats (based on filtered docs and students)
    const globalStudentStats = useMemo(() => {
        return calculateStats(filteredStudents, filteredDocs);
    }, [filteredStudents, filteredDocs]);

    // C. Overall Percentage
    const overallPercent = useMemo(() => {
        if (globalStudentStats.length === 0) return 0;
        const totalPercent = globalStudentStats.reduce((sum: number, s: any) => sum + s.percent, 0);
        return Math.round(totalPercent / globalStudentStats.length);
    }, [globalStudentStats]);

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
                topic: record.topic || 'No Topic',
                branch: record.branch || 'N/A',
                year: record.year || 'N/A',
                section: record.section || 'N/A'
            };
        });
    }, [filteredDocs]);

    // E. Distribution Stats
    const distributionStats = useMemo(() => {
        const buckets = [
            { range: '90-100%', count: 0, fill: '#10b981' },
            { range: '80-89%', count: 0, fill: '#3b82f6' },
            { range: '70-79%', count: 0, fill: '#f59e0b' },
            { range: '60-69%', count: 0, fill: '#f97316' },
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

    // Branch-wise Summary
    const branchSummary = useMemo(() => {
        const summary: any = {};

        globalStudentStats.forEach((student: any) => {
            const branch = student.branch || 'Unknown';
            if (!summary[branch]) {
                summary[branch] = {
                    branch,
                    totalStudents: 0,
                    avgAttendance: 0,
                    totalPercent: 0
                };
            }
            summary[branch].totalStudents++;
            summary[branch].totalPercent += student.percent;
        });

        return Object.values(summary).map((s: any) => ({
            ...s,
            avgAttendance: s.totalStudents > 0 ? Math.round(s.totalPercent / s.totalStudents) : 0
        })).sort((a: any, b: any) => b.avgAttendance - a.avgAttendance);
    }, [globalStudentStats]);

    const handleDownloadReport = (type: 'pdf' | 'excel' | 'csv') => {
        const filterText = selectedBranches.length === BRANCHES.length
            ? 'All Branches'
            : selectedBranches.length === 0
                ? 'No Branches'
                : selectedBranches.length <= 3
                    ? selectedBranches.join(', ')
                    : `${selectedBranches.length} Branches`;
        const yearText = selectedYear === 0 ? 'All Years' : `${selectedYear}${selectedYear === 1 ? 'st' : selectedYear === 2 ? 'nd' : selectedYear === 3 ? 'rd' : 'th'} Year`;
        const sectionText = selectedSection === 'ALL' ? 'All Sections' : `Section ${selectedSection}`;

        const fileName = `ALIET_Attendance_Report_${filterText.replace(/,\s/g, '_')}_${yearText}_${formatDate(startDate)}_to_${formatDate(endDate)}`;

        if (type === 'excel') {
            // Create worksheet with custom headers for Excel
            const headerInfo = [
                ["ALIET Institution-Level Attendance Report"],
                [`Branch: ${filterText} | Year: ${yearText} | Section: ${sectionText}`],
                [`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`],
                [`Downloaded: ${new Date().toLocaleString()}`],
                [] // Spacer
            ];

            const tableHeaders = ["S.No", "Reg No", "Name", "Branch", "Year", "Section", "Classes Attended", "Total Classes", "Percentage"];

            const tableBody = globalStudentStats.map((s: any, i: number) => [
                i + 1,
                s.regNo,
                s.name,
                s.branch,
                s.year,
                s.section,
                s.present,
                s.total,
                s.percent + '%'
            ]);

            const wsData = [...headerInfo, tableHeaders, ...tableBody];
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Merge title cells for better look
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }); // Merge Title
            ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }); // Merge Branch Info
            ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }); // Merge Date Range

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance");
            XLSX.writeFile(wb, `${fileName}.xlsx`);

        } else if (type === 'csv') {
            const data = globalStudentStats.map((s: any, i: number) => ({
                'S.No': i + 1,
                'Reg No': s.regNo,
                'Name': s.name,
                'Branch': s.branch,
                'Year': s.year,
                'Section': s.section,
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
            doc.text("ALIET Institution Attendance Report", 14, 20);

            doc.setFontSize(12);
            doc.text(`Branch: ${filterText} | Year: ${yearText} | Section: ${sectionText}`, 14, 30);
            doc.text(`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 38);
            doc.text(`Downloaded: ${new Date().toLocaleString()}`, 14, 46);

            // Table
            autoTable(doc, {
                startY: 55,
                head: [['S.No', 'Reg No', 'Name', 'Branch', 'Yr', 'Sec', 'Present', 'Total', '%']],
                body: globalStudentStats.map((s: any, i: number) => [
                    i + 1, s.regNo, s.name, s.branch, s.year, s.section, s.present, s.total, `${s.percent}%`
                ]),
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235] }, // Blue header
                styles: { fontSize: 8 }
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
                        const filterText = selectedBranches.length === BRANCHES.length
                            ? 'All Branches'
                            : selectedBranches.length === 0
                                ? 'No Branches'
                                : selectedBranches.length <= 3
                                    ? selectedBranches.join(', ')
                                    : `${selectedBranches.length} Branches`;
                        const yearText = selectedYear === 0 ? 'All Years' : `${selectedYear}${selectedYear === 1 ? 'st' : selectedYear === 2 ? 'nd' : selectedYear === 3 ? 'rd' : 'th'} Year`;
                        const rangeText = startDate || endDate ? ` (${formatDate(startDate) || 'Start'} to ${formatDate(endDate) || 'End'})` : '';
                        footer.innerText = `ALIET - ${filterText} - ${yearText}${rangeText}`;
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
        <ProtectedRoute allowedRoles={['admin']}>
            <div className="min-h-screen bg-gray-50">
                {/* Navigation Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                                <nav className="flex items-center gap-2">
                                    <button
                                        onClick={() => router.push('/dashboard/admin')}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        Dashboard
                                    </button>
                                    <button
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg"
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        Analytics
                                    </button>
                                </nav>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6 max-w-7xl mx-auto space-y-6">
                    {/* Header & Filters */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <Building2 className="w-8 h-8 text-primary-600" />
                                    Institution-Level Analytics
                                </h1>
                                <p className="text-gray-500 text-sm mt-1">Comprehensive attendance insights across all departments.</p>
                            </div>

                            {/* Filter Controls */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                                    {/* Multi-Select Branch Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                                            className="input-field py-2 text-sm w-full flex items-center justify-between"
                                        >
                                            <span className="truncate">
                                                {selectedBranches.length === BRANCHES.length
                                                    ? 'All Branches'
                                                    : selectedBranches.length === 0
                                                        ? 'No Branches'
                                                        : `${selectedBranches.length} Branch${selectedBranches.length > 1 ? 'es' : ''}`
                                                }
                                            </span>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showBranchDropdown && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setShowBranchDropdown(false)}
                                                />
                                                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
                                                    <div className="p-2">
                                                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedBranches.length === BRANCHES.length}
                                                                onChange={toggleSelectAll}
                                                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                            />
                                                            <span className="text-sm font-medium text-gray-900">Select All</span>
                                                        </label>
                                                        <div className="border-t border-gray-200 my-1" />
                                                        {BRANCHES.map(branch => (
                                                            <label key={branch} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedBranches.includes(branch)}
                                                                    onChange={() => toggleBranch(branch)}
                                                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                                />
                                                                <span className="text-sm text-gray-700">{branch}</span>
                                                                {selectedBranches.includes(branch) && (
                                                                    <Check className="w-4 h-4 text-primary-600 ml-auto" />
                                                                )}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        className="input-field py-2 text-sm w-full"
                                    >
                                        <option value={0}>All Years</option>
                                        {[1, 2, 3, 4].map(y => (
                                            <option key={y} value={y}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Year</option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedSection}
                                        onChange={(e) => setSelectedSection(e.target.value)}
                                        className="input-field py-2 text-sm w-full"
                                    >
                                        <option value="ALL">All Sections</option>
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100 rounded-md">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="text-sm font-medium text-blue-800">Total Classes</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-900">{filteredDocs.length}</p>
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
                                        <Users className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <span className="text-sm font-medium text-purple-800">Total Students</span>
                                </div>
                                <p className="text-2xl font-bold text-purple-900">{globalStudentStats.length}</p>
                            </div>

                            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-orange-100 rounded-md">
                                        <ArrowUpRight className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <span className="text-sm font-medium text-orange-800">Avg. Students/Class</span>
                                </div>
                                <p className="text-2xl font-bold text-orange-900">
                                    {filteredDocs.length > 0
                                        ? Math.round(dailyStats.reduce((acc, curr) => acc + curr.present, 0) / filteredDocs.length)
                                        : 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Main Chart */}
                        <div id="chart-container" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200" ref={chartRef}>
                            <div id="chart-controls" className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold text-gray-800">
                                    {selectedGraph === 'pie' ? 'Attendance Distribution (Pie)' :
                                        selectedGraph === 'trend' ? 'Attendance Trend' :
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
                                                                <p className="font-bold text-gray-900">{formatDate(label)}</p>
                                                                <p className="text-blue-600 font-semibold">
                                                                    Attendance: {data.percent}%
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    ({data.present}/{data.total} Students)
                                                                </p>
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    {data.branch} - {data.year} Year - Sec {data.section}
                                                                </p>
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
                                                                <p className="font-bold text-gray-900">{formatDate(label)}</p>
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

                        {/* Branch-wise Summary */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <h3 className="font-semibold text-gray-800 mb-4">Branch-wise Summary</h3>
                            <div className="overflow-y-auto max-h-[300px]">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Students</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {branchSummary.length === 0 ? (
                                            <tr><td colSpan={3} className="p-4 text-center text-sm text-gray-500">No data available</td></tr>
                                        ) : (
                                            branchSummary.map((b: any) => (
                                                <tr key={b.branch}>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{b.branch}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{b.totalStudents}</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-right">
                                                        <span className={`${b.avgAttendance >= 75 ? 'text-green-600' : b.avgAttendance >= 65 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                            {b.avgAttendance}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Low Attendance Alert */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <h3 className="font-semibold text-gray-800 mb-4 text-red-600">Low Attendance Alert (&lt; 65%)</h3>
                        <div className="overflow-y-auto max-h-[300px]">
                            <table className="min-w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reg No</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Year</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {globalStudentStats.filter((s: any) => s.percent < 65).length === 0 ? (
                                        <tr><td colSpan={5} className="p-4 text-center text-sm text-gray-500">No students below 65%</td></tr>
                                    ) : (
                                        globalStudentStats.filter((s: any) => s.percent < 65).map((s: any) => (
                                            <tr key={s.regNo}>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-600">{s.regNo}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-[150px]">{s.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{s.branch}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600 text-center">{s.year}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">{s.percent}%</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
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
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Branch</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Year</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Section</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.branch}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{student.year}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{student.section}</td>
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
            </div>
        </ProtectedRoute>
    );
}
