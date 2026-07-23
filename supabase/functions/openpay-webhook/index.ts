/**
 * Openpay Webhook Edge Function
 *
 * Recibe notificaciones de Openpay sobre el estado de los pagos.
 * Actualiza automáticamente las órdenes en la base de datos.
 *
 * Endpoint: POST /functions/v1/openpay-webhook
 *
 * Registra esta URL en Openpay Dashboard:
 * https://tu-proyecto.supabase.co/functions/v1/openpay-webhook
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for idempotency (lasts for the function lifetime)
const processedWebhooks = new Set<string>();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[WEBHOOK] Received Openpay webhook');

    const payload = await req.json();
    const eventType = payload.type;

    console.log(`[WEBHOOK] Event type: ${eventType}`);

    // ============================================
    // STEP 1: Handle Verification Event
    // ============================================

    if (eventType === 'verification') {
      console.log('[WEBHOOK] Verification event received');
      return new Response(
        JSON.stringify({
          message: 'Webhook verified successfully',
          verification_code: payload.verification_code,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ============================================
    // STEP 2: Extract Transaction Data
    // ============================================

    const transaction = payload.transaction;

    if (!transaction || !transaction.id) {
      console.error('[WEBHOOK] Invalid payload: missing transaction');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ============================================
    // STEP 3: Idempotency Check
    // ============================================

    const webhookId = `${eventType}_${transaction.id}_${payload.event_date}`;

    if (processedWebhooks.has(webhookId)) {
      console.warn('[WEBHOOK] Duplicate webhook ignored:', webhookId);
      return new Response(
        JSON.stringify({ message: 'Webhook already processed' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    processedWebhooks.add(webhookId);

    // ============================================
    // STEP 4: Initialize Supabase
    // ============================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============================================
    // STEP 5: Process Event Type
    // ============================================

    const orderId = transaction.order_id || transaction.metadata?.internal_order_id;

    if (!orderId) {
      console.error('[WEBHOOK] No order_id found in transaction');
      return new Response(
        JSON.stringify({ message: 'No order_id in transaction' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    switch (eventType) {
      case 'charge.succeeded':
        await handleChargeSucceeded(supabase, transaction, orderId);
        break;

      case 'charge.failed':
        await handleChargeFailed(supabase, transaction, orderId);
        break;

      case 'charge.cancelled':
        await handleChargeCancelled(supabase, transaction, orderId);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(supabase, transaction, orderId);
        break;

      case 'charge.chargeback.created':
        await handleChargebackCreated(supabase, transaction, orderId);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
    }

    // ============================================
    // STEP 6: Respond to Openpay
    // ============================================

    return new Response(
      JSON.stringify({
        message: 'Webhook processed successfully',
        event_type: eventType,
        transaction_id: transaction.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);

    // Still return 200 to prevent Openpay from retrying
    return new Response(
      JSON.stringify({
        message: 'Webhook received but processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================
// EVENT HANDLERS
// ============================================

async function handleChargeSucceeded(supabase: any, transaction: any, orderId: string) {
  console.log('[WEBHOOK] Processing charge.succeeded:', transaction.id);

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      payment_transaction_id: transaction.id,
      status: 'accepted',
      is_blocked: false,
      payment_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('order_number', orderId);

  if (error) {
    console.error('[WEBHOOK] Error updating order:', error);
    throw error;
  }

  console.log('[WEBHOOK] Order updated successfully:', orderId);
}

async function handleChargeFailed(supabase: any, transaction: any, orderId: string) {
  console.log('[WEBHOOK] Processing charge.failed:', transaction.id);

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      payment_transaction_id: transaction.id,
      status: 'cancelled',
      internal_notes: `Payment failed: ${transaction.error_message || 'Unknown error'}`,
      updated_at: new Date().toISOString(),
    })
    .eq('order_number', orderId);

  if (error) {
    console.error('[WEBHOOK] Error updating order:', error);
    throw error;
  }

  console.log('[WEBHOOK] Order marked as failed:', orderId);
}

async function handleChargeCancelled(supabase: any, transaction: any, orderId: string) {
  console.log('[WEBHOOK] Processing charge.cancelled:', transaction.id);

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('order_number', orderId);

  if (error) {
    console.error('[WEBHOOK] Error updating order:', error);
  }

  console.log('[WEBHOOK] Order cancelled:', orderId);
}

async function handleChargeRefunded(supabase: any, transaction: any, orderId: string) {
  console.log('[WEBHOOK] Processing charge.refunded:', transaction.id);

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'refunded',
      internal_notes: `Order refunded. Transaction: ${transaction.id}`,
      updated_at: new Date().toISOString(),
    })
    .eq('order_number', orderId);

  if (error) {
    console.error('[WEBHOOK] Error updating order:', error);
  }

  console.log('[WEBHOOK] Order refunded:', orderId);
}

async function handleChargebackCreated(supabase: any, transaction: any, orderId: string) {
  console.log('[WEBHOOK] Processing chargeback.created:', transaction.id);

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'chargeback',
      internal_notes: `CHARGEBACK ALERT - Transaction: ${transaction.id}`,
      updated_at: new Date().toISOString(),
    })
    .eq('order_number', orderId);

  if (error) {
    console.error('[WEBHOOK] Error updating order:', error);
  }

  console.log('[WEBHOOK] Chargeback recorded:', orderId);
}
