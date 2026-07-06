'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="notebook-card paper-panel w-full max-w-md">
        <CardHeader>
          <CardTitle>Não foi possível carregar esta tela</CardTitle>
          <CardDescription>
            Tente novamente. Se continuar acontecendo, verifique se a API está rodando.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {process.env.NODE_ENV !== 'production' && (
            <p className="rounded-md border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {error.message}
            </p>
          )}
          <Button type="button" onClick={reset} className="w-full">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
