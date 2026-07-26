'use client';

import * as React from 'react';
import { Plus, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StudentForm } from '@/components/student-form';

export function StudentRegistrationDialog({
  classrooms,
  initialOpen = false,
}: {
  classrooms: { id: string; name: string; activeCount: number; capacity: number }[];
  initialOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(initialOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 rounded-xl bg-card px-4 text-brand shadow-[0_8px_20px_rgba(0,0,0,.16)] hover:bg-brand/10 hover:text-brand">
          <Plus className="h-4 w-4" /> Novo aluno
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl gap-0 overflow-y-auto rounded-[24px] p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-6 py-5 pr-14 sm:px-8">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><UserRoundPlus className="h-5 w-5" /></span>
            <div>
              <DialogTitle>Novo aluno</DialogTitle>
              <DialogDescription>Cadastre os dados e, se desejar, conclua a matrícula com as cobranças iniciais.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="px-5 py-5 sm:px-8"><StudentForm classrooms={classrooms} onCancel={() => setOpen(false)} /></div>
      </DialogContent>
    </Dialog>
  );
}
