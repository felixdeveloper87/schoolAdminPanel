import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Pencil,
  Plus,
  ReceiptText,
  Repeat2,
  Tags,
} from 'lucide-react';
import { apiGet } from '@/lib/server-api';
import { addMonths, brl, currentCompetence, formatCompetence, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  searchParams: { competence?: string; categoryId?: string; new?: string };
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

  const recurringCents = data.items.filter((expense) => expense.recurring).reduce((sum, expense) => sum + expense.amountCents, 0);
  const topCategory = data.summaryByCategory[0] ?? null;
  const recurringRate = data.totalCents > 0 ? Math.round((recurringCents / data.totalCents) * 100) : 0;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-[#432144] px-5 py-6 text-white shadow-[0_18px_45px_rgba(67,33,68,.2)] sm:px-7 sm:py-7">
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#dc7181]/30 blur-2xl" />
        <div aria-hidden="true" className="absolute bottom-0 right-24 h-28 w-28 rounded-full border-[18px] border-border/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#f0c5d3]">Financeiro escolar</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-[34px]">Despesas</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#e9cbd6]">
              Entenda onde os recursos estão sendo investidos e mantenha os custos sob controle.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-inner shadow-black/10">
              <Link
                href={`/despesas?competence=${addMonths(competence, -1)}${searchParams.categoryId ? `&categoryId=${searchParams.categoryId}` : ''}`}
                className="grid h-9 w-9 place-items-center rounded-xl text-white transition hover:bg-white/15"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <span className="flex min-w-[9rem] items-center justify-center gap-2 text-center text-sm font-extrabold">
                <CalendarDays className="h-4 w-4 text-[#f4c8d8]" /> {formatCompetence(competence)}
              </span>
              <Link
                href={`/despesas?competence=${addMonths(competence, 1)}${searchParams.categoryId ? `&categoryId=${searchParams.categoryId}` : ''}`}
                className="grid h-9 w-9 place-items-center rounded-xl text-white transition hover:bg-white/15"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <ExpenseDialog
              categories={categories}
              defaultOpen={searchParams.new === '1'}
              trigger={
                <Button className="h-10 rounded-xl bg-card px-4 text-destructive shadow-[0_8px_20px_rgba(0,0,0,.16)] hover:bg-destructive/10 hover:text-destructive">
                  <Plus className="h-4 w-4" /> Nova despesa
                </Button>
              }
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total do mês"
          value={brl(data.totalCents)}
          hint={`${data.total} lançamento(s)`}
          icon={CircleDollarSign}
          accent="destructive"
          money
        />
        <StatCard
          label="Despesas recorrentes"
          value={brl(recurringCents)}
          hint={data.totalCents > 0 ? `${recurringRate}% do total mensal` : 'Sem despesas recorrentes'}
          icon={Repeat2}
          accent="primary"
          money
        />
        <StatCard
          label="Maior categoria"
          value={topCategory ? topCategory.name : '—'}
          hint={topCategory ? `${brl(topCategory.totalCents)} · ${topCategory.count} lançamento(s)` : 'Sem despesas neste mês'}
          icon={Tags}
          accent="accent"
        />
        <StatCard
          label="Categorias com gasto"
          value={String(data.summaryByCategory.length)}
          hint={`de ${categories.length} categorias cadastradas`}
          icon={ReceiptText}
          accent="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
          <CardHeader className="border-b border-border p-5">
            <CardTitle className="text-foreground">Despesas por categoria</CardTitle>
            <CardDescription>{formatCompetence(competence)} · distribuição dos custos</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <ExpensesByCategoryChart data={data.summaryByCategory} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
          <CardHeader className="border-b border-border p-5">
            <CardTitle className="text-foreground">Tendência de despesas</CardTitle>
            <CardDescription>Comparativo dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <ExpensesTrendChart data={trend} />
          </CardContent>
        </Card>
      </div>

      {data.summaryByCategory.length > 0 && (
        <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-extrabold text-foreground">Resumo por categoria</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Participação de cada tipo de despesa no mês.</p>
            </div>
            <span className="hidden rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive sm:inline">{data.summaryByCategory.length} categorias</span>
          </div>
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Lançamentos  </TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">% do mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.summaryByCategory.map((category) => (
                <TableRow key={category.categoryId} className="hover:bg-destructive/10">
                  <TableCell className="font-semibold text-muted-foreground">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: category.colorHex }} />
                    {category.name}
                  </TableCell>
                  <TableCell className="money text-muted-foreground">{category.count}</TableCell>
                  <TableCell className="money font-semibold text-foreground">{brl(category.totalCents)}</TableCell>
                  <TableCell className="money text-right font-semibold text-muted-foreground">
                    {data.totalCents > 0 ? `${Math.round((category.totalCents / data.totalCents) * 100)}%` : '0%'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ExpensesCategoryFilter categories={categories} />
        <ExportCsvButton
          filename={`despesas-${competence}.csv`}
          rows={data.items.map((expense) => ({
            Descrição: expense.description,
            Categoria: expense.category.name,
            Valor: (expense.amountCents / 100).toFixed(2),
            Data: formatDate(expense.expenseDate),
            Fornecedor: expense.supplier ?? '',
            Recorrente: expense.recurring ? 'Sim' : 'Não',
          }))}
        />
      </div>

      <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-foreground">Lançamentos</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{data.total} despesa(s) encontrada(s) nesta competência.</p>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-muted/60">
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
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  Nenhuma despesa neste mês.
                </TableCell>
              </TableRow>
            )}
            {data.items.map((expense) => (
              <TableRow key={expense.id} className="hover:bg-destructive/10">
                <TableCell>
                  <span className="font-bold text-muted-foreground">{expense.description}</span>
                  {expense.supplier && <p className="text-xs text-muted-foreground">{expense.supplier}</p>}
                  {expense.recurring && (
                    <Badge variant="secondary" className="mt-1 border-border bg-primary/10 text-primary">
                      <Repeat2 className="mr-1 h-3 w-3" /> Recorrente
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                    style={{ backgroundColor: expense.category.colorHex ?? '#8A8F98' }}
                  />
                  <span className="font-semibold text-muted-foreground">{expense.category.name}</span>
                </TableCell>
                <TableCell className="money font-semibold text-foreground">{brl(expense.amountCents)}</TableCell>
                <TableCell className="money hidden text-muted-foreground md:table-cell">{formatDate(expense.expenseDate)}</TableCell>
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
                        <Button variant="ghost" size="sm" aria-label={`Editar ${expense.description}`} className="rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-muted-foreground">
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
