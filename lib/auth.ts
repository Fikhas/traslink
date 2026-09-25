import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sessions, users } from '@/db/schema';

const COOKIE = 'traslink_session';
const SESSION_DAYS = 30;

export type SessionUser = { id: string; name: string; email: string; phone: string | null; role: 'ADMIN' | 'DRIVER' | 'PASSENGER' };
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export const hashPassword = (password: string) => hash(password, 12);
export const verifyPassword = (password: string, passwordHash: string) => compare(password, passwordHash);

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db().insert(sessions).values({ userId, tokenHash: digest(token), expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies(); const token = jar.get(COOKIE)?.value;
  if (token) await db().delete(sessions).where(eq(sessions.tokenHash, digest(token)));
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db().select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, active: users.active }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  if (!row?.active) return null;
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
}

export async function requireRole(roles: SessionUser['role'][]) {
  const user = await getSessionUser();
  if (!user) throw new Response('Belum masuk', { status: 401 });
  if (!roles.includes(user.role)) throw new Response('Tidak diizinkan', { status: 403 });
  return user;
}

