-- ============================================
-- SETUP COMPLETO PARA CÓDIGOS DE PAGO
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- 1. Agregar columnas necesarias a orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_payment_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_amount_brought DECIMAL(10,2);

COMMENT ON COLUMN orders.payment_type IS 'Tipo de pago: now (pasarela futura) o cash_at_bar (efectivo en barra)';
COMMENT ON COLUMN orders.cash_payment_code IS 'Código de 4 dígitos para pago en barra (se regenera diariamente)';
COMMENT ON COLUMN orders.cash_amount_brought IS 'Monto en efectivo que trae el cliente para calcular cambio';

-- 2. Crear función de generación de códigos únicos
CREATE OR REPLACE FUNCTION generate_unique_daily_payment_code(p_restaurant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 100;
  v_today DATE := CURRENT_DATE;
BEGIN
  LOOP
    -- Generar código aleatorio de 4 dígitos
    v_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Verificar si el código ya existe para este restaurante HOY
    SELECT EXISTS(
      SELECT 1
      FROM orders
      WHERE restaurant_id = p_restaurant_id
        AND cash_payment_code = v_code
        AND DATE(created_at) = v_today
    ) INTO v_exists;

    -- Si no existe, salir del loop
    EXIT WHEN NOT v_exists;

    -- Incrementar intentos
    v_attempts := v_attempts + 1;

    -- Si llegamos al máximo de intentos, lanzar error
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'No se pudo generar un código único después de % intentos', v_max_attempts;
    END IF;
  END LOOP;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION generate_unique_daily_payment_code(UUID) IS
'Genera un código único de 4 dígitos para pagos en efectivo. Los códigos son únicos por día y restaurante, permitiendo reutilización después de 24 horas.';

-- 3. Verificación
SELECT '✅ Setup completado exitosamente' AS status;

-- Verificar columnas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('payment_type', 'cash_payment_code', 'cash_amount_brought')
ORDER BY column_name;

-- Probar función (debería retornar un código de 4 dígitos)
-- Reemplaza 'tu-restaurant-id' con un UUID real de tu tabla restaurants para probar
-- SELECT generate_unique_daily_payment_code('00000000-0000-0000-0000-000000000000');
