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
import { fetchRandomPrompt } from '@/lib/api';

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

// Predefined "we matched" variations in each language
const MATCHED_MESSAGES: Record<string, string[]> = {
  en: [
    "We matched!",
    "We're matched!",
    "Match found!",
    "We got matched!",
    "Perfect match!",
  ],
  es: [
    "¡Hemos hecho match!",
    "¡Hemos coincidido!",
    "¡Encontramos match!",
    "¡Match encontrado!",
    "¡Coincidencia perfecta!",
  ],
  fr: [
    "Nous avons matché !",
    "Nous sommes matchés !",
    "Match trouvé !",
    "On a matché !",
    "Match parfait !",
  ],
  de: [
    "Wir haben gematcht!",
    "Wir sind gematcht!",
    "Match gefunden!",
    "Wir haben ein Match!",
    "Perfektes Match!",
  ],
  jp: [
    "マッチしました！",
    "マッチが見つかりました！",
    "マッチング成功！",
    "完璧なマッチです！",
    "マッチングしました！",
  ],
  pt: [
    "Fizemos match!",
    "Encontramos match!",
    "Match encontrado!",
    "Conseguimos match!",
    "Match perfeito!",
  ],
  it: [
    "Abbiamo fatto match!",
    "Siamo matchati!",
    "Match trovato!",
    "Abbiamo trovato un match!",
    "Match perfetto!",
  ],
  zh: [
    "我们匹配了！",
    "找到匹配了！",
    "匹配成功！",
    "我们配对成功了！",
    "完美匹配！",
  ],
};

/**
 * Get a random "we matched" message in the specified language
 * @param language - Language code (e.g., 'en', 'es', 'fr')
 * @returns A random matched message in the specified language, or English fallback
 */
