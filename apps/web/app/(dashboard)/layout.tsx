import { AppShell } from '@/components/app-shell';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { currentCompetence } from '@/lib/format';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const month = currentCompetence();
  const [user, summary] = await Promise.all([
    getSessionUser(),
    apiGet<{ overdueCount: number; activeStudents: number; capacity: number; occupancyRate: number }>(
      `/dashboard/summary?month=${month}`,
    ),
  ]);

  return (
    <AppShell
      user={user}
      overdueCount={summary.overdueCount}
      occupancy={{
        activeStudents: summary.activeStudents,
        capacity: summary.capacity,
        occupancyRate: summary.occupancyRate,
      }}
    >
      {children}
    </AppShell>
  );
}
