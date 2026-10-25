/**
 * Client-side cryptographic hashing utilities using the Web Crypto API
 * Uses SHA-256 with salts to securely store and verify User PINs and Security Answers.
 */

// Generate a random hex salt
export function generateSalt(bytesLength = 16): string {
  const array = new Uint8Array(bytesLength);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Hash a string with an optional salt using standard Web Crypto SHA-256
export async function hashCredential(value: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${value.trim()}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify an input against an existing salt and hash
export async function verifyCredential(
  input: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const computedHash = await hashCredential(input, salt);
  return computedHash === expectedHash;
}

// Normalize security answers (lowercase, strip extra whitespace)
export function normalizeSecurityAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const DEFAULT_SECURITY_QUESTIONS = [
  'What is the name of your first school?',
  'In what city were you born?',
  'What was your childhood nickname?',
  'What is your mother\'s maiden name?',
  'What was the model of your first vehicle?',
  'What was your favorite childhood food?'
];
