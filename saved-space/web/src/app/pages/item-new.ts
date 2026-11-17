import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { classify, hostOf, LinkInfo, youtubeThumb } from '../core/link';
import { PreviewService } from '../core/preview.service';
import { StoreService } from '../core/store.service';
import { PreviewResult } from '../core/models';
import { Autogrow } from '../ui/autogrow';
import { Icon } from '../ui/icon';
import { Empty } from '../ui/states';

@Component({
  selector: 'ss-item-new',
  imports: [RouterLink, Icon, Autogrow, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page pt">
      <div class="page-header">
        <a class="btn btn-icon" [routerLink]="folderId() ? ['/folders', folderId()] : ['/']" aria-label="Cancel"><ss-icon name="back" /></a>
        <h1 class="page-title">Save something</h1>
      </div>

      @if (store.loaded() && store.folders().length === 0) {
        <ss-empty title="Make a folder first" text="Items live inside folders."><a class="btn btn-primary" routerLink="/">Go to folders</a></ss-empty>
      } @else {
        <form (submit)="$event.preventDefault(); save()">
          <label class="field" for="link">Link (optional)</label>
          <input id="link" type="url" inputmode="url" autocomplete="off" autocapitalize="none" placeholder="Paste a YouTube, Instagram or web link"
            [value]="url()" (input)="onUrl($any($event.target).value)" (paste)="onPaste($event)" />
          @if (urlError()) { <p class="error">{{ urlError() }}</p> }

          @if (info()) {
            <div class="card preview">
              <div class="thumb">
                @if (thumb()) { <img [src]="thumb()" alt="" referrerpolicy="no-referrer" /> } @else { <ss-icon [name]="info()!.kind === 'youtube' ? 'play' : 'link'" [size]="24" /> }
              </div>
              <div class="pbody">
                <p class="muted" style="margin:0">
                  @if (loading()) { Loading preview... }
                  @else if (preview()) { {{ providerLabel() }} }
                  @else { {{ previewNote() || providerLabel() }} }
                </p>
              </div>
            </div>
          }

          <label class="field" for="title">Title</label>
          <textarea id="title" ssAutogrow [ssAutogrow]="title()" [value]="title()" maxlength="500" placeholder="What is it?"
            (input)="title.set($any($event.target).value); titleTouched = true" (keydown.enter)="$event.preventDefault()"></textarea>

          <label class="field" for="folder">Folder</label>
          <select id="folder" (change)="folderChoice.set($any($event.target).value)">
            @for (f of store.folders(); track f.id) { <option [value]="f.id" [selected]="f.id === folderValue()">{{ f.name }}</option> }
          </select>

          <label class="field" for="note">Note (optional)</label>
          <textarea id="note" ssAutogrow [ssAutogrow]="note()" [value]="note()" maxlength="10000" placeholder="Why did you save this?" (input)="note.set($any($event.target).value)"></textarea>

          <label class="field" for="due">Due date (optional)</label>
          <input id="due" type="date" [value]="due()" (change)="due.set($any($event.target).value)" />

          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          <div class="save-bar">
            <a class="btn" [routerLink]="folderId() ? ['/folders', folderId()] : ['/']">Cancel</a>
            <button class="btn-primary" [disabled]="saving() || !store.loaded() || !folderValue()">{{ saving() ? 'Saving...' : 'Save' }}</button>
          </div>
        </form>
      }
    </div>`,
  styles: `
    .pt { padding-top: 16px; }
    .preview { display: flex; gap: 12px; padding: 10px; margin-top: 12px; align-items: center; }
    .thumb { width: 96px; height: 64px; border-radius: 10px; background: var(--line); display: grid; place-items: center; overflow: hidden; flex: none; color: var(--muted); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .pbody { min-width: 0; flex: 1; }
  `,
})
export class ItemNew {
  /** From the address: /items/new?folder=<id> */
  readonly folder = input<string>();
  protected readonly store = inject(StoreService);
  private readonly previews = inject(PreviewService);
  private readonly router = inject(Router);

  protected readonly url = signal('');
  protected readonly title = signal('');
  protected readonly note = signal('');
  protected readonly due = signal('');
  protected readonly folderChoice = signal('');
  protected readonly info = signal<LinkInfo | null>(null);
  protected readonly preview = signal<PreviewResult | null>(null);
  protected readonly loading = signal(false);
  protected readonly previewNote = signal('');
  protected readonly urlError = signal('');
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected titleTouched = false;

  private timer: ReturnType<typeof setTimeout> | undefined;
  private seq = 0;

  protected readonly folderId = computed(() => this.folder() ?? '');
  protected readonly folderValue = computed(() => {
    const wanted = this.folderChoice() || this.folder();
    const folders = this.store.folders();
    return folders.find((f) => f.id === wanted)?.id ?? folders[0]?.id ?? '';
  });
  protected readonly thumb = computed(() => this.preview()?.thumbnailUrl ?? (this.info()?.kind === 'youtube' ? youtubeThumb(this.info()!.url) : null));
  protected readonly providerLabel = computed(() => {
    const k = this.info()?.kind;
    return k === 'youtube' ? 'YouTube video' : k === 'instagram' ? 'Instagram post' : (this.preview()?.provider ?? hostOf(this.info()?.url ?? null));
  });

  protected onPaste(_e: Event): void {
    // The pasted text arrives in the next input event; look immediately instead of waiting for the pause.
    setTimeout(() => this.lookup(), 0);
  }

  protected onUrl(value: string): void {
    this.url.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.lookup(), 700);
  }

  private async lookup(): Promise<void> {
    clearTimeout(this.timer);
    const raw = this.url().trim();
    const mine = ++this.seq;
    this.preview.set(null);
    this.previewNote.set('');
    this.urlError.set('');
    if (!raw) { this.info.set(null); this.loading.set(false); return; }
    const info = classify(raw);
    if (!info) { this.info.set(null); this.loading.set(false); this.urlError.set('That does not look like a link yet.'); return; }
    this.info.set(info);
    this.loading.set(true);
    const out = await this.previews.fetch(info.url);
    if (mine !== this.seq) return; // a newer link was pasted meanwhile
    this.loading.set(false);
    if (out.ok) {
      this.preview.set(out.preview);
      if (!this.titleTouched && out.preview.title) this.title.set(out.preview.title);
      if (!out.preview.title) this.previewNote.set('No title found. Type your own.');
    } else {
      this.previewNote.set(out.message);
    }
  }

  protected async save(): Promise<void> {
    this.error.set('');
    const raw = this.url().trim();
    const info = raw ? classify(raw) : null;
    if (raw && !info) return this.error.set('That does not look like a link. Clear it to save a plain note.');
    const title = this.title().trim() || (info ? (this.preview()?.title ?? hostOf(info.url)) : '');
    if (!title) return this.error.set('Give it a title.');
    const folder = this.folderValue();
    if (!folder) return this.error.set('Pick a folder.');

    this.saving.set(true);
    const p = this.preview();
    const item = await this.store.addItem({
      folder_id: folder,
      title: title.slice(0, 500),
      url: info?.url ?? null,
      kind: info?.kind ?? 'note',
      thumb_url: p?.thumbnailUrl ?? (info?.kind === 'youtube' ? youtubeThumb(info.url) : null),
      preview_json: p ?? null,
      note: this.note().trim() || null,
      due_date: this.due() || null,
    });
    this.saving.set(false);
    // Go straight to the item so the steps can be added right away.
    await this.router.navigate(['/items', item.id], { replaceUrl: true });
  }
}
