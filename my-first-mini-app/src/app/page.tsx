'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageCircle, Globe, User, Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MiniKit,
  useMiniKit,
  ResponseEvent,
  type MiniAppChatPayload,
  type ChatPayload,
  ChatErrorCodes
} from 'minikit-js-dev-preview';
import { useSocket } from '@/hooks/useSocket';
import type { MatchedPayload, QueuedPayload, ErrorPayload } from '@/hooks/useSocket';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
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
type Partner = {
  username?: string;
  walletAddress?: string;
  language?: string;
  role?: string;
};

const buildChatUrl = (match: Partner | null) => {
  if (!match) return 'https://world.org/chat';

  const params = new URLSearchParams();
  if (match.username) params.set('username', match.username);
  if (match.walletAddress) params.set('address', match.walletAddress);
  params.set('action', 'chat');

  if (!params.has('username') && !params.has('address')) {
    return 'https://world.org/chat';
  }

  return `https://world.org/profile?${params.toString()}`;
};

export default function Home() {
  const [role, setRole] = useState<'learner' | 'fluent'>('learner');
  const [language, setLanguage] = useState<string>('');
  const [status, setStatus] = useState<QueueState>('idle');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [chatSent, setChatSent] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatSubscriptionRef = useRef<(() => void) | null>(null);
  const { isInstalled } = useMiniKit();
  const { isConnected, isConnecting, joinQueue, leaveQueue, onMatched, onQueued, onError, offMatched, offQueued, offError } = useSocket();

  const handleEnterQueue = useCallback(() => {
    if (!language || !isConnected) {
      console.error('Cannot join queue: missing language or not connected');
      return;
    }

    setStatus('loading');

    // Generate or use existing user ID
    const finalUserId = userId || `anon-${Date.now()}`;
    setUserId(finalUserId);

    // Join queue via Socket.io
    joinQueue({
      role,
      language,
      userId: finalUserId,
      username: 'Anonymous', // TODO: Get from session if available
      walletAddress: undefined, // TODO: Get from session if available
    });
  }, [language, isConnected, userId, role, joinQueue]);

  const sendChatMessage = useCallback((partnerData: Partner) => {
    // Validation checks
    if (!isInstalled || !partnerData || chatSent) return;

    // Validate recipient data
    if (!partnerData.username && !partnerData.walletAddress) {
      console.error('Partner has no username or wallet address');
      setChatError('Unable to send chat. Use the button below to chat manually.');
      return;
    }

    // Clear any previous error
    setChatError(null);

    // Create recipient array
    const recipient: string[] = [];
    if (partnerData.username) {
      recipient.push(partnerData.username);
    } else if (partnerData.walletAddress) {
      recipient.push(partnerData.walletAddress);
    }

    // Create chat message
    const languageLabel = languages.find(l => l.value === language)?.label || language;
    const message = `Hi! We matched for ${languageLabel} practice. I'm a learner and you're a fluent guide. Let's start practicing! 🗣️`;

    // Define response handler
    const handleChatResponse = (response: MiniAppChatPayload) => {
      console.log('Chat response received:', response);

      if (response.status === 'success') {
        setChatSent(true);
        console.log(`Chat sent successfully to ${response.count} chat(s)`);
      } else {
        // Handle error cases
        let errorMessage: string;
        switch (response.error_code) {
          case ChatErrorCodes.UserRejected:
            errorMessage = 'Chat prompt was closed';
            break;
          case ChatErrorCodes.SendFailed:
            errorMessage = 'Unable to send chat. Use the button below to chat manually.';
            break;
          case ChatErrorCodes.GenericError:
          default:
            errorMessage = 'Failed to send chat message';
            break;
        }
        setChatError(errorMessage);
        console.error('Chat error:', response.error_code, errorMessage);
      }

      // Cleanup subscription
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current();
        chatSubscriptionRef.current = null;
      }
    };

    // Subscribe to chat response event
    const unsubscribe = MiniKit.subscribe(
      ResponseEvent.MiniAppChat,
      handleChatResponse
    );
    chatSubscriptionRef.current = unsubscribe;

    // Send chat command
    const payload: ChatPayload = {
      message,
      to: recipient.length > 0 ? recipient : undefined,
    };

    try {
      (MiniKit.commands as any).chat(payload);
      console.log('Chat command sent to MiniKit');
    } catch (error) {
      console.error('Failed to send chat command:', error);
      setChatError('Failed to send chat message');

      // Cleanup subscription on error
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current();
        chatSubscriptionRef.current = null;
      }
    }
  }, [isInstalled, chatSent, language]);

  const reset = useCallback(() => {
    // Cleanup chat subscription if active
    if (chatSubscriptionRef.current) {
      chatSubscriptionRef.current();
      chatSubscriptionRef.current = null;
    }

    // Leave queue via Socket.io
    leaveQueue();

    // Reset all state
    setStatus('idle');
    setPartner(null);
    setUserId(null);
    setChatSent(false);
    setChatError(null);
  }, [leaveQueue]);

  // Setup Socket.io event listeners
  useEffect(() => {
    const handleMatched = (data: MatchedPayload) => {
      console.log('Matched!', data);
      setPartner(data.partner);
      setStatus('matched');
      setUserId(data.userId);

      // Send chat message from learner to fluent speaker
      if (role === 'learner' && isInstalled) {
        sendChatMessage(data.partner);
      }
    };

    const handleQueued = (data: QueuedPayload) => {
      console.log('Queued:', data);
      setStatus('queued');
      setUserId(data.userId);
    };

    const handleError = (data: ErrorPayload) => {
      console.error('Socket error:', data.message);
      setStatus('idle');
    };

    // Register event listeners
    onMatched(handleMatched);
    onQueued(handleQueued);
    onError(handleError);

    // Cleanup listeners on unmount
    return () => {
      offMatched(handleMatched);
      offQueued(handleQueued);
      offError(handleError);
    };
  }, [role, isInstalled, sendChatMessage, onMatched, onQueued, onError, offMatched, offQueued, offError]);

  // Cleanup chat subscription on unmount
  useEffect(() => {
    return () => {
      if (chatSubscriptionRef.current) {
        console.log('Cleaning up chat subscription on unmount');
        chatSubscriptionRef.current();
        chatSubscriptionRef.current = null;
      }
    };
  }, []);

  const chatUrl = buildChatUrl(partner);

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
                    disabled={!language || !isConnected || isConnecting}
                    className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                    size="lg"
                  >
                    {isConnecting ? 'Connecting...' : !isConnected ? 'Disconnected' : 'Enter Queue'}
                  </Button>
                  
                  {/* Connection Status */}
                  {!isConnected && !isConnecting && (
                    <p className="text-xs text-center text-destructive">
                      Unable to connect to matching server
                    </p>
                  )}
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

                  {/* Chat Error Display */}
                  {chatError && (
                    <div className="w-full px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive text-center">{chatError}</p>
                    </div>
                  )}

                  <div className="w-full pt-4 space-y-3">
                    <Button 
                      asChild
                      className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
                    >
                      <a
                        href={chatUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Start Chatting
                      </a>
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Opens World Chat with {partner?.username || 'your match'}.
                    </p>
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
