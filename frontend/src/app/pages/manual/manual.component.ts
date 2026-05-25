import { Component, signal } from '@angular/core';

interface ManualSection {
  id: string;
  titulo: string;
  contenido: string;
}

interface ManualRol {
  nombre: string;
  color: string;
  descripcion: string;
  secciones: ManualSection[];
}

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [],
  template: `
    <div class="space-y-6">
      <div>
        <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Sistema</p>
        <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Manual de usuario</h1>
        <p class="mt-1 text-[13px] text-[#6B717F]">
          Guía de uso del sistema R&amp;R Importaciones por rol.
        </p>
      </div>

      <!-- Tabs de roles -->
      <div class="flex flex-wrap gap-2">
        @for (rol of roles; track rol.nombre) {
          <button
            (click)="rolActivo.set(rol.nombre)"
            class="px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors"
            [class]="
              rolActivo() === rol.nombre
                ? 'bg-[#0D1017] text-white'
                : 'border border-[#D8DEE8] text-[#374151] hover:bg-[#F3F4F6]'
            "
          >
            {{ rol.nombre }}
          </button>
        }
      </div>

      @for (rol of roles; track rol.nombre) {
        @if (rolActivo() === rol.nombre) {
          <div class="space-y-4">
            <!-- Header del rol -->
            <div class="card-elevated rounded-2xl p-5 flex items-start gap-4">
              <span
                class="inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-bold"
                [class]="rol.color"
                >{{ rol.nombre }}</span
              >
              <p class="text-[13px] text-[#4B5162] pt-0.5">{{ rol.descripcion }}</p>
            </div>

            <!-- Secciones -->
            <div class="space-y-3">
              @for (sec of rol.secciones; track sec.id) {
                <div class="card-elevated rounded-2xl overflow-hidden">
                  <button
                    class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F8FAFC] transition-colors"
                    (click)="toggle(sec.id)"
                  >
                    <span class="text-[14px] font-semibold text-[#0D1017]">{{ sec.titulo }}</span>
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      class="w-4 h-4 stroke-2 text-[#9EA3AE] transition-transform"
                      [style.transform]="expanded().has(sec.id) ? 'rotate(180deg)' : 'rotate(0deg)'"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  @if (expanded().has(sec.id)) {
                    <div class="px-5 pb-5 border-t border-[#F0F2F5]">
                      <div
                        class="pt-4 text-[13px] text-[#374151] leading-relaxed manual-content"
                        [innerHTML]="sec.contenido"
                      ></div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      :host ::ng-deep .manual-content h3 {
        font-size: 13px;
        font-weight: 700;
        color: #0d1017;
        margin-top: 16px;
        margin-bottom: 6px;
      }
      :host ::ng-deep .manual-content ul {
        list-style: disc;
        padding-left: 20px;
        margin-bottom: 10px;
      }
      :host ::ng-deep .manual-content ol {
        list-style: decimal;
        padding-left: 20px;
        margin-bottom: 10px;
      }
      :host ::ng-deep .manual-content li {
        margin-bottom: 4px;
      }
      :host ::ng-deep .manual-content p {
        margin-bottom: 8px;
      }
      :host ::ng-deep .manual-content .chip {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        background: #f3f4f6;
        color: #374151;
      }
      :host ::ng-deep .manual-content .chip-green {
        background: #dcfce7;
        color: #166534;
      }
      :host ::ng-deep .manual-content .chip-blue {
        background: #dbeafe;
        color: #1e40af;
      }
      :host ::ng-deep .manual-content .chip-yellow {
        background: #fef3c7;
        color: #92400e;
      }
      :host ::ng-deep .manual-content .chip-red {
        background: #fee2e2;
        color: #991b1b;
      }
      :host ::ng-deep .manual-content table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
        font-size: 12.5px;
      }
      :host ::ng-deep .manual-content th {
        text-align: left;
        padding: 6px 10px;
        background: #f8fafc;
        border: 1px solid #e4e7ec;
        font-weight: 700;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6b717f;
      }
      :host ::ng-deep .manual-content td {
        padding: 6px 10px;
        border: 1px solid #e4e7ec;
        vertical-align: top;
      }
    `,
  ],
})
export class ManualComponent {
  rolActivo = signal('ADMIN');
  expanded = signal<Set<string>>(new Set(['acceso', 'flujo-principal']));

