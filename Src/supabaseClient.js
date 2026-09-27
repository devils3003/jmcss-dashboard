Import {createClient} from 'supabase/supabase-js'

Const supabaseUrl = import.meta.env.vite_supabase_url
Cont supabaseAnonKey = import.meta.env.vite_supabase_anon_key

Export const supabase = creatClient(supabaseUrl, supabaseAnonKey)