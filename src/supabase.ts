import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mmztdudyztfvvoobtcwx.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_7Hqc3i7W1ClgfrY4PvEvCA_5_gB-idt';

export const supabase = createClient(supabaseUrl, supabaseKey);
