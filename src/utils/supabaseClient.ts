import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'dummy-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
      transport: ws
    }
  }
});
