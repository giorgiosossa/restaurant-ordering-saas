-- ============================================
-- AGREGAR COLUMNAS DE PAGO A LA TABLA ORDERS
-- Para soportar pago en barra con código
-- ============================================

-- Agregar columnas si no existen
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_payment_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_amount_brought DECIMAL(10,2);

-- Agregar comentarios
COMMENT ON COLUMN orders.payment_type IS 'Tipo de pago: now (pasarela futura) o cash_at_bar (efectivo en barra)';
COMMENT ON COLUMN orders.cash_payment_code IS 'Código de 4 dígitos para pago en barra (se regenera diariamente)';
COMMENT ON COLUMN orders.cash_amount_brought IS 'Monto en efectivo que trae el cliente para calcular cambio';

-- Verificar que las columnas se agregaron
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('payment_type', 'cash_payment_code', 'cash_amount_brought');

SELECT '✅ Columnas de pago agregadas exitosamente' AS status;
