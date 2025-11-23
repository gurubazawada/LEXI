import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { hashNonce } from '@/auth/wallet/client-helpers';
import { verifyCloudProof } from '@/auth/helpers/verify-proof';
import {
  MiniAppWalletAuthSuccessPayload,
  MiniKit,
  verifySiweMessage,
} from 'minikit-js-dev-preview';

// Hardcoded secret for production
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fdE8Os3m43w7VlLPrysvIZqKXs3YsJAAco6aHeOYqps=';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: AUTH_SECRET,
  providers: [
    Credentials({
      name: 'World App Wallet',
      credentials: {
        nonce: { label: 'Nonce', type: 'text' },
        signedNonce: { label: 'Signed Nonce', type: 'text' },
        finalPayloadJson: { label: 'Final Payload', type: 'text' },
        proof: { label: 'Proof', type: 'text' },
        merkle_root: { label: 'Merkle Root', type: 'text' },
        nullifier_hash: { label: 'Nullifier Hash', type: 'text' },
        verification_level: { label: 'Verification Level', type: 'text' },
      },
      // @ts-expect-error TODO
      authorize: async ({
        nonce,
        signedNonce,
        finalPayloadJson,
        proof,
        merkle_root,
        nullifier_hash,
        verification_level,
      }: {
        nonce: string;
        signedNonce: string;
        finalPayloadJson: string;
        proof?: string;
        merkle_root?: string;
        nullifier_hash?: string;
        verification_level?: string;
      }) => {
        console.log('Starting authentication process...');
        
        // 1. Verify Wallet Ownership (SIWE)
        const expectedSignedNonce = hashNonce({ nonce });

        if (signedNonce !== expectedSignedNonce) {
          console.log('Invalid signed nonce');
          return null;
        }

        const finalPayload: MiniAppWalletAuthSuccessPayload =
          JSON.parse(finalPayloadJson);
        const result = await verifySiweMessage(finalPayload, nonce);

        if (!result.isValid || !result.siweMessageData.address) {
          console.log('Invalid final payload');
          return null;
        }
        
        // 2. Verify World ID Proof (Proof of Personhood)
        // Only verify if proof data is present
        if (proof && merkle_root && nullifier_hash && verification_level) {
            console.log('[Auth] Received World ID proof data, initiating verification...');
            const app_id = process.env.NEXT_PUBLIC_WLD_APP_ID;
            const action = process.env.NEXT_PUBLIC_WLD_ACTION;
            
            if (!app_id || !action) {
                console.error('[Auth] Missing World ID App ID or Action configuration');
                // Fail open or closed depending on requirement. 
                // For now, let's fail if config is missing but proof was attempted.
                return null;
            }

            const proofResult = await verifyCloudProof(
                { proof, merkle_root, nullifier_hash, verification_level },
                app_id,
                action
            );
            
            if (!proofResult.success) {
                console.error('[Auth] World ID Proof Validation FAILED:', proofResult);
                return null;
            }
            console.log('[Auth] World ID Proof Verified Successfully!');
        } else {
            console.log('[Auth] No World ID proof provided, skipping proof verification.');
        }

        // Fetch the user info from World ID
        const userInfo = await MiniKit.getUserInfo(finalPayload.address);
        
        console.log('World ID User Info:', userInfo);
        console.log('Wallet Address:', finalPayload.address);

        return {
          id: finalPayload.address,
          walletAddress: finalPayload.address,
          username: userInfo?.username || finalPayload.address.slice(0, 8),
          profilePictureUrl: userInfo?.profilePictureUrl || '',
        };
      },
    }),
  ],
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.walletAddress = user.walletAddress;
        token.username = user.username;
        token.profilePictureUrl = user.profilePictureUrl;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.walletAddress = token.walletAddress as string;
        session.user.username = token.username as string;
        session.user.profilePictureUrl = token.profilePictureUrl as string;
      }

      return session;
    },
  },
});
