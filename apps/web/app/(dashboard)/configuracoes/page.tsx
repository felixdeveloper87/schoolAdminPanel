import {
  CheckCircle2,
  KeyRound,
  Mail,
  Settings2,
  ShieldCheck,
  UserCheck,
  UserRoundCog,
  UsersRound,
} from 'lucide-react';
import { ROLE_LABELS, Role } from '@escola/contracts';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/stat-card';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export default async function ConfiguracoesPage() {
  const user = await getSessionUser();
  const users = user.role === 'ADMIN' ? await apiGet<UserRow[]>('/users') : null;
  const activeUsers = users?.filter((item) => item.active) ?? [];
  const adminCount = activeUsers.filter((item) => item.role === 'ADMIN').length;
  const operatorCount = activeUsers.filter((item) => item.role !== 'ADMIN').length;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-[#27344f] px-5 py-6 text-white shadow-[0_18px_45px_rgba(39,52,79,.2)] sm:px-7 sm:py-7">
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#7187be]/30 blur-2xl" />
        <div aria-hidden="true" className="absolute bottom-0 right-24 h-28 w-28 rounded-full border-[18px] border-[#c5d3ff]/10" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-white/12 text-xl font-extrabold text-white ring-1 ring-white/15">
            {initials(user.name)}
          </span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#c6d3f3]">Conta e acesso</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-[34px]">Configurações</h1>
            <p className="mt-1 text-sm text-[#d2dbef]">Gerencie seu perfil e acompanhe os acessos ao painel.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="overflow-hidden rounded-[24px] border-white bg-white/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf2ff] text-[#5b6ec8]">
                <UserRoundCog className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#75829a]">Sua conta</p>
                <h2 className="mt-0.5 font-display text-xl font-extrabold text-[#273650]">{user.name}</h2>
              </div>
            </div>
            <dl className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-[#f7f9fc] px-3 py-2.5">
                <Mail className="h-4 w-4 text-[#7888a4]" />
                <div className="min-w-0">
                  <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8490a3]">E-mail</dt>
                  <dd className="truncate text-sm font-semibold text-[#475771]">{user.email}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-[#f7f9fc] px-3 py-2.5">
                <ShieldCheck className="h-4 w-4 text-[#7888a4]" />
                <div>
                  <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8490a3]">Perfil de acesso</dt>
                  <dd className="text-sm font-semibold text-[#475771]">{ROLE_LABELS[user.role]}</dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[24px] border-[#e3e8f2] bg-gradient-to-br from-[#fbfcff] to-[#f3f6ff] shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
          <CardContent className="p-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e5ebff] text-[#5b6dc5]">
              <KeyRound className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#74829c]">Segurança e permissões</p>
            <h2 className="mt-1 font-display text-xl font-extrabold text-[#2e3e5c]">Acesso controlado por perfil</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#687790]">
              Seu perfil define quais informações e ações administrativas estão disponíveis dentro do painel.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#52637e] shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#35a67c]" /> Sessão autenticada
            </div>
          </CardContent>
        </Card>
      </div>

      {users && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Usuários cadastrados" value={String(users.length)} hint="contas no painel" icon={UsersRound} accent="primary" />
            <StatCard label="Acessos ativos" value={String(activeUsers.length)} hint="usuários habilitados" icon={UserCheck} accent="success" />
            <StatCard label="Administradores" value={String(adminCount)} hint="com acesso completo" icon={ShieldCheck} accent="violet" />
            <StatCard label="Demais perfis" value={String(operatorCount)} hint="acesso operacional" icon={Settings2} accent="accent" />
          </div>

          <Card className="overflow-hidden rounded-[24px] border-white bg-white/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edf5] px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-extrabold text-[#2c3c58]">Usuários do painel</h2>
                <p className="mt-0.5 text-xs text-[#77849a]">Acompanhe os perfis que podem acessar a administração escolar.</p>
              </div>
              <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-bold text-[#5b6fc6]">{activeUsers.length} ativo(s)</span>
            </div>
            <Table>
              <TableHeader className="bg-[#f7f9fc]">
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => (
                  <TableRow key={item.id} className="hover:bg-[#f7f9fd]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf2ff] text-xs font-extrabold text-[#5c70c6]">
                          {initials(item.name)}
                        </span>
                        <span className="font-bold text-[#3d4e68]">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#687890]">{item.email}</TableCell>
                    <TableCell className="font-semibold text-[#596a83]">{ROLE_LABELS[item.role]}</TableCell>
                    <TableCell>
                      <Badge variant={item.active ? 'success' : 'secondary'}>{item.active ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Card className="overflow-hidden rounded-[24px] border-dashed border-[#cfd9e8] bg-white/70 shadow-none">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0f4fa] text-[#74849e]">
            <Settings2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold text-[#41536e]">Configurações institucionais</h2>
            <p className="mt-0.5 text-sm text-[#748299]">
              Em breve, este espaço poderá concentrar preferências como descontos para irmãos e mensagens de cobrança personalizadas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
