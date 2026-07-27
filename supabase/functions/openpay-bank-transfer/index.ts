/**
 * Openpay Bank Transfer (SPEI) Edge Function
 *
 * Creates a bank transfer charge using Openpay.
 * Returns CLABE account number and reference for customer to make SPEI payment.
 *
 * Endpoint: POST /functions/v1/openpay-bank-transfer
 *
 * Body:
 * {
 *   "orderId": "ORD-12345",
 *   "amount": 250.00,
 *   "description": "Orden #12345",
 *   "customerName": "Juan Perez",
 *   "customerEmail": "juan@example.com",
 *   "dueDate": "2026-08-01T23:59:59.000Z" // Optional, max 30 days
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
    console.log('[BANK_TRANSFER] Processing bank transfer request');

    // Parse request body
    const { orderId, amount, description, customerName, customerEmail, dueDate } = await req.json();

    // Validate input
    if (!orderId || !amount || !customerName || !customerEmail) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: orderId, amount, customerName, customerEmail',
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
      console.error('[BANK_TRANSFER] Order not found:', orderError);
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
      console.error('[BANK_TRANSFER] Restaurant not registered in Openpay');
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

    // Calculate due date (default to 3 days from now if not specified)
    const calculatedDueDate = dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    // Create bank transfer charge
    console.log(`[BANK_TRANSFER] Creating bank transfer charge for ${amount} MXN`);

    // When creating a charge for a customer (not standalone), do NOT send customer data
    // OpenPay rule: customer data is only sent for standalone charges (without customer_id in URL)
    const chargeData = {
      method: 'bank_account' as const,
      amount: amount,
      description: description || `Orden ${orderId} - ${restaurant.name}`,
      order_id: orderId,
      currency: 'MXN' as const,
      due_date: calculatedDueDate,
      // DO NOT include customer field when charging to a customer account
      metadata: {
        internal_order_id: orderId,
        restaurant_id: order.restaurant_id,
        platform: 'restaurant-pos-saas',
        customer_name: customerName,
        customer_email: customerEmail,
      },
    };

    const charge = await openpay.createCharge(
      restaurant.openpay_customer_id,
      chargeData
    );

    console.log('[BANK_TRANSFER] Bank transfer charge created successfully:', charge.id);

    // Extract payment information
    const paymentMethod = charge.payment_method || {};
    const clabe = paymentMethod.clabe || '';
    const reference = paymentMethod.reference || '';
    const agreement = paymentMethod.agreement || '';

    // Update order in database with bank transfer information
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'pending',
        payment_transaction_id: charge.id,
        bank_transfer_clabe: clabe,
        bank_transfer_reference: reference,
        bank_transfer_agreement: agreement,
        bank_transfer_due_date: calculatedDueDate,
        is_blocked: true, // Block order until payment is received
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('[BANK_TRANSFER] Error updating order:', updateError);
      // Don't fail the request - charge was created successfully
    }

    // Return success response with bank transfer details
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bank transfer charge created successfully',
        data: {
          transactionId: charge.id,
          clabe: clabe,
          reference: reference,
          agreement: agreement,
          amount: charge.amount,
          currency: charge.currency,
          dueDate: calculatedDueDate,
          status: charge.status,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[BANK_TRANSFER] Error:', error);

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
