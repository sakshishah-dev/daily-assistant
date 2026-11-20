import { BrowserContext, Route } from '@playwright/test';

type Row = Record<string, any>;

/**
 * A small in-memory stand-in for Supabase (login + the three ss_ tables), so the real built app can be driven end to end
 * without any account or network. It mimics what Row Level Security does for one user: foreign keys cascade on delete.
 */
export class FakeSupabase {
  tables: Record<string, Row[]> = { ss_folders: [], ss_items: [], ss_subtasks: [] };
  previewHeaders: Record<string, string>[] = [];
  previewUrls: string[] = [];
  readonly user = { id: 'user-1', aud: 'authenticated', role: 'authenticated', email: 'sakshi@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

  private session() {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    return { access_token: 'fake.jwt.token', token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'refresh', user: this.user };
  }

  async install(ctx: BrowserContext): Promise<void> {
    await ctx.route('https://fake.supabase.co/**', (r) => this.handle(r));
    await ctx.route('**/api/preview**', (r) => this.preview(r));
    // Thumbnails and embeds are not part of this test; keep the browser off the real internet.
    await ctx.route(/(ytimg\.com|youtube-nocookie\.com|instagram\.com|example\.com)/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
  }

  private cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };

  private json(route: Route, status: number, body?: unknown) {
    return route.fulfill({ status, headers: { ...this.cors, 'content-type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
  }

  private preview(route: Route) {
    const req = route.request();
    this.previewHeaders.push(req.headers());
    const url = new URL(req.url()).searchParams.get('url') ?? '';
    this.previewUrls.push(url);
    if (url.includes('instagram.com')) return this.json(route, 200, { kind: 'instagram', url, title: null, thumbnailUrl: null, provider: 'Instagram' });
    return this.json(route, 200, { kind: 'youtube', url, title: 'Full body workout', thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', provider: 'YouTube' });
  }

  private async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: this.cors });

    if (url.pathname === '/auth/v1/otp') return this.json(route, 200, {});
    if (url.pathname === '/auth/v1/verify') {
      const body = req.postDataJSON();
      return body.token === '123456' ? this.json(route, 200, this.session()) : this.json(route, 400, { error: 'invalid', error_description: 'Token has expired or is invalid' });
    }
    if (url.pathname === '/auth/v1/logout') return this.json(route, 204);
    if (url.pathname === '/auth/v1/user') return this.json(route, 200, this.user);
    if (url.pathname === '/auth/v1/token') return this.json(route, 200, this.session());

    const m = url.pathname.match(/^\/rest\/v1\/(ss_\w+)$/);
    if (!m) return this.json(route, 404, { message: 'not found' });
    const table = m[1];
    const rows = this.tables[table];

    const matches = (row: Row) =>
      [...url.searchParams.entries()].every(([k, v]) => {
        if (['select', 'order', 'limit', 'offset', 'columns'].includes(k)) return true;
        const mm = v.match(/^eq\.(.*)$/);
        return mm ? String(row[k]) === mm[1] : true;
      });

    switch (req.method()) {
      case 'GET': {
        let out = rows.filter(matches);
        const order = (url.searchParams.get('order') ?? '').split(',').filter(Boolean);
        out = [...out].sort((a, b) => {
          for (const o of order) {
            const [col, dir] = o.split('.');
            const cmp = a[col] === b[col] ? 0 : a[col] > b[col] ? 1 : -1;
            if (cmp) return dir === 'desc' ? -cmp : cmp;
          }
          return 0;
        });
        return this.json(route, 200, out);
      }
      case 'POST': {
        const body = req.postDataJSON();
        for (const row of Array.isArray(body) ? body : [body]) rows.push({ ...row, user_id: this.user.id });
        return this.json(route, 201);
      }
      case 'PATCH': {
        const patch = req.postDataJSON();
        rows.filter(matches).forEach((r) => Object.assign(r, patch));
        return this.json(route, 204);
      }
      case 'DELETE': {
        const gone = rows.filter(matches).map((r) => r.id);
        this.tables[table] = rows.filter((r) => !gone.includes(r.id));
        if (table === 'ss_folders') {
          const itemIds = this.tables.ss_items.filter((i) => gone.includes(i.folder_id)).map((i) => i.id);
          this.tables.ss_items = this.tables.ss_items.filter((i) => !gone.includes(i.folder_id));
          this.tables.ss_subtasks = this.tables.ss_subtasks.filter((s) => !itemIds.includes(s.item_id));
        }
        if (table === 'ss_items') this.tables.ss_subtasks = this.tables.ss_subtasks.filter((s) => !gone.includes(s.item_id));
        return this.json(route, 204);
      }
    }
    return this.json(route, 405, {});
  }
}
