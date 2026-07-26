import Link from 'next/link';
import { CalendarDays, CheckCircle2, CircleDashed, GraduationCap, Users } from 'lucide-react';
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from '@escola/contracts';
import { apiGet } from '@/lib/server-api';
import { formatCompetence } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StudentAvatar } from '@/components/student-avatar';
import { RenewalChargeDialog } from '@/components/renewal-charge-dialog';
import { RenewalAgreementDialog } from '@/components/renewal-agreement-dialog';
import { Button } from '@/components/ui/button';

interface RenewalRow {
  id: string;
  fullName: string;
  photoUrl: string | null;
  classroom: { id: string; name: string } | null;
  enrollmentId: string | null;
  renewal: {
    status: InvoiceStatus;
    installmentCount: number;
    installments: Array<{
      status: InvoiceStatus;
      installmentNumber: number;
      installmentCount: number;
      amountCents: number;
      materialCents: number;
      discountCents: number;
      dueDate: string;
    }>;
  } | null;
}

interface RenewalsResponse {
  items: RenewalRow[];
  total: number;
  competence: string;
}

export default async function RematriculaPage() {
  const data = await apiGet<RenewalsResponse>('/students/renewals?pageSize=100');
  const generated = data.items.filter((student) => student.renewal).length;
  const pending = data.items.length - generated;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-[#2b3d72] px-5 py-6 text-white shadow-[0_18px_45px_rgba(39,55,106,.22)] sm:px-7 sm:py-7">
        <span aria-hidden="true" className="absolute -right-12 -top-20 h-60 w-60 rounded-full bg-brand/40 blur-2xl" />
        <span aria-hidden="true" className="absolute bottom-0 right-24 h-24 w-24 rounded-full border-[16px] border-white/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#c6d2ff]">Gestão acadêmica</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-[34px]">Rematrícula</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#d5def8]">Acompanhe quem já iniciou a rematrícula e gere a cobrança para quem ainda está pendente.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-extrabold"><CalendarDays className="h-4 w-4 text-[#c6d2ff]" /> {formatCompetence(data.competence.slice(0, 7))}</div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Users className="h-5 w-5" /></span><div><p className="text-xs font-bold text-muted-foreground">Alunos ativos</p><p className="mt-0.5 text-2xl font-extrabold">{data.total}</p></div></div></Card>
        <Card className="rounded-2xl p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-xs font-bold text-muted-foreground">Rematrícula gerada</p><p className="mt-0.5 text-2xl font-extrabold">{generated}</p></div></div></Card>
        <Card className="rounded-2xl p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/20 text-accent-deep"><CircleDashed className="h-5 w-5" /></span><div><p className="text-xs font-bold text-muted-foreground">A iniciar</p><p className="mt-0.5 text-2xl font-extrabold">{pending}</p></div></div></Card>
      </div>

      <Card className="overflow-hidden rounded-[22px] border-border bg-card/95 shadow-[0_14px_40px_rgba(35,49,79,.07)]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><GraduationCap className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-extrabold">Status por aluno</h2><p className="text-xs text-muted-foreground">A cobrança de rematrícula é o marco de início do processo.</p></div></div>
        <Table>
          <TableHeader className="bg-muted/60"><TableRow><TableHead className="pl-5">Aluno</TableHead><TableHead className="hidden sm:table-cell">Turma</TableHead><TableHead>Status da rematrícula</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.items.map((student) => (
              <TableRow key={student.id} className="hover:bg-muted/60">
                <TableCell className="pl-5 py-4"><Link href={`/alunos/${student.id}`} className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><StudentAvatar photoUrl={student.photoUrl} name={student.fullName} size="md" /><span className="text-sm font-extrabold hover:text-brand hover:underline">{student.fullName}</span></Link></TableCell>
                <TableCell className="hidden sm:table-cell"><span className="rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-bold text-muted-foreground">{student.classroom?.name ?? 'Sem turma'}</span></TableCell>
                <TableCell>
                  {student.renewal ? <RenewalAgreementDialog studentName={student.fullName} installments={student.renewal.installments} trigger={<button type="button" className="flex flex-wrap items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Badge variant="success" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Gerada</Badge><span className="text-xs text-muted-foreground underline-offset-2 hover:underline">{INVOICE_STATUS_LABELS[student.renewal.status]}{student.renewal.installmentCount > 1 ? ` · ${student.renewal.installmentCount}x` : ''}</span></button>} /> : student.enrollmentId ? <RenewalChargeDialog enrollmentId={student.enrollmentId} studentName={student.fullName} trigger={<Button variant="outline" size="sm" className="border-accent/50 bg-accent/10 text-accent-deep hover:bg-accent/20"><CircleDashed className="h-4 w-4" /> Não gerada · iniciar</Button>} /> : <span className="text-xs text-muted-foreground">Sem matrícula</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
