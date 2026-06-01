import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "./config";

/**
 * Authenticated encryption for app env var values, so secrets are never stored
 * in plaintext in the state file. AES-256-GCM. Format: v1:iv:tag:ciphertext (base64).
 */

function keyBytes(): Buffer {
  const k = Buffer.from(config.encryptionKey, "hex");
  if (k.length !== 32) {
    throw new Error("ENV_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decrypt(blob: string): string {
  const parts = blob.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("malformed ciphertext");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}
