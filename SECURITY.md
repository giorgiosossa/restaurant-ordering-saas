# 🔒 Guía de Seguridad - Cocina Cantera POS

## Credenciales y Secrets

### ✅ NUNCA Subir al Repositorio
- `.env` - Contiene credenciales reales (ya está en `.gitignore`)
- `supabase/functions/.env` - Credenciales de Edge Functions
- Archivos con API keys o tokens privados

### ⚠️ Credenciales Seguras para Frontend
Las siguientes credenciales son **seguras de exponer** en el frontend (están diseñadas para ello):
- `VITE_SUPABASE_URL` - URL pública del proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` - Key anónima protegida por RLS (Row Level Security)
- `VITE_OPENPAY_PUBLIC_KEY` - Llave pública solo para tokenización
- `VITE_OPENPAY_MERCHANT_ID` - ID público del comercio

### 🚫 Credenciales que NUNCA deben exponerse
- `SUPABASE_SERVICE_ROLE_KEY` - Solo para backend/Edge Functions
- `OPENPAY_PRIVATE_KEY` - Solo para backend/Edge Functions
- Contraseñas de base de datos
- JWT secrets
- Webhooks secrets

## Configuración de Producción

### 1. Variables de Entorno
Copia `.env.example` a `.env` y completa con tus credenciales:

```bash
cp .env.example .env
```

### 2. Supabase
1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a Settings > API
4. Copia `URL` y `anon public` key

### 3. Openpay (Cuando esté listo)
1. Obtén credenciales de producción de Openpay
2. Actualiza el flag `OPENPAY_ENABLED = true` en `src/services/openpayFrontendService.ts`
3. Configura las variables de entorno en tu plataforma de hosting

### 4. Hosting (Vercel/Netlify)
Configura las siguientes variables en el dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPENPAY_MERCHANT_ID` (cuando esté listo)
- `VITE_OPENPAY_PUBLIC_KEY` (cuando esté listo)
- `VITE_OPENPAY_ENVIRONMENT=production`

### 5. Supabase Edge Functions
Configura los secrets:

```bash
# Supabase
supabase secrets set SUPABASE_URL=your_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Openpay (cuando esté listo)
supabase secrets set OPENPAY_MERCHANT_ID=your_merchant_id
supabase secrets set OPENPAY_PRIVATE_KEY=your_private_key
supabase secrets set OPENPAY_ENVIRONMENT=production
supabase secrets set OPENPAY_WEBHOOK_URL=https://your-domain.com/webhooks/openpay
```

## Mejores Prácticas

### ✅ DO
- Usar variables de entorno para todas las credenciales
- Mantener `.env` en `.gitignore`
- Usar diferentes credenciales para desarrollo y producción
- Rotar credenciales si se exponen accidentalmente
- Habilitar RLS (Row Level Security) en todas las tablas de Supabase
- Usar HTTPS en producción

### ❌ DON'T
- Hardcodear credenciales en el código
- Subir `.env` al repositorio
- Usar credenciales de producción en desarrollo
- Compartir credenciales por email o chat
- Deshabilitar RLS en producción

## Qué Hacer si se Expone una Credencial

1. **Inmediatamente** revoca la credencial comprometida
2. Genera nuevas credenciales
3. Actualiza todos los servicios que usan esa credencial
4. Revisa logs para detectar uso no autorizado
5. Considera usar un servicio de gestión de secretos (AWS Secrets Manager, HashiCorp Vault)

## Checklist de Seguridad Pre-Producción

- [ ] `.env` está en `.gitignore`
- [ ] No hay credenciales hardcoded en el código
- [ ] RLS habilitado en todas las tablas
- [ ] HTTPS configurado
- [ ] Variables de entorno configuradas en hosting
- [ ] Secrets configurados en Supabase Edge Functions
- [ ] Credenciales de producción de Openpay listas
- [ ] Webhooks configurados con URLs de producción
- [ ] Backups automáticos habilitados en Supabase

## Estado Actual - Openpay

🚧 **Los pagos en línea están temporalmente deshabilitados**

Esperando credenciales de producción de Openpay. Una vez recibidas:

1. Actualizar variables de entorno
2. Cambiar `OPENPAY_ENABLED = true` en `src/services/openpayFrontendService.ts`
3. Desplegar a producción
4. Probar en modo sandbox primero
5. Cambiar a producción

---

**Última actualización**: 2026-07-28
