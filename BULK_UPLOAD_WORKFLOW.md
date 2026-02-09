# Bulk Upload Workflow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN REGISTRATION PAGE                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Toggle: Single  │  Bulk Upload        │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │      BULK UPLOAD MODE SELECTED          │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   1. Upload File (CSV/Excel)            │
        │      - Drag & Drop                      │
        │      - Click to Browse                  │
        │      - Download Templates               │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   2. File Parsing                       │
        │      - Detect file type                 │
        │      - Parse CSV/Excel                  │
        │      - Normalize column names           │
        │      - Detect student vs faculty        │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   3. Data Preview                       │
        │      ┌───────────────────────────────┐  │
        │      │ Name │ Role │ ID │ Dept      │  │
        │      ├───────────────────────────────┤  │
        │      │ John │ student │ 20HP... │CSE│  │
        │      │ Jane │ student │ 20HP... │CSE│  │
        │      └───────────────────────────────┘  │
        │      [Upload X Users Button]            │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   4. Bulk Processing                    │
        │      Progress: [████████░░] 8/10        │
        │      Status: Processing Jane Smith...   │
        │                                         │
        │   For Each User:                        │
        │   ├─ Generate Email                     │
        │   ├─ Create Firebase Auth User          │
        │   ├─ Save to users/{uid}                │
        │   └─ Save to admin hierarchy            │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   5. Results Display                    │
        │                                         │
        │   ✅ Successfully Created (8)           │
        │   ├─ ✓ John Doe                        │
        │   ├─ ✓ Jane Smith                      │
        │   └─ ✓ Mike Johnson                    │
        │                                         │
        │   ❌ Failed (2)                         │
        │   ├─ ✗ Sarah: Email already exists     │
        │   └─ ✗ David: Missing required field   │
        └─────────────────────────────────────────┘
```

## Data Flow

```
CSV/Excel File
     │
     ▼
┌─────────────────┐
│  File Parser    │
│  (Papa/XLSX)    │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│  Normalize Data │
│  - Map columns  │
│  - Detect role  │
│  - Validate     │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│  Preview Array  │
│  [{user1},      │
│   {user2}, ...] │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│  Bulk Upload    │
│  Loop           │
└─────────────────┘
     │
     ├─────────────────────────────────┐
     │                                 │
     ▼                                 ▼
┌─────────────────┐          ┌─────────────────┐
│ Firebase Auth   │          │   Firestore     │
│ Create User     │          │   Save Profile  │
└─────────────────┘          └─────────────────┘
     │                                 │
     │                                 ├─► users/{uid}
     │                                 │
     │                                 ├─► admin/students/{dept}/{year}/{section}/{uid}
     │                                 │
     │                                 └─► admin/faculty/branch/{dept}/faculty_members/{uid}
     │
     ▼
┌─────────────────┐
│  Results        │
│  - Success[]    │
│  - Failed[]     │
└─────────────────┘
```

## User Journey

### Step 1: Access Admin Page
```
User (Admin) → Login → Dashboard → Register Users
```

### Step 2: Choose Bulk Upload
```
[Single Registration] [Bulk Upload] ← Click here
```

### Step 3: Prepare File
```
Option A: Download Template
  ↓
Fill in Excel/Sheets
  ↓
Save as CSV

Option B: Create Own File
  ↓
Follow format guide
  ↓
Save as CSV/Excel
```

### Step 4: Upload & Review
```
Upload File → Preview Data → Verify Correctness → Click Upload
```

### Step 5: Monitor Progress
```
Watch Progress Bar → See Status Updates → Wait for Completion
```

### Step 6: Review Results
```
Check Success List → Note Failed Entries → Fix & Re-upload Failed
```

## Error Handling Flow

```
User Upload Attempt
     │
     ▼
┌─────────────────────────┐
│ Validation Checks       │
├─────────────────────────┤
│ ✓ File format valid?    │
│ ✓ Has data?             │
│ ✓ Required columns?     │
└─────────────────────────┘
     │
     ├─── Invalid ──► Show Error Message
     │
     ▼ Valid
┌─────────────────────────┐
│ Process Each User       │
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ Try Create User         │
└─────────────────────────┘
     │
     ├─── Success ──► Add to Success[]
     │
     ├─── Duplicate ──► Add to Failed[] (reason: exists)
     │
     ├─── Missing Data ──► Add to Failed[] (reason: missing)
     │
     └─── Other Error ──► Add to Failed[] (reason: error.message)
```

## Database Structure After Upload

```
Firestore
├── users
│   ├── {uid1}
│   │   ├── name: "John Doe"
│   │   ├── email: "20hp1a0501@aliet.ac.in"
│   │   ├── role: "student"
│   │   ├── registrationNumber: "20HP1A0501"
│   │   ├── department: "CSE"
│   │   ├── year: 1
│   │   └── section: "A"
│   └── {uid2}
│       ├── name: "Dr. Ramesh"
│       ├── email: "fac-cse-001@aliet.ac.in"
│       ├── role: "faculty"
│       ├── employeeId: "FAC-CSE-001"
│       └── department: "CSE"
│
└── admin
    ├── students
    │   └── CSE
    │       └── 1
    │           └── A
    │               └── {uid1} (same data as users/{uid1})
    │
    └── faculty
        └── branch
            └── CSE
                └── faculty_members
                    └── {uid2} (same data as users/{uid2})
```
