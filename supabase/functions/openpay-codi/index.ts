/**
 * Openpay CoDi Payment Edge Function
 *
 * Genera un pago con CoDi (QR code) para que el cliente pague desde su app bancaria.
 * El dinero va directo a la cuenta del restaurante.
 *
 * Endpoint: POST /functions/v1/openpay-codi
 *
 * Body:
 * {
 *   "orderId": "ORD-12345",
 *   "amount": 250.00,
 *   "description": "Orden #12345",
 *   "dueDate": "2025-07-25T23:59:59Z" (opcional)
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { initOpenpay } from '../_shared/openpay.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[CODI] Processing CoDi payment request');

    // Parse request body
    const { orderId, amount, description, dueDate } = await req.json();

    // Validate input
    if (!orderId || !amount) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: orderId, amount',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order details from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, restaurants(openpay_customer_id, name)')
      .eq('order_number', orderId)
      .single();

    if (orderError || !order) {
      console.error('[CODI] Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if restaurant is registered in Openpay
    const restaurant = order.restaurants as any;
    if (!restaurant?.openpay_customer_id) {
      console.error('[CODI] Restaurant not registered in Openpay');
      return new Response(
        JSON.stringify({
          error: 'Restaurant not configured for payments. Please contact support.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Openpay
    const openpay = initOpenpay();

    // Calculate due date (3 days from now if not provided)
    const dueDateValue = dueDate || getDefaultDueDate();

    // Create CoDi charge
    console.log(`[CODI] Creating CoDi payment for ${amount} MXN`);

    const chargeData = {
      method: 'bank_account' as const,
      amount: amount,
      description: description || `Orden ${orderId} - ${restaurant.name}`,
      order_id: orderId,
      currency: 'MXN' as const,
      due_date: dueDateValue,
      metadata: {
        internal_order_id: orderId,
        restaurant_id: order.restaurant_id,
        payment_type: 'codi',
        platform: 'restaurant-pos-saas',
      },
    };

    const charge = await openpay.createCharge(
      restaurant.openpay_customer_id,
      chargeData
    );

    console.log('[CODI] CoDi payment created successfully:', charge.id);
    console.log('[CODI] QR URL:', charge.payment_method?.barcode_url);

    // Update order with CoDi reference
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_transaction_id: charge.id,
        payment_status: 'pending',
        is_blocked: true, // Block until payment is confirmed via webhook
        internal_notes: `CoDi payment pending. Reference: ${charge.payment_method?.reference}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('[CODI] Error updating order:', updateError);
      // Don't fail the request - CoDi was created successfully
    }

    // Return success response with QR code
    return new Response(
      JSON.stringify({
        success: true,
        message: 'CoDi payment created successfully',
        data: {
          transactionId: charge.id,
          qrCodeUrl: charge.payment_method?.barcode_url,
          reference: charge.payment_method?.reference,
          clabe: charge.payment_method?.clabe,
          amount: charge.amount,
          currency: charge.currency,
          dueDate: charge.due_date,
          status: charge.status,
          instructions: {
            step1: 'Abre tu app bancaria',
            step2: 'Selecciona "Pagar con CoDi"',
            step3: 'Escanea el código QR',
            step4: 'Confirma el pago',
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[CODI] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Get default due date (3 days from now)
 */
function getDefaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString();
}
