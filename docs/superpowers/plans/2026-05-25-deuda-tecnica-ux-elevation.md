# Plan de Acción: Deuda Técnica + Elevación UX

> **For agentic workers:** REQUIRED SUB-SKILL: Usa executing-plans para implementar este plan task-by-task.

**Goal:** Llevar R&R Importaciones de Beta a Nivel Producción: CI/CD funcional, cobertura de pruebas crítica, tooling de calidad, y refinamiento UX premium.

**Architecture:** 
- Backend: Clean Architecture (.NET 10) + xUnit
- Frontend: Angular 19 Standalone + Signals + Tailwind CSS
- Infra: Docker + GitHub Actions + Render + Vercel

**Tech Stack:** .NET 10, Angular 19, Tailwind CSS v4, PostgreSQL, Docker, GitHub Actions, ESLint, Prettier, Roslyn Analyzers

---

## Fase 1: Base de Calidad (Deuda Técnica)

### Task 1: Pipeline CI/CD Básico (Backend)

**Files:**
- Create: `.github/workflows/backend-ci.yml`
- Modify: `backend/RR.slnx` (verificación de proyectos)
- Check: `backend/RR.Api/Properties/launchSettings.json`

**Objetivo:** Build + tests corran automáticamente en cada PR/push a main.

- [ ] **Paso 1: Crear workflow de CI para backend**

```yaml
name: Backend — CI

on:
  push:
    branches: [main]
    paths: ['backend/**']
  pull_request:
    branches: [main]
    paths: ['backend/**']

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'
          
      - name: Restaurar dependencias
        run: dotnet restore backend/RR.slnx
        
      - name: Build
        run: dotnet build backend/RR.slnx --configuration Release --no-restore
        
      - name: Ejecutar tests
        run: dotnet test backend/RR.slnx --configuration Release --no-build --verbosity normal --collect:"XPlat Code Coverage"
        
      - name: Upload cobertura (artifact)
        uses: actions/upload-artifact@v4
        with:
          name: coverage-backend
          path: '**/TestResults/**'
        if: always()
```

- [ ] **Paso 2: Verificar que el workflow sea válido**

Commit inicial del pipeline:

```bash
git add .github/workflows/backend-ci.yml
git commit -m "ci: agrega pipeline CI de backend (build + tests)"
```

---

### Task 2: Pipeline CI/CD Básico (Frontend)

**Files:**
- Create: `.github/workflows/frontend-ci.yml`
- Check: `frontend/package.json` scripts

**Objetivo:** TypeScript check + build del frontend en CI.

- [ ] **Paso 1: Crear workflow de CI para frontend**

```yaml
name: Frontend — CI

on:
  push:
    branches: [main]
    paths: ['frontend/**']
  pull_request:
    branches: [main]
    paths: ['frontend/**']

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Instalar dependencias
        run: npm ci
        working-directory: frontend
        
      - name: TypeScript check (sin build completo)
        run: npx tsc --noEmit
        working-directory: frontend
        
      - name: Build producción
        run: npm run build
        working-directory: frontend
        env:
          NODE_OPTIONS: '--max-old-space-size=4096'
```

- [ ] **Paso 2: Commit**

```bash
git add .github/workflows/frontend-ci.yml
git commit -m "ci: agrega pipeline CI de frontend (tsc + build)"
```

---

### Task 3: Linting + Formatting (Frontend)

**Files:**
- Create: `frontend/.eslintrc.json`
- Create: `frontend/.prettierrc`
- Create: `frontend/.prettierignore`
- Modify: `frontend/package.json` (agregar scripts)
- Check: `frontend/tsconfig.json`

**Objetivo:** ESLint + Prettier configurados y ejecutables.

- [ ] **Paso 1: Instalar dependencias de dev**

```bash
cd frontend
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-prettier @angular-eslint/eslint-plugin @angular-eslint/eslint-plugin-template @angular-eslint/template-parser
```

- [ ] **Paso 2: Crear .eslintrc.json**

