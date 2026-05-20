import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="not-found-shell">
      <div class="not-found-card">
        <h1>404</h1>
        <h2>Página no encontrada</h2>
        <p>La página que buscas no existe o el enlace no es válido.</p>
        <a routerLink="/login" class="btn-primary">Ir al inicio</a>
      </div>
    </main>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0f172a;
      color: white;
      font-family: system-ui, sans-serif;
    }
    .not-found-shell {
      text-align: center;
      padding: 24px;
    }
    .not-found-card {
      max-width: 400px;
    }
    h1 {
      font-size: 96px;
      font-weight: 900;
      margin: 0;
      color: #c61d26;
      line-height: 1;
    }
    h2 {
      font-size: 24px;
      margin: 16px 0 8px;
    }
    p {
      color: #94a3b8;
      margin: 0 0 24px;
    }
    .btn-primary {
      display: inline-block;
      background: #c61d26;
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      transition: background 0.2s;
    }
    .btn-primary:hover {
      background: #a0151e;
    }
  `]
})
export class PageNotFoundComponent {}
