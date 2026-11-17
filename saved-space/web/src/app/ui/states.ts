import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ss-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (n of rows(); track n) { <div class="skeleton"></div> }`,
  styles: `
    :host { display: block; }
    .skeleton { height: 64px; border-radius: 12px; background: var(--line); margin-bottom: 10px; animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: 0.5; } }
    @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
  `,
})
export class Skeleton {
  readonly count = input(3);
  protected rows() {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}

@Component({
  selector: 'ss-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="empty"><p class="empty-title">{{ title() }}</p>@if (text()) { <p class="muted">{{ text() }}</p> }<ng-content /></div>`,
  styles: `.empty { text-align: center; padding: 32px 16px; } .empty-title { font-weight: 600; margin: 0 0 6px; } .muted { margin: 0 0 14px; }`,
})
export class Empty {
  readonly title = input.required<string>();
  readonly text = input('');
}
