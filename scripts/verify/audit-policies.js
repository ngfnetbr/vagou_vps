import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Erro: DATABASE_URL é obrigatório no arquivo .env");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    
    // Get all policies
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, cmd, roles
      FROM pg_policies
      WHERE schemaname = 'public'
    `);
    
    // Group by Table -> Cmd -> Role (Effective)
    // We want to find cases where a user (Anon or Authenticated) triggers >1 policy.
    
    const buckets = {
        anon: {},          // key: "table|cmd" -> [policy names]
        authenticated: {}  // key: "table|cmd" -> [policy names]
    };
    
    res.rows.forEach(r => {
        const table = r.tablename;
        const cmd = r.cmd;
        const key = `${table}|${cmd}`;
        
        let roles = r.roles;
        if (typeof roles === 'string') roles = roles.replace(/^\{|\}$/g, '').split(',');
        
        // Check effective roles
        // If TO public: applies to anon AND authenticated
        // If TO anon: applies to anon
        // If TO authenticated: applies to authenticated
        // If TO specific_role: applies to authenticated (if user has that role)
        // For Supabase linter "multiple_permissive_policies":
        // It warns if >1 policy applies to the SAME role.
        
        roles.forEach(role => {
            if (role === 'public') {
                if (!buckets.anon[key]) buckets.anon[key] = [];
                buckets.anon[key].push(r.policyname);
                
                if (!buckets.authenticated[key]) buckets.authenticated[key] = [];
                buckets.authenticated[key].push(r.policyname);
            } else if (role === 'anon') {
                if (!buckets.anon[key]) buckets.anon[key] = [];
                buckets.anon[key].push(r.policyname);
            } else if (role === 'authenticated') {
                if (!buckets.authenticated[key]) buckets.authenticated[key] = [];
                buckets.authenticated[key].push(r.policyname);
            } else {
                // Specific role e.g. 'service_role' or 'admin' or 'dashboard_user'
                // These are technically 'authenticated' users but with extra claims.
                // Supabase linter usually checks per-role.
                // If I have:
                // Policy 1: TO authenticated
                // Policy 2: TO admin
                // Does 'admin' trigger "multiple permissive"?
                // Yes, because 'admin' inherits 'authenticated' usually?
                // Or simply because an 'admin' user matches both?
                // Let's create a bucket for that specific role too.
                
                // Let's create a dynamic map for all roles found.
            }
        });
    });

    // Re-do with dynamic buckets for all specific roles found + derived ones
    const dynamicBuckets = {}; // role -> "table|cmd" -> [policies]
    
    // Initialize standard roles
    dynamicBuckets['anon'] = {};
    dynamicBuckets['authenticated'] = {};
    dynamicBuckets['service_role'] = {};
    
    res.rows.forEach(r => {
        const table = r.tablename;
        const cmd = r.cmd;
        const key = `${table}|${cmd}`;
        
        let roles = r.roles;
        if (typeof roles === 'string') roles = roles.replace(/^\{|\}$/g, '').split(',');
        
        roles.forEach(role => {
            // Add to the specific role bucket
            if (!dynamicBuckets[role]) dynamicBuckets[role] = {};
            if (!dynamicBuckets[role][key]) dynamicBuckets[role][key] = [];
            dynamicBuckets[role][key].push(r.policyname);
            
            // Handle inheritance / overlap logic
            if (role === 'public') {
                // Public implies EVERYONE.
                // So add to ALL existing buckets? 
                // Or at least anon and authenticated and service_role.
                ['anon', 'authenticated', 'service_role'].forEach(stdRole => {
                    if (!dynamicBuckets[stdRole][key]) dynamicBuckets[stdRole][key] = [];
                    // Avoid duplicates if policy is already added (e.g. TO public, authenticated - rare but possible)
                    if (!dynamicBuckets[stdRole][key].includes(r.policyname)) {
                        dynamicBuckets[stdRole][key].push(r.policyname);
                    }
                });
                // Also add to any other specific roles we've seen? 
                // That's hard because we iterate.
                // Better approach: Post-process.
            }
        });
    });
    
    // Post-process 'public' into all other buckets?
    // We already did for anon/auth/service.
    // What about 'admin', 'dashboard_user'?
    // If a policy is TO public, it applies to 'dashboard_user' too.
    
    // Let's find all unique roles mentioned
    const allRoles = new Set(['anon', 'authenticated', 'service_role']);
    res.rows.forEach(r => {
        let roles = r.roles;
        if (typeof roles === 'string') roles = roles.replace(/^\{|\}$/g, '').split(',');
        roles.forEach(role => allRoles.add(role));
    });
    
    // Ensure buckets exist
    allRoles.forEach(role => {
        if (!dynamicBuckets[role]) dynamicBuckets[role] = {};
    });
    
    // Now iterate again to distribute 'public' policies to ALL roles
    res.rows.forEach(r => {
        let roles = r.roles;
        if (typeof roles === 'string') roles = roles.replace(/^\{|\}$/g, '').split(',');
        
        if (roles.includes('public')) {
            allRoles.forEach(role => {
                if (role === 'public') return; // already in public bucket
                const key = `${r.tablename}|${r.cmd}`;
                if (!dynamicBuckets[role][key]) dynamicBuckets[role][key] = [];
                if (!dynamicBuckets[role][key].includes(r.policyname)) {
                    dynamicBuckets[role][key].push(r.policyname);
                }
            });
        }
        
        // If policy is TO authenticated, it usually applies to specific authenticated roles too (like admin)?
        // In Supabase, custom roles like 'admin' are NOT Postgres roles usually, they are JWT claims.
        // UNLESS they are actual Postgres roles created.
        // Let's assume 'dashboard_user', 'cli_login_postgres' ARE Postgres roles.
        // If they are Postgres roles, do they inherit 'authenticated'?
        // Usually NO, unless explicitly granted. 
        // Supabase `authenticated` is a specific role.
        // So if I am logged in as `dashboard_user` (Postgres role), I am NOT `authenticated` role automatically unless granted.
        
        // HOWEVER, the CSV warnings show:
        // "Table ... has multiple permissive policies for role `dashboard_user`..."
        // "Policies include `{"Admin can manage custom values", "Responsavel can view own custom values"}`"
        
        // This suggests `dashboard_user` matches BOTH.
        // "Admin can manage custom values" is likely TO public (checking is_admin()) OR TO authenticated.
        // "Responsavel can view own custom values" is likely TO public (checking uid) OR TO authenticated.
        
        // Wait, if BOTH are TO public, then `dashboard_user` sees both.
        // If one is TO public, and one is TO dashboard_user.
        
        // Let's look at the actual output of overlaps.
    });

    console.log('\n--- DETECTED OVERLAPS ---');
    let overlapCount = 0;
    
    Object.keys(dynamicBuckets).forEach(role => {
        if (role === 'public') return; // public is abstract
        
        const tables = dynamicBuckets[role];
        Object.keys(tables).forEach(key => {
            const policies = tables[key];
            if (policies.length > 1) {
                // Filter out if it's the SAME policy name (not possible due to logic, but safe check)
                const unique = [...new Set(policies)];
                if (unique.length > 1) {
                    overlapCount++;
                    const [table, cmd] = key.split('|');
                    console.log(`Role: ${role} | Table: ${table} | Cmd: ${cmd}`);
                    console.log(`  Policies: ${unique.join(', ')}`);
                }
            }
        });
    });
    
    console.log(`\nTotal overlapping instances: ${overlapCount}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
