import { Plus } from 'lucide-react';
import { apiGet } from '@/lib/server-api';
import { brl, formatCompetence } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GoalDialog } from '@/components/goal-dialog';

interface GoalRow {
  id: string;
  month: string;
  newStudentsTarget: number;
  revenueTargetCents: number | null;
}

export default async function MetasPage() {
  const goals = await apiGet<GoalRow[]>('/goals');

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Metas</h1>
          <p className="text-sm text-muted-foreground">Metas mensais de novos alunos e faturamento</p>
        </div>
        <GoalDialog trigger={<Button><Plus className="h-4 w-4" /> Nova meta</Button>} />
      </div>

      <Card className="paper-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead>Meta de novos alunos</TableHead>
              <TableHead>Meta de faturamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhuma meta cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {goals.map((g) => {
              const month = g.month.slice(0, 7);
              return (
                <TableRow key={g.id}>
                  <TableCell className="font-semibold">{formatCompetence(month)}</TableCell>
                  <TableCell className="money">{g.newStudentsTarget}</TableCell>
                  <TableCell className="money">
                    {g.revenueTargetCents !== null ? brl(g.revenueTargetCents) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <GoalDialog
                      defaultMonth={month}
                      defaultTarget={g.newStudentsTarget}
                      defaultRevenueCents={g.revenueTargetCents}
                      trigger={
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
