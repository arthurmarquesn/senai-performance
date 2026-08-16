import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function getEncryptionKey(): Buffer {
  const encodedKey =
    process.env.CLASSROOM_TOKEN_ENCRYPTION_KEY?.trim();

  if (!encodedKey) {
    throw new Error(
      "CLASSROOM_TOKEN_ENCRYPTION_KEY não está configurada.",
    );
  }

  const key = Buffer.from(
    encodedKey,
    "base64",
  );

  if (key.length !== 32) {
    throw new Error(
      "CLASSROOM_TOKEN_ENCRYPTION_KEY precisa representar exatamente 32 bytes.",
    );
  }

  return key;
}

export function encryptClassroomToken(
  plaintext: string,
): string {
  const normalized =
    plaintext.trim();

  if (!normalized) {
    throw new Error(
      "Token vazio não pode ser criptografado.",
    );
  }

  const key =
    getEncryptionKey();

  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      ALGORITHM,
      key,
      iv,
    );

  const ciphertext =
    Buffer.concat([
      cipher.update(
        normalized,
        "utf8",
      ),
      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptClassroomToken(
  encrypted: string,
): string {
  const parts =
    encrypted.split(":");

  if (
    parts.length !== 4 ||
    parts[0] !== VERSION
  ) {
    throw new Error(
      "Token criptografado possui formato inválido.",
    );
  }

  const [
    ,
    ivEncoded,
    tagEncoded,
    ciphertextEncoded,
  ] = parts;

  const key =
    getEncryptionKey();

  const iv =
    Buffer.from(
      ivEncoded,
      "base64url",
    );

  const authTag =
    Buffer.from(
      tagEncoded,
      "base64url",
    );

  const ciphertext =
    Buffer.from(
      ciphertextEncoded,
      "base64url",
    );

  const decipher =
    createDecipheriv(
      ALGORITHM,
      key,
      iv,
    );

  decipher.setAuthTag(
    authTag,
  );

  const plaintext =
    Buffer.concat([
      decipher.update(
        ciphertext,
      ),
      decipher.final(),
    ]);

  return plaintext.toString(
    "utf8",
  );
}