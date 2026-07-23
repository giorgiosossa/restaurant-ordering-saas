/**
 * Openpay Webhook Controller
 *
 * Handles incoming webhooks from Openpay for payment status updates.
 * Implements idempotency to prevent duplicate processing.
 *
 * IMPORTANT: Register this webhook URL in Openpay Dashboard:
 * https://sandbox-dashboard.openpay.mx/webhooks
 *
 * Endpoint: POST /webhooks/openpay
 */

import { Request, Response } from 'express';
import { createHash } from 'crypto';
import type {
  OpenpayWebhookPayload,
  OpenpayVerificationWebhook,
  OpenpayChargeResponse,
} from '../types/openpay.types';
import { supabase } from '../config/supabase';

// ============================================
// IN-MEMORY CACHE FOR IDEMPOTENCY
// (In production, use Redis or a database table)
// ============================================

const processedWebhooks = new Set<string>();
const WEBHOOK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clean old webhook IDs from cache periodically
 */
setInterval(() => {
  processedWebhooks.clear();
  console.log('[WEBHOOK] Cache cleared');
}, WEBHOOK_CACHE_TTL);

// ============================================
// WEBHOOK HANDLER
// ============================================

/**
 * Main webhook handler
 * Processes Openpay events and updates order status
 */
export const handleOpenpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as OpenpayWebhookPayload | OpenpayVerificationWebhook;

    console.log('[WEBHOOK] 📥 Received Openpay webhook:', {
      type: payload.type,
      timestamp: new Date().toISOString(),
    });

    // ============================================
    // STEP 1: Handle Verification Event
    // ============================================

    if (payload.type === 'verification') {
      console.log('[WEBHOOK] ✅ Verification event received');
      const verificationPayload = payload as OpenpayVerificationWebhook;

      res.status(200).json({
        message: 'Webhook verified successfully',
        verification_code: verificationPayload.verification_code,
      });
      return;
    }

    // ============================================
    // STEP 2: Extract Transaction Data
    // ============================================

    const webhookPayload = payload as OpenpayWebhookPayload;
    const transaction = webhookPayload.transaction as OpenpayChargeResponse;

    if (!transaction || !transaction.id) {
      console.error('[WEBHOOK] ❌ Invalid webhook payload: missing transaction');
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    // ============================================
    // STEP 3: Idempotency Check
    // ============================================

    const webhookId = generateWebhookId(payload);

    if (processedWebhooks.has(webhookId)) {
      console.warn('[WEBHOOK] ⚠️ Duplicate webhook ignored:', webhookId);
      res.status(200).json({ message: 'Webhook already processed' });
      return;
    }

    // Mark as processed immediately to prevent race conditions
    processedWebhooks.add(webhookId);

    // ============================================
    // STEP 4: Process Event Type
    // ============================================

    switch (payload.type) {
      case 'charge.succeeded':
        await handleChargeSucceeded(transaction);
        break;

      case 'charge.failed':
        await handleChargeFailed(transaction);
        break;

      case 'charge.cancelled':
        await handleChargeCancelled(transaction);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(transaction);
        break;

      case 'charge.chargeback.created':
        await handleChargebackCreated(transaction);
        break;

      default:
        console.log(`[WEBHOOK] ℹ️ Unhandled event type: ${payload.type}`);
    }

    // ============================================
    // STEP 5: Log Event to Database
    // ============================================

    await logWebhookEvent(payload, transaction);

    // ============================================
    // STEP 6: Respond to Openpay
    // ============================================

    res.status(200).json({
      message: 'Webhook processed successfully',
      event_type: payload.type,
      transaction_id: transaction.id,
    });
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error processing webhook:', error);

    // Still return 200 to prevent Openpay from retrying
    // (we've already logged the error)
    res.status(200).json({
      message: 'Webhook received but processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle successful charge
 * Update order status to PAID
 */
async function handleChargeSucceeded(transaction: OpenpayChargeResponse): Promise<void> {
  try {
    console.log('[WEBHOOK] 💰 Processing charge.succeeded:', transaction.id);

    const orderId = transaction.order_id || transaction.metadata?.internal_order_id;

    if (!orderId) {
      console.error('[WEBHOOK] ❌ No order_id found in transaction');
      return;
    }

    // Update order in database
    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_transaction_id: transaction.id,
        status: 'accepted', // Move order to accepted/preparing
        is_blocked: false, // Unblock if it was blocked
        payment_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', orderId)
      .select()
      .single();

    if (error) {
      console.error('[WEBHOOK] ❌ Error updating order:', error);
      throw error;
    }

    console.log('[WEBHOOK] ✅ Order updated successfully:', {
      orderId,
      transactionId: transaction.id,
      amount: transaction.amount,
      status: data?.status,
    });

    // Optional: Send notification to restaurant
    // await notifyRestaurant(data.restaurant_id, orderId);
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error in handleChargeSucceeded:', error);
    throw error;
  }
}

/**
 * Handle failed charge
 * Update order status to FAILED
 */
async function handleChargeFailed(transaction: OpenpayChargeResponse): Promise<void> {
  try {
    console.log('[WEBHOOK] ❌ Processing charge.failed:', transaction.id);

    const orderId = transaction.order_id || transaction.metadata?.internal_order_id;

    if (!orderId) {
      console.error('[WEBHOOK] ❌ No order_id found in transaction');
      return;
    }

    // Update order in database
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
      console.error('[WEBHOOK] ❌ Error updating order:', error);
      throw error;
    }

    console.log('[WEBHOOK] ✅ Order marked as failed:', {
      orderId,
      errorMessage: transaction.error_message,
    });
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error in handleChargeFailed:', error);
    throw error;
  }
}

/**
 * Handle cancelled charge
 */
async function handleChargeCancelled(transaction: OpenpayChargeResponse): Promise<void> {
  try {
    console.log('[WEBHOOK] 🚫 Processing charge.cancelled:', transaction.id);

    const orderId = transaction.order_id || transaction.metadata?.internal_order_id;

    if (!orderId) return;

    await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', orderId);

    console.log('[WEBHOOK] ✅ Order cancelled:', orderId);
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error in handleChargeCancelled:', error);
  }
}

/**
 * Handle refunded charge
 */
async function handleChargeRefunded(transaction: OpenpayChargeResponse): Promise<void> {
  try {
    console.log('[WEBHOOK] 🔄 Processing charge.refunded:', transaction.id);

    const orderId = transaction.order_id || transaction.metadata?.internal_order_id;

    if (!orderId) return;

    await supabase
      .from('orders')
      .update({
        payment_status: 'refunded',
        internal_notes: `Order refunded. Transaction: ${transaction.id}`,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', orderId);

    console.log('[WEBHOOK] ✅ Order refunded:', orderId);
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error in handleChargeRefunded:', error);
  }
}

/**
 * Handle chargeback created
 */
async function handleChargebackCreated(transaction: OpenpayChargeResponse): Promise<void> {
  try {
    console.log('[WEBHOOK] ⚠️ Processing chargeback.created:', transaction.id);

    const orderId = transaction.order_id || transaction.metadata?.internal_order_id;

    if (!orderId) return;

    await supabase
      .from('orders')
      .update({
        payment_status: 'chargeback',
        internal_notes: `CHARGEBACK ALERT - Transaction: ${transaction.id}`,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', orderId);

    console.log('[WEBHOOK] 🚨 Chargeback recorded:', orderId);

    // TODO: Send urgent notification to admin
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error in handleChargebackCreated:', error);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique webhook ID for idempotency
 */
function generateWebhookId(payload: OpenpayWebhookPayload | OpenpayVerificationWebhook): string {
  const data = JSON.stringify(payload);
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Log webhook event to database for audit trail
 */
async function logWebhookEvent(
  payload: OpenpayWebhookPayload | OpenpayVerificationWebhook,
  transaction?: OpenpayChargeResponse
): Promise<void> {
  try {
    // Create a webhook_logs table in your database to store these
    // For now, just log to console
    console.log('[WEBHOOK] 📝 Event logged:', {
      type: payload.type,
      transactionId: transaction?.id,
      timestamp: new Date().toISOString(),
    });

    // Example insert (uncomment when table exists):
    /*
    await supabase.from('webhook_logs').insert({
      event_type: payload.type,
      transaction_id: transaction?.id,
      payload: payload,
      processed_at: new Date().toISOString(),
    });
    */
  } catch (error) {
    console.error('[WEBHOOK] ❌ Error logging event:', error);
    // Don't throw - logging failure shouldn't stop webhook processing
  }
}

/**
 * Validate webhook authenticity (optional - Openpay doesn't provide signatures)
 * You can implement IP whitelisting instead
 */
export function validateWebhookSource(req: Request): boolean {
  const allowedIPs = [
    '54.88.216.221',
    '52.4.89.166',
    '34.206.69.149',
    // Add more Openpay IPs as needed
  ];

  const clientIP = req.ip || req.connection.remoteAddress || '';

  // In development/sandbox, allow all
  if (process.env.OPENPAY_ENVIRONMENT === 'sandbox') {
    return true;
  }

  return allowedIPs.some((ip) => clientIP.includes(ip));
}
