const fs = require('fs');

function escapeSql(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    return `'${val.toString().replace(/'/g, "''")}'`;
}

function generateInserts(tableName, data) {
    if (!data || data.length === 0) return '';
    
    const columns = Object.keys(data[0]);
    const columnsStr = columns.map(c => `"${c}"`).join(', ');
    
    let sql = `INSERT INTO public.${tableName} (${columnsStr}) VALUES \n`;
    
    const rows = data.map(row => {
        const values = columns.map(c => escapeSql(row[c])).join(', ');
        return `(${values})`;
    });
    
    sql += rows.join(',\n') + '\nON CONFLICT (id) DO UPDATE SET ' + 
           columns.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ') + ';';
    
    return sql;
}

const tableName = process.argv[2];
const jsonFile = process.argv[3];
const outputFile = process.argv[4];

const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const sql = generateInserts(tableName, data);
fs.writeFileSync(outputFile, sql);
console.log(`Generated ${data.length} inserts for ${tableName} in ${outputFile}`);
