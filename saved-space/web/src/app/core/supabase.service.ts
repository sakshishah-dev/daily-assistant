import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './env.generated';

/** The browser only ever holds the project address and the PUBLISHABLE key. Row Level Security protects the data. */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly configured = Boolean(SUPABASE_URL && SUPABASE_KEY);
  readonly client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY || 'missing-key', {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
}
