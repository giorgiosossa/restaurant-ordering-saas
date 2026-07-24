-- =====================================================
-- EMPLOYEE MANAGEMENT SYSTEM
-- =====================================================
-- Sistema para gestionar empleados y calcular labor cost real
-- para el KPI de Prime Cost
-- =====================================================

-- =====================================================
-- 1. CREAR TABLA employees
-- =====================================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Información básica
  name TEXT NOT NULL,
  position TEXT, -- Chef, Mesero, Cajero, Gerente, etc.

  -- Tipo de empleo
  employment_type TEXT NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'hourly')),

  -- Compensación (solo uno debe estar lleno según employment_type)
  monthly_salary DECIMAL(10, 2), -- Para full_time
  hourly_rate DECIMAL(10, 2),    -- Para part_time y hourly
  hours_per_week DECIMAL(5, 2),  -- Para part_time (promedio semanal)

  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_full_time_salary CHECK (
    employment_type != 'full_time' OR monthly_salary IS NOT NULL
  ),
  CONSTRAINT valid_hourly_rate CHECK (
    employment_type = 'full_time' OR hourly_rate IS NOT NULL
  ),
  CONSTRAINT valid_part_time_hours CHECK (
    employment_type != 'part_time' OR hours_per_week IS NOT NULL
  )
);

