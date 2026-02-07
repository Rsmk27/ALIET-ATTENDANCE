
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '../branches/EEE-02.xlsx');

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Array of arrays

console.log(`Sheet: ${sheetName}`);
console.log(`Rows: ${data.length}`);
console.log('--- Rows 5-15 ---');
data.slice(5, 15).forEach((row, i) => console.log(`Row ${i + 5}:`, JSON.stringify(row)));

console.log('--- Scanning for HP Reg Nos ---');
let foundStart = false;
data.forEach((row, idx) => {
    if (!foundStart && idx < 20) {
        // Check if any cell contains "HP" (reg no pattern)
        const hasHP = row.some(cell => typeof cell === 'string' && cell.includes('HP'));
        if (hasHP) {
            console.log(`Found HP at Row ${idx}:`, JSON.stringify(row));
            foundStart = true;
        }
    }
});
console.log('--- End Preview ---');
