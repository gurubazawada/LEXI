import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';
import { WorldcoinStylesLoader } from '@/components/WorldcoinStylesLoader';

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If the user is not authenticated, redirect to the login page
  if (!session) {
    console.log('Not authenticated - redirecting to /');
    redirect('/');
  }

  return (
    <>
      <WorldcoinStylesLoader />
      <Page>
        {children}
        <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
          <Navigation />
        </Page.Footer>
      </Page>
    </>
  );
}
