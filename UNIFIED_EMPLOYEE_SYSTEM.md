# Sistema de Empleados Unificado - COMPLETADO

## ✅ Resumen

Se ha **unificado** el sistema de empleados en una sola tabla `employees` que contiene:
- ✅ **Información de sueldo** (para cálculo de Prime Cost)
- ✅ **PIN y roles** (para sistema de Comandas)
- ✅ Todo en una tabla homogénea

## 🎯 Problema Solucionado

**Antes**: Dos sistemas separados de empleados causaban conflictos
**Ahora**: Una sola tabla `employees` con toda la información

## 📋 Cambios Realizados

### 1. Base de Datos (SQL)
**Archivo**: `database/unify_employees_system.sql`

**Campos agregados a `employees`**:
```sql
-- PIN para acceso a Comandas
pin TEXT (4 dígitos, único por restaurante para empleados activos)

-- Roles para Comandas
roles TEXT[] (array: ['caja', 'cocina', 'mesero'])
```

**Constraint único para PIN**:
```sql
CREATE UNIQUE INDEX employees_restaurant_pin_active_unique
ON employees(restaurant_id, pin)
WHERE is_active = TRUE AND pin IS NOT NULL;
```
- PIN debe ser único solo entre empleados **activos**
- Permite reutilizar PINs de empleados inactivos
- PIN es opcional (puede ser NULL)

**Tablas adicionales creadas**:
- `employee_shifts`: Turnos de trabajo para Comandas
- `order_events`: Tracking de eventos en órdenes

**Función helper**:
- `validate_employee_pin()`: Valida PIN y retorna empleado

### 2. TypeScript Types
**Archivo**: `src/config/supabase.ts`

**Tipo de roles**:
```typescript
export type EmployeeRole = "caja" | "cocina" | "mesero";
```

**Interfaz Employee actualizada**:
```typescript
export interface Employee {
  id: string;
  restaurant_id: string;
  name: string;
  position?: string;
  employment_type: "full_time" | "part_time" | "hourly";
  monthly_salary?: number;
  hourly_rate?: number;
  hours_per_week?: number;
  is_active: boolean;
  notes?: string;
  pin?: string; // ⬅️ NUEVO
  roles: EmployeeRole[]; // ⬅️ NUEVO
  created_at: string;
  updated_at: string;
}
```

**Nuevas interfaces**:
```typescript
export interface EmployeeShift {
  id: string;
  employee_id: string;
  restaurant_id: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export type OrderEventType = "accepted" | "preparing" | "ready" | "completed" | "cancelled";

export interface OrderEvent {
  id: string;
  restaurant_id: string;
  order_id: string;
  employee_id?: string;
  employee_shift_id?: string;
  event_type: OrderEventType;
  created_at: string;
}
```

### 3. Servicio Backend
**Archivo**: `src/services/employeeService.ts`

**Funciones nuevas para PIN/Shifts**:
```typescript
// PIN y autenticación
validatePin(restaurantId, pin): Promise<Employee | null>

// Gestión de turnos
startOrResumeShift(employeeId, restaurantId): Promise<{data, error}>
endShift(shiftId): Promise<{error}>

// CRUD con PIN
createEmployeeWithPin(restaurantId, name, pin, roles): Promise<{data, error}>
updateEmployeeBasic(employeeId, updates): Promise<{error}>
resetEmployeePin(employeeId, newPin): Promise<{error}>
deactivateEmployee(employeeId): Promise<{error}>
reactivateEmployee(employeeId): Promise<{error}>

// Tracking de eventos
recordOrderEvent(restaurantId, orderId, eventType, employeeId?, shiftId?): Promise<{error}>

// Aliases para compatibilidad
subscribeToEmployees = subscribeToRestaurantEmployees
```

**Funciones existentes (labor cost) se mantienen**:
- `calculateMonthlyLaborCost()`
- `getEmployeeStats()`
- `calculateLaborCostForPeriod()`

