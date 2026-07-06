import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = 'https://ebyueiskoxxwdxrxgopx.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function migrate(jsonFile) {
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
  
  let tablesData = data
  if (Array.isArray(data) && data.length > 0) {
    if (data[0].batch_data) tablesData = data[0].batch_data
    else if (data[0].json_agg) tablesData = { data: data[0].json_agg }
  }

  for (const [tableName, rows] of Object.entries(tablesData)) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) continue
    
    console.log(`Migrating ${tableName} (${rows.length} rows)...`)
    
    // Split into chunks of 50
    const chunkSize = 50
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      
      // Clean up rows: remove generated columns or handle specific types
      const cleanChunk = chunk.map(row => {
        const { confirmed_at, ...rest } = row // Skip generated columns
        return rest
      })

      const { error } = await supabase
        .from(tableName)
        .upsert(cleanChunk, { onConflict: 'id' })
      
      if (error) {
        console.error(`Error migrating ${tableName}:`, error)
      } else {
        console.log(`Migrated chunk ${i / chunkSize + 1} of ${tableName}`)
      }
    }
  }
}

const file = process.argv[2]
if (file) {
  migrate(file)
} else {
  console.log('Usage: node migrate.js <json_file>')
}
