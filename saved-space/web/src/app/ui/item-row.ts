import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Item, STATUSES } from '../core/models';
import { StoreService } from '../core/store.service';
import { formatDate } from '../core/dates';
import { hostOf } from '../core/link';
import { Icon } from './icon';

/** One saved item in a list: thumbnail, title (wraps), steps progress, status, due date. */
@Component({
  selector: 'ss-item-row',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="row card" [routerLink]="['/items', item().id]">
      <div class="thumb">
        @if (item().thumb_url) { <img [src]="item().thumb_url" alt="" loading="lazy" referrerpolicy="no-referrer" />
        } @else { <ss-icon [name]="item().kind === 'note' ? 'note' : item().kind === 'youtube' ? 'play' : 'link'" [size]="22" /> }
      </div>
      <div class="body">
        <p class="title">{{ item().title }}</p>
        <p class="meta">
          <span class="pill" [class]="'pill ' + item().status">{{ statusLabel() }}</span>
          @if (prog().total > 0) { <span>{{ prog().done }}/{{ prog().total }} steps</span> }
          @if (item().due_date) { <span>Due {{ due() }}</span> }
          @if (showFolder() && folderName()) { <span>{{ folderName() }}</span> }
          @if (!item().due_date && host()) { <span>{{ host() }}</span> }
        </p>
      </div>
    </a>`,
  styles: `
    .row { display: flex; gap: 12px; padding: 10px; margin-bottom: 10px; text-decoration: none; color: inherit; align-items: flex-start; }
    .thumb { width: 64px; height: 64px; border-radius: 10px; background: var(--line); display: grid; place-items: center; overflow: hidden; flex: none; color: var(--muted); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .body { min-width: 0; flex: 1; }
    .title { margin: 0 0 6px; font-weight: 600; overflow-wrap: anywhere; line-height: 1.3; }
    .meta { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 13px; color: var(--muted); align-items: center; }
  `,
})
export class ItemRow {
  readonly item = input.required<Item>();
  readonly showFolder = input(false);
  private readonly store = inject(StoreService);
  protected readonly prog = computed(() => this.store.progressOf(this.item().id));
  protected readonly statusLabel = computed(() => STATUSES.find((s) => s.value === this.item().status)?.label);
  protected readonly due = computed(() => formatDate(this.item().due_date));
  protected readonly host = computed(() => hostOf(this.item().url));
  protected readonly folderName = computed(() => this.store.folder(this.item().folder_id)?.name);
}
