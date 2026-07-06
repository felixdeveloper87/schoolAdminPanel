import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { apiGet } from '@/lib/server-api';
import { addMonths, brl, currentCompetence, formatCompetence, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExpenseDialog, DeleteExpenseButton } from '@/components/expense-dialog';
import { ExportCsvButton } from '@/components/export-csv-button';

interface ExpenseRow {
  id: string;
  description: string;
  amountCents: number;
  expenseDate: string;
  supplier: string | null;
  recurring: boolean;
  category: { id: string; name: string; colorHex: string | null };
}

interface ExpensesResponse {
  items: ExpenseRow[];
  total: number;
  totalCents: number;
}

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: { competence?: string };
}) {
  const competence = /^\d{4}-\d{2}$/.test(searchParams.competence ?? '')
    ? searchParams.competence!
    : currentCompetence();

  const [data, categories] = await Promise.all([
    apiGet<ExpensesResponse>(`/expenses?competence=${competence}`),
    apiGet<{ id: string; name: string }[]>('/expense-categories'),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Despesas</h1>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <Link href={`/despesas?competence=${addMonths(competence, -1)}`} className="rounded p-1 hover:bg-muted" aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="font-semibold">{formatCompetence(competence)}</span>
            <Link href={`/despesas?competence=${addMonths(competence, 1)}`} className="rounded p-1 hover:bg-muted" aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Link>
            <span className="money ml-2 font-semibold text-destructive">Total: {brl(data.totalCents)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            filename={`despesas-${competence}.csv`}
            rows={data.items.map((e) => ({
              Descrição: e.description,
              Categoria: e.category.name,
              Valor: (e.amountCents / 100).toFixed(2),
              Data: formatDate(e.expenseDate),
              Fornecedor: e.supplier ?? '',
              Recorrente: e.recurring ? 'Sim' : 'Não',
            }))}
          />
          <ExpenseDialog
            categories={categories}
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Nova despesa
              </Button>
            }
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhuma despesa neste mês.
                </TableCell>
              </TableRow>
            )}
            {data.items.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  <span className="font-semibold">{expense.description}</span>
                  {expense.supplier && (
                    <p className="text-xs text-muted-foreground">{expense.supplier}</p>
                  )}
                  {expense.recurring && (
                    <Badge variant="secondary" className="mt-0.5">Recorrente</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span
                    className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                    style={{ backgroundColor: expense.category.colorHex ?? '#8A8F98' }}
                  />
                  {expense.category.name}
                </TableCell>
                <TableCell className="money font-semibold">{brl(expense.amountCents)}</TableCell>
                <TableCell className="money hidden md:table-cell">{formatDate(expense.expenseDate)}</TableCell>
                <TableCell className="text-right">
                  <DeleteExpenseButton expenseId={expense.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
