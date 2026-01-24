import crypto from "crypto";

/**
 * Agent-host credential decryption utility.
 * Mirrors the encryption from the platform.
 */
export class CredentialDecryption {
  private encryptionKey: Buffer;

  constructor(key?: string) {
    if (!key) {
      const envKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
      if (!envKey) {
        // For self-hosted mode, encryption key is optional
        this.encryptionKey = Buffer.alloc(0);
        return;
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
   * Decrypts a string encrypted by the platform
   */
  decrypt(encrypted: string): string {
    if (!this.encryptionKey.length) {
      throw new Error(
        "Encryption key not available. Set CREDENTIAL_ENCRYPTION_KEY environment variable."
      );
    }

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
 * Safely decrypts credentials from a task context
 */
export function decryptCredentials(
  credentials?: { github?: string },
  encryptionKey?: string
): { github?: string } {
  if (!credentials?.github) {
    return {};
  }

  try {
    const decryptor = new CredentialDecryption(encryptionKey);
    return {
      github: decryptor.decrypt(credentials.github),
    };
  } catch (error) {
    console.error(
      "[Credential Decryption] Failed to decrypt credentials:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}
