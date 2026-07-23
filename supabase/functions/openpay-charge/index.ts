/**
 * Openpay Charge Edge Function
 *
 * Procesa un pago con tarjeta usando Openpay.
 * El dinero va directo a la cuenta del restaurante (sin fees).
 *
 * Endpoint: POST /functions/v1/openpay-charge
 *
 * Body:
 * {
 *   "orderId": "ORD-12345",
 *   "cardToken": "tok_abc123...",
 *   "deviceSessionId": "device123...",
 *   "amount": 250.00,
 *   "description": "Orden #12345"
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
    console.log('[CHARGE] Processing payment request');

    // Parse request body
    const { orderId, cardToken, deviceSessionId, amount, description } = await req.json();

    // Validate input
    if (!orderId || !cardToken || !amount) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: orderId, cardToken, amount',
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
      console.error('[CHARGE] Order not found:', orderError);
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
      console.error('[CHARGE] Restaurant not registered in Openpay');
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

    // Create charge
    console.log(`[CHARGE] Creating charge for ${amount} MXN`);

    // When charging a customer, do NOT send customer data (Openpay rule)
    const chargeData = {
      method: 'card' as const,
      source_id: cardToken,
      amount: amount,
      description: description || `Orden ${orderId} - ${restaurant.name}`,
      order_id: orderId,
      currency: 'MXN' as const,
      capture: true,
      device_session_id: deviceSessionId,
      metadata: {
        internal_order_id: orderId,
        restaurant_id: order.restaurant_id,
        platform: 'restaurant-pos-saas',
        customer_name: order.customer_name || 'Cliente',
        customer_phone: order.customer_phone || '',
      },
    };

    const charge = await openpay.createCharge(
      restaurant.openpay_customer_id,
      chargeData
    );

    console.log('[CHARGE] Charge created successfully:', charge.id);

    // Update order in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_transaction_id: charge.id,
        status: 'accepted',
        is_blocked: false,
        payment_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('[CHARGE] Error updating order:', updateError);
      // Don't fail the request - payment was successful
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        data: {
          transactionId: charge.id,
          authorization: charge.authorization,
          status: charge.status,
          amount: charge.amount,
          currency: charge.currency,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[CHARGE] Error:', error);

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
