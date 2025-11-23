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

  const handleSignIn = useCallback(async () => {
    if (!isInstalled || isPending) {
      return;
    }
    
    setError(null);
    setIsPending(true);
    
    try {
      await walletAuth();
    } catch (err) {
      console.error('Authentication error:', err);
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
    </div>
  );
};
