import { SignJWT, jwtVerify } from 'jose';
import type { AuthUser } from '../types';

const PBKDF2_ITERATIONS = 100_000;

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function hashPassword(
  password: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const saltBytes = existingSalt
    ? fromBase64(existingSalt)
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return {
    hash: toBase64(new Uint8Array(derived)),
    salt: existingSalt ?? toBase64(saltBytes),
  };
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const computed = await hashPassword(password, storedSalt);
  return timingSafeEqual(fromBase64(computed.hash), fromBase64(storedHash));
}

export function generateLinkCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

function getSecretKey(jwtSecret?: string): Uint8Array {
  if (!jwtSecret || jwtSecret.length < 16) {
    throw new Error('JWT_SECRET is not configured (minimum 16 characters required).');
  }
  return new TextEncoder().encode(jwtSecret);
}

export async function signAuthToken(user: AuthUser, jwtSecret?: string): Promise<string> {
  const key = getSecretKey(jwtSecret);
  return new SignJWT({
    email: user.email,
    name: user.name,
    plan: user.plan,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
}

export async function verifyAuthToken(
  token: string,
  jwtSecret?: string
): Promise<AuthUser | null> {
  try {
    const key = getSecretKey(jwtSecret);
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.name !== 'string') {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      plan: payload.plan === 'pro' ? 'pro' : 'free',
    };
  } catch {
    return null;
  }
}
