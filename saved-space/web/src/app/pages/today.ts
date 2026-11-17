import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { StoreService } from '../core/store.service';
import { DueGroup, dueGroup, isoDate } from '../core/dates';
import { Item } from '../core/models';
import { ItemRow } from '../ui/item-row';
import { Empty, Skeleton } from '../ui/states';

@Component({
  selector: 'ss-today',
  imports: [ItemRow, Skeleton, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page tab">
      <div class="page-header"><h1 class="page-title">Due soon</h1></div>
      <div class="segmented" role="group" aria-label="Range">
        <button [attr.aria-pressed]="range() === 'today'" (click)="range.set('today')">Today</button>
        <button [attr.aria-pressed]="range() === 'week'" (click)="range.set('week')">This week</button>
      </div>

      @if (!store.loaded()) { <div style="margin-top:16px"><ss-skeleton /></div>
      } @else {
        @for (g of groups(); track g.key) {
          <h2>{{ g.title }}</h2>
          @for (i of g.items; track i.id) { <ss-item-row [item]="i" [showFolder]="true" /> }
        }
        @if (groups().length === 0) {
          <ss-empty [title]="range() === 'today' ? 'Nothing due today' : 'Nothing due this week'" text="Give an item a due date and it will show up here." />
        }
      }
    </div>`,
})
export class Today {
  protected readonly store = inject(StoreService);
  protected readonly range = signal<'today' | 'week'>('today');

  protected readonly groups = computed(() => {
    const today = isoDate(new Date());
    const buckets: Record<DueGroup, Item[]> = { overdue: [], today: [], week: [], later: [], none: [] };
    for (const i of this.store.items()) if (i.status !== 'done') buckets[dueGroup(i.due_date, today)].push(i);
    for (const k of Object.keys(buckets) as DueGroup[]) buckets[k].sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
    const out = [
      { key: 'overdue', title: 'Overdue', items: buckets.overdue },
      { key: 'today', title: 'Today', items: buckets.today },
      ...(this.range() === 'week' ? [{ key: 'week', title: 'Rest of this week', items: buckets.week }] : []),
    ];
    return out.filter((g) => g.items.length > 0);
  });
}
