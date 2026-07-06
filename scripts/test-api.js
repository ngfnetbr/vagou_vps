
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  console.log(`URL: ${supabaseUrl}`)
  
  const { data, error } = await supabase
    .from('criancas')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Connection failed:', error)
  } else {
    console.log('Connection successful!')
    console.log('Data received:', data)
  }
}

testConnection()
