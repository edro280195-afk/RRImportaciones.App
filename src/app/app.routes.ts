import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
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
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'inicio', component: DashboardComponent },
      { path: 'clientes', component: ClientesListComponent },
      { path: 'clientes/:id', component: ClientesDetailComponent },
      { path: 'vehiculos', component: VehiculosListComponent },
      { path: 'vehiculos/:id', component: VehiculosDetailComponent },
      { path: 'tramites', component: TramitesListComponent },
      { path: 'tramites/:id', component: TramiteDetailComponent },
      { path: 'cotizaciones', loadComponent: () => import('./pages/cotizaciones/cotizaciones-list.component').then(m => m.CotizacionesListComponent) },
      { path: 'cotizaciones/nueva', loadComponent: () => import('./pages/cotizaciones/cotizacion-nueva.component').then(m => m.CotizacionNuevaComponent) },
      { path: 'cotizaciones/:id', loadComponent: () => import('./pages/cotizaciones/cotizacion-detail.component').then(m => m.CotizacionDetailComponent) },
      { path: 'pagos', loadComponent: () => import('./pages/pagos/pagos-list.component').then(m => m.PagosListComponent) },
      { path: 'gastos-hormiga', loadComponent: () => import('./pages/gastos-hormiga/gastos-hormiga-list.component').then(m => m.GastosHormigaListComponent) },
      { path: 'admin/importador', loadComponent: () => import('./pages/admin/importador.component').then(m => m.ImportadorComponent) },
      { path: 'inventario', component: InventarioComponent },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
