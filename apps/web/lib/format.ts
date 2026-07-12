const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formatador único de dinheiro: recebe CENTAVOS (Int), nunca float. */
export function brl(cents: number): string {
  return brlFormatter.format(cents / 100);
}

/** 'R$ 1.234,56' digitado no form → 123456 centavos */
/** Date/ISO string (DATE UTC) → 'dd/mm/aaaa' */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/** Date/ISO → 'AAAA-MM-DD' (para inputs type=date) */
export function toDateInput(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** 'AAAA-MM' → 'Julho de 2026' */
export function formatCompetence(competence: string): string {
  const [y, m] = competence.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
}

/** Competência corrente no fuso de São Paulo, 'AAAA-MM' */
export function currentCompetence(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  })
    .format(new Date())
    .slice(0, 7);
}

export function addMonths(competence: string, delta: number): string {
  const [y, m] = competence.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** Hoje no fuso de São Paulo, 'AAAA-MM-DD' */
export function todayDateInput(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Idade em anos (e meses para bebês) a partir da data de nascimento */
export function formatAge(birthDate: string | Date): string {
  const d = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const now = new Date();
  let months =
    (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth());
  if (now.getUTCDate() < d.getUTCDate()) months -= 1;
  if (months < 24) return `${months} meses`;
  return `${Math.floor(months / 12)} anos`;
}
