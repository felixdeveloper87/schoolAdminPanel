'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv, CsvRow } from '@/lib/csv';

export function ExportCsvButton({ filename, rows }: { filename: string; rows: CsvRow[] }) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows)}
    >
      <Download className="h-4 w-4" /> Exportar CSV
    </Button>
  );
}
