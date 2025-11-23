import { MiniKit, ISuccessResult } from 'minikit-js-dev-preview';
import { signIn } from 'next-auth/react';
import { getNewNonces } from './server-helpers';
import { requestNotificationPermission } from './request-notifications';

interface WalletAuthProps {
  proof?: ISuccessResult;
}

/**
 * Authenticates a user via their wallet using a nonce-based challenge-response mechanism.
 * Optionally accepts a World ID Proof to verify personhood alongside wallet ownership.
 *
 * @returns {Promise<SignInResponse>} The result of the sign-in attempt.
 * @throws {Error} If wallet authentication fails at any step.
 */
export const walletAuth = async (props?: WalletAuthProps) => {
  const { nonce, signedNonce } = await getNewNonces();
  const proof = props?.proof;

  const result = await MiniKit.commandsAsync.walletAuth({
    nonce,
    expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
    statement: `Authenticate (${crypto.randomUUID().replace(/-/g, '')}).`,
  });
  console.log('Result', result);
  if (!result) {
    throw new Error('No response from wallet auth');
  }

  if (result.finalPayload.status !== 'success') {
    console.error(
      'Wallet authentication failed',
      result.finalPayload.error_code,
    );
    return;
  } else {
    console.log(result.finalPayload);
  }

  await signIn('credentials', {
    redirect: false, // Don't force redirect, let the page handle it
    nonce,
    signedNonce,
    finalPayloadJson: JSON.stringify(result.finalPayload),
    // Pass World ID proof fields if available
    proof: proof?.proof ?? '',
    merkle_root: proof?.merkle_root ?? '',
    nullifier_hash: proof?.nullifier_hash ?? '',
    verification_level: proof?.verification_level ?? '',
  });
  
  // Request notification permission after successful authentication
  // Pass wallet address so user can be registered for notifications
  const walletAddress = result.finalPayload.address;
  try {
    await requestNotificationPermission(walletAddress);
  } catch (error) {
    // Don't fail auth if notification permission fails
    console.error('Failed to request notification permission:', error);
  }
  
  // Return success so the calling component can handle navigation
  return { success: true };
};
