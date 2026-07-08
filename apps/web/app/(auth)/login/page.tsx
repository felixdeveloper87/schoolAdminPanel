import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Informe e-mail e senha para entrar.',
  credentials: 'E-mail ou senha incorretos.',
  api: 'API indisponível. Confirme se o backend está rodando na porta 3002.',
  unknown: 'Erro ao entrar. Tente novamente.',
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const errorMessage = searchParams.error ? ERROR_MESSAGES[searchParams.error] ?? ERROR_MESSAGES.unknown : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="notebook-card paper-panel">
          <CardHeader className="items-center p-6 text-center sm:p-7">
            <Image
              src="/logo.jpg"
              alt="Peniel Christian School"
              width={68}
              height={68}
              priority
              className="rounded-lg border bg-card shadow-sm"
            />
            <div className="space-y-1 pt-2">
              <CardTitle className="text-2xl sm:text-3xl">Peniel Christian School</CardTitle>
              <CardDescription>Painel administrativo da diretoria</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 sm:px-7 sm:pb-7">
            <form action="/api/auth/login" method="post" className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@escola.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {errorMessage && (
                <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                  {errorMessage}
                </p>
              )}
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-muted-foreground">
          <span className="rounded-md border bg-card/80 px-2 py-2 shadow-sm">Alunos</span>
          <span className="rounded-md border bg-card/80 px-2 py-2 shadow-sm">Turmas</span>
          <span className="rounded-md border bg-card/80 px-2 py-2 shadow-sm">Financeiro</span>
        </div>
      </div>
    </main>
  );
}
