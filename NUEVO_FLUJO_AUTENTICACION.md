# Nuevo Flujo de Autenticación con PIN

## Resumen
El sistema ahora implementa autenticación de dos factores (2FA) usando correo/contraseña + PIN para acceder al panel del restaurante. Esto permite diferenciar entre acceso de administrador (dueño) y empleados.

## Flujo de Login

### 1. Paso 1: Autenticación Email/Contraseña
- El usuario ingresa su **correo electrónico** y **contraseña** en `/login`
- Se valida contra Supabase Auth
- Se verifica que el restaurante esté activo y aprobado
- Si es exitoso, **no se redirige inmediatamente** → se muestra el PinPad

### 2. Paso 2: Autenticación con PIN

Después de ingresar email/contraseña correctamente, aparece el **PinPad** que acepta:

#### PIN de Empleado (4 dígitos)
- Ejemplo: `1234`
- Se valida contra la tabla `employees` (columna `pin`)
- **Acceso**: Solo a la pantalla `/comandas` (Comandas)
- **Restricciones**:
  - No puede acceder a `/restaurant/*` (dashboard completo)
  - Solo ve las secciones según sus roles (`caja`, `cocina`, `mesero`)
  - Se inicia un turno automáticamente (`employee_shifts`)

#### PIN de Administrador (6 dígitos)
- Ejemplo: `123456`
- Se valida contra la tabla `restaurants` (columna `owner_pin`)
- **Acceso**: Completo al dashboard `/restaurant` y todas sus páginas
- **Sin restricciones**: Puede acceder a todas las funciones del sistema

## Arquitectura Técnica

### Componentes Creados

1. **`PinAuthentication.tsx`** - Componente de teclado numérico
   - Ubicación: `/src/components/auth/PinAuthentication.tsx`
   - Muestra 6 círculos para el PIN
   - Al completar 4 dígitos: intenta validar como empleado
   - Al completar 6 dígitos: intenta validar como administrador

2. **`pinAuthService.ts`** - Servicio de validación de PIN
   - Ubicación: `/src/services/pinAuthService.ts`
   - Funciones:
     - `validateAdminPin(restaurantId, pin)` - Valida PIN de 6 dígitos
     - `validateEmployeePin(restaurantId, pin)` - Valida PIN de 4 dígitos

3. **`ProtectedRoute.tsx`** - Protección de rutas
   - Ubicación: `/src/components/auth/ProtectedRoute.tsx`
   - Bloquea acceso de empleados a rutas de administrador

### Archivos Modificados

1. **`LoginPage.tsx`**
   - Ahora tiene dos pasos: email/password → PIN
   - Maneja dos tipos de autenticación:
     - Admin: guarda sesión en `localStorage.user` con `authType: "admin"`
     - Employee: guarda sesión en `localStorage.employee_session` con `authType: "employee"`

2. **`Dashboard.tsx`** (Restaurant)
   - Verifica si hay `employee_session` en localStorage
   - Redirige empleados a `/comandas` automáticamente

3. **`Comandas.tsx`**
   - Ahora acepta `restaurantId` desde `employee_session` o `user`
   - Funciona tanto para admin como para empleados

4. **`EmployeeSessionContext.tsx`**
   - `clockOut()` ahora redirige a `/login` después de cerrar sesión

## Base de Datos

### Columnas Agregadas en `restaurants`
```sql
owner_pin TEXT              -- PIN de 6 dígitos del administrador
pin_enabled BOOLEAN         -- Si está habilitada la autenticación por PIN
```

### Función SQL Creada
```sql
set_owner_pin(restaurant_id, new_pin, enable) → BOOLEAN
```
Permite configurar el PIN del administrador desde la aplicación.

### Migración
Archivo: `/database/add_owner_pin_columns.sql`
- Agrega las columnas si no existen
- Crea la función `set_owner_pin`
- Es idempotente (se puede ejecutar múltiples veces)

## Configuración Inicial

### Para Restaurantes Existentes

1. **Configurar PIN de Administrador**:
   - Ir a `/restaurant/settings`
   - Sección "Autenticación y Seguridad"
   - Ingresar un PIN de 6 dígitos
   - Activar el toggle "Requerir PIN"

2. **Crear Empleados con PIN**:
   - Ir a `/restaurant/employees`
   - Crear empleado con:
     - Nombre, puesto, salario, etc.
     - **PIN de 4 dígitos** (campo opcional)
     - **Roles**: caja, cocina, mesero

### Para Nuevos Restaurantes

1. Durante el registro (`/register`):
   - Se pide crear un **Owner PIN de 6 dígitos**
   - Se guarda en `registration_requests.owner_pin`
   - Al aprobar el restaurante, se copia a `restaurants.owner_pin`

