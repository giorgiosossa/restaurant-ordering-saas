/**
 * Openpay Service for Supabase Edge Functions
 *
 * Módulo compartido para manejar operaciones de Openpay desde Edge Functions.
 * Usa Deno en lugar de Node.js.
 */

// ============================================
// TYPES
// ============================================

export interface OpenpayConfig {
  merchantId: string;
  privateKey: string;
  environment: 'sandbox' | 'production';
}

export interface OpenpayCustomerRequest {
  name: string;
  email: string;
  phone_number?: string;
  external_id?: string;
  requires_account?: boolean;
  customer_type?: 'business' | 'person';
  bank_account?: {
    clabe: string;
    holder_name: string;
    bank_name: string;
    bank_code?: string;
  };
  rfc?: string;
  business_name?: string;
  address?: {
    line1: string;
    line2?: string;
    postal_code: string;
    state: string;
    city: string;
    country_code: string;
  };
}

export interface OpenpayChargeRequest {
  method: 'card' | 'bank_account';
  source_id?: string;
  amount: number;
  description: string;
  order_id?: string;
  currency?: 'MXN';
  capture?: boolean;
  device_session_id?: string;
  customer?: {
    name: string;
    email: string;
    phone_number?: string;
  };
  metadata?: Record<string, any>;
  due_date?: string;
}

// ============================================
// OPENPAY SERVICE (DENO COMPATIBLE)
// ============================================

export class OpenpayService {
  private config: OpenpayConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: OpenpayConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.openpay.mx/v1'
      : 'https://sandbox-api.openpay.mx/v1';

    // Basic Auth: privateKey as username, empty password (per Openpay docs)
    // "La llave de API es el nombre de usuario. La contraseña no es requerida y debe dejarse en blanco"
    const credentials = `${config.privateKey}:`;
    this.authHeader = `Basic ${btoa(credentials)}`;
  }

  /**
   * Make HTTP request to Openpay API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}/${this.config.merchantId}${endpoint}`;

    console.log(`[OPENPAY] ${method} ${endpoint}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OPENPAY] Error:', data);
      throw new Error(data.description || 'Openpay API error');
    }

    return data as T;
  }

  /**
   * Create a customer (restaurant)
   */
  async createCustomer(data: OpenpayCustomerRequest) {
    return this.request('POST', '/customers', data);
  }

  /**
   * Get customer details
   */
  async getCustomer(customerId: string) {
    return this.request('GET', `/customers/${customerId}`);
  }

  /**
   * Create a charge for a customer
   */
  async createCharge(customerId: string, data: OpenpayChargeRequest) {
    return this.request('POST', `/customers/${customerId}/charges`, data);
  }

  /**
   * Get charge details
   */
  async getCharge(customerId: string, chargeId: string) {
    return this.request('GET', `/customers/${customerId}/charges/${chargeId}`);
  }

  /**
   * Refund a charge
   */
  async refundCharge(
    customerId: string,
    chargeId: string,
    description: string,
    amount?: number
  ) {
    const refundData: any = { description };
    if (amount) refundData.amount = amount;

    return this.request(
      'POST',
      `/customers/${customerId}/charges/${chargeId}/refund`,
      refundData
    );
  }
}

/**
 * Initialize Openpay service from environment variables
 */
export function initOpenpay(): OpenpayService {
  const merchantId = Deno.env.get('OPENPAY_MERCHANT_ID');
  const privateKey = Deno.env.get('OPENPAY_PRIVATE_KEY');
  const isSandbox = Deno.env.get('OPENPAY_SANDBOX') === 'true';
  const environment = isSandbox ? 'sandbox' : 'production';

  if (!merchantId || !privateKey) {
    throw new Error('Missing Openpay credentials in environment');
  }

  console.log('[OPENPAY] Initializing with:', {
    merchantId,
    environment,
    hasPrivateKey: !!privateKey
  });

  return new OpenpayService({
    merchantId,
    privateKey,
    environment,
  });
}
