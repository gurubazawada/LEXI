import { auth } from '@/auth';
import ClientProviders from '@/providers';
import { BootupScreen } from '@/components/BootupScreen';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PairTalk - Language Partner Matching',
  description: 'Connect with language partners for practice and learning',
  other: {
    'font-preconnect': 'https://fonts.googleapis.com',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <BootupScreen>
          <ClientProviders session={session}>{children}</ClientProviders>
        </BootupScreen>
      </body>
    </html>
  );
}
