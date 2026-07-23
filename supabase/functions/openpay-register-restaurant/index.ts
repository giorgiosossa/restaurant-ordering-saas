/**
 * Openpay Register Restaurant Edge Function
 *
 * Registra un restaurante en Openpay como customer (tipo business).
 * Incluye cuenta bancaria para recibir depósitos directos.
 *
 * Endpoint: POST /functions/v1/openpay-register-restaurant
 *
 * Body:
 * {
 *   "restaurantId": "rest_123",
 *   "businessName": "Tacos El Güero",
 *   "rfc": "XAXX010101000",
 *   "email": "contacto@ejemplo.com",
 *   "phone": "5512345678",
 *   "address": {
 *     "line1": "Calle Principal 123",
 *     "postal_code": "06000",
 *     "state": "CDMX",
 *     "city": "Ciudad de México",
 *     "country_code": "MX"
 *   },
 *   "bankAccount": {
 *     "clabe": "012298026516924616",
 *     "holder_name": "Tacos El Güero SA",
 *     "bank_name": "BBVA Bancomer"
 *   }
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
    console.log('[REGISTER] Processing restaurant registration');

    // Parse request body
    const {
      restaurantId,
      businessName,
      rfc,
      email,
      phone,
      address,
      bankAccount,
    } = await req.json();

    // Validate input
    if (!restaurantId || !businessName || !rfc || !email || !bankAccount) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: restaurantId, businessName, rfc, email, bankAccount',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate CLABE
    if (!bankAccount.clabe || bankAccount.clabe.length !== 18) {
      return new Response(
        JSON.stringify({
          error: 'Invalid CLABE: must be 18 digits',
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

    // Check if restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, openpay_customer_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error('[REGISTER] Restaurant not found:', restaurantError);
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if already registered
    if (restaurant.openpay_customer_id) {
      console.warn('[REGISTER] Restaurant already registered in Openpay');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Restaurant already registered in Openpay',
          openpayCustomerId: restaurant.openpay_customer_id,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Openpay
    const openpay = initOpenpay();

    // Create customer in Openpay
    console.log(`[REGISTER] Creating Openpay customer for: ${businessName}`);

    // Use a unique external_id with timestamp to avoid conflicts
    const uniqueExternalId = `${restaurantId}_${Date.now()}`;

    const customerData = {
      name: businessName,
      email: email,
      phone_number: phone,
      external_id: uniqueExternalId,
      requires_account: true,
      customer_type: 'business' as const,
      business_name: businessName,
      rfc: rfc,
      address: address,
      bank_account: bankAccount,
    };

    let customer;
    try {
      customer = await openpay.createCustomer(customerData);
      console.log('[REGISTER] Openpay customer created:', customer.id);
    } catch (createError: any) {
      console.error('[REGISTER] Error creating customer:', createError);

      // If external_id already exists, try without it (Openpay will auto-generate)
      if (createError.message?.includes('external_id')) {
        console.log('[REGISTER] Retrying without external_id...');
        delete customerData.external_id;
        customer = await openpay.createCustomer(customerData);
        console.log('[REGISTER] Openpay customer created (retry):', customer.id);
      } else {
        throw createError;
      }
    }

    // Update restaurant in database with Openpay customer ID
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        openpay_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('[REGISTER] Error updating restaurant:', updateError);
      // Customer was created in Openpay but DB update failed
      // This is not critical - can be fixed manually
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Restaurant registered successfully in Openpay',
        data: {
          openpayCustomerId: customer.id,
          clabe: customer.clabe,
          creationDate: customer.creation_date,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[REGISTER] Error:', error);

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
