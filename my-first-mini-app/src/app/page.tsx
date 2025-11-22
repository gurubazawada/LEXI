'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageCircle, Globe, User, Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const languages = [
  { value: "es", label: "Spanish", flag: "🇪🇸" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "fr", label: "French", flag: "🇫🇷" },
  { value: "jp", label: "Japanese", flag: "🇯🇵" },
  { value: "de", label: "German", flag: "🇩🇪" },
  { value: "pt", label: "Portuguese", flag: "🇵🇹" },
  { value: "it", label: "Italian", flag: "🇮🇹" },
  { value: "zh", label: "Mandarin", flag: "🇨🇳" },
];

type QueueState = 'idle' | 'loading' | 'queued' | 'matched';

export default function Home() {
  const [role, setRole] = useState<'learner' | 'fluent'>('learner');
  const [language, setLanguage] = useState<string>('');
  const [status, setStatus] = useState<QueueState>('idle');
  const [partner, setPartner] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleEnterQueue = async () => {
    if (!language) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, language }),
      });
      
      const data = await res.json();

      // Store user ID for polling (if provided in response)
      if (data.userId) {
        setUserId(data.userId);
      }

      if (data.status === 'matched') {
        setPartner(data.partner);
        setStatus('matched');
        // Stop polling if it was running
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else {
        setStatus('queued');
        // Start polling for matches
        startPolling();
      }
    } catch (error) {
      console.error('Failed to join queue:', error);
      setStatus('idle');
    }
  };

  const startPolling = () => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 2 seconds for matches
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const url = userId 
          ? `/api/queue?userId=${encodeURIComponent(userId)}`
          : '/api/queue';
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'matched') {
          setPartner(data.partner);
          setStatus('matched');
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (data.status === 'idle') {
          // User was removed from queue (shouldn't happen, but handle it)
          setStatus('idle');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

  const reset = () => {
    setStatus('idle');
    setPartner(null);
    setUserId(null);
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-2 shadow-sm border border-primary/10 backdrop-blur-sm">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">PairTalk</h1>
          <p className="text-muted-foreground text-base font-medium">Connect with language partners</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              key="setup"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Card className="border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-center">Start Practice</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">I am a...</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setRole('learner')}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ease-in-out",
                          role === 'learner' 
                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                            : "border-transparent bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <User className="h-6 w-6 mb-2" />
                        <span className="font-medium">Learner</span>
                      </button>
                      <button
                        onClick={() => setRole('fluent')}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ease-in-out",
                          role === 'fluent' 
                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                            : "border-transparent bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Check className="h-6 w-6 mb-2" />
                        <span className="font-medium">Fluent Guide</span>
                      </button>
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full h-12 rounded-xl border-input/50 bg-background/50 focus:ring-primary/20 font-medium">
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/50 shadow-lg">
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value} className="py-3 cursor-pointer rounded-lg my-1 focus:bg-primary/5">
                            <span className="mr-2 text-lg">{lang.flag}</span>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Button */}
                  <Button 
                    onClick={handleEnterQueue} 
                    disabled={!language}
                    className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                    size="lg"
                  >
                    Enter Queue
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {(status === 'loading' || status === 'queued') && (
            <motion.div
              key="loading"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full"
            >
              <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/80 backdrop-blur-sm overflow-hidden relative">
                 <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse pointer-events-none" />
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <div className="relative bg-background p-4 rounded-full border-2 border-primary shadow-inner">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {status === 'loading' ? 'Connecting...' : 'Finding a partner...'}
                    </h3>
                    <p className="text-muted-foreground">
                      Looking for a {role === 'learner' ? 'fluent speaker' : 'learner'} in {' '}
                      <span className="font-medium text-primary">
                        {languages.find(l => l.value === language)?.label}
                      </span>
                    </p>
                  </div>

                  {status === 'queued' && (
                     <Button 
                      variant="ghost" 
                      onClick={reset}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === 'matched' && (
            <motion.div
              key="matched"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full"
            >
              <Card className="border-primary/20 shadow-2xl shadow-primary/10 bg-gradient-to-b from-background to-primary/5 overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="bg-green-500/10 p-4 rounded-full ring-4 ring-green-500/5">
                    <Sparkles className="h-12 w-12 text-green-500" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">It's a Match!</h3>
                    <p className="text-muted-foreground text-lg">
                      You are paired with <span className="font-semibold text-primary">{partner?.username || 'Partner'}</span>
                    </p>
                  </div>

                  <div className="w-full pt-4 space-y-3">
                    <Button className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20">
                      Start Chatting
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={reset}
                      className="w-full"
                    >
                      Leave
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.5 } }}
          className="text-center text-sm text-muted-foreground/60"
        >
          <p>Secure authentication powered by Worldcoin</p>
        </motion.div>
      </div>
    </div>
  );
}
