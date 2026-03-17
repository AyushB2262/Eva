import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase connection parameters missing. Eva will operate in local-only mode.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Database Interface Definitions
export interface Memory {
  id?: number;
  user_id: string;
  fact: string;
  vector: number[];
  timestamp?: string;
}

export interface SessionLog {
  id?: number;
  user_id: string;
  session_id: string;
  role: 'user' | 'eva';
  content: string;
  timestamp?: string;
}
