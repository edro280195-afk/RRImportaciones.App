import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FeedbackHostComponent } from './shared/feedback/feedback-host.component';
import { UpdateBannerComponent } from './shared/update-banner.component';
import { AppUpdateService } from './services/app-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FeedbackHostComponent, UpdateBannerComponent],
  template: `<app-feedback-host /><app-update-banner /><router-outlet />`,
})
export class AppComponent {
  private update = inject(AppUpdateService);

  constructor() {
    // Se vigila desde la raíz para que el aviso también salga en campo, entrega
    // y login, que no pasan por AppLayout.
    this.update.iniciar();
  }
}
