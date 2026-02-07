# ALIETAKE College Management System

A comprehensive web application for college attendance tracking, academic performance monitoring, and fee management with role-based access control.

## 🚀 Key Features

### 🎓 Attendance Management (New!)
-   **Smart Filtering**: Dynamically filter students by **Branch**, **Year**, and **Section**.
-   **Intelligent Grouping**: Automatically groups **Regular (1st Year)** and **Lateral Entry (2nd Year)** students correctly based on their join year (e.g., 23HP Regular + 24HP Lateral → 3rd Year).
-   **Visual Indicators**: Color-coded badges for student types (Reg/Lat).
-   **Bulk Actions**: "Mark All Present" / "Mark All Absent" buttons for rapid entry.
-   **Mobile Optimized**: Fully responsive tables and controls for easy marking on phones.

### 👤 User & Role Management
-   **Multi-Role Auth**: Supported roles: Student, Faculty, HOD, Administrator.
-   **Automated Sync**: Faculty profiles are automatically synced to their respective **Department Collections** (`admin/faculty/branch/{Dept}`) upon login.
-   **Smart Registration**:
    -   **Instant Validation**: Real-time checking of Registration Numbers (Year, College Code, Branch).
    -   **Auto-Fill**: Automatically detects Branch (CSE, EEE, etc.) and Entry Level from Reg No.
    -   **Registry Lookup**: Pre-fills student names from the institutional database (`students.json`).

### 📱 Responsive Design
-   **Mobile-First**: All dashboard screens, login forms, and modals are optimized for mobile devices.
-   **Touch-Friendly**: Large touch targets, full-width inputs, and scrollable data tables.

## 🛠 Tech Stack

-   **Frontend**: Next.js 14 (App Router) with TypeScript
-   **Styling**: Tailwind CSS
-   **Backend**: Firebase (Firestore + Realtime Database + Cloud Functions)
-   **Authentication**: Firebase Auth (Google OAuth + Email/Password)
-   **Charts**: Recharts
-   **State Management**: React Context API + Zustand

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
│   ├── (auth)/            # Auth Pages (Login, Register)
│   ├── dashboard/         # Role-based Dashboards
│   │   ├── faculty/       # Faculty Attendance & Marks
│   │   ├── student/       # Student Portal
│   │   └── admin/         # Admin Controls
├── components/            # Reusable UI Components
│   ├── auth/             # RoleModal, LoginForm
│   └── attendance/       # Marking Interface
├── data/                 # Static Data (Student Registry)
├── context/              # Auth & Theme Contexts
├── lib/                  # Firebase Config
├── utils/                # Helper Logic (Branch Detector)
└── types/                # TypeScript Interfaces
```

## 🔒 Firebase Structure

### Firestore Collections

-   **`users`**: All user profiles (mixed roles).
-   **`admin/faculty/branch/{DeptName}`**: Automatically synced Faculty records sorted by branch.
-   **`attendance/{date}`**: Daily attendance logs.
-   **`academic_records`**: Student marks.

## 📜 License

© 2026 ALIET College. All rights reserved.
