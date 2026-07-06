'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/select';

export function ExpensesCategoryFilter({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Select
      className="w-52"
      value={searchParams.get('categoryId') ?? ''}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) params.set('categoryId', e.target.value);
        else params.delete('categoryId');
        router.push(`/despesas?${params.toString()}`);
      }}
    >
      <option value="">Todas as categorias</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}
