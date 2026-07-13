'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowDown,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Settings,
  Target,
  Users,
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
  const pathname = usePathname();
  const mobileNavItems = NAV_GROUPS.flatMap((group) => group.items).filter(
    (item) => !item.adminOnly || user.role === 'ADMIN',
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
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
      <header className="sticky top-0 z-30 flex items-center border-b border-[#263149] bg-[#0e1728] px-4 py-4 shadow-sm md:hidden">
        <Brand />
        <LogoutButton className="ml-auto shrink-0" />
      </header>

      <nav
          aria-label="Páginas do painel"
          className="relative z-20 flex snap-x snap-mandatory gap-2 overflow-x-auto border-b border-[#263149] bg-gradient-to-b from-[#152139] to-[#0e1728] px-4 py-2 shadow-[0_6px_16px_rgba(3,8,18,.2)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
        >
          {mobileNavItems.map(({ href, label, icon: Icon }) => {
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
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-10 shrink-0 snap-start items-center gap-2 rounded-xl border px-2 pr-2.5 text-[11px] font-extrabold transition-all duration-200 first:ml-2',
                  active
                    ? 'border-[#a89bff]/70 bg-gradient-to-br from-[#7867e9] via-[#5549bd] to-[#302966] text-white shadow-[0_8px_20px_rgba(96,79,213,.32),inset_0_1px_0_rgba(255,255,255,.2)]'
                    : 'border-white/[0.09] bg-white/[0.055] text-[#b3bfd2] shadow-[inset_0_1px_0_rgba(255,255,255,.04)] hover:-translate-y-0.5 hover:border-[#69758c] hover:bg-white/[0.1] hover:text-white',
                )}
              >
                <span
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-colors',
                    active ? 'bg-white/15 text-white' : 'bg-[#202b40] text-[#b8c3d8] group-hover:bg-[#2a3852] group-hover:text-white',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>{label}</span>
                {badge && (
                  <span className="-mr-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#d9536c] px-1 text-[8px] font-extrabold text-white shadow-sm">
                    {badge}
                  </span>
                )}
                {active && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-white/85" />}
              </Link>
            );
          })}
      </nav>

      <main className="min-w-0 px-4 py-6 md:ml-[264px] md:px-8 lg:px-10">{children}</main>
    </div>
  );
}