function getRandomMatchedMessage(language: string): string {
  const messages = MATCHED_MESSAGES[language] || MATCHED_MESSAGES['en'];
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

// Boilerplate text for intro message in each language
const BOILERPLATE_TEXT: Record<string, { tip: string; call: string; sessionEnds: string }> = {
  en: {
    tip: "If you would like to tip, send here",
    call: "If you would like to call, send phone number",
    sessionEnds: "Session ends at",
  },
  es: {
    tip: "Si quieres dar propina, envía aquí",
    call: "Si quieres llamar, envía número de teléfono",
    sessionEnds: "La sesión termina a las",
  },
  fr: {
    tip: "Si vous souhaitez donner un pourboire, envoyez ici",
    call: "Si vous souhaitez appeler, envoyez le numéro de téléphone",
    sessionEnds: "La session se termine à",
  },
  de: {
    tip: "Wenn du ein Trinkgeld geben möchtest, sende hier",
    call: "Wenn du anrufen möchtest, sende die Telefonnummer",
    sessionEnds: "Die Sitzung endet um",
  },
  jp: {
    tip: "チップを送りたい場合は、ここに送信してください",
    call: "電話をかけたい場合は、電話番号を送信してください",
    sessionEnds: "セッションは",
  },
  pt: {
    tip: "Se quiser dar gorjeta, envie aqui",
    call: "Se quiser ligar, envie o número de telefone",
    sessionEnds: "A sessão termina às",
  },
  it: {
    tip: "Se vuoi dare una mancia, invia qui",
    call: "Se vuoi chiamare, invia il numero di telefono",
    sessionEnds: "La sessione termina alle",
  },
  zh: {
    tip: "如果你想给小费，请在这里发送",
    call: "如果你想打电话，请发送电话号码",
    sessionEnds: "会话结束时间",
  },
};

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get boilerplate text for intro message (always in English)
 * @returns Boilerplate text with session end time (current time + 15 minutes)
 */
function getBoilerplateText(): string {
  const boilerplate = BOILERPLATE_TEXT['en']; // Always use English
  const sessionEndTime = new Date(Date.now() + 15 * 60 * 1000); // Current time + 15 minutes
  const formattedTime = formatTime(sessionEndTime);
  
  return `\n\n${boilerplate.tip}\n${boilerplate.call}\n${boilerplate.sessionEnds} ${formattedTime}`;
}

// Fallback messages in each language
const fallbackMessages: Record<string, string> = {
  en: "Let's start practicing!",
  es: "¡Empecemos a practicar!",
  fr: "Commençons à pratiquer !",
  de: "Lass uns üben!",
  jp: "練習を始めましょう！",
  pt: "Vamos começar a praticar!",
  it: "Iniziamo a praticare!",
  zh: "让我们开始练习吧！",
};

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

export default function MatchPage() {
  const router = useRouter();
  const [role, setRole] = useState<'learner' | 'fluent'>('learner');
  const [language, setLanguage] = useState<string>('');
  const [status, setStatus] = useState<QueueState>('idle');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [chatSent, setChatSent] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({ totalChats: 0, currentStreak: 0, communityRank: '--' });
  const [prompt, setPrompt] = useState<string | null>(null);
  const chatSubscriptionRef = useRef<(() => void) | void | null>(null);
  const { isInstalled } = useMiniKit();
  const { data: session, status: sessionStatus } = useSession();
  const { 
    isConnected, 
    isConnecting, 
    joinQueue, 
    leaveQueue, 
    onMatched, 
    onMatchCancelled,
    onQueued, 
    onError, 
    offMatched, 
    offMatchCancelled,
    offQueued, 
    offError 
  } = useSocket();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/');
    }
  }, [sessionStatus, router]);

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

    // REQUIRE authentication - no anonymous mode
    if (!session?.user?.walletAddress) {
      console.error('Authentication required to join queue');
      router.push('/');
      return;
    }

    const finalUserId = session.user.walletAddress;
    const username = session.user.username || session.user.walletAddress.slice(0, 8);
    const walletAddress = session.user.walletAddress;

    console.log('Using userId:', finalUserId);
    console.log('Using username:', username);
    console.log('Using walletAddress:', walletAddress);

    setStatus('loading');

    // Join queue via Socket.io with authenticated user data
    joinQueue({
      role,
      language,
      userId: finalUserId,
      username,
      walletAddress,
    });
  }, [language, isConnected, session, role, joinQueue, router]);

  const sendChatMessage = useCallback(
    async (partnerData: Partner) => {
      if (!isInstalled) {
        console.error('World App not installed');
        setChatError('Please install World App to start chatting');
        return;
      }

      if (!partnerData) {
        console.error('No partner data available');
        setChatError('Partner data not available');
        return;
      }

      if (chatSent) {
        console.log('Chat already sent, skipping');
        return;
      }

      try {
        console.log('Partner data:', partnerData);

        const recipient: string[] = [];
        if (partnerData.username) {
          console.log('Using partner username:', partnerData.username);
          recipient.push(partnerData.username);
        } else if (partnerData.walletAddress) {
          console.log('Using partner wallet address:', partnerData.walletAddress);
          recipient.push(partnerData.walletAddress);
        } else {
          console.error('No username or wallet address found for partner');
          setChatError('Partner contact info not available');
          return;
        }

        // Use prompt if available, otherwise use language-specific fallback message
        // The prompt from backend is already in the correct language
        const promptText = prompt || fallbackMessages[language] || fallbackMessages['en'];
        // Get a random "we matched" message in the same language
        const matchedText = getRandomMatchedMessage(language);
        // Get boilerplate text (tipping, calling, session end time) - always in English
        const boilerplate = getBoilerplateText();
        const message = `${promptText} ${matchedText}${boilerplate}`;

        const payload: ChatPayload = {
          message,
          to: recipient,
        };

        console.log('Sending chat with payload:', payload);

        const { finalPayload } = await MiniKit.commandsAsync.chat(payload);

        console.log('Chat response:', finalPayload);

        if (finalPayload.status === 'success') {
          setChatSent(true);
          console.log(`Chat opened successfully with ${recipient[0]}`);
        } else {
          console.warn('Chat command returned non-success:', finalPayload);
          setChatError(finalPayload.error_code || 'Failed to open chat');
        }
      } catch (error: any) {
        console.error('Failed to open chat:', error);
        setChatError(error.message || 'Failed to open chat');
      }
    },
    [isInstalled, chatSent, language, role, prompt]
  );

  const reset = useCallback(() => {
    leaveQueue();

    setStatus('idle');
    setQueuePosition(null);
    setPartner(null);
    setChatSent(false);
    setChatError(null);
    setPrompt(null);
  }, [leaveQueue]);

  // Fetch prompt when matched
  useEffect(() => {
    const fetchPrompt = async () => {
      if (status === 'matched' && language) {
        try {
          const response = await fetchRandomPrompt(language);
          setPrompt(response.prompt);
        } catch (error) {
          console.error('Failed to fetch prompt:', error);
          // Set a fallback message if prompt fetch fails
          setPrompt(null);
        }
      }
    };

    fetchPrompt();
  }, [status, language]);

  // Setup Socket.io event listeners
  useEffect(() => {
    const handleMatched = (data: MatchedPayload) => {
      console.log('Matched!', data);
      console.log('Partner data received:', data.partner);
      setPartner(data.partner);
      setStatus('matched');
      // Don't auto-send chat - let user click button
    };

    const handleQueued = (data: QueuedPayload) => {
      console.log('Queued:', data);
      setStatus('queued');
      if (data.position) {
        setQueuePosition(data.position);
      }
    };

    const handleMatchCancelled = () => {
      console.log('Match cancelled by server');
      setStatus('idle');
      setQueuePosition(null);
      setPartner(null);
      setChatSent(false);
      setChatError(null);
      setPrompt(null);
    };

    const handleError = (data: ErrorPayload) => {
      console.error('Socket error:', data.message);
      setStatus('idle');
    };

    onMatched(handleMatched);
    onMatchCancelled(handleMatchCancelled);
    onQueued(handleQueued);
    onError(handleError);

    return () => {
      offMatched(handleMatched);
      offMatchCancelled(handleMatchCancelled);
      offQueued(handleQueued);
      offError(handleError);
    };
  }, [onMatched, onMatchCancelled, onQueued, onError, offMatched, offMatchCancelled, offQueued, offError]);

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
    <div className="min-h-screen bg-white dark:bg-black flex flex-col p-6 pb-24">
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
                  
                  {queuePosition !== null && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center w-full">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            People ahead of you: <span className="font-bold text-black dark:text-white">{Math.max(0, queuePosition - 1)}</span>
                        </p>
                    </div>
                  )}
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
                          onClick={() => partner && sendChatMessage(partner)}
                          disabled={!isInstalled || chatSent}
                          variant="primary"
                          className="ring-2 ring-black dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-black"
                        >
                          {chatSent ? 'Chat Opened' : 'Start Chatting'}
                        </Button>
                      </div>
                      <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                        {!isInstalled
                          ? 'Install World App to start chatting'
                          : chatSent
                          ? `Chat opened with ${partner?.username || 'your match'}`
                          : `Opens World Chat with ${partner?.username || 'your match'}`}
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
      
      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 px-0 pb-[35px] z-50">
        <Navigation />
      </div>
    </div>
  );
}
