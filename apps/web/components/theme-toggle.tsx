'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

function toggleTheme() {
  const root = document.documentElement;
  const dark = root.classList.toggle('dark');
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  } catch {
    /* armazenamento indisponível (modo privado) — o tema vale só para a sessão */
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
      className={cn(
        'grid h-9 w-9 place-items-center rounded-lg text-sidebar-muted transition-colors hover:bg-white/[0.07] hover:text-white',
        className,
      )}
    >
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
    </button>
  );
}
