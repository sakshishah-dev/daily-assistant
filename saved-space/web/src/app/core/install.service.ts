import { Injectable, signal } from '@angular/core';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

/** Android Chrome offers a real install button through this event. iPhone has none, so we show steps instead. */
@Injectable({ providedIn: 'root' })
export class InstallService {
  readonly canPrompt = signal(false);
  private event: InstallPromptEvent | null = null;

  readonly isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  readonly isAndroid = /android/i.test(navigator.userAgent);
  readonly installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.event = e as InstallPromptEvent;
      this.canPrompt.set(true);
    });
  }

  async prompt(): Promise<void> {
    await this.event?.prompt();
    this.event = null;
    this.canPrompt.set(false);
  }
}
