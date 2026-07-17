'use client';

import * as React from 'react';
import { Info, Lightbulb, Sprout } from 'lucide-react';
import { brl } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

interface HealthScoreDialogProps {
  healthScore: number;
  occScore: number;
  defaultScore: number;
  netScore: number;
  occupancyRate: number;
  overdueStudentsRate: number;
  netCents: number | null;
  activeStudents: number;
}

function ScoreRow({
  label,
  formula,
  today,
  points,
  max,
  barClassName,
}: {
  label: string;
  formula: string;
  today: string;
  points: number;
  max: number;
  barClassName: string;
}) {
  const rounded = Math.round(points);
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-extrabold text-foreground">{label}</p>
        <p className="money shrink-0 text-sm font-extrabold text-foreground">
          {rounded}
          <span className="text-xs font-bold text-muted-foreground"> de {max} pts</span>
        </p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{formula}</p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${max > 0 ? Math.min(100, (points / max) * 100) : 0}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">Hoje: {today}</p>
    </div>
  );
}

export function HealthScoreDialog({
  healthScore,
  occScore,
  defaultScore,
  netScore,
  occupancyRate,
  overdueStudentsRate,
  netCents,
  activeStudents,
}: HealthScoreDialogProps) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full text-[10px] font-bold text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="underline decoration-white/40 underline-offset-2">Como é calculado?</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como a saúde da escola é calculada</DialogTitle>
          <DialogDescription>
            O índice vai de 0 a 100 e soma três componentes, sempre olhando o mês atual. Sua
            pontuação de hoje é <strong className="text-foreground">{healthScore}/100</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <ScoreRow
            label="Ocupação das turmas"
            max={35}
            points={occScore}
            formula="Percentual de vagas preenchidas: (alunos ativos ÷ capacidade das turmas) × 35."
            today={`${pct(occupancyRate)} de ocupação`}
            barClassName="bg-primary"
          />
          <ScoreRow
            label="Inadimplência"
            max={45}
            points={defaultScore}
            formula="Quanto menor a fatia de alunos com mensalidade vencida, maior a nota: (100% − taxa de inadimplência) × 45."
            today={`${pct(overdueStudentsRate)} dos alunos em atraso`}
            barClassName="bg-success"
          />
          <ScoreRow
            label="Caixa do mês"
            max={20}
            points={netScore}
            formula={
              netCents === null
                ? 'Resultado líquido do mês (recebido − despesas). Seu perfil não tem acesso a esse valor, então contam 11 pontos neutros.'
                : 'Resultado líquido do mês (recebido − despesas): positivo ou zerado vale 20 pontos; negativo, zero.'
            }
            today={netCents === null ? 'valor restrito ao administrador' : `resultado de ${brl(netCents)}`}
            barClassName="bg-accent"
          />
        </div>

        <div className="flex gap-2.5 rounded-xl bg-accent/15 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" />
          <p>
            <strong className="text-foreground">Exemplo:</strong> uma escola com 80% de ocupação
            (28 pts), 10% dos alunos em atraso (41 pts) e caixa positivo (20 pts) fica com{' '}
            <strong className="text-foreground">89/100</strong>.
          </p>
        </div>

        {activeStudents === 0 && (
          <div className="flex gap-2.5 rounded-xl bg-primary/10 p-3.5 text-xs leading-relaxed text-muted-foreground">
            <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              <strong className="text-foreground">Começando agora?</strong> Sem alunos cadastrados
              não existe inadimplência (45 pts) e o caixa zerado conta como positivo (20 pts) — por
              isso o índice parte de 65/100 mesmo com a escola vazia. Ele passa a refletir a
              realidade conforme você cadastra turmas, alunos e lançamentos.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
