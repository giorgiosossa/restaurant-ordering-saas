#!/bin/bash

# Script para simular un pago SPEI en Sandbox de OpenPay
# Uso: ./simulate-spei-payment.sh <TRANSACTION_ID>

# Load credentials from .env file
if [ -f "../.env" ]; then
  source "../.env"
  MERCHANT_ID="${OPENPAY_MERCHANT_ID}"
  PRIVATE_KEY="${OPENPAY_PRIVATE_KEY}"
else
  echo "❌ Error: .env file not found"
  echo "Create a .env file with OPENPAY_MERCHANT_ID and OPENPAY_PRIVATE_KEY"
  exit 1
fi
TRANSACTION_ID=$1

if [ -z "$TRANSACTION_ID" ]; then
  echo "❌ Error: Debes proporcionar el Transaction ID"
  echo "Uso: ./simulate-spei-payment.sh <TRANSACTION_ID>"
  echo ""
  echo "Ejemplo:"
  echo "  ./simulate-spei-payment.sh tr3nw9g5w8b6o3kq7t2l"
  exit 1
fi

echo "🔄 Simulando pago SPEI para transacción: $TRANSACTION_ID"
echo ""

# Simular el pago
curl -X POST \
  "https://sandbox-api.openpay.mx/v1/${MERCHANT_ID}/charges/${TRANSACTION_ID}/capture" \
  -u "${PRIVATE_KEY}:" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": null
  }' | jq '.'

echo ""
echo "✅ Pago simulado exitosamente"
echo "💡 Verifica el webhook en los logs de Supabase:"
echo "   supabase functions logs openpay-webhook --follow"
