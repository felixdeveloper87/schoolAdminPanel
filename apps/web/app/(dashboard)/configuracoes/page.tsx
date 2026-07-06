import { ROLE_LABELS, Role } from '@escola/contracts';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export default async function ConfiguracoesPage() {
  const user = await getSessionUser();
  const users = user.role === 'ADMIN' ? await apiGet<UserRow[]>('/users') : null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Sua conta</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
            <dt className="text-muted-foreground">Nome</dt>
            <dd className="font-semibold">{user.name}</dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{user.email}</dd>
            <dt className="text-muted-foreground">Perfil</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
          </dl>
        </CardContent>
      </Card>

      {users && (
        <Card>
          <CardHeader>
            <CardTitle>Usuários do painel</CardTitle>
            <CardDescription>
              Novos usuários são criados via API (<code>POST /api/users</code>, só ADMIN) — ainda não há
              formulário na tela.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                    <TableCell>
                      <Badge variant={u.active ? 'success' : 'secondary'}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Formulário de criação/edição de usuários na tela, percentual configurável do desconto de
            irmãos (hoje fixo em 10%) e mensagem de cobrança do WhatsApp personalizável (hoje fixa).
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
