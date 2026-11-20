import { Injectable, inject } from '@angular/core';
import { API_BASE } from './env.generated';
import { AuthService } from './auth.service';
import { PreviewResult } from './models';

export type PreviewOutcome = { ok: true; preview: PreviewResult } | { ok: false; message: string };

@Injectable({ providedIn: 'root' })
export class PreviewService {
  private readonly auth = inject(AuthService);

  /** Asks our own API for the title and picture. The API fetches the page safely; the browser never does. */
  async fetch(url: string): Promise<PreviewOutcome> {
    try {
      const token = await this.auth.accessToken();
      if (!token) return { ok: false, message: 'Please sign in again.' };
      const res = await fetch(`${API_BASE}/api/preview?url=${encodeURIComponent(url)}`, {
        headers: { 'X-Access-Token': token },
        signal: AbortSignal.timeout(10000),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: (body as { error?: string }).error ?? 'Could not load a preview.' };
      return { ok: true, preview: body as PreviewResult };
    } catch {
      return { ok: false, message: 'Could not load a preview. You can still save the link.' };
    }
  }
}
