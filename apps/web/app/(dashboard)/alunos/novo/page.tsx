import { StudentForm } from '@/components/student-form';

export default function NovoAlunoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <h1 className="page-title">Novo aluno</h1>
      <StudentForm />
    </div>
  );
}
