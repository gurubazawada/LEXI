'use client';
import { walletAuth } from '@/auth/wallet';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from 'minikit-js-dev-preview/minikit-provider';
import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';

/**
 * This component handles wallet authentication using Worldcoin MiniKit
 * Read More: https://docs.world.org/mini-apps/commands/wallet-auth
 */
export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isInstalled } = useMiniKit();
  const { data: session } = useSession();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const handleSignIn = useCallback(async () => {
    addLog('Sign in button clicked');
    if (!isInstalled) {
      addLog('MiniKit is not installed');
      return;
    }
    if (isPending) {
      addLog('Operation pending, ignoring click');
      return;
    }
    
    setError(null);
    setIsPending(true);
    
    try {
      addLog('Initiating Wallet Authentication (SIWE)...');
      await walletAuth();
      addLog('Wallet auth completed successfully');
    } catch (err) {
      const msg = `Authentication Error: ${err instanceof Error ? err.message : String(err)}`;
      addLog(msg);
      console.error(msg);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsPending(false);
    }
  }, [isInstalled, isPending]);

  if (!isInstalled) {
    return (
      <Button disabled variant="secondary">
        World App Required
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSignIn}
        disabled={isPending}
        variant="primary"
      >
        {isPending ? 'Signing In...' : 'Sign In with World ID'}
      </Button>
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono h-32 overflow-y-auto text-left text-black dark:text-white">
        <p className="font-bold mb-1">Debug Logs:</p>
        {logs.map((log, i) => (
            <div key={i} className="border-b border-gray-200 dark:border-gray-800 last:border-0 py-1 break-all">
                {log}
            </div>
        ))}
      </div>
    </div>
  );
};
