'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  LayoutDashboard,
  Users,
  Receipt,
  School,
  Wallet,
  Settings,
  Menu,
  LogOut,
  X,
  FileBarChart,
  Target,
  Hourglass,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/lib/server-api';
import { ROLE_LABELS } from '@escola/contracts';

const NAV_ITEMS = [
  { href: '/', label: 'Painel', icon: LayoutDashboard },
  { href: '/alunos', label: 'Alunos', icon: Users },
  { href: '/ex-alunos', label: 'Ex-alunos', icon: UserX },
  { href: '/mensalidades', label: 'Mensalidades', icon: Receipt },
  { href: '/turmas', label: 'Turmas', icon: School },
  { href: '/despesas', label: 'Despesas', icon: Wallet },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { href: '/metas', label: 'Metas', icon: Target, adminOnly: true },
  { href: '/lista-espera', label: 'Lista de espera', icon: Hourglass },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

function NavLinks({ onNavigate, isAdmin }: { onNavigate?: () => void; isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <button
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-destructive',
        className,
      )}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-3">
      <Image src="/logo.jpg" alt="Peniel Christian School" width={36} height={36} className="rounded-lg" />
      <div className="leading-tight">
        <p className="font-display text-base font-bold">Peniel Christian School</p>
        <p className="text-xs text-muted-foreground">Painel administrativo</p>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r bg-card py-5 md:flex">
        <Brand />
        <div className="flex-1 px-3">
          <NavLinks isAdmin={user.role === 'ADMIN'} />
        </div>
        <div className="border-t px-3 pt-4">
          <p className="px-3 pb-2 text-sm">
            <span className="font-semibold">{user.name}</span>
            <br />
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </p>
          <LogoutButton className="w-full" />
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <Brand />
        <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogPrimitive.Trigger asChild>
            <button className="rounded-md p-2 hover:bg-muted" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
            <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col gap-6 border-l bg-card p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <DialogPrimitive.Title className="font-display font-bold">Menu</DialogPrimitive.Title>
                <DialogPrimitive.Close className="rounded-md p-2 hover:bg-muted" aria-label="Fechar menu">
                  <X className="h-5 w-5" />
                </DialogPrimitive.Close>
              </div>
              <NavLinks onNavigate={() => setMenuOpen(false)} isAdmin={user.role === 'ADMIN'} />
              <div className="mt-auto border-t pt-4">
                <p className="px-3 pb-2 text-sm font-semibold">{user.name}</p>
                <LogoutButton className="w-full" />
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </header>

      <main className="px-4 py-6 md:ml-60 md:px-8">{children}</main>
    </div>
  );
}
