/**
 * Openpay Frontend Service
 *
 * Maneja la tokenización de tarjetas y la comunicación con las Edge Functions de Openpay.
 */

import { supabase } from '../config/supabase';

// Declarar el objeto global de Openpay
declare global {
  interface Window {
    OpenPay: {
      setId: (merchantId: string) => void;
      setApiKey: (publicKey: string) => void;
      setSandboxMode: (sandbox: boolean) => void;
      deviceData: {
        setup: () => string;
      };
      token: {
        create: (
          cardData: CardData,
          success: (response: { data: { id: string } }) => void,
          error: (error: any) => void
        ) => void;
      };
    };
  }
}

export interface CardData {
  card_number: string;
  holder_name: string;
  expiration_year: string;
  expiration_month: string;
  cvv2: string;
}

export interface OpenpayConfig {
  merchantId: string;
  publicKey: string;
  sandboxMode: boolean;
}

// Configuración de Openpay desde variables de entorno
const OPENPAY_CONFIG: OpenpayConfig = {
  merchantId: import.meta.env.VITE_OPENPAY_MERCHANT_ID || '',
  publicKey: import.meta.env.VITE_OPENPAY_PUBLIC_KEY || '',
  sandboxMode: import.meta.env.VITE_OPENPAY_ENVIRONMENT !== 'production',
};

// Feature flag: Openpay está deshabilitado hasta tener credenciales de producción
const OPENPAY_ENABLED = false;

/**
 * Esperar a que Openpay SDK esté disponible
 */
function waitForOpenpay(timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[OPENPAY] Checking if SDK is loaded...', {
      hasOpenPay: !!window.OpenPay,
      windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('open')),
    });

    if (window.OpenPay) {
      console.log('[OPENPAY] SDK already loaded!');
      resolve();
      return;
    }

    console.log('[OPENPAY] SDK not loaded yet, waiting...');
    const startTime = Date.now();
    let attempts = 0;

    const interval = setInterval(() => {
      attempts++;

      if (window.OpenPay) {
        clearInterval(interval);
        console.log(`[OPENPAY] SDK loaded after ${attempts} attempts (${Date.now() - startTime}ms)`);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        console.error('[OPENPAY] SDK failed to load after', attempts, 'attempts');
        reject(new Error('Openpay SDK failed to load. Please check your internet connection and reload the page.'));
      }
    }, 100);
  });
}

/**
 * Inicializar Openpay SDK
 */
export async function initOpenpay(): Promise<string> {
  if (!OPENPAY_ENABLED) {
    throw new Error('Los pagos en línea están temporalmente deshabilitados. Estamos trabajando para habilitarlos pronto.');
  }

  // Esperar a que el SDK esté cargado
  await waitForOpenpay();

  if (!window.OpenPay) {
    throw new Error('Openpay SDK not loaded. Include the script in your HTML.');
  }

  window.OpenPay.setId(OPENPAY_CONFIG.merchantId);
  window.OpenPay.setApiKey(OPENPAY_CONFIG.publicKey);
  window.OpenPay.setSandboxMode(OPENPAY_CONFIG.sandboxMode);

  // Obtener Device Session ID
  const deviceSessionId = window.OpenPay.deviceData.setup();

  console.log('[OPENPAY] SDK initialized', {
    merchantId: OPENPAY_CONFIG.merchantId,
    sandboxMode: OPENPAY_CONFIG.sandboxMode,
    deviceSessionId,
  });

  return deviceSessionId;
}

/**
 * Tokenizar una tarjeta
 */
export async function tokenizeCard(cardData: CardData): Promise<string> {
  if (!OPENPAY_ENABLED) {
    throw new Error('Los pagos en línea están temporalmente deshabilitados. Estamos trabajando para habilitarlos pronto.');
  }

  return new Promise((resolve, reject) => {
    if (!window.OpenPay) {
      reject(new Error('Openpay SDK not loaded'));
      return;
    }

    console.log('[OPENPAY] Tokenizing card...');

    window.OpenPay.token.create(
      cardData,
      (response) => {
        const token = response.data.id;
        console.log('[OPENPAY] Card tokenized successfully:', token);
        resolve(token);
      },
      (error) => {
        console.error('[OPENPAY] Tokenization error:', error);
        reject(new Error(error.message || error.description || 'Error al tokenizar la tarjeta'));
      }
    );
  });
}

/**
 * Procesar pago con tarjeta
 */
