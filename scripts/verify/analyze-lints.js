import fs from 'fs';

const csvPath = 'Supabase Performance Security Lints (hzguwuofnvkgeveorixs).csv';

try {
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split('\n');
  
  const warnings = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const lintName = line.split(',')[0];
    if (lintName) {
        warnings.push({ line: line, type: lintName });
    }
  }

  console.log(`Total warnings found: ${warnings.length}`);
  
  const counts = {};
  warnings.forEach(w => {
    counts[w.type] = (counts[w.type] || 0) + 1;
  });
  
  console.log('Counts by type:');
  console.log(JSON.stringify(counts, null, 2));
  
  const permissive = warnings.filter(w => w.type === 'multiple_permissive_policies');
  if (permissive.length > 0) {
      console.log('\nMultiple Permissive Policies Details:');
      const tables = {};
      permissive.forEach(w => {
          const match = w.line.match(/Table `public\.(\w+)`/);
          if (match) {
              tables[match[1]] = (tables[match[1]] || 0) + 1;
          }
      });
      console.log(JSON.stringify(tables, null, 2));
  }
  
  const initplan = warnings.filter(w => w.type === 'auth_rls_initplan');
  if (initplan.length > 0) {
      console.log('\nAuth RLS InitPlan Details (Tables):');
       const tables = {};
      initplan.forEach(w => {
          const match = w.line.match(/on table `public\.(\w+)`/);
          if (match) {
              tables[match[1]] = (tables[match[1]] || 0) + 1;
          }
      });
      console.log(JSON.stringify(tables, null, 2));
  }

} catch (err) {
  console.error(err);
}
