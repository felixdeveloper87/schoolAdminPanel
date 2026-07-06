'use client';

import { useRouter } from 'next/navigation';
import { WAITLIST_STATUSES, WAITLIST_STATUS_LABELS, WaitlistStatus } from '@escola/contracts';
import { Select } from '@/components/ui/select';

export function WaitlistStatusSelect({ id, status }: { id: string; status: WaitlistStatus }) {
  const router = useRouter();
  return (
    <Select
      className="h-8 w-40 text-xs"
      defaultValue={status}
      onChange={async (e) => {
        await fetch(`/api/waitlist/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: e.target.value }),
        });
        router.refresh();
      }}
    >
      {WAITLIST_STATUSES.map((s) => (
        <option key={s} value={s}>
          {WAITLIST_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
