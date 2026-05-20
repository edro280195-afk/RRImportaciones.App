import { Component } from '@angular/core';

@Component({
  selector: 'app-portal-invalido',
  standalone: true,
  template: `
    <main class="portal-invalido-shell">
      <section class="error-state">
        <p class="eyebrow">R&R Importaciones</p>
        <h1>Enlace inválido</h1>
        <p>El enlace de seguimiento no incluye un identificador válido. Revisa que el enlace esté completo o contacta a R&R para recibir uno nuevo.</p>
        <a class="primary-action" href="https://wa.me/528677221596">Contactar a R&R</a>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: #0f172a;
      font-family: system-ui, sans-serif;
    }
    .portal-invalido-shell {
      width: min(500px, 100%);
      margin: 0 auto;
      padding: 80px 24px;
      text-align: center;
    }
    .error-state {
      background: white;
      border-radius: 24px;
      padding: 48px 32px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);
    }
    .eyebrow {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #c61d26;
      margin: 0 0 8px;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 12px;
    }
    p {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .primary-action {
      display: inline-block;
      background: #c61d26;
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      transition: background 0.2s;
    }
    .primary-action:hover {
      background: #a0151e;
    }
  `]
})
export class PortalInvalidoComponent {}
