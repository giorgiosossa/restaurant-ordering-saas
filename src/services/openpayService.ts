/**
 * Openpay Service
 *
 * Servicio singleton para manejar todas las operaciones de Openpay.
 * Permite que cada restaurante reciba pagos directamente en su cuenta bancaria.
 *
 * IMPORTANTE: Este servicio NO cobra fees/comisiones. Todo el dinero va directo
 * al restaurante asociado.
 */

import type {
  OpenpaySDK,
  OpenpayConfig,
  OpenpayCustomerRequest,
  OpenpayCustomerResponse,
  OpenpayChargeRequest,
  OpenpayChargeResponse,
  ServiceResponse,
  RegisterRestaurantRequest,
  ProcessPaymentRequest,
  OpenpayError,
} from '../types/openpay.types';

// ============================================
// SINGLETON INSTANCE
// ============================================

class OpenpayService {
  private static instance: OpenpayService;
  private openpay: OpenpaySDK | null = null;
  private isInitialized = false;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): OpenpayService {
    if (!OpenpayService.instance) {
      OpenpayService.instance = new OpenpayService();
    }
    return OpenpayService.instance;
  }

  /**
   * Initialize Openpay SDK
   * Must be called before using any other methods
   */
  public init(config?: OpenpayConfig): void {
    if (this.isInitialized) {
      console.warn('[OPENPAY] Service already initialized');
      return;
    }

    try {
      // Load configuration from environment or passed config
      const merchantId = config?.merchantId || process.env.OPENPAY_MERCHANT_ID;
      const privateKey = config?.privateKey || process.env.OPENPAY_PRIVATE_KEY;
      const environment = config?.environment || (process.env.OPENPAY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';

      if (!merchantId || !privateKey) {
        throw new Error('Openpay credentials not found. Set OPENPAY_MERCHANT_ID and OPENPAY_PRIVATE_KEY');
      }

      // Import and initialize Openpay SDK
      const Openpay = require('openpay');
      const isProduction = environment === 'production';

      this.openpay = new Openpay(merchantId, privateKey, isProduction) as OpenpaySDK;
      this.isInitialized = true;

      console.log(`[OPENPAY] ✅ Service initialized successfully (${environment.toUpperCase()} mode)`);
    } catch (error) {
      console.error('[OPENPAY] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure SDK is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.openpay) {
      throw new Error('Openpay service not initialized. Call init() first.');
    }
  }

  /**
   * Handle Openpay errors consistently
   */
  private handleError(error: any, context: string): ServiceResponse<never> {
    console.error(`[OPENPAY] ❌ Error in ${context}:`, error);

    const openpayError = error as OpenpayError;

    return {
      success: false,
      error: {
        code: openpayError.error_code?.toString() || 'OPENPAY_ERROR',
        message: openpayError.description || error.message || 'Unknown error',
        details: {
          category: openpayError.category,
          httpCode: openpayError.http_code,
          requestId: openpayError.request_id,
          fraudRules: openpayError.fraud_rules,
        },
      },
    };
  }

  // ============================================
  // RESTAURANT ONBOARDING
  // ============================================

  /**
   * Register a new restaurant in Openpay
   * Creates a customer account with bank account details for direct deposits
   *
   * @param request - Restaurant registration data
   * @returns Service response with Openpay customer ID
   */
  public async registerRestaurant(
    request: RegisterRestaurantRequest
  ): Promise<ServiceResponse<OpenpayCustomerResponse>> {
    this.ensureInitialized();

    try {
      console.log(`[OPENPAY] 📝 Registering restaurant: ${request.businessName}`);

      const customerData: OpenpayCustomerRequest = {
        name: request.businessName,
        email: request.email,
        phone_number: request.phone,
        external_id: request.restaurantId, // Link to our internal DB
        requires_account: true,
        customer_type: 'business',
        business_name: request.businessName,
        rfc: request.rfc,
        address: request.address,
        // CRITICAL: Bank account for direct deposits
        bank_account: request.bankAccount,
      };

      const customer = await this.openpay!.customers.create(customerData);

      console.log(`[OPENPAY] ✅ Restaurant registered successfully. Customer ID: ${customer.id}`);

      return {
        success: true,
        data: customer,
      };
    } catch (error) {
      return this.handleError(error, 'registerRestaurant');
    }
  }

  /**
   * Get restaurant customer details from Openpay
   *
   * @param customerId - Openpay customer ID
   * @returns Customer details
   */
  public async getRestaurant(customerId: string): Promise<ServiceResponse<OpenpayCustomerResponse>> {
    this.ensureInitialized();

    try {
      console.log(`[OPENPAY] 🔍 Fetching restaurant: ${customerId}`);

      const customer = await this.openpay!.customers.get(customerId);

      return {
        success: true,
        data: customer,
      };
    } catch (error) {
      return this.handleError(error, 'getRestaurant');
    }
  }

  /**
   * Update restaurant information
   *
   * @param customerId - Openpay customer ID
   * @param updates - Fields to update
   * @returns Updated customer details
   */
  public async updateRestaurant(
    customerId: string,
    updates: Partial<OpenpayCustomerRequest>
  ): Promise<ServiceResponse<OpenpayCustomerResponse>> {
    this.ensureInitialized();

    try {
      console.log(`[OPENPAY] ✏️ Updating restaurant: ${customerId}`);

      const customer = await this.openpay!.customers.update(customerId, updates);

      console.log(`[OPENPAY] ✅ Restaurant updated successfully`);

      return {
        success: true,
        data: customer,
      };
    } catch (error) {
      return this.handleError(error, 'updateRestaurant');
    }
  }

  // ============================================
  // PAYMENT PROCESSING
  // ============================================

  /**
   * Process a payment with card token
   * Money goes directly to the restaurant's bank account (NO FEES)
   *
   * @param request - Payment details
   * @returns Charge response
   */
  public async processCardPayment(
    request: ProcessPaymentRequest
  ): Promise<ServiceResponse<OpenpayChargeResponse>> {
    this.ensureInitialized();

    try {
      console.log(`[OPENPAY] 💳 Processing card payment for order: ${request.orderId}`);

      const chargeData: OpenpayChargeRequest = {
        method: 'card',
        source_id: request.cardToken, // Token from frontend tokenization
        amount: request.amount,
        description: request.description,
        order_id: request.orderId,
        currency: 'MXN',
        capture: true, // Auto-capture (charge immediately)
        device_session_id: request.deviceSessionId,
        customer: {
          name: request.customerInfo.name,
          email: request.customerInfo.email,
          phone_number: request.customerInfo.phone,
        },
        metadata: {
          internal_order_id: request.orderId,
          platform: 'restaurant-pos-saas',
        },
      };

      // Create charge associated with the restaurant's Openpay account
      const charge = await this.openpay!.customers.charges.create(
        request.restaurantOpenpayId,
        chargeData
      );

      console.log(`[OPENPAY] ✅ Payment processed successfully. Charge ID: ${charge.id}`);
      console.log(`[OPENPAY] Status: ${charge.status}`);

      return {
        success: true,
        data: charge,
      };
    } catch (error) {
      return this.handleError(error, 'processCardPayment');
    }
  }

  /**
   * Create a CoDi (QR code) payment request
   * Customer scans QR and pays via their banking app
   *
   * @param restaurantOpenpayId - Restaurant's Openpay customer ID
   * @param orderId - Internal order ID
   * @param amount - Amount to charge
   * @param description - Payment description
   * @param dueDate - Optional expiration date (ISO 8601)
   * @returns Charge response with QR code
   */
  public async createCodiPayment(
    restaurantOpenpayId: string,
    orderId: string,
    amount: number,
    description: string,
    dueDate?: string
  ): Promise<ServiceResponse<OpenpayChargeResponse>> {
    this.ensureInitialized();

    try {
      console.log(`[OPENPAY] 📱 Creating CoDi payment for order: ${orderId}`);

      const chargeData: OpenpayChargeRequest = {
        method: 'bank_account',
        amount: amount,
        description: description,
        order_id: orderId,
        currency: 'MXN',
        due_date: dueDate || this.getDefaultDueDate(), // 3 days from now by default
        metadata: {
          internal_order_id: orderId,
          payment_type: 'codi',
        },
      };

      const charge = await this.openpay!.customers.charges.create(
        restaurantOpenpayId,
        chargeData
      );

      console.log(`[OPENPAY] ✅ CoDi payment created. Reference: ${charge.payment_method?.reference}`);
      console.log(`[OPENPAY] QR URL: ${charge.payment_method?.barcode_url}`);

      return {
        success: true,
        data: charge,
      };
    } catch (error) {
      return this.handleError(error, 'createCodiPayment');
    }
  }

  /**
   * Get charge details
   *
   * @param restaurantOpenpayId - Restaurant's Openpay customer ID
   * @param chargeId - Openpay charge ID
   * @returns Charge details
   */
  public async getCharge(
    restaurantOpenpayId: string,
    chargeId: string
  ): Promise<ServiceResponse<OpenpayChargeResponse>> {
    this.ensureInitialized();

    try {
      const charge = await this.openpay!.customers.charges.get(restaurantOpenpayId, chargeId);

      return {
        success: true,
        data: charge,
      };
    } catch (error) {
      return this.handleError(error, 'getCharge');
    }
  }

  /**
   * Refund a charge (partial or full)
   *
   * @param restaurantOpenpayId - Restaurant's Openpay customer ID
   * @param chargeId - Openpay charge ID
   * @param description - Refund reason
   * @param amount - Optional partial refund amount
   * @returns Refund response
   */
  public async refundCharge(
    restaurantOpenpayId: string,
    chargeId: string,
    description: string,
    amount?: number
  ): Promise<ServiceResponse<OpenpayChargeResponse>> {
    this.ensureInitialized();

    try {
      console.log(`[OPENPAY] 🔄 Refunding charge: ${chargeId}`);

      const refundData = {
        description,
        ...(amount && { amount }), // If amount specified, partial refund
      };

      const refund = await this.openpay!.customers.charges.refund(
        restaurantOpenpayId,
        chargeId,
        refundData
      );

      console.log(`[OPENPAY] ✅ Refund processed successfully`);

      return {
        success: true,
        data: refund,
      };
    } catch (error) {
      return this.handleError(error, 'refundCharge');
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get default due date (3 days from now)
   */
  private getDefaultDueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString();
  }

  /**
   * Validate card token format
   */
  public isValidToken(token: string): boolean {
    return token.startsWith('tok_') && token.length > 20;
  }

  /**
   * Get public key for frontend tokenization
   */
  public getPublicKey(): string {
    return process.env.OPENPAY_PUBLIC_KEY || '';
  }

  /**
   * Get merchant ID for frontend
   */
  public getMerchantId(): string {
    return process.env.OPENPAY_MERCHANT_ID || '';
  }

  /**
   * Get environment
   */
  public getEnvironment(): 'sandbox' | 'production' {
    return (process.env.OPENPAY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
  }

  /**
   * Check if service is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const openpayService = OpenpayService.getInstance();

// Export class for testing
export { OpenpayService };
