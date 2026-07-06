import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:3002';

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const isFormPost = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
  let body: unknown;
  try {
    if (isFormPost) {
      const form = await request.formData();
      body = {
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      };
    } else {
      body = await request.json();
    }
  } catch {
    return isFormPost
      ? NextResponse.redirect(new URL('/login?error=invalid', request.url), 303)
      : NextResponse.json({ message: 'Dados de login inválidos.' }, { status: 400 });
  }

  try {
    const apiRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const payload = await apiRes.json().catch(() => null);
    if (isFormPost && !apiRes.ok) {
      const error = apiRes.status === 401 ? 'credentials' : 'unknown';
      return NextResponse.redirect(new URL(`/login?error=${error}`, request.url), 303);
    }
    if (isFormPost) {
      const res = NextResponse.redirect(new URL('/', request.url), 303);
      const setCookie = apiRes.headers.get('set-cookie');
      if (setCookie) res.headers.set('set-cookie', setCookie);
      return res;
    }
    const res = NextResponse.json(payload ?? { ok: apiRes.ok }, { status: apiRes.status });
    const setCookie = apiRes.headers.get('set-cookie');
    if (setCookie) res.headers.set('set-cookie', setCookie);
    return res;
  } catch {
    if (isFormPost) {
      return NextResponse.redirect(new URL('/login?error=api', request.url), 303);
    }
    return NextResponse.json(
      { message: 'API indisponível. Confirme se o backend está rodando na porta 3002.' },
      { status: 503 },
    );
  }
}
