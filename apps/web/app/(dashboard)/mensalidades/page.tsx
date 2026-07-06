import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  const linkFor = (params: { competence?: string; status?: string }) => {
    const q = new URLSearchParams();
    q.set('competence', params.competence ?? competence);
    if (params.status) q.set('status', params.status);
    return `/mensalidades?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mensalidades</h1>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <Link href={linkFor({ competence: addMonths(competence, -1), status })} className="rounded p-1 hover:bg-muted" aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="font-semibold">{formatCompetence(competence)}</span>
            <Link href={linkFor({ competence: addMonths(competence, 1), status })} className="rounded p-1 hover:bg-muted" aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        {isAdmin && <GenerateInvoicesButton competence={competence} />}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={linkFor({})}
          className={cn(
            'rounded-full border px-3 py-1 font-semibold',
            !status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
          )}
        >
          Todas ({data.total})
        </Link>
        {(['PENDING', 'PAID', 'OVERDUE', 'EXEMPT'] as InvoiceStatus[]).map((s) => {
          const info = data.summaryByStatus[s];
          return (
            <Link
              key={s}
              href={linkFor({ status: s })}
              className={cn(
                'rounded-full border px-3 py-1 font-semibold',
                status === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {INVOICE_STATUS_LABELS[s]} ({info?.count ?? 0}
              {info && s !== 'EXEMPT' ? ` · ${brl(info.totalCents)}` : ''})
            </Link>
          );
        })}
      </div>

      <Card>
        <Table>
          <TableHeader>
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
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhuma mensalidade nesta competência.
                  {isAdmin && ' Use "Gerar mensalidades do mês" acima.'}
                </TableCell>
              </TableRow>
            )}
            {data.items.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Link href={`/alunos/${invoice.student.id}`} className="font-semibold hover:text-primary">
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
