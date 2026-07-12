import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StudentAvatar({
  photoUrl,
  name,
  size = 'sm',
}: {
  photoUrl: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dimension = size === 'sm' ? 'h-9 w-9' : size === 'md' ? 'h-11 w-11' : 'h-24 w-24';
  return (
    <div className={cn('shrink-0 overflow-hidden rounded-full border bg-muted shadow-sm', dimension)}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center text-muted-foreground">
          <User className={size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-9 w-9'} />
        </span>
      )}
    </div>
  );
}