export async function processCardPayment(
  orderId: string,
  cardToken: string,
  deviceSessionId: string,
  amount: number,
  description: string
) {
  if (!OPENPAY_ENABLED) {
    throw new Error('Los pagos en línea están temporalmente deshabilitados. Estamos trabajando para habilitarlos pronto.');
  }

  try {
    console.log('[OPENPAY] Processing card payment...');

    const { data, error } = await supabase.functions.invoke('openpay-charge', {
      body: {
        orderId,
        cardToken,
        deviceSessionId,
        amount,
        description,
      },
    });

    if (error) {
      console.error('[OPENPAY] Payment error:', error);

      // Try to get more details from the response
      if (error.context) {
        const errorData = error.context;
        throw new Error(errorData.error || error.message || 'Error al procesar el pago');
      }

      throw new Error(error.message || 'Error al procesar el pago');
    }

    // Check if data contains an error field
    if (data && data.error) {
      throw new Error(data.error);
    }

    if (data && !data.success) {
      throw new Error(data.error || 'Error al procesar el pago');
    }

    console.log('[OPENPAY] Payment successful:', data);
    return data;
  } catch (error) {
    console.error('[OPENPAY] Error processing payment:', error);
    throw error;
  }
}

/**
 * Registrar restaurante en Openpay
 */
export async function registerRestaurant(restaurantData: {
  restaurantId: string;
  businessName: string;
  rfc: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    postal_code: string;
    state: string;
    city: string;
    country_code: string;
  };
  bankAccount: {
    clabe: string;
    holder_name: string;
    bank_name: string;
  };
}) {
  try {
    console.log('[OPENPAY] Registering restaurant...');

    const { data, error } = await supabase.functions.invoke('openpay-register-restaurant', {
      body: restaurantData,
    });

    if (error) {
      console.error('[OPENPAY] Registration error:', error);
      throw new Error(error.message || 'Error al registrar el restaurante');
    }

    if (!data.success) {
      throw new Error(data.error || 'Error al registrar el restaurante');
    }

    console.log('[OPENPAY] Restaurant registered successfully:', data);
    return data;
  } catch (error) {
    console.error('[OPENPAY] Error registering restaurant:', error);
    throw error;
  }
}

/**
 * Generar pago con CoDi (QR)
 */
export async function createCodiPayment(
  orderId: string,
  amount: number,
  description: string,
  dueDate?: string
) {
  try {
    console.log('[OPENPAY] Creating CoDi payment...');

    const { data, error } = await supabase.functions.invoke('openpay-codi', {
      body: {
        orderId,
        amount,
        description,
        dueDate,
      },
    });

    if (error) {
      console.error('[OPENPAY] CoDi error:', error);
      throw new Error(error.message || 'Error al generar código CoDi');
    }

    if (!data.success) {
      throw new Error(data.error || 'Error al generar código CoDi');
    }

    console.log('[OPENPAY] CoDi payment created:', data);
    return data;
  } catch (error) {
    console.error('[OPENPAY] Error creating CoDi payment:', error);
    throw error;
  }
}

/**
 * Crear cargo con transferencia bancaria (SPEI)
 */
export async function createBankTransferPayment(
  orderId: string,
  amount: number,
  description: string,
  customerName: string,
  customerEmail: string,
  dueDate?: string
) {
  if (!OPENPAY_ENABLED) {
    throw new Error('Los pagos en línea están temporalmente deshabilitados. Estamos trabajando para habilitarlos pronto.');
  }

  try {
    console.log('[OPENPAY] Creating bank transfer payment...');

    const { data, error } = await supabase.functions.invoke('openpay-bank-transfer', {
      body: {
        orderId,
        amount,
        description,
        customerName,
        customerEmail,
        dueDate,
      },
    });

    if (error) {
      console.error('[OPENPAY] Bank transfer error:', error);

      // Try to get more details from the response
      if (error.context) {
        const errorData = error.context;
        throw new Error(errorData.error || error.message || 'Error al generar la transferencia bancaria');
      }

      throw new Error(error.message || 'Error al generar la transferencia bancaria');
    }

    // Check if data contains an error field
    if (data && data.error) {
      throw new Error(data.error);
    }

    if (data && !data.success) {
      throw new Error(data.error || 'Error al generar la transferencia bancaria');
    }

    console.log('[OPENPAY] Bank transfer payment created:', data);
    return data;
  } catch (error) {
    console.error('[OPENPAY] Error creating bank transfer payment:', error);
    throw error;
  }
}

/**
 * Validar número de tarjeta (algoritmo de Luhn)
 */
export function validateCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\s/g, '');

  if (!/^\d+$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let double = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);

    if (double) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

/**
 * Formatear número de tarjeta (agregar espacios cada 4 dígitos)
 */
export function formatCardNumber(cardNumber: string): string {
  return cardNumber.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
}

/**
 * Obtener tipo de tarjeta
 */
export function getCardType(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');

  if (/^4/.test(cleaned)) return 'Visa';
  if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
  if (/^3[47]/.test(cleaned)) return 'American Express';

  return 'Unknown';
}
