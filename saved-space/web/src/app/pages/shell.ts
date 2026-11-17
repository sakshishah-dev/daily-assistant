import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { StoreService } from '../core/store.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../ui/icon';

/** The signed-in frame: a scrolling page with the tab bar BELOW it (not floating over it). */
@Component({
  selector: 'ss-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell" [class.no-tabs]="hideTabs()">
      @if (!online()) { <div class="banner" role="status">You are offline. Changes will not be saved.</div> }
      @if (store.stale() && online()) { <div class="banner" role="status">Showing your last saved copy.</div> }
      <main class="app-scroll" #scroller><router-outlet /></main>
      @if (!hideTabs()) {
        <nav class="bottom-nav" aria-label="Main">
          <a routerLink="/" [class.active]="isFolders()"><ss-icon name="folder" /><span>Folders</span></a>
          <a routerLink="/today" routerLinkActive="active"><ss-icon name="calendar" /><span>Today</span></a>
          <a routerLink="/search" routerLinkActive="active"><ss-icon name="search" /><span>Search</span></a>
          <a routerLink="/more" routerLinkActive="active"><ss-icon name="more" /><span>More</span></a>
        </nav>
      }
      @if (toast.message(); as m) { <div class="toast" role="status">{{ m }}</div> }
      @if (toast.confirmRequest(); as c) {
        <div class="sheet-back" (click)="toast.answer(false)">
          <div class="sheet" role="alertdialog" aria-modal="true" (click)="$event.stopPropagation()">
            <h3>{{ c.title }}</h3>
            <p class="muted">{{ c.message }}</p>
            <div class="actions">
              <button (click)="toast.answer(false)">Cancel</button>
              <button class="btn-danger" (click)="toast.answer(true)">{{ c.confirmLabel }}</button>
            </div>
          </div>
        </div>
      }
    </div>`,
})
export class Shell {
  protected readonly store = inject(StoreService);
  protected readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected readonly online = signal(navigator.onLine);
  private readonly url = signal(this.router.url);
  /** Forms and the item screen use the whole height (more room for the keyboard). */
  protected readonly hideTabs = computed(() => /^\/items(\/|$)/.test(this.url()));
  protected readonly isFolders = computed(() => /^\/(folders\/|$)/.test(this.url().split('?')[0]));

  constructor() {
    void this.store.load();
    window.addEventListener('online', () => { this.online.set(true); if (this.store.stale()) void this.store.load(); });
    window.addEventListener('offline', () => this.online.set(false));
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.url.set(e.urlAfterRedirects);
      // Never window.scrollTo here: the document is locked, the page scrolls inside .app-scroll.
      queueMicrotask(() => { const el = this.scroller()?.nativeElement; if (el) el.scrollTop = 0; });
    });
  }
}
