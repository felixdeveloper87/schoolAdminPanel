// Datas de negócio são armazenadas como DATE (meia-noite UTC).
// O "hoje" do negócio é sempre calculado no fuso America/Sao_Paulo.

export function parseDateString(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** 'AAAA-MM' → Date do dia 1 do mês (competência) */
export function parseCompetence(value: string): Date {
  return new Date(`${value}-01T00:00:00.000Z`);
}

/** Data de hoje no fuso de São Paulo, como DATE UTC-midnight */
export function todaySaoPaulo(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return new Date(`${parts}T00:00:00.000Z`);
}

/** Competência (mês) corrente no fuso de São Paulo */
export function currentCompetenceSaoPaulo(): Date {
  const today = todaySaoPaulo();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
}

export function competenceToString(competence: Date): string {
  const y = competence.getUTCFullYear();
  const m = String(competence.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Vencimento dentro do mês da competência (dueDay já limitado a 28) */
export function dueDateFor(competence: Date, dueDay: number): Date {
  return new Date(Date.UTC(competence.getUTCFullYear(), competence.getUTCMonth(), dueDay));
}

export function monthRange(competence: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(competence.getUTCFullYear(), competence.getUTCMonth(), 1));
  const end = new Date(Date.UTC(competence.getUTCFullYear(), competence.getUTCMonth() + 1, 1));
  return { start, end };
}
