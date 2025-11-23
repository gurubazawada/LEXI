import { MiniKit } from 'minikit-js-dev-preview';
import { signIn } from 'next-auth/react';
import { getNewNonces } from './server-helpers';
import { requestNotificationPermission } from './request-notifications';

/**
 * Authenticates a user via their wallet using a nonce-based challenge-response mechanism (SIWE).
 * This is the recommended authentication flow per Worldcoin documentation.
 *
 * @returns {Promise<{success: boolean}>} The result of the sign-in attempt.
 * @throws {Error} If wallet authentication fails at any step.
 */
export const walletAuth = async () => {
  const { nonce, signedNonce } = await getNewNonces();

  const result = await MiniKit.commandsAsync.walletAuth({
    nonce,
    expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
    statement: `Sign in to Lexi (${crypto.randomUUID().replace(/-/g, '')}).`,
  });
  
  console.log('Wallet Auth Result:', result);
  
  if (!result) {
    throw new Error('No response from wallet auth');
  }

  if (result.finalPayload.status !== 'success') {
    console.error(
      'Wallet authentication failed',
      result.finalPayload.error_code,
    );
    throw new Error('Wallet authentication failed');
  }

  console.log('Wallet auth successful, signing in...');

  await signIn('credentials', {
    redirect: false,
    nonce,
    signedNonce,
    finalPayloadJson: JSON.stringify(result.finalPayload),
  });
  
  // Request notification permission after successful authentication
  const walletAddress = result.finalPayload.address;
  try {
    await requestNotificationPermission(walletAddress);
  } catch (error) {
    // Don't fail auth if notification permission fails
    console.error('Failed to request notification permission:', error);
  }
  
  return { success: true };
};
