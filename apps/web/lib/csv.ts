export type CsvRow = Record<string, string | number | null | undefined>;

function escapeCsvValue(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((h) => escapeCsvValue(row[h])).join(';')),
  ];
  // BOM para o Excel reconhecer UTF-8 (acentos) corretamente
  return '﻿' + lines.join('\r\n');
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
