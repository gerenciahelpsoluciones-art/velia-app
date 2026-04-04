import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://matyjysinegbibdwzhoq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y0VR9m4LtJRlSoKRq_c3OQ_10ViUr3n'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
