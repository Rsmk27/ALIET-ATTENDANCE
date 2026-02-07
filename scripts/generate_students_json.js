
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const inputFile = path.join(__dirname, '../branches/EEE-02.xlsx');
const outputFile = path.join(__dirname, '../src/data/students.json');

if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
}

const workbook = XLSX.readFile(inputFile);
const sheetName = workbook.SheetNames[0]; // Assuming first sheet
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

const students = {};
let count = 0;

// Start looking from row 5 (index 5) as identified in preview
// But safer to check for patterns.
data.forEach((row, idx) => {
    if (idx < 5) return; // Skip headers? Or check content

    // Check if row has a valid Reg No in Column 1 (index 1)
    // Or Column 0? Previous preview showed Reg No at index 1.
    // Row 5: [2,"23HP1A0202","SANAPATHI JHANSI",...]

    const regNo = row[1];
    const name = row[2];

    // Is valid Reg No? String, length >= 10, contains 'HP'
    if (typeof regNo === 'string' && regNo.includes('HP') && regNo.length >= 10) {
        if (typeof name === 'string' && name.trim().length > 0) {
            students[regNo.toUpperCase().trim()] = name.trim();
            count++;
        }
    }
});

fs.writeFileSync(outputFile, JSON.stringify(students, null, 2));
console.log(`Generated students.json with ${count} records.`);
console.log(`Output: ${outputFile}`);
