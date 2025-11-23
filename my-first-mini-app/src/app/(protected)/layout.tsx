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
        <Page.Footer className="px-0 fixed bottom-0 w-full bg-white dark:bg-black border-t-2 pt-2 pb-[35px] z-50" style={{ borderColor: '#0f52aa40' }}>
          <Navigation />
        </Page.Footer>
      </Page>
    </>
  );
}
