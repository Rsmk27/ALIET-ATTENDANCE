const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Firebase configuration from environment
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get command line arguments
const args = process.argv.slice(2);
const branch = args[0] || 'EEE'; // Default to EEE if not specified
const jsonFile = args[1] || 'students.json'; // Default file name

// Load students data
const dataPath = path.join(__dirname, '../data', jsonFile);
if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    console.log('\n📝 Usage: node scripts/importStudents.js [BRANCH] [JSON_FILE]');
    console.log('Example: node scripts/importStudents.js CSE cse-students.json');
    process.exit(1);
}

const studentsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function parseRegistrationNumber(regNo) {
    const yearPrefix = regNo.substring(0, 2);
    const year = yearPrefix === '23' ? 2 : yearPrefix === '24' ? 1 : 2;
    const sectionPart = regNo.substring(4, 6);
    const section = sectionPart === '1A' ? 'A' : sectionPart === '5A' ? 'A' : 'A';
    return { year, section };
}

async function importStudents() {
    console.log('🚀 Starting student import...');
    console.log(`📚 Branch: ${branch}`);
    console.log(`📄 File: ${jsonFile}`);
    console.log(`📊 Found ${Object.keys(studentsData).length} students to import\n`);

    const entries = Object.entries(studentsData);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < entries.length; i++) {
        const [regNo, name] = entries[i];

        try {
            const { year, section } = parseRegistrationNumber(regNo);

            const studentData = {
                name: name,
                email: `${regNo.toLowerCase()}@aliet.ac.in`,
                registrationNumber: regNo,
                branch: branch,
                year: year,
                section: section,
                role: 'student',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Store in admin/students/{BRANCH} collection
            const studentRef = doc(collection(db, `admin/students/${branch}`), regNo);
            await setDoc(studentRef, studentData);

            successCount++;
            console.log(`✅ [${successCount}/${entries.length}] Imported: ${name} (${regNo})`);
        } catch (error) {
            errorCount++;
            console.error(`❌ Error importing ${regNo}:`, error.message);
        }
    }

    console.log('\n🎉 Import Complete!');
    console.log(`✅ Successfully imported: ${successCount} students`);
    if (errorCount > 0) {
        console.log(`❌ Failed: ${errorCount} students`);
    }
    console.log(`📁 Stored in: admin/students/${branch}/`);

    process.exit(0);
}

importStudents().catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
});
