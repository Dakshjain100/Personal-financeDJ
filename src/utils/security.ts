/**
 * Security utilities for RupeeFlow authentication gate
 * Uses native Web Crypto API for SHA-256 hashing with salting
 */

export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashString(text: string, salt = ''): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(
  input: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const computed = await hashString(input, salt);
  return computed === expectedHash;
}
