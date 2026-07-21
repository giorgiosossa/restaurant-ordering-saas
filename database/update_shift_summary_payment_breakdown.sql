-- ============================================
-- ACTUALIZAR FUNCIÓN get_shift_summary
-- Para desglozar pagos por terminal y efectivo
-- ============================================

CREATE OR REPLACE FUNCTION get_shift_summary(p_shift_id UUID)
RETURNS TABLE (
  shift_id UUID,
  employee_id UUID,
  employee_name TEXT,
  restaurant_id UUID,
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  total_orders BIGINT,
  total_amount DECIMAL,
  payment_breakdown JSONB,
  expected_cash DECIMAL,
  orders_detail JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_shift_start TIMESTAMPTZ;
  v_shift_end TIMESTAMPTZ;
  v_employee_id UUID;
  v_employee_name TEXT;
  v_restaurant_id UUID;
  v_total_orders BIGINT;
  v_total_amount DECIMAL;
  v_payment_breakdown JSONB;
  v_expected_cash DECIMAL;
  v_orders_detail JSONB;
BEGIN
  -- Get shift information
  SELECT es.started_at, es.ended_at, es.employee_id, e.name, es.restaurant_id
  INTO v_shift_start, v_shift_end, v_employee_id, v_employee_name, v_restaurant_id
  FROM employee_shifts es
  JOIN employees e ON e.id = es.employee_id
  WHERE es.id = p_shift_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found: %', p_shift_id;
  END IF;

  -- If shift hasn't ended, use current time
  IF v_shift_end IS NULL THEN
    v_shift_end := NOW();
  END IF;

  -- Calculate total orders and amount
  SELECT
    COUNT(DISTINCT o.id)::BIGINT,
    COALESCE(SUM(o.total), 0)::DECIMAL
  INTO v_total_orders, v_total_amount
  FROM orders o
  WHERE o.restaurant_id = v_restaurant_id
  AND o.created_at BETWEEN v_shift_start AND v_shift_end
  AND o.status IN ('completed', 'ready', 'preparing');

  -- Calculate payment breakdown by type (terminal vs cash)
  SELECT jsonb_agg(
    jsonb_build_object(
      'method', breakdown.payment_method,
      'count', breakdown.order_count,
      'amount', breakdown.method_total
    )
  )
  INTO v_payment_breakdown
  FROM (
    SELECT
      CASE
        WHEN o.payment_type = 'terminal_at_table' THEN 'terminal'
        WHEN o.payment_type = 'cash_at_bar' THEN 'cash'
        ELSE 'other'
      END AS payment_method,
      COUNT(*)::INTEGER AS order_count,
      COALESCE(SUM(o.total), 0)::DECIMAL AS method_total
    FROM orders o
    WHERE o.restaurant_id = v_restaurant_id
    AND o.created_at BETWEEN v_shift_start AND v_shift_end
    AND o.status IN ('completed', 'ready', 'preparing')
    AND o.payment_type IS NOT NULL
    GROUP BY
      CASE
        WHEN o.payment_type = 'terminal_at_table' THEN 'terminal'
        WHEN o.payment_type = 'cash_at_bar' THEN 'cash'
        ELSE 'other'
      END
  ) breakdown;

  -- Calculate expected cash (only from cash_at_bar payments)
  SELECT COALESCE(SUM(o.total), 0)::DECIMAL
  INTO v_expected_cash
  FROM orders o
  WHERE o.restaurant_id = v_restaurant_id
  AND o.created_at BETWEEN v_shift_start AND v_shift_end
  AND o.status IN ('completed', 'ready', 'preparing')
  AND o.payment_type = 'cash_at_bar';

  -- Get orders detail
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_number', o.order_number,
      'total', o.total,
      'payment_type', o.payment_type,
      'customer_name', o.customer_name,
      'table_number', o.table_number,
      'created_at', o.created_at,
      'completed_at', o.completed_at
    )
    ORDER BY o.created_at DESC
  )
  INTO v_orders_detail
  FROM orders o
  WHERE o.restaurant_id = v_restaurant_id
  AND o.created_at BETWEEN v_shift_start AND v_shift_end
  AND o.status IN ('completed', 'ready', 'preparing');

  -- Return the results
  RETURN QUERY
  SELECT
    p_shift_id,
    v_employee_id,
    v_employee_name,
    v_restaurant_id,
    v_shift_start,
    v_shift_end,
    v_total_orders,
    v_total_amount,
    v_payment_breakdown,
    v_expected_cash,
    v_orders_detail;
END;
$$;

COMMENT ON FUNCTION get_shift_summary(UUID) IS
'Obtiene el resumen de un turno con desglose de pagos por terminal y efectivo';

-- Verificación
SELECT '✅ Función get_shift_summary actualizada correctamente' AS status;
