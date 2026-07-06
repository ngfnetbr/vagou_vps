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
    
    // 1. Fetch failing policies
    const initPlanQuery = `
      SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    `;
    
    const res = await client.query(initPlanQuery);
    
    const policiesToFix = res.rows.filter(r => {
        const q = (r.qual || '').trim();
        const wc = (r.with_check || '').trim();
        const combined = q + wc;
        
        if (!combined.includes('auth.uid()') && !combined.includes('current_setting')) return false;
        
        const isOptimized = (str) => {
            if (!str) return true;
            const norm = str.replace(/\s+/g, ' ');
            if (norm.startsWith('(SELECT') || norm.startsWith('((SELECT') || norm.startsWith('( SELECT')) return true;
            if (norm.startsWith('NOT EXISTS (SELECT') || norm.startsWith('(NOT EXISTS (SELECT')) return true;
            return false;
        };

        const qOptimized = isOptimized(q);
        const wcOptimized = isOptimized(wc);
        
        if (q.includes('auth.uid()') && !qOptimized) return true;
        if (wc.includes('auth.uid()') && !wcOptimized) return true;
        
        return false;
    });

    let sql = '-- Auto-generated fixes for auth_rls_initplan\n\n';
    
    policiesToFix.forEach(p => {
        const table = p.tablename;
        const name = p.policyname;
        const cmd = p.cmd; // ALL, SELECT, INSERT, UPDATE, DELETE
        const roles = p.roles; // array or string
        
        let rolesStr = '';
        if (Array.isArray(roles)) {
            rolesStr = roles.join(', ');
        } else if (typeof roles === 'string') {
            rolesStr = roles.replace(/^\{|\}$/g, '').split(',').join(', ');
        }
        
        // Helper to wrap logic
        const optimize = (clause) => {
            if (!clause) return null;
            if (clause.includes('(SELECT auth.uid())')) return clause; // Already done?
            
            // Simple replacement strategy:
            // replace "auth.uid()" with "(SELECT auth.uid())"
            // But be careful not to double wrap.
            // Also handle functions: "is_admin(auth.uid())" -> "(SELECT is_admin(auth.uid()))"
            
            // Strategy:
            // 1. Identify function calls like `func(auth.uid())` and wrap the whole thing in (SELECT ...).
            // 2. Identify standalone `auth.uid()` and wrap it in (SELECT ...).
            
            let newClause = clause;
            
            // Fix function calls first
            // is_admin(auth.uid()) -> (SELECT is_admin(auth.uid()))
            // Regex to find "word(auth.uid())"
            // Note: This regex is simplistic and might fail on complex nested calls.
            // But for RLS policies it's usually simple.
            
            // Actually, simply replacing `auth.uid()` with `(SELECT auth.uid())` works for comparison:
            // user_id = auth.uid()  ->  user_id = (SELECT auth.uid())
            // This is valid SQL.
            
            // For boolean functions:
            // is_admin(auth.uid()) -> is_admin((SELECT auth.uid()))
            // This is NOT what we want. We want (SELECT is_admin(auth.uid())).
            
            // So we need to handle known functions specifically.
            const knownFunctions = ['is_admin', 'has_role', 'is_responsavel', 'is_aluno', 'is_professor'];
            
            knownFunctions.forEach(fn => {
                 // Replace `fn(auth.uid())` with `(SELECT fn(auth.uid()))`
                 // Need to escape parens in regex
                 const re = new RegExp(`${fn}\\(auth\\.uid\\(\\)\\)`, 'g');
                 newClause = newClause.replace(re, `(SELECT ${fn}(auth.uid()))`);
            });
            
            // Now replace remaining `auth.uid()` that are NOT part of the above replacements?
            // The above replacements consumed `auth.uid()`.
            // Wait, `(SELECT is_admin(auth.uid()))` contains `auth.uid()`.
            // If I then replace `auth.uid()` with `(SELECT auth.uid())`, it becomes:
            // `(SELECT is_admin((SELECT auth.uid())))`
            // This is valid but ugly.
            
            // Better strategy:
            // Check if it's a known function call. If so, wrap the function.
            // If not, replace auth.uid() with (SELECT auth.uid()).
            
            // Let's iterate and check.
            
            if (newClause === clause) {
                // No function replacement happened.
                // Replace standalone auth.uid()
                newClause = newClause.replaceAll('auth.uid()', '(SELECT auth.uid())');
            }
            
            return newClause;
        };
        
        const newUsing = optimize(p.qual);
        const newCheck = optimize(p.with_check);
        
        sql += `DROP POLICY IF EXISTS "${name}" ON public.${table};\n`;
        sql += `CREATE POLICY "${name}" ON public.${table}`;
        sql += ` FOR ${cmd} TO ${rolesStr}`;
        if (newUsing) sql += ` USING (${newUsing})`;
        if (newCheck) sql += ` WITH CHECK (${newCheck})`;
        sql += `;\n\n`;
    });
    
    fs.writeFileSync('scripts/101-fix-remaining-performance.sql', sql);
    console.log('Generated scripts/101-fix-remaining-performance.sql');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
