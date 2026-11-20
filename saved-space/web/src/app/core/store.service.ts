import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { Folder, Item, SUGGESTED_FOLDERS, Subtask } from './models';
import { moved, progress, statusPatch } from './logic';
import { ToastService } from './toast.service';

type Table = 'ss_folders' | 'ss_items' | 'ss_subtasks';

/**
 * All of the user's data in memory. Personal scale (hundreds of rows), so we load it once, then change the screen first
 * and save to Supabase right after. If saving fails we say so and reload the truth from the server.
 * Row Level Security makes sure the server only ever returns this user's rows.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly db = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly folders = signal<Folder[]>([]);
  readonly items = signal<Item[]>([]);
  readonly subtasks = signal<Subtask[]>([]);
  /** True once data arrived from the server or a saved copy (screens show skeletons until then). */
  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);
  /** True when we could not reach the server and are showing the last saved copy. */
  readonly stale = signal(false);

  readonly subtasksByItem = computed(() => {
    const map = new Map<string, Subtask[]>();
    for (const s of this.subtasks()) (map.get(s.item_id) ?? map.set(s.item_id, []).get(s.item_id)!).push(s);
    for (const list of map.values()) list.sort((a, b) => a.sort - b.sort);
    return map;
  });

  folder(id: string): Folder | undefined {
    return this.folders().find((f) => f.id === id);
  }
  item(id: string): Item | undefined {
    return this.items().find((i) => i.id === id);
  }
  subsOf(itemId: string): Subtask[] {
    return this.subtasksByItem().get(itemId) ?? [];
  }
  progressOf(itemId: string) {
    return progress(this.subsOf(itemId));
  }

  async load(): Promise<void> {
    this.loadError.set(null);
    try {
      const [f, i, s] = await Promise.all([
        this.db.from('ss_folders').select('*').order('sort', { ascending: true }).order('created_at'),
        this.db.from('ss_items').select('*').order('created_at', { ascending: false }),
        this.db.from('ss_subtasks').select('*').order('sort', { ascending: true }),
      ]);
      const err = f.error ?? i.error ?? s.error;
      if (err) throw new Error(err.message);
      this.folders.set(f.data as Folder[]);
      this.items.set(i.data as Item[]);
      this.subtasks.set(s.data as Subtask[]);
      this.stale.set(false);
      this.saveCopy();
    } catch (e) {
      if (!this.readCopy()) this.loadError.set(isTableMissing(e) ? 'The Saved Space tables are not set up yet. Run the SQL file first (see the README).' : 'Could not load your data. Check the internet and try again.');
      else this.stale.set(true);
    } finally {
      this.loaded.set(true);
    }
  }

  clear(): void {
    this.folders.set([]);
    this.items.set([]);
    this.subtasks.set([]);
    this.loaded.set(false);
    this.stale.set(false);
  }

  // ---------- folders ----------

  async addFolder(name: string, icon = 'folder'): Promise<Folder | null> {
    const clean = name.trim().slice(0, 80);
    if (!clean) return null;
    const sort = this.folders().reduce((m, f) => Math.max(m, f.sort), -1) + 1;
    const row: Folder = { id: crypto.randomUUID(), name: clean, icon, color: 'green', sort, created_at: new Date().toISOString() };
    this.folders.update((l) => [...l, row]);
    await this.run(this.db.from('ss_folders').insert(row));
    return row;
  }

  async addSuggestedFolders(): Promise<void> {
    const have = new Set(this.folders().map((f) => f.name.toLowerCase()));
    for (const s of SUGGESTED_FOLDERS) if (!have.has(s.name.toLowerCase())) await this.addFolder(s.name, s.icon);
  }

  async renameFolder(id: string, name: string): Promise<void> {
    const clean = name.trim().slice(0, 80);
    if (!clean || this.folder(id)?.name === clean) return;
    this.folders.update((l) => l.map((f) => (f.id === id ? { ...f, name: clean } : f)));
    await this.run(this.db.from('ss_folders').update({ name: clean }).eq('id', id));
  }

  async deleteFolder(id: string): Promise<void> {
    const gone = new Set(this.items().filter((i) => i.folder_id === id).map((i) => i.id));
    this.folders.update((l) => l.filter((f) => f.id !== id));
    this.items.update((l) => l.filter((i) => i.folder_id !== id));
    this.subtasks.update((l) => l.filter((s) => !gone.has(s.item_id)));
    await this.run(this.db.from('ss_folders').delete().eq('id', id)); // items and steps are removed by the database
  }

  async moveFolder(id: string, dir: -1 | 1): Promise<void> {
    const next = moved(this.folders(), id, dir);
    if (next === this.folders()) return;
    const changed: Folder[] = [];
    const renumbered = next.map((f, idx) => {
      if (f.sort !== idx) changed.push({ ...f, sort: idx });
      return f.sort === idx ? f : { ...f, sort: idx };
    });
    this.folders.set(renumbered);
    await Promise.all(changed.map((f) => this.run(this.db.from('ss_folders').update({ sort: f.sort }).eq('id', f.id))));
  }

  // ---------- items ----------

  async addItem(input: Pick<Item, 'folder_id' | 'title' | 'url' | 'kind' | 'thumb_url' | 'preview_json' | 'note' | 'due_date'>): Promise<Item> {
    const sort = this.items().filter((i) => i.folder_id === input.folder_id).reduce((m, i) => Math.max(m, i.sort), -1) + 1;
    const row: Item = { ...input, id: crypto.randomUUID(), status: 'todo', done_at: null, sort, created_at: new Date().toISOString() };
    this.items.update((l) => [row, ...l]);
    await this.run(this.db.from('ss_items').insert(row));
    return row;
  }

  async updateItem(id: string, patch: Partial<Omit<Item, 'id' | 'created_at'>>): Promise<void> {
    this.items.update((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await this.run(this.db.from('ss_items').update(patch).eq('id', id));
  }

  setStatus(id: string, status: Item['status']): Promise<void> {
    return this.updateItem(id, statusPatch(status));
  }

  async deleteItem(id: string): Promise<void> {
    this.items.update((l) => l.filter((i) => i.id !== id));
    this.subtasks.update((l) => l.filter((s) => s.item_id !== id));
    await this.run(this.db.from('ss_items').delete().eq('id', id));
  }

  // ---------- subtasks ----------

  async addSubtasks(itemId: string, texts: string[]): Promise<void> {
    if (texts.length === 0) return;
    let sort = this.subsOf(itemId).reduce((m, s) => Math.max(m, s.sort), -1) + 1;
    const now = new Date().toISOString();
    const rows: Subtask[] = texts.map((text) => ({ id: crypto.randomUUID(), item_id: itemId, text, done: false, sort: sort++, created_at: now }));
    this.subtasks.update((l) => [...l, ...rows]);
    await this.run(this.db.from('ss_subtasks').insert(rows));
  }

  async updateSubtask(id: string, patch: Partial<Pick<Subtask, 'text' | 'done'>>): Promise<void> {
    this.subtasks.update((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await this.run(this.db.from('ss_subtasks').update(patch).eq('id', id));
  }

  async deleteSubtask(id: string): Promise<void> {
    this.subtasks.update((l) => l.filter((s) => s.id !== id));
    await this.run(this.db.from('ss_subtasks').delete().eq('id', id));
  }

  async moveSubtask(itemId: string, id: string, dir: -1 | 1): Promise<void> {
    const list = this.subsOf(itemId);
    const next = moved(list, id, dir);
    if (next === list) return;
    const changed: Subtask[] = [];
    const renumbered = next.map((s, idx) => {
      if (s.sort !== idx) changed.push({ ...s, sort: idx });
      return s.sort === idx ? s : { ...s, sort: idx };
    });
    const byId = new Map(renumbered.map((s) => [s.id, s]));
    this.subtasks.update((l) => l.map((s) => byId.get(s.id) ?? s));
    await Promise.all(changed.map((s) => this.run(this.db.from('ss_subtasks').update({ sort: s.sort }).eq('id', s.id))));
  }

  // ---------- helpers ----------

  /** Waits for a save. On failure: tell the user and reload the real data so the screen never lies. */
  private async run(op: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
    try {
      const { error } = await op;
      if (error) throw new Error(error.message);
      this.saveCopy();
    } catch {
      this.toast.show(navigator.onLine ? 'Could not save that. Your list was refreshed.' : 'You are offline. That change was not saved.');
      void this.load();
    }
  }

  private cacheKey(): string {
    return `ss_cache_v1_${this.auth.userId()}`;
  }

  private saveCopy(): void {
    try {
      localStorage.setItem(this.cacheKey(), JSON.stringify({ f: this.folders(), i: this.items(), s: this.subtasks() }));
    } catch {
      /* storage full or blocked: the copy is only a convenience */
    }
  }

  private readCopy(): boolean {
    try {
      const raw = localStorage.getItem(this.cacheKey());
      if (!raw) return false;
      const c = JSON.parse(raw);
      this.folders.set(c.f);
      this.items.set(c.i);
      this.subtasks.set(c.s);
      return true;
    } catch {
      return false;
    }
  }
}


function isTableMissing(e: unknown): boolean {
  return e instanceof Error && /does not exist|schema cache|relation/i.test(e.message);
}
