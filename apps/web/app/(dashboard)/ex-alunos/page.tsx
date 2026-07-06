import Link from 'next/link';
import { ENROLLMENT_TYPE_LABELS, EnrollmentType } from '@escola/contracts';
import { apiGet } from '@/lib/server-api';
import { formatAge, formatDate } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportCsvButton } from '@/components/export-csv-button';
import { StudentAvatar } from '@/components/student-avatar';

interface ExStudentRow {
  id: string;
  fullName: string;
  birthDate: string;
  enrollmentType: EnrollmentType;
  photoUrl: string | null;
  inactiveReason: string | null;
  inactiveAt: string | null;
}

interface StudentsResponse {
  items: ExStudentRow[];
  total: number;
}

export default async function ExAlunosPage() {
  const data = await apiGet<StudentsResponse>('/students?status=INACTIVE&pageSize=200');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ex-alunos</h1>
          <p className="text-sm text-muted-foreground">{data.total} desligado(s)</p>
        </div>
        <ExportCsvButton
          filename="ex-alunos.csv"
          rows={data.items.map((s) => ({
            Nome: s.fullName,
            Idade: formatAge(s.birthDate),
            Período: ENROLLMENT_TYPE_LABELS[s.enrollmentType],
            'Desligado em': s.inactiveAt ? formatDate(s.inactiveAt) : '',
            Motivo: s.inactiveReason ?? '',
          }))}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Idade</TableHead>
              <TableHead className="hidden md:table-cell">Desligado em</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum ex-aluno registrado.
                </TableCell>
              </TableRow>
            )}
            {data.items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <StudentAvatar photoUrl={s.photoUrl} name={s.fullName} />
                    <Link href={`/alunos/${s.id}`} className="font-semibold hover:text-primary">
                      {s.fullName}
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatAge(s.birthDate)}
                </TableCell>
                <TableCell className="money hidden md:table-cell">
                  {s.inactiveAt ? formatDate(s.inactiveAt) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{s.inactiveReason ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
