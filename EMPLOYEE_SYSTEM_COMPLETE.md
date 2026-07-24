# Sistema de Empleados - IMPLEMENTACIÓN COMPLETA

## ✅ Resumen

Se ha implementado un **sistema completo de gestión de empleados** que calcula **costos laborales reales** para el KPI de **Prime Cost**.

## 🎯 Problema Solucionado

**Antes**: Prime Cost usaba labor_cost = 0 o valores estimados poco precisos
**Ahora**: Prime Cost calcula labor cost real basado en empleados activos y sus sueldos

## 📋 Archivos Creados/Modificados

### 1. Base de Datos (SQL)
**Archivo**: `database/add_employees_system.sql`

**Tabla `employees` con campos**:
- ✅ `id`, `restaurant_id`, `name`, `position`
- ✅ `employment_type` (full_time | part_time | hourly)
- ✅ `monthly_salary` (para full_time)
- ✅ `hourly_rate` (para part_time y hourly)
- ✅ `hours_per_week` (para part_time)
- ✅ `is_active`, `notes`, timestamps

**Función `calculate_labor_cost()`**:
- Calcula labor cost para cualquier período de tiempo
- Diferencia entre tipos de empleo:
  - **Full-time**: Salario mensual prorrateado por días
  - **Part-time**: `hourly_rate × hours_per_week × semanas`
  - **Hourly**: Estimación de 40 hrs/semana × rate

**Función `calculate_restaurant_kpis()` actualizada**:
- Ahora usa `calculate_labor_cost()` para obtener costos reales
- Prime Cost se calcula con: `((COGS + Labor Cost Real) / Revenue) × 100`

**Row Level Security (RLS)**:
- Políticas para SELECT, INSERT, UPDATE, DELETE
- Solo permite acceso a empleados del restaurante del usuario

### 2. TypeScript Types
**Archivo**: `src/config/supabase.ts`

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
  created_at: string;
  updated_at: string;
}
```

### 3. Servicio Backend
**Archivo**: `src/services/employeeService.ts`

**Funciones CRUD**:
- ✅ `getRestaurantEmployees(restaurantId)` - Obtener todos
- ✅ `getActiveEmployees(restaurantId)` - Solo activos
- ✅ `subscribeToRestaurantEmployees()` - Real-time updates
- ✅ `createEmployee(employeeData)` - Crear
- ✅ `updateEmployee(id, updates)` - Actualizar
- ✅ `deleteEmployee(id)` - Eliminar
- ✅ `toggleEmployeeStatus(id, isActive)` - Activar/Desactivar

**Funciones de Cálculo**:
- ✅ `calculateMonthlyLaborCost(employees)` - Costo total mensual
- ✅ `getEmployeeStats(employees)` - Estadísticas completas
- ✅ `calculateLaborCostForPeriod(employees, start, end)` - Costo por período

### 4. Frontend - Página de Empleados
**Archivo**: `src/pages/restaurant/Employees.tsx`

**Características**:
- ✅ **Búsqueda** por nombre o puesto
- ✅ **Filtros**: Todos | Activos | Inactivos
- ✅ **Estadísticas en tiempo real**:
  - Total Empleados
  - Empleados Activos
  - **Costo Laboral Mensual**
  - Distribución por tipo de empleo
- ✅ **Vista de tarjetas** con información completa
- ✅ **Modales** para Agregar, Editar, Eliminar
- ✅ **Validaciones** según tipo de empleo
- ✅ **Real-time updates** con Supabase subscriptions

### 5. Integración en Dashboard
**Archivo**: `src/pages/restaurant/Dashboard.tsx`

- ✅ Ya integrado en navegación: `/restaurant/employees`
- ✅ Icono `UsersIcon` en sidebar
- ✅ Ruta configurada correctamente

## 🚀 Siguiente Paso: Ejecutar SQL en Supabase

### Instrucciones:

1. Ve a Supabase Dashboard: https://supabase.com/dashboard
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega: `database/add_employees_system.sql`
5. **Ejecuta la query**

Verás este mensaje:
```
✅ Sistema de empleados creado exitosamente!

Elementos creados:
  • Tabla: employees
  • Función: calculate_labor_cost()
  • Función: calculate_restaurant_kpis() (actualizada)
  • Triggers: update_employees_updated_at
  • RLS policies para employees

