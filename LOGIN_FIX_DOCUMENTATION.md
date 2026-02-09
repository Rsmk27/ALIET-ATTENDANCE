# Login Fix - Registration Number Authentication

## Issues Fixed

### 1. ✅ **Email Domain Mismatch**
**Problem:** Admin registration creates users with `@aliet.ac.in` but login was trying `@aliet.edu`

**Solution:** Updated login page to use `@aliet.ac.in` domain
- Line 104: Changed student login email format
- Line 137: Changed fallback auto-registration email format

### 2. ✅ **Student Lookup Not Finding Registered Users**
**Problem:** Student name lookup was searching in wrong database path (`admin/students/{branch}` instead of hierarchical structure)

**Solution:** Changed lookup to query `users` collection directly
- More reliable and efficient
- Matches how admin registration saves data
- Falls back to local `students.json` if database query fails

## Changes Made

### File: `app/login/page.tsx`

#### Change 1: Student Lookup (Lines 50-69)
```typescript
// OLD: Searched in admin/students/{branch} subcollections
for (const branch of branches) {
    const studentRef = collection(db, `admin/students/${branch}`);
    // ...
}

// NEW: Query users collection directly
const usersRef = collection(db, 'users');
const userQuery = query(usersRef, 
    where('registrationNumber', '==', regNo),
    where('role', '==', 'student')
);
const userSnapshot = await getDocs(userQuery);
```

#### Change 2: Login Email Domain (Line 104)
```typescript
// OLD
const email = `${studentForm.registrationNumber}@aliet.edu`;

// NEW
const email = `${studentForm.registrationNumber}@aliet.ac.in`.toLowerCase();
```

#### Change 3: Auto-Registration Email Domain (Line 137)
```typescript
// OLD
const email = `${regNo}@aliet.edu`;

// NEW
const email = `${regNo}@aliet.ac.in`.toLowerCase();
```

## How It Works Now

### Student Login Flow:

1. **User enters Registration Number** (e.g., 25HP5A0512)
   - System queries `users` collection
   - Finds student data if registered by admin
   - Displays student name

2. **User enters Password**
   - Password set by admin during registration
   - Or default password if auto-created

3. **System authenticates**
   - Email: `{registrationNumber}@aliet.ac.in`
   - Password: As entered
   - Redirects to student dashboard on success

### Example:

**Admin Registration:**
- Registration Number: `25HP5A0512`
- Name: `John Doe`
- Password: `password123` (or custom)
- Email created: `25hp5a0512@aliet.ac.in`

**Student Login:**
- Enters: `25HP5A0512`
- System shows: "John Doe" ✅
- Enters password: `password123`
- Email used: `25hp5a0512@aliet.ac.in` ✅
- Login successful! ✅

## Database Structure

Students are stored in two places:

1. **Main Collection:**
   ```
   users/{uid}
   └── registrationNumber: "25HP5A0512"
       name: "John Doe"
       role: "student"
       email: "25hp5a0512@aliet.ac.in"
       department: "CSE"
       year: 5
       section: "A"
   ```

2. **Admin Hierarchy:**
   ```
   admin/students/CSE/5/A/{uid}
   └── (same data as above)
   ```

The login page queries the `users` collection for reliability.

## Testing

### Test Case 1: Admin-Registered Student
1. Admin registers student via `/register-faculty`
2. Student appears in admin dashboard ✅
3. Student can login with registration number + password ✅
4. Student name shows during login ✅

### Test Case 2: Bulk Upload Student
1. Admin uploads CSV with student data
2. Students created in database ✅
3. Each student can login with their registration number ✅
4. Names display correctly ✅

## Notes

- Email domain is now consistent: `@aliet.ac.in`
- Student lookup is more reliable (queries `users` collection)
- Both manual and bulk registration work with login
- Password is set by admin during registration

## Google Sign-In

**Note:** The current login page doesn't have Google Sign-In functionality. If this needs to be added:
1. Add Google Sign-In button
2. On first sign-in, prompt for registration number
3. Set password to registration number by default
4. Link Google account to student profile

This would require additional implementation.
