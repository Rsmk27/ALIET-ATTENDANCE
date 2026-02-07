# ALIETAKE College Management System

A comprehensive web application for college attendance tracking, academic performance monitoring, and fee management with role-based access control.

## 🚀 Key Features

### 👨‍💼 Admin Dashboard (New!)
-   **Student Management**: View all students organized by branch with comprehensive filtering
-   **Branch-wise Statistics**: Real-time count of students in each branch (CIVIL, EEE, MECH, ECE, CSE, IT, CSM, CSD)
-   **Faculty Overview**: Complete faculty directory with department-wise organization
-   **Search & Filter**: Advanced search by name, email, registration number, or employee ID
-   **Data Import Tool**: Easy import of student data from JSON files with progress tracking

### 🎓 Attendance Management
-   **Smart Filtering**: Dynamically filter students by **Branch**, **Year**, and **Section**.
-   **Intelligent Grouping**: Automatically groups **Regular (1st Year)** and **Lateral Entry (2nd Year)** students correctly based on their join year (e.g., 23HP Regular + 24HP Lateral → 3rd Year).
-   **Visual Indicators**: Color-coded badges for student types (Reg/Lat).
-   **Bulk Actions**: "Mark All Present" / "Mark All Absent" buttons for rapid entry.
-   **Mobile Optimized**: Fully responsive tables and controls for easy marking on phones.

### 👤 User & Role Management
-   **Multi-Role Auth**: Supported roles: Student, Faculty, Admin.
-   **Automated Sync**: Faculty profiles are automatically synced to their respective **Department Collections** (`admin/faculty/branch/{Dept}`) upon login.
-   **Smart Registration**:
    -   **Instant Validation**: Real-time checking of Registration Numbers (Year, College Code, Branch).
    -   **Auto-Fill**: Automatically detects Branch and Entry Level from Reg No.
    -   **Registry Lookup**: Pre-fills student names from the institutional database (`students.json`).

### 📱 Responsive Design
-   **Mobile-First**: All dashboard screens, login forms, and modals are optimized for mobile devices.
-   **Touch-Friendly**: Large touch targets, full-width inputs, and scrollable data tables.

## 🛠 Tech Stack

-   **Frontend**: Next.js 14 (App Router) with TypeScript
-   **Styling**: Tailwind CSS
-   **Backend**: Firebase (Firestore + Realtime Database)
-   **Authentication**: Firebase Auth (Google OAuth + Email/Password)
-   **Charts**: Recharts
-   **State Management**: React Context API
-   **Data Processing**: XLSX for Excel imports

## 🏁 Getting Started

### Prerequisites

-   Node.js 18+ installed
-   Firebase project created
-   Firebase CLI installed (`npm install -g firebase-tools`)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd ALIET-ATTENDANCE
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    -   Copy `.env.example` to `.env.local`
    -   Fill in your Firebase configuration values

4.  Run the development server:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser

## 📂 Project Structure

```
ALIET-ATTENDANCE/
├── app/                    # Next.js App Router
│   ├── login/             # Login Page
│   ├── register/          # Registration Page
│   ├── dashboard/         # Role-based Dashboards
│   │   ├── faculty/       # Faculty Attendance & Marks
│   │   ├── student/       # Student Portal
│   │   └── admin/         # Admin Dashboard (NEW!)
│   └── import-students/   # Student Import Tool (NEW!)
├── components/            # Reusable UI Components
│   ├── auth/             # RoleModal, ProtectedRoute
│   └── announcements/    # Ticker Components
├── data/                 # Static Data (Student Registry)
│   └── students.json     # Student Database
├── context/              # Auth Context
├── lib/                  # Firebase Config
├── utils/                # Helper Logic (Branch Detector)
└── types/                # TypeScript Interfaces
```

## 🔒 Firebase Structure

### Firestore Collections

-   **`users`**: User profiles for faculty and admin
-   **`admin/students/{branch}/{registrationNumber}`**: Students organized by branch
    -   `/admin/students/CIVIL/` - Civil Engineering students
    -   `/admin/students/EEE/` - Electrical & Electronics students
    -   `/admin/students/MECH/` - Mechanical Engineering students
    -   `/admin/students/ECE/` - Electronics & Communication students
    -   `/admin/students/CSE/` - Computer Science students
    -   `/admin/students/IT/` - Information Technology students
    -   `/admin/students/CSM/` - CSE (AI & ML) students
    -   `/admin/students/CSD/` - CSE (Data Science) students
-   **`admin/faculty/branch/{DeptName}`**: Faculty records sorted by department
-   **`attendance/{date}`**: Daily attendance logs
-   **`academic_records`**: Student marks

## 🎯 Supported Branches

The system supports **8 engineering branches**:

1. **CIVIL** - Civil Engineering
2. **EEE** - Electrical and Electronics Engineering
3. **MECH** - Mechanical Engineering
4. **ECE** - Electronics and Communication Engineering
5. **CSE** - Computer Science and Engineering
6. **IT** - Information Technology
7. **CSM** - Computer Science and Engineering (AI & ML)
8. **CSD** - Computer Science and Engineering (Data Science)

## 📥 Importing Students

1. Navigate to `/import-students`
2. The system will read from `data/students.json`
3. Click "Import Students" to add them to Firebase
4. Students are automatically organized by branch

## 🔐 Admin Setup

To set an admin user:
1. Register a user account
2. Go to Firebase Console → Firestore
3. Find the user document in the `users` collection
4. Change the `role` field to `admin`
5. Access the admin dashboard at `/dashboard/admin`

## 📜 License

© 2026 ALIET College. All rights reserved.
