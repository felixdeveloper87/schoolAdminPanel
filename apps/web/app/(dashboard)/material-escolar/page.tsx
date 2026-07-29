import Link from 'next/link';
import { BookOpenCheck, CalendarDays, CheckCircle2, ChevronRight, CircleDashed, Users } from 'lucide-react';
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from '@escola/contracts';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { formatCompetence } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StudentAvatar } from '@/components/student-avatar';
import { SchoolMaterialChargeDialog } from '@/components/school-material-charge-dialog';
import { SchoolMaterialAgreementDialog } from '@/components/school-material-agreement-dialog';

type MaterialRow = {
  id: string;
  fullName: string;
  photoUrl: string | null;
  classroom: { id: string; name: string } | null;
  enrollmentId: string | null;
  material: {
    status: InvoiceStatus;
    installmentCount: number;
    installments: Array<{ status: InvoiceStatus; installmentNumber: number; installmentCount: number; amountCents: number; discountCents: number; dueDate: string }>;
  } | null;
};
type MaterialsResponse = { items: MaterialRow[]; total: number; competence: string };

export default async function MaterialEscolarPage() {
  const [user, data] = await Promise.all([getSessionUser(), apiGet<MaterialsResponse>('/students/school-materials?pageSize=100')]);
  const generated = data.items.filter((student) => student.material).length;
  const pending = data.items.length - generated;

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[28px] bg-[#214f59] px-5 py-6 text-white shadow-[0_18px_45px_rgba(28,89,91,.22)] sm:px-7 sm:py-7"><span aria-hidden="true" className="absolute -right-12 -top-20 h-60 w-60 rounded-full bg-[#7cd8c4]/25 blur-2xl" /><div className="relative flex flex-wrap items-end justify-between gap-5"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b9ece0]">Financeiro escolar</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-[34px]">Material escolar</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-[#d2f2eb]">Acompanhe quem já tem o material gerado e registre a cobrança de quem está pendente.</p></div><div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-extrabold"><CalendarDays className="h-4 w-4 text-[#b9ece0]" /> {formatCompetence(data.competence.slice(0, 7))}</div></div></section>
    <div className="grid gap-3 sm:grid-cols-3"><Card className="rounded-2xl p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Users className="h-5 w-5" /></span><div><p className="text-xs font-bold text-muted-foreground">Alunos ativos</p><p className="mt-0.5 text-2xl font-extrabold">{data.total}</p></div></div></Card><Card className="rounded-2xl p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-xs font-bold text-muted-foreground">Material gerado</p><p className="mt-0.5 text-2xl font-extrabold">{generated}</p></div></div></Card><Card className="rounded-2xl p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/20 text-accent-deep"><CircleDashed className="h-5 w-5" /></span><div><p className="text-xs font-bold text-muted-foreground">A iniciar</p><p className="mt-0.5 text-2xl font-extrabold">{pending}</p></div></div></Card></div>
    <Card className="overflow-hidden rounded-[22px] border-border bg-card/95 shadow-[0_14px_40px_rgba(35,49,79,.07)]"><div className="flex items-center gap-3 border-b border-border px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success"><BookOpenCheck className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-extrabold">Status por aluno</h2><p className="text-xs text-muted-foreground">Crie ou consulte o acordo de material escolar de cada aluno.</p></div></div><Table><TableHeader className="bg-muted/60"><TableRow><TableHead className="pl-5">Aluno</TableHead><TableHead className="hidden sm:table-cell">Turma</TableHead><TableHead>Status e acordo</TableHead></TableRow></TableHeader><TableBody>{data.items.map((student) => <TableRow key={student.id} className="hover:bg-muted/60"><TableCell className="py-4 pl-5"><Link href={`/alunos/${student.id}`} className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><StudentAvatar photoUrl={student.photoUrl} name={student.fullName} size="md" /><span className="text-sm font-extrabold hover:text-brand hover:underline">{student.fullName}</span></Link></TableCell><TableCell className="hidden sm:table-cell"><span className="rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-bold text-muted-foreground">{student.classroom?.name ?? 'Sem turma'}</span></TableCell><TableCell>{student.material ? <SchoolMaterialAgreementDialog studentName={student.fullName} installments={student.material.installments} trigger={<button type="button" className="group flex min-w-[190px] items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/5 px-3 py-2 text-left transition-colors hover:border-success/50 hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span><Badge variant="success" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Gerado</Badge><span className="mt-1 block text-xs text-muted-foreground">{INVOICE_STATUS_LABELS[student.material.status]}{student.material.installmentCount > 1 ? ` · ${student.material.installmentCount}x` : ''}</span></span><span className="flex items-center gap-1 text-xs font-extrabold text-success underline-offset-2 group-hover:underline">Ver acordo <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span></button>} /> : student.enrollmentId && user.role === 'ADMIN' ? <SchoolMaterialChargeDialog initialEnrollmentId={student.enrollmentId} studentName={student.fullName} trigger={<Button variant="outline" size="sm" className="group border-accent/50 bg-accent/10 text-accent-deep hover:bg-accent/20"><CircleDashed className="h-4 w-4" /><span><span className="block text-left leading-none">Não gerado</span><span className="mt-1 flex items-center gap-1 text-[11px] font-extrabold underline-offset-2 group-hover:underline">Criar acordo <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span></span></Button>} /> : <span className="text-xs text-muted-foreground">{student.enrollmentId ? 'Aguardando administrador' : 'Sem matrícula'}</span>}</TableCell></TableRow>)}</TableBody></Table></Card>
  </div>;
}
