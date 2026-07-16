/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env.VITE_SUPABASE_URL
  : process.env.VITE_SUPABASE_URL;

const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : process.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseUrl.trim() !== '' && supabaseAnonKey && supabaseAnonKey.trim() !== '';

// Fail fast with a clear error rather than silently connecting to a dummy domain.
if (!isConfigured) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. ' +
    'Check your .env file. The app will run in degraded/offline mode.'
  );
}

const safeUrl = isConfigured ? supabaseUrl.trim() : 'https://placeholder.supabase.co';
const safeAnonKey = isConfigured ? supabaseAnonKey.trim() : 'placeholder-anon-key';

export const supabase = createClient(
  safeUrl,
  safeAnonKey,
  {
    realtime: {
      params: {
        /** Maximum Supabase Realtime events per second per channel. */
        eventsPerSecond: 10,
      },
    },
  }
);

// Secure service role client for ingestion and backend processes
const serviceRoleKey = (typeof process !== 'undefined') ? process.env.SUPABASE_SERVICE_ROLE_KEY : null;
export const supabaseAdmin = serviceRoleKey 
  ? createClient(safeUrl, serviceRoleKey)
  : supabase;

export async function fetchPaginatedData<T = any>(
  table: string,
  buildQuery: (query: any) => any,
  pageSize = 1000
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;
  while (true) {
    let query = supabase.from(table).select('*').range(from, from + pageSize - 1);
    query = buildQuery(query);
    const { data, error } = await query;
    if (error) throw error;
    allRows = allRows.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}
