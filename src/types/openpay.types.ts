/**
 * Openpay TypeScript Type Definitions
 * API Reference: https://www.openpay.mx/docs/api/
 */

// ============================================
// CONFIGURATION
// ============================================

export interface OpenpayConfig {
  merchantId: string;
  privateKey: string;
  publicKey: string;
  environment: 'sandbox' | 'production';
}

// ============================================
// CUSTOMER (Restaurant in our case)
// ============================================

export interface OpenpayBankAccount {
  clabe: string;
  holder_name: string;
  bank_name: string;
  bank_code?: string;
}

export interface OpenpayAddress {
  line1: string;
  line2?: string;
  line3?: string;
  postal_code: string;
  state: string;
  city: string;
  country_code: string; // 'MX'
}

export interface OpenpayCustomerRequest {
  name: string;
  email: string;
  phone_number?: string;
  external_id?: string;
  requires_account?: boolean;
  status?: 'active' | 'deleted';
  balance?: number;
  address?: OpenpayAddress;
  // For business accounts (restaurants)
  customer_type?: 'business' | 'person';
  bank_account?: OpenpayBankAccount;
  rfc?: string; // Tax ID for Mexican businesses
  business_name?: string;
}

export interface OpenpayCustomerResponse extends OpenpayCustomerRequest {
  id: string;
  creation_date: string;
  clabe?: string;
}

// ============================================
// CHARGES
// ============================================

export interface OpenpayChargeRequest {
  method: 'card' | 'bank_account' | 'store' | 'bitcoin';
  source_id?: string; // Token ID from card tokenization
  amount: number;
  description: string;
  order_id?: string;
  currency?: 'MXN' | 'USD';
  capture?: boolean;
  use_3d_secure?: boolean;
  redirect_url?: string;
  device_session_id?: string;
  customer?: {
    name: string;
    email: string;
    phone_number?: string;
    address?: OpenpayAddress;
  };
  // Metadata for tracking
  metadata?: Record<string, any>;
  // For bank transfers / CoDi
  iva?: number;
  due_date?: string; // ISO 8601 format
}

export interface OpenpayChargeResponse {
  id: string;
  authorization?: string;
  transaction_type: 'charge' | 'payout' | 'fee';
  operation_type: 'in' | 'out';
  method: 'card' | 'bank_account' | 'store' | 'bitcoin';
  creation_date: string;
  order_id?: string;
  status: 'completed' | 'in_progress' | 'failed' | 'cancelled' | 'charge_pending';
  amount: number;
  description: string;
  error_message?: string;
  customer_id: string;
  currency: string;
  payment_method?: {
    type: string;
    reference?: string;
    barcode_url?: string;
    clabe?: string;
  };
  card?: {
    type: string;
    brand: string;
    card_number: string;
    holder_name: string;
    expiration_year: string;
    expiration_month: string;
    bank_name: string;
    bank_code: string;
  };
  metadata?: Record<string, any>;
}

// ============================================
// WEBHOOKS
// ============================================

export type OpenpayWebhookEventType =
  | 'verification'
  | 'charge.succeeded'
  | 'charge.created'
  | 'charge.cancelled'
  | 'charge.failed'
  | 'charge.refunded'
  | 'charge.chargeback.created'
  | 'charge.chargeback.rejected'
  | 'charge.chargeback.accepted'
  | 'payout.created'
  | 'payout.succeeded'
  | 'payout.failed'
  | 'transfer.succeeded'
  | 'fee.succeeded'
  | 'fee.refund.succeeded'
  | 'spei.received'
  | 'subscription.charge.failed';

export interface OpenpayWebhookPayload {
  type: OpenpayWebhookEventType;
  event_date: string;
  transaction: OpenpayChargeResponse | OpenpayPayoutResponse | any;
}

export interface OpenpayVerificationWebhook {
  type: 'verification';
  verification_code?: string;
}

// ============================================
// PAYOUTS (Optional - for future use)
// ============================================

export interface OpenpayPayoutRequest {
  method: 'bank_account' | 'card';
  destination_id: string;
  amount: number;
  description: string;
  order_id?: string;
}

export interface OpenpayPayoutResponse {
  id: string;
  amount: number;
  authorization?: string;
  method: 'bank_account' | 'card';
  operation_type: 'out';
  transaction_type: 'payout';
  status: 'completed' | 'in_progress' | 'failed';
  currency: string;
  creation_date: string;
  description: string;
  error_message?: string;
  order_id?: string;
  customer_id?: string;
}

// ============================================
// ERRORS
// ============================================

export interface OpenpayError {
  category: string;
  description: string;
  http_code: number;
  error_code: number;
  request_id: string;
  fraud_rules?: string[];
}

// ============================================
// SDK INSTANCE TYPES
// ============================================

export interface OpenpaySDK {
  customers: {
    create: (data: OpenpayCustomerRequest) => Promise<OpenpayCustomerResponse>;
    get: (customerId: string) => Promise<OpenpayCustomerResponse>;
    update: (customerId: string, data: Partial<OpenpayCustomerRequest>) => Promise<OpenpayCustomerResponse>;
    delete: (customerId: string) => Promise<void>;
    list: (params?: any) => Promise<OpenpayCustomerResponse[]>;
    charges: {
      create: (customerId: string, data: OpenpayChargeRequest) => Promise<OpenpayChargeResponse>;
      get: (customerId: string, chargeId: string) => Promise<OpenpayChargeResponse>;
      list: (customerId: string, params?: any) => Promise<OpenpayChargeResponse[]>;
      capture: (customerId: string, chargeId: string, data?: any) => Promise<OpenpayChargeResponse>;
      refund: (customerId: string, chargeId: string, data?: any) => Promise<OpenpayChargeResponse>;
    };
  };
  charges: {
    create: (data: OpenpayChargeRequest) => Promise<OpenpayChargeResponse>;
    get: (chargeId: string) => Promise<OpenpayChargeResponse>;
    list: (params?: any) => Promise<OpenpayChargeResponse[]>;
    capture: (chargeId: string, data?: any) => Promise<OpenpayChargeResponse>;
    refund: (chargeId: string, data?: any) => Promise<OpenpayChargeResponse>;
  };
  payouts: {
    create: (customerId: string, data: OpenpayPayoutRequest) => Promise<OpenpayPayoutResponse>;
    get: (customerId: string, payoutId: string) => Promise<OpenpayPayoutResponse>;
  };
}

// ============================================
// SERVICE RESPONSE TYPES
// ============================================

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface RegisterRestaurantRequest {
  restaurantId: string; // Our internal restaurant ID
  businessName: string;
  rfc: string;
  email: string;
  phone: string;
  address: OpenpayAddress;
  bankAccount: OpenpayBankAccount;
}

export interface ProcessPaymentRequest {
  restaurantOpenpayId: string;
  orderId: string;
  amount: number;
  description: string;
  cardToken: string;
  deviceSessionId?: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
}
