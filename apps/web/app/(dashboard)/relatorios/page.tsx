import Link from 'next/link';
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { addMonths, brl, currentCompetence, formatCompetence, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportCsvButton } from '@/components/export-csv-button';

interface DefaulterRow {
  student: { id: string; fullName: string };
  classroom: { id: string; name: string };
  totalOwedCents: number;
  invoiceCount: number;
  oldestDueDate: string;
  financialGuardian: { fullName: string; phoneWhatsapp: string } | null;
}

interface DreData {
  revenueCents: number;
  expensesByCategory: { categoryId: string; categoryName: string; colorHex: string | null; totalCents: number }[];
  totalExpensesCents: number;
  resultCents: number;
}

const whatsappMessage = (name: string, totalCents: number) =>
  encodeURIComponent(
    `Olá! Passando para lembrar sobre a mensalidade em aberto de ${name}, no valor de ${brl(totalCents)}. Qualquer dúvida, estamos à disposição.`,
  );

export default async function RelatoriosPage({ searchParams }: { searchParams: { month?: string } }) {
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? '') ? searchParams.month! : currentCompetence();
  const user = await getSessionUser();
  const isAdmin = user.role === 'ADMIN';

  const [defaulters, dre] = await Promise.all([
    apiGet<DefaulterRow[]>('/reports/defaulters'),
    isAdmin ? apiGet<DreData>(`/reports/dre?month=${month}`) : Promise.resolve(null),
  ]);

  const defaultersCsvRows = defaulters.map((d) => ({
    Aluno: d.student.fullName,
    Turma: d.classroom.name,
    'Total devido': (d.totalOwedCents / 100).toFixed(2),
    'Nº mensalidades': d.invoiceCount,
    'Vencimento mais antigo': formatDate(d.oldestDueDate),
    Responsável: d.financialGuardian?.fullName ?? '',
    WhatsApp: d.financialGuardian?.phoneWhatsapp ?? '',
  }));

  return (
    <div className="space-y-7">
      <h1 className="page-title">Relatórios</h1>

      <Tabs defaultValue="inadimplencia">
        <TabsList>
          <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
          {isAdmin && <TabsTrigger value="dre">DRE</TabsTrigger>}
        </TabsList>

        <TabsContent value="inadimplencia" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {defaulters.length} aluno(s) com mensalidade atrasada
            </p>
            <ExportCsvButton filename="inadimplencia.csv" rows={defaultersCsvRows} />
          </div>
          <Card className="paper-panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="hidden sm:table-cell">Turma</TableHead>
                  <TableHead>Total devido</TableHead>
                  <TableHead className="hidden md:table-cell">Mais antiga</TableHead>
                  <TableHead className="text-right">Cobrar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaulters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum aluno inadimplente. 🎉
                    </TableCell>
                  </TableRow>
                )}
                {defaulters.map((d) => (
                  <TableRow key={d.student.id}>
                    <TableCell>
                      <Link href={`/alunos/${d.student.id}`} className="font-semibold hover:text-primary">
                        {d.student.fullName}
                      </Link>
                      <p className="text-xs text-muted-foreground">{d.invoiceCount} mensalidade(s)</p>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {d.classroom.name}
                    </TableCell>
                    <TableCell className="money font-semibold text-destructive">
                      {brl(d.totalOwedCents)}
                    </TableCell>
                    <TableCell className="money hidden md:table-cell">{formatDate(d.oldestDueDate)}</TableCell>
                    <TableCell className="text-right">
                      {d.financialGuardian && (
                        <a
                          href={`https://wa.me/55${d.financialGuardian.phoneWhatsapp}?text=${whatsappMessage(d.student.fullName, d.totalOwedCents)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-success hover:underline"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {isAdmin && dre && (
          <TabsContent value="dre" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Link href={`/relatorios?month=${addMonths(month, -1)}`} className="rounded p-1 hover:bg-muted" aria-label="Mês anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                <span className="font-semibold">{formatCompetence(month)}</span>
                <Link href={`/relatorios?month=${addMonths(month, 1)}`} className="rounded p-1 hover:bg-muted" aria-label="Próximo mês">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="notebook-card paper-panel" style={{ ['--notebook-accent' as string]: 'var(--success)' }}>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Receita recebida</p>
                  <p className="money mt-1 text-xl font-bold text-success">{brl(dre.revenueCents)}</p>
                </CardContent>
              </Card>
              <Card className="notebook-card paper-panel" style={{ ['--notebook-accent' as string]: 'var(--destructive)' }}>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Despesas</p>
                  <p className="money mt-1 text-xl font-bold text-destructive">{brl(dre.totalExpensesCents)}</p>
                </CardContent>
              </Card>
              <Card
                className="notebook-card paper-panel"
                style={{ ['--notebook-accent' as string]: dre.resultCents >= 0 ? 'var(--success)' : 'var(--destructive)' }}
              >
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Resultado</p>
                  <p className={`money mt-1 text-xl font-bold ${dre.resultCents >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {brl(dre.resultCents)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="paper-panel overflow-hidden">
              <CardHeader>
                <CardTitle>Despesas por categoria</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dre.expensesByCategory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                          Nenhuma despesa neste mês.
                        </TableCell>
                      </TableRow>
                    )}
                    {dre.expensesByCategory.map((c) => (
                      <TableRow key={c.categoryId}>
                        <TableCell>
                          <span
                            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                            style={{ backgroundColor: c.colorHex ?? '#8A8F98' }}
                          />
                          {c.categoryName}
                        </TableCell>
                        <TableCell className="money text-right font-semibold">{brl(c.totalCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
