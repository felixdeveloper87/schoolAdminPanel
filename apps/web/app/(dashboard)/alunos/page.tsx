import Link from 'next/link';
import { Plus } from 'lucide-react';
import {
  ENROLLMENT_TYPE_LABELS,
  EnrollmentType,
  STUDENT_STATUS_LABELS,
  StudentStatus,
} from '@escola/contracts';
import { apiGet } from '@/lib/server-api';
import { brl, formatAge, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StudentsFilters } from '@/components/students-filters';
import { ExportCsvButton } from '@/components/export-csv-button';
import { StudentAvatar } from '@/components/student-avatar';

interface StudentRow {
  id: string;
  fullName: string;
  birthDate: string;
  status: StudentStatus;
  enrollmentType: EnrollmentType;
  allergies: string | null;
  photoUrl: string | null;
  classroom: { id: string; name: string } | null;
  monthlyFeeCents: number | null;
  hasOverdue: boolean;
  financialGuardian: { fullName: string; phoneWhatsapp: string } | null;
}

interface StudentsResponse {
  items: StudentRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; classroomId?: string; page?: string };
}) {
  // Quadro de alunos ativos: por padrão exclui ex-alunos (que têm página própria em /ex-alunos)
  const status = searchParams.status === 'WAITLIST' ? 'WAITLIST' : 'ACTIVE';

  const query = new URLSearchParams();
  if (searchParams.q) query.set('q', searchParams.q);
  query.set('status', status);
  if (searchParams.classroomId) query.set('classroomId', searchParams.classroomId);
  query.set('page', searchParams.page ?? '1');

  const [data, classrooms] = await Promise.all([
    apiGet<StudentsResponse>(`/students?${query.toString()}`),
    apiGet<{ id: string; name: string }[]>('/classrooms'),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-sm text-muted-foreground">{data.total} aluno(s)</p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            filename="alunos.csv"
            rows={data.items.map((s) => ({
              Nome: s.fullName,
              Idade: formatAge(s.birthDate),
              Nascimento: formatDate(s.birthDate),
              Turma: s.classroom?.name ?? '',
              Período: ENROLLMENT_TYPE_LABELS[s.enrollmentType],
              Mensalidade: s.monthlyFeeCents !== null ? (s.monthlyFeeCents / 100).toFixed(2) : '',
              Status: STUDENT_STATUS_LABELS[s.status],
              Inadimplente: s.hasOverdue ? 'Sim' : 'Não',
              Responsável: s.financialGuardian?.fullName ?? '',
              WhatsApp: s.financialGuardian?.phoneWhatsapp ?? '',
            }))}
          />
          <Button asChild>
            <Link href="/alunos/novo">
              <Plus className="h-4 w-4" /> Novo aluno
            </Link>
          </Button>
        </div>
      </div>

      <StudentsFilters classrooms={classrooms} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Idade</TableHead>
              <TableHead className="hidden md:table-cell">Turma</TableHead>
              <TableHead className="hidden lg:table-cell">Período</TableHead>
              <TableHead>Mensalidade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum aluno encontrado.
                </TableCell>
              </TableRow>
            )}
            {data.items.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <StudentAvatar photoUrl={student.photoUrl} name={student.fullName} />
                    <div>
                      <Link href={`/alunos/${student.id}`} className="font-semibold hover:text-primary">
                        {student.fullName}
                      </Link>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {student.hasOverdue && <Badge variant="destructive">Inadimplente</Badge>}
                        {student.allergies && <Badge variant="warning">Alergia</Badge>}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatAge(student.birthDate)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {student.classroom?.name ?? <span className="text-muted-foreground">Sem turma</span>}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {ENROLLMENT_TYPE_LABELS[student.enrollmentType]}
                </TableCell>
                <TableCell className="money">
                  {student.monthlyFeeCents !== null ? brl(student.monthlyFeeCents) : '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      student.status === 'ACTIVE'
                        ? 'success'
                        : student.status === 'WAITLIST'
                          ? 'warning'
                          : 'secondary'
                    }
                  >
                    {STUDENT_STATUS_LABELS[student.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2 text-sm">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => {
            const q = new URLSearchParams(query);
            q.set('page', String(p));
            return (
              <Link
                key={p}
                href={`/alunos?${q.toString()}`}
                className={
                  p === data.page
                    ? 'rounded border bg-primary px-3 py-1 font-semibold text-primary-foreground'
                    : 'rounded border px-3 py-1 hover:bg-muted'
                }
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
