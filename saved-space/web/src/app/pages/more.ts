import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { InstallService } from '../core/install.service';
import { StoreService } from '../core/store.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../ui/icon';

@Component({
  selector: 'ss-more',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page tab">
      <div class="page-header"><h1 class="page-title">More</h1></div>

      <h2>Account</h2>
      <div class="card pad">
        <p class="muted" style="margin:0 0 12px">Signed in as</p>
        <p style="margin:0 0 14px; overflow-wrap:anywhere"><strong>{{ auth.email() }}</strong></p>
        <button (click)="logout()"><ss-icon name="logout" /> Log out</button>
      </div>

      <h2>Put it on your home screen</h2>
      <div class="card pad">
        @if (install.installed) {
          <p style="margin:0"><ss-icon name="check" /> Saved Space is installed on this device.</p>
        } @else {
          @if (install.canPrompt()) {
            <button class="btn-primary btn-block" (click)="install.prompt()">Install Saved Space</button>
          }
          @if (install.isIos || !install.isAndroid) {
            <p><strong>iPhone</strong></p>
            <ol>
              <li>Open this page in <strong>Safari</strong> (not inside another app).</li>
              <li>Tap the <strong>Share</strong> button <ss-icon name="share" [size]="16" /> at the bottom.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
            </ol>
          }
          @if (install.isAndroid || !install.isIos) {
            <p><strong>Android</strong></p>
            <ol>
              <li>Open this page in <strong>Chrome</strong>.</li>
              <li>Tap the menu (three dots) at the top right.</li>
              <li>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>), then <strong>Install</strong>.</li>
            </ol>
          }
        }
      </div>

      <h2>About</h2>
      <div class="card pad"><p class="muted" style="margin:0">Saved Space, Phase 1. Your folders and items are private to your login.</p></div>
    </div>`,
  styles: `ol { margin: 0 0 12px; padding-left: 20px; } li { margin-bottom: 6px; }`,
})
export class More {
  protected readonly auth = inject(AuthService);
  protected readonly install = inject(InstallService);
  private readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    if (!(await this.toast.confirm('Log out?', 'You will need a new email code to sign in again.', 'Log out'))) return;
    await this.auth.logout();
    this.store.clear();
    await this.router.navigateByUrl('/login');
  }
}