```json
{
  "root": true,
  "ignorePatterns": ["projects/**/*"],
  "overrides": [
    {
      "files": ["*.ts"],
      "parser": "@typescript-eslint/parser",
      "parserOptions": {
        "project": ["tsconfig.json"],
        "createDefaultProgram": true
      },
      "plugins": ["@typescript-eslint", "@angular-eslint"],
      "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:@angular-eslint/recommended",
        "prettier"
      ],
      "rules": {
        "@angular-eslint/directive-selector": [
          "error",
          { "type": "attribute", "prefix": "app", "style": "camelCase" }
        ],
        "@angular-eslint/component-selector": [
          "error",
          { "type": "element", "prefix": "app", "style": "kebab-case" }
        ],
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/unbound-method": "off",
        "@typescript-eslint/no-unsafe-assignment": "warn",
        "@typescript-eslint/no-unsafe-member-access": "warn",
        "@typescript-eslint/no-floating-promises": "error",
        "no-console": ["warn", { "allow": ["warn", "error"] }]
      }
    },
    {
      "files": ["*.html"],
      "parser": "@angular-eslint/template-parser",
      "plugins": ["@angular-eslint/template"],
      "extends": [
        "plugin:@angular-eslint/template/recommended",
        "plugin:@angular-eslint/template/accessibility"
      ],
      "rules": {}
    }
  ]
}
```

- [ ] **Paso 3: Crear .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "endOfLine": "lf",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

- [ ] **Paso 4: Crear .prettierignore**

```
dist/
node_modules/
*.css
*.md
```

- [ ] **Paso 5: Agregar scripts a package.json**

Dentro de `"scripts"`:

```json
"lint": "ng lint || eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write \"src/**/*.{ts,html,json}\"",
"format:check": "prettier --check \"src/**/*.{ts,html,json}\""
```

- [ ] **Paso 6: Commit**

```bash
git add frontend/package.json frontend/.eslintrc.json frontend/.prettierrc frontend/.prettierignore
git commit -m "style: configura ESLint + Prettier en frontend"
```

---

### Task 4: EditorConfig Global + Roslyn Analyzers (Backend)

**Files:**
- Create: `.editorconfig` (raíz)
- Modify: `backend/Directory.Build.props` (crear si no existe)
- Check: proyectos .csproj

**Objetivo:** Consistencia de formato + análisis estático en backend.

- [ ] **Paso 1: Crear .editorconfig en raíz**

```ini
root = true

[*]
charset = utf-8
end_of_line = crlf
indent_size = 4
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true

[*.json]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
max_line_length = off

[*.{js,ts,tsx,jsx}]
indent_size = 2

[*.{cs,vb}]
indent_size = 4
dotnet_sort_system_directives_first = true
dotnet_separate_import_directive_groups = false

[*.{cshtml,html}]
indent_size = 2

[*.css]
indent_size = 2

[Makefile]
indent_style = tab
```

