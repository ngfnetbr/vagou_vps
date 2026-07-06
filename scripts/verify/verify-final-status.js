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
    
    // 1. Verify auth_rls_initplan
    // Rule: Any usage of auth.uid() or auth.jwt() MUST be inside a subquery (SELECT ...)
    // OR the whole expression must be a subquery.
    
    const initPlanQuery = `
      SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    `;
    
    const res = await client.query(initPlanQuery);
    
    const badInitPlans = res.rows.filter(r => {
        const q = (r.qual || '').trim();
        const wc = (r.with_check || '').trim();
        const combined = q + wc;
        
        // If no auth usage, it's fine
        if (!combined.includes('auth.uid()') && !combined.includes('current_setting')) return false;
        
        // Helper: Check if every occurrence of auth.uid() is inside a (SELECT ...)
        // This is hard with regex.
        // Simpler check: 
        // 1. Is the whole thing wrapped in (SELECT ...)?
        // 2. Or does it contain `(SELECT auth.uid()`?
        
        // If the string contains `auth.uid()` NOT preceded by `(SELECT ` (ignoring whitespace).
        
        const isBad = (str) => {
             if (!str) return false;
             // Remove all known good patterns
             // (SELECT auth.uid())
             // (SELECT is_admin(auth.uid()))
             // (SELECT ... auth.uid() ...)
             
             // Normalize
             let norm = str.replace(/\s+/g, ' ');
             
             // If the whole string starts with (SELECT, we assume it's an InitPlan (Postgres optimization).
             // Supabase linter specifically complains if "calls ... are being unnecessarily re-evaluated".
             // A top-level SELECT is fine.
             if (norm.startsWith('(SELECT') || norm.startsWith('((SELECT') || norm.startsWith('( SELECT')) return false;
             if (norm.startsWith('NOT EXISTS (SELECT') || norm.startsWith('(NOT EXISTS (SELECT')) return false;

             // If not top-level, check if specific usages are wrapped.
             // e.g. "user_id = auth.uid()" -> BAD
             // "user_id = (SELECT auth.uid())" -> GOOD
             
             // We want to find ANY `auth.uid()` that is NOT part of `(SELECT ...)`
             // We can strip out all `(SELECT ...)` chunks (naive parser) and see if `auth.uid()` remains.
             
             // Naive stripper: remove anything between `(SELECT` and `)`? No, nesting.
             // Let's just look for the specific BAD pattern:
             // `auth.uid()` NOT preceded by `SELECT`.
             
             // Look for `auth.uid()`
             // Check immediate preceding word.
             // Regex: `(?<!SELECT\s*\(?)\bauth\.uid\(\)` ?? 
             // JS doesn't support lookbehind fully in all envs, but let's try a simple approach.
             
             // Split by `auth.uid()`
             const parts = norm.split('auth.uid()');
             if (parts.length === 1) return false; // Not found
             
             // For each part (except last), check if it ends with `SELECT (` or `SELECT `.
             // If ANY part does NOT end with SELECT context, it's bad.
             
             for (let i = 0; i < parts.length - 1; i++) {
                 const part = parts[i].trim();
                 // Does it end with 'SELECT' or 'SELECT ('?
                 if (!part.match(/SELECT\s*\(?$/i)) {
                     // Found an unwrapped auth.uid()!
                     // But wait, what if it's `is_admin(auth.uid())`? 
                     // That is BAD unless `is_admin` is wrapped in SELECT.
                     // So `SELECT is_admin(auth.uid())` is GOOD.
                     // `part` ends with `is_admin(`.
                     // `is_admin(` does not match `SELECT`.
                     // So this correctly flags `is_admin(auth.uid())` as BAD.
                     // And `(SELECT is_admin(auth.uid()))`:
                     // `part` ends with `is_admin(`. Still bad? 
                     // No, wait. 
                     // `(SELECT is_admin(auth.uid()))`
                     // The `auth.uid()` is inside `is_admin`.
                     // The `is_admin` is inside `SELECT`.
                     // My logic above is flawed for nested functions.
                     
                     // Let's stick to the Supabase recommendation:
                     // "Resolve by replacing auth.uid() with (select auth.uid())"
                     // So if we see `(select auth.uid())`, it's good.
                     // If we see `auth.uid()` standalone, it's bad.
                     
                     // New logic:
                     // 1. Replace `(SELECT auth.uid())` with `__GOOD__`.
                     // 2. Replace `(SELECT ... auth.uid() ...)` with `__GOOD__`? Hard.
                     
                     // Let's rely on the fixes I implemented.
                     // I implemented: `(SELECT auth.uid())` for standalone.
                     // And `(SELECT is_admin(auth.uid()))` for functions.
                     
                     // So, if I strip `(SELECT auth.uid())` and `(SELECT is_admin(auth.uid()))`...
                     // and `auth.uid()` remains, then it's bad.
                     
                     let check = norm;
                     check = check.split('(SELECT auth.uid())').join('__GOOD__');
                     check = check.split('(SELECT (SELECT auth.uid())').join('__GOOD__'); // Double wrap from my script?
                     check = check.split('(SELECT is_admin(auth.uid()))').join('__GOOD__');
                     
                     // Also `(SELECT (SELECT is_admin(auth.uid()))`
                     check = check.split('(SELECT (SELECT is_admin(auth.uid())))').join('__GOOD__');
                     
                     if (check.includes('auth.uid()')) {
                         return true; // Still has unwrapped usage
                     }
                 }
             }
             return false;
        };

        return isBad(q) || isBad(wc);
    });

    console.log(`Remaining auth_rls_initplan issues: ${badInitPlans.length}`);
    if (badInitPlans.length > 0) {
        badInitPlans.slice(0, 5).forEach(p => console.log(`- ${p.tablename}: ${p.policyname}`));
    }
    
    // 2. Verify multiple_permissive_policies (Overlaps)
    // We want to check specifically public.zonas_atendimento and others mentioned.
    
    const tablesToCheck = ['zonas_atendimento', 'valores_campos_custom', 'tutorial_faq'];
    console.log('\nChecking specific tables for overlaps:');
    
    for (const table of tablesToCheck) {
        const tablePolicies = res.rows.filter(r => r.tablename === table);
        // Group by cmd
        const byCmd = {};
        tablePolicies.forEach(p => {
            if (!byCmd[p.cmd]) byCmd[p.cmd] = [];
            byCmd[p.cmd].push(p);
        });
        
        Object.keys(byCmd).forEach(cmd => {
            const policies = byCmd[cmd];
            // Check overlaps
            // If > 1 policy applies to same role.
            // Simplified: just list them if > 1.
            if (policies.length > 1) {
                console.log(`${table} (${cmd}): ${policies.map(p => p.policyname).join(', ')}`);
            }
        });
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
