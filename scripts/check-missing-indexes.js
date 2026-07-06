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
    
    // Query to find unindexed foreign keys
    // Source: Supabase performance docs / typical postgres queries
    const query = `
      SELECT
          conrelid::regclass AS table_name,
          conname AS constraint_name,
          pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE contype = 'f'
      AND n.nspname = 'public'
      AND NOT EXISTS (
          SELECT 1
          FROM pg_index i
          WHERE i.indrelid = c.conrelid
          AND i.indkey[0] = (
              SELECT a.attnum
              FROM pg_attribute a
              WHERE a.attrelid = c.conrelid
              AND a.attname = (
                  SELECT split_part(split_part(pg_get_constraintdef(c.oid), '(', 2), ')', 1)
              )
          )
      )
      ORDER BY table_name;
    `;
    
    // Note: The above query is a bit simplified and might fail on composite keys. 
    // Let's use a more robust one if possible, or just list all FKs and check indexes manually in code.
    
    // Alternative: Get all FKs and all Indexes and compare.
    const fksQuery = `
      SELECT
        tc.table_schema, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `;
    
    const indexesQuery = `
      SELECT
        t.relname as table_name,
        i.relname as index_name,
        a.attname as column_name
      FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
      WHERE
        t.oid = ix.indrelid
        and i.oid = ix.indexrelid
        and a.attrelid = t.oid
        and a.attnum = ANY(ix.indkey)
        and t.relkind = 'r'
        and t.relname not like 'pg_%'
        and t.relname not like 'sql_%';
    `;

    const fksRes = await client.query(fksQuery);
    const idxRes = await client.query(indexesQuery);
    
    const fks = fksRes.rows;
    const indexes = idxRes.rows;
    
    const unindexed = [];
    
    for (const fk of fks) {
      // Check if there is an index on this table starting with this column
      const hasIndex = indexes.some(idx => 
        idx.table_name === fk.table_name && 
        idx.column_name === fk.column_name
      );
      
      if (!hasIndex) {
        unindexed.push(fk);
      }
    }
    
    console.log(`Found ${unindexed.length} unindexed foreign keys:`);
    console.log(JSON.stringify(unindexed, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