- [ ] **Paso 2: Crear Directory.Build.props en backend/**

```xml
<Project>
  <PropertyGroup>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <EnableNETAnalyzers>true</EnableNETAnalyzers>
    <AnalysisLevel>latest</AnalysisLevel>
    <AnalysisMode>AllEnabledByDefault</AnalysisMode>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="StyleCop.Analyzers" Version="1.2.0-beta.556">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
  </ItemGroup>
</Project>
```

- [ ] **Paso 3: Eliminar stub vacío RR.Tests/UnitTest1.cs**

Verificar si existe y eliminarlo:

```bash
rm -f "C:\Codigos\RRImportaciones\backend\RR.Tests\UnitTest1.cs"
```

- [ ] **Paso 4: Commit**

```bash
git add .editorconfig backend/Directory.Build.props
git commit -m "style: agrega .editorconfig global y Roslyn analyzers"
```

---

### Task 5: Cobertura de Pruebas — Servicios Core (Backend)

**Files:**
- Create/Modify: `backend/RR.Tests/Services/AuthServiceTests.cs`
- Create/Modify: `backend/RR.Tests/Services/CotizacionServiceTests.cs`
- Create/Modify: `backend/RR.Tests/Services/PagoServiceTests.cs`
- Check: `backend/RR.Application/Interfaces/`

**Objetivo:** Expandir pruebas a servicios con mayor riesgo empresarial.

Patrón a seguir (igual que FiscalCalculatorTests):

- [ ] **Paso 1: Estructura de prueba de servicio con Moq**

Ejemplo plantilla para `AuthServiceTests.cs`:

```csharp
using FluentAssertions;
using Moq;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Services;
using Xunit;

namespace RR.Tests.Services;

public class AuthServiceTests
{
    private readonly Mock<IUsuarioRepository> _usuarioRepoMock;
    private readonly Mock<IJwtService> _jwtServiceMock;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _usuarioRepoMock = new Mock<IUsuarioRepository>();
        _jwtServiceMock = new Mock<IJwtService>();
        _sut = new AuthService(_usuarioRepoMock.Object, _jwtServiceMock.Object);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsTokenResponse()
    {
        // Arrange
        var email = "test@rrimportaciones.com";
        var password = "Password123!";
        var usuario = new Usuario { Email = email, PasswordHash = "$2a$11$..." };
        
        _usuarioRepoMock
            .Setup(r => r.GetByEmailAsync(email))
            .ReturnsAsync(usuario);

        // Act
        // var result = await _sut.Login(email, password);

        // Assert
        // result.Should().NotBeNull();
    }
}
```

- [ ] **Paso 2: Identificar interfaces críticas para testear**

Prioridad alta:
1. `AuthService` (login, refresh tokens)
2. `CotizacionService` (creación, cálculo fiscal)
3. `PagoService` (registro, verificación)
4. `TramiteService` (cambio de estado)
5. `PortalService` (token HMAC, acceso cliente)

- [ ] **Paso 3: Commit**

```bash
git add backend/RR.Tests/
git commit -m "test: expande cobertura a servicios core"
```

---

### Task 6: Pipeline con Linting + Quality Gates

**Files:**
- Modify: `.github/workflows/backend-ci.yml`
- Modify: `.github/workflows/frontend-ci.yml`
- Create: `.github/workflows/quality-gate.yml` (opcional)

**Objetivo:** PRs no se mergean si fallan lint/tests/build.

- [ ] **Paso 1: Agregar lint step a frontend-ci.yml**

Después del TypeScript check, agregar:

```yaml
- name: Verificar formato Prettier
  run: npm run format:check
  working-directory: frontend
  continue-on-error: true
  
- name: ESLint
  run: npm run lint
  working-directory: frontend
  continue-on-error: true
```

- [ ] **Paso 2: Agregar warning de analyzers en backend-ci.yml**

En el build step, asegurarse de que `TreatWarningsAsErrors` esté activado:

```yaml
- name: Build con warnings como errores
  run: dotnet build backend/RR.slnx --configuration Release --no-restore -p:TreatWarningsAsErrors=true
```

- [ ] **Paso 3: Commit**

```bash
git add .github/workflows/
git commit -m "ci: integra linting en pipelines de CI"
```

---

## Fase 2: Elevación UX / Estética

### Task 7: Auditoría de Diseño y Consistencia

**Files:**
- Review: `frontend/src/app/pages/dashboard/dashboard.component.ts`
- Review: `frontend/src/app/pages/tramites/tramites-list.component.ts`
- Review: `frontend/src/styles.css` o `src/tailwind.config.js`
- Check: `DESIGN.md`

**Objetivo:** Asegurar que todo el UI respete el sistema de diseño de DESIGN.md.

- [ ] **Paso 1: Verificar uso de tokens OKLCH**

Regla de DESIGN.md: No usar `#000` ni `#fff`. Usar neutrales tintados.

Buscar en componentes:
- `#000`, `#fff`, `black`, `white` inline styles
- Verificar que se usen `var(--text-primary)`, `var(--surface-0)`, etc.

- [ ] **Paso 2: Verificar estrategia "Restrained"**

El rojo `#C61D26` debe ser ≤10% del UI. Solo para:
- Botones primarios
- Errores críticos  
- Estado `ROJO_DESADUANADO`

- [ ] **Paso 3: Verificar componentes clave**

| Componente | Clases esperadas |
|---|---|
| Botón primario | `btn-primary`, `bg-[#C61D26]` |
| Input | `input-field`, `rounded-xl` |
| Chip categoría | Badge por rol (SISTEMA/OFICINA/CAMPO) |

- [ ] **Paso 4: Escribir hallazgos en doc**

Crear `docs/ux-audit-2026.md` con:
- Inconsistencias encontradas
- Elementos a refinar

---

### Task 8: Accesibilidad (a11y) y Semántica

**Files:**
- All: `frontend/src/app/**/*.ts` (templates inline)
- Check: Contrast ratios, labels, ARIA

**Objetivo:** Cumplir WCAG 2.1 AA como mínimo.

- [ ] **Paso 1: Verificar contrast ratio**

Critico para personal de campo en exteriores:
- Text primary sobre surface: ≥4.5:1
- Botones: ≥4.5:1
- Estado "disabled": no necesita mismo ratio pero sí ser visible

- [ ] **Paso 2: Labels en inputs sin texto visible**

Todo input necesita:
- `<label>` asociado, O
- `aria-label`, O
- `aria-labelledby`

Buscar inputs con placeholder pero sin aria-label.

- [ ] **Paso 3: Botones icono**

Todo `<button>` que solo tiene un SVG necesita:
- `aria-label` describiendo la acción

Ejemplo:
```html
<!-- Mal -->
<button (click)="delete()"><svg>...</svg></button>

