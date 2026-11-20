import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { ToastService } from '../core/toast.service';
import { Autogrow } from '../ui/autogrow';
import { Icon } from '../ui/icon';
import { Empty, Skeleton } from '../ui/states';

@Component({
  selector: 'ss-folders',
  imports: [RouterLink, Icon, Autogrow, Skeleton, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page tab">
      <div class="page-header">
        <h1 class="page-title">Saved Space</h1>
        @if (store.folders().length > 0) {
          <button class="btn-small" (click)="editing.set(!editing())">{{ editing() ? 'Done' : 'Edit folders' }}</button>
        }
      </div>

      @if (!store.loaded()) { <ss-skeleton [count]="4" />
      } @else if (store.loadError(); as err) {
        <div class="card pad"><p>{{ err }}</p><button (click)="store.load()">Try again</button></div>
      } @else {
        @if (store.folders().length === 0) {
          <ss-empty title="No folders yet" text="Folders keep your saved links in groups, like Work or Gym.">
            <button class="btn-primary" (click)="store.addSuggestedFolders()">Add Work, Gym, Food, Goals</button>
          </ss-empty>
        }
        @for (f of store.folders(); track f.id; let first = $first; let last = $last) {
          @if (editing()) {
            <div class="card pad edit-row">
              <ss-icon [name]="f.icon" />
              <textarea ssAutogrow [ssAutogrow]="f.name" [value]="f.name" aria-label="Folder name" maxlength="80"
                (keydown.enter)="$event.preventDefault(); $any($event.target).blur()" (blur)="rename(f.id, $any($event.target).value)"></textarea>
              <button class="btn-icon" aria-label="Move up" [disabled]="first" (click)="store.moveFolder(f.id, -1)"><ss-icon name="up" /></button>
              <button class="btn-icon" aria-label="Move down" [disabled]="last" (click)="store.moveFolder(f.id, 1)"><ss-icon name="down" /></button>
              <button class="btn-icon btn-danger" aria-label="Delete folder" (click)="remove(f.id, f.name)"><ss-icon name="trash" /></button>
            </div>
          } @else {
            <a class="card pad folder" [routerLink]="['/folders', f.id]">
              <ss-icon [name]="f.icon" [size]="24" />
              <span class="name">{{ f.name }}</span>
              <span class="muted count">{{ openCount()[f.id] ?? 0 }} to do</span>
            </a>
          }
        }
        <form class="new" (submit)="$event.preventDefault(); add()">
          <input aria-label="New folder name" placeholder="New folder" maxlength="80" [value]="newName()" (input)="newName.set($any($event.target).value)" />
          <button class="btn-primary" [disabled]="!newName().trim()">Add</button>
        </form>
      }
    </div>`,
  styles: `
    .folder { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; text-decoration: none; color: inherit; }
    .name { flex: 1; font-weight: 600; overflow-wrap: anywhere; }
    .count { font-size: 13px; white-space: nowrap; }
    .edit-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; padding: 10px; }
    .edit-row ss-icon:first-child { margin-top: 12px; }
    .edit-row textarea { flex: 1; min-width: 0; }
    .new { display: flex; gap: 8px; margin-top: 16px; }
  `,
})
export class Folders {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  protected readonly editing = signal(false);
  protected readonly newName = signal('');
  protected readonly openCount = computed(() => {
    const out: Record<string, number> = {};
    for (const i of this.store.items()) if (i.status !== 'done') out[i.folder_id] = (out[i.folder_id] ?? 0) + 1;
    return out;
  });

  protected async add(): Promise<void> {
    const name = this.newName();
    this.newName.set('');
    await this.store.addFolder(name);
  }

  protected rename(id: string, value: string): void {
    if (!value.trim()) return void this.toast.show('A folder needs a name.');
    void this.store.renameFolder(id, value);
  }

  protected async remove(id: string, name: string): Promise<void> {
    const n = this.store.items().filter((i) => i.folder_id === id).length;
    const msg = n > 0 ? `"${name}" and the ${n} saved ${n === 1 ? 'item' : 'items'} inside it will be deleted.` : `"${name}" will be deleted.`;
    if (await this.toast.confirm('Delete this folder?', msg)) await this.store.deleteFolder(id);
  }
}
