import Link from 'next/link';
import { ArrowLeft, ReceiptText } from 'lucide-react';
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type InvoiceStatus } from '@escola/contracts';
import { apiGet } from '@/lib/server-api';
import { brl, formatCompetence, formatDate } from '@/lib/format';
import { PrintButton } from '@/components/print-button';
import { Card } from '@/components/ui/card';

interface InvoiceReceipt {
  id: string;
  competence: string;
  amountCents: number;
  discountCents: number;
  effectiveCents: number;
  dueDate: string;
  status: InvoiceStatus;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  receiptNote: string | null;
  student: { id: string; fullName: string };
  classroom: { id: string; name: string };
  financialGuardian: { fullName: string; cpf: string | null } | null;
  school: { name: string; cnpj: string | null; phone: string; address: string };
}

export default async function ReciboPage({ params }: { params: { id: string } }) {
  const invoice = await apiGet<InvoiceReceipt>(`/invoices/${params.id}`);
  const competence = formatCompetence(invoice.competence.slice(0, 7));
  const receiptNumber = invoice.id.slice(-8).toUpperCase();

  if (invoice.status !== 'PAID') {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          href="/mensalidades"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para mensalidades
        </Link>
        <Card className="paper-panel p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent-deep">
            <ReceiptText className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-display text-xl font-extrabold text-foreground">Recibo indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A mensalidade de <strong>{invoice.student.fullName}</strong> ({competence}) ainda não foi paga. O recibo
            fica disponível após a confirmação do pagamento.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/mensalidades"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para mensalidades
        </Link>
        <PrintButton label="Imprimir recibo / PDF" />
      </div>

      <Card className="paper-panel overflow-hidden rounded-[20px] print:rounded-none print:border-0">
        {/* Cabeçalho da escola */}
        <div className="border-b border-border px-7 py-6 text-center">
          <h1 className="font-display text-xl font-extrabold text-foreground">{invoice.school.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {invoice.school.address} · Tel: {invoice.school.phone}
            {invoice.school.cnpj ? ` · CNPJ: ${invoice.school.cnpj}` : ''}
          </p>
        </div>

        <div className="space-y-6 px-7 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                Recibo de pagamento
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-foreground">Nº {receiptNumber}</p>
            </div>
            <span className="stamp text-sm">Pago</span>
          </div>

          <p className="text-sm leading-relaxed text-foreground">
            Recebemos de <strong>{invoice.financialGuardian?.fullName ?? `responsável por ${invoice.student.fullName}`}</strong>
            {invoice.financialGuardian?.cpf ? ` (CPF ${invoice.financialGuardian.cpf})` : ''} a importância de{' '}
            <strong className="money">{brl(invoice.effectiveCents)}</strong>, referente à mensalidade de{' '}
            <strong>{competence}</strong> do(a) aluno(a) <strong>{invoice.student.fullName}</strong>, turma{' '}
            <strong>{invoice.classroom.name}</strong>.
          </p>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-border bg-muted/40 p-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Valor</dt>
              <dd className="money mt-0.5 font-bold text-foreground">{brl(invoice.amountCents)}</dd>
            </div>
            {invoice.discountCents > 0 && (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Desconto</dt>
                <dd className="money mt-0.5 font-bold text-success">−{brl(invoice.discountCents)}</dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Valor pago</dt>
              <dd className="money mt-0.5 font-bold text-foreground">{brl(invoice.effectiveCents)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Forma</dt>
              <dd className="mt-0.5 font-bold text-foreground">
                {invoice.paymentMethod ? PAYMENT_METHOD_LABELS[invoice.paymentMethod] : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pago em</dt>
              <dd className="money mt-0.5 font-bold text-foreground">
                {invoice.paidAt ? formatDate(invoice.paidAt) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Vencimento</dt>
              <dd className="money mt-0.5 font-bold text-foreground">{formatDate(invoice.dueDate)}</dd>
            </div>
          </dl>

          {invoice.receiptNote && (
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Observação:</strong> {invoice.receiptNote}
            </p>
          )}

          <div className="grid gap-10 pt-10 sm:grid-cols-2">
            <div className="text-center">
              <div className="mx-auto w-full max-w-[240px] border-t border-foreground/50" />
              <p className="mt-2 text-xs text-muted-foreground">Assinatura da escola</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-full max-w-[240px] border-t border-foreground/50" />
              <p className="mt-2 text-xs text-muted-foreground">Assinatura do responsável</p>
            </div>
          </div>

          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            Documento gerado pelo painel administrativo · {invoice.school.name}
          </p>
        </div>
      </Card>
    </div>
  );
}
