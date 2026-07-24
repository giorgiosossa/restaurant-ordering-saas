-- =====================================================
-- UNIFICAR SISTEMA DE EMPLEADOS
-- =====================================================
-- Agrega campos de PIN y roles a la tabla employees existente
-- para tener un sistema homogéneo
-- =====================================================

-- =====================================================
-- 1. AGREGAR NUEVOS CAMPOS A employees
-- =====================================================

-- Agregar PIN (4 dígitos)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS pin TEXT;

-- Agregar roles (array de roles para Comandas)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';

-- =====================================================
-- 2. CREAR TIPO PARA ROLES
-- =====================================================

-- Crear tipo enum para roles (si no existe)
DO $$ BEGIN
    CREATE TYPE employee_role AS ENUM ('caja', 'cocina', 'mesero');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. CONSTRAINTS PARA PIN
-- =====================================================

-- PIN debe ser 4 dígitos numéricos
DO $$ BEGIN
    ALTER TABLE employees
    ADD CONSTRAINT pin_format
    CHECK (pin IS NULL OR pin ~ '^\d{4}$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PIN debe ser único por restaurante (solo para empleados activos)
-- Esto permite reutilizar PINs de empleados inactivos
CREATE UNIQUE INDEX IF NOT EXISTS employees_restaurant_pin_active_unique
ON employees(restaurant_id, pin)
WHERE is_active = TRUE AND pin IS NOT NULL;

-- =====================================================
-- 4. CREAR TABLA employee_shifts (para Comandas)
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_shifts_employee_id ON employee_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_restaurant_id ON employee_shifts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_active ON employee_shifts(employee_id) WHERE ended_at IS NULL;

-- =====================================================
-- 5. RLS PARA employee_shifts
-- =====================================================

ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_shifts_select_policy ON employee_shifts
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY employee_shifts_insert_policy ON employee_shifts
  FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY employee_shifts_update_policy ON employee_shifts
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 6. CREAR TABLA order_events (para tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_shift_id UUID REFERENCES employee_shifts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('accepted', 'preparing', 'ready', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_employee_id ON order_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_order_events_restaurant_id ON order_events(restaurant_id);

-- =====================================================
-- 7. RLS PARA order_events
-- =====================================================

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_events_select_policy ON order_events
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY order_events_insert_policy ON order_events
  FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 8. FUNCIÓN HELPER PARA VALIDAR PIN
-- =====================================================

CREATE OR REPLACE FUNCTION validate_employee_pin(
  p_restaurant_id UUID,
  p_pin TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  "position" TEXT,
  roles TEXT[],
  employment_type TEXT,
  monthly_salary DECIMAL,
  hourly_rate DECIMAL,
  hours_per_week DECIMAL,
  is_active BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e."position",
    e.roles,
    e.employment_type,
    e.monthly_salary,
    e.hourly_rate,
    e.hours_per_week,
    e.is_active,
    e.notes,
    e.created_at,
    e.updated_at
  FROM employees e
  WHERE e.restaurant_id = p_restaurant_id
  AND e.pin = p_pin
  AND e.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de empleados unificado exitosamente!';
  RAISE NOTICE '';
  RAISE NOTICE 'Campos agregados a employees:';
  RAISE NOTICE '  • pin (TEXT) - PIN de 4 dígitos para acceso';
  RAISE NOTICE '  • roles (TEXT[]) - Roles para Comandas [caja, cocina, mesero]';
  RAISE NOTICE '';
  RAISE NOTICE 'Tablas creadas:';
  RAISE NOTICE '  • employee_shifts - Turnos de trabajo';
  RAISE NOTICE '  • order_events - Tracking de eventos en órdenes';
  RAISE NOTICE '';
  RAISE NOTICE 'La tabla employees ahora tiene:';
  RAISE NOTICE '  ✓ Información de sueldo (para Prime Cost)';
  RAISE NOTICE '  ✓ PIN y roles (para Comandas)';
  RAISE NOTICE '  ✓ Todo en una sola tabla homogénea';
END $$;
