-- =====================================================
-- Verificar columnas de PIN en restaurants
-- El sistema de PIN ya existe, esta migración solo verifica
-- =====================================================

-- Verificar que las columnas existan
DO $$
DECLARE
  v_owner_pin_exists BOOLEAN;
  v_pin_enabled_exists BOOLEAN;
BEGIN
  -- Verificar owner_pin
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'owner_pin'
  ) INTO v_owner_pin_exists;

  -- Verificar pin_enabled
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'pin_enabled'
  ) INTO v_pin_enabled_exists;

  IF v_owner_pin_exists THEN
    RAISE NOTICE '✓ Columna owner_pin ya existe en restaurants';
  ELSE
    RAISE NOTICE '⚠ Columna owner_pin NO existe - agregándola...';
    ALTER TABLE restaurants ADD COLUMN owner_pin TEXT;
  END IF;

  IF v_pin_enabled_exists THEN
    RAISE NOTICE '✓ Columna pin_enabled ya existe en restaurants';
  ELSE
    RAISE NOTICE '⚠ Columna pin_enabled NO existe - agregándola...';
    ALTER TABLE restaurants ADD COLUMN pin_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  RAISE NOTICE '✓ Verificación de columnas completada';
END $$;

-- Nota: La función set_owner_pin() probablemente ya existe
-- Si necesitas recrearla, primero ejecuta: DROP FUNCTION IF EXISTS set_owner_pin(UUID, TEXT, BOOLEAN);
