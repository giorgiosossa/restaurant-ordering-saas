# 🚀 Pasos para Deploy - Cocina Cantera POS

## ✅ Pre-requisitos Completados

- [x] Código en GitHub (https://github.com/giorgiosossa/restaurant-ordering-saas)
- [x] Build exitoso (`npm run build`)
- [x] Credenciales protegidas
- [x] `.env` en `.gitignore`

---

## 🌐 Opción 1: Deploy con Vercel (RECOMENDADO - 5 minutos)

### Paso 1: Crear cuenta en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en "Sign Up"
3. Elige "Continue with GitHub"
4. Autoriza Vercel para acceder a tus repositorios

### Paso 2: Importar el Proyecto

1. En el dashboard de Vercel, haz clic en **"Add New..."** → **"Project"**
2. Busca tu repositorio: `restaurant-ordering-saas`
3. Haz clic en **"Import"**

### Paso 3: Configurar el Proyecto

Vercel detectará automáticamente que es un proyecto Vite. Verifica:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**NO hagas clic en Deploy todavía!** Primero configuramos las variables de entorno.

### Paso 4: Configurar Variables de Entorno

1. En la sección **"Environment Variables"**, agrega:

```
VITE_SUPABASE_URL
https://rphwlsiwwxeqerakevvq.supabase.co

VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwaHdsc2l3d3hlcWVyYWtldnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODcwODUsImV4cCI6MjA5ODU2MzA4NX0.qqbjxXx3bv7z1WNjOHrWmrMfqnhYLptsW0gb4VXl2cY
```

2. Asegúrate de seleccionar **"Production"**, **"Preview"**, y **"Development"**

### Paso 5: Deploy

1. Haz clic en **"Deploy"**
2. Vercel comenzará a construir tu proyecto
3. Espera 2-3 minutos (puedes ver los logs en tiempo real)
4. ✅ ¡Listo! Tu app estará en una URL como: `https://restaurant-ordering-saas-xxx.vercel.app`

### Paso 6: Configurar Dominio Personalizado (Opcional)

Si tienes un dominio:

1. Ve a **Settings** → **Domains**
2. Agrega tu dominio (ej: `cocinacantera.com`)
3. Sigue las instrucciones para configurar DNS

---

## 🔧 Opción 2: Deploy con Netlify (Alternativa)

### Paso 1: Crear cuenta en Netlify

1. Ve a [netlify.com](https://netlify.com)
2. Sign up con GitHub
3. Autoriza Netlify

### Paso 2: Importar Proyecto

1. Haz clic en **"Add new site"** → **"Import an existing project"**
2. Elige **"Deploy with GitHub"**
3. Selecciona tu repositorio: `restaurant-ordering-saas`

### Paso 3: Configuración de Build

```
Build command: npm run build
Publish directory: dist
```

### Paso 4: Variables de Entorno

1. Ve a **Site settings** → **Environment variables**
2. Agrega las mismas variables que en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Paso 5: Deploy

1. Haz clic en **"Deploy site"**
2. Espera 2-3 minutos
3. Tu sitio estará en: `https://random-name-123.netlify.app`

---

## 📱 Después del Deploy

### 1. Verificar que todo funcione

Visita tu URL de producción y prueba:

- [ ] Landing page carga correctamente
- [ ] Registro de restaurante funciona
- [ ] Login de administrador funciona
- [ ] Login de restaurante funciona
- [ ] Menú digital se ve correctamente en `/menu/:slug`
- [ ] Pedidos por QR funcionan
- [ ] Panel de cocina (Comandas) funciona
- [ ] Pagos en terminal funcionan
- [ ] Pagos en efectivo funcionan
- [ ] Los métodos de pago en línea están deshabilitados (mensaje "Próximamente")

### 2. Actualizar URLs en el código (si es necesario)

Si tu dominio final es diferente, actualiza:

- URLs de webhooks de Openpay (cuando esté listo)
- URLs de callbacks
- URLs en emails/notificaciones

### 3. Configurar Supabase

Actualiza las URLs permitidas en Supabase:

1. Ve a [Supabase Dashboard](https://app.supabase.com/project/rphwlsiwwxeqerakevvq/auth/url-configuration)
2. En **"Site URL"**, agrega tu URL de producción
3. En **"Redirect URLs"**, agrega:
   ```
   https://tu-dominio.vercel.app/*
   https://tu-dominio.vercel.app/login
   ```

### 4. Monitoreo

#### Vercel
- **Analytics**: Settings → Analytics (gratis en plan hobby)
- **Logs**: Deployments → [tu deployment] → Runtime Logs

#### Netlify
- **Analytics**: Analytics (requiere plan pago)
- **Logs**: Deploys → [tu deploy] → Deploy log

---

## 🔄 Actualizaciones Futuras

### Automatic Deploys (Ya configurado)

Cada vez que hagas `git push` a la rama `main`:
1. Vercel/Netlify detectará el cambio
2. Construirá automáticamente
3. Desplegará la nueva versión

### Manual Deploy

**Vercel:**
```bash
npm i -g vercel
vercel --prod
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod
```

---

## 🆘 Troubleshooting

### Build falla en Vercel/Netlify

1. Verifica que las variables de entorno estén configuradas
2. Revisa los logs de build
3. Prueba localmente: `npm run build`

### App carga pero no funciona

1. Abre DevTools (F12) → Console
2. Verifica errores de red
3. Asegúrate de que las variables de entorno estén correctas

### Error de CORS

1. Verifica que la URL esté en Supabase → Authentication → URL Configuration
2. Agrega `https://tu-dominio.vercel.app` a las URLs permitidas

---

## 📞 Soporte

- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **Netlify**: [netlify.com/support](https://netlify.com/support)
- **Supabase**: [supabase.com/support](https://supabase.com/support)

---

## 🎯 Tu URL de Producción

Una vez desplegado, tu app estará disponible en:

**Vercel**: `https://restaurant-ordering-saas-[random].vercel.app`

**Netlify**: `https://[random-name].netlify.app`

---

**¡Listo para producción!** 🎉
