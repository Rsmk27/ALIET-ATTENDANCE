# Bulk User Upload Guide

## Overview
The Admin Registration page now supports **bulk upload** of students and faculty members from CSV and Excel files. This feature allows you to register multiple users at once, saving time and effort.

## Supported File Formats
- **CSV** (.csv) - Recommended for best compatibility
- **Excel** (.xlsx, .xls)

## File Structure

### For Students
Your file should contain the following columns:

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| name | Yes | Full name of the student | John Doe |
| registrationNumber | Yes | Student registration number | 20HP1A0501 |
| year | Yes | Academic year (1-4) | 1 |
| section | Yes | Section (A, B, C, D) | A |
| department | Yes | Department code | CSE |
| password | No | Custom password (defaults to password123) | mypassword |

**Column Name Variations Supported:**
- `name` or `Name` or `fullName` or `Full Name`
- `registrationNumber` or `Registration Number` or `regNo` or `Reg No`
- `year` or `Year` or `class` or `Class`
- `section` or `Section` or `sec` or `Sec`
- `department` or `Department` or `branch` or `Branch`

### For Faculty/HOD
Your file should contain the following columns:

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| name | Yes | Full name of the faculty | Dr. Ramesh Kumar |
| facultyId | Yes | Faculty ID | FAC-CSE-001 |
| department | Yes | Department code | CSE |
| role | Yes | Role type (faculty or hod) | faculty |
| password | No | Custom password (defaults to password123) | mypassword |

**Column Name Variations Supported:**
- `name` or `Name` or `fullName` or `Full Name`
- `facultyId` or `Faculty ID` or `employeeId` or `Employee ID`
- `department` or `Department` or `branch` or `Branch`
- `role` or `Role`

## How to Use

### Step 1: Prepare Your File
1. Download the appropriate template:
   - **Student Template**: `sample-students.csv`
   - **Faculty Template**: `sample-faculty.csv`
2. Open the template in Excel, Google Sheets, or any spreadsheet software
3. Fill in your data following the column format
4. Save the file as CSV or Excel format

### Step 2: Upload the File
1. Navigate to the Admin Registration page
2. Click on the **"Bulk Upload"** tab
3. Click **"Choose file"** or drag and drop your file into the upload area
4. The system will automatically parse and display the data

### Step 3: Review Parsed Data
- The system will show a preview table with all extracted records
- Review the data to ensure it was parsed correctly
- Check that names, IDs, departments, and other fields are correct

### Step 4: Upload Users
1. Click the **"Upload X Users"** button (where X is the number of records)
2. The system will process each user one by one
3. A progress bar will show the current status
4. Wait for the upload to complete

### Step 5: Review Results
After the upload completes, you'll see:
- **Success Section**: List of users successfully created
- **Failed Section**: List of users that failed with error reasons

Common failure reasons:
- User already exists (email/ID already registered)
- Missing required fields
- Invalid data format

## Important Notes

### Email Generation
- **Students**: Email is auto-generated as `{registrationNumber}@aliet.ac.in`
- **Faculty/HOD**: Email is auto-generated as `{facultyId}@aliet.ac.in`

### Password Defaults
- If no password is specified, the default password is `password123`
- Users should change their password after first login

### Data Storage
Users are saved to:
- **Firestore `users` collection**: Main user profile
- **Admin Hierarchy**:
  - Students: `admin/students/{department}/{year}/{section}/{uid}`
  - Faculty/HOD: `admin/faculty/branch/{department}/faculty_members/{uid}`

### Rate Limiting
- The system processes users with a 100ms delay between each to avoid rate limiting
- Large uploads may take several minutes

## Tips for Best Results

1. **Use CSV format** for maximum compatibility
2. **Keep column names consistent** with the templates
3. **Remove empty rows** before uploading
4. **Test with a small file first** (5-10 records) before uploading large batches
5. **Check for duplicates** in your file before uploading
6. **Ensure IDs are unique** across all records

## Troubleshooting

### File Not Parsing
- Ensure your file has headers in the first row
- Check that column names match the supported variations
- Try saving as CSV instead of Excel

### Upload Failures
- Check the error message for each failed user
- Common issues:
  - Duplicate registration numbers/faculty IDs
  - Missing required fields
  - Invalid department codes

### Partial Success
- If some users succeed and others fail, the successful ones are already created
- Fix the failed entries and upload them separately
- Do not re-upload the entire file

## Example Files

### Student CSV Example
```csv
name,registrationNumber,year,section,department
John Doe,20HP1A0501,1,A,CSE
Jane Smith,20HP1A0502,1,A,CSE
Mike Johnson,20HP1A0503,1,A,CSE
```

### Faculty CSV Example
```csv
name,facultyId,department,role
Dr. Ramesh Kumar,FAC-CSE-001,CSE,faculty
Prof. Lakshmi Devi,FAC-CSE-002,CSE,hod
Dr. Venkat Rao,FAC-ECE-001,ECE,faculty
```

## Support
For issues or questions, contact the system administrator.