## Flujo de Acceso

```
┌─────────────────────────────────────────────┐
│  Usuario ingresa correo + contraseña       │
│  en /login                                  │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  ✅ Validación exitosa con Supabase Auth   │
│  Se obtiene restaurant_id                  │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  🔐 PINPAD aparece                          │
│  Usuario ingresa PIN                        │
└───────────────┬─────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
┌──────────────┐  ┌─────────────────┐
│ PIN 4 dígitos│  │ PIN 6 dígitos   │
│ (Empleado)   │  │ (Administrador) │
└──────┬───────┘  └────────┬────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌─────────────────┐
│ Valida contra│  │ Valida contra   │
│ employees.pin│  │restaurants.     │
│              │  │  owner_pin      │
└──────┬───────┘  └────────┬────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌─────────────────┐
│ Inicia shift │  │ Acceso completo │
│ Redirige a   │  │ Redirige a      │
│ /comandas    │  │ /restaurant     │
└──────────────┘  └─────────────────┘
```

## Restricciones de Acceso

### Empleados
- ✅ Pueden acceder: `/comandas`
- ❌ NO pueden acceder:
  - `/restaurant` (home)
  - `/restaurant/orders`
  - `/restaurant/menu`
  - `/restaurant/tables`
  - `/restaurant/employees`
  - `/restaurant/inventario`
  - `/restaurant/reports`
  - `/restaurant/settings`

Si intentan acceder directamente a una URL de admin, son redirigidos a `/comandas`

### Administradores
- ✅ Acceso completo a todo el sistema
- ✅ Pueden acceder a `/comandas` (como opción "Continuar como administrador")

## Sesiones en LocalStorage

### Admin Session
```json
{
  "id": "uuid",
  "email": "admin@restaurant.com",
  "role": "owner",
  "restaurant_id": "uuid",
  "restaurant": {
    "name": "Mi Restaurante",
    "slug": "mi-restaurante",
    "is_active": true
  },
  "authType": "admin"
}
```
Guardado en: `localStorage.user`

### Employee Session
```json
{
  "employeeId": "uuid",
  "name": "Juan Pérez",
  "roles": ["caja", "cocina"],
  "shiftId": "uuid",
  "isAdminBypass": false,
  "restaurantId": "uuid",
  "authType": "employee"
}
```
Guardado en: `localStorage.employee_session`

## Testing

### Caso 1: Login como Admin
1. Ir a `/login`
2. Ingresar correo: `demorestaurant@gmail.com`
3. Ingresar contraseña: `ATVSW679`
4. Click "Iniciar Sesión"
5. **Aparece PinPad**
6. Ingresar PIN de 6 dígitos del admin (configurado en Settings)
7. ✅ Redirige a `/restaurant` con acceso completo

### Caso 2: Login como Empleado
1. Ir a `/login`
2. Ingresar correo: `demorestaurant@gmail.com`
3. Ingresar contraseña: `ATVSW679`
4. Click "Iniciar Sesión"
5. **Aparece PinPad**
6. Ingresar PIN de 4 dígitos del empleado (ej: `1234`)
7. ✅ Redirige a `/comandas` (solo acceso a esa pantalla)

### Caso 3: Empleado intenta acceder a admin
1. Login como empleado (PIN 4 dígitos)
2. En navegador escribir: `/restaurant/settings`
3. ❌ Automáticamente redirigido a `/comandas`

## Seguridad

### Ventajas
- ✅ Autenticación de dos factores (email/password + PIN)
- ✅ Separación de privilegios entre admin y empleados
- ✅ Empleados no necesitan conocer la contraseña del dueño
- ✅ Control granular de acceso por roles
- ✅ Auditoría de turnos por empleado

### Consideraciones
- Los PINs se almacenan en **texto plano** en la BD (para facilitar recuperación)
- El PIN del admin es de **6 dígitos** (1,000,000 combinaciones)
- El PIN del empleado es de **4 dígitos** (10,000 combinaciones)
- Se recomienda cambiar PINs regularmente

## Próximos Pasos (Mejoras Futuras)

1. **Límite de intentos**: Bloquear después de 3 intentos fallidos
2. **Hash de PINs**: Almacenar PINs hasheados para mayor seguridad
3. **Registro de intentos**: Log de intentos fallidos de login
4. **Timeout de sesión**: Cerrar sesión automáticamente después de inactividad
5. **Biometría**: Permitir autenticación por huella/Face ID como alternativa al PIN
6. **SMS/Email OTP**: Como alternativa al PIN para mayor seguridad
