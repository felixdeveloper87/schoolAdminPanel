import Link from 'next/link';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Plus,
  UserPlus,
  UserRoundSearch,
  UsersRound,
} from 'lucide-react';
import {
  AGE_GROUP_LABELS,
  AgeGroup,
  SHIFT_LABELS,
  Shift,
  WAITLIST_STATUSES,
  WAITLIST_STATUS_LABELS,
  WaitlistStatus,
} from '@escola/contracts';
import { apiGet } from '@/lib/server-api';
import { formatAge, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/stat-card';
import { WaitlistEntryDialog } from '@/components/waitlist-entry-dialog';
import { WaitlistStatusSelect } from '@/components/waitlist-status-select';
import { cn } from '@/lib/utils';

interface WaitlistRow {
  id: string;
  childName: string;
  birthDate: string;
  guardianName: string;
  phoneWhatsapp: string;
  desiredAgeGroup: AgeGroup;
  desiredShift: Shift;
  requestedAt: string;
  status: WaitlistStatus;
  notes: string | null;
}

const STATUS_BADGE_VARIANT: Record<WaitlistStatus, 'warning' | 'secondary' | 'success' | 'destructive'> = {
  WAITING: 'warning',
  CONTACTED: 'secondary',
  ENROLLED: 'success',
  GAVE_UP: 'destructive',
};

const STATUS_DOT: Record<WaitlistStatus, string> = {
  WAITING: 'bg-accent',
  CONTACTED: 'bg-[#7286af]',
  ENROLLED: 'bg-success',
  GAVE_UP: 'bg-destructive',
};

export default async function ListaEsperaPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = WAITLIST_STATUSES.includes(searchParams.status as WaitlistStatus)
    ? (searchParams.status as WaitlistStatus)
    : undefined;
  const entries = await apiGet<WaitlistRow[]>('/waitlist');
  const visibleEntries = status ? entries.filter((entry) => entry.status === status) : entries;
  const countByStatus = Object.fromEntries(
    WAITLIST_STATUSES.map((item) => [item, entries.filter((entry) => entry.status === item).length]),
  ) as Record<WaitlistStatus, number>;
  const completedCount = countByStatus.ENROLLED + countByStatus.GAVE_UP;
  const conversionRate = completedCount > 0 ? Math.round((countByStatus.ENROLLED / completedCount) * 100) : 0;
  const priorityEntry = entries.find((entry) => entry.status === 'WAITING') ?? entries.find((entry) => entry.status === 'CONTACTED');

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-[#1d4962] px-5 py-6 text-white shadow-[0_18px_45px_rgba(29,73,98,.2)] sm:px-7 sm:py-7">
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#65b6d8]/30 blur-2xl" />
        <div aria-hidden="true" className="absolute bottom-0 right-24 h-28 w-28 rounded-full border-[18px] border-[#c5ebf5]/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#bfe4ef]">Captação de alunos</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-[34px]">Lista de espera</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#c9e2ec]">
              Organize contatos, acompanhe o funil de entrada e não deixe uma oportunidade passar.
            </p>
          </div>
          <WaitlistEntryDialog
            trigger={
              <Button className="h-10 rounded-xl bg-card px-4 text-primary shadow-[0_8px_20px_rgba(0,0,0,.16)] hover:bg-primary/10 hover:text-primary">
                <Plus className="h-4 w-4" /> Nova entrada
              </Button>
            }
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Aguardando vaga"
          value={String(countByStatus.WAITING)}
          hint="contatos ainda sem retorno"
          icon={Clock3}
          accent="accent"
        />
        <StatCard
          label="Em contato"
          value={String(countByStatus.CONTACTED)}
          hint="famílias em acompanhamento"
          icon={MessageCircle}
          accent="primary"
        />
        <StatCard
          label="Matrículas convertidas"
          value={String(countByStatus.ENROLLED)}
          hint="entradas já concluídas"
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="Taxa de conversão"
          value={`${conversionRate}%`}
          hint={completedCount ? `${countByStatus.ENROLLED} de ${completedCount} decisões` : 'Sem decisões registradas'}
          icon={UsersRound}
          accent="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Prioridade de contato</p>
                <h2 className="mt-0.5 font-display text-lg font-extrabold text-primary">
                  {priorityEntry ? priorityEntry.childName : 'Nenhum contato pendente'}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {priorityEntry
                    ? `${priorityEntry.guardianName} · aguardando desde ${formatDate(priorityEntry.requestedAt)}`
                    : 'Acompanhe novas entradas por aqui.'}
                </p>
              </div>
            </div>
            {priorityEntry && (
              <a
                href={`https://wa.me/55${priorityEntry.phoneWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-success px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(46,169,124,.2)] transition hover:bg-success/85"
              >
                <MessageCircle className="h-4 w-4" /> Chamar no WhatsApp
              </a>
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-[24px] border-border bg-gradient-to-br from-card to-brand/10 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
          <CardContent className="flex h-full items-center gap-3 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
              <UserPlus className="h-5 w-5" />
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-muted-foreground">Ideia:</strong> priorize contatos que estão aguardando há mais tempo antes de abrir novas vagas.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href="/lista-espera"
          className={cn(
            'shrink-0 rounded-xl border px-3 py-2 font-bold transition-all',
            !status
              ? 'border-[#285d7b] bg-[#285d7b] text-white shadow-[0_6px_16px_rgba(40,93,123,.18)]'
              : 'border-white bg-white/85 text-muted-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary',
          )}
        >
          Todas <span className="ml-1 opacity-75">{entries.length}</span>
        </Link>
        {WAITLIST_STATUSES.map((item) => (
          <Link
            key={item}
            href={`/lista-espera?status=${item}`}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 font-bold transition-all',
              status === item
                ? 'border-[#285d7b] bg-[#285d7b] text-white shadow-[0_6px_16px_rgba(40,93,123,.18)]'
                : 'border-white bg-white/85 text-muted-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[item])} />
            {WAITLIST_STATUS_LABELS[item]} <span className="opacity-75">{countByStatus[item]}</span>
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-primary">Entradas da lista</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{visibleEntries.length} registro(s) exibido(s).</p>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead>Criança</TableHead>
              <TableHead className="hidden sm:table-cell">Desejado</TableHead>
              <TableHead className="hidden md:table-cell">Responsável</TableHead>
              <TableHead className="hidden lg:table-cell">Solicitado em</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEntries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center text-muted-foreground">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
                    <UserRoundSearch className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-bold text-primary">Nenhuma entrada encontrada</p>
                  <p className="mt-1 text-xs text-muted-foreground">Ajuste o filtro ou registre uma nova entrada.</p>
                </TableCell>
              </TableRow>
            )}
            {visibleEntries.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-muted/60">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-extrabold text-primary">
                      {entry.childName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-primary">{entry.childName}</p>
                      <p className="text-xs text-muted-foreground">{formatAge(entry.birthDate)}</p>
                      {entry.notes && <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{entry.notes}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <p className="font-semibold text-muted-foreground">{AGE_GROUP_LABELS[entry.desiredAgeGroup]}</p>
                  <p className="text-xs text-muted-foreground">{SHIFT_LABELS[entry.desiredShift]}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="font-semibold text-muted-foreground">{entry.guardianName}</p>
                  <a
                    href={`https://wa.me/55${entry.phoneWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="money text-xs font-semibold text-success hover:underline"
                  >
                    {entry.phoneWhatsapp}
                  </a>
                </TableCell>
                <TableCell className="money hidden text-muted-foreground lg:table-cell">{formatDate(entry.requestedAt)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[entry.status]} className="whitespace-nowrap text-[10px]">
                    {WAITLIST_STATUS_LABELS[entry.status]}
                  </Badge>
                  <div className="mt-2">
                    <WaitlistStatusSelect id={entry.id} status={entry.status} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
