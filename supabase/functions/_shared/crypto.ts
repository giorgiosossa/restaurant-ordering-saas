// AES-256-GCM helpers for encrypting third-party OAuth tokens at rest
// (Mercado Pago access_token/refresh_token). Uses Deno's built-in Web
// Crypto API - no external dependency.
//
// Ciphertext format stored in the DB: base64(iv(12 bytes) || ciphertext+tag)

const IV_LENGTH = 12;

let cachedKey: CryptoKey | null = null;

const getKey = async (): Promise<CryptoKey> => {
  if (cachedKey) return cachedKey;

  const rawKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!rawKey) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }

  const keyBytes = base64ToBytes(rawKey);
  if (keyBytes.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)");
  }

  cachedKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
};

const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const encryptToken = async (plaintext: string): Promise<string> => {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)
  );

  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);

  return bytesToBase64(combined);
};

export const decryptToken = async (ciphertextB64: string): Promise<string> => {
  // If token starts with APP_USR-, TEST-, or v1:, it might be plaintext (development)
  // v1: prefix would be our future versioned encryption format
  if (ciphertextB64.startsWith("APP_USR-") || ciphertextB64.startsWith("TEST-")) {
    console.warn("WARNING: Token is stored in plaintext (not encrypted). This is insecure for production.");
    return ciphertextB64; // Return as-is for development/testing
  }

  try {
    const key = await getKey();
    const combined = base64ToBytes(ciphertextB64);
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt token");
  }
};
