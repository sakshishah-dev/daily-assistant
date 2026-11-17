import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/** Makes a textarea grow with its text, so long titles wrap and stay editable (no one-line inputs). */
@Directive({
  selector: 'textarea[ssAutogrow]',
  host: { '(input)': 'resize()', rows: '1' },
})
export class Autogrow {
  private readonly el = inject<ElementRef<HTMLTextAreaElement>>(ElementRef).nativeElement;
  /** Bind the text so the box also resizes when the value changes from outside. */
  readonly ssAutogrow = input<string | null | undefined>('');

  constructor() {
    effect(() => {
      this.ssAutogrow();
      queueMicrotask(() => this.resize());
    });
    requestAnimationFrame(() => this.resize());
  }

  resize(): void {
    this.el.style.height = 'auto';
    this.el.style.height = this.el.scrollHeight + 2 + 'px';
  }
}
