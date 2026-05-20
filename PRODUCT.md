# PRODUCT.md — R&R Importaciones · Sistema de Gestión Aduanal

## Product Purpose
Sistema interno de administración para R&R Importaciones, agencia aduanal en Nuevo Laredo, Tamaulipas. Maneja el ciclo completo de importación de vehículos usados desde Estados Unidos: cotizaciones con cálculo fiscal automático (IGI, DTA, IVA), seguimiento de trámites aduanales, gestión de clientes, pedimentos, facturación y operaciones de yarda/patio.

No es un producto público. Es una herramienta de trabajo interna usada todos los días por el equipo. La velocidad, claridad y precisión de la información importan más que la ornamentación.

## Register
product

## Users

### Ricardo Carreón (ADMIN)
Director/dueño. Acceso total. Ve reportes financieros, configura el sistema, gestiona usuarios. Usa el sistema desde escritorio en oficina.

### Ricardo Herrera (GERENTE)
Supervisa operaciones sin poder borrar datos. Mismo contexto que el admin.

### Personal de Oficina (FACTURACION · COORDINADORA · CONTROL_TRAMITES)
Carmen Velarde (Facturación), Laura Aranda (Coordinadora), Javier Rdz (Control de trámites). Trabajan en escritorio en la oficina. Crean cotizaciones, registran clientes, hacen seguimiento de trámites y pagos. No acceden al módulo de campo.

### Personal de Campo (YARDERO · CHOFER)
Luis Ricardo Santos, Uriel Álvarez (yarderos), Héctor Rodríguez, Omar Torres, Simón Juárez, Angel, Andrés Cavazos (choferes). Usan el sistema principalmente desde celular en la yarda o en entregas. Acceden con PIN de 6 dígitos. Toman fotos de vehículos, confirman entregas.

## Brand

**Nombre:** R&R Importaciones  
**Sub:** Agencia Aduanal  
**Color corporativo:** Rojo #C61D26 — es el único acento real. Se usa con autoridad, no decorativamente.  
**Tono:** Serio, directo, industrial. No es startup. Es una empresa familiar de operaciones aduanales.  
**Anti-references:** Material Design, Tailwind UI templates, SaaS con cream background, glassmorphism.

## Strategic Principles

1. **Claridad operativa primero.** El personal de campo puede tener poco tiempo y malas condiciones de luz. La UI debe ser legible al primer golpe de vista.
2. **Datos densos, no pájaros bonitos.** Los usuarios de oficina necesitan ver mucha información a la vez. No ocultar datos en accordions innecesarios.
3. **Estado persistente visible.** El trámite siempre muestra su estado actual de forma prominente. El usuario nunca debe preguntarse "¿en qué paso voy?"
4. **El rojo solo para acción o alerta.** No decorar con el color corporativo. Reservar para botones primarios, errores críticos y estado ROJO_DESADUANADO.
5. **Sin modales como primera solución.** Preferir paneles laterales (drawers), expansiones inline y navegación hacia una página dedicada.
