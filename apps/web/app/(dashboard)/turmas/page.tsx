import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { AGE_GROUP_LABELS, AgeGroup, SHIFT_LABELS, Shift } from '@escola/contracts';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClassroomDialog } from '@/components/classroom-dialog';
import { RenewBatchDialog } from '@/components/renew-batch-dialog';

interface ClassroomRow {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  shift: Shift;
  capacity: number;
  active: boolean;
  activeCount: number;
  occupancyRate: number;
  students: { id: string; fullName: string }[];
}

export default async function TurmasPage() {
  const [user, classrooms] = await Promise.all([
    getSessionUser(),
    apiGet<ClassroomRow[]>('/classrooms'),
  ]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Turmas</h1>
          <p className="text-sm text-muted-foreground">
            {classrooms.filter((c) => c.active).length} turma(s) ativa(s)
          </p>
        </div>
        <div className="flex gap-2">
          {user.role === 'ADMIN' && (
            <RenewBatchDialog
              classrooms={classrooms.map((c) => ({
                id: c.id,
                name: c.name,
                activeCount: c.activeCount,
                capacity: c.capacity,
              }))}
            />
          )}
          <ClassroomDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Nova turma
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classrooms.map((classroom) => (
          <Card
            key={classroom.id}
            className="notebook-card paper-panel transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{
              ['--notebook-accent' as string]: classroom.active ? 'var(--primary)' : 'var(--muted-foreground)',
            }}
          >
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{classroom.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {AGE_GROUP_LABELS[classroom.ageGroup]} · {SHIFT_LABELS[classroom.shift]}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!classroom.active && <Badge variant="secondary">Inativa</Badge>}
                <ClassroomDialog
                  classroom={{
                    id: classroom.id,
                    name: classroom.name,
                    ageGroup: classroom.ageGroup,
                    shift: classroom.shift,
                    capacity: classroom.capacity,
                    active: classroom.active,
                  }}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Editar turma">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Ocupação</span>
                  <span className="money font-semibold">
                    {classroom.activeCount}/{classroom.capacity} ({Math.round(classroom.occupancyRate * 100)}%)
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      classroom.occupancyRate >= 1
                        ? 'h-full bg-destructive'
                        : classroom.occupancyRate >= 0.85
                          ? 'h-full bg-accent'
                          : 'h-full bg-success'
                    }
                    style={{ width: `${Math.min(100, Math.round(classroom.occupancyRate * 100))}%` }}
                  />
                </div>
              </div>
              {classroom.students.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-primary">
                    Ver alunos ({classroom.students.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {classroom.students.map((s) => (
                      <li key={s.id}>
                        <Link href={`/alunos/${s.id}`} className="hover:text-primary">
                          {s.fullName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
