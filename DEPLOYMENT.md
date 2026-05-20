# Deployment - R&R Importaciones

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │    Render       │
│  (Frontend)     │────▶│    (Backend)    │
│  Landing Page   │     │    (API .NET)   │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │  PostgreSQL  │
                          │   (Render)   │
                          └──────────────┘
```

---

## 1. Render - Backend (.NET API)

### Pasos:

1. **Crear PostgreSQL en Render**
   - Dashboard → New → PostgreSQL
   - Nota: guarda las credenciales (host, database, user, password)

2. **Crear Web Service en Render**
   - Dashboard → New → Web Service
   - Conectar repositorio de GitHub
   - Root Directory: `backend/RR.Api`
   - Build Command: `dotnet publish -c Release`
   - Start Command: `dotnet RR.Api.dll`
   - Environment Variables (ver abajo)

### Variables de Entorno (Render - Backend):

```env
# Base de datos (reemplaza con tus credenciales de Render PostgreSQL)
ConnectionStrings__DefaultConnection=Host=pg.render.internal;Port=5432;Database=rrimportaciones;Username=rruser;Password=CONTRASEÑA_PG

# JWT - Genera una clave segura de al menos 32 caracteres
JwtSettings__SecretKey=TU_JWT_SECRET_MUY_LARGO_Y_SEGURO_AQUI_12345678901234567890
JwtSettings__Issuer=RRImportaciones
JwtSettings__Audience=RRImportacionesApp
JwtSettings__ExpirationMinutes=60
JwtSettings__RefreshTokenExpirationDays=7

# Portal Access - Clave para tokens HMAC (mínimo 64 caracteres)
PortalAccess__SecretKey=TU_PORTAL_SECRET_MUY_LARGO_para_hmac_aqui_64_chars_minimo_1234567890

# Storage (Cloudflare R2)
Storage__Provider=R2
Storage__R2__AccountId=TU_R2_ACCOUNT_ID
Storage__R2__AccessKeyId=TU_R2_ACCESS_KEY
Storage__R2__SecretAccessKey=TU_R2_SECRET_KEY
Storage__R2__Bucket=ryrimportaciones
Storage__R2__PublicBaseUrl=https://pub-tu-id.r2.dev

# Email (SMTP)
Smtp__Host=smtp.mailtrap.io
Smtp__Port=587
Smtp__Username=TU_MAILTRAP_USERNAME
Smtp__Password=TU_MAILTRAP_PASSWORD
Smtp__FromEmail=cotizaciones@rrimportaciones.com
Smtp__FromName=R&R Importaciones
Smtp__UseSsl=true

# App
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080

# AI (opcional - para cotizador)
AiProvider=openai
OpenAi__ApiKey=TU_OPENAI_API_KEY
# O si usas Gemini:
GeminiApiKey=TU_GEMINI_API_KEY

# Banxico (opcional)
BanxicoApiToken=TU_BANXICO_TOKEN
```

---

## 2. Vercel - Frontend (Angular SaaS)

### Opción A: Deploy como Static (recomendado)

1. **Configurar environment para producción**
   ```typescript
   // frontend/src/environments/environment.prod.ts
   export const environment = {
     production: true,
     apiUrl: 'https://api.rrimportaciones.com'
   };
   ```

2. **Build local**
   ```bash
   cd frontend
   npm install
   npm run build -- --configuration production
   ```

3. **Subir a Vercel**
   - Dashboard → Add New → Project
   - Importar desde `frontend/dist/frontend/browser`
   - Framework preset: Other
   - Output directory: `.`
   - Build command: empty

### Opción B: Deploy con Docker (más控制)

1. Crear `vercel.json` en frontend:
   ```json
   {
     "build": {
       "env": {
         "NG_CLI_ANALYTICS": "false"
       }
     }
   }
   ```

2. Deploy desde Vercel connected al repositorio

---

## 3. Vercel - Landing Page

### Pasos:

1. **Configurar variables de entorno**
   - Ninguna requerida (es static)

2. **Deploy**
   - Dashboard → Add New → Project
   - Root Directory: `landing`
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`

---

## 4. DNS - Configuración

### Cloudflare (recomendado):

| Type | Name | Value |
|------|------|-------|
| A | @ | IP de Render (backend) |
| CNAME | api | Tu-backend.onrender.com |
| CNAME | www | Tu-frontend.vercel.app |

### URLs resultantes:
- **Backend API**: `https://api.rrimportaciones.com`
- **SaaS App**: `https://app.rrimportaciones.com` (o `www.rrimportaciones.com`)
- **Landing**: `https://rrimportaciones.com`

---

## 5. Verificación Post-Deploy

1. **API Health**: `https://api.rrimportaciones.com/swagger`
2. **Login**: Credenciales por defecto → Admin usuario: `admin`
3. **Portal**: Prueba un enlace de portal generado desde admin

---

## Troubleshooting

### Error de conexión a PostgreSQL
- Verificar que el host de Renderallow connections desde tu IP
- Usar internal hostname de Render: `pg.render.internal`

### Error 502 en API
- Revisar logs en Render dashboard
- Verificar `ConnectionStrings__DefaultConnection`

### Assets no cargan
- Verificar `Storage__R2__PublicBaseUrl` coincide con tu bucket

### CORS errors
- El backend debe tener los orígenes de Vercel en `Program.cs`