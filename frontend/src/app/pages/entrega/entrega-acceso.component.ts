import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, CampoUserDto } from '../../services/auth.service';
import { EntregaTareaService, EntregaAccesoDto } from '../../services/entrega-tarea.service';

type AccessScreen = 'loading' | 'select-user' | 'enter-pin' | 'set-pin' | 'confirm-pin' | 'lockout' | 'error';

@Component({
  selector: 'app-entrega-acceso',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="access-shell">
      <section class="access-card" [class.access-card--shake]="shaking()">
        <header class="access-brand">
          <img src="assets/imagenes/rr_logo.png" alt="R&R Importaciones" />
          <div>
            <strong>R&R Entregas</strong>
            <span>Acceso para choferes</span>
          </div>
        </header>

        @if (screen() === 'loading') {
          <section class="state-block" aria-live="polite">
            <div class="spinner"></div>
            <h1>Preparando tu entrega</h1>
            <p>Espera un momento…</p>
          </section>
        } @else if (screen() === 'error') {
          <section class="state-block state-block--error" aria-live="assertive">
            <div class="state-icon">!</div>
            <h1>Este enlace no está disponible</h1>
            <p>{{ errorMessage() }}</p>
            <a href="/entrega/pin" class="secondary-button">Entrar al módulo de entregas</a>
          </section>
        } @else {
          @if (access(); as current) {
            <section class="delivery-summary">
            <span class="summary-label">ENTREGA DE VEHÍCULO</span>
            <h1>{{ current.vehiculoResumen }}</h1>
            <p>Folio {{ current.numeroConsecutivo }}</p>
            @if (current.vin) {
              <span class="vin">VIN {{ current.vin }}</span>
            }
          </section>

          @if (screen() === 'select-user') {
            <section class="step-block">
              <span class="step-number">1</span>
              <div>
                <h2>¿Quién va a tomarla?</h2>
                <p>Selecciona tu nombre para continuar.</p>
              </div>
            </section>
            <div class="user-list">
              @for (user of current.usuariosDisponibles; track user.id) {
                <button type="button" class="user-button" (click)="selectUser(user)">
                  <span class="user-avatar">{{ initial(user.nombre) }}</span>
                  <span class="user-text">
                    <strong>{{ user.nombre }} {{ user.apellidos || '' }}</strong>
                    <small>{{ user.tienePin ? 'Listo para ingresar' : 'Configurar PIN al entrar' }}</small>
                  </span>
                  <span class="chevron" aria-hidden="true">›</span>
                </button>
              } @empty {
                <p class="empty-message">No hay choferes disponibles. Pide ayuda al administrador.</p>
              }
            </div>
          } @else if (screen() === 'enter-pin' || screen() === 'set-pin' || screen() === 'confirm-pin') {
            <div class="selected-driver">
              <button type="button" class="back-button" (click)="goBack()" aria-label="Regresar">‹</button>
              <span class="user-avatar">{{ initial(displayName()) }}</span>
              <div>
                <strong>{{ displayName() }}</strong>
                <small>{{ current.tieneChoferAsignado ? 'Entrega asignada para ti' : 'Vas a tomar esta entrega' }}</small>
              </div>
            </div>

            <section class="pin-section">
              <h2>
                @if (screen() === 'set-pin') { Crea tu PIN }
                @else if (screen() === 'confirm-pin') { Confirma tu PIN }
                @else { Ingresa tu PIN }
              </h2>
              <p>
                @if (screen() === 'set-pin') { Usa 6 números que puedas recordar. }
                @else if (screen() === 'confirm-pin') { Escríbelo otra vez para confirmar. }
                @else { Escribe tu PIN de 6 números para entrar. }
              </p>

              <div class="pin-dots" [class.pin-dots--error]="pinError()" aria-live="polite">
                @for (dot of [0, 1, 2, 3, 4, 5]; track dot) {
                  <span [class.pin-dot--filled]="pin().length > dot"></span>
                }
              </div>
              @if (pinError()) {
                <p class="pin-error">{{ pinError() }}</p>
              }

              <div class="keypad" aria-label="Teclado numérico">
                @for (key of keys; track key) {
                  @if (key === 'backspace') {
                    <button type="button" class="key key--action" (click)="pressKey(key)" [disabled]="pin().length === 0" aria-label="Borrar último número">⌫</button>
                  } @else if (key === 'empty') {
                    <span class="key key--empty"></span>
                  } @else {
                    <button type="button" class="key" (click)="pressKey(key)" [attr.aria-label]="'Número ' + key">{{ key }}</button>
                  }
                }
              </div>
              @if (loadingAction()) {
                <div class="action-loading"><div class="spinner spinner--small"></div><span>Validando…</span></div>
              }
            </section>
          } @else if (screen() === 'lockout') {
            <section class="state-block state-block--error">
              <div class="state-icon">!</div>
              <h1>Espera un momento</h1>
              <p>Hubo varios intentos incorrectos. Puedes intentarlo de nuevo en {{ lockoutRemaining() }} segundos.</p>
            </section>
          }
          }
        }
      </section>
      <p class="help-text">Si tienes problemas para entrar, pide un enlace nuevo al administrador.</p>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100dvh; }
    * { box-sizing:border-box; }
    .access-shell { min-height:100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px 16px; background:linear-gradient(145deg,#fff 0%,#f5f7fb 100%); font-family:var(--font-body,Arial,sans-serif); color:#0d1017; }
    .access-card { width:100%; max-width:430px; background:#fff; border:1px solid #e4e7ec; border-radius:24px; padding:24px; box-shadow:0 18px 55px rgba(13,16,23,.10); position:relative; }
    .access-card--shake { animation:shake .42s ease; }
    .access-brand { display:flex; align-items:center; gap:12px; padding-bottom:20px; border-bottom:1px solid #eef0f3; }
    .access-brand img { width:44px; height:44px; border-radius:12px; object-fit:contain; }
    .access-brand strong,.access-brand span { display:block; }
    .access-brand strong { font-size:17px; font-weight:800; }
    .access-brand span { color:#7a8190; font-size:12px; margin-top:2px; }
    .delivery-summary { padding:22px 0 18px; }
    .summary-label { display:inline-flex; padding:5px 9px; border-radius:7px; color:#166534; background:#dcfce7; font-size:10px; font-weight:800; letter-spacing:.08em; }
    .delivery-summary h1 { margin:12px 0 4px; font-size:24px; line-height:1.15; font-weight:850; }
    .delivery-summary p { margin:0; color:#697181; font-size:14px; }
    .vin { display:inline-block; margin-top:12px; padding:9px 11px; border-radius:9px; background:#f6f7f9; color:#424957; font:700 12px/1.2 'JetBrains Mono',monospace; letter-spacing:.04em; }
    .step-block { display:flex; gap:12px; align-items:flex-start; padding:14px 0 12px; }
    .step-number { width:30px; height:30px; border-radius:50%; display:grid; place-items:center; flex:0 0 auto; color:#fff; background:#c61d26; font-weight:800; }
    .step-block h2,.pin-section h2 { margin:0; font-size:18px; font-weight:800; }
    .step-block p,.pin-section p { margin:4px 0 0; color:#697181; font-size:13px; line-height:1.45; }
    .user-list { display:grid; gap:9px; }
    .user-button { display:flex; align-items:center; gap:12px; min-height:68px; width:100%; padding:12px; text-align:left; border:1px solid #e4e7ec; border-radius:14px; background:#fff; cursor:pointer; transition:.15s; }
    .user-button:hover,.user-button:focus-visible { border-color:#c61d26; background:#fffafa; outline:none; }
    .user-avatar { width:42px; height:42px; flex:0 0 auto; display:grid; place-items:center; border-radius:50%; color:#fff; background:linear-gradient(135deg,#c61d26,#7c0d11); font-size:17px; font-weight:800; }
    .user-text { min-width:0; flex:1; }
    .user-text strong,.user-text small,.selected-driver strong,.selected-driver small { display:block; }
    .user-text strong { font-size:14px; }
    .user-text small,.selected-driver small { color:#7a8190; font-size:12px; margin-top:3px; }
    .chevron { color:#a0a7b2; font-size:28px; line-height:1; }
    .selected-driver { display:flex; align-items:center; gap:11px; padding:9px 0 18px; border-bottom:1px solid #eef0f3; }
    .selected-driver div { min-width:0; flex:1; }
    .selected-driver strong { font-size:15px; }
    .back-button { width:38px; height:38px; border:1px solid #e4e7ec; border-radius:11px; background:#fff; color:#606878; font-size:29px; line-height:1; cursor:pointer; }
    .pin-section { padding-top:21px; text-align:center; }
    .pin-dots { display:flex; justify-content:center; gap:12px; margin:20px 0 9px; }
    .pin-dots span { width:15px; height:15px; border-radius:50%; border:2px solid #cbd0d8; background:#fff; }
    .pin-dots span.pin-dot--filled { border-color:#c61d26; background:#c61d26; }
    .pin-dots--error span { border-color:#f87171; background:#fee2e2; }
    .pin-error { color:#b42318 !important; font-weight:700; min-height:20px; }
    .keypad { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:14px; }
    .key { min-height:58px; border:1px solid #e0e4ea; border-radius:13px; background:#f9fafb; color:#10141d; font-size:22px; font-weight:750; cursor:pointer; }
    .key:active { transform:scale(.96); }
    .key:disabled { opacity:.45; cursor:not-allowed; }
    .key--action { color:#b42318; background:#fff1f1; border-color:#fecaca; }
    .key--empty { border-color:transparent; background:transparent; }
    .action-loading { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:14px; color:#697181; font-size:13px; }
    .state-block { text-align:center; padding:48px 8px 28px; }
    .state-block h1 { margin:16px 0 7px; font-size:21px; font-weight:800; }
    .state-block p { margin:0 auto; max-width:300px; color:#697181; font-size:14px; line-height:1.5; }
    .state-block--error .state-icon { background:#fee2e2; color:#b42318; }
    .state-icon { width:52px; height:52px; margin:auto; border-radius:50%; display:grid; place-items:center; background:#e0f2fe; color:#0369a1; font-size:26px; font-weight:900; }
    .secondary-button { display:inline-flex; align-items:center; justify-content:center; min-height:46px; margin-top:22px; padding:0 16px; border:1px solid #d9dee7; border-radius:11px; color:#424957; text-decoration:none; font-size:13px; font-weight:700; }
    .spinner { width:30px; height:30px; margin:auto; border:3px solid #e5e7eb; border-top-color:#c61d26; border-radius:50%; animation:spin .8s linear infinite; }
    .spinner--small { width:18px; height:18px; margin:0; border-width:2px; }
    .help-text { max-width:360px; margin:14px 0 0; color:#8a91a0; text-align:center; font-size:12px; line-height:1.4; }
    @keyframes spin { to { transform:rotate(360deg); } }
    @keyframes shake { 25% { transform:translateX(-7px); } 50% { transform:translateX(7px); } 75% { transform:translateX(-4px); } }
    @media (max-width:420px) { .access-card { padding:19px; border-radius:20px; } .delivery-summary h1 { font-size:21px; } }
  `],
})
export class EntregaAccesoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly entregaService = inject(EntregaTareaService);

  readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', 'empty'];
  readonly screen = signal<AccessScreen>('loading');
  readonly access = signal<EntregaAccesoDto | null>(null);
  readonly selectedUser = signal<CampoUserDto | null>(null);
  readonly pin = signal('');
  readonly pinError = signal('');
  readonly errorMessage = signal('El enlace pudo haber vencido, sido utilizado o cancelado.');
  readonly loadingAction = signal(false);
  readonly shaking = signal(false);
  readonly attempts = signal(0);
  readonly lockoutRemaining = signal(0);
  private readonly token = signal('');
  private firstPin = '';
  private lockoutTimer?: number;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() || '';
    this.token.set(token);
    if (!token) {
      this.showError('El enlace no contiene una entrega válida.');
      return;
    }

    this.entregaService.getAcceso(token).subscribe({
      next: access => this.prepareAccess(access),
      error: error => this.showError(this.httpMessage(error)),
    });
  }

  selectUser(user: CampoUserDto): void {
    this.selectedUser.set(user);
    this.pin.set('');
    this.pinError.set('');
    this.screen.set(user.tienePin ? 'enter-pin' : 'set-pin');
  }

  goBack(): void {
    const current = this.access();
    if (!current || current.tieneChoferAsignado) return;
    this.selectedUser.set(null);
    this.pin.set('');
    this.pinError.set('');
    this.screen.set('select-user');
  }

  pressKey(key: string): void {
    if (this.loadingAction() || this.screen() === 'lockout') return;
    if (key === 'backspace') {
      this.pin.update(value => value.slice(0, -1));
      this.pinError.set('');
      return;
    }
    if (key === 'empty' || this.pin().length >= 6) return;
    if ('vibrate' in navigator) navigator.vibrate(8);
    const nextPin = this.pin() + key;
    this.pin.set(nextPin);
    if (nextPin.length === 6) window.setTimeout(() => this.submitPin(nextPin), 80);
  }

  initial(value: string): string {
    return value.trim().charAt(0).toUpperCase() || '?';
  }

  displayName(): string {
    const current = this.access();
    const user = this.selectedUser();
    if (user) return `${user.nombre} ${user.apellidos || ''}`.trim();
    return current?.choferNombre || 'Chofer';
  }

  private prepareAccess(access: EntregaAccesoDto): void {
    this.access.set(access);
    if (access.tieneChoferAsignado) {
      this.screen.set(access.choferTienePin ? 'enter-pin' : 'set-pin');
      return;
    }

    if (access.usuariosDisponibles.length === 1) {
      this.selectUser(access.usuariosDisponibles[0]);
    } else {
      this.screen.set('select-user');
    }
  }

  private submitPin(pin: string): void {
    const current = this.access();
    const token = this.token();
    if (!current || !token) return;

    if (this.screen() === 'set-pin') {
      this.firstPin = pin;
      this.pin.set('');
      this.screen.set('confirm-pin');
      return;
    }

    if (this.screen() === 'confirm-pin') {
      if (pin !== this.firstPin) {
        this.pin.set('');
        this.firstPin = '';
        this.pinError.set('Los PIN no coinciden. Inténtalo otra vez.');
        this.screen.set('set-pin');
        this.triggerShake();
        return;
      }
      this.setInitialPin(token);
      return;
    }

    this.loginWithPin(token, pin);
  }

  private loginWithPin(token: string, pin: string): void {
    this.loadingAction.set(true);
    this.auth.pinLoginPorEntrega({ token, username: this.selectedUser()?.username, pin }).subscribe({
      next: () => this.finishAccess(),
      error: error => this.handlePinError(error),
    });
  }

  private setInitialPin(token: string): void {
    this.loadingAction.set(true);
    this.auth.setInitialPinPorEntrega({
      token,
      username: this.selectedUser()?.username,
      newPin: this.firstPin,
    }).subscribe({
      next: () => this.finishAccess(),
      error: error => {
        this.loadingAction.set(false);
        this.pin.set('');
        this.firstPin = '';
        this.pinError.set(this.httpMessage(error) || 'No se pudo guardar el PIN.');
        this.screen.set('set-pin');
      },
    });
  }

  private finishAccess(): void {
    const current = this.access();
    const token = this.token();
    if (!current || !token) return;

    if (!current.tieneChoferAsignado) {
      this.entregaService.tomarPorEnlace(token).subscribe({
        next: tarea => this.navigateToCapture(tarea.id),
        error: error => {
          this.loadingAction.set(false);
          this.showError(this.httpMessage(error) || 'No se pudo tomar la entrega.');
        },
      });
      return;
    }

    this.navigateToCapture(current.tareaId);
  }

  private navigateToCapture(tareaId: string): void {
    this.loadingAction.set(false);
    void this.router.navigate(['/entrega', tareaId, 'captura'], { replaceUrl: true });
  }

  private handlePinError(error: unknown): void {
    this.loadingAction.set(false);
    this.pin.set('');
    this.attempts.update(value => value + 1);
    if (this.attempts() >= 5) {
      this.startLockout();
      return;
    }
    const remaining = 5 - this.attempts();
    this.pinError.set(`${this.httpMessage(error) || 'PIN incorrecto'}. Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}.`);
    this.triggerShake();
  }

  private startLockout(): void {
    this.screen.set('lockout');
    this.lockoutRemaining.set(30);
    this.lockoutTimer = window.setInterval(() => {
      this.lockoutRemaining.update(value => {
        if (value <= 1) {
          if (this.lockoutTimer) window.clearInterval(this.lockoutTimer);
          this.attempts.set(0);
          this.pinError.set('');
          this.pin.set('');
          const current = this.access();
          this.screen.set(current?.tieneChoferAsignado
            ? (current.choferTienePin ? 'enter-pin' : 'set-pin')
            : (this.selectedUser()?.tienePin ? 'enter-pin' : 'set-pin'));
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }

  private showError(message: string): void {
    this.errorMessage.set(message || 'El enlace no está disponible.');
    this.screen.set('error');
  }

  private triggerShake(): void {
    this.shaking.set(true);
    if ('vibrate' in navigator) navigator.vibrate([60, 40, 60]);
    window.setTimeout(() => this.shaking.set(false), 500);
  }

  private httpMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (!error || typeof error !== 'object') return '';
    const body = (error as { error?: { message?: string } | string }).error;
    if (typeof body === 'string') return body;
    return body?.message || '';
  }
}
