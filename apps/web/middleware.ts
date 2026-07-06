import { NextRequest, NextResponse } from 'next/server';

// Checagem leve: só confere a PRESENÇA do cookie. A validação real do JWT
// acontece nos guards do Nest a cada chamada à API (spec, assunção 5).
export function middleware(request: NextRequest) {
  const hasToken = Boolean(request.cookies.get('access_token')?.value);
  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!hasToken && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Exclui rotas de API, assets internos do Next e arquivos estáticos da pasta public/
  // (logo, ícones etc.) — sem isso, o navegador não carrega a logo nem na tela de login.
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|webp)$).*)'],
};
