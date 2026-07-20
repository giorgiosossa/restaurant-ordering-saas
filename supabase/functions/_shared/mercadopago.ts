// Thin client around Mercado Pago's OAuth token endpoint, shared by the
// connect/callback/refresh Edge Functions.

export interface MercadoPagoTokenResponse {
  access_token: string;
  refresh_token: string;
  public_key?: string;
  user_id: number | string;
  expires_in: number;
}

const TOKEN_URL = "https://api.mercadopago.com/oauth/token";

const requiredEnv = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const postForm = async (params: Record<string, string>) => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // Intentionally not logging `params` or `body` verbatim - both can
    // contain the authorization code / refresh token / client secret.
    throw new Error(
      `Mercado Pago token request failed (${response.status}): ${body?.message ?? body?.error ?? "unknown error"}`
    );
  }

  return body as MercadoPagoTokenResponse;
};

export const buildAuthorizationUrl = (state: string): string => {
  const clientId = requiredEnv("MERCADOPAGO_CLIENT_ID");
  const redirectUri = requiredEnv("MERCADOPAGO_REDIRECT_URI");

  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  // Request scopes for reading account info, creating resources, and refresh tokens
  url.searchParams.set("scope", "read write offline_access");
  return url.toString();
};

export const exchangeCodeForToken = (code: string): Promise<MercadoPagoTokenResponse> => {
  return postForm({
    client_id: requiredEnv("MERCADOPAGO_CLIENT_ID"),
    client_secret: requiredEnv("MERCADOPAGO_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: requiredEnv("MERCADOPAGO_REDIRECT_URI"),
  });
};

export const refreshAccessToken = (refreshToken: string): Promise<MercadoPagoTokenResponse> => {
  return postForm({
    client_id: requiredEnv("MERCADOPAGO_CLIENT_ID"),
    client_secret: requiredEnv("MERCADOPAGO_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
};

// Create a Store in Mercado Pago
export const createStore = async (
  accessToken: string,
  restaurantName: string,
  externalStoreId: string
): Promise<{ id: string }> => {
  // First, get the user_id from Mercado Pago
  const userInfoResponse = await fetch("https://api.mercadopago.com/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    const userError = await userInfoResponse.json().catch(() => null);
    console.error("Failed to get user info:", userError);
    throw new Error(`Failed to get user info: ${JSON.stringify(userError)}`);
  }

  const userInfo = await userInfoResponse.json();
  const userId = userInfo.id;
  console.log("Creating store for user_id:", userId, "site_id:", userInfo.site_id);

  // Create the store using the explicit user_id
  const storePayload = {
    name: restaurantName,
    external_id: externalStoreId,
    location: {
      street_number: "1",
      street_name: "Av Reforma",
      city_name: "Ciudad de Mexico",
      state_name: "Distrito Federal",
      latitude: 19.432608,
      longitude: -99.133209,
      reference: restaurantName,
    },
  };

  console.log("Store payload:", JSON.stringify(storePayload, null, 2));

  const response = await fetch(`https://api.mercadopago.com/users/${userId}/stores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(storePayload),
  });

  const body = await response.json().catch(() => null);
  console.log("Store creation response:", response.status, JSON.stringify(body, null, 2));

  if (!response.ok) {
    const errorDetails = body?.message || body?.error || JSON.stringify(body) || "unknown error";
    throw new Error(
      `Failed to create store (${response.status}): ${errorDetails}`
    );
  }

  return body;
};

// Create a POS (Point of Sale / Caja) in Mercado Pago
export const createPOS = async (
  accessToken: string,
  externalStoreId: string,
  externalPOSId: string,
  posName: string
): Promise<{ id: string; qr?: { image: string; template_document: string } }> => {
  const response = await fetch("https://api.mercadopago.com/pos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: posName,
      external_store_id: externalStoreId,
      external_id: externalPOSId,
      fixed_amount: false, // Allow customer to see the amount
      category: 621102, // General category for food/services
    }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Failed to create POS (${response.status}): ${body?.message ?? body?.error ?? JSON.stringify(body)}`
    );
  }

  return body;
};
