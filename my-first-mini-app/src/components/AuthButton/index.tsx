'use client';
import { walletAuth } from '@/auth/wallet';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from 'minikit-js-dev-preview/minikit-provider';
import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';
import { Wallet } from 'iconoir-react';

/**
 * This component handles wallet authentication using Worldcoin MiniKit
 * Read More: https://docs.world.org/mini-apps/commands/wallet-auth
 */
export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isInstalled } = useMiniKit();
  const { data: session } = useSession();

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
        onClick={onClick}
        disabled={isPending}
        variant="primary"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
};
