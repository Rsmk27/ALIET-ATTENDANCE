'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import studentData from '@/data/students.json';
import { detectBranchInfo } from '@/utils/branchDetector';
import { Save, LayoutList, Plus, Trash2, Edit2, AlertCircle, CheckCircle, Loader2, FileDown, FileSpreadsheet } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// Export Libraries
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const EXAM_TYPES = [
    'Mid-1',
    'Mid-2',
    'Semester'
];

interface Subject {
    id: string;
    name: string;
}

// Map: regNo -> subjectId -> { exam, assignment }
type MarksData = Record<string, Record<string, { exam: string, assignment: string, total?: number }>>;

export default function MarksEntryPage() {
    const { currentUser } = useAuth();

    // Selection Filters
    const [selectedBranch, setSelectedBranch] = useState(currentUser?.department || 'EEE');
    const [selectedYear, setSelectedYear] = useState(2);
    const [selectedSection, setSelectedSection] = useState('A');
    const [selectedExamType, setSelectedExamType] = useState('Mid-1');

    // State for Subjects
    const [subjects, setSubjects] = useState<Subject[]>([
        { id: 'sub_1', name: 'Subject 1' }
    ]);

    // State for Marks
    const [marksData, setMarksData] = useState<MarksData>({});
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

    // UI State for Editing Subjects
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [tempSubjectName, setTempSubjectName] = useState('');

    // Load user department on mount
    useEffect(() => {
        if (currentUser?.department) {
            setSelectedBranch(currentUser.department);
        }
    }, [currentUser]);

    // Derived Student List
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
    }, [selectedBranch, selectedYear]);

    // Load existing marks and subjects configuration
    useEffect(() => {
        const fetchExistingData = async () => {
            // 1. Fetch persistent Subjects for the Branch & Year (Applies to Entire Semester/Year)
            const classConfigId = `${selectedBranch}_${selectedYear}`;
            let loadedSubjects: Subject[] = [];

            try {
                const configRef = doc(db, 'class_subjects', classConfigId);
                const configSnap = await getDoc(configRef);
                if (configSnap.exists() && configSnap.data().subjects) {
                    loadedSubjects = configSnap.data().subjects;
                } else {
                    loadedSubjects = [{ id: 'sub_1', name: 'Subject 1' }];
                }
                setSubjects(loadedSubjects);
            } catch (error) {
                console.error("Error fetching class subjects:", error);
                setSubjects([{ id: 'sub_1', name: 'Subject 1' }]);
            }

            // 2. Fetch Marks for specific Section & Exam Type
            const docId = `${selectedExamType}_${selectedBranch}_${selectedYear}_${selectedSection}`.replace(/\s+/g, '_');

            try {
                const docRef = doc(db, 'marks_class_consolidated', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setMarksData(data.marks || {});
                } else {
                    setMarksData({});
                }
                setSaveStatus('saved');
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchExistingData();
    }, [selectedExamType, selectedBranch, selectedYear, selectedSection]);


    // Subject Management Handlers
    const saveSubjectsToConfig = async (newSubjects: Subject[]) => {
        const classConfigId = `${selectedBranch}_${selectedYear}`;
        try {
            await setDoc(doc(db, 'class_subjects', classConfigId), {
                subjects: newSubjects,
                lastUpdated: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Failed to auto-save subjects", error);
        }
    };

    const addSubject = () => {
        const newId = `sub_${Date.now()}`;
        const newSubjects = [...subjects, { id: newId, name: 'New Subject' }];
        setSubjects(newSubjects);
        setEditingSubjectId(newId);
        setTempSubjectName('New Subject');
        saveSubjectsToConfig(newSubjects);
    };

    const removeSubject = (id: string) => {
        if (confirm('Are you sure? This will hide marks column for this subject, but data is preserved until you save.')) {
            const newSubjects = subjects.filter(s => s.id !== id);
            setSubjects(newSubjects);
            saveSubjectsToConfig(newSubjects);
        }
    };

    const startEditingSubject = (subject: Subject) => {
        setEditingSubjectId(subject.id);
        setTempSubjectName(subject.name);
    };

    const saveSubjectName = () => {
        if (editingSubjectId && tempSubjectName.trim()) {
            const newSubjects = subjects.map(s =>
                s.id === editingSubjectId ? { ...s, name: tempSubjectName.trim() } : s
            );
            setSubjects(newSubjects);
            setEditingSubjectId(null);
            saveSubjectsToConfig(newSubjects);
        }
    };


    // Core Save Function
    const performSave = useCallback(async (currentMarks: MarksData) => {
        if (!currentUser) return;
        setSaveStatus('saving');

        try {
            const docId = `${selectedExamType}_${selectedBranch}_${selectedYear}_${selectedSection}`.replace(/\s+/g, '_');
            const docRef = doc(db, 'marks_class_consolidated', docId);

            const payLoad = {
                examType: selectedExamType,
                branch: selectedBranch,
                year: selectedYear,
                section: selectedSection,
                facultyId: currentUser.uid,
                facultyName: currentUser.name || 'Faculty',
                subjects: subjects,
                marks: currentMarks,
                timestamp: serverTimestamp(),
                lastModified: serverTimestamp()
            };

            await setDoc(docRef, payLoad);

            setSaveStatus('saved');
            setLastSavedTime(new Date());

        } catch (error) {
            console.error('Error submitting marks:', error);
            setSaveStatus('unsaved');
        }
    }, [currentUser, selectedExamType, selectedBranch, selectedYear, selectedSection, subjects]);


    // Auto-Save Effect
    useEffect(() => {
        if (saveStatus === 'unsaved') {
            const timer = setTimeout(() => {
                performSave(marksData);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [saveStatus, marksData, performSave]);


    // Marks Entry Handler
    const handleScoreChange = (regNo: string, subjectId: string, field: 'exam' | 'assignment', value: string) => {
        if (value === '') {
            updateMarksState(regNo, subjectId, field, '');
            return;
        }

        if (!/^\d+$/.test(value)) return;

        const numValue = parseInt(value);
        const maxLimit = field === 'exam' ? 15 : 5;

        if (numValue > maxLimit) return;

        updateMarksState(regNo, subjectId, field, value);
    };

    const updateMarksState = (regNo: string, subjectId: string, field: 'exam' | 'assignment', value: string) => {
        setMarksData(prev => {
            const studentRecord = prev[regNo] || {};
            const subjectRecord = studentRecord[subjectId] || { exam: '', assignment: '' };

            const updatedSubjectRecord = {
                ...subjectRecord,
                [field]: value
            };

            const exam = parseInt(updatedSubjectRecord.exam || '0') || 0;
            const assign = parseInt(updatedSubjectRecord.assignment || '0') || 0;
            const total = exam + assign;

            const finalSubjectRecord = {
                ...updatedSubjectRecord,
                total: total
            };

            return {
                ...prev,
                [regNo]: {
                    ...studentRecord,
                    [subjectId]: finalSubjectRecord
                }
            };
        });
        setSaveStatus('unsaved');
    };

    // Calculate Grand Total for a student
    const getGrandTotal = (regNo: string) => {
        const studentMarks = marksData[regNo] || {};
        let grandTotal = 0;
        let hasAnyMarks = false;

        subjects.forEach(subject => {
            const record = studentMarks[subject.id];
            if (record) {
                const total = record.total || 0;
                grandTotal += total;
                if (record.exam !== '' || record.assignment !== '') hasAnyMarks = true;
            }
        });

        return { total: grandTotal, hasAnyMarks };
    };

    // Download PDF Function
    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        doc.text(`Marks Report - ${selectedBranch} ${selectedYear} Year - ${selectedExamType}`, 14, 15);

        const head = [
            [
                { content: 'S.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'Reg No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                ...subjects.map(s => ({ content: s.name, colSpan: 3, styles: { halign: 'center' } })),
                { content: `Grand Total\n(Max: ${subjects.length * 20})`, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
            ],
            [
                ...subjects.flatMap(() => ['Ex(15)', 'As(5)', 'Tot'])
            ]
        ];

        const body = filteredStudents.map((student, index) => {
            const rowData: (string | number)[] = [
                index + 1,
                student.regNo,
                student.name
            ];

            subjects.forEach(subject => {
                const scores = marksData[student.regNo]?.[subject.id] || { exam: '', assignment: '' };
                const exam = scores.exam || '-';
                const assign = scores.assignment || '-';
                const total = (parseInt(scores.exam || '0') || 0) + (parseInt(scores.assignment || '0') || 0);
                const hasScore = scores.exam || scores.assignment;

                rowData.push(exam);
                rowData.push(assign);
                rowData.push(hasScore ? total : '-');
            });

            const { total: gTotal, hasAnyMarks } = getGrandTotal(student.regNo);
            rowData.push(hasAnyMarks ? gTotal : '-');

            return rowData;
        });

        autoTable(doc, {
            head: head as any,
            body: body,
            startY: 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fillColor: [66, 66, 66] }
        });

        doc.save(`Marks_${selectedBranch}_${selectedYear}_${selectedExamType}.pdf`);
    };

    // Download Excel Function
    const handleDownloadExcel = () => {
        const wsData: any[][] = [];

        // Row 1: Headers
        const headerRow1 = ['S.No', 'Reg No', 'Name'];
        subjects.forEach(s => {
            headerRow1.push(s.name);
            headerRow1.push('');
            headerRow1.push('');
        });
        headerRow1.push(`Grand Total (Max: ${subjects.length * 20})`);
        wsData.push(headerRow1);

        // Row 2: Sub-headers
        const headerRow2 = ['', '', ''];
        subjects.forEach(() => {
            headerRow2.push('Exam (15)');
            headerRow2.push('Assign (5)');
            headerRow2.push('Total (20)');
        });
        headerRow2.push('');
        wsData.push(headerRow2);

        // Data Rows
        filteredStudents.forEach((student, index) => {
            const row: any[] = [
                index + 1,
                student.regNo,
                student.name
            ];

            subjects.forEach(subject => {
                const scores = marksData[student.regNo]?.[subject.id] || { exam: '', assignment: '' };
                const exam = scores.exam ? parseInt(scores.exam) : '';
                const assign = scores.assignment ? parseInt(scores.assignment) : '';
                const total = (parseInt(scores.exam || '0') || 0) + (parseInt(scores.assignment || '0') || 0);
                const hasScore = scores.exam || scores.assignment;

                row.push(exam);
                row.push(assign);
                row.push(hasScore ? total : '');
            });

            const { total: gTotal, hasAnyMarks } = getGrandTotal(student.regNo);
            row.push(hasAnyMarks ? gTotal : '');

            wsData.push(row);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Merges
        const merges: XLSX.Range[] = [
            { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // S.No
            { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Reg No
            { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // Name
        ];

        let colIdx = 3;
        subjects.forEach(() => {
            merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 2 } });
            colIdx += 3;
        });

        // Merge Grand Total
        merges.push({ s: { r: 0, c: colIdx }, e: { r: 1, c: colIdx } });

        ws['!merges'] = merges;

        XLSX.utils.book_append_sheet(wb, ws, "Marks");
        XLSX.writeFile(wb, `Marks_${selectedBranch}_${selectedYear}_${selectedExamType}.xlsx`);
    };

    return (
        <div className="p-2 md:p-4 max-w-[100vw] mx-auto space-y-4 overflow-x-hidden">
            <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
                    <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <LayoutList className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                        Class Marks Entry
                    </h1>
                    {/* Auto Save Status Indicator */}
                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-700/50 text-[10px] md:text-xs font-medium">
                        {saveStatus === 'saved' && (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Saved
                            </span>
                        )}
                        {saveStatus === 'saving' && (
                            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                            </span>
                        )}
                        {saveStatus === 'unsaved' && (
                            <span className="text-orange-500 flex items-center gap-1">
                                Unsaved...
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                    {/* Standard filters - Compact */}
                    <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Branch</label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="input-field w-full text-xs py-1.5 px-2 h-8"
                        >
                            <option value="EEE">EEE</option>
                            <option value="ECE">ECE</option>
                            <option value="CSE">CSE</option>
                            <option value="IT">IT</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                        </select>
                    </div>

                    <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="input-field w-full text-xs py-1.5 px-2 h-8"
                        >
                            <option value={1}>1st Year</option>
                            <option value={2}>2nd Year</option>
                            <option value={3}>3rd Year</option>
                            <option value={4}>4th Year</option>
                        </select>
                    </div>

                    <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Section</label>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="input-field w-full text-xs py-1.5 px-2 h-8"
                        >
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                            <option value="C">Section C</option>
                        </select>
                    </div>

                    <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Exam Cycle</label>
                        <select
                            value={selectedExamType}
                            onChange={(e) => setSelectedExamType(e.target.value)}
                            className="input-field w-full text-xs font-bold text-indigo-600 py-1.5 px-2 h-8"
                        >
                            {EXAM_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Subject Manager - Compact */}
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                            Subjects
                        </label>
                        <button
                            onClick={addSubject}
                            className="text-[10px] flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-medium transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {subjects.map(subject => (
                            <div key={subject.id} className="group relative flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                {editingSubjectId === subject.id ? (
                                    <input
                                        type="text"
                                        autoFocus
                                        value={tempSubjectName}
                                        onChange={(e) => setTempSubjectName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && saveSubjectName()}
                                        onBlur={saveSubjectName}
                                        className="w-24 px-1 py-0.5 text-xs border-blue-400 rounded focus:ring-0 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                ) : (
                                    <span
                                        onClick={() => startEditingSubject(subject)}
                                        className="text-xs font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:text-indigo-600 truncate max-w-[100px]"
                                        title={subject.name}
                                    >
                                        {subject.name}
                                    </span>
                                )}

                                <button
                                    onClick={() => removeSubject(subject.id)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Marks Table - ULTRA COMPACT */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                    <span className="font-semibold text-xs text-gray-700 dark:text-gray-200">
                        Students ({filteredStudents.length})
                    </span>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            className="text-[10px] flex items-center gap-1 text-red-600 hover:text-red-800 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded font-medium disabled:opacity-50"
                            disabled={filteredStudents.length === 0}
                        >
                            <FileDown className="w-3 h-3" /> PDF
                        </button>
                        <button
                            onClick={handleDownloadExcel}
                            className="text-[10px] flex items-center gap-1 text-green-600 hover:text-green-800 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded font-medium disabled:opacity-50"
                            disabled={filteredStudents.length === 0}
                        >
                            <FileSpreadsheet className="w-3 h-3" /> Excel
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto relative scrollbar-hide max-h-[70vh]">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            {/* Top Header Row */}
                            <tr className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-8 text-[10px] sticky top-0 z-30 shadow-sm">
                                <th className="p-1 w-8 bg-gray-100 dark:bg-gray-900 sticky left-0 z-50 border-r border-gray-200 dark:border-gray-700 font-semibold text-gray-600 dark:text-gray-300 text-center">
                                    #
                                </th>
                                <th className="p-1 w-20 bg-gray-100 dark:bg-gray-900 sticky left-8 z-50 border-r border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">
                                    Reg No
                                </th>
                                <th className="p-1 min-w-[100px] bg-gray-100 dark:bg-gray-900 sticky left-28 z-50 border-r border-gray-200 dark:border-gray-700 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] font-semibold text-gray-700 dark:text-gray-200">
                                    Name
                                </th>

                                {subjects.map(subject => (
                                    <th
                                        key={subject.id}
                                        colSpan={3}
                                        className="p-0.5 text-center border-r border-gray-300 dark:border-gray-600 bg-indigo-50/30 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors cursor-default"
                                    >
                                        <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center justify-center truncate px-0.5 max-w-[120px] mx-auto" title={subject.name}>
                                            {subject.name}
                                        </div>
                                    </th>
                                ))}

                                <th rowSpan={2} className="p-1 min-w-[50px] text-center border-l bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 font-bold text-indigo-700 dark:text-indigo-400">
                                    <div className="flex flex-col items-center">
                                        <span className="leading-tight">Grand Total</span>
                                        <span className="text-[8px] font-medium opacity-70">Max: {subjects.length * 20}</span>
                                    </div>
                                </th>
                            </tr>

                            {/* Sub Header Row */}
                            <tr className="bg-gray-50 dark:bg-gray-800 text-[9px] text-gray-500 border-b border-gray-200 dark:border-gray-700 h-6 sticky top-8 z-30 shadow-sm transition-colors">
                                <th className="bg-gray-50 dark:bg-gray-800 sticky left-0 z-50 border-r border-gray-200 dark:border-gray-700"></th>
                                <th className="bg-gray-50 dark:bg-gray-800 sticky left-8 z-50 border-r border-gray-200 dark:border-gray-700"></th>
                                <th className="bg-gray-50 dark:bg-gray-800 sticky left-28 z-50 border-r border-gray-200 dark:border-gray-700 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]"></th>

                                {subjects.map(subject => (
                                    <>
                                        <th key={`${subject.id}-mid`} className="p-0.5 text-center border-r border-gray-200 dark:border-gray-700 min-w-[35px] bg-gray-50 dark:bg-gray-800">
                                            Ex(15)
                                        </th>
                                        <th key={`${subject.id}-ass`} className="p-0.5 text-center border-r border-gray-200 dark:border-gray-700 min-w-[35px] bg-blue-50/50 dark:bg-blue-900/20">
                                            As(5)
                                        </th>
                                        <th key={`${subject.id}-tot`} className="p-0.5 text-center border-r border-gray-300 dark:border-gray-600 font-bold min-w-[30px] bg-gray-50 dark:bg-gray-800">
                                            Tot
                                        </th>
                                    </>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-[11px] text-gray-700 dark:text-gray-300">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={4 + subjects.length * 3} className="p-4 text-center text-gray-400 text-xs">
                                        No students found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student, index) => {
                                    const { total: grandTotal, hasAnyMarks } = getGrandTotal(student.regNo);

                                    return (
                                        <tr key={student.regNo} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors h-8">
                                            {/* Fixed Columns */}
                                            <td className="p-1 text-center text-gray-500 font-mono sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-100 dark:border-gray-700">
                                                {index + 1}
                                            </td>
                                            <td className="p-1 font-mono sticky left-8 bg-white dark:bg-gray-800 z-10 border-r border-gray-100 dark:border-gray-700">
                                                <span className="hidden md:inline">{student.regNo}</span>
                                                <span className="md:hidden">{student.regNo.slice(-3)}</span>
                                            </td>
                                            <td className="p-1 font-medium text-gray-900 dark:text-white sticky left-28 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                                <div className="truncate w-24 md:w-36" title={student.name}>
                                                    {student.name}
                                                </div>
                                            </td>

                                            {/* Dynamic Subject Columns */}
                                            {subjects.map(subject => {
                                                const scores = marksData[student.regNo]?.[subject.id] || { exam: '', assignment: '' };
                                                const hasScore = scores.exam || scores.assignment;
                                                const total = (parseInt(scores.exam || '0') || 0) + (parseInt(scores.assignment || '0') || 0);

                                                return (
                                                    <>
                                                        <td key={`${subject.id}-ex-cell`} className="p-0.5 text-center border-r border-gray-100 dark:border-gray-700">
                                                            <input
                                                                type="text"
                                                                value={scores.exam}
                                                                onChange={(e) => handleScoreChange(student.regNo, subject.id, 'exam', e.target.value)}
                                                                className="w-8 px-0.5 py-0.5 text-center text-[10px] border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                        <td key={`${subject.id}-as-cell`} className="p-0.5 text-center border-r border-gray-100 dark:border-gray-700 bg-blue-50/20 dark:bg-blue-900/10">
                                                            <input
                                                                type="text"
                                                                value={scores.assignment}
                                                                onChange={(e) => handleScoreChange(student.regNo, subject.id, 'assignment', e.target.value)}
                                                                className="w-8 px-0.5 py-0.5 text-center text-[10px] border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                        <td key={`${subject.id}-tot-cell`} className={`p-0.5 text-center border-r border-gray-300 font-bold text-gray-800 dark:text-gray-200 text-[10px] ${hasScore ? '' : 'text-gray-200'}`}>
                                                            {hasScore ? total : '-'}
                                                        </td>
                                                    </>
                                                );
                                            })}

                                            {/* Grand Total Column */}
                                            <td className="p-1 text-center font-bold text-indigo-600 dark:text-indigo-400 bg-gray-50/50 dark:bg-gray-900/30">
                                                {hasAnyMarks ? grandTotal : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
