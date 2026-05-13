import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FeedbackHostComponent } from './shared/feedback/feedback-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FeedbackHostComponent],
  template: `<app-feedback-host /><router-outlet />`,
})
export class AppComponent {}
