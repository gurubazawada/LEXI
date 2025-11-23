'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthButton } from '@/components/AuthButton';
import { AnimatedLexi } from '@/components/AnimatedLexi';
import { ChatLines, Globe, Group } from 'iconoir-react';

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

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header / Brand */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ backgroundColor: '#0f52aa' }}>
            <AnimatedLexi variant="logo" size={60} />
          </div>
          <h1 className="text-4xl font-bold text-black dark:text-white">LEXI</h1>
          <p className="text-gray-600 dark:text-gray-400 text-base">
            Connect with language partners worldwide
          </p>
        </div>

        {/* Features */}
                  <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <Globe className="h-5 w-5 text-black dark:text-white mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <h3 className="font-semibold text-black dark:text-white text-sm">Practice Any Language</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Match with native speakers for real conversation practice
              </p>
                    </div>
                  </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <Group className="h-5 w-5 text-black dark:text-white mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <h3 className="font-semibold text-black dark:text-white text-sm">Instant Matching</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Get paired with partners in seconds, no waiting
              </p>
                    </div>
                  </div>
                  
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <ChatLines className="h-5 w-5 text-black dark:text-white mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <h3 className="font-semibold text-black dark:text-white text-sm">Secure & Private</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Verified users with World ID authentication
                    </p>
                  </div>
          </div>
                  </div>
                  
        {/* Auth Button */}
        <div className="pt-4">
          <AuthButton />
                  </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-600">
          <p>Powered by Worldcoin</p>
        </div>
      </div>
    </div>
  );
}
