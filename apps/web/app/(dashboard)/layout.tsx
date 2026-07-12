import { AppShell } from '@/components/app-shell';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { currentCompetence } from '@/lib/format';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const month = currentCompetence();
  const [user, summary] = await Promise.all([
    getSessionUser(),
    apiGet<{ overdueStudents: number }>(`/dashboard/summary?month=${month}`),
  ]);

  return (
    <AppShell user={user} overdueStudents={summary.overdueStudents}>
      {children}
    </AppShell>
  );
}