<!-- Bien -->
<button (click)="delete()" aria-label="Eliminar trámite"><svg>...</svg></button>
```

- [ ] **Paso 4: Tab order y focus visible**

Verificar que:
- No hay `outline: none` sin reemplazo
- Estados `:focus-visible` son distinguibles

---

### Task 9: Micro-interacciones y Motion Refinado

**Files:**
- `frontend/src/app/pages/dashboard/dashboard.component.ts` (stagger animations)
- `frontend/src/app/pages/tramites/tramites-list.component.ts`
- Globales: `frontend/src/styles.css`

**Objetivo:** Motion con propósito, no decorativo.

Leyes de motion de DESIGN.md:
- No animar propiedades de layout (`width`, `height`, `margin`, `top`)
- Usar `transform` y `opacity`
- Ease out: `cubic-bezier(0.22, 1, 0.36, 1)` o similar

- [ ] **Paso 1: Unificar curvas de easing**

Crear variables CSS globales:

```css
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-leisure: 300ms;
}
```

- [ ] **Paso 2: Verificar stagger timing**

El dashboard ya usa `stagger-item` con delays. Verificar:
- Máximo delay base: ~250ms (no más, se siente lento)
- Móvil puede usar delays más cortos o ninguno

- [ ] **Paso 3: Hover states intencionales**

Para botones y filas clickeables:
- Escala sutil: `scale(1.01)` o `scale(1.02)`
- O solo cambio de background con transición rápida
- **Nunca:** `scale(1.1)` — se siente como juego, no herramienta empresarial

- [ ] **Paso 4: Reduced motion**

Respetar `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### Task 10: Estado Vacío y Onboarding

**Files:**
- Buscar patrones `@empty` en templates
- `dashboard.component.ts` ya tiene empty states
- `tramites-list.component.ts` también

**Objetivo:** Cada empty state es útil, no decorativo.

Checklist por empty state:
- [ ] Tiene un ícono que representa el dominio
- [ ] El copy explica POR QUÉ está vacío
- [ ] Idealmente explica CÓMO llenarlo
- [ ] Tiene un CTA directo cuando corresponde

Ejemplo bueno (dashboard ya lo tiene):
```
"Sin trámites registrados" +
"Los trámites se inician desde una cotización aceptada." +
Botón "Nueva cotización →"
```

- [ ] **Paso 1: Inventariar todos los empty states**

Buscar `@empty` en todo el frontend:

```bash
cd frontend/src/app
grep -rn "@empty" --include="*.ts"
```

- [ ] **Paso 2: Estandarizar patrón**

Crear un componente standalone reutilizable:
`frontend/src/app/shared/empty-state/empty-state.component.ts`

Con inputs:
- `icon: string` (SVG path o nombre)
- `title: string`
- `description?: string`
- `actionLabel?: string`
- `(action)?: EventEmitter<void>`

---

### Task 11: Responsividad — Modo Campo (Mobile Critical)

**Files:**
- `frontend/src/app/pages/campo/*.ts`
- Todos los componentes con media queries inline

**Objetivo:** El módulo de campo es usable con un dedo, bajo sol.

