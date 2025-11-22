'use client';
import { walletAuth } from '@/auth/wallet';
import { Button } from '@/components/ui/button';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';

/**
 * This component handles wallet authentication using Worldcoin MiniKit
 * Read More: https://docs.world.org/mini-apps/commands/wallet-auth
 */
export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isInstalled } = useMiniKit();

  const onClick = useCallback(async () => {
    if (!isInstalled || isPending) {
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      await walletAuth();
    } catch (err) {
      console.error('Wallet authentication error', err);
      setError('Authentication failed. Please try again.');
      setIsPending(false);
      return;
    }

    setIsPending(false);
  }, [isInstalled, isPending]);

  useEffect(() => {
    const authenticate = async () => {
      if (isInstalled && !isPending) {
        setIsPending(true);
        try {
          await walletAuth();
        } catch (err) {
          console.error('Auto wallet authentication error', err);
        } finally {
          setIsPending(false);
        }
      }
    };

    authenticate();
  }, [isInstalled, isPending]);

  if (!isInstalled) {
    return (
      <Button disabled variant="outline" size="lg">
        <Wallet className="mr-2 h-4 w-4" />
        World App Required
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={onClick}
        disabled={isPending}
        size="lg"
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
};
