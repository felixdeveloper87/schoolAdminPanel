import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  TriangleAlert,
} from 'lucide-react';
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  InvoiceStatus,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
} from '@escola/contracts';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { addMonths, brl, currentCompetence, formatCompetence, formatDate } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';
import { InvoiceActions } from '@/components/invoice-actions';
import { GenerateInvoicesButton } from '@/components/generate-invoices-button';
import { ExportCsvButton } from '@/components/export-csv-button';
import { StatCard } from '@/components/stat-card';
import { cn } from '@/lib/utils';

interface InvoiceRow {
  id: string;
  competence: string;
  effectiveCents: number;
  dueDate: string;
  status: InvoiceStatus;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  receiptNote: string | null;
  student: { id: string; fullName: string };
  classroom: { id: string; name: string };
}

interface InvoicesResponse {
  items: InvoiceRow[];
  total: number;
  page: number;
  totalPages: number;
  summaryByStatus: Partial<Record<InvoiceStatus, { count: number; totalCents: number }>>;
}

export default async function MensalidadesPage({
  searchParams,
}: {
  searchParams: { competence?: string; status?: string; page?: string };
}) {
  const competence = /^\d{4}-\d{2}$/.test(searchParams.competence ?? '')
    ? searchParams.competence!
    : currentCompetence();
  const status = INVOICE_STATUSES.includes(searchParams.status as InvoiceStatus)
    ? (searchParams.status as InvoiceStatus)
    : undefined;

  const query = new URLSearchParams({ competence, page: searchParams.page ?? '1' });
  if (status) query.set('status', status);

  const [user, data] = await Promise.all([
    getSessionUser(),
    apiGet<InvoicesResponse>(`/invoices?${query.toString()}`),
  ]);
  const isAdmin = user.role === 'ADMIN';
  const paid = data.summaryByStatus.PAID;
  const pending = data.summaryByStatus.PENDING;
  const overdue = data.summaryByStatus.OVERDUE;
  const exempt = data.summaryByStatus.EXEMPT;
  const issuedCents = (paid?.totalCents ?? 0) + (pending?.totalCents ?? 0) + (overdue?.totalCents ?? 0);
  const totalInvoiceCount = Object.values(data.summaryByStatus).reduce((total, item) => total + (item?.count ?? 0), 0);
  const openCents = (pending?.totalCents ?? 0) + (overdue?.totalCents ?? 0);
  const receivedRate = issuedCents > 0 ? Math.round(((paid?.totalCents ?? 0) / issuedCents) * 100) : 0;

  const linkFor = (params: { competence?: string; status?: string }) => {
    const q = new URLSearchParams();
    q.set('competence', params.competence ?? competence);
    if (params.status) q.set('status', params.status);
    return `/mensalidades?${q.toString()}`;
  };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-[#18294d] px-5 py-6 text-white shadow-[0_18px_45px_rgba(28,49,91,.22)] sm:px-7 sm:py-7">
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand/35 blur-2xl" />
        <div aria-hidden="true" className="absolute bottom-0 right-20 h-28 w-28 rounded-full border-[18px] border-[#93b5ff]/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b8c9ee]">Financeiro escolar</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-[34px]">Mensalidades</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#c7d3ec]">
              Acompanhe recebimentos, pendências e os próximos vencimentos de {formatCompetence(competence)}.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-inner shadow-black/10">
            <Link
              href={linkFor({ competence: addMonths(competence, -1), status })}
              className="grid h-9 w-9 place-items-center rounded-xl text-white transition hover:bg-white/15"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="flex min-w-[9rem] items-center justify-center gap-2 text-center text-sm font-extrabold">
              <CalendarDays className="h-4 w-4 text-[#b9c9ff]" /> {formatCompetence(competence)}
            </span>
            <Link
              href={linkFor({ competence: addMonths(competence, 1), status })}
              className="grid h-9 w-9 place-items-center rounded-xl text-white transition hover:bg-white/15"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Previsto no mês"
          value={brl(issuedCents)}
          hint={`${totalInvoiceCount} mensalidade(s) emitida(s)`}
          icon={CircleDollarSign}
          accent="primary"
          money
        />
        <StatCard
          label="Recebido"
          value={brl(paid?.totalCents ?? 0)}
          hint={`${paid?.count ?? 0} paga(s) · ${receivedRate}% do previsto`}
          icon={CheckCircle2}
          accent="success"
          money
        />
        <StatCard
          label="Em aberto"
          value={brl(openCents)}
          hint={`${pending?.count ?? 0} pendente(s)`}
          icon={Clock3}
          accent="accent"
          money
        />
        <StatCard
          label="Em atraso"
          value={brl(overdue?.totalCents ?? 0)}
          hint={overdue?.count ? `${overdue.count} requer(em) atenção` : 'Nenhuma pendência vencida'}
          icon={TriangleAlert}
          accent="destructive"
          money
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={linkFor({})}
            className={cn(
              'rounded-xl border px-3 py-2 font-bold transition-all',
              !status
                ? 'border-[#223e79] bg-[#223e79] text-white shadow-[0_6px_16px_rgba(34,62,121,.18)]'
                : 'border-white bg-white/85 text-muted-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary',
            )}
          >
            Todas <span className="ml-1 opacity-75">{totalInvoiceCount}</span>
          </Link>
          {(['PENDING', 'PAID', 'OVERDUE', 'EXEMPT'] as InvoiceStatus[]).map((s) => {
            const info = data.summaryByStatus[s];
            const color = {
              PENDING: 'bg-accent',
              PAID: 'bg-success',
              OVERDUE: 'bg-destructive',
              EXEMPT: 'bg-muted-foreground',
              CANCELLED: 'bg-muted-foreground',
            }[s];
            return (
              <Link
                key={s}
                href={linkFor({ status: s })}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 font-bold transition-all',
                  status === s
                    ? 'border-[#223e79] bg-[#223e79] text-white shadow-[0_6px_16px_rgba(34,62,121,.18)]'
                    : 'border-white bg-white/85 text-muted-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', color)} />
                {INVOICE_STATUS_LABELS[s]} <span className="opacity-75">{info?.count ?? 0}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton
            filename={`mensalidades-${competence}.csv`}
            rows={data.items.map((i) => ({
              Aluno: i.student.fullName,
              Turma: i.classroom.name,
              Valor: (i.effectiveCents / 100).toFixed(2),
              Vencimento: formatDate(i.dueDate),
              Status: INVOICE_STATUS_LABELS[i.status],
              'Pago em': i.paidAt ? formatDate(i.paidAt) : '',
              Método: i.paymentMethod ? PAYMENT_METHOD_LABELS[i.paymentMethod] : '',
              Observação: i.receiptNote ?? '',
            }))}
          />
          {isAdmin && <GenerateInvoicesButton competence={competence} />}
        </div>
      </div>

      <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-display text-lg font-extrabold text-foreground">Lançamentos do mês</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {status ? `Exibindo mensalidades ${INVOICE_STATUS_LABELS[status].toLowerCase()}.` : 'Todos os lançamentos desta competência.'}
            </p>
          </div>
          {exempt?.count ? <span className="hidden rounded-full bg-muted/60 px-3 py-1 text-xs font-bold text-muted-foreground sm:inline">{exempt.count} isenta(s)</span> : null}
        </div>
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead className="hidden md:table-cell">Turma</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="hidden sm:table-cell">Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma mensalidade nesta competência.
                  {isAdmin && ' Use “Gerar mensalidades do mês” acima.'}
                </TableCell>
              </TableRow>
            )}
            {data.items.map((invoice) => (
              <TableRow key={invoice.id} className="hover:bg-primary/10">
                <TableCell>
                  <Link href={`/alunos/${invoice.student.id}`} className="font-bold text-primary hover:text-primary">
                    {invoice.student.fullName}
                  </Link>
                  {invoice.receiptNote && (
                    <p className="text-xs text-muted-foreground">{invoice.receiptNote}</p>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {invoice.classroom.name}
                </TableCell>
                <TableCell className="money font-semibold">{brl(invoice.effectiveCents)}</TableCell>
                <TableCell className="money hidden sm:table-cell">
                  {formatDate(invoice.dueDate)}
                  {invoice.status === 'PAID' && invoice.paidAt && (
                    <p className="text-xs text-muted-foreground">
                      pago {formatDate(invoice.paidAt)}
                      {invoice.paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[invoice.paymentMethod]}` : ''}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="text-right">
                  <InvoiceActions
                    invoiceId={invoice.id}
                    studentName={invoice.student.fullName}
                    effectiveCents={invoice.effectiveCents}
                    status={invoice.status}
                    isAdmin={isAdmin}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
