import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { permissionGuard, adminGuard } from './guards/permission.guard';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ClientesListComponent } from './pages/clientes/clientes-list.component';
import { ClientesDetailComponent } from './pages/clientes/clientes-detail.component';
import { VehiculosListComponent } from './pages/vehiculos/vehiculos-list.component';
import { VehiculosDetailComponent } from './pages/vehiculos/vehiculos-detail.component';
import { TramitesListComponent } from './pages/tramites/tramites-list.component';
import { TramiteDetailComponent } from './pages/tramites/tramite-detail.component';
import { InventarioComponent } from './pages/inventario/inventario.component';

export const routes: Routes = [
  {
    path: 'portal/tramite/:id',
    loadComponent: () => import('./pages/portal/portal-tramite.component').then(m => m.PortalTramiteComponent),
  },
  { path: 'login', component: LoginComponent },
  {
    path: 'campo/:id/captura',
    canActivate: [authGuard, permissionGuard('EVENTOS_CREAR')],
    loadComponent: () => import('./pages/campo/campo-captura.component').then(m => m.CampoCapturaComponent),
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'inicio', component: DashboardComponent },

      // Operación
      { path: 'clientes',    component: ClientesListComponent,   canActivate: [permissionGuard('CLIENTES_VER')] },
      { path: 'clientes/:id', component: ClientesDetailComponent, canActivate: [permissionGuard('CLIENTES_VER')] },
      { path: 'vehiculos',    component: VehiculosListComponent,   canActivate: [permissionGuard('TRAMITES_VER')] },
      { path: 'vehiculos/:id', component: VehiculosDetailComponent, canActivate: [permissionGuard('TRAMITES_VER')] },
      { path: 'tramites',    component: TramitesListComponent,    canActivate: [permissionGuard('TRAMITES_VER')] },
      { path: 'tramites/:id', component: TramiteDetailComponent,  canActivate: [permissionGuard('TRAMITES_VER')] },
      {
        path: 'campo',
        canActivate: [permissionGuard('EVENTOS_CREAR')],
        loadComponent: () => import('./pages/campo/campo-tareas.component').then(m => m.CampoTareasComponent),
      },
      { path: 'inventario',  component: InventarioComponent,      canActivate: [permissionGuard('TRAMITES_VER')] },

      // Cotizaciones
      {
        path: 'cotizaciones/nueva',
        canActivate: [permissionGuard('COTIZACIONES_CREAR')],
        loadComponent: () => import('./pages/cotizaciones/cotizacion-nueva.component').then(m => m.CotizacionNuevaComponent),
      },
      {
        path: 'cotizaciones',
        canActivate: [permissionGuard('COTIZACIONES_VER')],
        loadComponent: () => import('./pages/cotizaciones/cotizaciones-list.component').then(m => m.CotizacionesListComponent),
      },
      {
        path: 'cotizaciones/:id',
        canActivate: [permissionGuard('COTIZACIONES_VER')],
        loadComponent: () => import('./pages/cotizaciones/cotizacion-detail.component').then(m => m.CotizacionDetailComponent),
      },

      // Finanzas
      {
        path: 'pagos',
        canActivate: [permissionGuard('PAGOS_VER')],
        loadComponent: () => import('./pages/pagos/pagos-list.component').then(m => m.PagosListComponent),
      },
      {
        path: 'gastos-hormiga',
        canActivate: [permissionGuard('GASTOS_VER')],
        loadComponent: () => import('./pages/gastos-hormiga/gastos-hormiga-list.component').then(m => m.GastosHormigaListComponent),
      },
      {
        path: 'reportes',
        canActivate: [permissionGuard('REPORTES_FINANCIEROS')],
        loadComponent: () => import('./pages/reportes/reportes.component').then(m => m.ReportesComponent),
      },

      // Catálogos
      {
        path: 'marcas',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () => import('./pages/catalogos/marcas.component').then(m => m.MarcasComponent),
      },
      {
        path: 'aduanas',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () => import('./pages/catalogos/aduanas.component').then(m => m.AduanasComponent),
      },
      {
        path: 'bancos',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () => import('./pages/catalogos/bancos.component').then(m => m.BancosComponent),
      },
      {
        path: 'tramitadores',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () => import('./pages/catalogos/tramitadores.component').then(m => m.TramitadoresComponent),
      },
      {
        path: 'personal',
        redirectTo: 'usuarios',
        pathMatch: 'full',
      },
      {
        path: 'partners',
        canActivate: [permissionGuard('CATALOGOS_VER')],
        loadComponent: () => import('./pages/catalogos/partners.component').then(m => m.PartnersComponent),
      },

      // Administración — solo ADMIN (no tienen permiso específico en el catálogo)
      {
        path: 'usuarios',
        canActivate: [permissionGuard('USUARIOS_VER')],
        loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
      },
      {
        path: 'roles',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/roles/roles.component').then(m => m.RolesComponent),
      },
      {
        path: 'auditoria',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/auditoria/auditoria.component').then(m => m.AuditoriaComponent),
      },
      {
        path: 'admin/parametros-fiscales',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/parametros-fiscales.component').then(m => m.ParametrosFiscalesComponent),
      },
      {
        path: 'admin/importador',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/importador.component').then(m => m.ImportadorComponent),
      },
      {
        path: 'admin/plantillas',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/plantillas.component').then(m => m.PlantillasComponent),
      },

      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
