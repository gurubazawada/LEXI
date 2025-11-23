'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { ChatLines, User, Check, Language } from 'iconoir-react';
import { useMiniKit } from 'minikit-js-dev-preview/minikit-provider';
import {
  MiniKit,
  ResponseEvent,
  type ChatPayload,
  ChatErrorCodes
} from 'minikit-js-dev-preview';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { useSocket } from '@/hooks/useSocket';
import type { MatchedPayload, QueuedPayload, ErrorPayload } from '@/hooks/useSocket';
import type { UserStats } from '@/types/stats';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';

const languages = [
  { value: "es", label: "Spanish" },
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "jp", label: "Japanese" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "zh", label: "Mandarin" },
];

type QueueState = 'idle' | 'loading' | 'queued' | 'matched';
type Partner = {
  id?: string;
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

export default function MatchPage() {
  const router = useRouter();
  const [role, setRole] = useState<'learner' | 'fluent'>('learner');
  const [language, setLanguage] = useState<string>('');
  const [status, setStatus] = useState<QueueState>('idle');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [chatSent, setChatSent] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({ totalChats: 0, currentStreak: 0, communityRank: '--' });
  const [lessonId, setLessonId] = useState<string | null>(null);
  const chatSubscriptionRef = useRef<(() => void) | void | null>(null);
  const { isInstalled } = useMiniKit();
  const { data: session, status: sessionStatus } = useSession();
  const { isConnected, isConnecting, joinQueue, leaveQueue, onMatched, onQueued, onError, offMatched, offQueued, offError } = useSocket();

  // Auth bypass - comment out redirect to allow unauthenticated access
  // useEffect(() => {
  //   if (sessionStatus === 'unauthenticated') {
  //     router.push('/');
  //   }
  // }, [sessionStatus, router]);
  
  if (sessionStatus === 'unauthenticated') {
    console.log('⚠️ Auth bypassed - allowing access to match page without authentication');
  }

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      if (sessionStatus === 'authenticated' && session?.user) {
        try {
          const response = await fetch('/api/stats');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setStats(data.stats);
            }
          }
        } catch (error) {
          console.error('Failed to fetch stats:', error);
        }
      }
    };

    fetchStats();
  }, [sessionStatus, session]);

  // Debug: Log session on mount and when it changes
  useEffect(() => {
    console.log('Session Status:', sessionStatus);
    console.log('Current Session:', session);
    if (session?.user) {
      console.log('User authenticated:', {
        id: session.user.id,
        username: session.user.username,
        walletAddress: session.user.walletAddress,
      });
    } else {
      console.log('No authenticated user');
    }
  }, [session, sessionStatus]);

  const handleEnterQueue = useCallback(() => {
    if (!language || !isConnected) {
      console.error('Cannot join queue: missing language or not connected');
      return;
    }

    // Debug: Log session data
    console.log('Session data:', session);
    console.log('User data:', session?.user);

    // Allow anonymous users (auth bypassed mode)
    let finalUserId: string;
    let username: string;
    let walletAddress: string | undefined;

    if (session?.user?.walletAddress) {
      // Use authenticated user data if available
      finalUserId = session.user.walletAddress;
      username = session.user.username || session.user.walletAddress.slice(0, 8);
      walletAddress = session.user.walletAddress;
    } else {
      // Generate anonymous user data for testing
      const anonymousId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      finalUserId = anonymousId;
      username = `User${Math.random().toString(36).substr(2, 4)}`;
      walletAddress = undefined;
      console.log('⚠️ Using anonymous user data (auth bypassed)');
    }

    console.log('Using userId:', finalUserId);
    console.log('Using username:', username);
    console.log('Using walletAddress:', walletAddress);

    setStatus('loading');

    // Join queue via Socket.io
    joinQueue({
      role,
      language,
      userId: finalUserId,
      username,
      walletAddress,
    });
  }, [language, isConnected, session, role, joinQueue]);

  const createLessonObject = useCallback(
    async (partnerData: Partner) => {
      if (!partnerData) {
        console.error('No partner data available');
        setChatError('Partner data not available');
        return;
      }

      if (chatSent) {
        console.log('Lesson already created, skipping');
        return;
      }

      try {
        // Get user IDs - use walletAddress as primary ID (consistent with auth)
        const userId = session?.user?.walletAddress || session?.user?.id || `anon-${Date.now()}`;
        const username = session?.user?.username || `User${Math.random().toString(36).substr(2, 4)}`;
        const walletAddress = session?.user?.walletAddress;

        // Determine learner and fluent IDs based on role
        // Use partner's ID, walletAddress, or username as ID
        const partnerId = partnerData.id || partnerData.walletAddress || partnerData.username || `partner-${Date.now()}`;
        const learnerId = role === 'learner' ? userId : partnerId;
        const learnerUsername = role === 'learner' ? username : partnerData.username || 'Unknown';
        const learnerWalletAddress = role === 'learner' ? walletAddress : partnerData.walletAddress;
        
        const fluentId = role === 'fluent' ? userId : partnerId;
        const fluentUsername = role === 'fluent' ? username : partnerData.username || 'Unknown';
        const fluentWalletAddress = role === 'fluent' ? walletAddress : partnerData.walletAddress;

        if (!learnerId || !fluentId) {
          setChatError('Missing user or partner ID');
          return;
        }

        console.log('Creating lesson object...', {
          learnerId,
          learnerUsername,
          fluentId,
          fluentUsername,
          language,
        });

        // Import createLesson function
        const { createLesson } = await import('@/lib/api');
        const result = await createLesson(
          learnerId,
          learnerUsername,
          learnerWalletAddress,
          fluentId,
          fluentUsername,
          fluentWalletAddress,
          language
        );

        setChatSent(true);
        setLessonId(result.lesson.id);
        console.log(`✓ Lesson created: ${result.lesson.id}`);
        console.log('💡 Check the Lessons tab to see your conversation!');
        
        // Dispatch custom event to notify lessons page to refresh
        window.dispatchEvent(new CustomEvent('lessonCreated', { 
          detail: { 
            lessonId: result.lesson.id,
            userId: userId 
          } 
        }));
      } catch (error: any) {
        console.error('Failed to create lesson:', error);
        setChatError(error.message || 'Failed to create lesson');
      }
    },
    [session, role, language, chatSent]
  );

  const reset = useCallback(() => {
    leaveQueue();

    setStatus('idle');
    setPartner(null);
    setChatSent(false);
    setChatError(null);
  }, [leaveQueue]);

  // Setup Socket.io event listeners
  useEffect(() => {
    const handleMatched = (data: MatchedPayload) => {
      console.log('Matched!', data);
      console.log('Partner data received:', data.partner);
      console.log('Lesson ID:', data.lessonId);
      setPartner(data.partner);
      setLessonId(data.lessonId || null);
      setStatus('matched');
      // Don't auto-send chat - let user click button
    };

    const handleQueued = (data: QueuedPayload) => {
      console.log('Queued:', data);
      setStatus('queued');
    };

    const handleError = (data: ErrorPayload) => {
      console.error('Socket error:', data.message);
      setStatus('idle');
    };

    onMatched(handleMatched);
    onQueued(handleQueued);
    onError(handleError);

    return () => {
      offMatched(handleMatched);
      offQueued(handleQueued);
      offError(handleError);
    };
  }, [onMatched, onQueued, onError, offMatched, offQueued, offError]);

  const chatUrl = buildChatUrl(partner);

  // Show loading while checking authentication
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Page>
      <Page.Header className="p-0">
        <TopBar title="Match" />
      </Page.Header>
      <Page.Main className="p-6 pb-20">
        <div className="w-full max-w-md mx-auto space-y-6">
        
        {/* Header - Moved to top */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-black dark:bg-white">
              <ChatLines className="h-6 w-6 text-white dark:text-black" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">Lexi</h1>
              {session?.user && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {session.user.username || 'User'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {status === 'idle' && (
          <div className="grid grid-cols-3 gap-3">
            {/* Total Chats */}
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center">
              <ChatLines className="h-6 w-6 text-black dark:text-white mb-2" strokeWidth={2} />
              <p className="text-2xl font-bold text-black dark:text-white">{stats.totalChats}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">Chats</p>
            </div>

            {/* Current Streak */}
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center">
              <div className="text-2xl mb-2">🔥</div>
              <p className="text-2xl font-bold text-black dark:text-white">{stats.currentStreak}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">Streak</p>
            </div>

            {/* Community Rank */}
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center">
              <div className="text-2xl mb-2">🏅</div>
              <p className="text-xl font-bold text-black dark:text-white">{stats.communityRank}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">Rank</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-4">
          {status === 'idle' && (
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6">
              
              {/* Role Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRole('learner')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      role === 'learner'
                        ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-900'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                  >
                    <User className="h-5 w-5 mb-2" strokeWidth={2} />
                    <span className="font-medium text-sm">Learner</span>
                  </button>
                  <button
                    onClick={() => setRole('fluent')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      role === 'fluent'
                        ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-900'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                  >
                    <Check className="h-5 w-5 mb-2" strokeWidth={2} />
                    <span className="font-medium text-sm">Fluent Guide</span>
                  </button>
                </div>
              </div>

              {/* Language Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-black dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                >
                  <option value="">Select a language</option>
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <div className="w-full max-w-xs">
                  <Button
                    onClick={handleEnterQueue}
                    disabled={!language || !isConnected || isConnecting}
                    variant="primary"
                    className="ring-2 ring-black dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-black"
                  >
                    {isConnecting ? 'Connecting...' : !isConnected ? 'Disconnected' : 'Enter Queue'}
                  </Button>
                </div>
              </div>
              
              {/* Connection Status */}
              {!isConnected && !isConnecting && (
                <p className="text-xs text-center text-red-500">
                  Unable to connect to matching server
                </p>
              )}
            </div>
          )}

          {(status === 'loading' || status === 'queued') && (
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="w-12 h-12 border-2 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
                
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-black dark:text-white">
                    {status === 'loading' ? 'Connecting...' : 'Finding a partner...'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Looking for a {role === 'learner' ? 'fluent speaker' : 'learner'} in{' '}
                    <span className="font-medium text-black dark:text-white">
                      {languages.find(l => l.value === language)?.label}
                    </span>
                  </p>
                </div>

                {status === 'queued' && (
                  <Button
                    variant="secondary"
                    onClick={reset}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {status === 'matched' && (
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-950 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" strokeWidth={2.5} />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-black dark:text-white">Match Found</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You are paired with <span className="font-semibold text-black dark:text-white">{partner?.username || 'Partner'}</span>
                  </p>
                </div>

                <div className="w-full space-y-3 flex flex-col items-center">
                  {role === 'learner' ? (
                    <>
                      <div className="w-full max-w-xs">
                        <Button
                          onClick={() => partner && createLessonObject(partner)}
                          disabled={chatSent}
                          variant="primary"
                          className="ring-2 ring-black dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-black"
                        >
                          {chatSent ? 'Lesson Created' : 'Start Conversation'}
                        </Button>
                      </div>
                      <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                        {chatSent
                          ? `Lesson created! Check the Lessons tab to see it.`
                          : `Click to create a lesson and start your conversation`}
                      </p>
                    </>
                  ) : (
                    <div className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Wait for <span className="font-semibold text-black dark:text-white">{partner?.username || 'your match'}</span> to text you
                      </p>
                    </div>
                  )}

                  {chatError && (
                    <p className="text-xs text-center text-red-500">
                      {chatError}
                    </p>
                  )}

                  <div className="w-full max-w-xs">
                    <Button
                      variant="secondary"
                      onClick={reset}
                    >
                      Leave
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-600">
          <p>Powered by Worldcoin</p>
        </div>
        </div>
      </Page.Main>
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}
