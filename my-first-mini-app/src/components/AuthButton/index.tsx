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
  
  // State to store the proof after successful verification
  const [proof, setProof] = useState<ISuccessResult | null>(null);

  // Step 1: Verify Humanity
  const handleVerify = useCallback(async () => {
    if (!isInstalled || isPending) {
      return;
    }
    setError(null);
    setIsPending(true);
    
    try {
      const appId = process.env.NEXT_PUBLIC_WLD_APP_ID;
      const action = process.env.NEXT_PUBLIC_WLD_ACTION;

      if (!appId || !action) {
        console.error('World ID configuration missing in .env.local');
        throw new Error('Configuration error');
      }

      console.log('Step 1: Initiating World ID Verification...');
      const verifyResult = await MiniKit.commandsAsync.verify({
        app_id: appId,
        action: action,
      });

      console.log('Verification Result:', verifyResult);

      if (verifyResult?.finalPayload?.status === 'success') {
          setProof(verifyResult.finalPayload as ISuccessResult);
      } else {
          throw new Error('Verification failed or cancelled');
      }
    } catch (err) {
      console.error('Verification Error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setIsPending(false);
    }
  }, [isInstalled, isPending]);

  // Step 2: Login with Wallet (using the stored proof)
  const handleLogin = useCallback(async () => {
     if (!proof || isPending) return;
     
     setError(null);
     setIsPending(true);
     try {
        console.log('Step 2: Logging in with Wallet and Proof...');
        await walletAuth({ proof });
     } catch(err) {
        console.error('Login Error:', err);
        setError('Login failed. Please try again.');
     } finally {
        setIsPending(false);
     }
  }, [proof, isPending]);

  if (!isInstalled) {
    return (
      <Button disabled variant="secondary">
        World App Required
      </Button>
    );
  }

  // Render Step 2: Enter App (Login)
  if (proof) {
      return (
        <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 font-medium bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <span>✓</span>
                <span>Humanity Verified</span>
            </div>
            
            <Button 
                onClick={handleLogin} 
                disabled={isPending} 
                variant="primary"
            >
                {isPending ? 'Entering App...' : 'Enter App'}
            </Button>
            
             {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      );
  }

  // Render Step 1: Verify Humanity
  return (
    <div className="space-y-2">
      <Button
        onClick={handleVerify}
        disabled={isPending}
        variant="primary"
      >
        {isPending ? 'Verifying...' : 'Verify Humanity'}
      </Button>
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
};
