import type { Metadata } from 'next';
import { Baloo_2, Atkinson_Hyperlegible, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const display = Baloo_2({ subsets: ['latin'], variable: '--font-display' });
const body = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Peniel Christian School — Painel',
  description: 'Painel administrativo da escola infantil',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
