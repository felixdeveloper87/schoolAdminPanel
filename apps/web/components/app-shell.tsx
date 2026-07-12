'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  ArrowDown,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Menu,
  Settings,
  Target,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/lib/server-api';
import { ROLE_LABELS } from '@escola/contracts';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { href: '/', label: 'Visão geral', icon: Home },
      { href: '/alunos', label: 'Alunos', icon: Users },
      { href: '/ex-alunos', label: 'Ex-alunos', icon: UserX },
      { href: '/mensalidades', label: 'Mensalidades', icon: CreditCard },
      { href: '/turmas', label: 'Turmas', icon: BookOpen },
      { href: '/despesas', label: 'Despesas', icon: ArrowDown },
      { href: '/metas', label: 'Metas', icon: Target, adminOnly: true },
      { href: '/lista-espera', label: 'Lista de espera', icon: ChartNoAxesColumnIncreasing },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/relatorios', label: 'Relatórios', icon: FileText },
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
];

function NavLinks({
  onNavigate,
  isAdmin,
  overdueCount,
}: {
  onNavigate?: () => void;
  isAdmin: boolean;
  overdueCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="space-y-5">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.adminOnly || isAdmin);
        return (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8390b1]">
              {group.label}
            </p>
            <div className="space-y-1">
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                const badge =
                  href === '/mensalidades' && overdueCount > 0
                    ? overdueCount > 99
                      ? '99+'
                      : String(overdueCount)
                    : null;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[14px] font-bold transition-colors',
                      active
                        ? 'border border-white/90 bg-[#25284e] text-white shadow-[inset_0_0_0_1px_rgba(126,106,255,0.55)]'
                        : 'border border-transparent text-[#aeb8cd] hover:bg-white/[0.06] hover:text-white',
                    )}
                  >
                    {active && <span className="absolute -left-1 h-7 w-1 rounded-full bg-[#8064ff]" />}
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-[#a5b0c5]')} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {badge && (
                      <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#41243e] px-1.5 text-[11px] font-bold text-[#e66d77]">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3 px-2">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[17px] border border-white/15 bg-white shadow-lg shadow-indigo-950/25">
        <Image
          src="/logo.jpg"
          alt="Logo da Peniel Christian School"
          width={48}
          height={48}
          priority
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-display text-[14px] font-extrabold text-white">Peniel Christian School</p>
        <p className="mt-1 text-[11px] text-[#8994b0]">Painel administrativo</p>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function LogoutButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  return (
    <button
      className={cn(
        'flex items-center gap-2 rounded-lg text-[#929db5] transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-50',
        compact ? 'h-9 w-9 justify-center' : 'px-3 py-2 text-sm font-bold',
        className,
      )}
      disabled={loading}
      aria-label="Sair"
      title="Sair"
      onClick={async () => {
        setLoading(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" />
      {!compact && 'Sair'}
    </button>
  );
}

function OccupancyCard() {
  return (
    <div className="rounded-[20px] border border-[#303a51] bg-[#192338] px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2 text-[13px] text-[#9ca8bf]">
        <span>Ocupação atual <strong className="text-[17px] text-white">78%</strong></span>
        <span className="text-[11px]">50 / 64</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#394256]">
        <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[#8164ff] to-[#c4b9ff]" />
      </div>
      <p className="mt-2 text-[11px] text-[#8d99b1]">14 vagas ainda disponíveis</p>
    </div>
  );
}

function UserFooter({ user }: { user: SessionUser }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#ffbf68] to-[#ef9851] text-sm font-extrabold text-white">
        {getInitials(user.name)}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[12px] font-extrabold text-white">{user.name}</p>
        <p className="mt-1 text-[10px] text-[#8e9ab3]">{ROLE_LABELS[user.role]}</p>
      </div>
      <LogoutButton compact />
    </div>
  );
}

export function AppShell({
  user,
  overdueCount,
  children,
}: {
  user: SessionUser;
  overdueCount: number;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-[#263149] bg-[#0e1728] px-3 py-6 text-white md:flex">
        <Brand />
        <div className="mx-1 my-5 border-t border-[#263149]" />
        <div className="min-h-0 flex-1 overflow-y-auto px-0.5">
          <NavLinks isAdmin={user.role === 'ADMIN'} overdueCount={overdueCount} />
        </div>
        <div className="mt-5 space-y-5">
          <OccupancyCard />
          <UserFooter user={user} />
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#263149] bg-[#0e1728] px-4 py-4 shadow-sm md:hidden">
        <Brand />
        <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogPrimitive.Trigger asChild>
            <button className="rounded-lg border border-white/15 bg-white/[0.06] p-2 text-white hover:bg-white/10" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-950/60" />
            <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[264px] max-w-[86vw] flex-col border-l border-[#263149] bg-[#0e1728] p-4 text-white shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <DialogPrimitive.Title className="font-display font-bold">Menu</DialogPrimitive.Title>
                <DialogPrimitive.Close className="rounded-lg border border-white/15 p-2 text-white hover:bg-white/10" aria-label="Fechar menu">
                  <X className="h-5 w-5" />
                </DialogPrimitive.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavLinks
                  onNavigate={() => setMenuOpen(false)}
                  isAdmin={user.role === 'ADMIN'}
                  overdueCount={overdueCount}
                />
              </div>
              <div className="mt-5 space-y-5 border-t border-[#263149] pt-5">
                <OccupancyCard />
                <UserFooter user={user} />
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </header>

      <main className="px-4 py-6 md:ml-[264px] md:px-8 lg:px-10">{children}</main>
    </div>
  );
}