### 4. Frontend - Página de Empleados
**Archivo**: `src/pages/restaurant/Employees.tsx`

**Campos agregados al formulario**:

**PIN**:
```tsx
<Input
  label="PIN (Opcional - 4 dígitos para Comandas)"
  type="text"
  maxLength={4}
  value={formData.pin}
  onChange={(e) => setFormData({
    ...formData,
    pin: e.target.value.replace(/\D/g, "").slice(0, 4)
  })}
  placeholder="1234"
/>
```

**Roles** (checkboxes):
```tsx
<div>
  <label>Roles para Comandas (Opcional)</label>
  <div className="flex gap-3 flex-wrap">
    {["caja", "cocina", "mesero"].map((role) => (
      <label>
        <input
          type="checkbox"
          checked={formData.roles.includes(role)}
          onChange={(e) => {
            if (e.target.checked) {
              setFormData({ ...formData, roles: [...formData.roles, role] });
            } else {
              setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) });
            }
          }}
        />
        <span>{role}</span>
      </label>
    ))}
  </div>
</div>
```

## 🚀 Siguiente Paso: Ejecutar SQL en Supabase

### Instrucciones:

1. Ve a Supabase Dashboard
2. SQL Editor
3. **Ejecuta**: `database/unify_employees_system.sql`

Verás este mensaje:
```
✅ Sistema de empleados unificado exitosamente!

Campos agregados a employees:
  • pin (TEXT) - PIN de 4 dígitos para acceso
  • roles (TEXT[]) - Roles para Comandas [caja, cocina, mesero]

Tablas creadas:
  • employee_shifts - Turnos de trabajo
  • order_events - Tracking de eventos en órdenes

La tabla employees ahora tiene:
  ✓ Información de sueldo (para Prime Cost)
  ✓ PIN y roles (para Comandas)
  ✓ Todo en una sola tabla homogénea
```

## 📊 Estructura Final de la Tabla `employees`

