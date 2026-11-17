import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { InstallService } from './core/install.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  constructor() {
    inject(InstallService); // starts listening for the install prompt as early as possible
    const sw = inject(SwUpdate);
    if (sw.isEnabled) {
      // A new version is picked up on open: reload once so the phone never runs an old copy.
      sw.versionUpdates.subscribe((e) => {
        if (e.type === 'VERSION_READY') document.location.reload();
      });
      void sw.checkForUpdate().catch(() => undefined);
    }
  }
}
