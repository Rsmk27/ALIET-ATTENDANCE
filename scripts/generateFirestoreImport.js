const fs = require('fs');
const path = require('path');

// Load students data
const studentsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/students.json'), 'utf8')
);

function parseRegistrationNumber(regNo) {
    const yearPrefix = regNo.substring(0, 2);
    const sectionPart = regNo.substring(4, 6);
    const section = sectionPart === '1A' ? 'A' : sectionPart === '5A' ? 'A' : 'A';

    // Logic matching utils/branchDetector.ts (2025-26 Academic Year)
    const startYearPrefix = 25;
    let year = startYearPrefix - parseInt(yearPrefix, 10) + 1;

    // Lateral Entry (+1 Year)
    if (sectionPart === '5A') {
        year += 1;
    }

    // Clamp to 1-4
    year = Math.max(1, Math.min(4, year));

    return { year, section };
}

// Convert to Firestore import format
const firestoreData = {};

Object.entries(studentsData).forEach(([regNo, name]) => {
    const { year, section } = parseRegistrationNumber(regNo);

    firestoreData[regNo] = {
        name: name,
        email: `${regNo.toLowerCase()}@aliet.ac.in`,
        registrationNumber: regNo,
        branch: 'EEE',
        year: year,
        section: section,
        role: 'student',
        createdAt: { __datatype__: 'timestamp', value: new Date().toISOString() },
        updatedAt: { __datatype__: 'timestamp', value: new Date().toISOString() }
    };
});

// Write to file
const outputPath = path.join(__dirname, '../data/students-firestore-import.json');
fs.writeFileSync(outputPath, JSON.stringify(firestoreData, null, 2));

console.log('✅ Created Firestore import file at:', outputPath);
console.log('📊 Total students:', Object.keys(firestoreData).length);
console.log('\n📝 Instructions:');
console.log('1. Go to Firebase Console → Firestore Database');
console.log('2. Navigate to: admin → students → EEE');
console.log('3. For each student, click "Add document" and paste the data');
console.log('\nOr use the Firebase CLI to import this file.');
