
// Branch Info Interface
export interface BranchInfo {
    branch: string;
    department: string;
}

export interface BranchDetectionResult {
    data: BranchInfo | null;
    warning: string | null;
    entryType?: 'Regular' | 'Lateral Entry';
    calculatedYear?: number;
}

// Branch Code Mapping
const BRANCH_CODES: Record<string, BranchInfo> = {
    '01': { branch: 'CIVIL', department: 'Civil Engineering' },
    '02': { branch: 'EEE', department: 'Electrical and Electronics Engineering' },
    '03': { branch: 'MECH', department: 'Mechanical Engineering' },
    '04': { branch: 'ECE', department: 'Electronics and Communication Engineering' },
    '05': { branch: 'CSE', department: 'Computer Science and Engineering' },
    '12': { branch: 'IT', department: 'Information Technology' },
    '42': { branch: 'CSM', department: 'Computer Science and Engineering (AI & ML)' },
    '44': { branch: 'CSD', department: 'Computer Science and Engineering (Data Science)' },
};

// Aliases or Constants
const COLLEGE_CODE = 'HP';
const VALID_ENTRY_CODES = ['1A', '5A'];
const VALID_FIRST_DIGITS_BRANCH = ['0', '1', '4'];

/**
 * Detects branch info, entry level, and year of study.
 * Performs rigorous, instant validation at each step of input.
 */
export const detectBranchInfo = (regNo: string): BranchDetectionResult => {
    // Default result
    const result: BranchDetectionResult = {
        data: null,
        warning: null,
        entryType: undefined,
        calculatedYear: undefined
    };

    if (!regNo) return result;

    const cleanRegNo = regNo.trim().toUpperCase();

    // 1. Validate Year (Indices 0,1)
    if (cleanRegNo.length >= 2) {
        const yearStr = cleanRegNo.substring(0, 2);
        if (isNaN(parseInt(yearStr, 10))) {
            result.warning = "Invalid Year Format";
            return result;
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const joinYear = parseInt(yearStr, 10);

        // Academic Year Calc
        // If joinYear is 24, currentYear is 26. Diff is 2.
        // If month is June (5) or later, they have started the next academic year?
        // Usually:
        // June 2024 joined.
        // Feb 2025 -> 1st Year. (25-24 = 1. Month < 5. Calc=1)
        // June 2025 -> 2nd Year starts. (25-24 = 1. Month>=5. Calc=2)
        // Feb 2026 -> 2nd Year. (26-24 = 2. Month < 5. Calc=2)
        // This logic seems correct for JNTU/India academic cycles.

        let academicYear = currentYear - joinYear;

        if (currentDate.getMonth() >= 5) { // June or later
            academicYear += 1;
        }

        // Handle case where academicYear might be 0 (just joined before June)
        // e.g. Joined Jan 2025 (Lateral?) -> 25-25=0.
        if (academicYear < 1) academicYear = 1;

        result.calculatedYear = academicYear;
    }

    // 2. Validate College Code
    if (cleanRegNo.length >= 4) {
        const code = cleanRegNo.substring(2, 4);
        if (code !== COLLEGE_CODE) {
            result.warning = "Invalid College Code (Must be HP)";
            // We continue anyway to try and detect branch for flexibility
        }
    }

    // 3. Validate Entry Level
    if (cleanRegNo.length >= 6) {
        const entryCode = cleanRegNo.substring(4, 6);
        if (entryCode === '1A') {
            result.entryType = 'Regular';
        } else if (entryCode === '5A') {
            result.entryType = 'Lateral Entry';
            if (result.calculatedYear !== undefined) {
                result.calculatedYear += 1;
            }
        } else {
            result.warning = "Unknown Entry Code";
        }
    }

    // Clamp Year
    if (result.calculatedYear !== undefined) {
        result.calculatedYear = Math.max(1, Math.min(4, result.calculatedYear));
    }

    // 4. Validate Branch (Code at 6,7)
    // We removed the strict 'firstDigit' check to allow for more codes if they exist
    if (cleanRegNo.length >= 8) {
        const branchCode = cleanRegNo.substring(6, 8);
        const info = BRANCH_CODES[branchCode];

        if (info) {
            result.data = info;
            result.warning = null; // Valid branch found
        } else {
            result.warning = "Unknown Branch Code";
        }
    }

    return result;
};

/**
 * Detects faculty info from Faculty ID/Employee ID.
 * Supports patterns: FAC-CSE-001 or ALIET-26-05
 */
export const detectFacultyInfo = (facultyId: string): BranchInfo | null => {
    if (!facultyId) return null;
    const cleanId = facultyId.trim().toUpperCase();

    // Pattern 1: FAC-CSE-001
    if (cleanId.startsWith('FAC-')) {
        const parts = cleanId.split('-');
        if (parts.length >= 2) {
            const deptCode = parts[1];
            // Validate if it's a known branch
            const matchedBranch = Object.values(BRANCH_CODES).find(
                b => b.branch === deptCode
            );
            if (matchedBranch) return matchedBranch;

            // If not in BRANCH_CODES but looks like a code, return basic info
            if (deptCode.length >= 2 && deptCode.length <= 5) {
                return { branch: deptCode, department: deptCode };
            }
        }
    }

    // Pattern 2: ALIET-26-05
    if (cleanId.startsWith('ALIET-')) {
        const parts = cleanId.split('-');
        if (parts.length >= 3) {
            const branchCode = parts[2];
            const info = BRANCH_CODES[branchCode];
            if (info) return info;
        }
    }

    return null;
};

// Wrapper
export const getBranchFromRegistrationNumber = (regNo: string): BranchInfo | null => {
    return detectBranchInfo(regNo).data;
};
