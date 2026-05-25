# Auditoría UX/Design System — RR Importaciones

> Fecha: 2026-05-25
> Referencia: DESIGN.md + design-system.css existente

---

## Resumen General

**Estado:** Muy alineado con DESIGN.md. El proyecto ya tiene un design-system.css maduro.

| Criterio | Estado | Detalle |
|---|---|---|
| Design Tokens | ✅ Listo | `--n-*`, `--rr-*`, `--green/amber/blue-*` definidos |
| Easing / Motion | ✅ Listo | `--ease-out-quart/quint/expo/spring` |
| `prefers-reduced-motion` | ✅ Listo | Ya implementado en design-system.css:496 |
| Badge system | ✅ Listo | `.badge`, `.badge-activo/pendiente/finalizado/...` |
| Card system | ✅ Listo | `.card-elevated` con hover states |
| Button system | ✅ Listo | `.btn-primary` con micro-interacciones |

---

## Hallazgos y Oportunidades

### 1. `#fff` inline vs variables CSS

Encontrados ~70 usos de `#fff` o `white`. La mayoría son **válidos**:

```css
/* VÁLIDO: texto blanco sobre fondo coloreado/oscuro */
color: #fff;  /* en botones primarios, tabs activos, sidebar */

/* OPORTUNIDAD: fondo que podría usar variable */
background: #fff;  /* podría ser var(--bg-surface) o var(--n-0) */
```

**Prioridad:** Baja. Es una refactorización cosmética sin impacto funcional.

---

### 2. Glassmorphism / Backdrop Filter

Encontrados 22 usos de `backdrop-filter: blur()`.

**Clasificación:**

| Uso | Ubicación | Evaluación |
|---|---|---|
| blur(3-4px) | Backdrops de modales/dialogs | ✅ Funcional: para dar foco al modal |
| blur(16px) | Topbar `.topbar-glass` | ✅ Ya usa clase del design system |
| blur(24-28px) | Login screen | ✅ Excepción permitida: DESIGN.md dice login puede ser tema oscuro |
| blur(8-20px) | Portal cliente + Campo | ⚠️ Usan blur fuerte. Ver si corresponde o es decorativo |

**Recomendación:**
- Las clases `.glass`, `.glass-strong`, `.glass-card` YA EXISTEN en design-system.css:166-195
- Algunos componentes están replicando los estilos inline en lugar de usar las clases

---

### 3. Alineación con DESIGN.md

| Regla de DESIGN.md | Cumplimiento |
|---|---|
| Neutrales tintados, no `#000`/`#fff` puros | ✅ Tokens usan `--n-*` con matiz |
| Rojo ≤10% del UI, solo para acción/alerta | ✅ Seguido (btn-primary, errores, ROJO_DESADUANADO) |
| Sin `border-left` grueso como acento | ✅ No encontrado |
| Sin gradient text | ✅ No encontrado (`background-clip:text`) |
| Motion: solo `transform`/`opacity` | ✅ Animaciones definidas usan estas propiedades |
| Ease-out curves | ✅ `--ease-out-quint` es default |

---

## Próximos Pasos Recomendados

### Inmediatos (Alta Prioridad)

**Task 8: Accesibilidad (a11y)**
- Buscar inputs sin `aria-label`
- Verificar botones icono sin descripción
- Contrast ratios (aunque ya parece bueno visualmente)

**Task 11: Módulo Campo (Mobile)**
- Verificar tap targets ≥44px
- Safe area env para notch
- Font sizes en móvil no muy pequeños

### Mediano Plazo

**Refactor cosmética:**
1. Usar `var(--bg-surface)` en lugar de `background: #fff` inline
2. Usar las clases `.glass*` predefinidas en lugar de replicar estilos

**Nuevos componentes:**
- `EmptyStateComponent` standalone para empty states estandarizados
- Unificar micro-copy en notificaciones/toasts

---

## Conclusión

**Este NO es un proyecto con deuda UX grave.** Es un sistema con:
- ✅ Design tokens bien definidos
- ✅ Sistema de componentes emergente
- ✅ Motion con propósito
- ✅ Accesibilidad básica (prefers-reduced-motion)

Las oportunidades son de **pulido**, no de reconstrucción.
