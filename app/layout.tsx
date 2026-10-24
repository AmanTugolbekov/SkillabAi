import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';
import { currentRole, currentTheme, currentUser } from '@/lib/session';
import { isChildAccount } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'EventSphere',
  description: 'Поиск и организация локальных событий, хакатонов и клубов',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0f11' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, role, theme] = await Promise.all([currentUser(), currentRole(), currentTheme()]);

  return (
    <html lang="ru" data-theme={theme ?? undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <div className="phone flex flex-col">
          <AppHeader
            role={role}
            theme={theme}
            userName={user?.name ?? null}
            isChild={user ? isChildAccount(user) : false}
          />
          <main className="flex-1 pb-4">{children}</main>
          <BottomNav role={role} />
        </div>
      </body>
    </html>
  );
}