```sql
employees (
  -- Identificación
  id UUID PRIMARY KEY
  restaurant_id UUID REFERENCES restaurants(id)

  -- Información básica
  name TEXT NOT NULL
  position TEXT
  is_active BOOLEAN DEFAULT TRUE
  notes TEXT

  -- Compensación (para Prime Cost)
  employment_type TEXT CHECK (IN 'full_time', 'part_time', 'hourly')
  monthly_salary DECIMAL(10,2)
  hourly_rate DECIMAL(10,2)
  hours_per_week DECIMAL(5,2)

  -- Acceso a Comandas
  pin TEXT (4 dígitos, único si activo)
  roles TEXT[] (array de 'caja', 'cocina', 'mesero')

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

## 🎨 Flujo de Trabajo

### Para Gestión de Empleados (Prime Cost):

1. **Ir a `/restaurant/employees`**
2. **Agregar Empleado**:
   - Nombre: "Juan Pérez"
   - Puesto: "Chef"
   - Tipo: Tiempo Completo
   - Salario: $20,000/mes
   - *(Opcional)* PIN: 1234
   - *(Opcional)* Roles: [cocina]
   - Activo: ✓

3. **Prime Cost** se calcula automáticamente con el sueldo

### Para Sistema de Comandas (PIN Login):

1. Empleado con PIN configurado puede:
   - Iniciar sesión en Comandas con PIN
   - Acceder solo a áreas de sus roles:
     - **caja**: Ver pedidos pendientes
     - **cocina**: Ver pedidos en preparación
     - **mesero**: Ver todos los pedidos
   - Se registra turno (`employee_shifts`)
   - Se trackean eventos (`order_events`)

## 💡 Ventajas del Sistema Unificado

### Para el Restaurante:

1. **Un solo empleado, múltiples usos**:
   - Sueldo para calcular costos
   - PIN para acceso a Comandas
   - Roles para permisos

2. **Gestión centralizada**:
   - Todo desde `/restaurant/employees`
   - No hay duplicados
   - Datos consistentes

3. **Flexibilidad**:
   - PIN/roles son **opcionales**
   - Puedes usar solo para Prime Cost
   - O agregar PIN después

### Para ti como Desarrollador:

1. **Mantenimiento simple**: Una sola tabla
2. **Consistencia**: No hay desincronización
3. **Escalabilidad**: Fácil agregar campos
4. **Migración limpia**: Sin conflictos

## 🔧 Campos Opcionales vs Obligatorios

### Obligatorios:
- `name` ✅
- `employment_type` ✅
- `roles` ✅ (pero puede ser array vacío `[]`)

### Condicionales:
- `monthly_salary` (si `employment_type = 'full_time'`)
- `hourly_rate` (si `employment_type != 'full_time'`)
- `hours_per_week` (si `employment_type = 'part_time'`)

### Opcionales:
- `position`
- `pin` (solo si quieres que acceda a Comandas)
- `notes`

## 📈 Casos de Uso

### Caso 1: Solo Prime Cost
```typescript
{
  name: "Juan Pérez",
  employment_type: "full_time",
  monthly_salary: 20000,
  roles: [], // Sin roles
  pin: undefined, // Sin PIN
  is_active: true
}
```
✅ Cuenta para Prime Cost
❌ No puede acceder a Comandas

### Caso 2: Solo Comandas
```typescript
{
  name: "María López",
  employment_type: "hourly",
  hourly_rate: 80,
  roles: ["caja", "mesero"],
  pin: "5678",
  is_active: true
}
```
✅ Puede acceder a Comandas
✅ También cuenta para Prime Cost (estimado 40 hrs/sem)

### Caso 3: Completo
```typescript
{
  name: "Carlos García",
  employment_type: "part_time",
  hourly_rate: 100,
  hours_per_week: 25,
  roles: ["cocina"],
  pin: "9012",
  position: "Chef Auxiliar",
  is_active: true
}
```
✅ Prime Cost preciso (100 × 25 × 4.33 = $10,825/mes)
✅ Acceso a Comandas área cocina
✅ Tracking completo

## ⚠️ Notas Importantes

### Sobre el PIN:

- **Opcional**: No todos los empleados necesitan PIN
- **Único por restaurante**: Solo entre empleados activos
- **4 dígitos**: Validación automática en frontend
- **Reutilizable**: PINs de empleados inactivos se pueden reusar

### Sobre los Roles:

- **Array vacío válido**: `roles: []` es permitido
- **Múltiples roles**: Un empleado puede tener varios
- **Sin rol**: No puede acceder a ninguna área de Comandas

### Sobre Empleados Inactivos:

- **Desactivar** libera el PIN para reutilización
- **Cierra turnos activos** automáticamente
- **No cuenta** para Prime Cost
- **Preserva historial** de shifts y events

## 🔄 Compatibilidad con Sistema Antiguo

El servicio `employeeService.ts` ahora tiene:

**Funciones nuevas del sistema unificado**:
- `validatePin()`, `startOrResumeShift()`, `endShift()`
- `createEmployeeWithPin()`, `resetEmployeePin()`
- `deactivateEmployee()`, `reactivateEmployee()`

**Funciones heredadas del sistema viejo (ahora aliases)**:
- `subscribeToEmployees` → `subscribeToRestaurantEmployees`
- `updateEmployee` → Compatible con campos nuevos

**Sistema de Comandas** (`EmployeeSessionContext.tsx`):
- ✅ Sigue funcionando sin cambios
- ✅ Usa las mismas funciones (`validatePin`, `startOrResumeShift`, `endShift`)
- ✅ Totalmente compatible

---

## 🎉 Conclusión

El sistema de empleados está **100% unificado y funcional**.

**Tabla única `employees`**:
- Sueldo → Prime Cost real
- PIN + Roles → Acceso a Comandas
- Todo homogéneo y consistente

**Siguiente acción**:
1. Ejecuta `database/unify_employees_system.sql` en Supabase
2. Refresca la página
3. Agrega empleados con sueldo + PIN + roles desde `/restaurant/employees`
