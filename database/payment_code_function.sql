-- ============================================
-- FUNCIÓN DE GENERACIÓN DE CÓDIGOS DE PAGO
-- Genera códigos únicos de 4 dígitos por día para cada restaurante
-- Los códigos se pueden reusar después de 24 horas
-- ============================================

-- Crear función para generar código único de 4 dígitos
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

-- Comentario sobre la función
COMMENT ON FUNCTION generate_unique_daily_payment_code(UUID) IS
'Genera un código único de 4 dígitos para pagos en efectivo. Los códigos son únicos por día y restaurante, permitiendo reutilización después de 24 horas.';

-- Verificar que la función se creó correctamente
SELECT 'Función generate_unique_daily_payment_code creada exitosamente' AS status;
