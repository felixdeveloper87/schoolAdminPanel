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
      <section className="relative overflow-hidden rounded-[28px] bg-[#303d68] px-5 py-6 text-white shadow-[0_18px_45px_rgba(48,61,104,.22)] sm:px-7 sm:py-7">
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
        <TabsList className="rounded-xl border-white bg-white/90 p-1.5 shadow-[0_6px_18px_rgba(40,55,90,.08)]">
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

          <Card className="overflow-hidden rounded-[24px] border-[#f0dee4] bg-gradient-to-r from-[#fffafb] to-[#fff4f6] shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(75,45,60,.07)]">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ffe6eb] text-[#d65b72]">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a16e7b]">Contato prioritário</p>
                  <h2 className="mt-0.5 font-display text-lg font-extrabold text-[#542f3c]">
                    {priorityDefaulter ? priorityDefaulter.student.fullName : 'Nenhuma cobrança em aberto'}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#8a6570]">
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
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2ea97c] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(46,169,124,.2)] transition hover:bg-[#258d68]"
                >
                  <MessageCircle className="h-4 w-4" /> Cobrar no WhatsApp
                </a>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-extrabold text-[#263752]">Alunos com cobrança pendente</h2>
              <p className="mt-0.5 text-xs text-[#748299]">Organizado por maior valor devido para facilitar a priorização.</p>
            </div>
            <ExportCsvButton filename="inadimplencia.csv" rows={defaultersCsvRows} />
          </div>

          <Card className="overflow-hidden rounded-[24px] border-white bg-white/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
            <Table>
              <TableHeader className="bg-[#f6f8fc]">
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
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf8f2] text-[#37a77e]">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <p className="mt-3 font-bold text-[#315148]">Nenhum aluno inadimplente</p>
                      <p className="mt-1 text-xs text-[#71879a]">Todas as mensalidades estão em dia.</p>
                    </TableCell>
                  </TableRow>
                )}
                {defaulters.map((defaulter) => (
                  <TableRow key={defaulter.student.id} className="hover:bg-[#fff8fa]">
                    <TableCell>
                      <Link href={`/alunos/${defaulter.student.id}`} className="font-bold text-[#344766] hover:text-[#5165b0]">
                        {defaulter.student.fullName}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#77859a]">{defaulter.invoiceCount} mensalidade(s) em atraso</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="rounded-lg bg-[#edf2f8] px-2.5 py-1 text-xs font-bold text-[#5b697f]">{defaulter.classroom.name}</span>
                    </TableCell>
                    <TableCell className="money font-extrabold text-[#d05a70]">{brl(defaulter.totalOwedCents)}</TableCell>
                    <TableCell className="money hidden text-[#687890] md:table-cell">{formatDate(defaulter.oldestDueDate)}</TableCell>
                    <TableCell className="text-right">
                      {defaulter.financialGuardian ? (
                        <a
                          href={`https://wa.me/55${defaulter.financialGuardian.phoneWhatsapp}?text=${whatsappMessage(defaulter.student.fullName, defaulter.totalOwedCents)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#edf9f4] px-3 text-xs font-bold text-[#26845f] transition hover:bg-[#dff4eb]"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      ) : (
                        <span className="text-xs text-[#9aa5b4]">Sem contato</span>
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
                <h2 className="font-display text-xl font-extrabold text-[#263752]">Demonstrativo de resultado</h2>
                <p className="mt-0.5 text-sm text-[#748299]">Receitas recebidas menos as despesas registradas.</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#e0e7f0] bg-white p-1.5 shadow-sm">
                <Link href={`/relatorios?month=${addMonths(month, -1)}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#61708a] hover:bg-[#eef2f8]" aria-label="Mês anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                <span className="flex min-w-[9rem] items-center justify-center gap-2 text-sm font-extrabold text-[#3e506a]">
                  <CalendarDays className="h-4 w-4 text-[#6879bd]" /> {formatCompetence(month)}
                </span>
                <Link href={`/relatorios?month=${addMonths(month, 1)}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#61708a] hover:bg-[#eef2f8]" aria-label="Próximo mês">
                  <ChevronRight className="h-4 w-4" />
                </Link>
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

            <Card className="overflow-hidden rounded-[24px] border-white bg-white/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
              <div className="flex items-center justify-between border-b border-[#e7edf5] px-5 py-4">
                <div>
                  <h3 className="font-display text-lg font-extrabold text-[#263752]">Despesas por categoria</h3>
                  <p className="mt-0.5 text-xs text-[#748299]">Composição dos custos no mês selecionado.</p>
                </div>
                <ReceiptText className="h-5 w-5 text-[#7b8cc0]" />
              </div>
              <Table>
                <TableHeader className="bg-[#f6f8fc]">
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
                    <TableRow key={category.categoryId} className="hover:bg-[#f7f9fc]">
                      <TableCell className="font-semibold text-[#526178]">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: category.colorHex ?? '#8A8F98' }} />
                        {category.categoryName}
                      </TableCell>
                      <TableCell className="money text-right font-semibold text-[#34445b]">{brl(category.totalCents)}</TableCell>
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
