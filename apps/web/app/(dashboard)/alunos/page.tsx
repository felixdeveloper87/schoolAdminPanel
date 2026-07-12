import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Plus, UserRoundSearch, Users } from 'lucide-react';
import {
  ENROLLMENT_TYPE_LABELS,
  EnrollmentType,
  STUDENT_STATUS_LABELS,
  StudentStatus,
} from '@escola/contracts';
import { apiGet } from '@/lib/server-api';
import { brl, formatAge, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
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
  inactiveReason: string | null;
  inactiveAt: string | null;
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
  const status = searchParams.status === 'WAITLIST' || searchParams.status === 'INACTIVE'
    ? searchParams.status
    : 'ACTIVE';

  const query = new URLSearchParams();
  if (searchParams.q) query.set('q', searchParams.q);
  query.set('status', status);
  if (searchParams.classroomId) query.set('classroomId', searchParams.classroomId);
  query.set('page', searchParams.page ?? '1');

  const [data, classrooms, activeSummary, waitlistSummary, inactiveSummary] = await Promise.all([
    apiGet<StudentsResponse>(`/students?${query.toString()}`),
    apiGet<{ id: string; name: string }[]>('/classrooms'),
    apiGet<StudentsResponse>('/students?status=ACTIVE&pageSize=1'),
    apiGet<StudentsResponse>('/students?status=WAITLIST&pageSize=1'),
    apiGet<StudentsResponse>('/students?status=INACTIVE&pageSize=1'),
  ]);

  const selectedClassroom = classrooms.find((classroom) => classroom.id === searchParams.classroomId);
  const resultLabel = status === 'ACTIVE' ? 'alunos ativos' : status === 'WAITLIST' ? 'alunos na lista de espera' : 'ex-alunos';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6857ef]">Gestão acadêmica</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[#10192a]">Alunos</h1>
          <p className="mt-1.5 text-sm text-[#68758b]">Consulte cadastros, turmas e situação financeira em um só lugar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportCsvButton
            filename={`alunos-${status.toLowerCase()}.csv`}
            rows={data.items.map((student) => ({
              Nome: student.fullName,
              Idade: formatAge(student.birthDate),
              Nascimento: formatDate(student.birthDate),
              Turma: student.classroom?.name ?? '',
              Período: ENROLLMENT_TYPE_LABELS[student.enrollmentType],
              Mensalidade: student.monthlyFeeCents !== null ? (student.monthlyFeeCents / 100).toFixed(2) : '',
              Status: STUDENT_STATUS_LABELS[student.status],
              Inadimplente: student.hasOverdue ? 'Sim' : 'Não',
              Responsável: student.financialGuardian?.fullName ?? '',
              WhatsApp: student.financialGuardian?.phoneWhatsapp ?? '',
            }))}
          />
          <Link
            href="/alunos/novo"
            className={buttonVariants({ className: 'h-10 rounded-xl bg-gradient-to-r from-[#6554e8] to-[#806bf5] px-4 shadow-[0_8px_20px_rgba(101,84,232,.22)]' })}
          >
            <Plus className="h-4 w-4" /> Novo aluno
          </Link>
        </div>
      </div>

      <StudentsFilters
        classrooms={classrooms}
        activeCount={activeSummary.total}
        waitlistCount={waitlistSummary.total}
        inactiveCount={inactiveSummary.total}
      />

      <Card className="overflow-hidden rounded-[22px] border-[#dce6f0] bg-white/95 shadow-[0_14px_40px_rgba(35,49,79,.07)]">
        <div className="flex flex-col gap-2 border-b border-[#e3eaf2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef2ff] text-[#5c63d8]">
              <Users className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="font-display text-lg font-extrabold text-[#172033]">
                {status === 'INACTIVE' ? 'Ex-alunos' : 'Lista de alunos'}
              </h2>
              <p className="text-xs text-[#778399]">
                {data.total} {resultLabel}
                {selectedClassroom ? ` em ${selectedClassroom.name}` : ''}
              </p>
            </div>
          </div>
          {searchParams.q && (
            <p className="text-xs text-[#778399]">
              Resultados para <strong className="text-[#313d52]">“{searchParams.q}”</strong>
            </p>
          )}
        </div>

        <Table>
          <TableHeader className="bg-[#f7f9fc]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12 pl-5 tracking-[0.08em]">Aluno</TableHead>
              <TableHead className="hidden h-12 tracking-[0.08em] md:table-cell">Turma</TableHead>
              <TableHead className="hidden h-12 tracking-[0.08em] lg:table-cell">Idade</TableHead>
              <TableHead className="hidden h-12 tracking-[0.08em] xl:table-cell">Período</TableHead>
              <TableHead className="hidden h-12 tracking-[0.08em] sm:table-cell">Mensalidade</TableHead>
              <TableHead className="h-12 tracking-[0.08em]">Situação</TableHead>
              <TableHead className="h-12 w-14" aria-label="Ações" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f0f3f8] text-[#7f8ba0]">
                    <UserRoundSearch className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-bold text-[#27344a]">Nenhum aluno encontrado</p>
                  <p className="mt-1 text-xs text-[#7a869b]">Tente alterar a busca ou os filtros selecionados.</p>
                </TableCell>
              </TableRow>
            )}
            {data.items.map((student) => (
              <TableRow key={student.id} className="group border-[#e8edf3] hover:bg-[#f8faff]">
                <TableCell className="py-4 pl-5">
                  <div className="flex min-w-[210px] items-center gap-3">
                    <StudentAvatar photoUrl={student.photoUrl} name={student.fullName} size="md" />
                    <div className="min-w-0">
                      <Link href={`/alunos/${student.id}`} className="block truncate text-sm font-extrabold text-[#182238] hover:text-[#5b59d6]">
                        {student.fullName}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px] text-[#7a869a]">
                        {student.financialGuardian?.fullName ? `Resp. ${student.financialGuardian.fullName}` : 'Sem responsável financeiro'}
                      </p>
                      {student.status === 'INACTIVE' && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-[#8a6670]">
                          {student.inactiveAt ? `Desligado em ${formatDate(student.inactiveAt)}${student.inactiveReason ? ` · ${student.inactiveReason}` : ''}` : student.inactiveReason ?? 'Aluno desligado'}
                        </p>
                      )}
                      <div className="mt-1 flex gap-1 md:hidden">
                        <span className="text-[10px] text-[#657189]">{student.classroom?.name ?? 'Sem turma'}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {student.classroom ? (
                    <span className="inline-flex rounded-lg bg-[#eef2f8] px-2.5 py-1 text-xs font-bold text-[#526078]">{student.classroom.name}</span>
                  ) : (
                    <span className="text-xs text-[#9aa4b5]">Sem turma</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-[#667389] lg:table-cell">{formatAge(student.birthDate)}</TableCell>
                <TableCell className="hidden text-sm text-[#667389] xl:table-cell">{ENROLLMENT_TYPE_LABELS[student.enrollmentType]}</TableCell>
                <TableCell className="money hidden font-semibold text-[#27344a] sm:table-cell">
                  {student.monthlyFeeCents !== null ? brl(student.monthlyFeeCents) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1.5">
                    <Badge
                      variant={student.status === 'ACTIVE' ? 'success' : student.status === 'WAITLIST' ? 'warning' : 'secondary'}
                      className="whitespace-nowrap text-[10px]"
                    >
                      {STUDENT_STATUS_LABELS[student.status]}
                    </Badge>
                    {student.hasOverdue && <Badge variant="destructive" className="whitespace-nowrap text-[10px]">Inadimplente</Badge>}
                    {student.allergies && <Badge variant="warning" className="hidden whitespace-nowrap text-[10px] lg:inline-flex">Alergia</Badge>}
                  </div>
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Link
                    href={`/alunos/${student.id}`}
                    aria-label={`Abrir ficha de ${student.fullName}`}
                    className="inline-grid h-9 w-9 place-items-center rounded-xl text-[#8792a5] transition-all group-hover:bg-[#ecefff] group-hover:text-[#5b59d6]"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3eaf2] px-5 py-4 text-xs text-[#758196]">
            <span>Página {data.page} de {data.totalPages}</span>
            <div className="flex items-center gap-1.5">
              {data.page > 1 && (
                <Link
                  href={`/alunos?${new URLSearchParams({ ...Object.fromEntries(query), page: String(data.page - 1) }).toString()}`}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#d8e1eb] px-3 font-bold text-[#536078] hover:bg-[#f4f6fa]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </Link>
              )}
              {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((page) => {
                const pageQuery = new URLSearchParams(query);
                pageQuery.set('page', String(page));
                return (
                  <Link
                    key={page}
                    href={`/alunos?${pageQuery.toString()}`}
                    className={
                      page === data.page
                        ? 'grid h-9 min-w-9 place-items-center rounded-lg bg-[#6554e8] px-2 font-extrabold text-white'
                        : 'grid h-9 min-w-9 place-items-center rounded-lg px-2 font-bold text-[#667389] hover:bg-[#f0f3f8]'
                    }
                  >
                    {page}
                  </Link>
                );
              })}
              {data.page < data.totalPages && (
                <Link
                  href={`/alunos?${new URLSearchParams({ ...Object.fromEntries(query), page: String(data.page + 1) }).toString()}`}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#d8e1eb] px-3 font-bold text-[#536078] hover:bg-[#f4f6fa]"
                >
                  Próxima <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
