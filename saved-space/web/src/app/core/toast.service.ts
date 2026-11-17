import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

/** Small messages at the bottom, and a yes/no sheet that replaces the browser's confirm box. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<string | null>(null);
  readonly confirmRequest = signal<ConfirmRequest | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(text: string): void {
    this.message.set(text);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message.set(null), 4000);
  }

  confirm(title: string, message: string, confirmLabel = 'Delete'): Promise<boolean> {
    return new Promise((resolve) => this.confirmRequest.set({ title, message, confirmLabel, resolve }));
  }

  answer(ok: boolean): void {
    this.confirmRequest()?.resolve(ok);
    this.confirmRequest.set(null);
  }
}
