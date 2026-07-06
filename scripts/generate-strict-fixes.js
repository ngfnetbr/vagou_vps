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
    
    // Get all policies for public schema
    const query = `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    `;
    
    const res = await client.query(query);
    const policies = res.rows;
    
    let sqlStatements = [];
    let count = 0;

    for (const policy of policies) {
      let changed = false;
      let newQual = policy.qual;
      let newWithCheck = policy.with_check;

      // Regex to find auth.uid() not preceded by (SELECT
      // We handle optional whitespace and case insensitivity
      const regexUid = /(?<!\(\s*SELECT\s+)auth\.uid\(\)/gi;
      const regexJwt = /(?<!\(\s*SELECT\s+)auth\.jwt\(\)/gi;
      const replacementUid = '(SELECT auth.uid())';
      const replacementJwt = '(SELECT auth.jwt())';

      if (newQual) {
        const original = newQual;
        let modified = original.replace(regexUid, replacementUid);
        modified = modified.replace(regexJwt, replacementJwt);
        
        if (modified !== original) {
          newQual = modified;
          changed = true;
        }
      }

      if (newWithCheck) {
        const original = newWithCheck;
        let modified = original.replace(regexUid, replacementUid);
        modified = modified.replace(regexJwt, replacementJwt);
        
        if (modified !== original) {
          newWithCheck = modified;
          changed = true;
        }
      }

      if (changed) {
        console.log(`Fixing policy: "${policy.policyname}" on ${policy.tablename}`);
        count++;
        
        // Construct Drop and Create
        // Note: roles is {public} or similar. We need to format it.
        // pg_policies returns roles as an array string like "{admin,public}"
        let roles = policy.roles;
        if (roles.startsWith('{')) roles = roles.substring(1, roles.length - 1);
        if (roles === '') roles = 'public'; // or current_user? Usually public implies all.
        // Actually, if roles is empty in pg_policies it usually means public? 
        // Let's check typical output. "{public}"
        
        sqlStatements.push(`-- Fixing ${policy.policyname} on ${policy.tablename}`);
        sqlStatements.push(`DROP POLICY IF EXISTS "${policy.policyname}" ON ${policy.schemaname}.${policy.tablename};`);
        
        let createSql = `CREATE POLICY "${policy.policyname}" ON ${policy.schemaname}.${policy.tablename}`;
        createSql += ` FOR ${policy.cmd}`;
        createSql += ` TO ${roles}`;
        
        if (newQual) {
          createSql += ` USING (${newQual})`;
        }
        
        if (newWithCheck) {
          createSql += ` WITH CHECK (${newWithCheck})`;
        }
        
        createSql += `;`;
        sqlStatements.push(createSql);
        sqlStatements.push('');
      }
    }

    if (count > 0) {
      const outFile = 'scripts/104-strict-perf-fixes.sql';
      fs.writeFileSync(outFile, sqlStatements.join('\n'));
      console.log(`Generated ${outFile} with ${count} fixes.`);
    } else {
      console.log('No strict fixes needed.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
