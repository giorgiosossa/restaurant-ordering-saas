-- ============================================
-- ACTUALIZAR CONSTRAINT DE PAYMENT_TYPE
-- Agregar 'terminal_at_table' a los valores permitidos
-- ============================================

-- 1. Eliminar el constraint anterior
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_type_check;

-- 2. Crear nuevo constraint con los 3 valores permitidos
ALTER TABLE orders ADD CONSTRAINT orders_payment_type_check
CHECK (payment_type IS NULL OR payment_type IN ('now', 'cash_at_bar', 'terminal_at_table'));

-- 3. Verificación
SELECT '✅ Constraint actualizado correctamente' AS status;

-- Ver el constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
AND conname = 'orders_payment_type_check';
