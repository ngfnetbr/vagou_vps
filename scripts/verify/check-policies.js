import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const connectionString = 'postgresql://postgres:583927104678@db.hzguwuofnvkgeveorixs.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database...');

    // 1. Check for auth_rls_initplan issues
    // Look for policies where definition contains 'auth.uid()' or 'current_setting' 
    // AND does NOT start with (SELECT ...
    // This is a heuristic.
    const initPlanQuery = `
      SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      AND (
        (qual::text LIKE '%auth.uid()%' OR qual::text LIKE '%current_setting%')
        OR
        (with_check::text LIKE '%auth.uid()%' OR with_check::text LIKE '%current_setting%')
      )
    `;
    
    const res = await client.query(initPlanQuery);
    const potentialInitPlan = res.rows.filter(r => {
        const q = r.qual || '';
        const wc = r.with_check || '';
        // If it looks like (auth.uid() = user_id), it's bad.
        // If it looks like ((SELECT auth.uid()) = user_id), it's good.
        // Or ((SELECT is_admin(auth.uid()))) is good.
        // But (is_admin(auth.uid())) is bad.
        
        const isBad = (text) => {
            if (!text) return false;
            // Simple check: does it have auth.uid() NOT preceded by SELECT?
            // This is hard to regex perfectly, but let's try to find obvious ones.
            // If it calls a function like is_admin(auth.uid()), it's bad unless wrapped in SELECT.
            
            // If it starts with ((SELECT, it's likely good.
            if (text.startsWith('((SELECT')) return false;
            
            return true; 
        };
        
        return isBad(q) || isBad(wc);
    });

    console.log(`\nPotential auth_rls_initplan issues: ${potentialInitPlan.length}`);
    if (potentialInitPlan.length > 0) {
        console.log('Sample:');
        potentialInitPlan.slice(0, 5).forEach(r => console.log(`- ${r.tablename}: ${r.policyname}`));
    }
    
    // 2. Check for multiple_permissive_policies
    // Group by table, cmd, role
    const permissiveQuery = `
      SELECT schemaname, tablename, policyname, cmd, roles
      FROM pg_policies
      WHERE schemaname = 'public'
    `; // permissive is default, restrict is rare but check `permissive` column if exists? 
       // pg_policies view doesn't have permissive column in older postgres, but Supabase likely has it.
       // Actually pg_policies standard view doesn't show permissive/restrictive.
       // We need to query pg_policy catalog directly.
    
    const catalogQuery = `
      SELECT n.nspname as schemaname,
             c.relname as tablename,
             p.polname as policyname,
             p.polcmd as cmd,
             p.polroles as roles,
             p.polpermissive
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.polpermissive = true
    `;
    
    const catalogRes = await client.query(catalogQuery);
    
    const grouped = {};
    catalogRes.rows.forEach(r => {
        const key = `${r.tablename}|${r.cmd}`;
        // roles is an array of OIDs or 0 for public.
        // This is getting complicated to decode roles.
        // Let's stick to pg_policies view which gives role names.
        // Assuming all are permissive for now (default).
    });
    
    // Let's go back to pg_policies and group by (table, cmd, role)
    // Note: roles is textual in pg_policies (e.g. {public}, {authenticated}).
    
    const policyMap = {};
    
    res.rows.forEach(r => { // using the first query result which has all policies
        const roles = r.roles; // array of strings
        roles.forEach(role => {
            const key = `${r.tablename}|${r.cmd}|${role}`;
            if (!policyMap[key]) policyMap[key] = [];
            policyMap[key].push(r.policyname);
        });
    });
    
    let multipleCount = 0;
    console.log('\nPotential multiple_permissive_policies issues:');
    Object.keys(policyMap).forEach(key => {
        if (policyMap[key].length > 1) {
            multipleCount++;
            const [table, cmd, role] = key.split('|');
            console.log(`${table} (${cmd}, ${role}): ${policyMap[key].join(', ')}`);
        }
    });
    console.log(`Total groups with multiple policies: ${multipleCount}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
