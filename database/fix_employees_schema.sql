-- =====================================================
-- FIX EMPLOYEES SCHEMA - Diagnóstico y Corrección
-- =====================================================
-- Este script verifica y corrige el esquema de employees
-- =====================================================

-- =====================================================
-- 1. VERIFICAR SI LA TABLA EXISTE
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    RAISE NOTICE '✓ La tabla employees existe';
  ELSE
    RAISE NOTICE '✗ La tabla employees NO existe - creándola...';
  END IF;
END $$;

-- =====================================================
-- 2. CREAR TABLA employees SI NO EXISTE
-- =====================================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Información básica
  name TEXT NOT NULL,
  "position" TEXT,

  -- Tipo de empleo
  employment_type TEXT NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'hourly')),

  -- Compensación
  monthly_salary DECIMAL(10, 2),
  hourly_rate DECIMAL(10, 2),
  hours_per_week DECIMAL(5, 2),

  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  -- Para Comandas (Sistema Unificado)
  pin TEXT,
  roles TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. AGREGAR COLUMNAS SI NO EXISTEN
-- =====================================================

-- Agregar PIN si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'pin'
  ) THEN
    ALTER TABLE employees ADD COLUMN pin TEXT;
    RAISE NOTICE '✓ Columna pin agregada';
  ELSE
    RAISE NOTICE '✓ Columna pin ya existe';
  END IF;
END $$;

-- Agregar roles si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'roles'
  ) THEN
    ALTER TABLE employees ADD COLUMN roles TEXT[] DEFAULT '{}';
    RAISE NOTICE '✓ Columna roles agregada';
  ELSE
    RAISE NOTICE '✓ Columna roles ya existe';
  END IF;
END $$;

-- =====================================================
-- 4. CREAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_employees_restaurant_id ON employees(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- =====================================================
-- 5. CONSTRAINT PARA PIN
-- =====================================================

DO $$
BEGIN
  ALTER TABLE employees
  ADD CONSTRAINT pin_format
  CHECK (pin IS NULL OR pin ~ '^\d{4}$');
  RAISE NOTICE '✓ Constraint pin_format agregado';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✓ Constraint pin_format ya existe';
END $$;

-- =====================================================
-- 6. ÍNDICE ÚNICO PARA PIN
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS employees_restaurant_pin_active_unique
ON employees(restaurant_id, pin)
WHERE is_active = TRUE AND pin IS NOT NULL;

-- =====================================================
-- 7. TRIGGER PARA updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- =====================================================
-- 8. RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS employees_select_policy ON employees;
DROP POLICY IF EXISTS employees_insert_policy ON employees;
DROP POLICY IF EXISTS employees_update_policy ON employees;
DROP POLICY IF EXISTS employees_delete_policy ON employees;

-- Create policies
CREATE POLICY employees_select_policy ON employees
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY employees_insert_policy ON employees
  FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY employees_update_policy ON employees
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY employees_delete_policy ON employees
  FOR DELETE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 9. CREAR TABLAS ADICIONALES
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

-- RLS para employee_shifts
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_shifts_select_policy ON employee_shifts;
DROP POLICY IF EXISTS employee_shifts_insert_policy ON employee_shifts;
DROP POLICY IF EXISTS employee_shifts_update_policy ON employee_shifts;

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

-- Crear tabla order_events
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

-- RLS para order_events
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_events_select_policy ON order_events;
DROP POLICY IF EXISTS order_events_insert_policy ON order_events;

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
-- 10. FUNCIÓN HELPER PARA VALIDAR PIN
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
-- 11. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'employees';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ESQUEMA DE EMPLOYEES VERIFICADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Columnas en employees: %', v_column_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Tablas creadas:';
  RAISE NOTICE '  ✓ employees';
  RAISE NOTICE '  ✓ employee_shifts';
  RAISE NOTICE '  ✓ order_events';
  RAISE NOTICE '';
  RAISE NOTICE 'Funciones creadas:';
  RAISE NOTICE '  ✓ validate_employee_pin()';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ahora refresca el esquema en Supabase:';
  RAISE NOTICE 'Settings > API > Schema Cache > Reload';
  RAISE NOTICE '========================================';
END $$;
