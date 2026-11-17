import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { classify } from '../core/link';
import { formatDate } from '../core/dates';
import { splitLines } from '../core/logic';
import { Item, STATUSES, Status, Subtask } from '../core/models';
import { StoreService } from '../core/store.service';
import { ToastService } from '../core/toast.service';
import { Autogrow } from '../ui/autogrow';
import { Icon } from '../ui/icon';
import { Empty, Skeleton } from '../ui/states';

@Component({
  selector: 'ss-item-detail',
  imports: [RouterLink, Icon, Autogrow, Skeleton, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page pt">
      @if (!store.loaded()) { <ss-skeleton />
      } @else if (!item()) {
        <ss-empty title="This item was not found" text="It may have been deleted."><a class="btn btn-primary" routerLink="/">Back to folders</a></ss-empty>
      } @else {
        @let it = item()!;
        <div class="page-header">
          <a class="btn btn-icon" [routerLink]="['/folders', it.folder_id]" aria-label="Back to folder"><ss-icon name="back" /></a>
          <textarea class="title-edit" ssAutogrow [ssAutogrow]="it.title" [value]="it.title" aria-label="Title" maxlength="500"
            (keydown.enter)="$event.preventDefault(); $any($event.target).blur()" (blur)="saveTitle($any($event.target))"></textarea>
        </div>

        <!-- Preview and open -->
        @if (embed(); as src) {
          <div class="player" [class.tall]="it.kind === 'instagram'">
            <iframe [src]="src" [title]="it.kind === 'youtube' ? 'YouTube video player' : 'Instagram post'" loading="lazy"
              allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
          </div>
        } @else if (it.thumb_url) {
          <img class="hero" [src]="it.thumb_url" alt="" referrerpolicy="no-referrer" />
        }
        @if (it.url) {
          <a class="btn btn-block open" [href]="it.url" target="_blank" rel="noopener noreferrer"><ss-icon name="external" />{{ openLabel() }}</a>
          @if (it.kind === 'instagram') { <p class="muted small">If the post does not show above, Instagram may be blocking embeds. The button always works.</p> }
        }

        <!-- Status -->
        <h2>Status</h2>
        <div class="segmented" role="group" aria-label="Status">
          @for (s of statuses; track s.value) { <button [attr.aria-pressed]="it.status === s.value" (click)="setStatus(it, s.value)">{{ s.label }}</button> }
        </div>
        @if (subs().length > 0 && allTicked() && it.status !== 'done') {
          <div class="card pad hint">
            <p style="margin:0 0 10px">All steps are ticked. Mark this item as done?</p>
            <button class="btn-primary" (click)="setStatus(it, 'done')"><ss-icon name="check" /> Mark as done</button>
          </div>
        }

        <!-- Steps -->
        <h2>Steps @if (subs().length > 0) { <span>({{ doneCount() }}/{{ subs().length }})</span> }</h2>
        @for (s of subs(); track s.id; let first = $first; let last = $last) {
          <div class="step card">
            <input type="checkbox" [checked]="s.done" [attr.aria-label]="'Done: ' + s.text" (change)="store.updateSubtask(s.id, { done: $any($event.target).checked })" />
            <textarea ssAutogrow [ssAutogrow]="s.text" [value]="s.text" [class.struck]="s.done" aria-label="Step text" maxlength="1000"
              (keydown.enter)="$event.preventDefault(); $any($event.target).blur()" (blur)="saveStep(s, $any($event.target))"></textarea>
            <div class="step-actions">
              <button class="btn-icon btn-ghost" aria-label="Move step up" [disabled]="first" (click)="store.moveSubtask(it.id, s.id, -1)"><ss-icon name="up" [size]="18" /></button>
              <button class="btn-icon btn-ghost" aria-label="Move step down" [disabled]="last" (click)="store.moveSubtask(it.id, s.id, 1)"><ss-icon name="down" [size]="18" /></button>
              <button class="btn-icon btn-ghost" aria-label="Delete step" (click)="store.deleteSubtask(s.id)"><ss-icon name="trash" [size]="18" /></button>
            </div>
          </div>
        }
        <div class="add-step card">
          <ss-icon name="plus" />
          <textarea #stepBox ssAutogrow [ssAutogrow]="draft()" [value]="draft()" placeholder="Add a step, press return to add another" enterkeyhint="done" maxlength="4000"
            aria-label="New step" (input)="draft.set($any($event.target).value)" (paste)="onPasteStep($event)" (keydown.enter)="onEnterStep($event)"></textarea>
        </div>
        <p class="muted small">Tip: paste a list with one step per line and each line becomes a step.</p>

        <!-- Details -->
        <h2>Details</h2>
        <label class="field" for="note">Note</label>
        <textarea id="note" ssAutogrow [ssAutogrow]="it.note" [value]="it.note ?? ''" maxlength="10000" placeholder="Add a note" (blur)="saveNote(it, $any($event.target).value)"></textarea>

        <label class="field" for="due">Due date</label>
        <div class="due-row">
          <input id="due" type="date" [value]="it.due_date ?? ''" (change)="store.updateItem(it.id, { due_date: $any($event.target).value || null })" />
          @if (it.due_date) { <button class="btn-small" (click)="store.updateItem(it.id, { due_date: null })">Clear</button> }
        </div>
        @if (it.due_date) { <p class="muted small">Due {{ date(it.due_date) }}</p> }

        <label class="field" for="folder">Folder</label>
        <select id="folder" (change)="store.updateItem(it.id, { folder_id: $any($event.target).value })">
          @for (f of store.folders(); track f.id) { <option [value]="f.id" [selected]="f.id === it.folder_id">{{ f.name }}</option> }
        </select>

        <button class="btn-danger btn-block" style="margin-top:28px" (click)="remove(it)"><ss-icon name="trash" /> Delete this item</button>
      }
    </div>`,
  styles: `
    .pt { padding-top: 16px; }
    .title-edit { flex: 1; min-width: 0; font-size: 20px; font-weight: 700; border-color: transparent; background: transparent; padding: 8px 6px; }
    .title-edit:focus { background: var(--card); border-color: var(--line); }
    .player { position: relative; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden; background: #000; margin-bottom: 12px; }
    .player.tall { aspect-ratio: auto; height: 560px; background: var(--card); border: 1px solid var(--line); }
    iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .hero { width: 100%; max-height: 220px; object-fit: cover; border-radius: 14px; margin-bottom: 12px; display: block; }
    .open { margin-bottom: 4px; }
    .small { font-size: 13px; margin: 6px 0 0; }
    .hint { margin-top: 12px; background: var(--accent-soft); border-color: var(--accent-soft); }
    .step { display: flex; align-items: flex-start; gap: 10px; padding: 8px 8px 8px 12px; margin-bottom: 8px; }
    .step input[type='checkbox'] { margin-top: 10px; }
    .step textarea { flex: 1; min-width: 0; border-color: transparent; padding: 10px 6px; }
    .step textarea:focus { border-color: var(--line); }
    .struck { text-decoration: line-through; color: var(--muted); }
    .step-actions { display: flex; flex: none; }
    .step-actions .btn-icon { width: 36px; min-height: 40px; }
    .add-step { display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; border-style: dashed; }
    .add-step ss-icon { margin-top: 12px; color: var(--accent); }
    .add-step textarea { border-color: transparent; padding: 10px 6px; flex: 1; min-width: 0; }
    .due-row { display: flex; gap: 8px; }
  `,
})
export class ItemDetail {
  readonly id = input.required<string>();
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly stepBox = viewChild<ElementRef<HTMLTextAreaElement>>('stepBox');

  protected readonly statuses = STATUSES;
  protected readonly draft = signal('');
  protected readonly item = computed(() => this.store.item(this.id()));
  protected readonly subs = computed<Subtask[]>(() => this.store.subsOf(this.id()));
  protected readonly doneCount = computed(() => this.subs().filter((s) => s.done).length);
  protected readonly allTicked = computed(() => this.subs().length > 0 && this.doneCount() === this.subs().length);

  /** Embed address is rebuilt from the link every time (validated id), never taken from stored data. */
  protected readonly embed = computed(() => {
    const url = this.item()?.url;
    const info = url ? classify(url) : null;
    return info?.embedUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(info.embedUrl) : null;
  });
  protected readonly openLabel = computed(() => {
    const k = this.item()?.kind;
    return k === 'instagram' ? 'Open in Instagram' : k === 'youtube' ? 'Open on YouTube' : 'Open link';
  });

  protected date(iso: string): string {
    return formatDate(iso);
  }

  protected setStatus(item: Item, status: Status): void {
    if (item.status !== status) void this.store.setStatus(item.id, status);
  }

  protected saveTitle(el: HTMLTextAreaElement): void {
    const item = this.item();
    if (!item) return;
    const v = el.value.trim();
    if (!v) { el.value = item.title; return void this.toast.show('The title cannot be empty.'); }
    if (v !== item.title) void this.store.updateItem(item.id, { title: v.slice(0, 500) });
  }

  protected saveNote(item: Item, value: string): void {
    const v = value.trim() || null;
    if (v !== (item.note ?? null)) void this.store.updateItem(item.id, { note: v });
  }

  protected saveStep(s: Subtask, el: HTMLTextAreaElement): void {
    const v = el.value.trim();
    if (!v) { el.value = s.text; return void this.toast.show('A step cannot be empty. Use the bin to delete it.'); }
    if (v !== s.text) void this.store.updateSubtask(s.id, { text: v.slice(0, 1000) });
  }

  /** Return adds the step and keeps the cursor in the box, so many steps can be typed in a row. */
  protected onEnterStep(e: Event): void {
    e.preventDefault();
    this.commitDraft();
  }

  protected onPasteStep(e: ClipboardEvent): void {
    const text = e.clipboardData?.getData('text') ?? '';
    if (!/\r?\n/.test(text.trim())) return; // single line: normal paste
    e.preventDefault();
    const lines = splitLines(this.draft() + text);
    this.draft.set('');
    void this.store.addSubtasks(this.id(), lines);
  }

  private commitDraft(): void {
    const lines = splitLines(this.draft());
    this.draft.set('');
    this.stepBox()?.nativeElement.focus();
    if (lines.length > 0) void this.store.addSubtasks(this.id(), lines);
  }

  protected async remove(item: Item): Promise<void> {
    if (!(await this.toast.confirm('Delete this item?', `"${item.title}" and its steps will be deleted.`))) return;
    const folder = item.folder_id;
    await this.router.navigate(['/folders', folder], { replaceUrl: true });
    await this.store.deleteItem(item.id);
  }
}
