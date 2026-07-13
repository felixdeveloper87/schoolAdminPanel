import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileBarChart,
  MessageCircle,
  ReceiptText,
  UsersRound,
} from 'lucide-react';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { addMonths, brl, currentCompetence, formatCompetence, formatDate } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportCsvButton } from '@/components/export-csv-button';
import { PrintButton } from '@/components/print-button';
import { StatCard } from '@/components/stat-card';

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

  const totalOwedCents = defaulters.reduce((total, defaulter) => total + defaulter.totalOwedCents, 0);
  const overdueInvoiceCount = defaulters.reduce((total, defaulter) => total + defaulter.invoiceCount, 0);
  const reachableCount = defaulters.filter((defaulter) => defaulter.financialGuardian).length;
  const priorityDefaulter = defaulters[0] ?? null;
  const defaultersCsvRows = defaulters.map((defaulter) => ({
    Aluno: defaulter.student.fullName,
    Turma: defaulter.classroom.name,
    'Total devido': (defaulter.totalOwedCents / 100).toFixed(2),
    'Nº mensalidades': defaulter.invoiceCount,
    'Vencimento mais antigo': formatDate(defaulter.oldestDueDate),
    Responsável: defaulter.financialGuardian?.fullName ?? '',
    WhatsApp: defaulter.financialGuardian?.phoneWhatsapp ?? '',
  }));

  return (
    <div className="space-y-7">
      <div className="hidden print:block">
        <h1 className="font-display text-2xl font-extrabold text-foreground">Relatório — {formatCompetence(month)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerado pelo painel administrativo</p>
      </div>

      <section className="relative overflow-hidden rounded-[28px] bg-[#303d68] px-5 py-6 text-white shadow-[0_18px_45px_rgba(48,61,104,.22)] print:hidden sm:px-7 sm:py-7">
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#7c85ed]/35 blur-2xl" />
        <div aria-hidden="true" className="absolute bottom-0 right-24 h-28 w-28 rounded-full border-[18px] border-[#c4ccff]/10" />
        <div className="relative">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#c4ccfa]">Visão financeira</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-[34px]">Relatórios</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#d0d7f1]">
            Acompanhe a inadimplência, priorize contatos e analise o resultado financeiro do período.
          </p>
        </div>
      </section>

      <Tabs defaultValue="inadimplencia">
        <TabsList className="rounded-xl border-border/60 bg-card/90 p-1.5 shadow-[0_6px_18px_rgba(40,55,90,.08)] print:hidden">
          <TabsTrigger value="inadimplencia" className="rounded-lg px-4 py-2 data-[state=active]:bg-[#364978]">
            Inadimplência
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="dre" className="rounded-lg px-4 py-2 data-[state=active]:bg-[#364978]">
              DRE
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="inadimplencia" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Alunos em atraso"
              value={String(defaulters.length)}
              hint={`${overdueInvoiceCount} mensalidade(s) vencida(s)`}
              icon={UsersRound}
              accent="destructive"
            />
            <StatCard
              label="Total em aberto"
              value={brl(totalOwedCents)}
              hint="valor a ser recuperado"
              icon={CircleDollarSign}
              accent="destructive"
              money
            />
            <StatCard
              label="Contatos disponíveis"
              value={String(reachableCount)}
              hint={defaulters.length ? `${Math.round((reachableCount / defaulters.length) * 100)}% com responsável financeiro` : 'Sem cobranças pendentes'}
              icon={MessageCircle}
              accent="success"
            />
            <StatCard
              label="Maior prioridade"
              value={priorityDefaulter ? brl(priorityDefaulter.totalOwedCents) : '—'}
              hint={priorityDefaulter ? priorityDefaulter.student.fullName : 'Nenhum atraso registrado'}
              icon={AlertTriangle}
              accent="accent"
              money={Boolean(priorityDefaulter)}
            />
          </div>

          <Card className="overflow-hidden rounded-[24px] border-destructive/20 bg-gradient-to-r from-card to-destructive/10 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(75,45,60,.07)]">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Contato prioritário</p>
                  <h2 className="mt-0.5 font-display text-lg font-extrabold text-destructive">
                    {priorityDefaulter ? priorityDefaulter.student.fullName : 'Nenhuma cobrança em aberto'}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {priorityDefaulter
                      ? `${brl(priorityDefaulter.totalOwedCents)} · vencimento mais antigo em ${formatDate(priorityDefaulter.oldestDueDate)}`
                      : 'Ótimo trabalho: todas as mensalidades estão em dia.'}
                  </p>
                </div>
              </div>
              {priorityDefaulter?.financialGuardian && (
                <a
                  href={`https://wa.me/55${priorityDefaulter.financialGuardian.phoneWhatsapp}?text=${whatsappMessage(priorityDefaulter.student.fullName, priorityDefaulter.totalOwedCents)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-success px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(46,169,124,.2)] transition hover:bg-success/85"
                >
                  <MessageCircle className="h-4 w-4" /> Cobrar no WhatsApp
                </a>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-extrabold text-foreground">Alunos com cobrança pendente</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Organizado por maior valor devido para facilitar a priorização.</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <PrintButton />
              <ExportCsvButton filename="inadimplencia.csv" rows={defaultersCsvRows} />
            </div>
          </div>

          <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
            <Table>
              <TableHeader className="bg-muted/60">
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
                    <TableCell colSpan={5} className="py-14 text-center text-muted-foreground">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-success/10 text-success">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <p className="mt-3 font-bold text-success">Nenhum aluno inadimplente</p>
                      <p className="mt-1 text-xs text-muted-foreground">Todas as mensalidades estão em dia.</p>
                    </TableCell>
                  </TableRow>
                )}
                {defaulters.map((defaulter) => (
                  <TableRow key={defaulter.student.id} className="hover:bg-destructive/10">
                    <TableCell>
                      <Link href={`/alunos/${defaulter.student.id}`} className="font-bold text-foreground hover:text-primary">
                        {defaulter.student.fullName}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{defaulter.invoiceCount} mensalidade(s) em atraso</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-bold text-muted-foreground">{defaulter.classroom.name}</span>
                    </TableCell>
                    <TableCell className="money font-extrabold text-destructive">{brl(defaulter.totalOwedCents)}</TableCell>
                    <TableCell className="money hidden text-muted-foreground md:table-cell">{formatDate(defaulter.oldestDueDate)}</TableCell>
                    <TableCell className="text-right">
                      {defaulter.financialGuardian ? (
                        <a
                          href={`https://wa.me/55${defaulter.financialGuardian.phoneWhatsapp}?text=${whatsappMessage(defaulter.student.fullName, defaulter.totalOwedCents)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success/10 px-3 text-xs font-bold text-success transition hover:bg-success/10"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem contato</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {isAdmin && dre && (
          <TabsContent value="dre" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-extrabold text-foreground">Demonstrativo de resultado</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Receitas recebidas menos as despesas registradas.</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <PrintButton />
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 shadow-sm">
                  <Link href={`/relatorios?month=${addMonths(month, -1)}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60" aria-label="Mês anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                  <span className="flex min-w-[9rem] items-center justify-center gap-2 text-sm font-extrabold text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary/70" /> {formatCompetence(month)}
                  </span>
                  <Link href={`/relatorios?month=${addMonths(month, 1)}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60" aria-label="Próximo mês">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <StatCard label="Receita recebida" value={brl(dre.revenueCents)} hint="mensalidades pagas no período" icon={ArrowUpRight} accent="success" money />
              <StatCard label="Despesas" value={brl(dre.totalExpensesCents)} hint={`${dre.expensesByCategory.length} categoria(s) com gasto`} icon={ArrowDownRight} accent="destructive" money />
              <StatCard
                label="Resultado"
                value={brl(dre.resultCents)}
                hint={dre.resultCents >= 0 ? 'resultado positivo' : 'resultado negativo'}
                icon={FileBarChart}
                accent={dre.resultCents >= 0 ? 'success' : 'destructive'}
                money
              />
            </div>

            <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h3 className="font-display text-lg font-extrabold text-foreground">Despesas por categoria</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Composição dos custos no mês selecionado.</p>
                </div>
                <ReceiptText className="h-5 w-5 text-[#7b8cc0]" />
              </div>
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dre.expensesByCategory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">Nenhuma despesa neste mês.</TableCell>
                    </TableRow>
                  )}
                  {dre.expensesByCategory.map((category) => (
                    <TableRow key={category.categoryId} className="hover:bg-muted/60">
                      <TableCell className="font-semibold text-muted-foreground">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: category.colorHex ?? '#8A8F98' }} />
                        {category.categoryName}
                      </TableCell>
                      <TableCell className="money text-right font-semibold text-muted-foreground">{brl(category.totalCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