  toggle(id: string): void {
    const s = new Set(this.expanded());
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.expanded.set(s);
  }

  roles: ManualRol[] = [
    {
      nombre: 'ADMIN',
      color: 'bg-[#FEE2E2] text-[#991B1B]',
      descripcion:
        'Acceso total al sistema. Gestiona usuarios, roles, parámetros fiscales, catálogos y toda la operación.',
      secciones: [
        {
          id: 'acceso',
          titulo: 'Acceso y primer ingreso',
          contenido: `
            <p>El usuario ADMIN tiene acceso a todos los módulos del sistema sin restricción.</p>
            <h3>Credenciales iniciales</h3>
            <ul>
              <li>Username: <strong>admin</strong></li>
              <li>Contraseña: cambia inmediatamente después del primer ingreso desde Usuarios.</li>
            </ul>
            <h3>Pasos para iniciar sesión</h3>
            <ol>
              <li>Abre la URL del sistema en tu navegador.</li>
              <li>Escribe tu username y contraseña.</li>
              <li>Presiona <strong>Entrar</strong>.</li>
            </ol>
          `,
        },
        {
          id: 'admin-usuarios',
          titulo: 'Gestión de usuarios',
          contenido: `
            <p>Desde <strong>Admin → Usuarios</strong> puedes crear, editar y desactivar cuentas.</p>
            <h3>Crear un usuario nuevo</h3>
            <ol>
              <li>Haz clic en <strong>+ Nuevo usuario</strong>.</li>
              <li>Llena nombre, apellidos, username (ej. <em>juan.perez</em>) y contraseña temporal.</li>
              <li>Selecciona el <strong>rol</strong> que corresponde a su función (ver tabla de roles abajo).</li>
              <li>Guarda. El sistema muestra los permisos del rol seleccionado antes de guardar.</li>
            </ol>
            <h3>Roles disponibles</h3>
            <table>
              <tr><th>Rol</th><th>Perfil típico</th></tr>
              <tr><td>ADMIN</td><td>Ricardo Carreón, dueño/director con acceso total</td></tr>
              <tr><td>GERENTE</td><td>Ricardo Herrera, supervisión operativa general</td></tr>
              <tr><td>FACTURACION</td><td>Carmen Velarde — facturación y cobros a clientes</td></tr>
              <tr><td>COORDINADORA</td><td>Laura Aranda — coordinación de operaciones y agenda</td></tr>
              <tr><td>CONTROL_TRAMITES</td><td>Javier Rdz — seguimiento y control de trámites aduanales</td></tr>
              <tr><td>YARDERO</td><td>Personal de yarda — fotos, inventario y maniobras en patio</td></tr>
              <tr><td>CHOFER</td><td>Choferes — traslado y entrega de unidades</td></tr>
            </table>
            <h3>Desactivar un usuario</h3>
            <p>Edita el usuario y cambia <em>Estatus</em> a <strong>Inactivo</strong>. El usuario ya no podrá iniciar sesión.</p>
          `,
        },
        {
          id: 'admin-roles',
          titulo: 'Configuración de roles y permisos',
          contenido: `
            <p>Desde <strong>Admin → Roles</strong> puedes ver y editar qué permisos tiene cada rol.</p>
            <h3>Editar permisos de un rol</h3>
            <ol>
              <li>Haz clic en <strong>Configurar permisos</strong> en el rol que deseas modificar.</li>
              <li>Activa o desactiva los permisos por módulo. Usa <strong>Marcar todos</strong> para activar todo un módulo de un clic.</li>
              <li>Haz clic en <strong>Guardar cambios</strong>.</li>
            </ol>
            <p><strong>Nota:</strong> El rol ADMIN siempre tiene acceso total y no se puede editar.</p>
            <h3>Módulo CAMPO</h3>
            <p>El permiso <span class="chip">CAMPO_USAR</span> controla quién puede ver el módulo de fotos y tareas en yarda. Está asignado por defecto a los roles YARDERO y CHOFER.</p>
          `,
        },
        {
          id: 'flujo-principal',
          titulo: 'Flujo principal de operación',
          contenido: `
            <p>El flujo estándar de un vehículo en el sistema es:</p>
            <ol>
              <li><strong>Cotización</strong> — Se crea desde <em>Cotizaciones → Nueva</em>. El sistema calcula impuestos automáticamente con NHTSA y tipo de cambio en tiempo real.</li>
              <li><strong>Aceptar cotización</strong> — El cliente acepta. Se puede enviar por WhatsApp o email.</li>
              <li><strong>Convertir a trámite</strong> — Desde el detalle de la cotización aceptada, botón <strong>Convertir a trámite</strong>. Esto crea el trámite con todos los datos heredados.</li>
              <li><strong>Avanzar estados</strong> — El trámite avanza por los estados hasta llegar a COBRADO.</li>
              <li><strong>Finalizar</strong> — Cuando el vehículo fue entregado y cobrado, se presiona <strong>Finalizar trámite</strong> (botón verde en el header del trámite).</li>
            </ol>
            <h3>Estados del trámite</h3>
            <table>
              <tr><th>Estado</th><th>Significado</th></tr>
              <tr><td><span class="chip chip-yellow">PENDIENTE_TRAMITE</span></td><td>Recién creado, pendiente de iniciar gestión</td></tr>
              <tr><td><span class="chip chip-blue">FOTOS_SOLICITADAS</span></td><td>Se solicitaron fotos del vehículo al cliente</td></tr>
              <tr><td>FOTOS_RECIBIDAS</td><td>Fotos recibidas, pendiente de revisar</td></tr>
              <tr><td><span class="chip chip-yellow">REQUISITOS_PENDIENTES</span></td><td>Documentos faltantes (factura, INE, etc.)</td></tr>
              <tr><td>BAJA_EN_PROCESO</td><td>Proceso de baja vehicular en curso (72 hrs)</td></tr>
              <tr><td>BAJA_COMPLETADA</td><td>Baja terminada, listo para pedimento</td></tr>
              <tr><td>LISTO_PARA_PEDIMENTO</td><td>Documentación completa para tramitar pedimento</td></tr>
              <tr><td>PEDIMENTO_DOCUMENTADO</td><td>Pedimento registrado en el sistema</td></tr>
              <tr><td>PAGO_PEDIMENTO_PENDIENTE</td><td>Esperando pago del pedimento</td></tr>
              <tr><td>MANDADO_A_CRUCE</td><td>Enviado al cruce aduanal</td></tr>
              <tr><td><span class="chip chip-red">ROJO_DESADUANADO</span></td><td>Desaduanado con reconocimiento rojo</td></tr>
              <tr><td><span class="chip chip-green">ENTREGADO_AL_CLIENTE</span></td><td>Entregado al cliente.</td></tr>
              <tr><td><span class="chip chip-yellow">AMARILLO_PENDIENTE_PAGO</span></td><td>Entregado pero con pago pendiente</td></tr>
              <tr><td><span class="chip chip-green">COBRADO</span></td><td>Trámite finalizado. Estado terminal.</td></tr>
            </table>
          `,
        },
        {
          id: 'admin-parametros',
          titulo: 'Parámetros fiscales y catálogo de precios',
          contenido: `
            <h3>Parámetros fiscales</h3>
            <p>En <strong>Admin → Parámetros fiscales</strong> se configuran las tasas de IGI, DTA, IVA y previos para los regímenes POST_2017 y PRE_2016.</p>
            <p>El cotizador usa estos valores para calcular automáticamente los costos de importación. Actualiza estos valores si cambian las tasas arancelarias.</p>
            <h3>Catálogo de precios</h3>
            <p>En <strong>Admin → Catálogo de precios</strong> se encuentran los valores de referencia del tabulador. El sistema consulta este catálogo para estimar el valor de los vehículos al cotizar.</p>
          `,
        },
        {
          id: 'admin-auditoria',
          titulo: 'Auditoría',
          contenido: `
            <p>En <strong>Admin → Auditoría</strong> puedes ver el registro completo de acciones en el sistema: quién creó, editó o borró registros y cuándo.</p>
            <p>Útil para rastrear cambios no autorizados o errores operativos.</p>
          `,
        },
      ],
    },
    {
      nombre: 'GERENTE',
      color: 'bg-[#FEF3C7] text-[#92400E]',
      descripcion:
        'Acceso a toda la operación excepto crear/editar/borrar usuarios y borrar trámites. Ideal para el dueño o director operativo.',
      secciones: [
        {
          id: 'gerente-acceso',
          titulo: 'Módulos disponibles',
          contenido: `
            <p>El rol GERENTE tiene acceso a:</p>
            <ul>
              <li><strong>Trámites</strong> — Ver, crear, editar y cambiar estados</li>
              <li><strong>Cotizaciones</strong> — Crear, enviar y convertir a trámite</li>
              <li><strong>Clientes</strong> — Ver, crear y editar</li>
              <li><strong>Vehículos</strong> — Ver y editar</li>
              <li><strong>Pagos</strong> — Ver y registrar</li>
              <li><strong>Gastos hormiga</strong> — Ver y registrar</li>
              <li><strong>Reportes financieros</strong> — Acceso completo</li>
              <li><strong>Catálogos</strong> — Ver (no editar)</li>
              <li><strong>Campo</strong> — Ver tareas y asignar</li>
              <li><strong>Inventario</strong></li>
              <li><strong>Pedimentos</strong></li>
            </ul>
          `,
        },
        {
          id: 'gerente-reportes',
          titulo: 'Reportes financieros',
          contenido: `
            <p>Desde <strong>Finanzas → Reportes</strong> puedes ver:</p>
            <ul>
              <li>Resumen de ingresos por período</li>
              <li>Trámites cobrados vs. pendientes de pago</li>
              <li>Saldos por cliente</li>
              <li>Gastos hormiga acumulados</li>
            </ul>
            <p>Usa los filtros de fecha para acotar el período de análisis.</p>
          `,
        },
        {
          id: 'gerente-tramites',
          titulo: 'Supervisión de trámites',
          contenido: `
            <p>En <strong>Trámites</strong> puedes ver todos los trámites activos con su estado actual. El indicador de días en estado te alerta cuando un trámite lleva demasiado tiempo sin avanzar.</p>
            <h3>Cambiar estado de un trámite</h3>
            <ol>
              <li>Entra al detalle del trámite.</li>
              <li>Haz clic en <strong>Cambiar estado</strong> (o <strong>Finalizar trámite</strong> si ya fue entregado y cobrado).</li>
              <li>Selecciona el nuevo estado y agrega notas si es necesario.</li>
            </ol>
            <h3>Finalizar un trámite</h3>
            <p>Cuando el vehículo fue entregado al cliente y el pago está completo (o acordado), usa el botón verde <strong>Finalizar trámite</strong> que aparece en el header del trámite cuando el estado es <span class="chip chip-green">ENTREGADO_AL_CLIENTE</span> o <span class="chip chip-yellow">AMARILLO_PENDIENTE_PAGO</span>.</p>
          `,
        },
      ],
    },
    {
      nombre: 'OFICINA (Facturación, Coordinadora, Control de Trámites)',
      color: 'bg-[#E0E7FF] text-[#3730A3]',
      descripcion:
        'Roles de oficina enfocados en cotizaciones, clientes y pagos. No tienen acceso al módulo de campo ni a reportes financieros.',
      secciones: [
        {
          id: 'cap-cotizaciones',
          titulo: 'Cotizaciones — función principal',
          contenido: `
            <p>Tu función principal es crear y gestionar cotizaciones para clientes.</p>
            <h3>Crear cotización paso a paso</h3>
            <ol>
              <li>Ve a <strong>Cotizaciones → Nueva</strong>.</li>
              <li>Ingresa el VIN (17 caracteres). Al presionar <em>Decodificar</em>, el sistema obtiene marca, modelo, año, cilindrada de NHTSA.</li>
              <li>Busca al cliente por nombre o apodo. Si no existe, créalo desde el campo de búsqueda.</li>
              <li>El sistema calcula automáticamente: IGI, DTA, IVA, honorarios y total.</li>
              <li>Revisa el desglose y ajusta si hay conceptos especiales.</li>
              <li>Guarda o envía directamente.</li>
            </ol>
            <h3>Enviar cotización al cliente</h3>
            <ul>
              <li><strong>WhatsApp</strong> — Genera un mensaje con el resumen y lo abre en WhatsApp Web.</li>
              <li><strong>Email</strong> — Envía el PDF por correo si el cliente tiene email registrado.</li>
              <li><strong>Portal</strong> — Genera un link al portal del cliente donde puede ver la cotización.</li>
            </ul>
          `,
        },
        {
          id: 'cap-clientes',
          titulo: 'Clientes',
          contenido: `
            <p>Puedes crear y editar clientes desde <strong>Clientes</strong>.</p>
            <h3>Crear cliente</h3>
            <ol>
              <li>Haz clic en <strong>+ Nuevo cliente</strong>.</li>
              <li>El campo <strong>Apodo</strong> es el más importante: es como el equipo identifica al cliente día a día (ej. "Richie", "Charlie").</li>
              <li>El nombre completo y RFC son opcionales pero necesarios para facturación.</li>
            </ol>
          `,
        },
        {
          id: 'cap-pagos',
          titulo: 'Registro de pagos',
          contenido: `
            <p>Desde <strong>Finanzas → Pagos</strong> o desde la pestaña <em>Pagos</em> dentro de un trámite puedes registrar cobros al cliente.</p>
            <h3>Registrar un pago</h3>
            <ol>
              <li>Abre el trámite correspondiente y ve a la pestaña <em>Pagos</em>.</li>
              <li>Haz clic en <strong>Registrar pago</strong>.</li>
              <li>Llena fecha, monto, moneda (MXN o USD), método y banco.</li>
              <li>Para pagos en USD, el tipo de cambio se obtiene automáticamente de Banxico.</li>
              <li>Adjunta el comprobante bancario (obligatorio para transferencias y depósitos).</li>
            </ol>
            <p><strong>Importante:</strong> Los pagos en efectivo no requieren comprobante obligatorio pero es buena práctica adjuntar foto.</p>
          `,
        },
      ],
    },
    {
      nombre: 'CAMPO (Yarderos y Choferes)',
      color: 'bg-[#D1FAE5] text-[#065F46]',
      descripcion:
        'Roles de campo. Yarderos y choferes — solo acceso al módulo para tomar fotos y registrar tareas en yarda. Interfaz optimizada para celular.',
      secciones: [
        {
          id: 'campo-intro',
          titulo: '¿Qué es el módulo campo?',
          contenido: `
            <p>El módulo Campo es para el personal de yarda y choferes. Su función es:</p>
            <ul>
              <li>Ver las tareas de fotos asignadas (vehículos que necesitan fotografiar)</li>
              <li>Tomar las fotos desde el celular</li>
              <li>Confirmar el VIN y la ubicación del vehículo en el patio</li>
              <li>Reportar incidencias si hay algún problema</li>
            </ul>
            <p>Las fotos que subes quedan automáticamente vinculadas al trámite del vehículo.</p>
          `,
        },
        {
          id: 'campo-tomar-tarea',
          titulo: 'Tomar y completar una tarea',
          contenido: `
            <h3>Ver tareas disponibles</h3>
            <ol>
              <li>Inicia sesión y ve al módulo <strong>Campo</strong> en el menú.</li>
              <li>Verás las tareas ordenadas por estado: Abiertas, Tomadas, En yarda, Incidencias, Completadas.</li>
              <li>Cada tarjeta muestra el número de trámite, cliente, VIN y vehículo.</li>
            </ol>
            <h3>Tomar una tarea</h3>
            <ol>
              <li>Encuentra el vehículo en el patio.</li>
              <li>Haz clic en la tarea con estado <span class="chip">ABIERTA</span>.</li>
              <li>Presiona <strong>Tomar tarea</strong> para asignártela.</li>
            </ol>
            <h3>Subir fotos</h3>
            <ol>
              <li>Con la tarea en estado <span class="chip chip-yellow">TOMADA</span>, haz clic en <strong>Capturar fotos</strong>.</li>
              <li>Se activa la cámara del celular. Toma las fotos del vehículo (frente, lateral, VIN en tablero, placas).</li>
              <li>Puedes tomar varias fotos seguidas.</li>
              <li>Confirma el VIN que ves físicamente en el vehículo.</li>
              <li>Escribe la ubicación en el patio (ej. "Patio A-3").</li>
              <li>Haz clic en <strong>Enviar reporte</strong>. Las fotos se suben y la tarea pasa a <span class="chip chip-green">COMPLETADA</span>.</li>
            </ol>
            <h3>Reportar incidencia</h3>
            <p>Si no encuentras el vehículo, está dañado, o hay algún problema, marca la tarea como <strong>Incidencia</strong> y describe el problema. El equipo de oficina recibirá la alerta.</p>
          `,
        },
        {
          id: 'campo-tips',
          titulo: 'Buenas prácticas en campo',
          contenido: `
            <ul>
              <li>Toma fotos con buena iluminación. Busca sombra si hay sol directo fuerte.</li>
              <li>Siempre fotografía el VIN visible en el tablero (a través del vidrio) y en la puerta del conductor.</li>
              <li>Si el VIN que ves no coincide con el que aparece en la tarea, escríbelo en la confirmación y agrega una nota.</li>
              <li>Toma foto del odómetro.</li>
              <li>Si el vehículo tiene daños visibles, fototografíalos aunque no te lo pidan — sirve como evidencia.</li>
              <li>Actualiza la ubicación en el patio si el vehículo fue movido.</li>
            </ul>
          `,
        },
        {
          id: 'campo-faq',
          titulo: 'Preguntas frecuentes',
          contenido: `
            <h3>No veo ninguna tarea disponible</h3>
            <p>Significa que no hay trámites con solicitud de fotos en este momento. Cuando el equipo de oficina genere una tarea, aparecerá aquí. Puedes refrescar la pantalla.</p>
            <h3>No tengo señal en el patio</h3>
            <p>El sistema requiere conexión a internet para subir las fotos. Si no tienes señal, muévete a una zona con cobertura o conéctate al WiFi de la oficina antes de enviar.</p>
            <h3>Mi sesión expiró</h3>
            <p>Las sesiones duran varias horas. Si el sistema te pide que inicies sesión de nuevo, es normal. Usa tus mismas credenciales.</p>
            <h3>Subí las fotos del vehículo equivocado</h3>
            <p>Avisa inmediatamente al equipo de oficina. Ellos pueden corregir la tarea desde el sistema de escritorio.</p>
          `,
        },
      ],
    },
  ];
}
