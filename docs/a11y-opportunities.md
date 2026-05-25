# Oportunidades de Accesibilidad (a11y) — Inventario

> Fecha: 2026-05-25

---

## Hallazgos

### 1. Inputs con placeholder
Encontrados ~98 inputs con `placeholder=`.

**Evaluación:**
- Placeholder descriptivo SÍ es leído por screen readers como etiqueta alternativa
- La mayoría están en formularios que ya tienen contexto visual
- **Riesgo de agregar aria-label masivo:** Desincronización si cambia el placeholder pero no el aria-label

**Recomendación incremental:**
Agregar `aria-label` SOLO cuando:
1. El placeholder es genérico o corto (`placeholder="..."`)
2. El input está fuera de un formulario etiquetado
3. Es una acción crítica sin contexto visual

### 2. Botones Icono
Patrón buscado: `<button><svg>...</svg></button>` sin texto visible.

**Ejemplos en el código:**
- Botones de eliminar/edit en tablas
- Botón de cámara en campo-captura
- Botones de navegación/paginación

**Recomendación:**
Todo botón que solo tiene SVG necesita:
```html
<button aria-label="Eliminar trámite">
  <svg>...</svg>
</button>
```

### 3. Tablas
Las tablas en trámites, clientes, vehículos:
- Tienen `<thead>` y `<th>` → ✅ Bueno
- Verificar si necesitan `scope="col"` en headers

---

## Priorización

| Mejora | Esfuerzo | Impacto |
|---|---|---|
| Botones icono sin aria-label en módulo campo | Bajo | Alto (usuarios de screen reader) |
| Safe area env para notch en móvil | Bajo | Alto (todos los usuarios móviles) |
| Tap targets ≥44px | Bajo | Alto (todos los usuarios móviles) |
| Agregar aria-label a 98 inputs | Alto | Medio |
| scope="col" en headers de tabla | Bajo | Bajo |

---

## Próximo Paso Recomendado

**Hacer Task 11 primero:** Responsividad del Módulo Campo tiene más impacto tangible y es más fácil de validar.

Los cambios de a11y en aria-label pueden hacerse gradualmente conforme se tocan esos archivos por otras razones.
