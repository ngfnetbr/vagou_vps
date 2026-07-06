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
    
    // Check specific policies mentioned in the top of the CSV
    const query = `
      SELECT tablename, policyname, qual, with_check
      FROM pg_policies
      WHERE 
        (tablename = 'notificacoes_log' AND policyname = 'Admin can insert notification logs') OR
        (tablename = 'cmeis' AND policyname = 'Admin can manage CMEIs') OR
        (tablename = 'chat_mensagens' AND policyname = 'Admin can manage all chat messages') OR
        (tablename = 'criancas' AND policyname = 'Admin can manage all children')
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
