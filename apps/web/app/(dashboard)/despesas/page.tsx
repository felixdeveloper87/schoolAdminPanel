import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat } from 'lucide-react';
import { apiGet } from '@/lib/server-api';
import { addMonths, brl, currentCompetence, formatCompetence, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/stat-card';
import { ExpenseDialog, DeleteExpenseButton } from '@/components/expense-dialog';
import { ExportCsvButton } from '@/components/export-csv-button';
import { ExpensesCategoryFilter } from '@/components/expenses-filters';
import { ExpensesByCategoryChart } from '@/components/charts/dashboard-charts';
import { ExpensesTrendChart } from '@/components/charts/expenses-trend-chart';

interface ExpenseRow {
  id: string;
  description: string;
  amountCents: number;
  expenseDate: string;
  supplier: string | null;
  recurring: boolean;
  notes: string | null;
  category: { id: string; name: string; colorHex: string | null };
}

interface CategorySummary {
  categoryId: string;
  name: string;
  colorHex: string;
  totalCents: number;
  count: number;
}

interface ExpensesResponse {
  items: ExpenseRow[];
  total: number;
  totalCents: number;
  summaryByCategory: CategorySummary[];
}

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: { competence?: string; categoryId?: string };
}) {
  const competence = /^\d{4}-\d{2}$/.test(searchParams.competence ?? '')
    ? searchParams.competence!
    : currentCompetence();

  const query = new URLSearchParams({ competence });
  if (searchParams.categoryId) query.set('categoryId', searchParams.categoryId);

  const [data, categories, trend] = await Promise.all([
    apiGet<ExpensesResponse>(`/expenses?${query.toString()}`),
    apiGet<{ id: string; name: string }[]>('/expense-categories'),
    apiGet<{ competence: string; totalCents: number }[]>('/expenses/monthly-trend?months=6'),
  ]);

  const recurringCents = data.items.filter((e) => e.recurring).reduce((sum, e) => sum + e.amountCents, 0);
  const topCategory = data.summaryByCategory[0] ?? null;

  return (
    <div className="space-y-7">
      <div className="paper-panel overflow-hidden">
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-end md:p-6">
          <div>
            <p className="page-kicker">Financeiro</p>
            <h1 className="page-title mt-1">Despesas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {formatCompetence(competence)} · {data.total} lançamento(s) — acompanhe custos por categoria e a
              tendência dos últimos meses.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
            <Link href={`/despesas?competence=${addMonths(competence, -1)}${searchParams.categoryId ? `&categoryId=${searchParams.categoryId}` : ''}`} className="rounded-md border bg-card p-2 shadow-sm hover:bg-muted" aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="min-w-[9rem] text-center font-bold">{formatCompetence(competence)}</span>
            <Link href={`/despesas?competence=${addMonths(competence, 1)}${searchParams.categoryId ? `&categoryId=${searchParams.categoryId}` : ''}`} className="rounded-md border bg-card p-2 shadow-sm hover:bg-muted" aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Link>
            </div>
            <ExpenseDialog
              categories={categories}
              trigger={
                <Button className="w-full md:hidden">
                  <Plus className="h-4 w-4" /> Nova despesa
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total do mês" value={brl(data.totalCents)} hint={`${data.total} lançamento(s)`} accent="destructive" money />
        <StatCard
          label="Recorrentes"
          value={brl(recurringCents)}
          hint={data.totalCents > 0 ? `${Math.round((recurringCents / data.totalCents) * 100)}% do total` : 'Sem despesas'}
          accent="primary"
          money
        />
        <StatCard
          label="Maior categoria"
          value={topCategory ? topCategory.name : '—'}
          hint={topCategory ? brl(topCategory.totalCents) : 'Sem despesas neste mês'}
          accent="accent"
        />
        <StatCard label="Categorias com gasto" value={String(data.summaryByCategory.length)} hint={`de ${categories.length} cadastradas`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="paper-panel">
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
            <CardDescription>{formatCompetence(competence)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensesByCategoryChart data={data.summaryByCategory} />
          </CardContent>
        </Card>
        <Card className="paper-panel">
          <CardHeader>
            <CardTitle>Tendência de despesas</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensesTrendChart data={trend} />
          </CardContent>
        </Card>
      </div>

      {data.summaryByCategory.length > 0 && (
        <Card className="paper-panel overflow-hidden">
          <CardHeader>
            <CardTitle>Resumo por categoria</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Lançamentos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">% do mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.summaryByCategory.map((c) => (
                  <TableRow key={c.categoryId}>
                    <TableCell>
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: c.colorHex }} />
                      {c.name}
                    </TableCell>
                    <TableCell className="money">{c.count}</TableCell>
                    <TableCell className="money font-semibold">{brl(c.totalCents)}</TableCell>
                    <TableCell className="money text-right">
                      {data.totalCents > 0 ? `${Math.round((c.totalCents / data.totalCents) * 100)}%` : '0%'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ExpensesCategoryFilter categories={categories} />
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
          <div className="hidden md:block">
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
      </div>

      <Card className="paper-panel overflow-hidden">
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
                    <Badge variant="secondary" className="mt-0.5">
                      <Repeat className="mr-1 h-3 w-3" /> Recorrente
                    </Badge>
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
                  <div className="flex items-center justify-end gap-1">
                    <ExpenseDialog
                      categories={categories}
                      expense={{
                        id: expense.id,
                        categoryId: expense.category.id,
                        description: expense.description,
                        amountCents: expense.amountCents,
                        expenseDate: expense.expenseDate,
                        supplier: expense.supplier,
                        recurring: expense.recurring,
                        notes: expense.notes,
                      }}
                      trigger={
                        <Button variant="ghost" size="sm" aria-label="Editar despesa">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DeleteExpenseButton expenseId={expense.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
