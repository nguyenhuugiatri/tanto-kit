import { jwtDecode } from 'jwt-decode';
import { bytesToString, stringToBytes } from 'viem';

import { base64ToBytes } from '../../utils/convertor';

const TAG_LENGTH_BIT = 128;
const TAG_LENGTH_BYTE = TAG_LENGTH_BIT / 8;
const IV_LENGTH_BYTE = 12;
const DEFAULT_ISS = 'https://athena.skymavis.com/';

export const unpackEncryptedContent = (
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

export const getV1PackedContent = (encryptedData: string) => {
  const parts = encryptedData.split('.');
  const v1Content = parts[0];
  if (!v1Content) throw new Error('Encrypted content is empty.');
  return v1Content;
};

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

export const deriveKey = async (waypointToken: string, recoveryPassword: string) => {
  const { sub } = jwtDecode(waypointToken);

  const salt = stringToBytes(`${DEFAULT_ISS}:${sub}`);
  const password = stringToBytes(`${DEFAULT_ISS}:${sub}:${recoveryPassword}`);

  return createDerivedKey(password, salt);
};

export const AESEncrypt = async ({ content, key }: { content: string; key: string }) => {
  const { encryptedContent: publicKeyEncrypted, encryptionKey } = await encryptContent(key);

  const contentBytes = new TextEncoder().encode(content);

  const cryptoKey = await crypto.subtle.importKey('raw', encryptionKey, { name: 'AES-GCM' }, false, ['encrypt']);
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    cryptoKey,
    contentBytes,
  );

  const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const encryptedKeyB64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyEncrypted)));
  const nonceB64 = btoa(String.fromCharCode(...nonce));

  return {
    ciphertextB64,
    encryptedKeyB64,
    nonceB64,
  };
};

export const AESDecrypt = async ({
  ciphertextB64,
  nonceB64,
  aesKey,
}: {
  ciphertextB64: string;
  nonceB64: string;
  aesKey: Uint8Array;
}) => {
  const nonce = Uint8Array.from(atob(nonceB64), c => c.charCodeAt(0));
  const encryptedContent = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey('raw', aesKey, { name: 'AES-GCM' }, false, ['decrypt']);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    cryptoKey,
    encryptedContent,
  );

  const contentString = new TextDecoder().decode(decrypted);

  return contentString;
};

export const encryptContent = async (content: string, key?: Uint8Array) => {
  const encryptionKey = key ?? crypto.getRandomValues(new Uint8Array(32));

  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = content.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const rsaPublicKey = await crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt'],
  );

  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    rsaPublicKey,
    encryptionKey,
  );

  return {
    encryptedContent,
    encryptionKey,
  };
};
