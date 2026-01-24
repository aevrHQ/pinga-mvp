import crypto from "crypto";

/**
 * Encrypts sensitive credentials for secure transmission.
 * Uses AES-256-GCM for authenticated encryption.
 */
export class CredentialEncryption {
  private encryptionKey: Buffer;

  constructor(key?: string) {
    if (!key) {
      const envKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
      if (!envKey) {
        throw new Error(
          "CREDENTIAL_ENCRYPTION_KEY environment variable is required"
        );
      }
      key = envKey;
    }

    // Ensure key is exactly 32 bytes for AES-256
    if (key.length < 32) {
      throw new Error("Encryption key must be at least 32 bytes");
    }
    this.encryptionKey = Buffer.from(key.substring(0, 32));
  }

  /**
   * Encrypts a string and returns base64-encoded ciphertext with IV and auth tag
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, "utf-8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:ciphertext:authtag (all hex-encoded)
    return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
  }

  /**
   * Decrypts a string encrypted with encrypt()
   */
  decrypt(encrypted: string): string {
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const ciphertext = parts[1];
    const authTag = Buffer.from(parts[2], "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf-8");
    decrypted += decipher.final("utf-8");

    return decrypted;
  }
}

/**
 * User credentials stored securely in database or passed to agent-host
 */
export interface UserCredentials {
  github?: string; // GitHub PAT or OAuth access token
  // Future: slack?: string, telegram?: string, etc.
}

/**
 * Credentials wrapper with encryption metadata
 */
export interface EncryptedCredentials {
  github?: string; // Encrypted GitHub token
  // Future: slack?: string, telegram?: string, etc.
}

/**
 * Encrypts user credentials
 */
export function encryptCredentials(
  credentials: UserCredentials,
  key?: string
): EncryptedCredentials {
  const encryptor = new CredentialEncryption(key);
  const encrypted: EncryptedCredentials = {};

  if (credentials.github) {
    encrypted.github = encryptor.encrypt(credentials.github);
  }

  return encrypted;
}

/**
 * Decrypts user credentials
 */
export function decryptCredentials(
  encrypted: EncryptedCredentials,
  key?: string
): UserCredentials {
  const decryptor = new CredentialEncryption(key);
  const credentials: UserCredentials = {};

  if (encrypted.github) {
    credentials.github = decryptor.decrypt(encrypted.github);
  }

  return credentials;
}
