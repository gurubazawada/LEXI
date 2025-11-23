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
  // Auth bypass - comment out the redirect to allow unauthenticated access
  // const session = await auth();
  // if (!session) {
  //   console.log('Not authenticated - redirecting to /');
  //   redirect('/');
  // }
  
  console.log('⚠️ Auth bypassed - running without authentication');

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
