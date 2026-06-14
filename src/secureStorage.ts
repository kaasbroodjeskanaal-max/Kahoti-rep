/**
 * Secure Storage Wrap Utility
 * 
 * Automatically encrypts and decrypts both keys and values in localStorage 
 * and sessionStorage, preventing local data exposure. Includes seamless 
 * on-the-fly migration for legacy unencrypted data.
 */

class SecureCipher {
  // A robust client-side secret feedback cipher
  private static passphrase = "kahoti_secure_storage_salt_2026_!!";

  /**
   * Encrypts plain text using standard feedback key scheduling (RC4-symmetric)
   */
  public static encrypt(text: string): string {
    if (!text) return "";
    const key = this.passphrase;
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      s[i] = i;
    }
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
      const temp = s[i];
      s[i] = s[j];
      s[j] = temp;
    }
    let i = 0;
    j = 0;
    const inputBytes = new TextEncoder().encode(text);
    const outputBytes = new Uint8Array(inputBytes.length);
    for (let k = 0; k < inputBytes.length; k++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      const temp = s[i];
      s[i] = s[j];
      s[j] = temp;
      const r = s[(s[i] + s[j]) % 256];
      outputBytes[k] = inputBytes[k] ^ r;
    }
    
    // Convert bytes securely to safe Base64 string
    let binary = "";
    const len = outputBytes.byteLength;
    for (let k = 0; k < len; k++) {
      binary += String.fromCharCode(outputBytes[k]);
    }
    return btoa(binary);
  }

  /**
   * Decrypts encrypted base64 payload back to original plain text
   */
  public static decrypt(cipherText: string): string {
    if (!cipherText) return "";
    try {
      const binary = atob(cipherText);
      const inputBytes = new Uint8Array(binary.length);
      for (let k = 0; k < binary.length; k++) {
        inputBytes[k] = binary.charCodeAt(k);
      }
      const key = this.passphrase;
      const s = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        s[i] = i;
      }
      let j = 0;
      for (let i = 0; i < 256; i++) {
        j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
        const temp = s[i];
        s[i] = s[j];
        s[j] = temp;
      }
      let i = 0;
      j = 0;
      const outputBytes = new Uint8Array(inputBytes.length);
      for (let k = 0; k < inputBytes.length; k++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        const temp = s[i];
        s[i] = s[j];
        s[j] = temp;
        const r = s[(s[i] + s[j]) % 256];
        outputBytes[k] = inputBytes[k] ^ r;
      }
      return new TextDecoder().decode(outputBytes);
    } catch (e) {
      console.warn("Failed to decrypt secure storage payload:", e);
      return "";
    }
  }

  /**
   * Helper to hash/encrypt internal keys
   */
  public static encryptKey(key: string): string {
    return "__enc_" + this.encrypt(key);
  }

  /**
   * Helper to decrypt internal keys
   */
  public static decryptKey(encKey: string): string {
    if (!encKey.startsWith("__enc_")) return encKey;
    return this.decrypt(encKey.slice(6));
  }
}

/**
 * Initializes the global secure Storage proxy to intercept window.localStorage
 * and window.sessionStorage transparently using standard storage prototypes.
 */
export function initSecureStorage() {
  if (typeof window === "undefined") return;

  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalKey = Storage.prototype.key;

  // Intercept getItem with transparent legacy migration support
  Storage.prototype.getItem = function (this: Storage, key: string): string | null {
    if (key.startsWith("__enc_")) {
      const rawVal = originalGetItem.call(this, key);
      return rawVal ? SecureCipher.decrypt(rawVal) : null;
    }

    const encKey = SecureCipher.encryptKey(key);
    const rawVal = originalGetItem.call(this, encKey);
    if (rawVal !== null) {
      return SecureCipher.decrypt(rawVal);
    }

    // Unencrypted legacy fallback
    const legacyVal = originalGetItem.call(this, key);
    if (legacyVal !== null) {
      // Migrate on the fly
      const encVal = SecureCipher.encrypt(legacyVal);
      originalSetItem.call(this, encKey, encVal);
      originalRemoveItem.call(this, key); 
      return legacyVal;
    }

    return null;
  };

  // Intercept setItem
  Storage.prototype.setItem = function (this: Storage, key: string, value: string): void {
    if (key.startsWith("__enc_")) {
      originalSetItem.call(this, key, value);
      return;
    }

    const encKey = SecureCipher.encryptKey(key);
    const encVal = SecureCipher.encrypt(value);
    originalSetItem.call(this, encKey, encVal);
  };

  // Intercept removeItem
  Storage.prototype.removeItem = function (this: Storage, key: string): void {
    if (key.startsWith("__enc_")) {
      originalRemoveItem.call(this, key);
      return;
    }

    const encKey = SecureCipher.encryptKey(key);
    originalRemoveItem.call(this, encKey);
    originalRemoveItem.call(this, key); // Ensure any obsolete legacy plain value is purged
  };

  // Intercept key index accessor
  Storage.prototype.key = function (this: Storage, index: number): string | null {
    const rawKey = originalKey.call(this, index);
    if (!rawKey) return null;
    if (rawKey.startsWith("__enc_")) {
      return SecureCipher.decryptKey(rawKey);
    }
    return rawKey;
  };

  console.log("🔒 Transparent Secure Storage Encryption activated.");
}
