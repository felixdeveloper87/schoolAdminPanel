import Image from 'next/image';
import { GraduationCap, Layers, Lock, Mail, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Informe e-mail e senha para entrar.',
  credentials: 'E-mail ou senha incorretos.',
  api: 'API indisponível. Confirme se o backend está rodando na porta 3002.',
  unknown: 'Erro ao entrar. Tente novamente.',
};

const HIGHLIGHTS = [
  { icon: GraduationCap, label: 'Alunos', description: 'Matrículas e turmas em um só lugar' },
  { icon: Layers, label: 'Turmas', description: 'Organização por sala e período' },
  { icon: Wallet, label: 'Financeiro', description: 'Mensalidades, despesas e relatórios' },
];

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const errorMessage = searchParams.error ? ERROR_MESSAGES[searchParams.error] ?? ERROR_MESSAGES.unknown : null;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Painel de identidade — visível a partir de lg */}
      <div className="relative hidden overflow-hidden bg-primary px-12 py-16 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(90deg, currentColor 1px, transparent 1px), linear-gradient(180deg, currentColor 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="Peniel Christian School"
            width={72}
            height={72}
            priority
            className="rounded-lg border border-white/20 shadow-lg"
          />
          <span className="font-display text-lg font-bold tracking-tight">Peniel Christian School</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
            Painel administrativo da diretoria
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/80">
            Gerencie matrículas, turmas e o financeiro da escola em um único painel, feito sob medida
            para o dia a dia da secretaria.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {HIGHLIGHTS.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur-sm"
            >
              <Icon className="h-5 w-5 text-accent" strokeWidth={2.25} />
              <p className="mt-2 text-sm font-bold">{label}</p>
              <p className="mt-0.5 text-xs leading-snug text-primary-foreground/70">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <Image
              src="/logo.jpg"
              alt="Peniel Christian School"
              width={80}
              height={80}
              priority
              className="rounded-lg border bg-card shadow-sm"
            />
            <div>
              <p className="font-display text-xl font-bold">Peniel Christian School</p>
              <p className="text-sm text-muted-foreground">Painel administrativo da diretoria</p>
            </div>
          </div>

          <div className="mb-6 hidden lg:block">
            <h2 className="font-display text-2xl font-bold text-foreground">Entrar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use suas credenciais de acesso para continuar.
            </p>
          </div>

          <form action="/api/auth/login" method="post" className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@escola.com"
                  required
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="pl-9"
                />
              </div>
            </div>
            {errorMessage && (
              <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {errorMessage}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-1 w-full">
              Entrar
            </Button>
          </form>

          <div className="mt-8 grid grid-cols-3 gap-2 text-center text-xs font-bold text-muted-foreground lg:hidden">
            {HIGHLIGHTS.map(({ label }) => (
              <span key={label} className="rounded-md border bg-card/80 px-2 py-2 shadow-sm">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
