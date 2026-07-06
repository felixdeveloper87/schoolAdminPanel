import { Badge } from '@/components/ui/badge';
import { INVOICE_STATUS_LABELS, InvoiceStatus } from '@escola/contracts';

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === 'PAID') {
    return <span className="stamp">Pago</span>;
  }
  const variant =
    status === 'OVERDUE' ? 'destructive' : status === 'PENDING' ? 'warning' : 'secondary';
  return <Badge variant={variant}>{INVOICE_STATUS_LABELS[status]}</Badge>;
}
