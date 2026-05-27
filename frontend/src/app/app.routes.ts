import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { permissionGuard, adminGuard, duenoGuard } from './guards/permission.guard';
import { campoAuthGuard } from './guards/campo-auth.guard';
import { entregaAuthGuard } from './guards/entrega-auth.guard';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { ModoDonLayoutComponent } from './layout/modo-don-layout/modo-don-layout.component';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PageNotFoundComponent } from './pages/not-found/page-not-found.component';
import { PortalInvalidoComponent } from './pages/portal/portal-invalido.component';
import { ClientesListComponent } from './pages/clientes/clientes-list.component';
import { ClientesDetailComponent } from './pages/clientes/clientes-detail.component';
import { VehiculosListComponent } from './pages/vehiculos/vehiculos-list.component';
import { VehiculosDetailComponent } from './pages/vehiculos/vehiculos-detail.component';
import { TramitesListComponent } from './pages/tramites/tramites-list.component';
import { TramiteDetailComponent } from './pages/tramites/tramite-detail.component';
import { InventarioComponent } from './pages/inventario/inventario.component';
import { ReportesComponent } from './pages/reportes/reportes.component';

export const routes: Routes = [
  // ── Rutas públicas ────────────────────────────────────────────────────────
  {
    path: 'portal/acceso/:token',
    loadComponent: () =>
      import('./pages/portal/portal-tramite.component').then(m => m.PortalTramiteComponent),
  },
  { path: 'portal', component: PortalInvalidoComponent },
  { path: 'login', component: LoginComponent },
  { path: '404', component: PageNotFoundComponent },

  // ── Asistente Personal — vista exclusiva para rol DUEÑO ──────────────────
  {
    path: 'asistente-personal',
    component: ModoDonLayoutComponent,
    canActivate: [authGuard, duenoGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/modo-don/modo-don.component').then(m => m.ModoDonComponent),
        pathMatch: 'full',
      },
    ],
  },

  // ── Módulo campo (standalone, sin AppLayout ni sidebar) ───────────────────
  {
    path: 'campo/pin',
    loadComponent: () => import('./pages/campo/campo-pin.component').then(m => m.CampoPinComponent),
  },
  {
    path: 'campo/:id/captura',
    canActivate: [campoAuthGuard],
    loadComponent: () =>
      import('./pages/campo/campo-captura.component').then(m => m.CampoCapturaComponent),
  },
  {
    path: 'campo',
    canActivate: [campoAuthGuard],
    loadComponent: () =>
      import('./pages/campo/campo-tareas.component').then(m => m.CampoTareasComponent),
  },

  // ── Módulo entrega choferes (standalone, sin AppLayout ni sidebar) ───────────
  {
    path: 'entrega/pin',
    loadComponent: () =>
      import('./pages/entrega/entrega-pin.component').then(m => m.EntregaPinComponent),
  },
  {
    path: 'entrega/:id/captura',
    canActivate: [entregaAuthGuard],
    loadComponent: () =>
      import('./pages/entrega/entrega-captura.component').then(m => m.EntregaCapturaComponent),
  },
  {
    path: 'entrega',
    canActivate: [entregaAuthGuard],
    loadComponent: () =>
      import('./pages/entrega/entrega-tareas.component').then(m => m.EntregaTareasComponent),
  },

  // ── App principal (con sidebar AppLayout) ─────────────────────────────────
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'inicio', component: DashboardComponent },

      // Operación
      {
        path: 'clientes',
        component: ClientesListComponent,
        canActivate: [permissionGuard('CLIENTES_VER')],
      },
      {
        path: 'clientes/:id',
        component: ClientesDetailComponent,
        canActivate: [permissionGuard('CLIENTES_VER')],
      },
      {
        path: 'vehiculos',
        component: VehiculosListComponent,
        canActivate: [permissionGuard('TRAMITES_VER')],
      },
      {
        path: 'vehiculos/:id',
        component: VehiculosDetailComponent,
        canActivate: [permissionGuard('TRAMITES_VER')],
      },
      {
        path: 'tramites',
        component: TramitesListComponent,
        canActivate: [permissionGuard('TRAMITES_VER')],
      },
      {
        path: 'lotes',
        canActivate: [permissionGuard('TRAMITES_VER')],
        loadComponent: () =>
          import('./pages/lotes/lotes-list.component').then(m => m.LotesListComponent),
      },
      {
        path: 'lotes/nuevo',
        canActivate: [permissionGuard('TRAMITES_CREAR')],
        loadComponent: () =>
          import('./pages/lotes/lote-form.component').then(m => m.LoteFormComponent),
      },
      {
        path: 'lotes/:id',
        canActivate: [permissionGuard('TRAMITES_VER')],
        loadComponent: () =>
          import('./pages/lotes/lote-detail.component').then(m => m.LoteDetailComponent),
      },
      {
        path: 'tramites/:id',
        component: TramiteDetailComponent,
        canActivate: [permissionGuard('TRAMITES_VER')],
      },
      {
        path: 'pedimentos',
        canActivate: [permissionGuard('TRAMITES_VER')],
        loadComponent: () =>
          import('./pages/pedimentos/pedimentos-list.component').then(
            m => m.PedimentosListComponent
          ),
      },
      {
        path: 'inventario',
        component: InventarioComponent,
        canActivate: [permissionGuard('TRAMITES_VER')],
      },
      {
        path: 'campo/bandeja-admin',
        canActivate: [permissionGuard('TRAMITES_VER')],
        loadComponent: () =>
          import('./pages/campo/bandeja-campo-admin.component').then(
            m => m.BandejaCampoAdminComponent
          ),
      },

      // Cotizaciones
      {
        path: 'cotizaciones/nueva',
        canActivate: [permissionGuard('COTIZACIONES_CREAR')],
        loadComponent: () =>
          import('./pages/cotizaciones/cotizacion-nueva.component').then(
            m => m.CotizacionNuevaComponent
          ),
      },
      {
        path: 'cotizaciones',
        canActivate: [permissionGuard('COTIZACIONES_VER')],
        loadComponent: () =>
          import('./pages/cotizaciones/cotizaciones-list.component').then(
            m => m.CotizacionesListComponent
          ),
      },
      {
        path: 'cotizaciones/:id',
        canActivate: [permissionGuard('COTIZACIONES_VER')],
        loadComponent: () =>
          import('./pages/cotizaciones/cotizacion-detail.component').then(
            m => m.CotizacionDetailComponent
          ),
      },

      // Finanzas
      {
        path: 'pagos',
        canActivate: [permissionGuard('PAGOS_VER')],
        loadComponent: () =>
          import('./pages/pagos/pagos-list.component').then(m => m.PagosListComponent),
      },
      {
        path: 'gastos-hormiga',
        canActivate: [permissionGuard('GASTOS_VER')],
        loadComponent: () =>
          import('./pages/gastos-hormiga/gastos-hormiga-list.component').then(
            m => m.GastosHormigaListComponent
          ),
      },
      {
        path: 'reportes',
        canActivate: [permissionGuard('REPORTES_FINANCIEROS')],
        component: ReportesComponent,
      },

      // Catálogos
      {
        path: 'marcas',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () =>
          import('./pages/catalogos/marcas.component').then(m => m.MarcasComponent),
      },
      {
        path: 'aduanas',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () =>
          import('./pages/catalogos/aduanas.component').then(m => m.AduanasComponent),
      },
      {
        path: 'bancos',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () =>
          import('./pages/catalogos/bancos.component').then(m => m.BancosComponent),
      },
      {
        path: 'tramitadores',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () =>
          import('./pages/catalogos/tramitadores.component').then(m => m.TramitadoresComponent),
      },
      {
        path: 'personal',
        redirectTo: 'usuarios',
        pathMatch: 'full',
      },
      {
        path: 'partners',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () =>
          import('./pages/catalogos/partners.component').then(m => m.PartnersComponent),
      },

      // Administración — solo ADMIN (no tienen permiso específico en el catálogo)
      {
        path: 'usuarios',
        canActivate: [permissionGuard('USUARIOS_VER')],
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
      },
      {
        path: 'roles',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/roles/roles.component').then(m => m.RolesComponent),
      },
      {
        path: 'auditoria',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/auditoria/auditoria.component').then(m => m.AuditoriaComponent),
      },
      {
        path: 'admin/parametros-fiscales',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/parametros-fiscales.component').then(
            m => m.ParametrosFiscalesComponent
          ),
      },
      {
        path: 'admin/importador',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/importador.component').then(m => m.ImportadorComponent),
      },
      {
        path: 'admin/plantillas',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/plantillas.component').then(m => m.PlantillasComponent),
      },
      {
        path: 'admin/catalogo-precios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/catalogo-precios.component').then(m => m.CatalogoPreciosComponent),
      },

      {
        path: 'manual',
        loadComponent: () => import('./pages/manual/manual.component').then(m => m.ManualComponent),
      },

      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '404' },
];
