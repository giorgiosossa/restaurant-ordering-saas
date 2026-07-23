-- ============================================
-- ADD OPENPAY CUSTOMER ID COLUMN
-- Para almacenar el ID del customer en Openpay
-- ============================================

-- Agregar columna para guardar el ID de Openpay
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS openpay_customer_id TEXT;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_restaurants_openpay_customer_id
ON restaurants(openpay_customer_id);

-- Comentario
COMMENT ON COLUMN restaurants.openpay_customer_id IS
'ID del customer en Openpay. Se obtiene al registrar el restaurante en Openpay.';

-- Verificación
SELECT '✅ Columna openpay_customer_id agregada correctamente' AS status;
