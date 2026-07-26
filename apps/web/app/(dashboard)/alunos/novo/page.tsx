import { redirect } from 'next/navigation';

export default function NovoAlunoPage() {
  redirect('/alunos?novo=1');
}
