import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres:583927104678@db.hzguwuofnvkgeveorixs.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    
    const query = `
      SELECT tablename, policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE tablename IN ('historico', 'profiles')
      AND schemaname = 'public'
    `;
    
    const res = await client.query(query);
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
