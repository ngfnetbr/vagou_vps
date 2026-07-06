const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('c:/Users/User/Desktop/backup 00h42 21-03Vagou/backup_criancas_20260326_091256.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

fs.writeFileSync('c:/Users/User/Desktop/backup 00h42 21-03Vagou/backup_criancas_20260326_091256.json', JSON.stringify(data, null, 2));
console.log('Converted XLSX to JSON successfully');
