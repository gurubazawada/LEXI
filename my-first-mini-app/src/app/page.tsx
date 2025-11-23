'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChatLines, Globe, Group, ShieldCheck, Flash } from 'iconoir-react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect to match page if authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/match');
    }
  }, [status, session, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleGetStarted = () => {
    // Navigate to match page (or home if auth is bypassed)
    router.push('/match');
  };

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header / Brand */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-black dark:bg-white mb-4">
            <ChatLines className="h-10 w-10 text-white dark:text-black" strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-bold text-black dark:text-white">Lexi</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Connect with language partners worldwide
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <Globe className="h-5 w-5 text-black dark:text-white mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <h3 className="font-semibold text-black dark:text-white">Practice Any Language</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Match with native speakers for real conversation practice
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <Flash className="h-5 w-5 text-black dark:text-white mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <h3 className="font-semibold text-black dark:text-white">Instant Matching</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Get paired with partners in seconds, no waiting
              </p>
            </div>
          </div>
                  
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <ShieldCheck className="h-5 w-5 text-black dark:text-white mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <h3 className="font-semibold text-black dark:text-white">Secure & Private</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Verified users with World ID authentication
              </p>
            </div>
          </div>
        </div>
                  
        {/* Get Started Button */}
        <div className="pt-4">
          <Button 
            onClick={handleGetStarted}
            className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 text-base font-semibold py-6 rounded-xl"
            size="lg"
          >
            Get Started
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-600 font-medium">
            World App Required
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-700">
            Powered by Worldcoin
          </p>
        </div>
      </div>
    </div>
  );
}
