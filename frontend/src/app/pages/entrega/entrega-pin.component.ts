import {
  Component,
  signal,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, CampoUserDto } from '../../services/auth.service';

type PinScreen = 'select-user' | 'enter-pin' | 'set-pin' | 'confirm-pin' | 'lockout';

@Component({
  selector: 'app-entrega-pin',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="login-wrapper" style="font-family: var(--font-body);">
      <div class="left-panel">
        <canvas #networkCanvas class="network-canvas"></canvas>
        <div class="brand-overlay">
          <div class="logo-box animate-fade-in-down">
            <img src="assets/imagenes/rr_logo.png" alt="R&R Logo" class="brand-logo" />
            <div class="brand-text">
              <span class="company-name">R&R Importaciones</span>
              <span class="company-sub">Terminal de Entrega</span>
            </div>
          </div>
          <div class="headline-container animate-fade-in">
            <span class="system-tag">Módulo Choferes</span>
            <h1 class="headline-title">Registro de entregas de vehículos.</h1>
            <p class="headline-desc">
              Acceso rápido mediante PIN para choferes encargados de entregar vehículos a domicilio.
            </p>
          </div>
          <div class="connection-status animate-fade-in-up">
            <div class="pulse-dot"></div>
            <span>Módulo de Entrega Activo</span>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="bg-glow"></div>
        <div class="form-container" [class.shake]="shaking()" style="animation: fadeUp .32s cubic-bezier(.16,1,.3,1)">

          <div class="mobile-logo-box">
            <img src="assets/imagenes/rr_logo.png" alt="R&R Logo" class="mobile-logo" />
            <div>
              <span class="mobile-brand-title">RR Entrega</span>
              <span class="mobile-brand-sub">Acceso por PIN</span>
            </div>
          </div>

          @if (screen() === 'select-user') {
            <div class="welcome-header">
              <h2>¿Quién entrega?</h2>
              <p>Selecciona tu usuario para ingresar al módulo de entrega.</p>
            </div>
            <div class="pin-card user-card-list">
              @if (loadingUsers()) {
                <div class="user-list-skeleton">
                  @for (i of [1, 2]; track i) { <div class="user-row-skeleton"></div> }
                </div>
              } @else {
                <div class="user-list">
                  @for (u of choferUsers(); track u.id) {
                    <button class="user-row" (click)="selectUser(u)">
                      <div class="user-avatar">{{ initial(u.nombre) }}</div>
                      <div class="user-info">
                        <span class="user-name">{{ u.nombre }}{{ u.apellidos ? ' ' + u.apellidos : '' }}</span>
                        <span class="user-status">{{ u.tienePin ? 'PIN configurado' : 'Necesita configurar PIN' }}</span>
                      </div>
                      <svg class="user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  } @empty {
                    <p class="no-users">No hay choferes configurados.<br/>Contacta al administrador.</p>
                  }
                </div>
              }
            </div>
            <div class="action-footer">
              <a routerLink="/login" class="back-to-portal-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon-back">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
                </svg>
                <span>Portal Administrativo</span>
              </a>
            </div>
          }

          @if (screen() === 'enter-pin' || screen() === 'set-pin' || screen() === 'confirm-pin') {
            <div class="pin-header-box">
              <button class="back-to-list-btn" (click)="goBack()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7 7-7-7 7-7" />
                </svg>
                <span>Volver</span>
              </button>
              <div class="user-badge-header">
                <div class="avatar-large">{{ initial(selectedUser()?.nombre || '') }}</div>
                <div class="user-badge-details">
                  <p class="avatar-name">{{ selectedUser()?.nombre }} {{ selectedUser()?.apellidos || '' }}</p>
                  <p class="avatar-username">{{ '@' + selectedUser()?.username }}</p>
                </div>
              </div>
            </div>

            <div class="pin-card text-center">
              <div class="dots-row" [class.dots-error]="pinError()">
                @for (i of [0,1,2,3,4,5]; track i) {
                  <div class="dot" [class.dot-filled]="pin().length > i"></div>
                }
              </div>
              @if (pinError()) {
                <p class="pin-error-msg">{{ pinError() }}</p>
              } @else if (screen() === 'set-pin') {
                <p class="pin-hint">Elige tu PIN de 6 dígitos</p>
              } @else if (screen() === 'confirm-pin') {
                <p class="pin-hint">Confirma tu PIN</p>
              } @else {
                <p class="pin-hint">Ingresa tu PIN de 6 dígitos</p>
              }

              <div class="keypad">
                @for (key of keys; track key) {
                  @if (key === 'backspace') {
                    <button class="key key-action" (click)="pressKey(key)" [disabled]="pin().length === 0" aria-label="Borrar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7l5 7-5 7z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="m15 12-3 3m0-3 3 3"/>
                      </svg>
                    </button>
                  } @else if (key === 'empty') {
                    <div class="key key-empty"></div>
                  } @else {
                    <button class="key key-num" (click)="pressKey(key)">
                      <span class="key-digit">{{ key }}</span>
                    </button>
                  }
                }
              </div>

              @if (loading()) {
                <div class="pin-loading-overlay"><div class="spinner"></div></div>
              }
            </div>
          }

          @if (screen() === 'lockout') {
            <div class="pin-card lockout-card text-center">
              <div class="lockout-icon">🔒</div>
              <p class="avatar-name">Acceso bloqueado</p>
              <p class="pin-hint">Demasiados intentos fallidos.</p>
              <div class="lockout-timer">{{ lockoutRemaining() }}s</div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin { to { transform:rotate(360deg); } }
    * { box-sizing:border-box; margin:0; padding:0; }
    :host { display:block; height:100dvh; }
    .login-wrapper { display:flex; height:100dvh; }
    .left-panel { display:none; flex:1; position:relative; background:linear-gradient(135deg,#c61d26 0%,#7c0d11 100%); overflow:hidden; }
    @media (min-width:768px) { .left-panel { display:flex; } }
    .network-canvas { position:absolute; inset:0; width:100%; height:100%; }
    .brand-overlay { position:relative; z-index:2; display:flex; flex-direction:column; justify-content:space-between; padding:48px; height:100%; }
    .logo-box { display:flex; align-items:center; gap:14px; }
    .brand-logo { width:52px; height:52px; border-radius:16px; background:#fff; padding:6px; }
    .brand-text .company-name { display:block; color:#fff; font-size:20px; font-weight:800; }
    .brand-text .company-sub { display:block; color:rgba(255,255,255,0.7); font-size:13px; }
    .headline-container { max-width:400px; }
    .system-tag { display:inline-block; background:rgba(255,255,255,0.15); color:#fff; font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; border-radius:20px; padding:5px 14px; margin-bottom:16px; }
    .headline-title { color:#fff; font-size:32px; font-weight:800; line-height:1.2; margin-bottom:12px; }
    .headline-desc { color:rgba(255,255,255,0.75); font-size:15px; line-height:1.6; }
    .connection-status { display:flex; align-items:center; gap:10px; color:rgba(255,255,255,0.8); font-size:13px; font-weight:600; }
    .pulse-dot { width:8px; height:8px; border-radius:50%; background:#4ade80; box-shadow:0 0 0 3px rgba(74,222,128,.3); animation:pulseDot 2s ease infinite; }
    @keyframes pulseDot { 0%,100% { box-shadow:0 0 0 3px rgba(74,222,128,.3); } 50% { box-shadow:0 0 0 7px rgba(74,222,128,.1); } }
    .right-panel { flex:1; display:flex; align-items:center; justify-content:center; background:#f8f9fb; position:relative; overflow-y:auto; padding:24px 16px; }
    .bg-glow { position:absolute; width:400px; height:400px; border-radius:50%; background:radial-gradient(circle,rgba(198,29,38,.06) 0%,transparent 70%); top:-100px; right:-100px; pointer-events:none; }
    .form-container { width:100%; max-width:400px; position:relative; }
    .mobile-logo-box { display:flex; align-items:center; gap:12px; margin-bottom:24px; }
    @media (min-width:768px) { .mobile-logo-box { display:none; } }
    .mobile-logo { width:40px; height:40px; border-radius:12px; }
    .mobile-brand-title { display:block; font-size:17px; font-weight:800; color:#0d1017; }
    .mobile-brand-sub { display:block; font-size:12px; color:#9ea3ae; }
    .welcome-header { margin-bottom:16px; }
    .welcome-header h2 { font-size:24px; font-weight:800; color:#0d1017; margin-bottom:4px; }
    .welcome-header p { font-size:14px; color:#6b7280; }
    .pin-card { background:#fff; border-radius:20px; border:1.5px solid #e5e7eb; padding:20px; margin-bottom:12px; position:relative; }
    .user-card-list { padding:0; overflow:hidden; }
    .user-list-skeleton { padding:12px; }
    .user-row-skeleton { height:64px; background:#f3f4f6; border-radius:12px; margin-bottom:8px; animation:pulse 1.5s ease infinite; }
    @keyframes pulse { 0%,100% { opacity:.6; } 50% { opacity:.9; } }
    .user-list { display:flex; flex-direction:column; }
    .user-row { display:flex; align-items:center; gap:14px; padding:14px 16px; background:none; border:none; border-bottom:1px solid #f3f4f6; cursor:pointer; text-align:left; transition:background .12s; }
    .user-row:last-child { border-bottom:none; }
    .user-row:hover { background:#fafafa; }
    .user-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#c61d26,#7c0d11); color:#fff; font-size:18px; font-weight:800; display:grid; place-items:center; flex-shrink:0; }
    .user-info { flex:1; min-width:0; }
    .user-name { display:block; font-size:15px; font-weight:700; color:#0d1017; }
    .user-status { display:block; font-size:12px; color:#6b7280; }
    .user-chevron { width:18px; height:18px; color:#9ca3af; flex-shrink:0; }
    .no-users { padding:24px; text-align:center; color:#6b7280; font-size:14px; line-height:1.5; }
    .action-footer { margin-top:16px; display:flex; justify-content:center; }
    .back-to-portal-btn { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #e5e7eb; border-radius:12px; padding:10px 18px; color:#4b5162; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; transition:all .12s; }
    .back-to-portal-btn:hover { background:#f9fafb; }
    .arrow-icon-back { width:16px; height:16px; }
    .pin-header-box { margin-bottom:16px; }
    .back-to-list-btn { display:flex; align-items:center; gap:6px; background:none; border:none; color:#6b7280; font-size:13px; font-weight:600; cursor:pointer; padding:8px 0; margin-bottom:12px; }
    .back-to-list-btn svg { width:18px; height:18px; }
    .user-badge-header { display:flex; align-items:center; gap:14px; }
    .avatar-large { width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg,#c61d26,#7c0d11); color:#fff; font-size:22px; font-weight:800; display:grid; place-items:center; flex-shrink:0; }
    .user-badge-details {}
    .avatar-name { font-size:17px; font-weight:700; color:#0d1017; }
    .avatar-username { font-size:13px; color:#9ea3ae; }
    .text-center { text-align:center; }
    .dots-row { display:flex; justify-content:center; gap:12px; margin-bottom:12px; }
    .dot { width:16px; height:16px; border-radius:50%; background:#e5e7eb; border:2px solid #d1d5db; transition:all .15s; }
    .dot-filled { background:#c61d26; border-color:#c61d26; transform:scale(1.1); }
    .dots-error .dot { background:#fca5a5; border-color:#f87171; }
    .pin-hint { font-size:13px; color:#9ea3ae; margin-bottom:16px; }
    .pin-error-msg { font-size:13px; color:#dc2626; font-weight:600; margin-bottom:16px; }
    .keypad { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
    .key { border:none; border-radius:14px; background:#f9fafb; font-family:inherit; cursor:pointer; transition:all .12s; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60px; }
    .key:active { transform:scale(.95); background:#f3f4f6; }
    .key-num { border:1.5px solid #e5e7eb; }
    .key-digit { font-size:22px; font-weight:700; color:#0d1017; }
    .key-action { background:#fee2e2; border:1.5px solid #fca5a5; color:#c61d26; }
    .key-empty { background:none; cursor:default; }
    .key-action svg { width:22px; height:22px; }
    .pin-loading-overlay { position:absolute; inset:0; background:rgba(255,255,255,.7); border-radius:20px; display:grid; place-items:center; z-index:10; }
    .spinner { width:24px; height:24px; border-radius:50%; border:3px solid #e5e7eb; border-top-color:#c61d26; animation:spin .8s linear infinite; }
    .lockout-card { padding:36px 24px; }
    .lockout-icon { font-size:40px; margin-bottom:12px; }
    .lockout-timer { font-size:48px; font-weight:800; color:#dc2626; margin:12px 0; }
  `],
})
export class EntregaPinComponent implements OnInit, OnDestroy, AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChild('networkCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId?: number;
  private points: Array<{ x: number; y: number; vx: number; vy: number }> = [];

  screen = signal<PinScreen>('select-user');
  choferUsers = signal<CampoUserDto[]>([]);
  loadingUsers = signal(true);
  selectedUser = signal<CampoUserDto | null>(null);
  pin = signal('');
  pinError = signal('');
  shaking = signal(false);
  loading = signal(false);
  attempts = signal(0);
  lockoutRemaining = signal(0);
  private lockoutTimer?: ReturnType<typeof setInterval>;
  private firstPin = '';

  readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', 'empty'];

  ngOnInit(): void {
    if (this.auth.isAuthenticated() && this.auth.can('CAMPO_USAR')) {
      this.router.navigate(['/entrega']);
      return;
    }
    const saved = localStorage.getItem('entrega_username');
    this.auth.getCampoUsers().subscribe({
      next: users => {
        this.choferUsers.set(users);
        if (saved) {
          const user = users.find(u => u.username === saved);
          if (user) {
            this.selectedUser.set(user);
            this.screen.set(user.tienePin ? 'enter-pin' : 'set-pin');
          }
        }
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false),
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    this.generatePoints();
    window.addEventListener('resize', this.onResize);
    this.tick();
  }

  ngOnDestroy(): void {
    if (this.lockoutTimer) clearInterval(this.lockoutTimer);
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => { this.resizeCanvas(); this.generatePoints(); };

  private resizeCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    canvas.width = canvas.parentElement?.clientWidth || 460;
    canvas.height = canvas.parentElement?.clientHeight || 800;
  }

  private generatePoints(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.points = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));
  }

  private tick = (): void => {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of this.points) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    }
    const maxDist = 120;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      for (let j = i + 1; j < this.points.length; j++) {
        const p2 = this.points[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < maxDist) {
          const alpha = ((maxDist - dist) / maxDist) * 0.16;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          this.ctx.lineWidth = 0.7;
          this.ctx.stroke();
        }
      }
    }
    this.animationId = requestAnimationFrame(this.tick);
  };

  initial(nombre: string): string { return (nombre || '?').charAt(0).toUpperCase(); }

  selectUser(user: CampoUserDto): void {
    this.selectedUser.set(user);
    this.pin.set('');
    this.pinError.set('');
    this.screen.set(user.tienePin ? 'enter-pin' : 'set-pin');
    localStorage.setItem('entrega_username', user.username);
  }

  goBack(): void {
    this.screen.set('select-user');
    this.pin.set('');
    this.pinError.set('');
    localStorage.removeItem('entrega_username');
  }

  pressKey(key: string): void {
    if (key === 'backspace') { this.pin.set(this.pin().slice(0, -1)); this.pinError.set(''); return; }
    if (key === 'empty' || this.pin().length >= 6) return;
    if ('vibrate' in navigator) navigator.vibrate(8);
    const newPin = this.pin() + key;
    this.pin.set(newPin);
    if (newPin.length === 6) setTimeout(() => this.submitPin(newPin), 80);
  }

  private submitPin(pin: string): void {
    const s = this.screen();
    if (s === 'enter-pin') this.doLogin(pin);
    else if (s === 'set-pin') { this.firstPin = pin; this.pin.set(''); this.screen.set('confirm-pin'); }
    else if (s === 'confirm-pin') this.doConfirmPin(pin);
  }

  private doLogin(pin: string): void {
    const user = this.selectedUser();
    if (!user) return;
    this.loading.set(true);
    this.auth.pinLogin({ username: user.username, pin }).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.needsSetPin) { this.pin.set(''); this.screen.set('set-pin'); }
        else {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/entrega';
          this.router.navigateByUrl(returnUrl);
        }
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.pin.set('');
        this.attempts.update(a => a + 1);
        if (this.attempts() >= 5) { this.startLockout(); return; }
        const rem = 5 - this.attempts();
        this.pinError.set(`PIN incorrecto. ${rem} intento${rem === 1 ? '' : 's'} restante${rem === 1 ? '' : 's'}.`);
        this.triggerShake();
      },
    });
  }

  private doConfirmPin(pin: string): void {
    if (pin !== this.firstPin) {
      this.pin.set(''); this.pinError.set('Los PIN no coinciden.'); this.triggerShake();
      this.screen.set('set-pin'); this.firstPin = ''; return;
    }
    const user = this.selectedUser();
    if (!user) return;
    this.loading.set(true);
    const onSaved = () => {
      this.loading.set(false);
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/entrega';
      this.router.navigateByUrl(returnUrl);
    };
    const onError = (err: Error) => {
      this.loading.set(false);
      this.pinError.set(err.message || 'Error al guardar el PIN.');
      this.pin.set(''); this.screen.set('set-pin'); this.firstPin = '';
    };
    if (this.auth.isAuthenticated()) this.auth.setPin(pin).subscribe({ next: onSaved, error: onError });
    else this.auth.setInitialCampoPin(user.username, pin).subscribe({ next: onSaved, error: onError });
  }

  private triggerShake(): void {
    this.shaking.set(true);
    if ('vibrate' in navigator) navigator.vibrate([60, 40, 60]);
    setTimeout(() => this.shaking.set(false), 500);
  }

  private startLockout(): void {
    this.screen.set('lockout');
    this.lockoutRemaining.set(30);
    this.lockoutTimer = setInterval(() => {
      this.lockoutRemaining.update(n => {
        if (n <= 1) { clearInterval(this.lockoutTimer); this.attempts.set(0); this.pin.set(''); this.screen.set('enter-pin'); return 0; }
        return n - 1;
      });
    }, 1000);
  }
}
