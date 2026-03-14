import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hwkmlpecremarewlgchk.supabase.co'
const supabaseAnonKey = 'sb_publishable_Nc1RchVnqO07r8aXgR8Lug_gY5sUm_0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)