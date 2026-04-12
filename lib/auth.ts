import 'server-only';

import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { apiError } from './http';
import { prisma } from './prisma';

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = 'debate_session';
export const SESSION_COOKIE_NAME = SESSION_COOKIE;

const DEFAULT_SESSION_DAYS = 14;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_BYTES = 16;
const SESSION_TOKEN_BYTES = 32;

export type CookieReader = {
  get: (name: string) => { value?: string } | undefined;
  delete?: (name: string) => void;
};

export type SafeUser = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUser = SafeUser;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function serializeUser(user: SafeUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const safeUser = serializeUser;

export async function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString('hex');
  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, digest] = storedHash.split('$');

  if (algorithm !== 'scrypt' || !salt || !digest) {
    return false;
  }

  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(digest, 'hex');

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(expected, derived);
}

export function isPasswordStrongEnough(password: string) {
  return password.length >= 8;
}

export function getSessionDurationDays() {
  const raw = Number.parseInt(process.env.AUTH_SESSION_DAYS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SESSION_DAYS;
}

export function getSessionExpiresAt(now = Date.now()) {
  return new Date(now + getSessionDurationDays() * 24 * 60 * 60 * 1000);
}

export function buildSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  };
}

export function buildClearedSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  };
}

export async function createSessionForUser(userId: string) {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
  const expiresAt = getSessionExpiresAt();

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function deleteSessionByToken(token: string) {
  await prisma.session.deleteMany({
    where: { token },
  });
}

async function loadSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return session;
}

export async function getCurrentUserFromCookies(cookieStore: CookieReader) {
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await loadSession(token);
  return session?.user ? serializeUser(session.user) : null;
}

export async function getRawSessionTokenFromCookies(cookieStore: CookieReader) {
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return getCurrentUserFromCookies(cookieStore);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw apiError(401, 'UNAUTHENTICATED', 'You must be signed in');
  }

  return user;
}

export function attachSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(SESSION_COOKIE, token, buildSessionCookieOptions(expiresAt));
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', buildClearedSessionCookieOptions());
}
