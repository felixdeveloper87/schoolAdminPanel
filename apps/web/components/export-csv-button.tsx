'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv, CsvRow } from '@/lib/csv';

export function ExportCsvButton({
  filename,
  rows,
  className,
}: {
  filename: string;
  rows: CsvRow[];
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows)}
    >
      <Download className="h-4 w-4" /> Exportar CSV
    </Button>
  );
}
