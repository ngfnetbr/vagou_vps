import fs from 'fs';
import csv from 'csv-parser';

const results = [];
const counts = {};

fs.createReadStream('Supabase Performance Security Lints (hzguwuofnvkgeveorixs).csv')
  .pipe(csv())
  .on('data', (data) => {
    const name = data.name;
    counts[name] = (counts[name] || 0) + 1;
  })
  .on('end', () => {
    console.log('Lint counts:');
    console.log(JSON.stringify(counts, null, 2));
  });
