# Product

## Register

product

## Users

Operadores internos de R&R Importaciones: Carmen (capturista/facturación), Laura (coordinadora), Javier (control de trámites) y Ricardo (admin/dueño). Trabajan en oficina en Nuevo Laredo, frente a la pantalla desde las 8am hasta las 6pm. La luz es mixta: natural por la mañana, fluorescente después del mediodía. El sistema es su herramienta principal de trabajo, no algo que abren ocasionalmente. El primary job: cotizar importaciones de vehículos con precios exactos del SAT, convertir cotizaciones a trámites, y rastrear el estado de cada vehículo.

## Product Purpose

Sistema interno de gestión de importaciones vehiculares para una agencia aduanal en Nuevo Laredo. Administra cotizaciones fiscales (IGI, DTA, IVA, PREV), trámites de importación, pagos, eventos de campo, y el catálogo de precios estimados del Anexo 2 del SAT. El éxito se mide en cotizaciones correctas a la primera, trámites sin errores fiscales, y operadores que confían en los números que ve el sistema.

## Brand Personality

Preciso, confiable, sin adornos. Como una herramienta de precisión: no impresiona por apariencia sino porque no falla.

## Anti-references

- Formularios de gobierno: grises planos, sin jerarquía, todo el mismo tamaño, como si nadie hubiera diseñado nada.
- SaaS genérico: azul primario inodoro, cards con icono+título+texto repetidos, métricas hero que no significan nada, paleta que podría ser de cualquier startup del mundo.
- Dashboards con gráficas innecesarias: visualizaciones de datos donde lo que se necesita son números claros, no donuts.

## Design Principles

1. **Los datos son el diseño.** Cada elemento de UI existe para hacer un número o una decisión más clara. Nada decora si no informa.
2. **La densidad es respeto.** Carmen tiene 30 cotizaciones pendientes. Una tabla densa bien jerarquizada es más útil que tarjetas espaciosas.
3. **El error es costoso.** Los estados de error, advertencia y confirmación son críticos, no accesorios. Un precio incorrecto en aduana tiene consecuencias reales.
4. **Velocidad percibida importa.** Feedback inmediato en cada acción. Skeleton loaders, transiciones cortas, no spinners de página completa.
5. **Coherencia total.** Cada pantalla nueva que abra Carmen debe verse parte del mismo sistema, no como trabajo de otro equipo.

## Accessibility & Inclusion

WCAG 2.1 AA. Contraste ≥ 4.5:1 en texto normal. Focus-visible en todos los elementos interactivos. Tabular numerals (font-feature tnum) en todos los campos de precio y monto para que las columnas alineen verticalmente.
