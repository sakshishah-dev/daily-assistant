import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { StoreService } from '../core/store.service';
import { matchesSearch } from '../core/logic';
import { Status, STATUSES } from '../core/models';
import { ItemRow } from '../ui/item-row';
import { Empty, Skeleton } from '../ui/states';

@Component({
  selector: 'ss-search',
  imports: [ItemRow, Skeleton, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page tab">
      <div class="page-header"><h1 class="page-title">Search</h1></div>
      <input type="search" aria-label="Search your saved items" placeholder="Title, note, link or step" enterkeyhint="search"
        [value]="query()" (input)="query.set($any($event.target).value)" />
      <div class="chips" style="margin-top:12px" role="group" aria-label="Filter by folder">
        <button class="chip" [attr.aria-pressed]="folder() === ''" (click)="folder.set('')">All folders</button>
        @for (f of store.folders(); track f.id) {
          <button class="chip" [attr.aria-pressed]="folder() === f.id" (click)="folder.set(f.id)">{{ f.name }}</button>
        }
      </div>
      <div class="chips" role="group" aria-label="Filter by status">
        <button class="chip" [attr.aria-pressed]="status() === 'all'" (click)="status.set('all')">Any status</button>
        @for (s of statuses; track s.value) {
          <button class="chip" [attr.aria-pressed]="status() === s.value" (click)="status.set(s.value)">{{ s.label }}</button>
        }
      </div>

      @if (!store.loaded()) { <ss-skeleton />
      } @else {
        <p class="muted">{{ results().length }} {{ results().length === 1 ? 'item' : 'items' }}</p>
        @for (i of results(); track i.id) { <ss-item-row [item]="i" [showFolder]="true" /> }
        @if (results().length === 0) { <ss-empty title="Nothing found" text="Try fewer words or clear the filters." /> }
      }
    </div>`,
})
export class Search {
  protected readonly store = inject(StoreService);
  protected readonly statuses = STATUSES;
  protected readonly query = signal('');
  protected readonly folder = signal('');
  protected readonly status = signal<Status | 'all'>('all');

  protected readonly results = computed(() => {
    const byItem = this.store.subtasksByItem();
    return this.store.items().filter(
      (i) =>
        (!this.folder() || i.folder_id === this.folder()) &&
        (this.status() === 'all' || i.status === this.status()) &&
        matchesSearch(i, byItem.get(i.id) ?? [], this.query()),
    );
  });
}
