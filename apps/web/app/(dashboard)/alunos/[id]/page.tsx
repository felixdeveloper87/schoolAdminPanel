import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MessageCircle,
  NotebookText,
  Pencil,
  ReceiptText,
  School,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Utensils,
  Wallet,
} from 'lucide-react';
import {
  AGE_GROUP_LABELS,
  AgeGroup,
  DISCOUNT_REASON_LABELS,
  DiscountReason,
  ENROLLMENT_TYPE_LABELS,
  EnrollmentStatus,
  EnrollmentType,
  InvoiceStatus,
  RELATIONSHIP_LABELS,
  Relationship,
  SHIFT_LABELS,
  STUDENT_STATUS_LABELS,
  Shift,
  StudentStatus,
} from '@escola/contracts';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { brl, formatAge, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';
import { InvoiceActions } from '@/components/invoice-actions';
import { EnrollmentDialog, EndEnrollmentButton } from '@/components/enrollment-dialog';
import { DeactivateStudentDialog, ReactivateStudentButton } from '@/components/student-status-dialog';
import { StudentAvatar } from '@/components/student-avatar';

interface StudentDetail {
  id: string;
  fullName: string;
  birthDate: string;
  status: StudentStatus;
  inactiveReason: string | null;
  inactiveAt: string | null;
  photoUrl: string | null;
  enrollmentType: EnrollmentType;
  mealsIncluded: boolean;
  allergies: string | null;
  dietaryRestrictions: string | null;
  medicalNotes: string | null;
  notes: string | null;
  guardians: {
    id: string;
    fullName: string;
    relationship: Relationship;
    cpf: string | null;
    phoneWhatsapp: string;
    email: string | null;
    isFinancialResponsible: boolean;
    authorizedPickup: boolean;
  }[];
  enrollments: {
    id: string;
    status: EnrollmentStatus;
    startDate: string;
    endDate: string | null;
    monthlyFeeCents: number;
    discountCents: number;
    discountReason: DiscountReason;
    dueDay: number;
    classroom: { id: string; name: string; ageGroup: AgeGroup; shift: Shift };
    invoices: {
      id: string;
      competence: string;
      amountCents: number;
      discountCents: number;
      dueDate: string;
      status: InvoiceStatus;
      paidAt: string | null;
    }[];
  }[];
}

interface ClassroomOption {
  id: string;
  name: string;
  activeCount: number;
  capacity: number;
  active: boolean;
}

const panelClassName = 'overflow-hidden rounded-[22px] border-[#dce6f0] bg-white/95 shadow-[0_12px_35px_rgba(35,49,79,.06)]';

export default async function AlunoPage({ params }: { params: { id: string } }) {
  const [user, student, classrooms] = await Promise.all([
    getSessionUser(),
    apiGet<StudentDetail>(`/students/${params.id}`),
    apiGet<ClassroomOption[]>('/classrooms'),
  ]);

  const activeEnrollment = student.enrollments.find((enrollment) => enrollment.status === 'ACTIVE') ?? null;
  const invoices = student.enrollments
    .flatMap((enrollment) => enrollment.invoices)
    .sort((a, b) => b.competence.localeCompare(a.competence))
    .slice(0, 12);
  const financial = student.guardians.find((guardian) => guardian.isFinancialResponsible);
  const effectiveMonthlyFee = activeEnrollment
    ? activeEnrollment.monthlyFeeCents - activeEnrollment.discountCents
    : null;
  const hasHealthNotes = Boolean(student.allergies || student.dietaryRestrictions || student.medicalNotes);

  return (
    <div className="space-y-5">
      <Link
        href="/alunos"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6d7890] transition-colors hover:text-[#5b59d6]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para alunos
      </Link>

      <section className="relative overflow-hidden rounded-[26px] border border-[#d9e2ee] bg-gradient-to-br from-white via-white to-[#f1efff] p-5 shadow-[0_16px_45px_rgba(37,49,79,.08)] sm:p-6">
        <span className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-[#7b68ee]/[0.07]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-fit rounded-[26px] bg-white p-1.5 shadow-[0_10px_28px_rgba(52,63,94,.12)]">
              <StudentAvatar photoUrl={student.photoUrl} name={student.fullName} size="lg" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6b5ce7]">Ficha do aluno</p>
              <h1 className="mt-1 truncate font-display text-3xl font-extrabold tracking-tight text-[#10192a]">{student.fullName}</h1>
              <p className="mt-1.5 text-sm text-[#68758b]">
                {formatAge(student.birthDate)} <span className="px-1 text-[#b0b8c6]">•</span> Nascimento em {formatDate(student.birthDate)}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant={student.status === 'ACTIVE' ? 'success' : student.status === 'WAITLIST' ? 'warning' : 'secondary'}>
                  {STUDENT_STATUS_LABELS[student.status]}
                </Badge>
                <Badge variant="secondary">{ENROLLMENT_TYPE_LABELS[student.enrollmentType]}</Badge>
                {student.mealsIncluded && <Badge variant="secondary"><Utensils className="mr-1 h-3 w-3" /> Refeição inclusa</Badge>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:max-w-[430px] lg:justify-end">
            <Link
              href={`/alunos/${student.id}/editar`}
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'h-9 rounded-xl border-[#d3deea] bg-white' })}
            >
              <Pencil className="h-4 w-4" /> Editar ficha
            </Link>
            {!activeEnrollment && student.status === 'ACTIVE' && (
              <EnrollmentDialog
                studentId={student.id}
                studentName={student.fullName}
                classrooms={classrooms.filter((classroom) => classroom.active)}
              />
            )}
            {student.status === 'INACTIVE' ? (
              <ReactivateStudentButton studentId={student.id} />
            ) : (
              <DeactivateStudentDialog studentId={student.id} studentName={student.fullName} />
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-[18px] border border-[#dce6f0] bg-white/95 p-4 shadow-[0_8px_25px_rgba(35,49,79,.05)]">
          <div className="flex items-center gap-2 text-[#778399]"><School className="h-4 w-4 text-[#5f77d8]" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Turma</span></div>
          <p className="mt-2 truncate font-display text-lg font-extrabold text-[#172033]">{activeEnrollment?.classroom.name ?? 'Sem turma'}</p>
          <p className="mt-0.5 text-[11px] text-[#7a869a]">{activeEnrollment ? `${AGE_GROUP_LABELS[activeEnrollment.classroom.ageGroup]} · ${SHIFT_LABELS[activeEnrollment.classroom.shift]}` : 'Sem matrícula ativa'}</p>
        </div>
        <div className="rounded-[18px] border border-[#dce6f0] bg-white/95 p-4 shadow-[0_8px_25px_rgba(35,49,79,.05)]">
          <div className="flex items-center gap-2 text-[#778399]"><Wallet className="h-4 w-4 text-[#2da77f]" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Mensalidade</span></div>
          <p className="money mt-2 truncate text-lg font-extrabold text-[#172033]">{effectiveMonthlyFee !== null ? brl(effectiveMonthlyFee) : '—'}</p>
          <p className="mt-0.5 text-[11px] text-[#7a869a]">{activeEnrollment?.discountCents ? `${brl(activeEnrollment.discountCents)} de desconto` : 'Valor efetivo mensal'}</p>
        </div>
        <div className="rounded-[18px] border border-[#dce6f0] bg-white/95 p-4 shadow-[0_8px_25px_rgba(35,49,79,.05)]">
          <div className="flex items-center gap-2 text-[#778399]"><CalendarDays className="h-4 w-4 text-[#e3a122]" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Vencimento</span></div>
          <p className="mt-2 font-display text-lg font-extrabold text-[#172033]">{activeEnrollment ? `Dia ${activeEnrollment.dueDay}` : '—'}</p>
          <p className="mt-0.5 text-[11px] text-[#7a869a]">Da mensalidade</p>
        </div>
        <div className="rounded-[18px] border border-[#dce6f0] bg-white/95 p-4 shadow-[0_8px_25px_rgba(35,49,79,.05)]">
          <div className="flex items-center gap-2 text-[#778399]"><UserRound className="h-4 w-4 text-[#8069e9]" /><span className="text-[10px] font-extrabold uppercase tracking-wide">Responsável financeiro</span></div>
          <p className="mt-2 truncate font-display text-lg font-extrabold text-[#172033]">{financial?.fullName ?? 'Não informado'}</p>
          <p className="mt-0.5 truncate text-[11px] text-[#7a869a]">{financial?.phoneWhatsapp ?? 'Sem contato cadastrado'}</p>
        </div>
      </div>

      {student.status === 'INACTIVE' && (
        <div className="flex gap-3 rounded-[18px] border border-[#dce2ea] bg-[#f5f7fa] p-4">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white text-[#68758a] shadow-sm"><UserRound className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-extrabold text-[#27344a]">Ex-aluno desde {student.inactiveAt ? formatDate(student.inactiveAt) : 'data não informada'}</p>
            <p className="mt-0.5 text-xs text-[#6e7a8f]">Motivo: {student.inactiveReason ?? 'Não informado'}</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        <div className="space-y-5">
          <Card className={panelClassName}>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-[#e5ebf2]">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef2ff] text-[#5c63d8]"><School className="h-4 w-4" /></span>
                <div><CardTitle className="text-lg text-[#172033]">Matrícula atual</CardTitle><p className="text-[11px] text-[#7a869a]">Dados acadêmicos e financeiros</p></div>
              </div>
              {activeEnrollment && <EndEnrollmentButton enrollmentId={activeEnrollment.id} />}
            </CardHeader>
            <CardContent className="pt-5">
              {activeEnrollment ? (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#f7f9fc] p-3"><dt className="text-[10px] font-bold uppercase text-[#7b879a]">Turma</dt><dd className="mt-1 text-sm font-extrabold text-[#263349]">{activeEnrollment.classroom.name}</dd></div>
                  <div className="rounded-xl bg-[#f7f9fc] p-3"><dt className="text-[10px] font-bold uppercase text-[#7b879a]">Faixa e turno</dt><dd className="mt-1 text-sm font-extrabold text-[#263349]">{AGE_GROUP_LABELS[activeEnrollment.classroom.ageGroup]} · {SHIFT_LABELS[activeEnrollment.classroom.shift]}</dd></div>
                  <div className="rounded-xl bg-[#f7f9fc] p-3"><dt className="text-[10px] font-bold uppercase text-[#7b879a]">Início</dt><dd className="money mt-1 text-sm font-extrabold text-[#263349]">{formatDate(activeEnrollment.startDate)}</dd></div>
                  <div className="rounded-xl bg-[#f7f9fc] p-3">
                    <dt className="text-[10px] font-bold uppercase text-[#7b879a]">Mensalidade</dt>
                    <dd className="money mt-1 text-sm font-extrabold text-[#263349]">{brl(effectiveMonthlyFee!)}</dd>
                    {activeEnrollment.discountCents > 0 && <p className="mt-1 text-[10px] text-[#748096]">Original {brl(activeEnrollment.monthlyFeeCents)} · desconto {DISCOUNT_REASON_LABELS[activeEnrollment.discountReason]}</p>}
                  </div>
                </dl>
              ) : (
                <div className="py-8 text-center">
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#f0f3f8] text-[#8792a5]"><School className="h-5 w-5" /></span>
                  <p className="mt-3 font-bold text-[#2a374c]">Sem matrícula ativa</p>
                  <p className="mt-1 text-xs text-[#7a869a]">{financial ? `Responsável financeiro: ${financial.fullName}.` : 'Cadastre um responsável financeiro antes de matricular.'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={panelClassName}>
            <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-[#e5ebf2]">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf7f2] text-[#2b9874]"><ReceiptText className="h-4 w-4" /></span>
              <div><CardTitle className="text-lg text-[#172033]">Mensalidades</CardTitle><p className="text-[11px] text-[#7a869a]">Últimos 12 lançamentos</p></div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-[#f7f9fc]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Competência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden sm:table-cell">Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-xs text-[#7a869a]">Nenhuma mensalidade gerada ainda.</TableCell></TableRow>}
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="border-[#e8edf3] hover:bg-[#f8faff]">
                      <TableCell className="money pl-5 font-semibold">{formatDate(invoice.competence).slice(3)}</TableCell>
                      <TableCell className="money font-extrabold text-[#263349]">{brl(invoice.amountCents - invoice.discountCents)}</TableCell>
                      <TableCell className="money hidden text-[#68758b] sm:table-cell">{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
                      <TableCell className="text-right">
                        <InvoiceActions
                          invoiceId={invoice.id}
                          studentName={student.fullName}
                          effectiveCents={invoice.amountCents - invoice.discountCents}
                          status={invoice.status}
                          isAdmin={user.role === 'ADMIN'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {hasHealthNotes && (
            <Card className="overflow-hidden rounded-[22px] border-[#f0d7d9] bg-white/95 shadow-[0_12px_35px_rgba(74,45,48,.05)]">
              <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-[#f3e2e4]">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0f1] text-[#e85d68]"><Stethoscope className="h-4 w-4" /></span>
                <div><CardTitle className="text-lg text-[#172033]">Saúde e alimentação</CardTitle><p className="text-[11px] text-[#7a869a]">Informações que exigem atenção</p></div>
              </CardHeader>
              <CardContent className="space-y-3 pt-5 text-sm">
                {student.allergies && <div className="rounded-xl border border-[#f4d9dc] bg-[#fff7f8] p-3"><p className="flex items-center gap-1.5 text-xs font-extrabold text-[#c94854]"><ShieldAlert className="h-3.5 w-3.5" /> Alergias</p><p className="mt-1 text-xs leading-relaxed text-[#59667b]">{student.allergies}</p></div>}
                {student.dietaryRestrictions && <div className="rounded-xl bg-[#fffaf0] p-3"><p className="flex items-center gap-1.5 text-xs font-extrabold text-[#a66b08]"><Utensils className="h-3.5 w-3.5" /> Restrições alimentares</p><p className="mt-1 text-xs leading-relaxed text-[#59667b]">{student.dietaryRestrictions}</p></div>}
                {student.medicalNotes && <div className="rounded-xl bg-[#f6f8fb] p-3"><p className="text-xs font-extrabold text-[#344258]">Observações médicas</p><p className="mt-1 text-xs leading-relaxed text-[#59667b]">{student.medicalNotes}</p></div>}
              </CardContent>
            </Card>
          )}

          <Card className={panelClassName}>
            <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-[#e5ebf2]">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef2ff] text-[#5c63d8]"><UserRound className="h-4 w-4" /></span>
              <div><CardTitle className="text-lg text-[#172033]">Responsáveis</CardTitle><p className="text-[11px] text-[#7a869a]">Contatos e autorizações</p></div>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {student.guardians.map((guardian) => (
                <div key={guardian.id} className="rounded-[16px] border border-[#e0e7ef] bg-[#fafbfd] p-3.5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-[#263349]">{guardian.fullName}</p>
                      <p className="mt-0.5 text-[11px] text-[#7a869a]">{RELATIONSHIP_LABELS[guardian.relationship]}</p>
                    </div>
                    <a
                      href={`https://wa.me/55${guardian.phoneWhatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#e8f7f0] text-[#26996e] hover:bg-[#d9f1e6]"
                      aria-label={`Abrir WhatsApp de ${guardian.fullName}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="money mt-2 text-xs text-[#59667b]">{guardian.phoneWhatsapp}</p>
                  {guardian.email && <a href={`mailto:${guardian.email}`} className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-[#657189] hover:text-[#5b59d6]"><Mail className="h-3 w-3" /> {guardian.email}</a>}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {guardian.isFinancialResponsible && <Badge variant="warning" className="text-[10px]">Responsável financeiro</Badge>}
                    <Badge variant={guardian.authorizedPickup ? 'success' : 'destructive'} className="text-[10px]">
                      {guardian.authorizedPickup ? 'Autorizado a buscar' : 'Não autorizado a buscar'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {student.notes && (
            <Card className={panelClassName}>
              <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-[#e5ebf2]">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff5e2] text-[#d8951f]"><NotebookText className="h-4 w-4" /></span>
                <CardTitle className="text-lg text-[#172033]">Observações</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 text-sm leading-relaxed text-[#59667b]">{student.notes}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
