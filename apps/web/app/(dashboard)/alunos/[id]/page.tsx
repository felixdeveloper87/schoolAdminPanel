import Link from 'next/link';
import { MessageCircle, Pencil } from 'lucide-react';
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
  STUDENT_STATUS_LABELS,
  Shift,
  StudentStatus,
} from '@escola/contracts';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { brl, formatAge, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default async function AlunoPage({ params }: { params: { id: string } }) {
  const [user, student, classrooms] = await Promise.all([
    getSessionUser(),
    apiGet<StudentDetail>(`/students/${params.id}`),
    apiGet<ClassroomOption[]>('/classrooms'),
  ]);

  const activeEnrollment = student.enrollments.find((e) => e.status === 'ACTIVE') ?? null;
  const invoices = student.enrollments.flatMap((e) => e.invoices).sort((a, b) => b.competence.localeCompare(a.competence)).slice(0, 12);
  const financial = student.guardians.find((g) => g.isFinancialResponsible);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <StudentAvatar photoUrl={student.photoUrl} name={student.fullName} size="lg" />
          <div>
            <p className="text-sm text-muted-foreground">
              <Link href="/alunos" className="hover:text-primary">Alunos</Link> / Ficha
            </p>
            <h1 className="text-2xl font-bold">{student.fullName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{formatAge(student.birthDate)} · nasc. {formatDate(student.birthDate)}</span>
              <Badge variant={student.status === 'ACTIVE' ? 'success' : 'secondary'}>
                {STUDENT_STATUS_LABELS[student.status]}
              </Badge>
              <Badge variant="secondary">{ENROLLMENT_TYPE_LABELS[student.enrollmentType]}</Badge>
              {student.mealsIncluded && <Badge variant="secondary">Refeição inclusa</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/alunos/${student.id}/editar`}>
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          </Button>
          {!activeEnrollment && student.status === 'ACTIVE' && (
            <EnrollmentDialog
              studentId={student.id}
              studentName={student.fullName}
              classrooms={classrooms.filter((c) => c.active)}
            />
          )}
          {student.status === 'INACTIVE' ? (
            <ReactivateStudentButton studentId={student.id} />
          ) : (
            <DeactivateStudentDialog studentId={student.id} studentName={student.fullName} />
          )}
        </div>
      </div>

      {student.status === 'INACTIVE' && (
        <Card className="notebook-card" style={{ ['--notebook-accent' as string]: 'var(--muted-foreground)' }}>
          <CardHeader>
            <CardTitle>Ex-aluno</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              <span className="font-semibold">Motivo:</span> {student.inactiveReason ?? '—'}
            </p>
            {student.inactiveAt && (
              <p className="text-muted-foreground">Desde {formatDate(student.inactiveAt)}</p>
            )}
          </CardContent>
        </Card>
      )}

      {(student.allergies || student.dietaryRestrictions || student.medicalNotes) && (
        <Card className="notebook-card" style={{ ['--notebook-accent' as string]: 'var(--destructive)' }}>
          <CardHeader>
            <CardTitle>Saúde e alimentação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            {student.allergies && (
              <div>
                <p className="font-semibold text-destructive">Alergias</p>
                <p>{student.allergies}</p>
              </div>
            )}
            {student.dietaryRestrictions && (
              <div>
                <p className="font-semibold">Restrições alimentares</p>
                <p>{student.dietaryRestrictions}</p>
              </div>
            )}
            {student.medicalNotes && (
              <div>
                <p className="font-semibold">Observações médicas</p>
                <p>{student.medicalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="notebook-card" style={{ ['--notebook-accent' as string]: 'var(--accent)' }}>
          <CardHeader>
            <CardTitle>Responsáveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.guardians.map((g) => (
              <div key={g.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {g.fullName}{' '}
                    <span className="font-normal text-muted-foreground">
                      ({RELATIONSHIP_LABELS[g.relationship]})
                    </span>
                  </p>
                  <a
                    href={`https://wa.me/55${g.phoneWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-success hover:underline"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </div>
                <p className="money text-muted-foreground">{g.phoneWhatsapp}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {g.isFinancialResponsible && <Badge variant="warning">Responsável financeiro</Badge>}
                  {g.authorizedPickup ? (
                    <Badge variant="success">Pode buscar</Badge>
                  ) : (
                    <Badge variant="destructive">Não autorizado a buscar</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="notebook-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Matrícula</CardTitle>
            {activeEnrollment && <EndEnrollmentButton enrollmentId={activeEnrollment.id} />}
          </CardHeader>
          <CardContent className="text-sm">
            {activeEnrollment ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">Turma</dt>
                <dd className="font-semibold">{activeEnrollment.classroom.name}</dd>
                <dt className="text-muted-foreground">Faixa etária</dt>
                <dd>{AGE_GROUP_LABELS[activeEnrollment.classroom.ageGroup]}</dd>
                <dt className="text-muted-foreground">Início</dt>
                <dd className="money">{formatDate(activeEnrollment.startDate)}</dd>
                <dt className="text-muted-foreground">Mensalidade</dt>
                <dd className="money font-semibold">
                  {brl(activeEnrollment.monthlyFeeCents - activeEnrollment.discountCents)}
                  {activeEnrollment.discountCents > 0 && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {brl(activeEnrollment.monthlyFeeCents)} − {brl(activeEnrollment.discountCents)} (
                      {DISCOUNT_REASON_LABELS[activeEnrollment.discountReason]})
                    </span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Vencimento</dt>
                <dd className="money">dia {activeEnrollment.dueDay}</dd>
              </dl>
            ) : (
              <p className="text-muted-foreground">
                Sem matrícula ativa.{financial ? ` Responsável financeiro: ${financial.fullName}.` : ''}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mensalidades (últimos 12 meses)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="hidden sm:table-cell">Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Nenhuma mensalidade gerada ainda.
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="money">{formatDate(invoice.competence).slice(3)}</TableCell>
                  <TableCell className="money font-semibold">
                    {brl(invoice.amountCents - invoice.discountCents)}
                  </TableCell>
                  <TableCell className="money hidden sm:table-cell">{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
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

      {student.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{student.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
