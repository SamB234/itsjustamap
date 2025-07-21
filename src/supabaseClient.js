import { createClient } from '@supabase/supabase-js'

// REPLACE these with your Supabase project details:
const supabaseUrl = 'https://msbqgbqfihloqfhagsmu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYnFnYnFmaWhsb3FmaGFnc211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjEzODgsImV4cCI6MjA2ODY5NzM4OH0.8L2PNypfCo_ECVLtaRQOvpASX8RMrt2ftA6drrBsNV0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
