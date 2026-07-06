import { ROLE_LABELS } from '@escola/contracts';
import { getSessionUser } from '@/lib/server-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function ConfiguracoesPage() {
  const user = await getSessionUser();

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

      <Card>
        <CardHeader>
          <CardTitle>Em breve (Fase 2)</CardTitle>
          <CardDescription>
            Gestão de usuários, percentual do desconto de irmãos, mensagem de cobrança do WhatsApp,
            metas mensais, relatórios (inadimplência e DRE) e rematrícula em lote.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
