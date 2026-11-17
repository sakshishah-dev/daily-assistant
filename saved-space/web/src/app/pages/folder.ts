import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { Status, STATUSES } from '../core/models';
import { Icon } from '../ui/icon';
import { ItemRow } from '../ui/item-row';
import { Empty, Skeleton } from '../ui/states';

@Component({
  selector: 'ss-folder',
  imports: [RouterLink, Icon, ItemRow, Skeleton, Empty],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page pt">
      <div class="page-header">
        <a class="btn btn-icon" routerLink="/" aria-label="Back to folders"><ss-icon name="back" /></a>
        <h1 class="page-title">{{ folder()?.name ?? 'Folder' }}</h1>
        @if (folder()) { <a class="btn btn-primary" [routerLink]="['/items/new']" [queryParams]="{ folder: id() }"><ss-icon name="plus" /> Add</a> }
      </div>

      @if (!store.loaded()) { <ss-skeleton />
      } @else if (!folder()) {
        <ss-empty title="This folder was not found" text="It may have been deleted."><button (click)="home()">Back to folders</button></ss-empty>
      } @else {
        <div class="chips" role="group" aria-label="Filter by status">
          <button class="chip" [attr.aria-pressed]="status() === 'all'" (click)="status.set('all')">All</button>
          @for (s of statuses; track s.value) {
            <button class="chip" [attr.aria-pressed]="status() === s.value" (click)="status.set(s.value)">{{ s.label }}</button>
          }
        </div>
        @for (i of shown(); track i.id) { <ss-item-row [item]="i" /> }
        @if (shown().length === 0) {
          <ss-empty [title]="all().length === 0 ? 'Nothing saved here yet' : 'No items with this status'"
            [text]="all().length === 0 ? 'Paste a YouTube or Instagram link, or any web page.' : ''">
            @if (all().length === 0) { <a class="btn btn-primary" [routerLink]="['/items/new']" [queryParams]="{ folder: id() }">Add the first one</a> }
          </ss-empty>
        }
      }
    </div>`,
  styles: `.pt { padding-top: 16px; } .page-header .btn-primary { padding: 8px 14px; }`,
})
export class FolderPage {
  readonly id = input.required<string>();
  protected readonly store = inject(StoreService);
  private readonly router = inject(Router);
  protected readonly statuses = STATUSES;
  protected readonly status = signal<Status | 'all'>('all');

  protected readonly folder = computed(() => this.store.folder(this.id()));
  protected readonly all = computed(() => this.store.items().filter((i) => i.folder_id === this.id()));
  protected readonly shown = computed(() => this.all().filter((i) => this.status() === 'all' || i.status === this.status()));

  protected home(): void {
    void this.router.navigateByUrl('/');
  }
}