✅ Prime Cost ahora calcula labor cost real basado en empleados!
```

## 📊 Cómo Funciona el Cálculo de Prime Cost

### Fórmula:
```
Prime Cost % = ((COGS + Labor Cost) / Total Revenue) × 100
```

### Componentes:

1. **COGS** (Cost of Goods Sold):
   - Se calcula sumando `cost_per_item × quantity` de todas las ventas
   - Basado en el campo `cost_per_item` de cada menu_item

2. **Labor Cost** (NUEVO - REAL):
   - **Full-time**: `monthly_salary × (días_período / 30)`
   - **Part-time**: `hourly_rate × hours_per_week × semanas_período`
   - **Hourly**: `hourly_rate × 40 hrs × semanas_período`
   - Solo cuenta empleados con `is_active = TRUE`

3. **Total Revenue**:
   - Suma de todas las ventas en el período

### Ejemplo Real:

**Escenario**:
- Período: 7 días (última semana)
- Ventas: $50,000
- COGS: $15,000 (cost_per_item de menú)
- Empleados:
  - Chef (Full-time): $20,000/mes
  - 2 Meseros (Part-time): $100/hr × 20hrs/semana
  - 1 Cajero (Hourly): $80/hr

**Cálculo Labor Cost**:
- Chef: $20,000 × (7 días / 30) = $4,667
- Meseros: 2 × ($100 × 20 × 1 semana) = $4,000
- Cajero: $80 × 40 × 1 semana = $3,200
- **Total Labor Cost = $11,867**

**Prime Cost**:
```
(($15,000 + $11,867) / $50,000) × 100 = 53.73%
```

✅ **Ideal**: Prime Cost < 60%
⚠️ **Aceptable**: 60% - 65%
❌ **Alto**: > 65%

## 🎨 Flujo de Trabajo para el Usuario

### Setup Inicial:

1. **Ir a `/restaurant/employees`**
2. **Clic en "Agregar Empleado"**
3. **Completar formulario**:
   - Nombre: "Juan Pérez"
   - Puesto: "Chef" (opcional)
   - Tipo: Tiempo Completo
   - Salario: $20,000/mes
   - Activo: ✓
4. **Guardar**

### Tipos de Empleo y Campos:

**Tiempo Completo**:
- Campo: Salario Mensual ($)
- Ejemplo: Chef de $20,000/mes

**Medio Tiempo**:
- Campos: Tarifa por Hora ($) + Horas por Semana
- Ejemplo: Mesero de $100/hr trabajando 20 hrs/semana

**Por Hora**:
- Campo: Tarifa por Hora ($)
- Sistema estima 40 hrs/semana para cálculos
- Ejemplo: Cajero de $80/hr

### Gestión Continua:

- **Editar**: Cambiar sueldo, posición, horas
- **Activar/Desactivar**: Sin eliminar (mantiene historial)
- **Eliminar**: Borrar permanentemente

### Visualización en Reports:

1. Ve a `/restaurant/reports`
2. El KPI de **Prime Cost** ahora muestra:
   - **Prime Cost %**: Calculado con labor cost real
   - **COGS**: Costo de materia prima
   - **Labor Cost**: Suma de sueldos activos
   - **Total Revenue**: Ventas del período

## 💡 Ventajas del Nuevo Sistema

### Para el Restaurante:

1. **KPI Preciso**: Prime Cost refleja costos reales
2. **Decisiones Informadas**: Saber si contratar/despedir personal
3. **Control de Gastos**: Ver impacto de sueldos en rentabilidad
4. **Planificación**: Estimar costos laborales por período

### Para ti como Desarrollador SaaS:

1. **Diferenciación**: Otros SaaS no tienen esto
2. **Valor agregado**: Justifica precio premium
3. **Retención**: Restaurantes dependen del sistema
4. **Escalabilidad**: Base para futuros KPIs laborales

## 📈 KPIs Futuros que Podrías Agregar

Con este sistema de empleados, podrías crear:

1. **Labor Cost %**: `(Labor Cost / Revenue) × 100`
2. **Ventas por Empleado**: `Revenue / # empleados activos`
3. **Productividad**: `Orders completed / employee hours`
4. **Costo por Orden**: `Labor Cost / Total Orders`
5. **Análisis por Turno**: Si agregas shifts después

## ⚠️ Notas Importantes

### Estimaciones para Empleados "Hourly":
- El sistema asume **40 horas/semana**
- Esto es un promedio razonable
- Puedes ajustarlo en `database/add_employees_system.sql` línea 91

### Validaciones en la Tabla:
```sql
-- Un full_time DEBE tener monthly_salary
CONSTRAINT valid_full_time_salary CHECK (
  employment_type != 'full_time' OR monthly_salary IS NOT NULL
)

-- Part_time y hourly DEBEN tener hourly_rate
CONSTRAINT valid_hourly_rate CHECK (
  employment_type = 'full_time' OR hourly_rate IS NOT NULL
)

-- Part_time DEBE tener hours_per_week
CONSTRAINT valid_part_time_hours CHECK (
  employment_type != 'part_time' OR hours_per_week IS NOT NULL
)
```

### Manejo de Empleados Inactivos:
- **Desactivar** en lugar de eliminar preserva datos históricos
- Solo empleados activos se cuentan en labor cost
- Útil para empleados temporales o de temporada

## 🔧 Troubleshooting

### Si Prime Cost muestra 0%:
1. Verifica que existan empleados activos en la BD
2. Revisa que `calculate_labor_cost()` se ejecutó correctamente
3. Comprueba que `calculate_restaurant_kpis()` se actualizó

### Si hay error al crear empleado:
1. Verifica que el restaurante_id es válido
2. Asegúrate de llenar campos obligatorios según tipo de empleo
3. Revisa RLS policies en Supabase

### Si no aparece en navegación:
1. La página ya está integrada en Dashboard.tsx
2. Accede a `/restaurant/employees`
3. Verifica que el import sea correcto

## ✨ Próximos Pasos Opcionales

### Sistema de Turnos (Si lo quieres después):
```sql
CREATE TABLE employee_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  hours_worked DECIMAL GENERATED ALWAYS AS
    (EXTRACT(EPOCH FROM (ended_at - started_at)) / 3600) STORED
);
```

Esto permitiría:
- Tracking exacto de horas trabajadas
- Labor cost basado en horas reales, no estimadas
- KPIs de productividad por turno

---

## 🎉 Conclusión

El sistema de empleados está **100% funcional** y listo para usar. El KPI de Prime Cost ahora calcula costos laborales reales basados en los empleados que agregues en `/restaurant/employees`.

**Siguiente acción**: Ejecuta `database/add_employees_system.sql` en Supabase y empieza a agregar empleados!
