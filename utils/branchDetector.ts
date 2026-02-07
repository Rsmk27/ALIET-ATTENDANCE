
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

    // 1. Validate Year (Indices 0,1) - Basic numeric check
    if (cleanRegNo.length >= 2) {
        const yearStr = cleanRegNo.substring(0, 2);
        if (isNaN(parseInt(yearStr, 10))) {
            result.warning = "Invalid Year Format";
            return result;
        }

        // Calculate Year logic using Fixed Anchor (2025-2026 Academic Year)
        // 25 Batch -> 1st Year
        // 24 Batch -> 2nd Year (Regular) / 3rd Year (Lateral 24HP5A...)
        // 23 Batch -> 3rd Year
        // 22 Batch -> 4th Year
        const startYearPrefix = 25; // The prefix for 1st Year students in 2025-26
        const joinYear = parseInt(yearStr, 10);

        // Calculate basic year (1 based)
        // e.g., 24 - 24 + 1 = 1
        // e.g., 24 - 23 + 1 = 2
        let academicYear = startYearPrefix - joinYear + 1;

        result.calculatedYear = academicYear;
    }

    // 2. Validate College Code (Indices 2,3) - Must be HP
    if (cleanRegNo.length >= 4) {
        const code = cleanRegNo.substring(2, 4);
        if (code !== COLLEGE_CODE) {
            result.warning = "Invalid College Code (Must be HP)";
            return result;
        }
    }

    // 3. Validate Entry Level (Indices 4,5) - Must be 1A or 5A
    if (cleanRegNo.length >= 6) {
        const entryCode = cleanRegNo.substring(4, 6);
        if (!VALID_ENTRY_CODES.includes(entryCode)) {
            result.warning = "Invalid Entry Code (Must be 1A or 5A)";
            return result;
        }

        // Set Entry Type logic
        if (entryCode === '1A') {
            result.entryType = 'Regular';
        } else if (entryCode === '5A') {
            result.entryType = 'Lateral Entry';
            // Adjust Year for Lateral Entry (+1)
            if (result.calculatedYear !== undefined) {
                result.calculatedYear += 1;
            }
        }
    }

    // Clamp Year Calculation (1-4) AFTER adjustments
    if (result.calculatedYear !== undefined) {
        result.calculatedYear = Math.max(1, Math.min(4, result.calculatedYear));
    }

    // 4. Validate Branch Start (Index 6) - Instant check
    if (cleanRegNo.length >= 7) {
        const firstDigit = cleanRegNo[6];
        if (!VALID_FIRST_DIGITS_BRANCH.includes(firstDigit)) {
            result.warning = "No Branch Found Re-check Ones";
            return result;
        }
    }

    // 5. Validate Full Branch Code (Indices 6,7)
    if (cleanRegNo.length >= 8) {
        const branchCode = cleanRegNo.substring(6, 8);
        const info = BRANCH_CODES[branchCode];

        if (info) {
            result.data = info;
            result.warning = null; // Clear all warnings if valid up to here
        } else {
            result.warning = "No Branch Found Re-check Ones";
        }
    }

    return result;
};

// Wrapper
export const getBranchFromRegistrationNumber = (regNo: string): BranchInfo | null => {
    return detectBranchInfo(regNo).data;
};
