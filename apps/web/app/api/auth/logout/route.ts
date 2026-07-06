import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:3002';

export async function POST(request: Request) {
  try {
    const apiRes = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
    const payload = await apiRes.json().catch(() => ({ ok: apiRes.ok }));
    const res = NextResponse.json(payload, { status: apiRes.status });
    const setCookie = apiRes.headers.get('set-cookie');
    if (setCookie) res.headers.set('set-cookie', setCookie);
    return res;
  } catch {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('access_token');
    return res;
  }
}
