import { Injectable, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sb = inject(SupabaseService);
  readonly session = signal<Session | null>(null);
  /** False until we know if a saved login exists, so screens do not flash the login page. */
  readonly ready = signal(false);
  readonly email = computed(() => this.session()?.user.email ?? '');
  readonly userId = computed(() => this.session()?.user.id ?? '');

  private readonly init: Promise<void>;

  constructor() {
    this.sb.client.auth.onAuthStateChange((_event, session) => this.session.set(session));
    this.init = this.sb.client.auth
      .getSession()
      .then(({ data }) => this.session.set(data.session))
      .catch(() => this.session.set(null))
      .finally(() => this.ready.set(true));
  }

  whenReady(): Promise<void> {
    return this.init;
  }

  /** Sends a 6 digit code by email. Only invited emails work (new accounts are not created here). */
  async sendCode(email: string): Promise<string | null> {
    const { error } = await this.sb.client.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    return error ? friendly(error.message) : null;
  }

  async verify(email: string, code: string): Promise<string | null> {
    const { error } = await this.sb.client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    return error ? friendly(error.message) : null;
  }

  async logout(): Promise<void> {
    await this.sb.client.auth.signOut();
    this.session.set(null);
  }

  /** Token for the preview API (sent in a header, never in the address). */
  async accessToken(): Promise<string | null> {
    const { data } = await this.sb.client.auth.getSession();
    return data.session?.access_token ?? null;
  }
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('signups not allowed') || m.includes('not allowed') || m.includes('not found')) return 'This email is not on the invite list.';
  if (m.includes('expired') || m.includes('invalid')) return 'That code is wrong or has expired. Ask for a new one.';
  if (m.includes('rate') || m.includes('seconds')) return 'Please wait a moment before asking for another code.';
  if (m.includes('fetch') || m.includes('network')) return 'No connection. Check the internet and try again.';
  return 'Something went wrong. Please try again.';
}
