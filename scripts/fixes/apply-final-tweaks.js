import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgresql://postgres:583927104678@db.hzguwuofnvkgeveorixs.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const file = 'scripts/103-fix-final-tweaks.sql';
const sql = fs.readFileSync(file, 'utf8');

async function run() {
  try {
    await client.connect();
    console.log(`Applying ${file}...`);
    await client.query(sql);
    console.log('Success!');
  } catch (err) {
    console.error('Error executing query', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
