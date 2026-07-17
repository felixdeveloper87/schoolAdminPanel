import Link from 'next/link';
import { Armchair, ChevronRight, GraduationCap, Pencil, Plus, School, Trash2, TriangleAlert, UsersRound } from 'lucide-react';
import { AGE_GROUP_LABELS, AgeGroup, SHIFT_LABELS, Shift } from '@escola/contracts';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ClassroomDialog } from '@/components/classroom-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { RenewBatchDialog } from '@/components/renew-batch-dialog';
import { StatCard } from '@/components/stat-card';

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
  const activeClassrooms = classrooms.filter((classroom) => classroom.active);
  const totalCapacity = activeClassrooms.reduce((total, classroom) => total + classroom.capacity, 0);
  const totalStudents = activeClassrooms.reduce((total, classroom) => total + classroom.activeCount, 0);
  const availableSeats = Math.max(0, totalCapacity - totalStudents);
  const nearCapacity = activeClassrooms.filter((classroom) => classroom.occupancyRate >= 0.85).length;
  const overallOccupancy = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-[#183b5a] px-5 py-6 text-white shadow-[0_18px_45px_rgba(24,59,90,.2)] sm:px-7 sm:py-7">
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#55a1c8]/35 blur-2xl" />
        <div aria-hidden="true" className="absolute bottom-0 right-24 h-28 w-28 rounded-full border-[18px] border-[#b5dded]/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b9dcec]">Gestão acadêmica</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-[34px]">Turmas</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#c4dce9]">
              Organize a capacidade de cada sala e acompanhe rapidamente onde ainda há vagas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.role === 'ADMIN' && (
              <RenewBatchDialog
                classrooms={classrooms.map((classroom) => ({
                  id: classroom.id,
                  name: classroom.name,
                  activeCount: classroom.activeCount,
                  capacity: classroom.capacity,
                }))}
              />
            )}
            <ClassroomDialog
              trigger={
                <Button className="h-10 rounded-xl bg-card px-4 text-primary shadow-[0_8px_20px_rgba(0,0,0,.16)] hover:bg-primary/10 hover:text-primary">
                  <Plus className="h-4 w-4" /> Nova turma
                </Button>
              }
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Turmas ativas"
          value={String(activeClassrooms.length)}
          hint={`${classrooms.length - activeClassrooms.length} inativa(s)`}
          icon={School}
          accent="primary"
        />
        <StatCard
          label="Alunos matriculados"
          value={String(totalStudents)}
          hint={`${overallOccupancy}% de ocupação geral`}
          icon={UsersRound}
          accent="success"
        />
        <StatCard
          label="Vagas disponíveis"
          value={String(availableSeats)}
          hint={`de ${totalCapacity} vagas totais`}
          icon={Armchair}
          accent="accent"
        />
        <StatCard
          label="Atenção à lotação"
          value={String(nearCapacity)}
          hint={nearCapacity ? 'turma(s) com 85% ou mais' : 'Nenhuma turma próxima do limite'}
          icon={TriangleAlert}
          accent="destructive"
        />
      </div>

      {classrooms.length === 0 ? (
        <Card className="rounded-[24px] border-dashed border-border bg-card/80 p-10 text-center shadow-none">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-display text-xl font-extrabold text-primary">Nenhuma turma cadastrada</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Crie a primeira turma para começar a organizar alunos e vagas.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classrooms.map((classroom) => {
            const occupancy = Math.round(classroom.occupancyRate * 100);
            const seatsLeft = Math.max(0, classroom.capacity - classroom.activeCount);
            const tone = !classroom.active
              ? { ring: 'bg-muted-foreground', soft: 'bg-muted/60', text: 'text-muted-foreground', bar: 'bg-muted-foreground' }
              : classroom.occupancyRate >= 1
                ? { ring: 'bg-destructive', soft: 'bg-destructive/10', text: 'text-destructive', bar: 'bg-destructive' }
                : classroom.occupancyRate >= 0.85
                  ? { ring: 'bg-accent', soft: 'bg-accent/15', text: 'text-accent-deep', bar: 'bg-accent' }
                  : { ring: 'bg-success', soft: 'bg-success/10', text: 'text-success', bar: 'bg-success' };

            return (
              <Card
                key={classroom.id}
                className="group overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.07)] transition-all hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_20px_42px_rgba(34,45,75,.11)]"
              >
                <div className="flex items-start justify-between gap-3 p-5 pb-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone.soft} ${tone.text}`}>
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-xl font-extrabold text-foreground">{classroom.name}</h2>
                      <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                        {AGE_GROUP_LABELS[classroom.ageGroup]} · {SHIFT_LABELS[classroom.shift]}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!classroom.active && <Badge variant="secondary" className="hidden sm:inline-flex">Inativa</Badge>}
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
                        <Button variant="ghost" size="icon" aria-label={`Editar ${classroom.name}`} className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    {user.role === 'ADMIN' && (
                      <DeleteConfirmDialog
                        url={`/api/classrooms/${classroom.id}`}
                        title="Excluir turma"
                        description={`A turma ${classroom.name} será excluída. Só é possível excluir turmas sem matrículas vinculadas — se houver histórico, desative a turma em vez de excluí-la.`}
                        confirmLabel="Excluir turma"
                        trigger={
                          <Button variant="ghost" size="icon" aria-label={`Excluir ${classroom.name}`} className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>

                <div className="mx-5 rounded-2xl border border-border bg-muted/60 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Ocupação</p>
                      <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">
                        {classroom.activeCount}<span className="text-base text-muted-foreground">/{classroom.capacity}</span>
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${tone.soft} ${tone.text}`}>{occupancy}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
                    <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${Math.min(100, occupancy)}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {classroom.active ? (seatsLeft ? `${seatsLeft} vaga(s) disponível(is)` : 'Turma completa') : 'Turma inativa'}
                  </p>
                </div>

                <div className="p-5 pt-4">
                  {classroom.students.length > 0 ? (
                    <details className="group/list">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-primary marker:content-none">
                        <span>Alunos matriculados ({classroom.students.length})</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-open/list:rotate-90" />
                      </summary>
                      <ul className="mt-3 space-y-1 border-t border-border pt-3">
                        {classroom.students.map((student) => (
                          <li key={student.id}>
                            <Link href={`/alunos/${student.id}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted/60 hover:text-primary">
                              <span className="truncate">{student.fullName}</span>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <p className="text-sm font-semibold text-muted-foreground">Nenhum aluno matriculado.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
