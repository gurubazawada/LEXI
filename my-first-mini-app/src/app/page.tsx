'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Loader2, Globe, Users } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageCircle, User, Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MiniKit,
  ResponseEvent,
  type MiniAppChatPayload,
  type ChatPayload,
  ChatErrorCodes
} from 'minikit-js-dev-preview';
import { useMiniKit } from 'minikit-js-dev-preview/minikit-provider';
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
  const [role, setRole] = useState<'learner' | 'fluent'>('learner');
  const [language, setLanguage] = useState<string>('');
  const [status, setStatus] = useState<QueueState>('idle');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [chatSent, setChatSent] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [testChatSent, setTestChatSent] = useState(false);
  const chatSubscriptionRef = useRef<(() => void) | void | null>(null);
  const testChatSubscriptionRef = useRef<(() => void) | void | null>(null);
  const { isInstalled } = useMiniKit();
  const { data: session } = useSession();
  const { isConnected, isConnecting, joinQueue, leaveQueue, onMatched, onQueued, onError, offMatched, offQueued, offError } = useSocket();

  const handleEnterQueue = useCallback(() => {
    if (!language || !isConnected) {
      console.error('Cannot join queue: missing language or not connected');
      return;
    }

    // Get user ID from session (walletAddress) or fallback to anonymous
    const finalUserId = session?.user?.walletAddress || `anon-${Date.now()}`;
    const username = session?.user?.username || 'Anonymous';
    const walletAddress = session?.user?.walletAddress;

    if (!finalUserId) {
      console.error('Cannot join queue: no user ID available');
      return;
    }

    setStatus('loading');

    // Join queue via Socket.io with authenticated user data
    joinQueue({
      role,
      language,
      userId: finalUserId,
      username,
      walletAddress,
    });
  }, [language, isConnected, session, role, joinQueue]);

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
      if (typeof chatSubscriptionRef.current === 'function') {
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
      if (typeof chatSubscriptionRef.current === 'function') {
        chatSubscriptionRef.current();
        chatSubscriptionRef.current = null;
      }
    }
  }, [isInstalled, chatSent, language]);

  const reset = useCallback(() => {
    // Cleanup chat subscription if active
    if (typeof chatSubscriptionRef.current === 'function') {
      chatSubscriptionRef.current();
      chatSubscriptionRef.current = null;
    }

    // Leave queue via Socket.io
    leaveQueue();

    // Reset all state
    setStatus('idle');
    setPartner(null);
    setChatSent(false);
    setChatError(null);
  }, [leaveQueue]);

  // Setup Socket.io event listeners
  useEffect(() => {
    const handleMatched = (data: MatchedPayload) => {
      console.log('Matched!', data);
      setPartner(data.partner);
      setStatus('matched');

      // Send chat message from learner to fluent speaker
      if (role === 'learner' && isInstalled) {
        sendChatMessage(data.partner);
      }
    };

    const handleQueued = (data: QueuedPayload) => {
      console.log('Queued:', data);
      setStatus('queued');
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

  // TEST: Send chat message to bwzdragon on app load
  useEffect(() => {
    if (!isInstalled || testChatSent) return;

    console.log('Sending test chat to bwzdragon...');
    setTestChatSent(true);

    const testMessage = 'Hey! Testing the chat command from LEX app 👋';
    const recipient = ['bwzdragon'];

    // Define response handler
    const handleTestChatResponse = (response: MiniAppChatPayload) => {
      console.log('Test chat response received:', response);

      if (response.status === 'success') {
        console.log(`Test chat sent successfully to ${response.count} chat(s)`);
      } else {
        console.error('Test chat error:', response.error_code);
      }

      // Cleanup subscription
      if (typeof testChatSubscriptionRef.current === 'function') {
        testChatSubscriptionRef.current();
        testChatSubscriptionRef.current = null;
      }
    };

    // Subscribe to chat response event
    const unsubscribe = MiniKit.subscribe(
      ResponseEvent.MiniAppChat,
      handleTestChatResponse
    );
    testChatSubscriptionRef.current = unsubscribe;

    // Send chat command
    const payload: ChatPayload = {
      message: testMessage,
      to: recipient,
    };

    try {
      (MiniKit.commands as any).chat(payload);
      console.log('Test chat command sent to MiniKit');
    } catch (error) {
      console.error('Failed to send test chat command:', error);

      // Cleanup subscription on error
      if (typeof testChatSubscriptionRef.current === 'function') {
        testChatSubscriptionRef.current();
        testChatSubscriptionRef.current = null;
      }
    }
  }, [isInstalled, testChatSent]);

  // Cleanup chat subscription on unmount
  useEffect(() => {
    return () => {
      if (typeof chatSubscriptionRef.current === 'function') {
        console.log('Cleaning up chat subscription on unmount');
        chatSubscriptionRef.current();
        chatSubscriptionRef.current = null;
      }
      if (typeof testChatSubscriptionRef.current === 'function') {
        console.log('Cleaning up test chat subscription on unmount');
        testChatSubscriptionRef.current();
        testChatSubscriptionRef.current = null;
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
