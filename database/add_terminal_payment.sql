-- ============================================
-- AGREGAR CONFIGURACIÓN DE PAGO CON TERMINAL
-- ============================================

-- 1. Agregar configuración a tabla restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS terminal_payment_auto_approve BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN restaurants.terminal_payment_auto_approve IS 'Si es TRUE, los pedidos con terminal se aprueban automáticamente. Si es FALSE, quedan bloqueados hasta confirmación del cajero.';

-- 2. Verificación
SELECT '✅ Columna terminal_payment_auto_approve agregada exitosamente' AS status;

-- Ver columnas de restaurants relacionadas con pagos
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name LIKE '%payment%'
ORDER BY column_name;
