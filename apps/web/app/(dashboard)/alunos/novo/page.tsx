import { StudentForm } from '@/components/student-form';

export default function NovoAlunoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Novo aluno</h1>
      <StudentForm />
    </div>
  );
}
