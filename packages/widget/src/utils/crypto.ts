// @ts-nocheck

import { bytesToString as viemBytesToString, concatBytes } from 'viem';

// Simplified jwtDecode for client-side parsing
const jwtDecode = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload);
    return { sub: payload.sub };
  } catch (e) {
    console.debug('Failed to decode JWT:', e);
    return { sub: '' }; // Return a default or throw an error as appropriate
  }
};

export enum HeadlessClientErrorCode {
  DecryptClientShardError = 'DECRYPT_CLIENT_SHARD_ERROR',
  // Add other error codes as needed
}

export class HeadlessClientError extends Error {
  public code: HeadlessClientErrorCode;
  public cause?: unknown;

  constructor({ message, code, cause }: { message: string; code: HeadlessClientErrorCode; cause?: unknown }) {
    super(message);
    this.name = 'HeadlessClientError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, HeadlessClientError.prototype);
  }
}

export const TAG_LENGTH_BIT = 128;
export const TAG_LENGTH_BYTE = TAG_LENGTH_BIT / 8;
export const IV_LENGTH_BYTE = 12;

export const bytesToString = (bytes: Uint8Array): string => {
  return viemBytesToString(bytes, { encoding: 'base64' });
};

export const stringToBytes = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

export const base64ToBytes = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const unpackEncryptedContent = (
  packedContent: string,
): {
  iv: Uint8Array;
  authTag: Uint8Array;
  cipherText: Uint8Array;
} => {
  const l2InBytes = base64ToBytes(packedContent);
  const l1InBase64 = bytesToString(l2InBytes);
  const content = base64ToBytes(l1InBase64);
  const ivSize = content[0] ?? IV_LENGTH_BYTE; // * 1st byte: iv size
  const authTagSize = content[1] ?? TAG_LENGTH_BYTE; // * 2nd byte: auth tag size
  const iv = content.slice(2, 2 + ivSize);
  const cipherText = content.slice(2 + ivSize, content.length - authTagSize);
  const authTag = content.slice(content.length - authTagSize);
  return { iv, authTag, cipherText };
};

const getV1PackedContent = (encryptedData: string) => {
  const parts = encryptedData.split('.');
  const v1Content = parts[0];
  if (!v1Content) {
    throw 'Encrypted content is empty.';
  }
  return v1Content;
};

export interface DecryptShardParams {
  accessToken: string;
  recoveryPassword: string;
  encryptedData: string;
}

const createDerivedKey = async (password: Uint8Array, salt: Uint8Array) => {
  const baseKey = await window.crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveKey']);
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 4096,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  return derivedKey;
};

const DEFAULT_ISS = 'https://athena.skymavis.com/';
export const deriveKey = async (waypointToken: string, recoveryPassword: string) => {
  const { sub } = jwtDecode(waypointToken);
  const salt = stringToBytes(`${DEFAULT_ISS}:${sub}`);
  const password = stringToBytes(`${DEFAULT_ISS}:${sub}:${recoveryPassword}`);
  return await createDerivedKey(password, salt);
};

export const decryptShard = async (params: DecryptShardParams) => {
  const { accessToken, recoveryPassword, encryptedData } = params;
  try {
    const v1PackedContent = getV1PackedContent(encryptedData);
    const { authTag, cipherText, iv } = unpackEncryptedContent(v1PackedContent);
    const key = await deriveKey(accessToken, recoveryPassword);
    const shardInBytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, concatBytes([cipherText, authTag]));
    const shardInBase64 = bytesToString(new Uint8Array(shardInBytes));
    return shardInBase64;
  } catch (error) {
    throw new HeadlessClientError({
      cause: error,
      code: HeadlessClientErrorCode.DecryptClientShardError,
      message: 'Unable to decrypt the client shard. It is probably the wrong recovery password.',
    });
  }
};
