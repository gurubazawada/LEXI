'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Loader2, Globe, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthButton } from '@/components/AuthButton';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-secondary/50 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md space-y-8 z-10">
        
        {/* Header / Brand */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4 shadow-lg border border-primary/10 backdrop-blur-sm">
            <MessageCircle className="h-14 w-14 text-primary" />
          </div>
          <h1 className="text-5xl font-bold text-foreground tracking-tight">PairTalk</h1>
          <p className="text-muted-foreground text-lg font-medium">
            Connect with language partners worldwide
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <Globe className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Practice Any Language</h3>
              <p className="text-sm text-muted-foreground">
                Match with native speakers for real conversation practice
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <Users className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Instant Matching</h3>
              <p className="text-sm text-muted-foreground">
                Get paired with partners in seconds, no waiting
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <MessageCircle className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Secure & Private</h3>
              <p className="text-sm text-muted-foreground">
                Verified users with World ID authentication
              </p>
            </div>
          </div>
        </motion.div>

        {/* Auth Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4"
        >
          <AuthButton />
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.6 } }}
          className="text-center text-sm text-muted-foreground/60"
        >
          <p>Powered by Worldcoin • Secure • Private</p>
        </motion.div>
      </div>
    </div>
  );
}
