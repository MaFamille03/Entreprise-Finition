import './globals.css';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';

export const metadata = { title: 'Finition ERP', description: 'Gestion intégrée pour entreprise de finition et construction' };

export default function RootLayout({children}:{children:ReactNode}){
  return <html lang="fr"><body><AppShell>{children}</AppShell></body></html>;
}
