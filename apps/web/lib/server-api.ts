import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3002';

/**
 * Fetch server-to-server para a API do Nest, encaminhando o cookie httpOnly.
 * O Next.js nunca fala com o Postgres direto (spec, assunção 7).
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { cookie: cookies().toString() },
    cache: 'no-store',
  });
  if (res.status === 401) redirect('/login');
  if (!res.ok) {
    throw new Error(`API ${path} falhou: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export interface SessionUser {
  sub: string;
  schoolId: string;
  role: 'ADMIN' | 'STAFF';
  name: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser> {
  const { user } = await apiGet<{ user: SessionUser }>('/auth/me');
  return user;
}
