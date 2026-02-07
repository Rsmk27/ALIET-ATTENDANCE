import { Timestamp } from 'firebase/firestore';

// User roles
export type UserRole = 'student' | 'faculty' | 'hod' | 'admin';

// User profile
export interface User {
    uid: string;
    role: UserRole;
    email: string;
    name: string;
    // Role-specific fields
    registrationNumber?: string; // Student
    employeeId?: string; // Faculty/HOD/Admin
    mobileNumber?: string;
    emailId?: string; // Personal email ID
    department?: string;
    branch?: string;
    section?: string;
    year?: number;
    profilePicture?: string;
    rating?: number;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

// Attendance status
export type AttendanceStatus = 'present' | 'absent' | 'late';

// Attendance record
export interface AttendanceRecord {
    id?: string;
    studentId: string;
    studentName: string;
    registrationNumber: string;
    date: string; // YYYY-MM-DD format
    status: AttendanceStatus;
    markedBy: string;
    markedByName: string;
    timestamp: Timestamp;
    branch: string;
    section: string;
    year: number;
    subject?: string;
}

// Daily attendance (Realtime DB structure)
export interface DailyAttendance {
    [branch: string]: {
        [section: string]: {
            [year: string]: {
                students: {
                    [studentId: string]: {
                        name: string;
                        registrationNumber: string;
                        status: AttendanceStatus;
                        markedBy: string;
                        timestamp: number;
                    };
                };
            };
        };
    };
}

// Academic record
export interface AcademicRecord {
    id?: string;
    studentId: string;
    studentName: string;
    registrationNumber: string;
    subject: string;
    marks: number;
    maxMarks: number;
    semester: number;
    year: number;
    examType: 'internal' | 'external' | 'assignment';
    recordedBy: string;
    recordedByName: string;
    recordedAt: Timestamp;
}

// Fee status
export type FeeStatus = 'pending' | 'paid' | 'overdue' | 'partial';

// Fee record
export interface FeeRecord {
    id?: string;
    studentId: string;
    studentName: string;
    registrationNumber: string;
    amount: number;
    paidAmount?: number;
    dueDate: string;
    paidDate?: string;
    status: FeeStatus;
    semester: number;
    year: number;
    academicYear: string; // e.g., "2025-2026"
    description: string;
    transactionId?: string;
}

// Announcement tier
export type AnnouncementTier = 'institutional' | 'departmental';

// Announcement
export interface Announcement {
    id?: string;
    tier: AnnouncementTier;
    title: string;
    content: string;
    createdBy: string;
    createdByName: string;
    department?: string; // For departmental announcements
    createdAt: Timestamp;
    expiresAt?: Timestamp;
    isActive: boolean;
}

// Department
export interface Department {
    id?: string;
    name: string;
    code: string;
    hodId?: string;
    hodName?: string;
    branches: string[];
    createdAt: Timestamp;
}

// Class/Section
export interface ClassSection {
    branch: string;
    section: string;
    year: number;
    facultyId?: string;
    facultyName?: string;
    students: string[]; // Array of student IDs
}

// Rating/Feedback
export interface Rating {
    id?: string;
    userId: string; // User being rated
    ratedBy: string;
    ratedByName: string;
    rating: number; // 1-5
    comment?: string;
    createdAt: Timestamp;
}

// Analytics data structures
export interface AttendanceAnalytics {
    totalClasses: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    percentage: number;
    monthlyData?: {
        month: string;
        percentage: number;
    }[];
    subjectWise?: {
        subject: string;
        percentage: number;
    }[];
}

export interface AcademicAnalytics {
    totalSubjects: number;
    averageMarks: number;
    totalMarks: number;
    maxPossibleMarks: number;
    percentage: number;
    subjectWise: {
        subject: string;
        marks: number;
        maxMarks: number;
        percentage: number;
    }[];
}

export interface FeeAnalytics {
    totalFees: number;
    paidFees: number;
    pendingFees: number;
    overdueFees: number;
    paymentHistory: FeeRecord[];
}

// Dashboard stats
export interface DashboardStats {
    totalStudents?: number;
    totalFaculty?: number;
    totalDepartments?: number;
    todayAttendance?: number;
    averageAttendance?: number;
    totalFeesCollected?: number;
    pendingFees?: number;
}

// Form data types
export interface StudentRegistrationForm {
    name: string;
    email: string;
    registrationNumber: string;
    mobileNumber: string;
    password: string;
    confirmPassword: string;
    department: string;
    branch: string;
    section: string;
    year: number;
}

export interface InstitutionalLoginForm {
    employeeId: string;
    email: string;
    password: string;
}

export interface StudentLoginForm {
    registrationNumber: string;
    password: string;
}
