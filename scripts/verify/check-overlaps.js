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
      SELECT schemaname, tablename, policyname, cmd, roles
      FROM pg_policies
      WHERE schemaname = 'public'
    `;
    
    const res = await client.query(query);
    
    // Group by table and command
    const tableCmdMap = {};
    
    res.rows.forEach(r => {
        const key = `${r.tablename}|${r.cmd}`;
        if (!tableCmdMap[key]) tableCmdMap[key] = [];
        
        let roles = r.roles;
        if (typeof roles === 'string') roles = roles.replace(/^\{|\}$/g, '').split(',');
        
        tableCmdMap[key].push({ name: r.policyname, roles: roles });
    });
    
    let overlapCount = 0;
    
    console.log('\nPotential Overlapping Policies (Multiple Permissive):');
    Object.keys(tableCmdMap).forEach(key => {
        const policies = tableCmdMap[key];
        if (policies.length <= 1) return;
        
        // Check for overlap
        // If any policy is TO public, it overlaps with everything.
        // If any policy is TO authenticated, it overlaps with specific roles (if used).
        
        const hasPublic = policies.some(p => p.roles.includes('public'));
        const hasAuth = policies.some(p => p.roles.includes('authenticated'));
        
        // Simple heuristic: If > 1 policy and one of them is public or authenticated, it's likely a warning.
        // Actually, Supabase linter warns if "multiple permissive policies... for the same role".
        // If I have Policy A TO public, and Policy B TO authenticated.
        // When 'authenticated' user queries, they see Policy A (via public) and Policy B (via authenticated).
        // So yes, it warns.
        
        if (hasPublic || hasAuth) {
             overlapCount++;
             const [table, cmd] = key.split('|');
             console.log(`- ${table} (${cmd}): ${policies.map(p => p.name).join(', ')}`);
        }
    });
    
    console.log(`Total overlapping groups: ${overlapCount}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
