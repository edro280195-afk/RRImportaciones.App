# DESIGN.md — R&R Importaciones · Sistema de Diseño

## Color Strategy
**Restrained.** Neutrales tintados + un solo acento (#C61D26) usado con parsimonia.

### Paleta base (OKLCH)
| Token | Valor | Uso |
|---|---|---|
| `surface-0` | `oklch(97% 0.005 245)` | Fondo de página principal |
| `surface-1` | `oklch(99% 0.003 245)` | Tarjetas / paneles |
| `border` | `oklch(90% 0.008 245)` | Separadores, rings |
| `text-primary` | `oklch(8% 0.010 245)` | Títulos y valores |
| `text-secondary` | `oklch(42% 0.012 245)` | Labels, descripciones |
| `text-muted` | `oklch(62% 0.010 245)` | Metadatos, timestamps |
| `accent` | `#C61D26` | Botón primario, errores críticos, estado ROJO |

### Acentos por categoría de rol
| Categoría | Color | Hex |
|---|---|---|
| SISTEMA | Púrpura | `#A21CAF` |
| OFICINA | Azul | `#1D4ED8` |
| CAMPO | Verde | `#15803D` |

### Tema
**Claro.** Oficinas con buena iluminación diurna. El personal de campo usa móvil al aire libre — alto contraste es crítico.

La única excepción es la pantalla de login, que usa un tema oscuro (`oklch(12% 0.009 245)`) para comunicar acceso seguro / sistema de control.

## Tipografía
- **Font body:** System UI stack — `system-ui, -apple-system, sans-serif`
- **Font mono:** `'Courier New', Courier, monospace` — para VINs, PINs, códigos
- **Escala:** 10.5px (labels) · 12–13px (metadata) · 13.5–14px (body) · 22–30px (títulos de módulo)
- **Pesos:** 400 (body), 600 (semi), 700 (bold/labels), 800 (headlines)

## Elevación y espacio
- Sin sombras decorativas en cards. Solo `ring-1 ring-[#EAEDF2]` como separación.
- Drawers: `shadow-[-20px_0_50px_-20px_rgba(13,16,23,0.35)]`
- Espaciado de secciones: asimétrico — primera sección tighter, las siguientes con más aire.

## Componentes clave

### Chip de categoría de rol
- SISTEMA: `bg-[#FAF5FF] text-[#6B21A8] ring-[#E9D5FF]`
- OFICINA: `bg-[#EFF6FF] text-[#1E3A8A] ring-[#DBEAFE]`
- CAMPO: `bg-[#F0FDF4] text-[#14532D] ring-[#BBF7D0]`

### Inputs
- `rounded-xl` · `ring-1 ring-[#EAEDF2]` · `focus:ring-2 focus:ring-[#1D4ED8]/30`
- Clase global: `.input-field`

### Botón primario
- `bg-[#C61D26]` (o clase `.btn-primary`) · `text-white` · `rounded-xl`
- Sin gradiente. Sin sombras decorativas pesadas.

### Drawer (panel lateral)
- `max-w-[520px]` o `max-w-[560px]` dependiendo del contenido
- Transición: `cubic-bezier(0.22,1,0.36,1)` · 300ms
- Backdrop: `bg-[#0D1017]/30`

## Lo que NO hacer
- No usar `border-left` grueso como acento de color en cards
- No usar `background-clip: text` con gradiente (gradient text)
- No glassmorphism decorativo
- No el template "big number / small label / gradient accent" en métricas
- No grids de cards idénticas con icon+heading+text
- No em dashes (—): usar coma, dos puntos o paréntesis