-- =====================================================
-- 2. CREAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_employees_restaurant_id ON employees(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- =====================================================
-- 3. TRIGGER PARA updated_at
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
-- 4. FUNCIÓN PARA CALCULAR LABOR COST DE UN PERÍODO
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_labor_cost(
  p_restaurant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS DECIMAL AS $$
DECLARE
  v_labor_cost DECIMAL := 0;
  v_days_in_period DECIMAL;
  v_weeks_in_period DECIMAL;
BEGIN
  -- Calcular días y semanas en el período
  v_days_in_period := EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / (24 * 60 * 60);
  v_weeks_in_period := v_days_in_period / 7.0;

  -- Calcular labor cost
  SELECT COALESCE(
    SUM(
      CASE
        -- Empleados full-time: salario mensual prorrateado
        WHEN e.employment_type = 'full_time' THEN
          e.monthly_salary * (v_days_in_period / 30.0)

        -- Empleados part-time: horas semanales × rate × semanas
        WHEN e.employment_type = 'part_time' THEN
          e.hourly_rate * e.hours_per_week * v_weeks_in_period

        -- Empleados hourly: estimación basada en 40 horas semanales
        -- (puedes ajustar este número según tu negocio)
        WHEN e.employment_type = 'hourly' THEN
          e.hourly_rate * 40 * v_weeks_in_period

        ELSE 0
      END
    ),
    0
  )
  INTO v_labor_cost
  FROM employees e
  WHERE e.restaurant_id = p_restaurant_id
  AND e.is_active = TRUE;

  RETURN v_labor_cost;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. ACTUALIZAR calculate_restaurant_kpis
-- =====================================================

DROP FUNCTION IF EXISTS calculate_restaurant_kpis(uuid, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION calculate_restaurant_kpis(
  p_restaurant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  -- Margen Bruto
  gross_margin_percentage DECIMAL,
  gross_margin_by_category JSONB,
  gross_margin_by_item JSONB,

  -- Prime Cost
  prime_cost_percentage DECIMAL,
  cogs DECIMAL,
  labor_cost DECIMAL,
  total_revenue DECIMAL,

  -- Ticket Promedio
  average_ticket DECIMAL,
  total_transactions INTEGER,

  -- Mermas de Proteínas
  protein_waste_percentage DECIMAL,
  total_protein_purchases DECIMAL,
  total_protein_waste DECIMAL,

  -- Mix de Ventas
  sales_mix JSONB,

  -- Conversión de Postres y Café
  dessert_conversion_percentage DECIMAL,
  coffee_conversion_percentage DECIMAL,
  tickets_with_desserts INTEGER,
  tickets_with_coffee INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_revenue DECIMAL;
  v_total_cost DECIMAL;
  v_total_transactions INTEGER;
  v_labor_cost DECIMAL;
  v_cogs DECIMAL;
  v_total_protein_purchases DECIMAL;
  v_total_protein_waste DECIMAL;
BEGIN
  -- =====================================================
  -- 1. BASIC METRICS: Revenue, Cost, Transactions
  -- =====================================================

  SELECT
    COUNT(DISTINCT o.id)::INTEGER,
    COALESCE(SUM(o.total), 0)::DECIMAL,
    COALESCE(SUM(
      (SELECT SUM(mi.cost_per_item * item.quantity)
       FROM jsonb_to_recordset(o.items) AS item(quantity INTEGER, menu_item_id TEXT)
       JOIN menu_items mi ON mi.id::TEXT = item.menu_item_id)
    ), 0)::DECIMAL
  INTO v_total_transactions, v_total_revenue, v_total_cost
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
  AND o.created_at BETWEEN p_start_date AND p_end_date
  AND o.status IN ('completed', 'ready', 'preparing', 'accepted');

  -- =====================================================
  -- 2. LABOR COST (USANDO NUEVA FUNCIÓN)
  -- =====================================================

  v_labor_cost := calculate_labor_cost(p_restaurant_id, p_start_date, p_end_date);

  -- Calculate COGS (Cost of Goods Sold)
  v_cogs := v_total_cost;

  -- =====================================================
  -- 3. MARGEN BRUTO (GROSS MARGIN)
  -- =====================================================

  -- Global Gross Margin
  gross_margin_percentage := CASE
    WHEN v_total_revenue > 0 THEN
      ((v_total_revenue - v_total_cost) / v_total_revenue * 100)::DECIMAL
    ELSE 0
  END;

  -- Gross Margin by Category Type
  SELECT jsonb_object_agg(
    category_type,
    jsonb_build_object(
      'revenue', revenue,
      'cost', cost,
      'margin_percentage', CASE WHEN revenue > 0 THEN ((revenue - cost) / revenue * 100) ELSE 0 END
    )
  )
  INTO gross_margin_by_category
  FROM (
    SELECT
      mi.category_type,
      SUM(item.quantity * mi.base_price)::DECIMAL AS revenue,
      SUM(item.quantity * mi.cost_per_item)::DECIMAL AS cost
    FROM orders o
    CROSS JOIN jsonb_to_recordset(o.items) AS item(quantity INTEGER, menu_item_id TEXT)
    JOIN menu_items mi ON mi.id::TEXT = item.menu_item_id
    WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at BETWEEN p_start_date AND p_end_date
    AND o.status IN ('completed', 'ready', 'preparing', 'accepted')
    GROUP BY mi.category_type
  ) category_margins;

  -- Gross Margin by Individual Item
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_id', item_id,
      'item_name', item_name,
      'revenue', revenue,
      'cost', cost,
      'margin_percentage', CASE WHEN revenue > 0 THEN ((revenue - cost) / revenue * 100) ELSE 0 END,
      'units_sold', units_sold
    )
  )
  INTO gross_margin_by_item
  FROM (
    SELECT
      mi.id AS item_id,
      mi.name AS item_name,
      SUM(item.quantity)::INTEGER AS units_sold,
      SUM(item.quantity * mi.base_price)::DECIMAL AS revenue,
      SUM(item.quantity * mi.cost_per_item)::DECIMAL AS cost
    FROM orders o
    CROSS JOIN jsonb_to_recordset(o.items) AS item(quantity INTEGER, menu_item_id TEXT)
    JOIN menu_items mi ON mi.id::TEXT = item.menu_item_id
    WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at BETWEEN p_start_date AND p_end_date
    AND o.status IN ('completed', 'ready', 'preparing', 'accepted')
    GROUP BY mi.id, mi.name
    ORDER BY revenue DESC
  ) item_margins;

  -- =====================================================
  -- 4. PRIME COST
  -- =====================================================

  prime_cost_percentage := CASE
    WHEN v_total_revenue > 0 THEN
      ((v_cogs + v_labor_cost) / v_total_revenue * 100)::DECIMAL
    ELSE 0
  END;

  cogs := v_cogs;
  labor_cost := v_labor_cost;
  total_revenue := v_total_revenue;

  -- =====================================================
  -- 5. TICKET PROMEDIO (AVERAGE TICKET)
  -- =====================================================

  average_ticket := CASE
    WHEN v_total_transactions > 0 THEN
      (v_total_revenue / v_total_transactions)::DECIMAL
    ELSE 0
  END;

  total_transactions := v_total_transactions;

  -- =====================================================
  -- 6. MERMAS DE PROTEÍNAS (PROTEIN WASTE)
  -- =====================================================

  -- Total protein purchases
  SELECT COALESCE(SUM(ii.cost_per_unit * ii.current_quantity), 0)::DECIMAL
  INTO v_total_protein_purchases
  FROM inventory_items ii
  WHERE ii.restaurant_id = p_restaurant_id
  AND ii.is_protein = TRUE;

  -- Total protein waste
  SELECT COALESCE(SUM(pw.waste_cost), 0)::DECIMAL
  INTO v_total_protein_waste
  FROM protein_waste pw
  WHERE pw.restaurant_id = p_restaurant_id
  AND pw.wasted_at BETWEEN p_start_date AND p_end_date;

  protein_waste_percentage := CASE
    WHEN v_total_protein_purchases > 0 THEN
      (v_total_protein_waste / v_total_protein_purchases * 100)::DECIMAL
    ELSE 0
  END;

  total_protein_purchases := v_total_protein_purchases;
  total_protein_waste := v_total_protein_waste;

  -- =====================================================
  -- 7. MIX DE VENTAS (SALES MIX)
  -- =====================================================

  SELECT jsonb_object_agg(
    category_type,
    jsonb_build_object(
      'revenue', revenue,
      'percentage', CASE WHEN v_total_revenue > 0 THEN (revenue / v_total_revenue * 100) ELSE 0 END,
      'transaction_count', transaction_count
    )
  )
  INTO sales_mix
  FROM (
    SELECT
      mi.category_type,
      SUM(item.quantity * mi.base_price)::DECIMAL AS revenue,
      COUNT(DISTINCT o.id)::INTEGER AS transaction_count
    FROM orders o
    CROSS JOIN jsonb_to_recordset(o.items) AS item(quantity INTEGER, menu_item_id TEXT)
    JOIN menu_items mi ON mi.id::TEXT = item.menu_item_id
    WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at BETWEEN p_start_date AND p_end_date
    AND o.status IN ('completed', 'ready', 'preparing', 'accepted')
    GROUP BY mi.category_type
  ) mix;

  -- =====================================================
  -- 8. CONVERSIÓN DE POSTRES Y CAFÉ
  -- =====================================================

  -- Tickets with desserts
  SELECT COUNT(DISTINCT o.id)::INTEGER
  INTO tickets_with_desserts
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
  AND o.created_at BETWEEN p_start_date AND p_end_date
  AND o.status IN ('completed', 'ready', 'preparing', 'accepted')
  AND EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(o.items) AS item(menu_item_id TEXT)
    JOIN menu_items mi ON mi.id::TEXT = item.menu_item_id
    WHERE mi.category_type = 'dessert'
  );

  -- Tickets with coffee
  SELECT COUNT(DISTINCT o.id)::INTEGER
  INTO tickets_with_coffee
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
  AND o.created_at BETWEEN p_start_date AND p_end_date
  AND o.status IN ('completed', 'ready', 'preparing', 'accepted')
  AND EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(o.items) AS item(menu_item_id TEXT)
    JOIN menu_items mi ON mi.id::TEXT = item.menu_item_id
    WHERE mi.category_type = 'coffee'
  );

  dessert_conversion_percentage := CASE
    WHEN v_total_transactions > 0 THEN
      (tickets_with_desserts::DECIMAL / v_total_transactions * 100)
    ELSE 0
  END;

  coffee_conversion_percentage := CASE
    WHEN v_total_transactions > 0 THEN
      (tickets_with_coffee::DECIMAL / v_total_transactions * 100)
    ELSE 0
  END;

  -- Return all KPIs
  RETURN QUERY SELECT
    gross_margin_percentage,
    gross_margin_by_category,
    gross_margin_by_item,
    prime_cost_percentage,
    cogs,
    labor_cost,
    total_revenue,
    average_ticket,
    total_transactions,
    protein_waste_percentage,
    total_protein_purchases,
    total_protein_waste,
    sales_mix,
    dessert_conversion_percentage,
    coffee_conversion_percentage,
    tickets_with_desserts,
    tickets_with_coffee;
END;
$$;

-- =====================================================
-- 6. RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver empleados de su restaurante
CREATE POLICY employees_select_policy ON employees
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Los usuarios solo pueden insertar empleados en su restaurante
CREATE POLICY employees_insert_policy ON employees
  FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Los usuarios solo pueden actualizar empleados de su restaurante
CREATE POLICY employees_update_policy ON employees
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Los usuarios solo pueden eliminar empleados de su restaurante
CREATE POLICY employees_delete_policy ON employees
  FOR DELETE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 7. VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de empleados creado exitosamente!';
  RAISE NOTICE '';
  RAISE NOTICE 'Elementos creados:';
  RAISE NOTICE '  • Tabla: employees';
  RAISE NOTICE '  • Función: calculate_labor_cost()';
  RAISE NOTICE '  • Función: calculate_restaurant_kpis() (actualizada)';
  RAISE NOTICE '  • Triggers: update_employees_updated_at';
  RAISE NOTICE '  • RLS policies para employees';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Prime Cost ahora calcula labor cost real basado en empleados!';
END $$;
