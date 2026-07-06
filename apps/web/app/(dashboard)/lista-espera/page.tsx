import Link from 'next/link';
import { Plus } from 'lucide-react';
import {
  AGE_GROUP_LABELS,
  AgeGroup,
  SHIFT_LABELS,
  Shift,
  WAITLIST_STATUSES,
  WAITLIST_STATUS_LABELS,
  WaitlistStatus,
} from '@escola/contracts';
import { apiGet } from '@/lib/server-api';
import { formatAge, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WaitlistEntryDialog } from '@/components/waitlist-entry-dialog';
import { WaitlistStatusSelect } from '@/components/waitlist-status-select';
import { cn } from '@/lib/utils';

interface WaitlistRow {
  id: string;
  childName: string;
  birthDate: string;
  guardianName: string;
  phoneWhatsapp: string;
  desiredAgeGroup: AgeGroup;
  desiredShift: Shift;
  requestedAt: string;
  status: WaitlistStatus;
  notes: string | null;
}

const STATUS_BADGE_VARIANT: Record<WaitlistStatus, 'warning' | 'secondary' | 'success' | 'destructive'> = {
  WAITING: 'warning',
  CONTACTED: 'secondary',
  ENROLLED: 'success',
  GAVE_UP: 'destructive',
};

export default async function ListaEsperaPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = WAITLIST_STATUSES.includes(searchParams.status as WaitlistStatus)
    ? (searchParams.status as WaitlistStatus)
    : undefined;
  const query = status ? `?status=${status}` : '';
  const entries = await apiGet<WaitlistRow[]>(`/waitlist${query}`);
  const waitingCount = entries.filter((e) => e.status === 'WAITING').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lista de espera</h1>
          <p className="text-sm text-muted-foreground">{waitingCount} aguardando vaga</p>
        </div>
        <WaitlistEntryDialog trigger={<Button><Plus className="h-4 w-4" /> Nova entrada</Button>} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/lista-espera"
          className={cn('rounded-full border px-3 py-1 font-semibold', !status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
        >
          Todas
        </Link>
        {WAITLIST_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/lista-espera?status=${s}`}
            className={cn('rounded-full border px-3 py-1 font-semibold', status === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
          >
            {WAITLIST_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Criança</TableHead>
              <TableHead className="hidden sm:table-cell">Desejado</TableHead>
              <TableHead className="hidden md:table-cell">Responsável</TableHead>
              <TableHead className="hidden lg:table-cell">Solicitado em</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhuma entrada na lista de espera.
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <p className="font-semibold">{e.childName}</p>
                  <p className="text-xs text-muted-foreground">{formatAge(e.birthDate)}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {AGE_GROUP_LABELS[e.desiredAgeGroup]} · {SHIFT_LABELS[e.desiredShift]}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p>{e.guardianName}</p>
                  <a
                    href={`https://wa.me/55${e.phoneWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="money text-xs text-success hover:underline"
                  >
                    {e.phoneWhatsapp}
                  </a>
                </TableCell>
                <TableCell className="money hidden lg:table-cell">{formatDate(e.requestedAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE_VARIANT[e.status]}>{WAITLIST_STATUS_LABELS[e.status]}</Badge>
                  </div>
                  <div className="mt-1">
                    <WaitlistStatusSelect id={e.id} status={e.status} />
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
