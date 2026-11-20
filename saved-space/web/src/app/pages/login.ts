import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { SupabaseService } from '../core/supabase.service';
import { Icon } from '../ui/icon';

@Component({
  selector: 'ss-login',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell"><main class="app-scroll">
      <div class="page login">
        <div class="logo"><ss-icon name="bookmark" [size]="30" /></div>
        <h1>Saved Space</h1>
        <p class="muted">Save things you want to come back to, then work through them.</p>

        @if (!configured) {
          <div class="card pad"><p><strong>Not connected yet.</strong></p><p class="muted">The app has no Supabase key. See the README, step "Connect the app".</p></div>
        } @else if (step() === 'email') {
          <form (submit)="$event.preventDefault(); send()">
            <label class="field" for="email">Your email</label>
            <input id="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" [value]="email()" (input)="email.set($any($event.target).value)" />
            <button class="btn-primary btn-block" style="margin-top:16px" [disabled]="busy() || !email().includes('@')">Send me a code</button>
          </form>
        } @else {
          <form (submit)="$event.preventDefault(); check()">
            <p>We sent a 6 digit code to <strong>{{ email() }}</strong>.</p>
            <label class="field" for="code">6 digit code</label>
            <input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" [value]="code()" (input)="code.set($any($event.target).value.replace(/\\D/g, ''))" />
            <button class="btn-primary btn-block" style="margin-top:16px" [disabled]="busy() || code().length !== 6">Sign in</button>
            <button type="button" class="btn-ghost btn-block" [disabled]="busy()" (click)="back()">Use a different email</button>
          </form>
        }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </div>
    </main></div>`,
  styles: `
    .login { padding-top: 15vh; }
    .logo { width: 56px; height: 56px; border-radius: 16px; background: var(--accent); color: #fff; display: grid; place-items: center; margin-bottom: 16px; }
    h1 { margin: 0 0 6px; font-size: 28px; }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly configured = inject(SupabaseService).configured;

  protected readonly step = signal<'email' | 'code'>('email');
  protected readonly email = signal(safeGet('ss_last_email'));
  protected readonly code = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected async send(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    const err = await this.auth.sendCode(this.email());
    this.busy.set(false);
    if (err) return this.error.set(err);
    try { localStorage.setItem('ss_last_email', this.email().trim()); } catch { /* optional convenience */ }
    this.step.set('code');
  }

  protected async check(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    const err = await this.auth.verify(this.email(), this.code());
    this.busy.set(false);
    if (err) return this.error.set(err);
    await this.router.navigateByUrl('/');
  }

  protected back(): void {
    this.step.set('email');
    this.code.set('');
    this.error.set('');
  }
}

function safeGet(key: string): string {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}
