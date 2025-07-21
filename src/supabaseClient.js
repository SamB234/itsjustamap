import { createClient } from '@supabase/supabase-js'

// REPLACE these with your Supabase project details:
const supabaseUrl = 'https://your-project-url.supabase.co'
const supabaseAnonKey = 'your-anon-public-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
