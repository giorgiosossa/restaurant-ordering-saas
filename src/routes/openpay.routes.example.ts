/**
 * Openpay Routes Example
 *
 * Ejemplo de cómo configurar las rutas de Express para Openpay.
 * Copia este archivo como base para tu implementación.
 */

import { Router, Request, Response } from 'express';
import { openpayService } from '../services/openpayService';
import { handleOpenpayWebhook } from '../controllers/openpayWebhookController';
import type {
  RegisterRestaurantRequest,
  ProcessPaymentRequest,
} from '../types/openpay.types';

const router = Router();

// ============================================
// RESTAURANT REGISTRATION
// ============================================

/**
 * POST /api/restaurants/:restaurantId/openpay/register
 * Register a restaurant in Openpay
 */
router.post('/restaurants/:restaurantId/openpay/register', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const requestData: RegisterRestaurantRequest = {
      restaurantId,
      businessName: req.body.businessName,
      rfc: req.body.rfc,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      bankAccount: req.body.bankAccount,
    };

    const result = await openpayService.registerRestaurant(requestData);

    if (result.success && result.data) {
      // TODO: Save openpay_customer_id to your database
      // await saveOpenpayCustomerId(restaurantId, result.data.id);

      res.status(201).json({
        success: true,
        message: 'Restaurant registered successfully in Openpay',
        data: {
          openpayCustomerId: result.data.id,
          clabe: result.data.clabe,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[API] Error registering restaurant:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// ============================================
// PAYMENT PROCESSING
// ============================================

/**
 * POST /api/orders/:orderId/pay
 * Process a payment for an order
 */
router.post('/orders/:orderId/pay', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { cardToken, deviceSessionId } = req.body;

    // TODO: Get order and restaurant from your database
    // const order = await getOrder(orderId);
    // const restaurant = await getRestaurant(order.restaurant_id);

    // Example request (replace with actual data)
    const paymentRequest: ProcessPaymentRequest = {
      restaurantOpenpayId: 'customer_id_from_db', // restaurant.openpay_customer_id
      orderId: orderId,
      amount: 250.0, // order.total
      description: `Orden #${orderId}`,
      cardToken: cardToken,
      deviceSessionId: deviceSessionId,
      customerInfo: {
        name: 'Cliente',
        email: 'cliente@example.com',
      },
    };

    const result = await openpayService.processCardPayment(paymentRequest);

    if (result.success && result.data) {
      // TODO: Update order status in database
      // await updateOrderPaymentStatus(orderId, 'paid', result.data.id);

      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          transactionId: result.data.id,
          authorization: result.data.authorization,
          status: result.data.status,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[API] Error processing payment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_ERROR',
        message: error instanceof Error ? error.message : 'Payment failed',
      },
    });
  }
});

/**
 * POST /api/orders/:orderId/codi
 * Create a CoDi payment (QR code)
 */
router.post('/orders/:orderId/codi', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    // TODO: Get order and restaurant from database
    const restaurantOpenpayId = 'customer_id_from_db';
    const amount = 250.0;
    const description = `Orden #${orderId}`;

    const result = await openpayService.createCodiPayment(
      restaurantOpenpayId,
      orderId,
      amount,
      description
    );

    if (result.success && result.data) {
      res.status(200).json({
        success: true,
        message: 'CoDi payment created',
        data: {
          qrCodeUrl: result.data.payment_method?.barcode_url,
          reference: result.data.payment_method?.reference,
          clabe: result.data.payment_method?.clabe,
          expiresAt: result.data.due_date,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[API] Error creating CoDi payment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CODI_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create CoDi payment',
      },
    });
  }
});

/**
 * POST /api/charges/:chargeId/refund
 * Refund a charge
 */
router.post('/charges/:chargeId/refund', async (req: Request, res: Response) => {
  try {
    const { chargeId } = req.params;
    const { description, amount } = req.body;

    // TODO: Get restaurant from charge/order
    const restaurantOpenpayId = 'customer_id_from_db';

    const result = await openpayService.refundCharge(
      restaurantOpenpayId,
      chargeId,
      description,
      amount
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[API] Error processing refund:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REFUND_ERROR',
        message: error instanceof Error ? error.message : 'Refund failed',
      },
    });
  }
});

// ============================================
// CONFIGURATION ENDPOINTS
// ============================================

/**
 * GET /api/openpay/config
 * Get public Openpay configuration for frontend
 */
router.get('/openpay/config', (req: Request, res: Response) => {
  res.json({
    merchantId: openpayService.getMerchantId(),
    publicKey: openpayService.getPublicKey(),
    environment: openpayService.getEnvironment(),
    sandboxMode: openpayService.getEnvironment() === 'sandbox',
  });
});

// ============================================
// WEBHOOKS
// ============================================

/**
 * POST /webhooks/openpay
 * Handle Openpay webhooks
 */
router.post('/webhooks/openpay', handleOpenpayWebhook);

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/openpay/health
 * Check if Openpay service is ready
 */
router.get('/openpay/health', (req: Request, res: Response) => {
  const isReady = openpayService.isReady();

  res.status(isReady ? 200 : 503).json({
    service: 'openpay',
    status: isReady ? 'ready' : 'not_initialized',
    environment: openpayService.getEnvironment(),
  });
});

export default router;