Checklist móvil (≤480px):
- [ ] Tap targets ≥44×44px (botones, filas clickeables)
- [ ] Font size body ≥14px (nunca 11px o 12px para texto principal)
- [ ] Padding suficiente para no tocar bordes de pantalla
- [ ] Teclado no oculta inputs críticos

- [ ] **Paso 1: Verificar módulo de campo**

Especial atención a:
- `campo-pin.component.ts`: el pin pad debe ser fácil de tocar
- `campo-tareas.component.ts`: lista scrolleable
- `campo-captura.component.ts`: botón de cámara prominente

- [ ] **Paso 2: Agregar variable de safe area**

Para notch/displays modernos:

```css
:root {
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left: env(safe-area-inset-left);
  --safe-right: env(safe-area-inset-right);
}
```

Y usar en layouts:
```css
padding-bottom: max(16px, var(--safe-bottom));
```

---

## Fase 3: Delight y Personalidad (Sin Romper Seriedad)

### Task 12: Toasts / Feedback — Consistencia y Personalidad

**Files:**
- `frontend/src/app/shared/feedback/feedback-host.component.ts`
- `frontend/src/app/services/notification.service.ts`

**Objetivo:** Feedback claro, no intrusivo, con personalidad medida.

Reglas para feedback en herramienta empresarial:
- Éxito: breve (~2.5s), no bloqueante
- Error: debe quedarse hasta que el usuario lo cierre o lea
- Warning: similar a error pero menos urgente
- **Nunca:** Sonidos automáticos sin consentimiento

- [ ] **Paso 1: Inventariar tipos de notificación**

Ver si existe:
- Success
- Error
- Warning
- Info
- Confirmación (antes de borrar, etc.)

- [ ] **Paso 2: Micro-copy con voz de marca**

Mal: "Operación completada exitosamente"
Mejor: "Trámite actualizado" / "Pago registrado" / "Cotización enviada"

Siempre concreto, siempre refiriéndose al dominio.

---

### Task 13: Dashboard — Jerarquía Visual y Densidad

**Files:**
- `frontend/src/app/pages/dashboard/dashboard.component.ts`

El dashboard ya está muy bien. Oportunidades de refinamiento:

- [ ] **Paso 1: Visual weight de los stats**

¿Es el orden correcto según quién mira el dashboard?
1. Trámites activos
2. Cobrado este mes
3. Por cobrar
4. Vehículos en patio

Para Don Ricardo (owner), el orden financiero podría ser primero.

- [ ] **Paso 2: El "sin avance" (atrasados) debe ser imposible ignorar**

Ya tiene:
- Pulse animation en el dot
- Rojo de fondo en encabezado
- Tabla con color coding por días

Verificar en móvil: ¿se ve igual de alarmante?

---

## Entregables del Plan

| Entregable | Archivo / Ubicación |
|---|---|
| Pipeline Backend | `.github/workflows/backend-ci.yml` |
| Pipeline Frontend | `.github/workflows/frontend-ci.yml` |
| ESLint + Prettier | `frontend/.eslintrc.json`, `frontend/.prettierrc` |
| EditorConfig Global | `.editorconfig` |
| Roslyn Analyzers | `backend/Directory.Build.props` |
| Tests expandidos | `backend/RR.Tests/Services/*` |
| UX Audit | `docs/ux-audit-2026.md` |
| Empty State Component | `frontend/src/app/shared/empty-state/` |
| CSS Variables Motion | `frontend/src/styles.css` |

---

## Prioridad de Ejecución

**Alta (hacer primero):**
1. Task 1 + 2: Pipelines CI básicos
2. Task 4: EditorConfig + TreatWarningsAsErrors
3. Task 7: Auditoría de consistencia con DESIGN.md

**Media:**
4. Task 3: ESLint + Prettier
5. Task 5: Tests de servicios core
6. Task 8: Accesibilidad
7. Task 9: Motion refinado

**Baja (delight):**
8. Task 10: Empty states componentizado
9. Task 11: Responsividad campo
10. Task 12: Feedback/toasts
11. Task 13: Dashboard refinamiento

---

Plan listo. Puedo ejecutar las tareas en bloques o una por una. ¿Por cuál empezamos?
