'use client';
import { walletAuth } from '@/auth/wallet';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from 'minikit-js-dev-preview/minikit-provider';
import { MiniKit, ISuccessResult } from 'minikit-js-dev-preview';
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
      // 1. Verify Personhood (World ID)
      const appId = process.env.NEXT_PUBLIC_WLD_APP_ID;
      const action = process.env.NEXT_PUBLIC_WLD_ACTION;

      if (!appId || !action) {
        console.error('World ID configuration missing in .env.local');
        throw new Error('Configuration error');
      }

      const verifyResult = await MiniKit.commandsAsync.verify({
        app_id: appId,
        action: action,
      });

      // Check if verification was successful
      if (!verifyResult) {
        throw new Error('Verification cancelled');
      }

      if (verifyResult.finalPayload.status !== 'success') {
        throw new Error('World ID verification failed');
      }

      // 2. Authenticate with Wallet (SIWE) + Proof
      // Pass the successful proof to the wallet auth handler
      await walletAuth({ 
        proof: verifyResult.finalPayload as ISuccessResult 
      });

    } catch (err) {
      console.error('Authentication error', err);
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
